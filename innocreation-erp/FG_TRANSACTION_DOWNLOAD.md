# FG transaction Excel download

Stop the server, copy this ZIP into your existing project (merge folders, replace files), and run npm.cmd start. Refresh with Ctrl+F5. No SQL migration or npm install is needed.

FG Transactions and Transfer Approval now have Download Excel beside Filter. The download uses the selected search, status, type and date filters. With no filters, it exports all records. Every matching page is exported, not only the visible 50 rows.

The workbook matches the document list: ID, Date, Stock In/Out relative to Main Warehouse, Reference, From, To, Status, Created By, Supervisor, Final Approver and Remark. Item lines/quantities remain in View document; this is an export of the displayed document-level list. Pending/rejected documents are included when their status matches the filters and do not imply posted stock.

Headers retain color; body rows are plain black text without fill. References are text, dates are native Excel dates, and remarks beginning with = remain literal text. Empty results still produce column headers and a note.

All 44 tests pass, including filtered/unfiltered downloads, 125-row export from a page=3 request, login enforcement, workbook formatting and previous stock/approval tests. Tests use a database adapter; verify a live download on your computer after installing.
