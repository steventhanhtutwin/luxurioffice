# Restore Adjustment Transaction Category

Apply over Disable Raw Oil Adjustments Update.
Copy the included files into the matching folders in D:\Luxuri\luxurioffice\innocreation-erp.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/raw-oil-transaction-category.js innocreation-erp/raw-oil-filters.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/raw-oil.test.js
git commit -m "Restore Adjustment transaction category"
git push origin main
```

After deployment, Ctrl+F5. Local users restart npm.cmd start. No SQL migration is needed: the existing transaction_category ENUM already includes Adjustment.

In and Out dropdowns again allow Purchase, Return, Adjustment. History filters show each value once. Adjustment is a transaction category label recorded with the normal In/Out stock effect, not permission to edit an existing item or opening stock. Direct stock/item adjustment controls and the Stock Adjustments menu remain disabled. Void approval remains unchanged.

Validation: all 64 tests passed, including saving all three categories and continued blocking of established-item adjustments.
