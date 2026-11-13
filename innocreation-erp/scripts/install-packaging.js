// Add only the Packaging route to YOUR current server.js; preserve hosting customizations.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const file=path.join(__dirname,'../server.js'),s=fs.readFileSync(file,'utf8');
if(/app\.use\(\s*['"]\/packaging['"]/.test(s)){console.log('Packaging route already installed. server.js unchanged.');process.exit(0);}
const match=s.match(/app\.use\(\s*['"]\/inventory['"]\s*,\s*inventory\.router\s*\);/);
if(!match)throw Error('Could not locate inventory router. server.js unchanged. Add the Packaging route manually as described in READ_ME_FIRST.');
const backup=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'innocreation-packaging-')),'server.js');fs.copyFileSync(file,backup);
fs.writeFileSync(file,s.replace(match[0],"app.use('/packaging',require('./packaging-routes').createPackagingRouter({pool}));\n "+match[0]));console.log('Packaging route installed. Original backup: '+backup);
