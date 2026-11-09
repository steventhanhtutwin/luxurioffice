# Adjustment Raw Oil

## Install

1. Stop the server (Ctrl+C) and back up custom project changes/database.
2. Copy this ZIP's files into your existing project folder. Merge folders and replace matching files. Keep .env and all other files.
3. In MySQL Workbench as your database administrator, open raw-oil-adjustment-migration.sql and execute it. Change the database name if required. This safely creates an additional audit table without resetting stock data.
4. Run npm.cmd start and refresh the browser with Ctrl+F5. No npm install is required.

## Behavior

- Existing-item page title: Adjustment Raw Oil. Save button: Save Adjustment.
- Raw Oil List shows Adjustment instead of Edit for configured items.
- Remark is required, including rejecting whitespace-only remarks. New-item creation also requires a remark.
- Item Code is read-only for existing items and cannot be changed through a modified request.
- Class is read-only and preserved on adjustment. New items use Raw Oil as their fixed Class.
- Category is a dropdown of distinct current categories from the item master. The server rejects categories outside this list.
- Each successful change stores Remark, acting user, timestamp, and before/after values in raw_oil_item_adjustments. The item update and its audit entry are committed together. No new audit-view page is included.
- Adjustment remains administrator-only.

This revises the existing item/opening setup form. Existing transactions are not rewritten. Opening Qty and start date remain locked once the item has movements; the UI now shows those values as read-only. This update does not implement physical stock-count corrections after transactions. Such corrections need a separate stock adjustment ledger design.

## Files

raw-oil-service.js, raw-oil-item-service.js, raw-oil-routes.js, views/raw-oil/content.ejs, public/raw-oil.css, raw-oil-adjustment-migration.sql, raw-oil-adjustment.test.js.

## Validation

All 23 automated tests pass. New checks cover required/nonblank Remark, immutable Code/Class, dropdown/category validation, audit before/after values and author, rollback when audit saving fails, existing opening locks and form attributes. Tests use a database adapter; execute the migration and verify saving on your Windows MySQL server.
