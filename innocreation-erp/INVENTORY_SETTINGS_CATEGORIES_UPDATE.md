# Settings Groups and Admin-created Raw Oil Transaction Categories

Apply over Restore Adjustment Transaction Category Update. Back up the live database and project and pause Raw Oil entries while installing.

## Database first
Hostinger phpMyAdmin > select the actual ERP database > Import inventory-settings-category-migration.sql (or use the SQL tab). Run the same file in your local database if using localhost; select that schema first.

This migration creates raw_oil_transaction_categories and converts the old fixed transaction_category ENUM to VARCHAR(100) so custom names can be stored. Existing transaction categories remain intact. Purchase, Return, Adjustment and any nonempty existing historical category names are seeded into the master without overwriting existing categories. It can be rerun, preserving existing data. Old NULL categories stay unknown. MySQL DDL may auto-commit, so take the backup before running.

## Code deployment
Copy the included code files into D:\Luxuri\luxurioffice\innocreation-erp, preserving folders and replacing matches. No npm install is needed. server.js, .env and hosting settings are not included.

From the repository root:

```powershell
cd D:\Luxuri\luxurioffice
git add innocreation-erp/inventory-settings.js innocreation-erp/settings-routes.js innocreation-erp/views/settings.ejs innocreation-erp/views/settings-categories.ejs innocreation-erp/public/settings.css innocreation-erp/raw-oil-transaction-category.js innocreation-erp/raw-oil-service.js innocreation-erp/raw-oil-routes.js innocreation-erp/raw-oil-filters.js innocreation-erp/inventory-settings.test.js innocreation-erp/raw-oil.test.js innocreation-erp/raw-oil-void.test.js
git commit -m "Group Settings menus and manage Raw Oil categories"
git push origin main
```

After Hostinger deploys the latest commit, Ctrl+F5. Local users restart npm.cmd start after migrating their local database.

## Use
Settings now has two main groups:
- User Management: User List, Add User. Existing edit, roles and password reset continue to work.
- Inventory Setting: Raw Oil Transaction Categories.

Admin only: Inventory Setting > Raw Oil Transaction Categories > enter Category Name > Create Category. Names are trimmed, required, maximum 100 characters, and duplicates are blocked. The list supports search and pagination and records the creating Admin and database timestamp. Initial seeded names show Initial setup.

Raw Oil In and Out share this category master. Reopen/refresh a movement form after creating a category. Dropdowns load current names from the database. New saves require a name that actually exists in the master; submitted names are resolved to the canonical stored spelling. There are no edit/delete category controls in this update, preserving existing references and history. Category remains a label: stock direction, auto date/reference, Void approval and restrictions on direct stock adjustment are unchanged. Transaction filters accept custom category names. Existing Excel exports and Void detail already display the saved name.

## Verification
67 automated tests passed, including Admin/active-account checks, CSRF/login restrictions, duplicate/invalid category rejection, escaped names, live In/Out dropdown loading, saving a custom category in both directions, existing user/password and stock/void protections. Settings category page visually checked; 390px mobile viewport has no page overflow. Database tests use fixtures; verify the migration and a new category on your actual MySQL/Hostinger installation before staff resume use.
