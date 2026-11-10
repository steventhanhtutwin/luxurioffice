# Raw Oil Void Approval Update

Apply over the latest Raw Oil Menu Update. Back up the database and project. Pause Raw Oil entries and adjustments during installation.

## 1. Database first
In Hostinger phpMyAdmin select the actual live ERP database, then Import raw-oil-void-migration.sql (or paste the SQL tab contents and click Go). This creates raw_oil_void_requests only, with foreign keys and indexes. No existing rows, quantities, voucher references, passwords or roles are changed. Repeat in the local database if testing locally. Do not import your full old database dump over live data.

## 2. Replace and deploy
Copy all included code files to D:\Luxuri\luxurioffice\innocreation-erp, keeping folders and replacing matches. server.js, .env and hosting settings are not included.

From the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/raw-oil-void-service.js innocreation-erp/raw-oil-void-routes.js innocreation-erp/raw-oil-void-migration.sql innocreation-erp/raw-oil-service.js innocreation-erp/raw-oil-routes.js innocreation-erp/raw-oil-filters.js innocreation-erp/raw-oil-excel.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/views/raw-oil/void-detail.ejs innocreation-erp/public/raw-oil.css innocreation-erp/raw-oil-void.test.js innocreation-erp/raw-oil-export.test.js
git commit -m "Add Raw Oil Void request and Accountant approval"
git push origin main
```

After Hostinger deploys the latest commit, refresh Ctrl+F5. No npm install or environment change is needed. Local users restart npm.cmd start after running the migration locally.

## Use
1. Give separate staff accounts the existing Warehouse Supervisor and Warehouse Accountant roles in Settings. Admin does not substitute for either role.
2. Supervisor: Raw Oil Transaction > Action (scroll the table right if needed) > Request Void. Enter a required reason and submit.
3. Status becomes Pending Void Approval. Stock still counts as posted.
4. Accountant: filter Status to Pending Void Approval, open Review Void, read the reason and transaction, then Approve Void or Reject Void. Rejection requires a reason. A requester cannot decide their own request, even after their role changes.
5. Approved requests show Voided. IN void removes that receipt from Stock In; OUT void removes that issue from Stock Out. Original transaction, date and voucher remain visible. Voided transactions cannot be edited or requested again. Rejected requests retain their audit and may be requested again with a new reason.

Voids are cancellation of the original stock effect, not a new dated receipt/issue. Balance, item lookup, availability checks, daily stock validation and Excel Balance all exclude approved voids. Pending/rejected requests still count. If approving an IN void would make any recorded daily closing negative, approval fails and the request stays Pending. OUT void restores stock subject to maximum balance. Duplicate/concurrent requests and approvals are serialized through the item lock; successful repeats do not change stock twice. Original date, quantity, reference, creator and remark cannot be changed by these controls.

## Audit and export
Transaction list retains all rows with Posted / Pending Void Approval / Voided status and filters. Excel exports all matching rows across all pages with latest void reason, requester/time, request status and decision actor/time/reject reason. Data rows remain plain; the header retains its color. Full request/rejection/re-request history is available on each transaction detail page. Audit timestamps are recorded database times, consistent with existing deployment settings.

## Validation
60 automated tests passed, covering roles/active accounts, CSRF and login protection, required reasons, self-approval prevention, retries, request history, rollback, concurrent approvals, nonnegative historical daily balances, stock checks after voiding, status filters and Excel audit columns. Accountant page visually inspected. Tests use database fixtures; run the migration and verify in your live MySQL/Hostinger instance before staff use.

Suggested live check using a safe test item: save an OUT, request void as Supervisor, confirm Balance unchanged, approve as Accountant and confirm quantity restored once; then verify Excel and reject a second test request. Preserve the audit records.
