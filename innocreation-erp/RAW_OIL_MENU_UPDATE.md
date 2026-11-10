# Raw Oil Menu Update

Apply over the current Raw Oil Out Layout update.

Menu order: Overview, Raw Oil Balance, Raw Oil Transaction, Raw Oil Stock Adjustments, Raw Oil In, Raw Oil Out.
Raw Oil List is removed from menus and overview cards. Its old /list URL redirects to /summary with search, category, page and saved parameters preserved. The Balance page continues using the existing /summary URL. Balance retains Admin New Raw Oil, Set opening and Adjustment actions, filters, totals and Excel export. Item save/back links now return to Balance. Excel report titles use the new names. Adjustments remain read-only with filters/export.

Copy all included code files to D:\Luxuri\luxurioffice\innocreation-erp preserving folders, then from the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/inventory-routes.js innocreation-erp/raw-oil-routes.js innocreation-erp/raw-oil-excel.js innocreation-erp/raw-oil-adjustment-list.js innocreation-erp/views/raw-oil/content.ejs
git commit -m "Simplify Raw Oil navigation and rename Balance"
git push origin main
```

After deployment, Ctrl+F5. Local users restart the server. No SQL migration, new dependency or environment changes. Historical data is not deleted. server.js is not included.

Validation: all 51 automated tests passed, including existing balance exports, adjustments, stock controls and authorization.
