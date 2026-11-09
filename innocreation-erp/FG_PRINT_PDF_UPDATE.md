# FG Print / PDF Update

Apply over the current Innocreation ERP FG Transaction Excel update.

## Installation (Windows)
1. Stop the server with Ctrl+C and back up your project.
2. Extract this ZIP and copy all included files/folders into your project, replacing matching files. Keep the folder structure, including public/fonts.
3. Open the project terminal and run:

```powershell
npm.cmd install
npm.cmd start
```

4. Refresh the browser with Ctrl+F5. Open a transfer through Transfer Approval or FG Transactions > View.

## Buttons
- Print opens a clean A4 document and the browser print dialog. Select a printer or Save as PDF.
- Download PDF downloads FG_Transfer_ID.pdf directly. The server uses its installed Microsoft Edge or Google Chrome, automatically detected on Windows. No browser download is required by npm install.
- If Chrome/Edge is installed in a custom location, optionally set PDF_BROWSER_PATH in .env to the browser executable path and restart the server. Otherwise leave .env unchanged. Print > Save as PDF remains available if direct PDF rendering is unavailable.

The document includes reference, date, status, From/To, remark, item quantities, total and recorded approval names/times. Pending and rejected documents clearly state that stock has not been posted. Myanmar fonts and their OFL license are included locally; no remote fonts are loaded. Multi-page tables repeat headers and include page numbers in direct PDF downloads.

No SQL migration is needed. This update does not change stock posting or approvals.

Validation: 45 automated tests passed. Actual one-page and three-page A4 PDFs were rendered and visually checked, including Myanmar text and final approval details. Windows browser detection and the live MySQL session must run on your local server.
