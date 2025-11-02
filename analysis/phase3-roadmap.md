# 🚀 Phase 3 Roadmap - Department Dashboards & Role Navigation

## 🎯 OBJECTIVE
Create department-specific dashboards and role-based navigation for staff members.

---

## 📋 PLANNED FEATURES

### 1️⃣ Department Dashboards
**Goal:** Each department sees relevant tools and data

#### **Front Office Dashboard**
- Quick check-in/check-out
- Today's arrivals/departures
- Room availability at-a-glance
- Guest search
- Pending requests

#### **Housekeeping Dashboard**
- Rooms to clean (priority queue)
- Maintenance requests
- Cleaning status updates
- Room inspection checklist
- Daily task completion

#### **Kitchen/Restaurant Dashboard**
- Room service orders
- Active guest charges
- Menu management
- Inventory alerts
- Daily revenue

#### **Maintenance Dashboard**
- Open repair requests
- Room status (out of order)
- Preventive maintenance schedule
- Equipment tracking
- Work order management

#### **Accounts/Finance Dashboard**
- Today's payments
- Outstanding receivables
- Wallet transactions
- Payment reconciliation
- Financial reports

---

### 2️⃣ Role-Based Navigation
**Goal:** Users only see menu items they have permission for

**Implementation:**
- Use `navigation_items` table (already exists)
- Filter by `allowed_roles` array
- Dynamic sidebar based on role
- Department-aware navigation
- Breadcrumb tracking

**Example:**
```typescript
// Housekeeping staff sees:
- Dashboard (housekeeping view)
- Rooms (cleaning status)
- Maintenance (create requests)
- Profile

// Finance staff sees:
- Dashboard (finance view)
- Payments
- Wallets
- Receivables
- Reports
- Finance Center
```

---

### 3️⃣ Login Redirect Logic
**Goal:** Staff redirected to department dashboard after login

**Rules:**
1. **Owner/Manager** → General dashboard overview
2. **Front Desk** → Front desk dashboard
3. **Housekeeping** → Cleaning task list
4. **Restaurant/Bar** → Active orders
5. **Maintenance** → Open work orders
6. **Finance/Accountant** → Financial overview

**Implementation in Login.tsx:**
```typescript
if (staffData?.department) {
  const redirectMap = {
    'front_office': '/dashboard/frontdesk',
    'housekeeping': '/dashboard/housekeeping',
    'kitchen': '/dashboard/kitchen',
    'maintenance': '/dashboard/maintenance',
    'accounts': '/dashboard/finance',
  };
  
  navigate(redirectMap[staffData.department] || '/dashboard');
}
```

---

### 4️⃣ Department Widgets
**Goal:** Reusable widgets for department dashboards

**Widgets to Create:**
- Quick stats cards (KPIs)
- Task lists (department-specific)
- Recent activity feed
- Alerts/notifications
- Quick actions (buttons)
- Performance metrics

**File Structure:**
```
src/modules/departments/
  ├── housekeeping/
  │   ├── CleaningTaskWidget.tsx
  │   ├── RoomInspectionWidget.tsx
  │   └── DailyProgressWidget.tsx
  ├── frontdesk/
  │   ├── TodayArrivalsWidget.tsx
  │   ├── QuickCheckInWidget.tsx
  │   └── RoomAvailabilityWidget.tsx
  ├── kitchen/
  │   ├── ActiveOrdersWidget.tsx
  │   └── RevenueWidget.tsx
  └── maintenance/
      ├── WorkOrdersWidget.tsx
      └── EquipmentStatusWidget.tsx
```

---

### 5️⃣ Permission Checks
**Goal:** Prevent unauthorized access to features

**Use `useRole()` hook:**
```typescript
const { can, department, isMyDepartment } = useRole();

// Check permission
if (!can(PERMISSIONS.BOOKINGS.VIEW)) {
  return <AccessDenied />;
}

// Check department
if (!isMyDepartment('housekeeping')) {
  return <Redirect to="/dashboard" />;
}
```

---

## 📁 NEW FILES TO CREATE

### Pages:
- `src/pages/dashboard/HousekeepingDashboard.tsx` ✅ (exists)
- `src/pages/dashboard/MaintenanceDashboard.tsx` ✅ (exists)
- `src/pages/dashboard/KitchenDashboard.tsx` (NEW)
- `src/pages/dashboard/BarDashboard.tsx` (NEW)

### Components:
- `src/components/layout/DepartmentShell.tsx`
- `src/components/shared/QuickActionPanel.tsx`
- `src/components/shared/DepartmentKPIs.tsx`

### Hooks:
- `src/hooks/useDepartmentTasks.ts`
- `src/hooks/useDepartmentKPIs.ts`

---

## 🔧 MODIFICATIONS NEEDED

### 1. Update Sidebar Navigation
**File:** `src/components/layout/Sidebar.tsx`
- Fetch from `navigation_items` table
- Filter by user role
- Group by department
- Highlight active routes

### 2. Update App.tsx Routes
**File:** `src/App.tsx`
- Add department dashboard routes
- Add role guards to routes
- Add redirect logic

### 3. Update Login Flow
**File:** `src/pages/auth/Login.tsx`
- Add department-based redirect
- Welcome message with department
- Show relevant onboarding tips

### 4. Enhance AuthContext
**File:** `src/contexts/AuthContext.tsx`
- Already has `department` field ✅
- Add `getDepartmentDashboard()` helper

---

## ⏱️ ESTIMATED TIME

| Task | Time |
|------|------|
| Navigation system | 2 hours |
| Housekeeping dashboard | 2 hours |
| Kitchen/Bar dashboard | 2 hours |
| Maintenance dashboard enhancements | 1 hour |
| Login redirect logic | 1 hour |
| Testing & refinement | 2 hours |
| **TOTAL** | **~10 hours** |

---

## 🧪 TESTING CHECKLIST

- [ ] Each role sees correct navigation
- [ ] Department dashboards load correctly
- [ ] Login redirects to correct dashboard
- [ ] Permissions prevent unauthorized access
- [ ] Widgets show relevant data
- [ ] Mobile responsive
- [ ] No permission escalation bugs

---

## 📊 PHASE 3 STATUS: 🟡 PLANNED

**Dependencies:**
- ✅ Phase 2 complete (Staff auth)
- ✅ `navigation_items` table exists
- ✅ `useRole()` hook exists
- ✅ Department field in staff table

**Next Steps:**
1. Implement dynamic navigation
2. Create department dashboards
3. Add login redirect logic
4. Build department widgets
5. Test all roles thoroughly

---

## 💡 FUTURE ENHANCEMENTS (Phase 4)

- Real-time notifications per department
- Department performance analytics
- Shift scheduling
- Inter-department messaging
- Mobile app for staff
- QR code check-ins
- Voice commands
- AI-powered task prioritization
