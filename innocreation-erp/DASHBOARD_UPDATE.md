# Dashboard update

Stop the server with Ctrl+C. Back up any custom edits first.
Copy these files into your existing project folder, merging views and public folders:

- server.js (replace)
- modules.js (new)
- views/dashboard.ejs (replace)
- views/module.ejs (new)
- public/workspace.css (new)

Keep your existing .env, public/style.css and other files.
Run npm.cmd start, open http://localhost:3000/dashboard and refresh with Ctrl+F5.
No database changes, package installation or account recreation required.

The four module cards open their own menu pages. Business actions inside the modules are marked as planned and will be implemented next. All module pages require login. Roles do not yet restrict modules.

Verified: JavaScript syntax, EJS rendering for all modules, link destinations and HTML escaping. Test the running app with your local MySQL server.
