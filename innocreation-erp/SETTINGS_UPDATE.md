# Settings / Admin user management

Requires the installed Profile Update and current ERP project.

## Install

1. Stop the server with Ctrl+C and back up your project/database.
2. Extract this ZIP. Copy its files/folders into D:\Luxuri\innocreation-erp, merging folders and replacing matching files. Keep .env and all other project files.
3. Open settings-migration.sql in MySQL Workbench using your database administrator connection and execute it. Change USE innocreation_erp if you renamed the database. This expands the users.role ENUM; it retains all existing accounts and their passwords. The migration is safe to repeat with this schema.
4. Start the server:

```powershell
npm.cmd start
```

No npm install, new admin creation or inventory setup rerun is needed.
5. Login as Admin, refresh with Ctrl+F5 and click Settings on the Main Dashboard.

## Menus

Settings Dashboard → Add User / User List.

Add User fields:
- Staff Name (required)
- User Name (required, unique, no spaces, maximum 100 characters)
- Position (optional)
- User Role dropdown: Admin, Inventory, Packaging, Purchasing, Production
- Password (5 to 256 characters)
- Confirm Password (must match)

After Create User, User List displays the saved account. Give the new staff member their username and initial password through your normal private process. They can log in and change their own password from My Profile.

User List → Edit lets an administrator update Staff Name, Position and User Role. Username is read-only after creation. Password reset, disabling/deleting accounts and multi-role assignments are not included. A changed role increments the user's password_version so old sessions require a fresh login. Staff-name/position edits appear on their next authenticated request.

## Access behavior

Only Admin sees the Settings card. Every Settings route, including direct URL access and form POSTs, enforces Admin. The global account guard reads current database roles before route access. Self-profile pages remain read-only for identity and role.

Role values are stored as admin, inventory, packaging, purchasing and production; display labels are capitalized. Legacy staff accounts are retained and shown as Staff, but new assignments must use one of the five requested roles. Existing business-module access rules are unchanged; this update specifically implements Admin-only Settings and role assignment. Detailed per-module access policies can be added separately.

An administrator cannot demote their own Admin role here. The service also protects the last active administrator and verifies the acting administrator again inside a transaction before changing users. Role changes do not modify passwords. Initial passwords are stored only as salted hashes and are never displayed in the user list or echoed in validation errors.

## Files

- server.js: mounts Settings routes
- user-roles.js: allowed roles and labels
- settings-service.js: user creation, role assignment and administrator checks
- settings-routes.js: protected menus, list, create and edit
- settings-migration.sql: expands role ENUM
- views/dashboard.ejs: Admin-only Settings card
- views/settings.ejs: Settings menus and forms
- views/profile.ejs: role labels, retaining five-character password minimum
- public/settings.css: matching green/cream/gold design
- settings.test.js: access and user-management tests

## Validation

All 19 automated tests pass, including the existing login, Profile, Raw Oil and Excel export tests. Settings tests cover all five role choices, hashed five-character passwords, rejected short/mismatched passwords, duplicate usernames, invalid role submissions, Admin-only routes/card visibility, CSRF, no password disclosure, profile details/role updates and retaining administrator access.

These tests use a test database adapter. Apply the migration and verify account creation on your Windows MySQL server. Create a test Inventory account, verify its role in User List, and log in with it to confirm Settings is hidden and /settings returns Access Denied. Use an Admin account again to assign other roles as needed.
