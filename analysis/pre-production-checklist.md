# 📋 Staff Management Module - Pre-Production Checklist

**Before Going Live:** Complete this checklist

---

## ✅ Phase 1: Critical Configuration

- [ ] **Domain Verified**
  - Domain: luxuryhotelpro.com ✅
  - DNS records added ✅
  - Resend shows "Verified" ✅

- [ ] **Email Sender Updated**
  - invite-staff function: noreply@luxuryhotelpro.com ✅
  - manage-staff function: noreply@luxuryhotelpro.com ✅

- [ ] **App Republished**
  - Click Publish button
  - Wait for completion
  - Verify deployment successful

---

## ✅ Phase 2: Basic Functionality Tests

- [ ] **Manual Password Creation**
  - Create staff with "Generate Password Manually" ✅
  - Password displays in modal
  - Can copy password
  - Can login with credentials
  - Forced password change on first login

- [ ] **Email Invitation**
  - Create staff without manual password
  - Email received within 2 minutes
  - Email looks professional
  - Sender shows LuxuryHotelPro
  - Link in email works
  - Onboarding completes successfully

- [ ] **Role Mapping**
  - Test 3-5 different roles
  - Verify correct app_role in database
  - No console errors

---

## ✅ Phase 3: Navigation & Routing

- [ ] **Owner Login**
  - Lands on /dashboard ✅
  - Sees all navigation items (18+)

- [ ] **Manager Login**
  - Lands on /dashboard ✅
  - Sees most navigation items (15+)

- [ ] **Front Desk Login**
  - Lands on /dashboard/front-desk ✅
  - Sees 6 navigation items only

- [ ] **Housekeeping Login**
  - Lands on /dashboard/housekeeping-dashboard ✅
  - Sees 3 navigation items only

- [ ] **Finance Login**
  - Lands on /dashboard/finance-dashboard ✅
  - Sees finance-related items only

---

## ✅ Phase 4: Activity Logging

- [ ] **Creation Logged**
  - Create staff
  - Check staff_activity table
  - Verify entry exists

- [ ] **Updates Logged**
  - Edit staff member
  - Check activity log
  - Verify update recorded

- [ ] **Status Changes Logged**
  - Change staff status
  - Check activity log
  - Verify status change recorded

- [ ] **Activity Filtering**
  - Filter by department
  - Filter by action type
  - Both filters work

---

## ✅ Phase 5: Security & Permissions

- [ ] **Tenant Isolation**
  - Cannot see other tenant's staff ✅
  - Cannot edit other tenant's staff ✅

- [ ] **Role Guards**
  - Receptionist blocked from /staff ✅
  - Manager blocked from /configuration-center ✅

- [ ] **Owner-Only Actions**
  - Manager cannot delete staff ✅
  - Owner can delete staff ✅

- [ ] **Password Security**
  - Passwords are hashed ✅
  - Reset required on first login ✅
  - Cannot login with old password ✅

---

## ✅ Phase 6: Edge Cases

- [ ] **Duplicate Email**
  - Try to create staff with existing email
  - Error message shown
  - Staff not created

- [ ] **Missing Fields**
  - Submit form with empty required fields
  - Validation prevents submission

- [ ] **Expired Invitation**
  - Try to accept old invitation
  - Error shown

- [ ] **Network Error Handling**
  - Disconnect internet
  - Try to create staff
  - Error message shown

---

## ✅ Phase 7: Performance

- [ ] **Page Load Speed**
  - /dashboard/staff loads in <2s ✅
  - No layout shifts
  - No flash of wrong content

- [ ] **API Response Times**
  - Staff creation <1s ✅
  - Staff list fetch <500ms ✅
  - Activity log fetch <500ms ✅

- [ ] **Console Clean**
  - No errors in console ✅
  - No warnings (except dev warnings) ✅
  - No failed network requests

---

## ✅ Phase 8: Database Health

- [ ] **RLS Policies Active**
  ```sql
  SELECT tablename, policyname 
  FROM pg_policies 
  WHERE tablename IN ('staff', 'user_roles', 'staff_activity');
  ```
  - All expected policies exist ✅

- [ ] **Indexes Present**
  - staff.tenant_id indexed ✅
  - staff.email indexed ✅
  - staff_activity.tenant_id indexed ✅

- [ ] **No Orphaned Records**
  ```sql
  -- Check for staff without user_roles
  SELECT s.* FROM staff s
  LEFT JOIN user_roles ur ON s.user_id = ur.user_id
  WHERE ur.user_id IS NULL;
  ```
  - Should return 0 rows

---

## ✅ Phase 9: Documentation

- [ ] **Internal Docs Ready**
  - Quick start guide created ✅
  - Testing guide created ✅
  - Final status report created ✅

- [ ] **User Training Materials**
  - How to invite staff
  - How to manage permissions
  - How to read activity logs

- [ ] **Support Runbook**
  - Common issues & solutions
  - Edge function logs location
  - Database queries for debugging

---

## ✅ Phase 10: Monitoring Setup

- [ ] **Error Tracking**
  - Edge function logs monitored
  - Console errors tracked
  - Failed email sends logged

- [ ] **Activity Monitoring**
  - Unusual activity patterns watched
  - Bulk operations logged
  - Failed login attempts tracked

- [ ] **Performance Monitoring**
  - Slow queries identified
  - API response times tracked
  - User-reported issues logged

---

## 🎯 Go/No-Go Decision

### ✅ GO if:
- [x] All Phase 1-6 items checked ✅
- [x] No critical errors in testing ✅
- [x] Documentation complete ✅
- [x] Team trained on system ✅

### ❌ NO-GO if:
- [ ] Email invitations failing
- [ ] Role mapping errors
- [ ] Security vulnerabilities found
- [ ] Performance issues

---

## 🚀 Launch Day Tasks

### Hour 0 (Go-Live)
- [ ] Announce system to team
- [ ] Monitor edge function logs
- [ ] Watch for error spikes

### Hour 1
- [ ] Create first real staff member
- [ ] Verify email received
- [ ] Check activity log

### Hour 4
- [ ] Review any reported issues
- [ ] Check database for anomalies
- [ ] Verify all roles working

### Day 1
- [ ] Collect user feedback
- [ ] Fix any minor issues
- [ ] Update documentation

### Week 1
- [ ] Review activity patterns
- [ ] Optimize slow queries
- [ ] Plan phase 7 features

---

## 📊 Success Metrics (Week 1)

Track these metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| Staff created | 10+ | ___ |
| Email delivery rate | >95% | ___% |
| Login success rate | >90% | ___% |
| Activity log entries | 50+ | ___ |
| Error rate | <5% | ___% |
| User satisfaction | 8/10 | ___/10 |

---

## ✅ Sign-Off

**Technical Lead:** _________________ Date: _______

**Project Manager:** _________________ Date: _______

**Security Review:** _________________ Date: _______

**Ready for Production:** ☐ Yes ☐ No

**Notes:**
_______________________________________
_______________________________________
_______________________________________

---

**After completing this checklist, you're ready to go live!** 🚀

Refer to `analysis/quick-start-testing-guide.md` for detailed testing procedures.
