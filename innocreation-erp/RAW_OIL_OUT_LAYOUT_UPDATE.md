# Raw Oil Out From/To Layout Update

Apply over the Raw Oil Out Auto Reference update.

Copy views/raw-oil/content.ejs into D:\Luxuri\luxurioffice\innocreation-erp\views\raw-oil, replacing the matching file.

From the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/views/raw-oil/content.ejs
git commit -m "Show From before To in Raw Oil Out"
git push origin main
```

After Hostinger deploys, refresh with Ctrl+F5. Local users restart their server.
No SQL migration, package installation or environment changes.

Raw Oil Out now shows From (Warehouse) on the left and To (destination selection) on the right. On narrow screens From appears above To. Raw Oil In retains From on the left and To (Warehouse) on the right. The input IDs, names and submitted values are unchanged; only DOM display order is changed. Automatic dates and voucher references remain included from the previous update.

Validation: rendered both In and Out templates and verified field order and a single destination selector in each.
