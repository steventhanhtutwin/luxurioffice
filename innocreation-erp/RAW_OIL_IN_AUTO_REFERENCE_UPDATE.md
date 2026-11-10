# Raw Oil In: Today Date and Automatic Reference

Apply to the current ERP version. Back up your database and project first. Pause Raw Oil In saves during installation.

1. In Hostinger phpMyAdmin, select the live ERP database (u506347531_innocreation, or the actual configured name). Open SQL, paste raw-oil-in-numbering-migration.sql and click Go. Alternatively use Import to run that file. Run the same migration in your local development database if testing locally. Do not import a full old database backup over live data.
2. Copy the ZIP files into the repository's innocreation-erp folder, replacing matching files and preserving views/raw-oil.
3. From the repository root run:

```powershell
git add innocreation-erp/raw-oil-numbering.js innocreation-erp/raw-oil-service.js innocreation-erp/raw-oil-routes.js innocreation-erp/views/raw-oil/content.ejs innocreation-erp/raw-oil.test.js innocreation-erp/raw-oil-in-numbering-migration.sql
git commit -m "Auto number Raw Oil In and lock date"
git push origin main
```

Let Hostinger deploy the latest commit, then Ctrl+F5. For local use, restart with npm.cmd start. No new npm packages or environment variables are required. server.js and hosting settings are not included.

Behavior:
- Raw Oil In Date is readonly. Server always assigns today's date at save time, ignoring submitted date and voucher values. Uses the existing ERP business timezone Asia/Bangkok, not the Linux host timezone. If a form stays open overnight, the saved date follows the new day.
- Reference is readonly with an Auto-generated-on-save hint. Confirmed number appears in Transaction History after successful save.
- ROI-000001, ROI-000002, etc. increase continuously without a daily/yearly reset. The migration starts after the highest existing ROI numeric reference, if any, so historical matching references are not reused. Rerunning it does not lower the counter.
- Counter update and receipt insertion share a database transaction and row lock. Failed saves roll back the counter; repeated successful request keys do not create a second receipt. Multiple operators share one sequence. Never manually lower/reset the sequence or delete posted records to reuse numbers.
- Historical transactions and Raw Oil Out manual date/reference fields remain unchanged.

Validation: 49 tests passed, including forged date/reference rejection via server assignment, concurrent numbering, repeated saves and rollback after insertion failure. EJS compiles. Live MySQL migration and Hostinger verification must be completed on your instance.
