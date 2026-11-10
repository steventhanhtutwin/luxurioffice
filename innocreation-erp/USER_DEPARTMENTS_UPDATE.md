# User Departments Update

Apply over Settings User List Default / Void Transaction Categories updates. Back up the live database and project and pause Settings user/department edits while installing.

## 1. Database first
Hostinger phpMyAdmin > select the actual ERP database > Import user-departments-migration.sql (or paste it in SQL and click Go). If testing at localhost, select the local ERP schema in Workbench and run the same SQL there too.

Creates departments (unique name, active/void state and actor/timestamps) and adds nullable users.department_id with a foreign key. Existing users remain unassigned; no role, password or stock is changed. The script checks whether the user column exists and can be rerun. No department names are assumed or automatically seeded.

## 2. Code
Replace the included files in D:\Luxuri\luxurioffice\innocreation-erp, preserving folders. server.js and .env are not included.

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/departments.js innocreation-erp/settings-service.js innocreation-erp/settings-routes.js innocreation-erp/views/settings.ejs innocreation-erp/views/settings-departments.ejs innocreation-erp/public/settings.css innocreation-erp/departments.test.js innocreation-erp/settings.test.js innocreation-erp/settings-reset.test.js
git commit -m "Manage Departments and assign users"
git push origin main
```

After Hostinger deploys the latest commit, Ctrl+F5. Local users restart npm.cmd start after migrating locally. No package installation or environment change is needed.

## Use
- Settings > User Management > Department List appears directly under Add User.
- Active Admin can create a Department on the list page, edit its name or Void through a confirmation page. Names are required, trimmed, maximum 100 characters and unique. Search and pagination are included.
- Add User and Edit User have a Department dropdown. Create departments first, then choose one when saving a user. Unassigned is permitted so existing accounts can be assigned gradually. Department is independent from User Role; it does not grant module access.
- User List now includes Department. Rename preserves the Department ID and shows the new name for all assigned users.
- Void hides a Department from new assignments without deleting it or clearing existing user assignments. Existing users retain it, shown as Voided; their other profile fields can still be saved with that unchanged assignment. They can be reassigned to an active department or cleared to unassigned. A user without the current assignment cannot be newly assigned to a voided department, including forged requests.
- Voided departments cannot be edited and their names stay reserved. There is no delete/reactivate action. Creator, last editor and void actor/time are stored; list shows create and void details.
- Settings still opens User List directly. Existing password reset, roles, category management and stock protections remain intact.

## Validation
74 automated tests passed, including Admin/CSRF checks, duplicate and invalid names, stale edits, one-time Void confirmation, assignment persistence, department rename identity, blocked inactive assignment, retaining a current inactive department, dropdown rendering and user/password regressions. Edit User visually checked; mobile has no page overflow. Tests use database fixtures; verify the SQL migration and live Hostinger operation before resuming staff changes.
