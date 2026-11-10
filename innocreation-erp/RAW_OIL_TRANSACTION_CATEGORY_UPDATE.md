# Raw Oil Transaction Category Update

Apply over the Raw Oil Transaction Columns / Void Approval version. Back up the database and project and pause Raw Oil saves during installation.

1. In Hostinger phpMyAdmin select your actual ERP database, then Import raw-oil-transaction-category-migration.sql. Or paste it in SQL and click Go. This adds the nullable ENUM column transaction_category with fixed values Purchase, Return, Adjustment. It checks whether the column exists, so rerunning does not erase data. Existing rows stay NULL (unknown) rather than being guessed. Run separately in the local MySQL Workbench database if using localhost; select that database first.
2. Copy the included code files into D:\Luxuri\luxurioffice\innocreation-erp, replacing matches and preserving folders.
3. From the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/raw-oil-transaction-category.js innocreation-erp/raw-oil-service.js innocreation-erp/raw-oil-routes.js innocreation-erp/raw-oil-filters.js innocreation-erp/raw-oil-excel.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/views/raw-oil/void-detail.ejs innocreation-erp/raw-oil.test.js innocreation-erp/raw-oil-export.test.js innocreation-erp/raw-oil-void.test.js
git commit -m "Add fixed Raw Oil transaction categories"
git push origin main
```

After Hostinger deploys, Ctrl+F5. Local users restart npm.cmd start. No new package installation or environment changes. server.js and .env are not included.

Both In and Out now have a required Transaction Category dropdown before Scan Item Code. No default is silently selected; choose Purchase, Return or Adjustment. Both directions allow all three values as requested. Server validation rejects arbitrary text and missing selections. If another validation fails, the selected category remains on the form.

History displays the saved category in its own column after the existing Type / Status / Action group. A separate Transaction Category filter combines with search, direction, status and date filters and stays in pagination links. Excel appends the category column and exports every matching row. Transaction detail / Void review also displays it. Existing Item Categories are independent and remain unchanged.

Older uncategorized transactions display an em dash; Excel leaves them blank. No historical category is inferred. Category is a transaction label, while IN/OUT still controls stock direction. Choosing Adjustment does not edit item master/opening stock or bypass existing Void approvals. Existing stock, date locking, auto reference numbers and void history remain intact.

Validation: 62 automated tests passed before the final column placement adjustment, including required fixed categories persisted for both directions, invalid/missing values rejected, form rendering, filtering and Excel values. The template was then checked for valid field placement. Live MySQL migration and Hostinger verification remain local.
