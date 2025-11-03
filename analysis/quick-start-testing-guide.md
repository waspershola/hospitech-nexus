# 🚀 Staff Management - Quick Start Testing Guide

**Ready to Test:** All systems configured ✅  
**Next Step:** Republish app & test

---

## 🎯 Step 1: Republish Your App (CRITICAL)

**Why?** Two critical updates need deployment:
1. ✅ Email sender updated to `noreply@luxuryhotelpro.com`
2. ✅ `_redirects` file for onboarding flow

**How to Republish:**
1. Click **"Publish"** button (top-right on desktop, bottom-right on mobile preview mode)
2. Wait 2-3 minutes for deployment
3. You'll get a notification when complete

---

## ✅ Step 2: Test Staff Invitation Flow (5 minutes)

### Test A: Email Invitation (Full Flow)

**Preparation:**
- Have a test email ready (can be any email now!)
- Open two browser tabs/windows

**Steps:**
1. **In Tab 1 (As Owner):**
   - Navigate to `/dashboard/staff`
   - Click "Invite Staff"
   - Fill form:
     - Full Name: "Test Receptionist"
     - Email: your-test-email@gmail.com
     - Department: "Front Office"
     - Role: "Receptionist"
     - **LEAVE UNCHECKED:** "Generate Password Manually"
   - Click "Invite Staff"
   
   **Expected:** ✅ Toast: "Invitation sent successfully"

2. **Check Email (within 1-2 minutes):**
   - Check inbox (and spam folder)
   - Sender: "LuxuryHotelPro <noreply@luxuryhotelpro.com>"
   - Subject: "You've been invited to join [Hotel Name]"
   - Beautiful HTML email with blue button
   
   **Expected:** ✅ Email received and looks professional

3. **In Tab 2 (As New Staff):**
   - Click the invitation link in email
   - Should land on `/auth/onboard?token=...`
   - Enter password twice
   - Click "Create Account"
   
   **Expected:** ✅ Redirects to `/auth/password-change` OR dashboard

4. **Complete First Login:**
   - Change password
   - Submit
   
   **Expected:** ✅ Redirects to `/dashboard/front-desk` (frontdesk role)

5. **Verify Navigation:**
   - Check sidebar items
   
   **Expected:** ✅ Only sees: Overview, Front Desk, Bookings, Guests, Rooms, Payments

6. **Back in Tab 1 (As Owner):**
   - Refresh staff page
   - Check Staff Activity page
   
   **Expected:** ✅ New staff appears, activity logged

---

### Test B: Manual Password (Quick Test)

**Steps:**
1. Navigate to `/dashboard/staff`
2. Click "Invite Staff"
3. Fill form:
   - Full Name: "Test Housekeeper"
   - Email: housekeeper@test.com
   - Department: "Housekeeping"
   - Role: "Room Attendant"
   - **CHECK:** "Generate Password Manually" ✓
4. Click "Invite Staff"

**Expected Results:**
- ✅ Modal shows generated password
- ✅ Can copy password with button
- ✅ Success message
- ✅ Staff appears in table immediately

**Test Login:**
1. Logout
2. Login with housekeeper@test.com + copied password
3. **Expected:** ✅ Redirects to `/auth/password-change`
4. Change password
5. **Expected:** ✅ Redirects to `/dashboard/housekeeping-dashboard`
6. **Expected:** ✅ Navigation shows: Overview, Housekeeping, Rooms only

---

## ✅ Step 3: Test All Department Roles (10 minutes)

Create one staff member for each department and verify redirect:

| Role | Department | Expected Dashboard | Expected Nav Items |
|------|-----------|-------------------|-------------------|
| Receptionist | Front Office | `/dashboard/front-desk` | 6 items |
| Room Attendant | Housekeeping | `/dashboard/housekeeping-dashboard` | 3 items |
| Waiter | Food & Beverage | `/dashboard/kitchen-dashboard` | 3 items |
| Bartender | Bar | `/dashboard/bar-dashboard` | 3 items |
| Technician | Maintenance | `/dashboard/maintenance-dashboard` | 3 items |
| Cashier | Accounts | `/dashboard/finance-dashboard` | 5 items |
| Accountant | Accounts | `/dashboard/finance-center` | 6 items |
| Manager | Management | `/dashboard` | 15 items |

**Quick Test Script:**
```javascript
// For each role above:
1. Create staff (use manual password for speed)
2. Copy password
3. Logout
4. Login with new credentials
5. Verify correct dashboard loads
6. Check navigation items match expected count
7. Logout and repeat for next role
```

---

## ✅ Step 4: Test Activity Logging (3 minutes)

**Steps:**
1. Go to `/dashboard/staff-activity`
2. **Expected:** See all your test staff creations logged
3. Click on a staff member in `/dashboard/staff`
4. Edit their phone number
5. Save
6. Refresh activity page
7. **Expected:** ✅ See "staff_updated" activity
8. Change a staff member's status to "Suspended"
9. Refresh activity page
10. **Expected:** ✅ See "staff_status_changed" activity

**Verify Activity Details:**
- ✅ Each activity has timestamp
- ✅ Shows description
- ✅ Shows department and role
- ✅ Filterable by department and action

---

## ✅ Step 5: Test Permissions (5 minutes)

### Test 5A: Role Guards
1. Login as Receptionist
2. Try to access `/dashboard/configuration-center`
3. **Expected:** ✅ "Access Denied" message
4. Try to access `/dashboard/staff`
5. **Expected:** ✅ "Access Denied" message

### Test 5B: Tenant Isolation
1. Create a second tenant (or use existing)
2. Login to Tenant A
3. Note staff members
4. Login to Tenant B
5. **Expected:** ✅ Cannot see Tenant A's staff

### Test 5C: Owner-Only Actions
1. Login as Manager
2. Try to delete a staff member
3. **Expected:** ✅ Error: "Only owners can remove staff"
4. Login as Owner
5. Delete a staff member
6. **Expected:** ✅ Success, staff removed, activity logged

---

## 🎊 Success Checklist

After completing all tests, verify:

- [ ] Email invitations work for any email address
- [ ] Emails arrive within 1-2 minutes
- [ ] Email sender shows "LuxuryHotelPro <noreply@luxuryhotelpro.com>"
- [ ] Onboarding flow works from email link
- [ ] Manual password generation works
- [ ] All 10 role types create successfully
- [ ] Each role redirects to correct dashboard
- [ ] Navigation items match role permissions
- [ ] Activity logging captures all operations
- [ ] Activity is filterable
- [ ] Role guards block unauthorized access
- [ ] Tenant isolation works
- [ ] Owner-only actions are protected
- [ ] Password reset on first login works
- [ ] No errors in console during any operations

---

## 🐛 If Something Doesn't Work

### Email Not Received
1. Check spam folder
2. Check Resend dashboard: https://resend.com/emails
3. Check edge function logs:
   - https://supabase.com/dashboard/project/akchmpmzcupzjaeewdui/functions/invite-staff/logs

### Onboarding Link 404
1. Verify app was republished
2. Check `public/_redirects` file exists
3. Wait a few minutes after republish

### Wrong Dashboard Redirect
1. Check console for role mapping logs
2. Verify user_roles table has correct app role
3. Check staff table has correct department

### Activity Not Logging
1. Check console for activity logging errors
2. Verify staff_activity table permissions
3. Check if user is authenticated

---

## 📊 Expected Database State After Tests

### `staff` table
- ~10 test staff records
- Mix of departments
- All with status "active" (except suspended one)
- All with valid email addresses

### `user_roles` table
- ~10 records matching staff
- Correct app_role for each (frontdesk, housekeeping, etc.)
- All pointing to same tenant_id

### `staff_activity` table
- ~20+ activity records
- Mix of: staff_created, staff_updated, staff_status_changed
- All with descriptions and metadata

### `staff_invitations` table
- Several records with status "accepted"
- Some may still be "pending" if not accepted

---

## 🎯 Quick Validation Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Count staff by department
SELECT department, COUNT(*) 
FROM staff 
WHERE tenant_id = 'YOUR_TENANT_ID'
GROUP BY department;

-- Verify role mapping
SELECT s.email, s.role as staff_role, s.department, ur.role as app_role
FROM staff s
JOIN user_roles ur ON s.user_id = ur.user_id
WHERE s.tenant_id = 'YOUR_TENANT_ID';

-- Recent activities
SELECT * FROM staff_activity 
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY timestamp DESC 
LIMIT 20;

-- Invitation status
SELECT email, status, created_at, expires_at
FROM staff_invitations
WHERE tenant_id = 'YOUR_TENANT_ID'
ORDER BY created_at DESC;
```

---

## 🚀 You're Production Ready!

Once all tests pass, your staff management system is **fully operational** and ready for real users!

**What You Can Do Now:**
1. ✅ Invite real staff members
2. ✅ Assign roles based on departments
3. ✅ Track all staff activities
4. ✅ Enforce role-based permissions
5. ✅ Scale to hundreds of staff members

**Next Steps:**
- Train your HR team on the system
- Create internal documentation for staff onboarding
- Monitor activity logs for unusual patterns
- Consider implementing shift management (future phase)

---

**Need Help?** Check the testing guide in `analysis/staff-management-testing-guide.md` for detailed troubleshooting.

**Congratulations! Your staff management module is complete!** 🎉
