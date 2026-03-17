# NeoEngine Dashboard — Product Requirements Document

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Status:** Draft → Implementation

---

## 1. Executive Summary

**NeoEngine Dashboard** is a React-based web application that provides Owners, Admins, and Super Admins with a centralized control panel to manage all NeoManager outlets, staff, and operations. It complements the mobile app by offering desktop-first workflows, bulk operations, advanced analytics, and system-wide administration.

**Target Users:**
- **Super Admin** — Platform-level control, create owners/outlets, system analytics
- **Admin** — (Future: multi-owner management, support role)
- **Owner** — Restaurant owner managing their outlets, staff, payroll, tasks

---

## 2. Project Structure

```
NeoManager/
├── NeoManagerApp/          # React Native mobile app (existing)
├── NeoManagerBackend/      # Node.js API (existing)
└── neoengine-dashboard/    # React web dashboard (NEW)
    ├── src/
    ├── public/
    ├── PRD.md
    ├── TASK_LIST.md
    └── package.json
```

---

## 3. User Roles & Permissions

### 3.1 Super Admin
| Capability | Access |
|------------|--------|
| Create Owner | ✓ |
| Create Outlet (assign to owner) | ✓ |
| View all owners | ✓ |
| View all outlets (cross-owner) | ✓ |
| System analytics (usage, growth) | ✓ |
| Audit logs | ✓ |
| Platform settings | ✓ |
| Impersonate / view as owner | ✓ (read-only) |

### 3.2 Owner
| Capability | Access |
|------------|--------|
| Manage own outlets | ✓ |
| Manage staff (employees) | ✓ |
| Create/edit roles | ✓ |
| Task templates & groups | ✓ |
| Hierarchy & escalation | ✓ |
| Leave management | ✓ |
| Payroll | ✓ |
| Analytics (own outlets) | ✓ |
| Punch for staff | ✓ |
| Briefing pool | ✓ |
| Documents | ✓ |
| Location tracking | ✓ |

### 3.3 Admin (Future)
| Capability | Access |
|------------|--------|
| Support multiple owners | ✓ |
| View cross-owner analytics | ✓ |
| Support tickets / help | ✓ |

---

## 4. Feature Requirements

### 4.1 Authentication

| Feature | Description | Priority |
|---------|-------------|----------|
| Super Admin Login | Email + password, JWT | P0 |
| Owner Login | Email + password, JWT | P0 |
| First-time password setup | Redirect to set-password flow | P0 |
| Logout | Clear token, redirect to login | P0 |
| Session persistence | LocalStorage/sessionStorage | P0 |
| Password reset (future) | Email-based reset flow | P2 |

### 4.2 Super Admin Module

| Feature | Description | Priority |
|---------|-------------|----------|
| Create Owner | Form: name, email, password, phone | P0 |
| Create Outlet | Form: name, address, phone, ownerId, geofence | P0 |
| Owners List | Table with search, pagination | P0 |
| Outlets List | Table with owner, search, pagination | P0 |
| System Analytics | Total owners, outlets, employees, punches (last 30d) | P0 |
| Usage Trends | Charts: punches/day, new users/week | P1 |
| Audit Log | Key actions (create owner, create outlet) | P1 |
| Impersonate Owner | View dashboard as owner (read-only) | P2 |

### 4.3 Owner Dashboard (Home)

| Feature | Description | Priority |
|---------|-------------|----------|
| Outlet selector | Dropdown to switch active outlet | P0 |
| Today summary | Staff checked in, on break, absent | P0 |
| Late arrivals banner | Staff who punched in late | P0 |
| Quick stats | Total staff, active tasks, pending leaves | P0 |
| Recent activity | Last 10 punches/tasks | P0 |
| Charts | Hours worked (7d), task completion rate | P1 |

### 4.4 Staff & Outlet Management

| Feature | Description | Priority |
|---------|-------------|----------|
| Employee list | Table: name, role, outlet, status | P0 |
| Create employee | Form: name, phone, role, outlet, salary, etc. | P0 |
| Edit employee | Update details | P0 |
| Bulk import | CSV/Excel import (from contacts format) | P1 |
| Role management | Parent roles, active roles per outlet | P0 |
| Create/edit role | Role form | P0 |
| Outlet list | Owner's outlets | P0 |
| Create/edit outlet | Name, address, phone, geofence, shifts | P0 |
| Staff profile | View employee details, documents | P0 |

### 4.5 Tasks & Escalation

| Feature | Description | Priority |
|---------|-------------|----------|
| Task templates list | Filter by outlet, type | P0 |
| Create task template | Single task or group | P0 |
| Edit task template | Update template | P0 |
| Task template groups | Groups with occurrence rules | P0 |
| Escalation rules | Configure per role | P0 |
| Hierarchy tree | Drag-drop tree UI per outlet | P0 |
| Briefing pool | Staff with not-done/escalated tasks | P0 |
| Complete task (on behalf) | Mark task done for staff | P0 |

### 4.6 Attendance & Punch

| Feature | Description | Priority |
|---------|-------------|----------|
| Punch for staff | Punch in/out, break start/end | P0 |
| Attendance list | Filter by outlet, date, employee | P0 |
| Punch history | Table with location, time | P0 |
| Export attendance | CSV export | P1 |

### 4.7 Leave Management

| Feature | Description | Priority |
|---------|-------------|----------|
| Leave requests list | Filter: status, employee, date | P0 |
| Approve/reject leave | With reason | P0 |
| Assign leave | Assign leave to staff | P0 |
| Leave rules | Block weekdays, holidays, custom dates | P0 |
| Calendarific holidays | View/select India holidays | P0 |
| Custom blocked dates | Add via calendar | P0 |

### 4.8 Payroll

| Feature | Description | Priority |
|---------|-------------|----------|
| Pay periods list | Create, view, process, lock | P0 |
| Create pay period | Date range, outlet | P0 |
| Process payroll | Compute earned from punches | P0 |
| Payments | Salary, advance, deduction, adjustment | P0 |
| Lock period | Prevent further edits | P0 |
| Export payroll | CSV/Excel | P1 |
| Payslip view | Per employee, per period | P0 |

### 4.9 Analytics

| Feature | Description | Priority |
|---------|-------------|----------|
| Staff analytics | Hours, breaks, tasks per employee | P0 |
| Task analytics | Completion rate by role | P0 |
| Leave trend | Approved/rejected over time | P1 |
| Attendance trend | Punch patterns, late arrivals | P1 |
| Payroll summary | Total paid, advances, by period | P1 |
| Export reports | PDF/CSV | P2 |

### 4.10 Location Tracking

| Feature | Description | Priority |
|---------|-------------|----------|
| Live map | Current employee locations (outlet) | P1 |
| Location history | Per employee, date range | P1 |
| Away periods | Time outside geofence | P1 |

### 4.11 Documents

| Feature | Description | Priority |
|---------|-------------|----------|
| Staff documents list | View by employee | P0 |
| Upload document | Aadhar, PAN, etc. | P1 |
| Delete document | Soft delete | P1 |

### 4.12 Face Verification (Admin View)

| Feature | Description | Priority |
|---------|-------------|----------|
| Face registration status | Per employee | P1 |
| Register for colleague | (Mobile-only; dashboard shows status) | P2 |

### 4.13 Activity Feed

| Feature | Description | Priority |
|---------|-------------|----------|
| Outlet activity | Punches, tasks, leaves | P0 |
| Filters | Date, type, employee | P0 |

---

## 5. Extra Features (Web-Specific)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Bulk operations** | Bulk approve leaves, bulk punch, bulk assign tasks | P1 |
| **Advanced filters** | Multi-select, date ranges, saved filters | P1 |
| **Data export** | CSV/Excel for all major lists | P1 |
| **Notifications** | In-app toast + optional email digest | P1 |
| **Dark mode** | Theme toggle | P2 |
| **Keyboard shortcuts** | Quick nav (e.g., G+D for Dashboard) | P2 |
| **Responsive design** | Tablet-friendly layouts | P0 |
| **Real-time updates** | WebSocket/polling for live punch status | P2 |
| **Audit trail** | Who changed what, when (soft delete recovery) | P1 |
| **Multi-language** | i18n (match app: 13 languages) | P2 |
| **Dashboard widgets** | Customizable home widgets | P2 |
| **Scheduled reports** | Email weekly/monthly summaries | P2 |

---

## 6. Technical Architecture

### 6.1 Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18+ |
| Build | Vite |
| Language | TypeScript |
| Routing | React Router v6 |
| State | TanStack Query (React Query) + Zustand (optional) |
| UI | Tailwind CSS + shadcn/ui (or similar component library) |
| Charts | Recharts or Chart.js |
| Forms | React Hook Form + Zod |
| HTTP | Axios (with interceptors for auth) |
| Auth | JWT in localStorage, Axios interceptor |

### 6.2 API Integration

- **Base URL:** `https://neoengine-be.neuoptic.in/api` (production) or `http://localhost:3000/api` (dev)
- **Auth:** `Authorization: Bearer <token>`
- **Endpoints:** Reuse existing backend routes (see FEATURES.md API Route Summary)

### 6.3 Project Structure (Proposed)

```
neoengine-dashboard/
├── src/
│   ├── api/              # API client, endpoints
│   ├── components/       # Reusable UI components
│   ├── layouts/          # App layout, sidebar
│   ├── pages/             # Route pages
│   │   ├── auth/
│   │   ├── super-admin/
│   │   ├── owner/
│   │   │   ├── dashboard/
│   │   │   ├── staff/
│   │   │   ├── tasks/
│   │   │   ├── attendance/
│   │   │   ├── leave/
│   │   │   ├── payroll/
│   │   │   ├── analytics/
│   │   │   └── settings/
│   │   └── shared/
│   ├── hooks/            # Custom hooks
│   ├── stores/           # Zustand stores (if used)
│   ├── utils/            # Helpers
│   ├── types/            # TypeScript types
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
├── PRD.md
└── TASK_LIST.md
```

### 6.4 Routing Structure

```
/                          → Redirect to /login or /owner/dashboard
/login                     → Login (Super Admin / Owner)
/login/super-admin         → Super Admin login
/login/owner               → Owner login

/super-admin/
  /dashboard               → System overview
  /owners                  → Owners list, create
  /outlets                 → Outlets list, create
  /analytics               → System analytics

/owner/
  /dashboard               → Owner home
  /outlets                 → Outlets list, create/edit
  /staff                   → Employees list, create/edit
  /roles                   → Roles management
  /tasks                   → Task templates, groups
  /hierarchy               → Hierarchy tree
  /briefing-pool           → Briefing pool
  /attendance              → Attendance, punch for staff
  /leave                   → Leave management
  /payroll                 → Payroll periods, payments
  /analytics               → Analytics
  /activity                → Activity feed
  /documents               → Staff documents
  /settings                → Profile, outlet settings
```

---

## 7. UI/UX Guidelines

- **Design system:** Consistent with mobile app (Teal/Stone palette where applicable)
- **Sidebar navigation:** Collapsible, role-based menu items
- **Tables:** Sortable, filterable, paginated
- **Forms:** Clear validation, loading states
- **Empty states:** Helpful messages when no data
- **Error handling:** Toast notifications, inline errors
- **Loading:** Skeleton loaders for tables/cards

---

## 8. Security

- JWT stored in `localStorage` (or `httpOnly` cookie if backend supports)
- Axios interceptor: attach token, handle 401 → redirect to login
- Role-based route guards: prevent Owner from accessing Super Admin routes
- CORS: Backend must allow dashboard origin
- No sensitive data in URLs (use POST for sensitive operations)

---

## 9. Deployment

- **Build:** `npm run build`
- **Output:** `dist/` (static files)
- **Hosting:** Vercel, Netlify, or static hosting
- **Env:** `VITE_API_BASE_URL` for API URL

---

## 10. Success Metrics

- All P0 features implemented and functional
- < 3s initial load (LCP)
- Responsive on 1024px+ viewports
- Zero critical security issues
- Backend API compatibility (no backend changes required for P0)

---

*For implementation checkpoints, see `TASK_LIST.md`.*
