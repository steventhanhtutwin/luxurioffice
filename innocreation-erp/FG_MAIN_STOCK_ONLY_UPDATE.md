# Main Warehouse stock only

Requires the previous FG Main Warehouse update and completed setup-main-warehouse.js configuration.

## Install

1. Stop the server with Ctrl+C and back up customized files.
2. Copy all files/folders from this ZIP into your existing project, merging folders and replacing matching files. Keep .env and all other files.
3. Run npm.cmd start, then refresh with Ctrl+F5.

No SQL migration or npm install is needed. No existing balances, opening data or ledger rows are deleted or rewritten.

## New behavior

- Only the configured Main Warehouse needs verified opening qty/start date.
- Only Main Warehouse's current and daily stock are checked for availability.
- Counterpart warehouses' opening quantities, dates and stock balances are not read or updated for a new movement.
- A document must involve Main Warehouse on exactly one side. Transfers between two other locations are rejected in this mode.
- Main Warehouse → another warehouse: after Final Approval, post one Main Warehouse OUT.
- Another warehouse → Main Warehouse: after Final Approval, post one Main Warehouse IN.
- Supervisor Approval still does not change stock. Warehouse Accountant Final Approval still posts all item lines atomically.
- A repeated final approval cannot post the same movement twice.
- FG Stock In/Out retain their existing immediate-post policy, but must also affect Main Warehouse. Existing type validation remains: Stock In/Out is external/internal; warehouse-to-warehouse movements use Transfer approvals.
- Opening Stock offers only Main Warehouse. A modified request trying to set opening for another location is rejected server-side.

The From/To counterpart remains in the document as a movement reference. Its stock is not maintained by this update. Existing historical counterpart ledger entries from the earlier two-warehouse implementation remain intact, but new postings create only the Main Warehouse leg. Pending older transfers involving Main Warehouse are finalized using this new main-only rule; pending transfers not involving Main Warehouse cannot be finalized.

## Test locally

Use an item with Main Warehouse opening 100 pcs. Leave the counterpart warehouse opening unset.

1. Submit a transfer Main → counterpart for 10 pcs.
2. Before approval and after Supervisor Approval, Main remains 100 pcs.
3. After Accountant Final Approval, Main becomes 90 pcs. Counterpart opening is not required and its stock is not updated.
4. A transfer counterpart → Main for 20 pcs, with both approvals, increases Main to 110 pcs.
5. An outgoing qty greater than the available Main stock fails without partial posting.

All 41 automated checks pass, including new inbound/outbound cases with missing counterpart opening, rejection of transfers excluding Main and refusal to set non-main openings. Existing concurrency, two-stage approval, idempotency, role checks, Profile, Settings, Raw Oil and exports still pass. Tests use a database adapter; verify against your local MySQL data and scanner after installing.
