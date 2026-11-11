const express=require('express');
const {rateLimit}=require('express-rate-limit');
const {createProfileService}=require('./profile-service');
function createProfileRouter({pool}){
 const router=express.Router(),service=createProfileService(pool);
 router.use((req,res,next)=>req.session.user?next():res.redirect('/login'));
 const render=(req,res,error='',status=200)=>res.status(status).render('profile',{profile:req.account,user:req.session.user,error});
 const limiter=rateLimit({windowMs:15*60*1000,limit:10,keyGenerator:req=>String(req.session.user.id),skipSuccessfulRequests:true,standardHeaders:'draft-7',legacyHeaders:false,handler:(req,res)=>render(req,res,'ကြိုးစားမှုများနေပါသည်။ ၁၅ မိနစ်အကြာ ပြန်စမ်းပါ။',429)});
 const csrf=(req,res,next)=>typeof req.body._csrf==='string'&&req.body._csrf===req.session.csrf?next():res.status(403).send('Form expired. Reload and try again.');
 router.get('/',(req,res)=>render(req,res));
 router.post('/password',csrf,limiter,async(req,res,next)=>{try{await service.changePassword(req.session.user.id,req.body);req.session.destroy(err=>{if(err)return next(err);res.clearCookie('innocreation.sid');res.redirect('/login?password_changed=1');});}catch(err){if(err.code)return next(err);render(req,res,err.message,400);}});
 return router;
}
module.exports={createProfileRouter};
