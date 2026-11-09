# Raw Oil Adjustment List

Requires the previous Raw Oil Adjustment Update.

## Install

1. Stop the server with Ctrl+C and back up customized files.
2. Copy this ZIP's files/folders into your existing project, merging folders and replacing matching files. Preserve .env and other files.
3. If you already executed the previous raw-oil-adjustment-migration.sql, no SQL changes are needed. Otherwise, execute the included same migration using MySQL Workbench as your database administrator to create raw_oil_item_adjustments.
4. Run npm.cmd start and refresh with Ctrl+F5. No npm install is needed.
5. Inventory → Raw Oil → Raw Oil Adjustment List.

## List

Read-only adjustment history, 50 rows per page:
- Adjustment ID and recorded time
- Item Code
- Item Name before/after
- Category before/after
- Class
- Opening Qty before/after in g and opening quantity difference
- Start Date before/after
- Required Remark
- Adjusted By

Search Item Code, either old/new Item Name, or Remark. Filter by Category (matches either before or after), Adjusted By, From date and To date. To date includes the entire selected day. Date filtering and Adjusted At use the database's recorded timestamp; use the same database/server timezone consistently.

Stored before/after item snapshots are displayed, so later name/category edits do not rewrite these item-history values. The actor's stable user ID is recorded; the label shows their current staff name. Only ADJUSTMENT audit records appear. Initial CREATE audit entries do not appear in this adjustment list. No history is invented for changes that predate audit tracking.

There are no edit/delete actions, and the list/export endpoints accept only GET/HEAD. No update/delete operation on the audit table is exposed. The existing Adjustment form can still create a new change with a new audit entry; it cannot edit an old history record.

## Excel

Download Excel uses the current filter form values. With no filters it exports all adjustment records. Every matching row across all pages is included, ignoring the screen's pagination. Empty results produce a workbook with headers and a note. Header colors are retained; data rows are plain with black text. Gram quantities are numeric with three decimal places, codes are text, and remarks are exported as literal text. Export metadata includes filters, record count and export time.

## Validation

All 27 tests pass, including existing functionality. New checks cover bound/snapshot-based filters and inclusive dates, before/after parsing, exact opening differences, plain Excel data rows, literal-text/code preservation, read-only endpoint methods, login enforcement, rendered filters and unpaginated 125-row export matching the page's filters.

Tests use a database adapter; verify the live list/query against your local MySQL audit table after installation. No database records were changed in the authoring environment.
