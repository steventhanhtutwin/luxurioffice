# One FG Stock Transfer entry

Requires the current FG Main Stock Only update.

## Install

Stop the server with Ctrl+C. Copy this ZIP's files/folders into the existing project, merging folders and replacing matching files. Keep .env and other files. Run npm.cmd start and refresh with Ctrl+F5. No SQL migration or npm install is required.

## Changes

- FG Stock In and FG Stock Out are removed from the menus/overview.
- New Warehouse Transfer is renamed FG Stock Transfer.
- Use FG Stock Transfer for all FG receipts/issues, including external counterpart locations.
- To = Main Warehouse means Stock In. From = Main Warehouse means Stock Out.
- The form shows this direction automatically; transfer/document lists and details display Stock In/Stock Out relative to Main Warehouse.
- Transaction Type filters now use Main Warehouse From/To rather than only the database document kind.
- Both INTERNAL and EXTERNAL assigned counterpart locations may be selected. UNASSIGNED locations must be classified first.
- Exactly one side must be Main Warehouse. Only its opening/availability is checked and only its ledger is updated.

Every new movement follows Submit → Warehouse Supervisor Approval → Warehouse Accountant Final Approval → stock posting. No new FG movement can use the old immediate In/Out service. The legacy GET /in and /out URLs redirect to FG Stock Transfer; POST /in and /out returns 405, preventing cached old forms from bypassing approval.

Existing posted IN/OUT documents and ledger entries remain unchanged for history. New documents retain TRANSFER as their internal database workflow kind, while the user-facing stock direction is derived automatically from Main Warehouse. Approval, rejection, idempotency and all-line atomic posting are retained.

## Validation

All 42 tests pass, including old-route redirection/POST blocking, rejection of legacy immediate posting, external receipt/issue via both approval stages, menu naming/removal, Main Warehouse direction filters, Main-only balances, insufficient stock and repeated final-approval protection. Tests use a database adapter; verify locally by posting an inbound and outbound movement through both approvers.
