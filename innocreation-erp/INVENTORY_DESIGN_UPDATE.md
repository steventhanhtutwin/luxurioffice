# Inventory design update

Requires the existing Login + Dashboard update project.

1. Stop server with Ctrl+C.
2. Back up views/module.ejs if you have customized it.
3. Copy views/module.ejs and public/inventory.css from this ZIP into your existing project, merging folders. Replace module.ejs.
4. Keep .env and all other project files.
5. Run npm.cmd start. Open Inventory from Applications. Refresh with Ctrl+F5 if needed.

Inventory has three sections and eight menu entries:
- Finished Goods: Finished Goods List, Warehouse Transfer
- Raw Oil: Raw Oil List, Raw Oil In, Raw Oil Out
- Raw Material: Raw Material List, Raw Material In, Raw Material Out

Select a menu to expand its design preview. No data-entry fields, save actions or stock transactions are implemented. No database or package changes are needed. Packaging, Production and Purchasing keep their existing menu design.

Validation: templates rendered for all four modules; eight requested Inventory entries verified. Runtime integration uses your existing local server.
