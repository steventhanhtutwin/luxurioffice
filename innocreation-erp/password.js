const {scrypt,randomBytes,timingSafeEqual}=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(scrypt);
async function hashPassword(password){const salt=randomBytes(16).toString('hex');const hash=await derive(password,salt,64);return salt+':'+hash.toString('hex');}
async function verifyPassword(password,stored){try{const [salt,hex]=stored.split(':');const expected=Buffer.from(hex,'hex');const actual=await derive(password,salt,64);return expected.length===actual.length && timingSafeEqual(actual,expected);}catch{return false;}}
module.exports={hashPassword,verifyPassword};
