# 🧪 Staff Management Module - Comprehensive Testing Guide

**Version:** 1.0  
**Last Updated:** 2025-11-03  
**Phases Covered:** 1, 3, 5

---

## 📋 Pre-Testing Checklist

- [ ] Logged in as **Owner** account
- [ ] Access to `/dashboard/staff` page
- [ ] RESEND_API_KEY configured (for email testing)
- [ ] Multiple test email addresses ready
- [ ] Browser console open for debugging

---

## 🎯 Test Scenarios

### **Test Suite 1: Staff Creation with Role Mapping**

**Objective:** Verify all staff roles map correctly to application roles

#### Test 1.1: Front Office Staff
```
Role: receptionist
Department: front_office
Expected App Role: frontdesk
Expected Result: ✅ Staff created successfully
```

**Steps:**
1. Click "Invite Staff" button
2. Fill form:
   - Full Name: "John Doe"
   - Email: "john.receptionist@test.com"
   - Department: "Front Office"
   - Role: "Receptionist"
   - Enable "Generate Password Manually"
3. Submit
4. **Verify:**
   - Success toast appears
   - Password displayed in modal
   - Can copy password
   - Staff appears in table with status "Active"

**Database Verification:**
```sql
-- Check staff record
SELECT * FROM staff WHERE email = 'john.receptionist@test.com';

-- Check user_roles (should show 'frontdesk')
SELECT ur.role FROM user_roles ur
JOIN staff s ON s.user_id = ur.user_id
WHERE s.email = 'john.receptionist@test.com';

-- Check activity log
SELECT * FROM staff_activity 
WHERE description LIKE '%john.receptionist@test.com%'
ORDER BY timestamp DESC LIMIT 1;
```

#### Test 1.2: Housekeeping Staff
```
Role: room_attendant
Department: housekeeping
Expected App Role: housekeeping
```

#### Test 1.3: Kitchen Staff
```
Role: cook
Department: kitchen
Expected App Role: restaurant
```

#### Test 1.4: Bar Staff
```
Role: bartender
Department: bar
Expected App Role: bar
```

#### Test 1.5: Maintenance Staff
```
Role: technician
Department: maintenance
Expected App Role: maintenance
```

#### Test 1.6: Finance Staff
```
Role: cashier
Department: accounts
Expected App Role: finance
```

#### Test 1.7: Accountant
```
Role: accountant
Department: accounts
Expected App Role: accountant
```

#### Test 1.8: Manager
```
Role: manager
Department: management
Expected App Role: manager
```

#### Test 1.9: Supervisor
```
Role: supervisor
Department: front_office
Expected App Role: supervisor
```

#### Test 1.10: Owner
```
Role: owner
Department: management
Expected App Role: owner
```

---

### **Test Suite 2: Activity Logging**

**Objective:** Verify all staff operations are logged correctly

#### Test 2.1: Staff Creation Logging
1. Create a new staff member (use manual password)
2. Navigate to "Staff Activity" page
3. **Verify:**
   - Most recent activity shows "staff_created"
   - Description includes staff name and email
   - Department and role are recorded
   - Metadata includes `created_by` and `app_role`

#### Test 2.2: Staff Update Logging
1. Edit an existing staff member (change phone number)
2. Save changes
3. Check activity log
4. **Verify:**
   - New activity with action "staff_updated"
   - Description shows staff name
   - Timestamp is current

#### Test 2.3: Status Change Logging
1. Select a staff member
2. Click "Suspend" (or change status)
3. Confirm action
4. Check activity log
5. **Verify:**
   - Activity shows "staff_status_changed"
   - Description includes new status
   - Metadata includes `new_status` and `changed_by`

#### Test 2.4: Staff Removal Logging
1. Select a staff member
2. Click "Delete" (Owner only)
3. Confirm deletion
4. Check activity log
5. **Verify:**
   - Activity shows "staff_removed"
   - Description includes removed staff's name and email
   - Metadata includes `removed_by` and `removed_staff_id`

#### Test 2.5: Activity Filtering
1. Go to Staff Activity page
2. Filter by department
3. **Verify:** Only activities from that department show
4. Filter by action type
5. **Verify:** Only activities of that type show

---

### **Test Suite 3: Role-Based Navigation**

**Objective:** Verify each role sees appropriate navigation and lands on correct dashboard

#### Test 3.1: Owner Navigation
1. Login as Owner
2. **Verify Redirect:** Lands on `/dashboard` (Overview)
3. **Verify Navigation Items:**
   - Overview
   - Front Desk
   - Bookings
   - Guests
   - Rooms
   - Categories
   - Payments
   - Wallets
   - Finance Center
   - Finance Dashboard
   - Debtors
   - Kitchen
   - Bar
   - Housekeeping
   - Maintenance
   - Staff
   - Staff Activity
   - Reports
   - Configuration

#### Test 3.2: Manager Navigation
1. Login as Manager
2. **Verify Redirect:** Lands on `/dashboard`
3. **Verify Navigation:** Similar to Owner but without Configuration Center

#### Test 3.3: Front Desk Navigation
1. Login as Receptionist (frontdesk role)
2. **Verify Redirect:** Lands on `/dashboard/front-desk`
3. **Verify Navigation Items:**
   - Overview
   - Front Desk
   - Bookings
   - Guests
   - Rooms
   - Payments
4. **Verify Restrictions:** Cannot access:
   - Finance Center
   - Configuration
   - Staff Management
   - Reports

#### Test 3.4: Housekeeping Navigation
1. Login as Room Attendant (housekeeping role)
2. **Verify Redirect:** Lands on `/dashboard/housekeeping-dashboard`
3. **Verify Navigation Items:**
   - Overview
   - Housekeeping
   - Rooms
4. **Verify Restrictions:** Cannot access other modules

#### Test 3.5: Finance Navigation
1. Login as Cashier (finance role)
2. **Verify Redirect:** Lands on `/dashboard/finance-dashboard`
3. **Verify Navigation Items:**
   - Overview
   - Payments
   - Wallets
   - Finance Dashboard
   - Debtors
   - Reports

#### Test 3.6: Accountant Navigation
1. Login as Accountant
2. **Verify Redirect:** Lands on `/dashboard/finance-center`
3. **Verify Navigation:** Finance + Finance Center access

#### Test 3.7: Restaurant Staff Navigation
1. Login as Waiter (restaurant role)
2. **Verify Redirect:** Lands on `/dashboard/kitchen-dashboard`
3. **Verify Navigation Items:**
   - Overview
   - Kitchen
   - Payments

#### Test 3.8: Bar Staff Navigation
1. Login as Bartender (bar role)
2. **Verify Redirect:** Lands on `/dashboard/bar-dashboard`
3. **Verify Navigation Items:**
   - Overview
   - Bar
   - Payments

#### Test 3.9: Maintenance Navigation
1. Login as Technician (maintenance role)
2. **Verify Redirect:** Lands on `/dashboard/maintenance-dashboard`
3. **Verify Navigation Items:**
   - Overview
   - Maintenance
   - Rooms

#### Test 3.10: Supervisor Navigation
1. Login as Supervisor (front_office department)
2. **Verify Redirect:** Lands on `/dashboard/front-desk`
3. **Verify Navigation:** Department items + "My Team"
4. **Verify:** Can access staff page with filtered view

---

### **Test Suite 4: Password Reset Flow**

**Objective:** Verify staff can reset password on first login

#### Test 4.1: Manual Password Creation
1. Create staff with "Generate Password Manually"
2. Copy the generated password
3. Logout
4. Login with new staff credentials
5. **Verify:** Redirected to `/auth/password-change`
6. Enter new password
7. **Verify:** Redirected to role-appropriate dashboard

#### Test 4.2: Password Reset by Manager
1. As Owner/Manager, select a staff member
2. Click "Reset Password"
3. **Verify:** Modal shows with new password
4. Copy password
5. **Verify:** Activity logged
6. Test login with new password
7. **Verify:** Must change password on first login

---

### **Test Suite 5: Email Invitation Flow**

**Objective:** Verify email invitations work (requires verified domain)

⚠️ **Prerequisites:**
- Resend domain verified
- `from` address updated in edge function

#### Test 5.1: Send Email Invitation
1. Create staff WITHOUT "Generate Password Manually"
2. Submit form
3. **Verify:**
   - Success toast: "Invitation sent successfully"
   - Check inbox of invited email
   - Email received with invitation link
   - Email formatting is correct

#### Test 5.2: Accept Invitation
1. Click link in invitation email
2. **Verify:** Lands on `/auth/onboard?token=...`
3. Enter password twice
4. Submit
5. **Verify:**
   - Account created
   - Redirected to password change page OR dashboard
   - Can login with new credentials

#### Test 5.3: Expired Invitation
1. Create invitation
2. Wait 7 days (or manually update DB)
3. Try to accept invitation
4. **Verify:** Error message about expired invitation

#### Test 5.4: Already Accepted Invitation
1. Accept an invitation
2. Try to use the same link again
3. **Verify:** Error message or redirect to login

---

### **Test Suite 6: Permissions & Access Control**

**Objective:** Verify RLS policies and role guards work correctly

#### Test 6.1: Tenant Isolation
1. Create staff in Tenant A
2. Login to Tenant B
3. **Verify:** Cannot see Tenant A's staff

#### Test 6.2: Role Guard - Staff Page
1. Login as Receptionist (frontdesk)
2. Try to access `/dashboard/staff`
3. **Verify:** "Access Denied" message (not in allowedRoles)

#### Test 6.3: Role Guard - Configuration
1. Login as Manager
2. Try to access `/dashboard/configuration-center`
3. **Verify:** Access denied (Owner only)

#### Test 6.4: Owner-Only Actions
1. Login as Manager
2. Try to delete a staff member
3. **Verify:** Error message (only owners can remove staff)

#### Test 6.5: Supervisor Department Filter
1. Login as Supervisor (housekeeping department)
2. Go to staff page
3. **Verify:** Only sees housekeeping staff
4. **Verify:** Can manage their team

---

### **Test Suite 7: Edge Cases & Error Handling**

#### Test 7.1: Duplicate Email
1. Create staff with email@test.com
2. Try to create another staff with same email
3. **Verify:** Error message "Staff member with this email already exists"

#### Test 7.2: Invalid Email Format
1. Enter invalid email (e.g., "notanemail")
2. **Verify:** Form validation prevents submission

#### Test 7.3: Missing Required Fields
1. Leave Full Name empty
2. Try to submit
3. **Verify:** Form validation shows error

#### Test 7.4: Network Error Handling
1. Disconnect internet
2. Try to create staff
3. **Verify:** Appropriate error message displayed

#### Test 7.5: Unmapped Role/Department Combo
1. Create edge case (if possible)
2. **Verify:** Falls back to 'frontdesk' role
3. Check console logs for warning

---

## 🔍 Console Log Verification

During testing, monitor console for these log patterns:

### Successful Staff Creation
```
[Role Mapping] Input - Role: "receptionist", Department: "front_office"
[Role Mapping] Department map: front_office.receptionist → frontdesk
Staff account created with manual password: <user_id>
```

### Email Invitation
```
[Role Mapping] Input - Role: "waiter", Department: "food_beverage"
[Role Mapping] Department map: food_beverage.waiter → restaurant
Staff invitation created: <invitation_id> for <email>
```

### Activity Logging
```
Activity logged: staff_created for <staff_name>
```

---

## 📊 Test Results Template

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | Front Office Staff Creation | ☐ Pass ☐ Fail | |
| 1.2 | Housekeeping Staff Creation | ☐ Pass ☐ Fail | |
| 1.3 | Kitchen Staff Creation | ☐ Pass ☐ Fail | |
| 1.4 | Bar Staff Creation | ☐ Pass ☐ Fail | |
| 1.5 | Maintenance Staff Creation | ☐ Pass ☐ Fail | |
| 1.6 | Finance Staff Creation | ☐ Pass ☐ Fail | |
| 1.7 | Accountant Creation | ☐ Pass ☐ Fail | |
| 1.8 | Manager Creation | ☐ Pass ☐ Fail | |
| 1.9 | Supervisor Creation | ☐ Pass ☐ Fail | |
| 1.10 | Owner Creation | ☐ Pass ☐ Fail | |
| 2.1 | Creation Logging | ☐ Pass ☐ Fail | |
| 2.2 | Update Logging | ☐ Pass ☐ Fail | |
| 2.3 | Status Change Logging | ☐ Pass ☐ Fail | |
| 2.4 | Removal Logging | ☐ Pass ☐ Fail | |
| 2.5 | Activity Filtering | ☐ Pass ☐ Fail | |
| 3.1 | Owner Navigation | ☐ Pass ☐ Fail | |
| 3.2 | Manager Navigation | ☐ Pass ☐ Fail | |
| 3.3 | Front Desk Navigation | ☐ Pass ☐ Fail | |
| 3.4 | Housekeeping Navigation | ☐ Pass ☐ Fail | |
| 3.5 | Finance Navigation | ☐ Pass ☐ Fail | |
| 3.6 | Accountant Navigation | ☐ Pass ☐ Fail | |
| 3.7 | Restaurant Navigation | ☐ Pass ☐ Fail | |
| 3.8 | Bar Navigation | ☐ Pass ☐ Fail | |
| 3.9 | Maintenance Navigation | ☐ Pass ☐ Fail | |
| 3.10 | Supervisor Navigation | ☐ Pass ☐ Fail | |
| 4.1 | Manual Password Creation | ☐ Pass ☐ Fail | |
| 4.2 | Manager Password Reset | ☐ Pass ☐ Fail | |
| 5.1 | Send Email Invitation | ☐ Pass ☐ Fail | Requires domain |
| 5.2 | Accept Invitation | ☐ Pass ☐ Fail | Requires domain |
| 6.1 | Tenant Isolation | ☐ Pass ☐ Fail | |
| 6.2 | Staff Page Guard | ☐ Pass ☐ Fail | |
| 6.3 | Config Page Guard | ☐ Pass ☐ Fail | |
| 6.4 | Owner-Only Actions | ☐ Pass ☐ Fail | |
| 7.1 | Duplicate Email | ☐ Pass ☐ Fail | |
| 7.2 | Invalid Email | ☐ Pass ☐ Fail | |
| 7.3 | Missing Fields | ☐ Pass ☐ Fail | |

---

## 🐛 Known Issues & Workarounds

### Issue 1: Email Sending Limited
**Problem:** Resend development mode restricts emails  
**Workaround:** Use "Generate Password Manually" option  
**Fix:** Verify domain at https://resend.com/domains

### Issue 2: Published Site 404 on /auth/onboard
**Problem:** `_redirects` file not deployed  
**Workaround:** N/A  
**Fix:** Republish the application

---

## ✅ Acceptance Criteria

All tests must pass with following criteria:

1. **Staff Creation:** 100% success rate for all role/department combinations
2. **Activity Logging:** All CRUD operations logged with correct metadata
3. **Navigation:** Each role sees only allowed navigation items
4. **Dashboard Routing:** Users land on correct dashboard based on role
5. **Permissions:** RLS policies prevent cross-tenant access
6. **Error Handling:** Graceful error messages for all edge cases
7. **Console Logs:** No errors or warnings in console during normal operations

---

## 📝 Test Execution Notes

**Tester Name:** _______________  
**Test Date:** _______________  
**Environment:** ☐ Development ☐ Staging ☐ Production  
**Browser:** _______________  
**Overall Pass Rate:** ____ / ____ tests

**Critical Issues Found:**
- 

**Minor Issues Found:**
- 

**Recommendations:**
- 

---

**Next Steps After Testing:**
1. Fix any failing tests
2. Update documentation with any discovered edge cases
3. Create user training materials
4. Deploy to production
5. Monitor activity logs for unusual patterns
