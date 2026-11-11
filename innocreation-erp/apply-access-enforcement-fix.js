const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
function patch(source){
 if(source.includes("app.use(require('./application-access').applicationAccessGuard(pool));"))return source;
 const marker='app.use(accountGuard(pool));';if(!source.includes(marker))throw Error('accountGuard middleware not found. server.js was not changed.');
 return source.replace(marker,marker+"\n app.use(require('./application-access').applicationAccessGuard(pool));");
}
if(require.main===module){const file=path.join(__dirname,'server.js'),before=fs.readFileSync(file,'utf8'),after=patch(before);if(after!==before){fs.writeFileSync(path.join(os.tmpdir(),'erp-server-before-access-fix-'+Date.now()+'.bak'),before);fs.writeFileSync(file,after);}console.log('Application access enforcement installed. Existing hosting settings preserved.');}
module.exports={patch};
