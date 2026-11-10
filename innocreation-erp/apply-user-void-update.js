// Targeted login update: preserves the existing Hostinger listen/proxy settings.
const fs=require('node:fs'),path=require('node:path');
function patch(source){
 if(source.includes("require('./user-void').message"))return source;
 let next=source.replace('SELECT id, username, display_name, password_hash, role, password_version FROM users WHERE username = ? AND is_active = 1 LIMIT 1','SELECT id, username, display_name, password_hash, role, password_version, is_active FROM users WHERE username = ? LIMIT 1');
 if(next===source)throw Error('Login query differs. No changes made. Send server.js without secrets for review.');
 const marker='req.session.regenerate(err=>';if(!next.includes(marker))throw Error('Login handler differs. No changes made.');
 next=next.replace(marker,"if(Number(user.is_active)!==1)return loginPage(req,res,require('./user-void').message,403);\n "+marker);
 const renderMarker="render('login',{error,";if(!next.includes(renderMarker))throw Error('Login rendering differs. No changes made.');
 return next.replace(renderMarker,"render('login',{error:error||(req.query.account_void==='1'?require('./user-void').message:''),");
}
if(require.main===module){const file=path.join(__dirname,'server.js'),source=fs.readFileSync(file,'utf8'),next=patch(source);if(next!==source){fs.writeFileSync(path.join(require('node:os').tmpdir(),'innocreation-server-before-user-void-'+Date.now()+'.js.bak'),source,{flag:'wx'});fs.writeFileSync(file,next);}console.log('User Void login update ready. Existing hosting settings preserved.');}
module.exports={patch};
