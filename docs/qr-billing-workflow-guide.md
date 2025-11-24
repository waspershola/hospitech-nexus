# QR Billing Task Workflow Guide
**For Front Desk Staff**  
**Version:** STAFF-GUIDE-V1  
**Last Updated:** 2024-11-24

---

## Overview

The **QR Billing Task** system allows department staff (Restaurant, Bar, Laundry, Housekeeping, etc.) to escalate guest charges to the Front Desk for professional folio billing. This ensures proper financial controls and prevents unauthorized folio access.

---

## How It Works

### For Department Staff

#### Step 1: Guest Places Order via QR
- Guest scans room QR code or location QR (Pool, Bar, Spa)
- Submits order with payment preference ("Bill to Room" or "Pay Now")
- Request appears in department's queue

#### Step 2: Handle Service Request
1. Open request from `/dashboard/guest-requests`
2. Prepare order/complete service
3. Choose financial action:
   - **Collect Payment** → If guest paying cash/card now
   - **Mark as Complimentary** → Requires Manager PIN
   - **Transfer to Front Desk** → For room folio billing

#### Step 3: Transfer to Front Desk
1. Click "Transfer to Front Desk" button
2. Confirm transfer → System generates billing reference (e.g., `QR-8F2C45`)
3. **Important**: Copy billing reference and communicate to Front Desk
4. Request moves to Front Desk queue

### For Front Desk Staff

#### Step 1: Monitor QR Billing Tasks
- Navigate to **QR Billing Tasks** in sidebar (separate from Guest Requests)
- Badge counter shows pending tasks: "QR Billing Tasks (5)"
- Real-time notifications when new tasks arrive

#### Step 2: Process Billing Task
1. View pending task → Copy billing reference code
2. Navigate to **Billing Center** (two ways):
   - Direct link: `/dashboard/billing/:folioId`
   - From Room Drawer → Payments tab → "Add Charge"

#### Step 3: Add Charge with Billing Reference
1. Open "Add Charge" dialog
2. **Optional**: Enter billing reference in "Billing Reference" field
3. **Auto-Population**: System validates reference and fills:
   - Amount (from request)
   - Description (e.g., "Room service - QR Request")
   - Department (e.g., "restaurant")
4. Confirm and post charge
5. **Status Update**: Request automatically marks as "Billed to Room Folio"

---

## Payment Collection Scenarios

### Scenario A: Guest Pays Directly (No Folio)
**Department Staff Workflow**:
1. Guest orders via QR
2. Staff clicks "Collect Payment" in QR drawer
3. PaymentForm opens → Select method, provider, location
4. Submit payment
5. **Status**: Request marked as "Paid Direct" automatically

**Result**: No Front Desk involvement needed.

---

### Scenario B: Charge to Room Folio
**Department Staff Workflow**:
1. Guest orders via QR with "Bill to Room"
2. Staff clicks "Transfer to Front Desk"
3. Billing reference generated (e.g., `QR-ABC123`)

**Front Desk Workflow**:
1. Receive notification in QR Billing Tasks
2. Open Billing Center for guest's folio
3. Add Charge → Enter billing reference `QR-ABC123`
4. System auto-fills amount/description
5. Post charge to folio

**Result**: Charge appears on guest folio, request status = "Billed to Room Folio"

---

### Scenario C: Guest Pays at Checkout
**Front Desk Workflow**:
1. Guest checks out with outstanding balance
2. Collect payment via checkout process
3. **Automatic**: If payment linked to QR billing task, status updates to "Paid via Room Folio"

**Result**: Full audit trail from QR order → Folio charge → Payment collection

---

## Real-Time Features

### Badge Counter
- **Live Updates**: Counter decrements as tasks processed
- **Multi-Tab Sync**: Changes in one tab reflect immediately in others
- **No Refresh Needed**: Powered by Supabase real-time subscriptions

### Task List Updates
- Tasks disappear from list automatically when processed
- Status badges update in real-time across all views
- Notification ringtone plays when new tasks arrive

---

## Financial Actions Reference

| Action | Availability | Manager PIN Required |
|--------|-------------|---------------------|
| **Collect Payment** | Always (unless billed) | No |
| **Transfer to Front Desk** | Always (unless billed/transferred) | No |
| **Mark as Complimentary** | Always | Yes ✅ |
| **Add Charge to Folio** | Front Desk ONLY | No |
| **Print Receipt** | Always | No |

---

## Billing Status Explained

| Status | Badge Color | Meaning |
|--------|------------|---------|
| **Not Billed** | Gray | No billing action taken yet |
| **Pending Front Desk** | Yellow | Transferred, awaiting Front Desk processing |
| **Billed to Room Folio** | Green | Charge posted to guest folio |
| **Paid via Room Folio** | Green | Payment collected and reconciled |
| **Cancelled** | Red | Request cancelled (no charge) |

---

## Troubleshooting

### Problem: Billing Reference Not Found
**Error**: "Invalid billing reference"

**Causes**:
1. Reference code mistyped → Verify exact code (case-sensitive)
2. Request already billed → Check if status already "Billed to Room Folio"
3. Request from different property → Cannot use cross-tenant references

**Solution**: Re-check billing reference or contact department staff for correct code.

---

### Problem: Charge Already Posted
**Error**: "This QR billing task has already been processed"

**Cause**: Billing reference already used (prevents double-charging)

**Solution**: Verify folio transactions to confirm charge exists. If duplicate attempt, disregard.

---

### Problem: Can't See QR Billing Tasks
**Cause**: Permission issue or wrong navigation

**Solution**:
1. Verify role has access to Front Desk features
2. Check sidebar for "QR Billing Tasks" item (separate from Guest Requests)
3. Ensure not filtering by wrong status

---

### Problem: Payment Not Updating Status
**Cause**: Payment metadata missing `request_id`

**Solution**: 
1. For new payments, ensure Phase 6 deployed correctly
2. For old payments, status won't auto-update (expected)
3. Manually verify payment reconciliation if needed

---

## Best Practices

### For Department Staff
✅ Always copy billing reference before closing drawer  
✅ Communicate billing reference to Front Desk (via chat/radio)  
✅ Use "Print Receipt" to provide guest with order confirmation  
✅ Only use "Mark as Complimentary" with manager approval  

❌ Don't attempt to access Billing Center (restricted to Front Desk)  
❌ Don't close request until financial action completed  
❌ Don't use "Collect Payment" if guest explicitly requested "Bill to Room"

### For Front Desk Staff
✅ Process QR Billing Tasks promptly (monitor badge counter)  
✅ Always validate billing reference before posting charge  
✅ Verify folio belongs to correct guest before charging  
✅ Check for existing charges to avoid duplicates  

❌ Don't ignore QR Billing Tasks notifications  
❌ Don't post charges without billing reference validation  
❌ Don't override auto-populated amounts without verification

---

## Frequently Asked Questions

**Q: Can I charge the same billing reference twice?**  
A: No. The system prevents duplicate charges via database constraint. You'll receive error if attempting to reuse a reference.

**Q: What if guest disputes charge?**  
A: Contact manager to review request details and payment history. Use "Print Receipt" for proof of order.

**Q: Can I edit billing reference after posting charge?**  
A: No. Billing references are immutable once charge posted. Contact system administrator for corrections.

**Q: What happens if request deleted before billing?**  
A: Billing reference becomes invalid. Coordination with department staff required to resolve.

**Q: How do I view billing history for a QR request?**  
A: Open request drawer → Payment History and Activity Timeline tabs show full audit trail.

---

## Quick Reference: Key Pages

| Page | URL | Purpose |
|------|-----|---------|
| **QR Billing Tasks** | `/dashboard/qr-billing-tasks` | Front Desk: View pending billing tasks |
| **Guest Requests** | `/dashboard/guest-requests` | All Staff: View and manage service requests |
| **Billing Center** | `/dashboard/billing/:folioId` | Front Desk: Comprehensive folio management |
| **Finance Center** | `/dashboard/finance` | Finance: Payment providers, reconciliation |

---

## Support

For technical issues or questions about the QR Billing Task system:
- Contact System Administrator
- Review [Technical Documentation](./qr-billing-technical-docs.md)
- Check [Testing Suite](../src/test/qr-billing-status-sync.test.md) for validation scenarios
