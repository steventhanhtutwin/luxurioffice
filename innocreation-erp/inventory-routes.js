const express = require('express');
const pool=require('./db');
const {createRawOilRouter}=require('./raw-oil-routes');
const {createFGRouter}=require('./fg-routes');
const groups = [
 {id:'finished-goods',name:'Finished Goods',subtitle:'ကုန်ချောပစ္စည်းများ',description:'ကုန်ချောစာရင်းနှင့် Warehouse လွှဲပြောင်းမှု',icon:'box',menus:[{id:'list',name:'Finished Goods List',description:'ကုန်ချောပစ္စည်းစာရင်း'},{id:'transfer',name:'FG Stock Transfer',description:'လွှဲပြောင်းရန် တောင်းခံခြင်း'},{id:'transfers',name:'Transfer Approval',description:'Supervisor နှင့် Accountant အတည်ပြုရန်'},{id:'transactions',name:'FG Transactions',description:'အဝင်၊ အထွက်နှင့် လွှဲပြောင်းမှုမှတ်တမ်း'},{id:'opening',name:'Opening Stock',description:'Warehouse အလိုက် အဖွင့်လက်ကျန်',adminOnly:true},{id:'locations',name:'FG Locations',description:'Warehouse နှင့် ပြင်ပနေရာ သတ်မှတ်ရန်',adminOnly:true}]},
 {id:'raw-oil',name:'Raw Oil',subtitle:'ကုန်ကြမ်းဆီများ',description:'ကုန်ကြမ်းဆီစာရင်းနှင့် အဝင် / အထွက်',icon:'drop',menus:[{id:'summary',name:'Raw Oil Balance',description:'Warehouse အဝင်၊ အထွက်နှင့် လက်ကျန်'},{id:'transactions',name:'Raw Oil Transaction',description:'ဆီအဝင် / အထွက် မှတ်တမ်းအားလုံး'},{id:'adjustments',name:'Raw Oil Stock Adjustments',description:'ပြောင်းလဲမှု မှတ်တမ်းများ'},{id:'in',name:'Raw Oil In',description:'ကုန်ကြမ်းဆီ အဝင်'},{id:'out',name:'Raw Oil Out',description:'ကုန်ကြမ်းဆီ အထွက်'}]},
 {id:'raw-materials',name:'Raw Materials',subtitle:'ကုန်ကြမ်းပစ္စည်းများ',description:'ကုန်ကြမ်းပစ္စည်းစာရင်းနှင့် အဝင် / အထွက်',icon:'layers',menus:[{id:'list',name:'Raw Material List',description:'ကုန်ကြမ်းပစ္စည်းစာရင်း'},{id:'in',name:'Raw Material In',description:'ကုန်ကြမ်းပစ္စည်း အဝင်'},{id:'out',name:'Raw Material Out',description:'ကုန်ကြမ်းပစ္စည်း အထွက်'}]}
];
function renderInventory(req,res,group=null,page=null){res.render('inventory',{user:req.session.user,groups,group,page});}
const router=express.Router();
router.use((req,res,next)=>req.session.user?next():res.redirect('/login'));
router.use('/raw-oil',createRawOilRouter({pool,groups}));
router.use('/finished-goods',createFGRouter({pool,groups}));
router.get('/',(req,res)=>renderInventory(req,res));
router.get('/:group/:page',(req,res)=>{const group=groups.find(g=>g.id===req.params.group);const page=group?.menus.find(m=>m.id===req.params.page);if(!page)return res.status(404).send('Inventory page not found');renderInventory(req,res,group,page);});
router.get('/:group',(req,res)=>{const group=groups.find(g=>g.id===req.params.group);if(!group)return res.status(404).send('Inventory category not found');renderInventory(req,res,group);});
module.exports={router,groups,renderInventory};
