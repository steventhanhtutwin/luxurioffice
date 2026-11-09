# FG Stock Transfer - Item Search

Apply over the current FG Print/PDF version.

1. Stop the server (Ctrl+C) and back up the project.
2. Copy all ZIP files into the project, replacing matching files and preserving folders.
3. Run npm.cmd start, then refresh the browser with Ctrl+F5.

No SQL migration or new package installation is needed.

Both Scan Item Code and Item Name / Size are editable. Type part of a code or item name to see up to 30 matching items. Each suggestion displays name, code, size and category. Narrow the search by typing more. Click a result, or use Up/Down and Enter, to fill both fields and move to Qty. Exact scanned codes select automatically. Changing either search field clears the prior selection so the wrong item cannot be added. Duplicate items and existing transfer validation remain in place.

Verification: 45 existing automated tests passed. Browser interaction check passed for name search, keyboard selection, synchronized code/size, adding quantity, exact scan and invalidating a previous selection. Search uses parameterized SQL and treats SQL LIKE wildcard characters as literal search text. Live database testing remains local.
