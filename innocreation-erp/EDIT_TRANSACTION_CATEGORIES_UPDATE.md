# Edit Transaction Categories Except Adjustment

Apply over Inventory Settings Categories Update.
Copy the included code files into D:\Luxuri\luxurioffice\innocreation-erp, preserving folders and replacing matches.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/inventory-settings.js innocreation-erp/views/settings.ejs innocreation-erp/views/settings-categories.ejs innocreation-erp/views/settings-category-edit.ejs innocreation-erp/raw-oil-transaction-category.js innocreation-erp/raw-oil-routes.js innocreation-erp/inventory-settings.test.js
git commit -m "Allow category editing except locked Adjustment"
git push origin main
```

After Hostinger deploys, Ctrl+F5. Local users restart npm.cmd start. No new SQL, packages or environment changes are required. The prior Inventory Settings migration must already have been run.

Settings > Inventory Setting > Raw Oil Transaction Categories now has an Action column. Adjustment shows Locked; Purchase, Return and custom categories show Edit. Only active Admin can save. The server refuses changing Adjustment even if its edit URL is directly requested or posted. Duplicate names and stale forms are rejected. No delete action is added.

A renamed category appears under its new name in current In/Out dropdowns; refresh open forms after editing. Historical transactions retain their saved category text as an audit snapshot. Transaction history filters include both current master names and historical stored names so old records remain filterable. No transaction quantities, balances, references, void requests or stock adjustment permissions are changed.

Validation: 69 automated tests passed, including locked Adjustment GET/POST access, Admin/CSRF checks, duplicate names, stale edit prevention, success messages and existing user/stock protections. Live Hostinger verification remains on your instance.
