# Raw Oil — Download Excel update

Requires the installed Raw Oil Update. Adds native .xlsx downloads to Raw Oil Summary and Raw Oil Transaction.

## Install

1. Stop the server with Ctrl+C and back up any custom changes.
2. Extract this ZIP. Copy its files/folders into D:\Luxuri\innocreation-erp. Merge folders and replace matching files. Preserve your .env and all other project files.
3. Open the project terminal and run:

```powershell
npm.cmd install
npm.cmd start
```

ExcelJS is the new runtime dependency; npm install is required once. No SQL changes or setup-raw-oil rerun are needed.
4. Refresh the browser with Ctrl+F5.

## Download behavior

Raw Oil Summary → Download Excel:
- Search by Item Code / Item Name and select a Category, then use Search or Download Excel.
- Download applies the values currently selected in the filter form.
- With empty search and All categories, every item is exported.

Raw Oil Transaction → Download Excel:
- Search Code / Name / Vr No and filter Type, From date and To date.
- Download applies all those filter values. Reset then Download for every transaction.

Exports include ALL matching records across all pages; the page's 50-row limit and current page number never limit the download. An empty result creates a workbook with column headers and an explanatory note.

## Workbook contents

Summary: Item Code, Item Name, Categories, Class, Opening Qty, Stock In, Stock Out, Closing Qty, Start Date and Opening Status. The final row totals the matching records. Missing opening values stay blank; opening and closing totals remain blank if any matched item has an unverified opening. Stock In/Out totals remain available.

Transactions: Transaction ID, Date, Vr No, Item Code, Item Name, Categories, Type, From, To, Qty, Remark and Entered By.

All quantities are numeric grams formatted to three decimal places. Codes and voucher numbers are text, preserving leading zeros. Dates are native Excel dates. The report includes active filter values, exported record count and export time in Asia/Bangkok, plus frozen headers and Excel column filters. User-supplied text is exported as text, including values beginning with '='.

The export is a current read-only snapshot. It does not change database records. Use Excel filters after downloading to explore the snapshot; Summary's total formulas are full-column-range sums of all exported data rows and do not shrink when you hide rows with Excel filters.

Exports use the same SQL filter builders and sort order as the on-screen tables. Login is required for both download endpoints. The export queries do not include LIMIT or OFFSET. Excel's maximum sheet size is enforced with an error rather than silently truncating data.

## Files

- package.json / package-lock.json: ExcelJS dependency
- raw-oil-routes.js: downloads and shared filter integration
- raw-oil-filters.js: shared Summary and Transaction filters
- raw-oil-excel.js: .xlsx formatting and generation
- views/raw-oil/content.ejs: Download Excel buttons
- public/raw-oil.css: button styling
- raw-oil-export.test.js: export validation

## Validation

Nine tests pass, including the existing login/stock tests. Download tests exercise filtered and unfiltered HTTP routes, verify 125 records survive a page=3 request, inspect generated .xlsx files, preserve code formatting and literal text, verify gram values, handle pending opening balances and empty results, reject invalid dates, and enforce login. Templates render both download controls correctly.

Tests use a database adapter; the live Windows MySQL server and Excel desktop UI remain to be checked on your computer. Run npm.cmd test to repeat the automated checks.
