# Admin Password Reset Update

Apply to the current ERP project. Back up first.

Files: settings-routes.js, settings-service.js, views/settings.ejs, public/settings.css, settings-reset.test.js.

Local installation:
1. Stop the server with Ctrl+C.
2. Extract and copy the files into the ERP folder, replacing matching files and preserving folders.
3. Run npm.cmd start and refresh with Ctrl+F5.

Hostinger / GitHub installation:
Copy the same files into the repository's innocreation-erp folder. From the repository root:

```powershell
git add innocreation-erp/settings-routes.js innocreation-erp/settings-service.js innocreation-erp/views/settings.ejs innocreation-erp/public/settings.css innocreation-erp/settings-reset.test.js
git commit -m "Add admin password reset"
git push origin main
```

Let Hostinger auto-deploy the latest commit, or redeploy the latest main branch.
No SQL migration, environment variable changes or npm install required. This update does not replace server.js or your hosting configuration.

Use: Settings > User List > Edit > Reset Password > Confirm Reset Password.
Only an active Admin can execute the reset. Confirmation uses a separate page and CSRF-protected POST. Password is always reset to 123456 and stored hashed. password_version increments to invalidate previous sessions on their next request. User can log in using 123456 and change it in My Profile. Resetting your own Admin account logs you out too. User names, roles and profile changes in the edit form are not saved by the separate reset action; save those first if needed.

Validation: 47 automated tests pass, including fixed-password hashing, session invalidation, admin authorization, missing users, confirmation, CSRF and route/template rendering. Live Hostinger database verification remains on your deployed instance.
