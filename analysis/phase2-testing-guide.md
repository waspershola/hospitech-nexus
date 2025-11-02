# 🧪 Phase 2 Testing Guide - Staff Authentication

## ✅ COMPLETE FEATURES TO TEST

### 1️⃣ Direct Staff Creation Flow
**Location:** `/dashboard/staff` → "Add Staff" button

**Test Steps:**
1. Click "Add Staff" button
2. Fill in staff details:
   - Full name
   - Email (use a real email you can access)
   - Phone, department, role, branch
3. Click "Create Staff"
4. **Expected Results:**
   - ✅ Staff record created in database
   - ✅ Auth user created automatically
   - ✅ Welcome email sent with temp password
   - ✅ `password_reset_required = true` flag set
   - ✅ Toast notification confirms success

**Check Email:**
- Subject: "Welcome to [Hotel Name]"
- Contains temporary password
- Instructions to change password on first login

---

### 2️⃣ Staff Invitation Flow
**Location:** `/dashboard/staff` → "Invite Staff" button

**Test Steps:**
1. Click "Invite Staff" button
2. Enter email, department, role
3. Click "Send Invitation"
4. **Expected Results:**
   - ✅ Invitation record created
   - ✅ Email sent with onboarding link
   - ✅ Appears in Pending Invitations widget
   - ✅ 7-day expiry countdown shown

**Check Email:**
- Contains unique invitation link
- Link format: `/auth/onboard?token=xxx`
- Expiry notice (7 days)

---

### 3️⃣ Staff Onboarding (Accept Invitation)
**Location:** `/auth/onboard?token=xxx` (from email)

**Test Steps:**
1. Click invitation link from email
2. Enter full name and create password
3. Confirm password
4. Click "Complete Registration"
5. **Expected Results:**
   - ✅ Auth user created
   - ✅ Staff record created
   - ✅ Invitation marked as accepted
   - ✅ Redirected to dashboard
   - ✅ Removed from pending invitations

---

### 4️⃣ First Login - Password Change Required
**Location:** `/auth/login`

**Test Steps:**
1. Login with staff email + temp password
2. **Expected Results:**
   - ✅ Login succeeds
   - ✅ Redirected to `/auth/password-change`
   - ✅ Security alert shown
   - ✅ Cannot access dashboard until password changed

**Password Change Page:**
1. Enter current (temp) password
2. Enter new password (min 8 chars)
3. Confirm new password
4. Click "Change Password"
5. **Expected Results:**
   - ✅ Password updated
   - ✅ `password_reset_required` flag cleared
   - ✅ Redirected to dashboard
   - ✅ Toast confirms success

---

### 5️⃣ Manager-Triggered Password Reset
**Location:** `/dashboard/staff` → KeyRound icon on staff row

**Test Steps:**
1. Click password reset icon (🔑) on any staff member
2. Confirm reset in modal
3. Click "Reset Password"
4. **Expected Results:**
   - ✅ New temp password generated
   - ✅ Email sent to staff with credentials
   - ✅ `password_reset_required = true` flag set
   - ✅ Activity logged
   - ✅ Staff must change password on next login

---

### 6️⃣ Pending Invitations Management
**Location:** `/dashboard/staff` → Pending Invitations widget (top of page)

**Test Resend:**
1. Click "Resend" on pending invitation
2. **Expected Results:**
   - ✅ New email sent
   - ✅ Token refreshed
   - ✅ Expiry reset to 7 days
   - ✅ Toast confirms sent

**Test Cancel:**
1. Click "Cancel" on pending invitation
2. **Expected Results:**
   - ✅ Invitation status → cancelled
   - ✅ Removed from widget
   - ✅ Token invalidated (can't be used)

---

## 🔍 DATABASE VERIFICATION

### Staff Table Checks
```sql
-- Check staff record has auth linkage
SELECT id, full_name, email, user_id, password_reset_required, status
FROM staff
WHERE email = 'test@example.com';
```

### Auth Users Check
```sql
-- Verify auth user exists
SELECT id, email, created_at
FROM auth.users
WHERE email = 'test@example.com';
```

### Invitations Check
```sql
-- Check invitation status
SELECT email, status, expires_at, accepted_at
FROM staff_invitations
WHERE email = 'test@example.com'
ORDER BY created_at DESC;
```

---

## 🚨 EDGE CASES TO TEST

### Duplicate Prevention
- ✅ Cannot create staff with existing email
- ✅ Cannot invite email that already has account
- ✅ Clear error messages shown

### Expired Invitations
- ✅ Link shows expiry error after 7 days
- ✅ Can resend to create new token
- ✅ Old tokens invalidated

### Invalid Tokens
- ✅ Shows error for invalid invitation tokens
- ✅ Shows error for already-accepted tokens
- ✅ Redirect to login with message

### Password Validation
- ✅ Minimum 8 characters enforced
- ✅ Passwords must match
- ✅ Clear validation messages
- ✅ Current password verified before change

---

## 📧 EMAIL DELIVERY CHECK

**If emails not arriving:**
1. Check Supabase Auth settings
2. Verify RESEND_API_KEY secret exists
3. Check spam/junk folders
4. Test with different email providers
5. Check Edge Function logs:
   - `invite-staff` logs
   - `reset-password` logs
   - `manage-staff` logs

---

## 🎯 SUCCESS CRITERIA

All features work end-to-end:
- [ ] Direct staff creation with auth
- [ ] Email invitations sent & received
- [ ] Onboarding flow completes
- [ ] First login enforces password change
- [ ] Password reset by manager works
- [ ] Pending invitations managed (resend/cancel)
- [ ] All emails delivered successfully
- [ ] Database records consistent
- [ ] No security vulnerabilities

---

## 🐛 KNOWN ISSUES / NOTES

- Email delivery depends on Supabase Auth email provider
- Invitation links valid for 7 days only
- Temp passwords are 8 random characters
- Staff login now checks `password_reset_required` flag
- Department field stored in AuthContext for future use

---

## 📊 PHASE 2 STATUS: ✅ COMPLETE

**Ready for:**
- ✅ End-to-end testing
- ✅ User acceptance testing
- ⏳ Phase 3: Department Dashboards
- ⏳ Phase 4: Advanced Features
