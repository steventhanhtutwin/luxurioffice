# Finished Goods — stock and two-stage warehouse transfer approval

Requires the current ERP project with Settings, Profile and Raw Oil Excel support installed.

## Install

1. Stop the server with Ctrl+C. Back up your project and database.
2. Extract this ZIP and copy all files/folders into D:\Luxuri\innocreation-erp. Merge folders and replace matching files. Preserve .env and existing unrelated files.
3. In MySQL Workbench as your database administrator, open fg-migration.sql and execute it. Change USE innocreation_erp if your database has another name. It adds FG tables and expands user roles, retaining old roles, passwords and other stock data.
4. In the VS Code project terminal run:

```powershell
npm.cmd run setup-fg
npm.cmd start
```

No new npm packages are needed. Do not rerun older role migrations from earlier ZIPs.
5. Refresh with Ctrl+F5 and open Inventory → Finished Goods.

The setup script imports 614 distinct FG item codes/names/categories/sizes from the supplied FinishedGoods.xlsx Summary sheet. A rerun preserves existing item masters. Numeric sizes from the ml column are displayed as ml; the three text kg sizes are preserved, and missing sizes stay blank. All stock quantities are integer pcs. No opening quantities or historical transactions are imported.

## One-time location and opening setup

Admin → Finished Goods → FG Locations.

- INTERNAL: a warehouse or shop whose stock you want this module to track.
- EXTERNAL: a source or destination outside tracked FG inventory, such as a department/supplier/customer counterparty.
- UNASSIGNED: not classified yet; cannot be used on documents.

Warehouse is initially INTERNAL. Other location names observed in the file (BKK, Manufacturing, Deli Return, Thanlwin POS, M Tower Memori, Junction City, Hledan, Operation, Corporate) are UNASSIGNED so you can explicitly choose how to track them. You can add/rename locations. Once an opening balance or document references a location, its type cannot be changed.

Classify at least two tracked locations as INTERNAL to use Transfer. For FG Stock In/Out, classify the appropriate counterpart locations as EXTERNAL. A movement between two INTERNAL locations MUST use Transfer and its approvals; Stock In/Out rejects such a pair.

Admin → Opening Stock: enter a valid item code, warehouse, verified opening pcs, accounting start date and required Remark. Enter 0 explicitly for a verified zero balance at a receiving warehouse. Set both source and destination opening quantities before submitting a transfer for that item.

The uploaded Opening Qty cells reference an unavailable external workbook. Unknown opening quantities remain pending, never silently zero. Opening changes are audited and permitted only before that item/warehouse has posted ledger entries. A pending transfer also prevents moving the opening date later than its document date. Quantity corrections after posting need a future FG adjustment workflow.

## Menus

- FG Summary / Finished Goods List: item code, name, category, size, warehouse, opening, stock in, stock out, closing and start date. Search, category/warehouse filters and Excel export across all matching pages. Header-only color with plain data rows.
- FG Stock In: EXTERNAL → INTERNAL, scan code, add one or more item/qty lines, save and post immediately.
- FG Stock Out: INTERNAL → EXTERNAL, scan code, add item/qty lines, save and post immediately if stock is sufficient.
- New Warehouse Transfer: INTERNAL → INTERNAL; select From/To, document date/reference, required Remark, and up to 50 unique item lines. Submits a read-only transfer request.
- Transfer Approval: filtered transfer status list; open a document to approve/reject at the applicable stage.
- FG Transactions: filter document headers by type, status, reference/location search and date; View opens line-level details.
- Opening Stock / FG Locations: Admin-only setup.

FG master creation/editing, bulk opening import, posted transaction editing/deletion/reversal, period closing and physical-delivery/Received confirmation are not included in this version.

## Approval roles

Settings → Add User / User List now offers two additional roles:

- Warehouse Supervisor
- Warehouse Accountant

These are login User Roles, separate from the free-text Position field. Create/assign two separate accounts as appropriate. Role changes require the affected user to log in again.

Stock-entry roles are Admin, Inventory and Warehouse Supervisor. Opening/location setup remains Admin-only. Warehouse Accountant handles Final Approval. Authenticated users can view FG lists/documents; the broader module-permission policy is otherwise unchanged.

An Admin account does not automatically substitute for either approver. Transfer approvals require the exact assigned role. The same user ID cannot act as Supervisor and Final Approver, even if their role is changed between stages.

## Transfer state and posting

1. Submit → REQUESTED / Waiting for Supervisor. No ledger entries or stock changes.
2. Warehouse Supervisor opens the transfer and approves → SUPERVISOR_APPROVED / Waiting for Accountant. Still no ledger entries or stock changes.
3. Warehouse Accountant opens it and selects Final Approval & Post Stock.
4. The server rechecks every item's opening, transaction date and available stock under database locks. If every line passes, it posts an OUT at the source and equal IN at the destination, then marks POSTED, all in one database transaction.

If any item fails, no item is posted and the transfer stays awaiting Accountant approval. The approver receives an error. Pending requests do NOT reserve inventory; multiple requests may overlap and the final check determines which can post. If the original date would create a negative historical daily balance, reject/resubmit with appropriate details rather than borrowing stock from later receipts.

At their applicable stage, the Supervisor or Accountant can Reject with a required reason. Rejected transfers never affect stock. Submitted documents have no edit controls; correct errors by rejecting and submitting a new document. Repeated create requests use a unique request key; repeated Final Approval cannot create another pair of ledger entries.

Creation, first approval, final approval/rejection user IDs and timestamps are recorded. Document views show current location/staff labels for those stored IDs.

## Summary calculation

Per item and INTERNAL warehouse:

Closing pcs = verified Opening pcs + posted IN pcs − posted OUT pcs.

Only fg_ledger entries affect these totals. Pending/rejected transfer headers do not enter the ledger. Final Approval posts both transfer legs together. All-warehouse totals include both internal IN and OUT legs, so a transfer preserves total combined stock. Filter to one warehouse to see its increase/decrease. Filter totals include all matching records, not only the displayed 50-row page. When any matched item/warehouse lacks opening data, combined opening/closing cards remain pending.

The report is an all-posted ledger view since each item's start date. Document dates may be backdated or future-dated, subject to opening-date and daily-stock checks; this is not yet an as-of-date/period-closed report. Stock In/Out and Opening use integer pcs; Size is descriptive and does not convert Qty to ml/kg.

## Local test checklist

Use a test item and two INTERNAL warehouses A and B.

1. Admin sets A opening = 100 pcs and B opening = 0 pcs, with a common start date.
2. Inventory creates Transfer A → B for 10 pcs dated on/after that start date.
3. Confirm Summary remains A=100, B=0.
4. Log in as Warehouse Supervisor and approve it. Summary must remain A=100, B=0.
5. Log in as Warehouse Accountant and give Final Approval. Summary must become A=90, B=10.
6. Reopen or resubmit Final Approval; balances must remain A=90, B=10.
7. Test insufficient stock and rejection; neither should partially post a transfer.

Accepted test Stock In/Out and posted transfers are not removable through this initial UI. Use an appropriate test database/item.

## Validation performed

All 36 automated tests pass, including earlier login, settings, Raw Oil and Excel tests. FG tests exercise every displayed page, integer qty/location validation, user-role/CSRF controls, no stock changes before both approvals, separate approver roles, all-line atomic failure, simultaneous final attempts, idempotent final approval, rejection, opening locks/audit, location classification, and unpaginated Summary export.

These use a test database adapter with simulated transaction locking. A live MySQL server and your scanner were unavailable in the authoring environment. The real migration, MySQL permissions/locking and browser/Excel desktop behavior must be verified locally using the checklist. The implementation uses InnoDB transactions, READ COMMITTED reads, stable location/item locks and unique posting keys.

## Files and troubleshooting

Core FG code: fg-values.js, fg-service.js, fg-queries.js, fg-routes.js, views/fg/content.ejs, public/fg.js, public/fg.css.
Setup/data: fg-migration.sql, scripts/setup-fg.js, data/finished-goods-items.json, package.json.
Integration: inventory-routes.js, views/inventory.ejs, user-roles.js, views/profile.ejs, views/dashboard.ejs, server.js. Tests: fg.test.js, fg-routes.test.js and updated settings.test.js.

If tables are missing, execute fg-migration.sql first, then npm.cmd run setup-fg. If location dropdowns are empty, classify locations. If an opening is pending, set the exact item/warehouse opening before posting. If an approval button is absent, check the logged-in User Role and document status.
