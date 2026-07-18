#!/usr/bin/env node
/**
 * Staging API helpers for Playwright tests (HTTP to preprod, same as backend factories).
 */
import { loadTestConfig } from '../config/loadConfig.mjs';

export function apiBase() {
  const config = loadTestConfig();
  return (
    process.env.TEST_API_BASE_URL ||
    process.env.VITE_API_BASE_URL ||
    config.backend ||
    'http://localhost:3000/api'
  ).replace(/\/+$/, '');
}

async function parseJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export async function ownerLogin() {
  const config = loadTestConfig();
  if (!config.ownerPhone || !config.ownerPassword) {
    throw new Error('Set TEST_OWNER_PHONE and TEST_OWNER_PASSWORD in tests/.env.test.local');
  }
  const res = await fetch(`${apiBase()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: config.ownerPhone, password: config.ownerPassword }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(`Owner login failed: ${res.status} ${JSON.stringify(data)}`);
  return { token: data.token, data };
}

export async function ownerUpdateOutlet(token, outletId, data) {
  const res = await fetch(`${apiBase()}/owner/outlets/${outletId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(`Update outlet failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

export async function ownerListOutlets(token) {
  const res = await fetch(`${apiBase()}/owner/outlets`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(`List outlets failed: ${res.status}`);
  return data?.data?.outlets || data?.outlets || [];
}

export async function ownerGetFirstOutlet(token) {
  const outlets = await ownerListOutlets(token);
  const outlet = outlets[0];
  if (!outlet) throw new Error('No outlets for test owner');
  return { id: String(outlet._id || outlet.id), raw: outlet };
}

export async function ensureProcessedPayrollPeriod(token, outletId) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const slot = (Date.now() + attempt * 7919) % 120;
    const year = 2035 + Math.floor(slot / 12);
    const month = slot % 12;
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const fmt = (d) => d.toISOString().slice(0, 10);

    const periodRes = await fetch(`${apiBase()}/payroll/outlet/${outletId}/period`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ periodStart: fmt(start), periodEnd: fmt(end) }),
    });
    const periodData = await parseJson(periodRes);
    if (!periodRes.ok) {
      if (attempt < 2) continue;
      throw new Error(`Ensure period failed: ${periodRes.status}`);
    }
    const period = periodData?.data?.period || periodData?.period;
    const periodId = String(period?._id || period?.id || '');
    if (!periodId) throw new Error('No payroll period id');

    const processRes = await fetch(
      `${apiBase()}/payroll/outlet/${outletId}/period/${periodId}/process`,
      { method: 'POST', headers, body: '{}' },
    );
    if (processRes.ok) {
      return { periodId, outletId, periodYear: year, periodStart: fmt(start), periodEnd: fmt(end) };
    }

    const err = await parseJson(processRes);
    const errMsg = String(err?.error || err?.raw || '');
    const isTransient =
      processRes.status === 524 ||
      processRes.status === 502 ||
      processRes.status === 503 ||
      errMsg.includes('timeout') ||
      errMsg.includes('524');
    if (errMsg.includes('already locked') && attempt < 4) continue;
    if (isTransient && attempt < 4) {
      await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
      continue;
    }
    throw new Error(`Process payroll failed: ${processRes.status} ${JSON.stringify(err).slice(0, 500)}`);
  }

  throw new Error('Process payroll failed after retries');
}

export async function seedPayrollEmployeeWithWork(token, outletId, outletRaw) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const rolesRes = await fetch(`${apiBase()}/employee/available-roles/${outletId}`, { headers });
  const rolesData = await parseJson(rolesRes);
  if (!rolesRes.ok) throw new Error('Available roles failed');
  const roles = rolesData?.data?.roles || rolesData?.roles || [];
  const parentRoleId = String(
    roles[0]?.parentRoleId?._id || roles[0]?.parentRoleId || roles[0]?._id || '',
  );

  const suffix = String(Date.now()).slice(-9);
  const phone = `9${suffix}`;
  const name = `PayrollSeed ${suffix}`;

  const createRes = await fetch(`${apiBase()}/employee/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      phone,
      tempPassword: 'staff123',
      outletId,
      parentRoleId,
    }),
  });
  const created = await parseJson(createRes);
  if (!createRes.ok) throw new Error(`Create staff failed: ${createRes.status}`);

  const employee =
    created?.data?.employee || created?.employee || created?.data || created;
  const employeeId = String(employee?._id || employee?.id || '');

  await fetch(`${apiBase()}/employee/staff/${employeeId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ salary: 12000, minHoursPerDay: 8 }),
  });

  const lat = outletRaw?.geofence?.latitude ?? outletRaw?.latitude ?? 12.9716;
  const lng = outletRaw?.geofence?.longitude ?? outletRaw?.longitude ?? 77.5946;

  const punchInRes = await fetch(`${apiBase()}/punch/owner/in-for-employee`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetEmployeeId: employeeId,
      outletId,
      latitude: lat,
      longitude: lng,
    }),
  });
  if (!punchInRes.ok) {
    const err = await parseJson(punchInRes);
    throw new Error(`Owner punch in failed: ${punchInRes.status} ${JSON.stringify(err)}`);
  }

  await new Promise((r) => setTimeout(r, 1500));

  const punchOutRes = await fetch(`${apiBase()}/punch/owner/out-for-employee`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      targetEmployeeId: employeeId,
      outletId,
      latitude: lat,
      longitude: lng,
    }),
  });
  if (!punchOutRes.ok) {
    const err = await parseJson(punchOutRes);
    throw new Error(`Punch out failed: ${punchOutRes.status} ${JSON.stringify(err)}`);
  }

  const period = await ensureProcessedPayrollPeriod(token, outletId);
  return { employeeId, name, ...period };
}

export async function createWebStaffUser(token, outletId) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const rolesRes = await fetch(`${apiBase()}/employee/available-roles/${outletId}`, { headers });
  const rolesData = await parseJson(rolesRes);
  if (!rolesRes.ok) throw new Error('Available roles failed');
  const roles = rolesData?.data?.roles || rolesData?.roles || [];
  const parentRoleId = String(
    roles[0]?.parentRoleId?._id || roles[0]?.parentRoleId || roles[0]?._id || '',
  );

  const suffix = String(Date.now()).slice(-9);
  const phone = `9${suffix}`;
  const name = `WebStaff ${suffix}`;
  const password = 'staff123';

  const createRes = await fetch(`${apiBase()}/employee/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      phone,
      tempPassword: password,
      outletId,
      parentRoleId,
    }),
  });
  const created = await parseJson(createRes);
  if (!createRes.ok) throw new Error(`Create staff failed: ${createRes.status}`);

  const employee =
    created?.data?.employee || created?.employee || created?.data || created;
  const employeeId = String(employee?._id || employee?.id || '');

  const permRes = await fetch(`${apiBase()}/employee/staff/${employeeId}/feature-permissions`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      permissions: {
        webDashboard: true,
        webTasks: true,
        webStaff: true,
        webIssues: true,
        webAttendance: true,
        webPayroll: true,
        webLeave: true,
        webSops: true,
        webEvents: true,
        webAnalytics: true,
        webReports: true,
        webActivity: true,
        webBriefingPool: true,
        webOvertime: true,
        webDutyRoster: true,
        webHierarchy: true,
        webVendors: true,
        webOutlets: true,
        webLeaveRules: true,
        webPayrollSettings: true,
        webRulesRegulations: true,
        webSupport: true,
        webRoles: true,
        webDepartments: true,
      },
    }),
  });
  if (!permRes.ok) {
    const err = await parseJson(permRes);
    throw new Error(`Set web permissions failed: ${permRes.status} ${JSON.stringify(err)}`);
  }

  return { employeeId, phone, password, name };
}

export async function createTestStaff(token, outletId, prefix = 'E2E') {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const rolesRes = await fetch(`${apiBase()}/employee/available-roles/${outletId}`, { headers });
  const rolesData = await parseJson(rolesRes);
  if (!rolesRes.ok) throw new Error('Available roles failed');
  const roles = rolesData?.data?.roles || rolesData?.roles || [];
  const parentRoleId = String(
    roles[0]?.parentRoleId?._id || roles[0]?.parentRoleId || roles[0]?._id || '',
  );
  if (!parentRoleId) throw new Error('No parent role for outlet');

  const suffix = String(Date.now()).slice(-9);
  const phone = `9${suffix}`;
  const name = `${prefix} ${suffix}`;
  const password = 'staff123';

  const createRes = await fetch(`${apiBase()}/employee/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name,
      phone,
      tempPassword: password,
      outletId,
      parentRoleId,
    }),
  });
  const created = await parseJson(createRes);
  if (!createRes.ok) throw new Error(`Create staff failed: ${createRes.status}`);

  const employee =
    created?.data?.employee || created?.employee || created?.data || created;
  const employeeId = String(employee?._id || employee?.id || '');

  return { employeeId, name, phone, password, parentRoleId };
}

export async function createDailyTaskTemplate(token, outletId, { title, assignToEmployeeId, parentRoleId }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
  const taskTitle = title || `E2E Task ${Date.now()}`;
  const res = await fetch(`${apiBase()}/task/template/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      title: taskTitle,
      outletId,
      taskType: 'daily',
      shiftType: 'Both',
      assignToType: 'staff',
      assignToEmployeeId,
      parentRoleId,
    }),
  });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(`Create task template failed: ${res.status} ${JSON.stringify(data)}`);
  const template = data?.data?.template || data?.template || data?.data;
  return {
    templateId: String(template?._id || template?.id || ''),
    title: taskTitle,
  };
}

export async function createOpenPayrollPeriod(token, outletId) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const slot = (Date.now() + attempt * 7919) % 120;
    const year = 2036 + Math.floor(slot / 12);
    const month = slot % 12;
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    const fmt = (d) => d.toISOString().slice(0, 10);

    const periodRes = await fetch(`${apiBase()}/payroll/outlet/${outletId}/period`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ periodStart: fmt(start), periodEnd: fmt(end) }),
    });
    const periodData = await parseJson(periodRes);
    if (!periodRes.ok) {
      if (attempt < 2) continue;
      throw new Error(`Create period failed: ${periodRes.status}`);
    }
    const period = periodData?.data?.period || periodData?.period;
    const periodId = String(period?._id || period?.id || '');
    if (!periodId) throw new Error('No payroll period id');
    return { periodId, outletId, periodStart: fmt(start), periodEnd: fmt(end) };
  }

  throw new Error('Create open payroll period failed after retries');
}

export async function getFirstPendingOvertime(token, outletId) {
  const headers = { Authorization: `Bearer ${token}` };
  const res = await fetch(`${apiBase()}/overtime/outlet/${outletId}?status=pending`, { headers });
  const data = await parseJson(res);
  if (!res.ok) throw new Error(`List overtime failed: ${res.status}`);
  const requests = data?.data?.requests || [];
  const req = requests[0];
  if (!req) return null;
  return {
    id: String(req._id || req.id),
    employeeName: req.employeeId?.name || 'Staff',
  };
}

export async function settlePayrollEmployee(token, outletId, employeeId, periodId) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const detailRes = await fetch(
    `${apiBase()}/payroll/outlet/${outletId}/period/${periodId}?_=${Date.now()}`,
    { headers },
  );
  const detail = await parseJson(detailRes);
  if (!detailRes.ok) {
    throw new Error(`Payroll detail failed: ${detailRes.status}`);
  }

  const employees =
    detail?.data?.employees || detail?.data?.data?.employees || detail?.employees || [];
  const row = employees.find(
    (e) => String(e.employeeId?._id || e.employeeId || e._id) === String(employeeId),
  );
  const remaining = Number(row?.remainingAmount ?? row?.remaining ?? row?.netPayable ?? 0);

  if (remaining > 0) {
    const payRes = await fetch(
      `${apiBase()}/payroll/outlet/${outletId}/employee/${employeeId}/payment-v2`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          amount: remaining,
          notes: 'E2E automation settle',
          payrollPeriodId: periodId,
        }),
      },
    );
    const payData = await parseJson(payRes);
    if (!payRes.ok) {
      throw new Error(`Settle payment failed: ${payRes.status} ${JSON.stringify(payData)}`);
    }
  }

  return { remaining };
}
