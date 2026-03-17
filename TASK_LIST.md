# NeoEngine Dashboard — Checkpoint-Based Task List

> **Implementation order:** Complete each checkpoint before moving to the next.  
> **Status key:** ⬜ Not started | 🔄 In progress | ✅ Done

---

## Checkpoint 1: Project Setup & Auth (Foundation) ✅

**Goal:** Scaffold React app, configure tooling, implement login flows for Super Admin and Owner.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1.1 | Create Vite + React + TypeScript project | ✅ | Manual scaffold (Vite 5) |
| 1.2 | Install dependencies: React Router, Axios, TanStack Query, Tailwind, React Hook Form, Zod | ✅ | |
| 1.3 | Configure Tailwind CSS | ✅ | |
| 1.4 | Set up folder structure (api, components, layouts, pages, hooks, types) | ✅ | |
| 1.5 | Create API client with base URL + auth interceptor | ✅ | `VITE_API_BASE_URL` env |
| 1.6 | Create auth store/context (user, token, login, logout) | ✅ | Zustand |
| 1.7 | Build Login page (Super Admin + Owner tabs or separate routes) | ✅ | |
| 1.8 | Implement Super Admin login → redirect to /super-admin/dashboard | ✅ | |
| 1.9 | Implement Owner login → redirect to /owner/dashboard (handle first-login → set-password) | ✅ | |
| 1.10 | Create ProtectedRoute component (redirect to /login if no token) | ✅ | |
| 1.11 | Create App layout with sidebar (placeholder nav items) | ✅ | |
| 1.12 | Add role-based route guards (Super Admin vs Owner routes) | ✅ | |

**Checkpoint 1 Done When:** User can log in as Super Admin or Owner and land on respective dashboard (empty placeholder).

---

## Checkpoint 2: Super Admin Module

**Goal:** Full Super Admin functionality.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 2.1 | Super Admin dashboard: summary cards (total owners, outlets, employees) | ⬜ | |
| 2.2 | Owners list page: table with search, pagination | ⬜ | May need new backend list endpoint |
| 2.3 | Create Owner form + API integration | ⬜ | POST /api/admin/create-owner |
| 2.4 | Outlets list page: table with owner, search | ⬜ | May need cross-owner list endpoint |
| 2.5 | Create Outlet form + API integration | ⬜ | POST /api/admin/create-outlet |
| 2.6 | System analytics: basic charts (punches last 30d, growth) | ⬜ | Use existing or new analytics endpoints |

**Checkpoint 2 Done When:** Super Admin can create owners, create outlets, view lists, see system stats.

---

## Checkpoint 3: Owner Dashboard & Outlet Management

**Goal:** Owner home and outlet CRUD.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 3.1 | Outlet selector component (dropdown in header/sidebar) | ⬜ | |
| 3.2 | Owner dashboard: today summary (staff in, break, absent) | ⬜ | GET /api/manager/dashboard or similar |
| 3.3 | Owner dashboard: late arrivals banner | ⬜ | |
| 3.4 | Owner dashboard: quick stats cards | ⬜ | |
| 3.5 | Owner dashboard: recent activity list | ⬜ | |
| 3.6 | Outlets list page | ⬜ | GET /api/owner/outlets |
| 3.7 | Create Outlet form | ⬜ | POST /api/owner/create-outlet |
| 3.8 | Edit Outlet form | ⬜ | PUT /api/owner/outlet/:id (if exists) |

**Checkpoint 3 Done When:** Owner sees meaningful dashboard and can manage outlets.

---

## Checkpoint 4: Staff & Role Management

**Goal:** Employee and role CRUD.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 4.1 | Employees list page: table, filters (outlet, role, search) | ⬜ | |
| 4.2 | Create Employee form | ⬜ | |
| 4.3 | Edit Employee form | ⬜ | |
| 4.4 | Staff profile / detail view | ⬜ | |
| 4.5 | Roles list (Parent + Active roles) | ⬜ | |
| 4.6 | Create/Edit Role form | ⬜ | |
| 4.7 | Assign role to employee | ⬜ | |

**Checkpoint 4 Done When:** Owner can create/edit staff and roles.

---

## Checkpoint 5: Tasks, Hierarchy & Briefing Pool

**Goal:** Task templates, hierarchy tree, briefing pool.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 5.1 | Task templates list | ⬜ | |
| 5.2 | Create/Edit task template | ⬜ | |
| 5.3 | Task template groups list + CRUD | ⬜ | |
| 5.4 | Hierarchy tree page (drag-drop or tree view) | ⬜ | |
| 5.5 | Escalation rules config | ⬜ | |
| 5.6 | Briefing pool: staff with not-done/escalated tasks | ⬜ | |
| 5.7 | Complete task on behalf of staff | ⬜ | |

**Checkpoint 5 Done When:** Owner can manage tasks, hierarchy, and use briefing pool.

---

## Checkpoint 6: Attendance & Punch

**Goal:** Punch for staff, attendance view.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 6.1 | Punch for staff UI (select employee, punch in/out/break) | ⬜ | |
| 6.2 | Attendance list: filter by outlet, date, employee | ⬜ | |
| 6.3 | Punch history table | ⬜ | |
| 6.4 | Export attendance (CSV) | ⬜ | |

**Checkpoint 6 Done When:** Owner can punch for staff and view attendance.

---

## Checkpoint 7: Leave Management

**Goal:** Leave requests, rules, holidays.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 7.1 | Leave requests list: filters | ⬜ | |
| 7.2 | Approve/Reject leave | ⬜ | |
| 7.3 | Assign leave to staff | ⬜ | |
| 7.4 | Leave rules: block weekdays | ⬜ | |
| 7.5 | Leave rules: Calendarific holidays | ⬜ | |
| 7.6 | Leave rules: custom blocked dates | ⬜ | |

**Checkpoint 7 Done When:** Owner can manage leaves and rules.

---

## Checkpoint 8: Payroll

**Goal:** Pay periods, process, payments.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 8.1 | Pay periods list | ⬜ | |
| 8.2 | Create pay period | ⬜ | |
| 8.3 | Process payroll | ⬜ | |
| 8.4 | Add payments (salary, advance, etc.) | ⬜ | |
| 8.5 | Lock period | ⬜ | |
| 8.6 | Payslip view per employee | ⬜ | |
| 8.7 | Export payroll | ⬜ | |

**Checkpoint 8 Done When:** Owner can run full payroll workflow.

---

## Checkpoint 9: Analytics & Activity

**Goal:** Charts, reports, activity feed.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 9.1 | Staff analytics (hours, tasks) | ⬜ | |
| 9.2 | Task analytics (completion by role) | ⬜ | |
| 9.3 | Leave trend chart | ⬜ | |
| 9.4 | Attendance trend | ⬜ | |
| 9.5 | Activity feed with filters | ⬜ | |
| 9.6 | Export reports | ⬜ | |

**Checkpoint 9 Done When:** Owner has analytics and activity views.

---

## Checkpoint 10: Polish & Extra Features

**Goal:** Documents, location, bulk ops, UX polish.

| # | Task | Status | Notes |
|---|------|--------|-------|
| 10.1 | Staff documents list + upload | ⬜ | |
| 10.2 | Location map (live / history) | ⬜ | |
| 10.3 | Bulk operations (e.g., bulk approve leaves) | ⬜ | |
| 10.4 | Data export (CSV) for major lists | ⬜ | |
| 10.5 | Dark mode toggle | ⬜ | |
| 10.6 | Responsive polish (tablet) | ⬜ | |
| 10.7 | Error boundaries, loading states | ⬜ | |
| 10.8 | Audit trail / soft delete recovery | ⬜ | |

**Checkpoint 10 Done When:** Dashboard is production-ready with polish.

---

## Backend Gaps (If Any)

Some features may require new backend endpoints. Track here:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| GET /api/admin/owners | List all owners (Super Admin) | ⬜ |
| GET /api/admin/outlets | List all outlets (Super Admin) | ⬜ |
| GET /api/admin/analytics | System-wide analytics | ⬜ |
| PUT /api/owner/outlet/:id | Update outlet | ⬜ |
| (Others as discovered) | | |

---

## Quick Start Commands

```bash
# Create project
cd c:\dev\NeoManager
npm create vite@latest neoengine-dashboard -- --template react-ts
cd neoengine-dashboard

# Install deps
npm install react-router-dom axios @tanstack/react-query
npm install -D tailwindcss postcss autoprefixer
npm install react-hook-form @hookform/resolvers zod

# Run dev
npm run dev
```

---

*Update status as you complete tasks. Use `✅` when done, `🔄` when in progress.*
