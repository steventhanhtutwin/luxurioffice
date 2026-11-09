# Personal profile and password change

Requires the current Innocreation ERP project with Inventory installed.

## Install

1. Stop the server with Ctrl+C. Back up your project and database.
2. Copy the files/folders from this ZIP into D:\Luxuri\innocreation-erp. Replace matching files and merge folders. Keep .env and all other files, including your plain Excel export styling.
3. In MySQL Workbench, connect as the database administrator and open profile-migration.sql. Execute it ONCE. It adds position and password_version to the existing users table. Change USE innocreation_erp if your database has another name.
4. Start the app:

```powershell
npm.cmd start
```

No npm install or user/account recreation is required. Do not run the original setup scripts again for this update. Existing account passwords, roles, names and stock data are retained.
5. Login again. Existing sessions are invalidated by the first migration. On the Main Dashboard, click your name beside Logout to open My Profile. Use Ctrl+F5 if the link is not visible.

## Profile

- Staff Name: current users.display_name, read-only
- User Name: current users.username, read-only
- Position: users.position, read-only; defaults to 'not assigned' until an administrator assigns it
- User Role: existing stored role, displayed as Admin or Staff, read-only
- Current Password: empty masked password input; enter your real current password to authorize a change
- New Password: 12 to 256 characters
- Confirm New Password: must match exactly

The stored password is never retrieved for display, prefilled into HTML or returned to the browser. Dots in the Current Password field are a placeholder until you type. Submitted password values are never echoed after validation errors.

After a successful change, log in again with the new password. Other logged-in sessions are rejected on their next app request. Your profile identity and role cannot be changed through this form, even by modifying the submitted request.

## Administrator-controlled details

There is no new admin staff-management page in this update. An authorized database administrator can set staff details in Workbench, for example (replace all example values first):

```sql
UPDATE users
SET display_name = 'Staff Name', position = 'Warehouse Officer'
WHERE username = 'YOUR_USERNAME';
```

The app reads the current staff details and role on authenticated requests; these display changes appear without needing a new login. Do not paste a plain password into password_hash. User role remains the existing admin/staff setting and is not editable on My Profile.

## Files

- server.js: profile route registration, login password-version storage and account guard
- profile-service.js: current-password check, secure hash update and session-version verification
- profile-routes.js: own-profile routes, CSRF checks and password attempt limits
- views/dashboard.ejs: clickable account name
- views/profile.ejs: personal details and password form
- views/login.ejs: successful password-change message
- public/profile.css: colors and responsive profile layout
- profile-migration.sql: one-time additive schema migration
- profile.test.js: validation and access checks

## Validation

All 14 automated tests pass, including previous Raw Oil and Excel export tests. Profile tests verify correct current-password requirements, confirmation and length checks, preserving identity/role despite submitted changes, preventing concurrent password replacement, refusing outdated sessions, hiding hashes/password input values, rejecting CSRF and requiring login. Dashboard and login templates render correctly.

A live Windows MySQL server was not available in the authoring environment. Run the migration and verify one password change locally. After changing it, confirm the old password fails and the new one works. The account guard also rejects disabled users and refreshes database-controlled roles. Password attempt limiting uses process memory and resets when this local development server restarts.

If startup reports an unknown position/password_version column, run the migration in the correct database. If running it twice reports Duplicate column, inspect users with SHOW COLUMNS FROM users; both new columns should already exist. Do not delete existing data to retry a migration.
