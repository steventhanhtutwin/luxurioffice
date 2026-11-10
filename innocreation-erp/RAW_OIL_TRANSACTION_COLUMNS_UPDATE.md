# Raw Oil Transaction Column Layout

Apply over the Raw Oil Void Approval Update.
Copy views/raw-oil/content.ejs into the matching folder in your GitHub-linked project, replacing the existing file.

New order: ID, Date, Vr No, Item Code, Item Name, Categories, Type, Status, Request Void / Action, From, To, Qty, Remark, Entered By.
Only the web table layout changes. Permissions, approvals, stock calculations and Excel layout remain the same. No SQL migration is required.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/views/raw-oil/content.ejs
git commit -m "Move Raw Oil status and action beside Type"
git push origin main
```

After deployment, Ctrl+F5. Local users restart the server.
Verified rendered header/cell order for Supervisor, Accountant and Inventory roles.
