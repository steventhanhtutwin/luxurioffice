# Settings Opens User List

Apply over Void Transaction Categories Update.
Replace the included files in the matching folders under D:\Luxuri\luxurioffice\innocreation-erp.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/settings-routes.js innocreation-erp/views/settings.ejs innocreation-erp/inventory-settings.test.js
git commit -m "Open Settings on User List"
git push origin main
```

After deployment, Ctrl+F5. Local users restart npm.cmd start. No SQL, npm installation or environment changes.
Settings Dashboard is removed from the sidebar. Opening /settings redirects immediately to /settings/users, where User Management is expanded and User List is active. Inventory Setting and all existing user/category actions remain available. Admin-only authorization remains enforced.
All 71 tests passed, including the new default redirect assertion.
