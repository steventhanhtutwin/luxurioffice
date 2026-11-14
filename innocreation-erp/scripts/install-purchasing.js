const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
// Remove comments without changing offsets or string literals used in route paths.
function withoutComments(source){let out='',state='code',quote='';for(let i=0;i<source.length;i++){const ch=source[i],next=source[i+1];if(state==='line'){if(ch==='\n'){state='code';out+=ch;}else out+=' ';continue;}if(state==='block'){if(ch==='*'&&next==='/'){out+='  ';i++;state='code';}else out+=ch==='\n'?'\n':' ';continue;}if(state==='string'){out+=ch;if(ch==='\\'&&i+1<source.length){out+=source[++i];continue;}if(ch===quote)state='code';continue;}if(ch==='/'&&next==='/'){out+='  ';i++;state='line';continue;}if(ch==='/'&&next==='*'){out+='  ';i++;state='block';continue;}if(ch==='"'||ch==="'"||ch==='`'){state='string';quote=ch;}out+=ch;}return out;}
function installContent(source){
 const code=withoutComments(source),routePattern=/^([\t ]*)([A-Za-z_$][\w$]*)\s*\.\s*(use|get)\s*\(\s*(['"])(\/inventory|\/modules\/:id)\4\s*,/gm;
 const matches=[...code.matchAll(routePattern)].filter(m=>m[5]==='/inventory'?m[3]==='use':m[3]==='get');
 if(!matches.length)throw Error('Could not find the Inventory mount or /modules/:id route. No source was changed. Please share your current server.js so its route layout can be checked.');
 const anchor=matches[0],app=anchor[2],indent=anchor[1],escaped=app.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),newline=source.includes('\r\n')?'\r\n':'\n';
 const mounted=new RegExp('\\b'+escaped+'\\s*\\.\\s*use\\s*\\(\\s*[\'"]/purchasing[\'"]\\s*,').test(code),redirected=new RegExp('\\b'+escaped+'\\s*\\.\\s*get\\s*\\(\\s*[\'"]/modules/purchasing[\'"]\\s*,').test(code);
 if(mounted&&redirected)return source;
 const lines=[indent+'// INNOCREATION PURCHASING ROUTES'];
 if(!mounted)lines.push(indent+app+".use('/purchasing',require('./purchasing-routes').createPurchasingRouter({pool:require('./db')}));");
 if(!redirected)lines.push(indent+app+".get('/modules/purchasing',(req,res)=>res.redirect('/purchasing/pr'));");
 const next=source.slice(0,anchor.index)+lines.join(newline)+newline+source.slice(anchor.index);
 new vm.Script(next,{filename:'server.js'}); // Parse only; never execute the server during installation.
 return next;
}
if(require.main===module){try{const target=path.join(__dirname,'..','server.js'),source=fs.readFileSync(target,'utf8'),next=installContent(source);if(next!==source){const backup=target+'.before-purchasing';if(!fs.existsSync(backup))fs.writeFileSync(backup,source,{flag:'wx'});fs.writeFileSync(target,next);console.log('Purchasing routes installed. Run node --check server.js, then commit the modified server.js and Purchasing files and redeploy. Backup: server.js.before-purchasing (do not deploy the backup).');}else console.log('Purchasing routes already installed. No change required.');}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={installContent};
