# Void Transaction Categories

Apply over Edit Transaction Categories Update. Back up the database and project and pause Raw Oil entries during installation.

1. Hostinger phpMyAdmin > select the actual ERP database > Import inventory-category-void-migration.sql. Or open the SQL tab, paste its contents and click Go. Run separately in the local Workbench database if testing with localhost. The migration adds is_active (default 1), voided_by and voided_at without changing existing names or transactions. It checks for existing columns, so it can be rerun. Do not rerun old full database dumps.
2. Replace the included code files in D:\Luxuri\luxurioffice\innocreation-erp, preserving folders.
3. From the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/inventory-settings.js innocreation-erp/raw-oil-transaction-category.js innocreation-erp/views/settings.ejs innocreation-erp/views/settings-categories.ejs innocreation-erp/views/settings-category-void.ejs innocreation-erp/inventory-settings.test.js
git commit -m "Void categories and hide them from movement dropdowns"
git push origin main
```

After Hostinger deploys the latest commit, Ctrl+F5. Local users restart npm.cmd start after applying the SQL locally. No new npm package or environment variables. server.js and .env are not included.

Use: Settings > Inventory Setting > Raw Oil Transaction Categories > Void > Confirm Void. Only active Admin can perform the POST; CSRF and explicit confirmation are required. Adjustment remains Locked and cannot be edited or voided, including via direct URLs. A stale confirmation after a rename is rejected.

Voided categories disappear from Raw Oil In/Out entry dropdowns. Previously opened forms are checked against active categories on the server and cannot save a newly voided category. Selection holds the category row lock while saving, so concurrent saving and voiding are ordered safely.

Settings retains the record with Voided status, acting Admin and timestamp, and no further Edit/Void action. There is no delete/reactivate action in this update. Duplicate names remain reserved even after voiding to avoid reusing historical category names. Existing transactions keep their stored names and remain filterable in Transaction history/Excel. Category voiding never changes stock balances or invokes transaction Void Approval.

Validation: 71 automated tests passed, including confirmation GET being read-only, Admin/CSRF protection, locked Adjustment, stale confirmations, idempotent void, preserved records, blocked edits, server-side selection rejection and disappearance from both movement forms. MySQL migration and live deployment should be verified on your instance before resuming staff entries.
