# Inventory dashboard and navigation update

Requires the existing Login + Dashboard project. This replaces the previous Inventory design.

1. Stop your server with Ctrl+C.
2. Back up any custom changes in server.js and views/module.ejs.
3. Extract this ZIP. Copy the application files and folders into D:\Luxuri\innocreation-erp, merging folders and replacing matching files.
4. Keep .env, modules.js, public/style.css, public/workspace.css and existing login files.
5. Start with npm.cmd start. Open http://localhost:3000/dashboard, select Inventory. Refresh with Ctrl+F5.

Files to copy:
- server.js (replace)
- inventory-routes.js (new)
- views/module.ejs (replace)
- views/inventory.ejs (new)
- views/partials/inventory-icon.ejs (new; copy the partials folder too)
- public/inventory-navigation.css (new)

Navigation:
Main Dashboard → Inventory → Inventory Dashboard → Finished Goods / Raw Oil / Raw Materials → related menu page.
The Inventory sidebar has Dashboard, three expandable main menus and their submenus. Switch applications using Main Dashboard in the header. Other application pages also no longer show the cross-application sidebar.

Finished Goods: List, Warehouse Transfer.
Raw Oil: List, In, Out.
Raw Materials: List, In, Out.

This is a design and navigation update. Destination pages show design placeholders. No data entry, warehouse transfers or database writes are implemented. No SQL changes or npm package installation needed. Old inventory.css is no longer used and may remain in the project.

Validation: syntax checked; all 13 Inventory route variations rendered through Express; unauthenticated requests redirected; unknown categories and menu IDs return 404; cross-application sidebar links absent. Full MySQL login remains dependent on your local setup.
