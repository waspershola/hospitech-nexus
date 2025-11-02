# 🚀 Staff Management - Phase 2 Action Plan

## IMMEDIATE PRIORITY TASKS

### 1. Fix Direct Staff Creation (CRITICAL)
**Issue:** "Add Staff" creates records without auth.users linkage

**Implementation:**
- Update `manage-staff` edge function CREATE handler
- Auto-create auth.users with temporary password
- Generate 8-character random password
- Send welcome email with credentials
- Set password_reset_required = true
- Force password change on first login

**Code Location:** `supabase/functions/manage-staff/index.ts`

### 2. Temporary Password Reset System
**New Features Needed:**
- Password reset link generation
- Temporary password email template
- Password change enforcement on first login
- Manager-triggered password reset option

**Components to Create:**
- ResetPasswordModal (for managers)
- PasswordChangeRequired page (for staff)
- Edge function: send-password-reset

### 3. Pending Invitations Dashboard
**Location:** Staff page tabs
- Show all pending invitations
- Resend button for each
- Cancel/expire option
- Status badges (pending/expired/accepted)
- Expiry countdown

## SECONDARY TASKS

### 4. Staff Login Flow Enhancement
- Check password_reset_required flag
- Redirect to password change if needed
- Show welcome message for new staff
- Department-specific dashboard redirect

### 5. Email Templates
- Welcome email with temp password
- Password reset email
- Account activated notification

## QUICK WINS

1. Add invitation status column to staff table
2. Show "Invited by" information
3. Add invitation date tracking
4. Implement bulk invitation import (CSV)

## FILES TO MODIFY

### Edge Functions:
- `supabase/functions/manage-staff/index.ts` - Add auth.users creation
- `supabase/functions/send-password-reset/index.ts` - NEW
- `supabase/functions/invite-staff/index.ts` - Update email template

### Frontend:
- `src/pages/dashboard/Staff.tsx` - Add invitations tab
- `src/components/auth/PasswordChangeRequired.tsx` - NEW
- `src/modules/staff/ResetPasswordModal.tsx` - NEW
- `src/modules/staff/PendingInvitationsWidget.tsx` - NEW

### Hooks:
- `src/hooks/usePasswordReset.ts` - NEW
- Update `src/hooks/useStaffManagement.ts` - Add reset password

## ESTIMATED TIME
- Task 1: 1 hour
- Task 2: 1.5 hours
- Task 3: 1 hour
- Task 4: 30 minutes
- Task 5: 1 hour

**Total: ~5 hours for Phase 2 completion**

## TESTING CHECKLIST
- [ ] Direct staff creation works
- [ ] Auth user is created
- [ ] Welcome email sent
- [ ] Password reset enforced
- [ ] Temporary password works
- [ ] Manager can reset passwords
- [ ] Invitations display correctly
- [ ] All emails deliver successfully

## NEXT SESSION START HERE:
1. Update manage-staff CREATE handler
2. Implement password generation utility
3. Create welcome email template
4. Test end-to-end flow
