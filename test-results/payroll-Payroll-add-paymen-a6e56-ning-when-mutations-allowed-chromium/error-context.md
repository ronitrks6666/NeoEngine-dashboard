# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: payroll.spec.ts >> Payroll >> add payment updates remaining when mutations allowed
- Location: tests\e2e\payroll.spec.ts:40:3

# Error details

```
Error: Process payroll failed: 524 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]>    <html class=\"no-js ie8 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if gt IE 8]><!--> <html class=\"no-js\" lang=\"en-US\"> <!--<![endif]-->\n<head>\n\n<title>neuoptic.in | 524: A timeout occurred</title>\n<meta charset=\"UTF-8\" />\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\" />\n<meta name=\"robots\" content=\"noindex, nofollow\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<link rel=\"stylesheet\" id=\"cf_styles-css\" href=\"/cdn-cgi/styles/main.css\" />\n</head>\n<body>\n<div id=\"cf-wrapper\">\n    <div id=\"cf-error-details\" class=\"p-0\">\n        <header class=\"mx-auto pt-10 lg:pt-6 lg:px-8 w-240 lg:w-full mb-8\">\n            <h1 class=\"inline-block sm:block sm:mb-2 font-light text-60 lg:text-4xl text-black-dark leading-tight mr-2\">\n                <span class=\"inline-block\">A timeout occurred</span>\n                <span class=\"code-label\">Error code 524</span>\n            </h1>\n            <div>\n                Visit <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">cloudflare.com</a> for more information.\n            </div>\n            <div class=\"mt-3\">2026-07-18 05:28:07 UTC</div>\n        </header>\n        <div class=\"my-8 bg-gradient-gray\">\n            <div class=\"w-240 lg:w-full mx-auto\">\n                <div class=\"clearfix md:px-8\">\n                    <div id=\"cf-browser-status\" class=\" relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    \n    <span class=\"cf-icon-browser block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-ok w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    \n  </div>\n  <span class=\"md:block w-full truncate\">You</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  \n    Browser\n  \n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-green-success\">Working</span>\n  \n</div>\n                    <div id=\"cf-cloudflare-status\" class=\" relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&#38;utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">\n    <span class=\"cf-icon-cloud block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-ok w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    </a>\n  </div>\n  <span class=\"md:block w-full truncate\">Singapore</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">\n    Cloudflare\n  </a>\n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-green-success\">Working</span>\n  \n</div>\n                    <div id=\"cf-host-status\" class=\"cf-error-source relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    \n    <span class=\"cf-icon-server block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-error w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    \n  </div>\n  <span class=\"md:block w-full truncate\">preprod-engine.neuoptic.in</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  \n    Host\n  \n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-red-error\">Error</span>\n  \n</div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"w-240 lg:w-full mx-auto mb-8 lg:px-8\">\n            <div class=\"clearfix\">\n                <div class=\"w-1/2 md:w-full float-left pr-6 md:pb-10 md:pr-0 leading-relaxed\">\n                    <h2 class=\"text-3xl font-normal leading-1.3 mb-4\">What happened?</h2>\n                    <p class=\"mb-2\">The origin web server timed out responding to this request.</p><p>The likely cause is an overloaded background task, database or application, stressing the resources on the host web server.</p>\n                </div>\n                <div class=\"w-1/2 md:w-full float-left leading-relaxed\">\n                    <h2 class=\"text-3xl font-normal leading-1.3 mb-4\">What can I do?</h2>\n                    \n              <h3 class=\"text-15 font-semibold mb-2\">If you're a visitor of this website:</h3>\n              <p class=\"mb-6\">Please try again in a few minutes.</p>\n\n              <h3 class=\"text-15 font-semibold mb-2\">If you're the owner of this website:</h3>\n              <p>Please refer to the <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/\">Error 524</a> article:</p>\n              <ul class=\"ml-4\">\n                <li>Contact your hosting provider; check for long-running processes or an overloaded web server.</li>\n                <li>Use status polling of large HTTP processes to avoid this error.</li>\n                <li>Run the long-running scripts on a <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/dns/proxy-status/#dns-only-records\">grey-clouded subdomain</a>.</li>\n                <li>Enterprise customers can <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/#resolution-on-cloudflare\">increase the timeout setting</a> globally or for specific requests using Cache Rules.</li>\n              </ul>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"cf-error-footer cf-wrapper w-240 lg:w-full py-10 sm:py-4 sm:px-8 mx-auto text-center sm:text-left border-solid border-0 border-t border-gray-300\">\n    <p class=\"text-13\">\n      <span class=\"cf-footer-item sm:block sm:mb-1\">Cloudflare Ray ID: <strong class=\"font-semibold\">a1cf11b98f721195</strong></span>\n      <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      <span id=\"cf-footer-item-ip\" class=\"cf-footer-item hidden sm:block sm:mb-1\">\n        Your IP:\n        <button type=\"button\" id=\"cf-footer-ip-reveal\" class=\"cf-footer-ip-reveal-btn\">Click to reveal</button>\n        <span class=\"hidden\" id=\"cf-footer-ip\">2401:4900:1cc4:e080:e98f:13da:7185:f51f</span>\n        <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      </span>\n      <span class=\"cf-footer-item sm:block sm:mb-1\"><span>Performance &amp; security by</span> <a rel=\"noopener noreferrer\" href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&#38;utm_campaign=preprod-engine.neuoptic.in\" id=\"brand_link\" target=\"_blank\">Cloudflare</a></span>\n      \n    </p>\n    <script>(function(){function d(){var b=a.getElementById(\"cf-footer-item-ip\"),c=a.getElementById(\"cf-footer-ip-reveal\");b&&\"classList\"in b&&(b.classList.remove(\"hidden\"),c.addEventListener(\"click\",function(){c.classList.add(\"hidden\");a.getElementById(\"cf-footer-ip\").classList.remove(\"hidden\")}))}var a=document;document.addEventListener&&a.addEventListener(\"DOMContentLoaded\",d)})();</script>\n  </div><!-- /.error-footer -->\n\n    </div>\n</div>\n</body>\n</html>"}
```

# Test source

```ts
  10  |     process.env.TEST_API_BASE_URL ||
  11  |     process.env.VITE_API_BASE_URL ||
  12  |     config.backend ||
  13  |     'https://preprod-engine.neuoptic.in/api'
  14  |   ).replace(/\/+$/, '');
  15  | }
  16  | 
  17  | async function parseJson(res) {
  18  |   const text = await res.text();
  19  |   try {
  20  |     return JSON.parse(text);
  21  |   } catch {
  22  |     return { raw: text };
  23  |   }
  24  | }
  25  | 
  26  | export async function ownerLogin() {
  27  |   const config = loadTestConfig();
  28  |   if (!config.ownerPhone || !config.ownerPassword) {
  29  |     throw new Error('Set TEST_OWNER_PHONE and TEST_OWNER_PASSWORD in tests/.env.test.local');
  30  |   }
  31  |   const res = await fetch(`${apiBase()}/auth/login`, {
  32  |     method: 'POST',
  33  |     headers: { 'Content-Type': 'application/json' },
  34  |     body: JSON.stringify({ phone: config.ownerPhone, password: config.ownerPassword }),
  35  |   });
  36  |   const data = await parseJson(res);
  37  |   if (!res.ok) throw new Error(`Owner login failed: ${res.status} ${JSON.stringify(data)}`);
  38  |   return { token: data.token, data };
  39  | }
  40  | 
  41  | export async function ownerUpdateOutlet(token, outletId, data) {
  42  |   const res = await fetch(`${apiBase()}/owner/outlets/${outletId}`, {
  43  |     method: 'PUT',
  44  |     headers: {
  45  |       Authorization: `Bearer ${token}`,
  46  |       'Content-Type': 'application/json',
  47  |     },
  48  |     body: JSON.stringify(data),
  49  |   });
  50  |   const body = await parseJson(res);
  51  |   if (!res.ok) throw new Error(`Update outlet failed: ${res.status} ${JSON.stringify(body)}`);
  52  |   return body;
  53  | }
  54  | 
  55  | export async function ownerListOutlets(token) {
  56  |   const res = await fetch(`${apiBase()}/owner/outlets`, {
  57  |     headers: { Authorization: `Bearer ${token}` },
  58  |   });
  59  |   const data = await parseJson(res);
  60  |   if (!res.ok) throw new Error(`List outlets failed: ${res.status}`);
  61  |   return data?.data?.outlets || data?.outlets || [];
  62  | }
  63  | 
  64  | export async function ownerGetFirstOutlet(token) {
  65  |   const outlets = await ownerListOutlets(token);
  66  |   const outlet = outlets[0];
  67  |   if (!outlet) throw new Error('No outlets for test owner');
  68  |   return { id: String(outlet._id || outlet.id), raw: outlet };
  69  | }
  70  | 
  71  | export async function ensureProcessedPayrollPeriod(token, outletId) {
  72  |   const headers = {
  73  |     Authorization: `Bearer ${token}`,
  74  |     'Content-Type': 'application/json',
  75  |   };
  76  | 
  77  |   for (let attempt = 0; attempt < 3; attempt += 1) {
  78  |     const slot = (Date.now() + attempt * 7919) % 120;
  79  |     const year = 2035 + Math.floor(slot / 12);
  80  |     const month = slot % 12;
  81  |     const start = new Date(Date.UTC(year, month, 1));
  82  |     const end = new Date(Date.UTC(year, month + 1, 0));
  83  |     const fmt = (d) => d.toISOString().slice(0, 10);
  84  | 
  85  |     const periodRes = await fetch(`${apiBase()}/payroll/outlet/${outletId}/period`, {
  86  |       method: 'POST',
  87  |       headers,
  88  |       body: JSON.stringify({ periodStart: fmt(start), periodEnd: fmt(end) }),
  89  |     });
  90  |     const periodData = await parseJson(periodRes);
  91  |     if (!periodRes.ok) {
  92  |       if (attempt < 2) continue;
  93  |       throw new Error(`Ensure period failed: ${periodRes.status}`);
  94  |     }
  95  |     const period = periodData?.data?.period || periodData?.period;
  96  |     const periodId = String(period?._id || period?.id || '');
  97  |     if (!periodId) throw new Error('No payroll period id');
  98  | 
  99  |     const processRes = await fetch(
  100 |       `${apiBase()}/payroll/outlet/${outletId}/period/${periodId}/process`,
  101 |       { method: 'POST', headers, body: '{}' },
  102 |     );
  103 |     if (processRes.ok) {
  104 |       return { periodId, outletId, periodYear: year, periodStart: fmt(start), periodEnd: fmt(end) };
  105 |     }
  106 | 
  107 |     const err = await parseJson(processRes);
  108 |     const errMsg = String(err?.error || '');
  109 |     if (errMsg.includes('already locked') && attempt < 2) continue;
> 110 |     throw new Error(`Process payroll failed: ${processRes.status} ${JSON.stringify(err)}`);
      |           ^ Error: Process payroll failed: 524 {"raw":"<!DOCTYPE html>\n<!--[if lt IE 7]> <html class=\"no-js ie6 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 7]>    <html class=\"no-js ie7 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if IE 8]>    <html class=\"no-js ie8 oldie\" lang=\"en-US\"> <![endif]-->\n<!--[if gt IE 8]><!--> <html class=\"no-js\" lang=\"en-US\"> <!--<![endif]-->\n<head>\n\n<title>neuoptic.in | 524: A timeout occurred</title>\n<meta charset=\"UTF-8\" />\n<meta http-equiv=\"Content-Type\" content=\"text/html; charset=UTF-8\" />\n<meta http-equiv=\"X-UA-Compatible\" content=\"IE=Edge\" />\n<meta name=\"robots\" content=\"noindex, nofollow\" />\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n<link rel=\"stylesheet\" id=\"cf_styles-css\" href=\"/cdn-cgi/styles/main.css\" />\n</head>\n<body>\n<div id=\"cf-wrapper\">\n    <div id=\"cf-error-details\" class=\"p-0\">\n        <header class=\"mx-auto pt-10 lg:pt-6 lg:px-8 w-240 lg:w-full mb-8\">\n            <h1 class=\"inline-block sm:block sm:mb-2 font-light text-60 lg:text-4xl text-black-dark leading-tight mr-2\">\n                <span class=\"inline-block\">A timeout occurred</span>\n                <span class=\"code-label\">Error code 524</span>\n            </h1>\n            <div>\n                Visit <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">cloudflare.com</a> for more information.\n            </div>\n            <div class=\"mt-3\">2026-07-18 05:28:07 UTC</div>\n        </header>\n        <div class=\"my-8 bg-gradient-gray\">\n            <div class=\"w-240 lg:w-full mx-auto\">\n                <div class=\"clearfix md:px-8\">\n                    <div id=\"cf-browser-status\" class=\" relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    \n    <span class=\"cf-icon-browser block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-ok w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    \n  </div>\n  <span class=\"md:block w-full truncate\">You</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  \n    Browser\n  \n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-green-success\">Working</span>\n  \n</div>\n                    <div id=\"cf-cloudflare-status\" class=\" relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&#38;utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">\n    <span class=\"cf-icon-cloud block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-ok w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    </a>\n  </div>\n  <span class=\"md:block w-full truncate\">Singapore</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  <a href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&utm_campaign=preprod-engine.neuoptic.in\" target=\"_blank\" rel=\"noopener noreferrer\">\n    Cloudflare\n  </a>\n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-green-success\">Working</span>\n  \n</div>\n                    <div id=\"cf-host-status\" class=\"cf-error-source relative w-1/3 md:w-full py-15 md:p-0 md:py-8 md:text-left md:border-solid md:border-0 md:border-b md:border-gray-400 overflow-hidden float-left md:float-none text-center\">\n  <div class=\"relative mb-10 md:m-0\">\n    \n    <span class=\"cf-icon-server block md:hidden h-20 bg-center bg-no-repeat\"></span>\n    <span class=\"cf-icon-error w-12 h-12 absolute left-1/2 md:left-auto md:right-0 md:top-0 -ml-6 -bottom-4\"></span>\n    \n  </div>\n  <span class=\"md:block w-full truncate\">preprod-engine.neuoptic.in</span>\n  <h3 class=\"md:inline-block mt-3 md:mt-0 text-2xl text-gray-600 font-light leading-1.3\">\n  \n    Host\n  \n  </h3>\n  \n  <span class=\"leading-1.3 text-2xl text-red-error\">Error</span>\n  \n</div>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"w-240 lg:w-full mx-auto mb-8 lg:px-8\">\n            <div class=\"clearfix\">\n                <div class=\"w-1/2 md:w-full float-left pr-6 md:pb-10 md:pr-0 leading-relaxed\">\n                    <h2 class=\"text-3xl font-normal leading-1.3 mb-4\">What happened?</h2>\n                    <p class=\"mb-2\">The origin web server timed out responding to this request.</p><p>The likely cause is an overloaded background task, database or application, stressing the resources on the host web server.</p>\n                </div>\n                <div class=\"w-1/2 md:w-full float-left leading-relaxed\">\n                    <h2 class=\"text-3xl font-normal leading-1.3 mb-4\">What can I do?</h2>\n                    \n              <h3 class=\"text-15 font-semibold mb-2\">If you're a visitor of this website:</h3>\n              <p class=\"mb-6\">Please try again in a few minutes.</p>\n\n              <h3 class=\"text-15 font-semibold mb-2\">If you're the owner of this website:</h3>\n              <p>Please refer to the <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/\">Error 524</a> article:</p>\n              <ul class=\"ml-4\">\n                <li>Contact your hosting provider; check for long-running processes or an overloaded web server.</li>\n                <li>Use status polling of large HTTP processes to avoid this error.</li>\n                <li>Run the long-running scripts on a <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/dns/proxy-status/#dns-only-records\">grey-clouded subdomain</a>.</li>\n                <li>Enterprise customers can <a rel=\"noopener noreferrer\" href=\"https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-524/#resolution-on-cloudflare\">increase the timeout setting</a> globally or for specific requests using Cache Rules.</li>\n              </ul>\n                </div>\n            </div>\n        </div>\n\n        <div class=\"cf-error-footer cf-wrapper w-240 lg:w-full py-10 sm:py-4 sm:px-8 mx-auto text-center sm:text-left border-solid border-0 border-t border-gray-300\">\n    <p class=\"text-13\">\n      <span class=\"cf-footer-item sm:block sm:mb-1\">Cloudflare Ray ID: <strong class=\"font-semibold\">a1cf11b98f721195</strong></span>\n      <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      <span id=\"cf-footer-item-ip\" class=\"cf-footer-item hidden sm:block sm:mb-1\">\n        Your IP:\n        <button type=\"button\" id=\"cf-footer-ip-reveal\" class=\"cf-footer-ip-reveal-btn\">Click to reveal</button>\n        <span class=\"hidden\" id=\"cf-footer-ip\">2401:4900:1cc4:e080:e98f:13da:7185:f51f</span>\n        <span class=\"cf-footer-separator sm:hidden\">&bull;</span>\n      </span>\n      <span class=\"cf-footer-item sm:block sm:mb-1\"><span>Performance &amp; security by</span> <a rel=\"noopener noreferrer\" href=\"https://www.cloudflare.com/5xx-error-landing?utm_source=errorcode_524&#38;utm_campaign=preprod-engine.neuoptic.in\" id=\"brand_link\" target=\"_blank\">Cloudflare</a></span>\n      \n    </p>\n    <script>(function(){function d(){var b=a.getElementById(\"cf-footer-item-ip\"),c=a.getElementById(\"cf-footer-ip-reveal\");b&&\"classList\"in b&&(b.classList.remove(\"hidden\"),c.addEventListener(\"click\",function(){c.classList.add(\"hidden\");a.getElementById(\"cf-footer-ip\").classList.remove(\"hidden\")}))}var a=document;document.addEventListener&&a.addEventListener(\"DOMContentLoaded\",d)})();</script>\n  </div><!-- /.error-footer -->\n\n    </div>\n</div>\n</body>\n</html>"}
  111 |   }
  112 | 
  113 |   throw new Error('Process payroll failed after retries');
  114 | }
  115 | 
  116 | export async function seedPayrollEmployeeWithWork(token, outletId, outletRaw) {
  117 |   const headers = {
  118 |     Authorization: `Bearer ${token}`,
  119 |     'Content-Type': 'application/json',
  120 |   };
  121 | 
  122 |   const rolesRes = await fetch(`${apiBase()}/employee/available-roles/${outletId}`, { headers });
  123 |   const rolesData = await parseJson(rolesRes);
  124 |   if (!rolesRes.ok) throw new Error('Available roles failed');
  125 |   const roles = rolesData?.data?.roles || rolesData?.roles || [];
  126 |   const parentRoleId = String(
  127 |     roles[0]?.parentRoleId?._id || roles[0]?.parentRoleId || roles[0]?._id || '',
  128 |   );
  129 | 
  130 |   const suffix = String(Date.now()).slice(-9);
  131 |   const phone = `9${suffix}`;
  132 |   const name = `PayrollSeed ${suffix}`;
  133 | 
  134 |   const createRes = await fetch(`${apiBase()}/employee/create`, {
  135 |     method: 'POST',
  136 |     headers,
  137 |     body: JSON.stringify({
  138 |       name,
  139 |       phone,
  140 |       tempPassword: 'staff123',
  141 |       outletId,
  142 |       parentRoleId,
  143 |     }),
  144 |   });
  145 |   const created = await parseJson(createRes);
  146 |   if (!createRes.ok) throw new Error(`Create staff failed: ${createRes.status}`);
  147 | 
  148 |   const employee =
  149 |     created?.data?.employee || created?.employee || created?.data || created;
  150 |   const employeeId = String(employee?._id || employee?.id || '');
  151 | 
  152 |   await fetch(`${apiBase()}/employee/staff/${employeeId}`, {
  153 |     method: 'PUT',
  154 |     headers,
  155 |     body: JSON.stringify({ salary: 12000, minHoursPerDay: 8 }),
  156 |   });
  157 | 
  158 |   const lat = outletRaw?.geofence?.latitude ?? outletRaw?.latitude ?? 12.9716;
  159 |   const lng = outletRaw?.geofence?.longitude ?? outletRaw?.longitude ?? 77.5946;
  160 | 
  161 |   const punchInRes = await fetch(`${apiBase()}/punch/owner/in-for-employee`, {
  162 |     method: 'POST',
  163 |     headers,
  164 |     body: JSON.stringify({
  165 |       targetEmployeeId: employeeId,
  166 |       outletId,
  167 |       latitude: lat,
  168 |       longitude: lng,
  169 |     }),
  170 |   });
  171 |   if (!punchInRes.ok) {
  172 |     const err = await parseJson(punchInRes);
  173 |     throw new Error(`Owner punch in failed: ${punchInRes.status} ${JSON.stringify(err)}`);
  174 |   }
  175 | 
  176 |   await new Promise((r) => setTimeout(r, 1500));
  177 | 
  178 |   const punchOutRes = await fetch(`${apiBase()}/punch/owner/out-for-employee`, {
  179 |     method: 'POST',
  180 |     headers,
  181 |     body: JSON.stringify({
  182 |       targetEmployeeId: employeeId,
  183 |       outletId,
  184 |       latitude: lat,
  185 |       longitude: lng,
  186 |     }),
  187 |   });
  188 |   if (!punchOutRes.ok) {
  189 |     const err = await parseJson(punchOutRes);
  190 |     throw new Error(`Punch out failed: ${punchOutRes.status} ${JSON.stringify(err)}`);
  191 |   }
  192 | 
  193 |   const period = await ensureProcessedPayrollPeriod(token, outletId);
  194 |   return { employeeId, name, ...period };
  195 | }
  196 | 
  197 | export async function createWebStaffUser(token, outletId) {
  198 |   const headers = {
  199 |     Authorization: `Bearer ${token}`,
  200 |     'Content-Type': 'application/json',
  201 |   };
  202 | 
  203 |   const rolesRes = await fetch(`${apiBase()}/employee/available-roles/${outletId}`, { headers });
  204 |   const rolesData = await parseJson(rolesRes);
  205 |   if (!rolesRes.ok) throw new Error('Available roles failed');
  206 |   const roles = rolesData?.data?.roles || rolesData?.roles || [];
  207 |   const parentRoleId = String(
  208 |     roles[0]?.parentRoleId?._id || roles[0]?.parentRoleId || roles[0]?._id || '',
  209 |   );
  210 | 
```