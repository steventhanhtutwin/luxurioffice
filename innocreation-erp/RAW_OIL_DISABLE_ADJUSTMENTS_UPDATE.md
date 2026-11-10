# Disable Raw Oil Adjustments

Apply over the latest Transaction Category update. Back up the project first.

Copy included code files into D:\Luxuri\luxurioffice\innocreation-erp, keeping folders and replacing matches.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/inventory-routes.js innocreation-erp/raw-oil-routes.js innocreation-erp/raw-oil-item-service.js innocreation-erp/raw-oil-transaction-category.js innocreation-erp/raw-oil-filters.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/raw-oil-adjustment.test.js innocreation-erp/raw-oil.test.js innocreation-erp/raw-oil-no-adjustments.test.js
git commit -m "Disable Raw Oil stock adjustments for all users"
git push origin main
```

After deployment, Ctrl+F5. Local users restart npm.cmd start.
No SQL migration, package installation or environment changes are required.

- Balance no longer offers Adjustment for established items, including opening zero. Direct GET and POST editing are blocked for Admin as well as other roles, and the service independently refuses initialized items under a row lock.
- Raw Oil Stock Adjustments is removed from navigation and overview cards. Its list and Excel URLs return 404.
- Admin can still create new items and set a previously NULL opening once. Existing master code/name/category/class cannot be changed while setting this opening. An item with movements cannot have its opening set through this path.
- New In/Out transaction categories are limited to Purchase and Return; Adjustment is rejected by server validation. Existing historical Adjustment categories remain visible/filterable in Transaction history and Excel, but cannot be selected for new entries.
- Old audit records, stock values and transactions are preserved. Nothing is deleted. Existing Void Request / Accountant Approval remains the way to correct erroneous posted transactions.
- server.js and hosting settings are not included.

Validation: 64 automated tests passed, including Admin URL restrictions, no Adjustment links, one-time initial opening, zero opening protection, field tampering, rollback, new transaction category restrictions and existing void approval behavior. Live Hostinger verification remains on your instance.
