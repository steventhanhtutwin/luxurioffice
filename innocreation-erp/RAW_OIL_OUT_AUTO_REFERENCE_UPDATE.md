# Raw Oil Out: Locked Date and Auto Reference

Back up the database and project, and pause Raw Oil saves while updating.

1. Hostinger phpMyAdmin > select ERP database > Import raw-oil-out-numbering-migration.sql. Run the same migration locally if using a local database. The script initializes both sequences safely if necessary and never lowers an existing sequence. Existing transactions remain unchanged.
2. Replace included files in D:\Luxuri\luxurioffice\innocreation-erp, preserving folders.
3. From D:\Luxuri\luxurioffice:

```powershell
git add innocreation-erp/raw-oil-numbering.js innocreation-erp/raw-oil-service.js innocreation-erp/raw-oil-routes.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/raw-oil.test.js innocreation-erp/raw-oil-out-numbering-migration.sql
git commit -m "Auto number Raw Oil Out and lock date"
git push origin main
```

After Hostinger deploys, refresh with Ctrl+F5. Local users restart npm.cmd start. No new npm packages or environment changes.

Both Raw Oil In and Out now enforce today's date on the server at save time (existing ERP timezone Asia/Bangkok), regardless of modified browser fields. References are assigned only on a successful save: ROI-000001 for In, ROO-000001 for Out. The sequences are independent and continue across days and years. Numbers appear in Transaction History after saving. Errors roll back numbering; repeated successful requests reuse the existing transaction. Insufficient-stock validation remains enforced. Old dates/references are preserved. No server.js or hosting configuration is replaced.

Verification: 51 automated tests passed, including independent In/Out sequences, concurrency, forged dates/references, idempotency, insufficient stock and rollback on insertion failure. EJS compiled. Live database migration must be run on your instance before deploying the code.
