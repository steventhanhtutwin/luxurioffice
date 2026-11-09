# Raw Oil — MySQL module update

## Install into your existing project

This update requires the previously installed Inventory Navigation update.

1. Stop the app terminal with Ctrl+C. Back up your project and database.
2. Extract this ZIP and copy its contents into D:\Luxuri\innocreation-erp. Merge folders and replace files with the same names. Keep your existing .env, server.js, modules.js, login files and other modules.
3. Open MySQL Workbench as your database administrator. The original application grants may lack REFERENCES permission, which is required for the new foreign keys. Execute:

```sql
GRANT REFERENCES ON innocreation_erp.*
TO 'innocreation_app'@'127.0.0.1';
```

Use the actual database name/account/host from your configuration if you changed them.

4. In the VS Code project terminal, run:

```powershell
npm.cmd run setup-raw-oil
npm.cmd start
```

No new npm packages are needed. Do not run create-admin again.
5. Open http://localhost:3000 and go to Inventory → Raw Oil. Press Ctrl+F5 if needed.

The setup script creates three new tables and imports the 276 item masters extracted from the supplied RawOilExcel.xlsx Summary sheet. Existing codes are left unchanged on a rerun; the setup does not reset balances or transactions. Name spelling, categories and Class are preserved except leading/trailing whitespace. Codes are stored as text.

## First use: verify opening quantities

Raw Oil List → Set opening (administrator only).

- Enter the verified Opening Qty in grams.
- Enter the accounting start date. Opening Qty is the balance immediately before the first movement on that date.
- Save Item.

The supplied Opening Qty cells refer to another workbook, so a verified balance cannot be recovered from this file. Imported items therefore have an unset opening, shown as pending. The application will not treat missing opening values as zero or allow movements until opening has been set.

If you start from a verified zero balance, explicitly enter 0.000 and your start date. Once an item has any transaction, its Code, Opening Qty and start date are locked. Name, Categories and Class remain editable. Only administrators can create/edit item masters and add From/To locations.

Historical Excel transactions and quantities are NOT imported. The transaction sheet has missing Item Codes and does not specify its quantity unit. Old transactions, external formulas, Adjustment columns and Damage values are not converted into new ledger entries. This avoids inventing code mappings, units or opening stock. Start new entries from your verified opening date.

## Menus

- Raw Oil Summary: item-level Opening, Stock In, Stock Out, Closing, all in g.
- Raw Oil List: code, name, categories, class, current warehouse balance and start date; search, category filter, create/edit.
- Raw Oil In: scan code → auto name/category/balance → select From → Warehouse is fixed as To → Qty in g → Save.
- Raw Oil Out: scan code → Warehouse is fixed as From → select To → Qty in g → Save.
- Raw Oil Transaction: combined In/Out history with date, voucher, code, name, category, From, To, Qty, remark and entered-by user. Search and filter by date/type. Fifty rows per page.

BKK and Manufacturing are initial selectable counterpart locations observed in the source file. Administrators may add other locations from the In/Out page before filling a transaction. Warehouse is the single fixed stock-holding location for this module.

## Scanner and quantities

Use a USB/Bluetooth scanner configured as a keyboard, preferably with an Enter suffix. Click Scan Item Code first. Type a code manually if testing without a scanner. The code must exactly match the item master. Quantity is always grams, with up to three decimal places (0.001 g minimum for movements). No oz, ml or kg conversion is performed.

Vr No / Reference and Date are required. The same voucher may appear on multiple entries as in the Excel template. Each Save records one item movement; scan again for another entry.

## Calculation and validation

Stock In = sum of IN entries into Warehouse.
Stock Out = sum of OUT entries from Warehouse.
Closing Qty = verified Opening Qty + Stock In − Stock Out.

Summary includes all recorded transactions since each item's configured opening date. Its search/category filter also applies to the total cards; totals cover all filtered items, not only the visible page. Closing totals remain pending if any filtered item lacks opening data.

Transactions dated before the item's start date are rejected. Current stock and daily stock are checked before accepting an Out, so a backdated Out cannot borrow a receipt recorded for a later date. All checks use integer thousandths of a gram; database quantities use DECIMAL(15,3). The item row is locked inside a database transaction to serialize simultaneous movements. A unique form request key prevents a repeated submission from creating another movement. Server-side CSRF checks and login are required.

History is read-only in this first release. Edit/delete/reversal, adjustments, damage, period closing, multiple stock-holding warehouses and bulk Excel transaction import are not yet implemented. A future receipt is included if entered with a future date; Summary is an all-recorded ledger view, not an as-of-date report. Historical views show the current item name/category and current location name.

## Test checklist on your computer

1. Set one item's opening to 100.000 g with a chosen start date.
2. Receive 50.250 g from BKK on or after that date.
3. Issue 20.125 g to Manufacturing on or after the receipt date.
4. Summary should show Opening 100.000, In 50.250, Out 20.125, Closing 130.125 g.
5. Verify both rows in Raw Oil Transaction, with the correct From/To.
6. An Out greater than 130.125 g must fail. A duplicate form submission must not add a second entry.

Use a test item for this checklist. Accepted test transactions cannot yet be removed through the app.

## Validation performed

- JavaScript syntax checks and all EJS views rendered successfully.
- Five automated tests pass: existing password test plus exact gram arithmetic/invalid input, backdated stock rules, duplicate submission and concurrent Out attempts, and required opening quantities.
- HTTP checks passed with a test database adapter for seven Raw Oil pages, item lookup, administrator restrictions, CSRF, login requirement and invalid dates.
- A live MySQL server was unavailable in the authoring environment. The schema migration, real MySQL locking/permissions and your scanner must be checked locally using the setup and checklist above. Run npm.cmd test for the included tests; their transaction database adapter simulates SQL results and locking.

If setup fails with REFERENCES denied, check the grant above. If "Access denied" appears, check .env. If tables are missing, rerun npm.cmd run setup-raw-oil. Startup should continue using your existing login account and sessions.
