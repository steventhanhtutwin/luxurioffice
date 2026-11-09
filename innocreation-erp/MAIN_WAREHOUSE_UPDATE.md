# Finished Goods List — Main Warehouse only

## Install

1. Stop the server with Ctrl+C and back up your project/database.
2. Copy this ZIP's files/folders into your existing project. Merge folders and replace matching files. Keep .env and all other files.
3. In your project terminal run:

```powershell
node scripts/setup-main-warehouse.js
npm.cmd start
```

No npm install or Workbench migration is required for this update. The setup script creates fg_settings and renames the selected existing location inside a transaction. It does not recreate the item master, opening records, documents or stock ledger.
4. Refresh with Ctrl+F5. Inventory → Finished Goods → Finished Goods List.

## Changes

- FG Summary is removed from the menus and overview. Finished Goods List is the single stock list with existing Opening/In/Out/Closing totals.
- The list, total cards, pending-opening count, pagination and Excel download always use the configured Main Warehouse ID.
- The All warehouses dropdown is removed. Search and Category filters remain.
- Supplying another warehouse ID in a URL cannot change the list/export warehouse.
- Old /summary links redirect to /list, preserving Search/Category/page. Old Summary download links redirect to the new List download.
- Other internal warehouses and locations remain available for Transfer, Opening Stock and location management.
- The existing Supervisor → Accountant transfer approval flow is unchanged.

## Rename selection and preserving stock

The script first uses an existing saved main-location ID, making reruns safe. For initial configuration:

1. Prefer the existing Thanlwin Warehouse name (spacing/case variants supported).
2. If that exact warehouse name does not exist, use Thanlwin POS, the label visible in your screenshot.
3. If Main Warehouse has already been renamed manually and no conflicting Thanlwin candidate exists, retain that location.

The chosen location must already be INTERNAL. Its ID stays the same while its name becomes Main Warehouse. All opening balances, transfer references and ledger entries continue referencing that exact ID. The original name is saved in fg_settings for provenance. The script prints the original name and ID after success so you can verify them.

If multiple candidate warehouses or a conflicting Main Warehouse already exist, the script stops without merging balances or deleting records. Inspect the location names/types before retrying. Do not rename unrelated locations to get around a conflict. Only the configured location appears in Finished Goods List. Existing stock in other warehouses is retained and is not copied into Main Warehouse.

The script creates fg_settings using the existing application's database CREATE and REFERENCES privileges, as used by previous module setup. If permission is denied, check the application database grants in Workbench. Keep Main Warehouse as the chosen location name; editing its label later will not retarget the stored main-location ID.

## Validation

All 39 tests pass. New checks verify candidate selection, screenshot-name compatibility, refusing conflicting merges, stable location IDs across reruns, fixed main-ID filtering despite forged warehouse query parameters, redirected old Summary URLs and unpaginated Excel export. Existing approvals, stock posting, Profile, Settings, Raw Oil and Excel tests remain passing.

Tests use a database adapter. Execute the setup on your local MySQL server, verify the printed original name/ID, then confirm Finished Goods List and Excel contain only Main Warehouse rows.
