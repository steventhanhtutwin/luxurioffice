const test=require('node:test'),assert=require('node:assert/strict'),express=require('express'),path=require('path');
const {createRawOilRouter}=require('./raw-oil-routes');
test('Raw Oil Print/PDF keeps status, Unicode, approvals and void audit; escapes content and enforces login',async()=>{
 let pdfHTML='',unavailable=false;const pool={execute:async(sql,p)=>{
 if(sql.startsWith('SELECT t.*'))return p[0]==='44'?[[{id:44,voucher:'ROI-000014',day:'2026-11-10',direction:'IN',place:'BKK',code:'1199144',name:'Aqua Perfume',category:'Perfume',qty_grams:'500.000',entered_by:'Operator',remark:'မြန်မာ <script>unsafe</script>',transaction_category:'Adjustment',void_status:'VOIDED'}]]:[[]];
 if(sql.startsWith('SELECT v.*'))return [[{id:1,status:'APPROVED',reason:'Wrong item',requester:'Supervisor',requested_at:'2026-11-10',decided_by:3,decider:'Accountant',decided_at:'2026-11-10',decision_reason:'Confirmed'}]];
 return [[{supervisor_name:'Supervisor',accountant_name:'Accountant',supervisor_at:'2026-11-10',accountant_at:'2026-11-10'}]];
 }};
 const app=express();app.set('view engine','ejs');app.set('views',path.join(__dirname,'views'));app.use((req,res,next)=>{req.session={user:req.get('x-auth')?{id:1,role:'inventory'}:null,csrf:'x'};res.locals.csrf='x';next();});
 app.use('/inventory/raw-oil',(req,res,next)=>req.session.user?next():res.redirect('/login'),createRawOilRouter({pool,groups:[{id:'raw-oil',menus:[]}],pdfRenderer:async html=>{if(unavailable)throw Error('Browser unavailable');pdfHTML=html;return Buffer.from('%PDF-1.7\nfixture');}}));
 const s=app.listen(0);await new Promise(r=>s.once('listening',r));const base='http://127.0.0.1:'+s.address().port+'/inventory/raw-oil/transactions';
 try{const headers={'x-auth':'1'};const detail=await(await fetch(base+'/44',{headers})).text();assert(detail.includes('Download PDF'));assert(detail.includes('/44/print?autoprint=1'));
 const res=await fetch(base+'/44/print',{headers});assert.equal(res.status,200);const html=await res.text();for(const val of ['ROI-000014','500.000','Aqua Perfume','Adjustment','Supervisor','Accountant','Wrong item','VOIDED','မြန်မာ'])assert(html.includes(val));assert(!html.includes('<script>unsafe</script>'));assert(!html.includes('inventory-sidebar'));
 const pdf=await fetch(base+'/44/pdf',{headers});assert.equal(pdf.status,200);assert(pdf.headers.get('content-type').includes('application/pdf'));assert(pdf.headers.get('content-disposition').includes('Raw_Oil_Transaction_44.pdf'));assert((await pdf.text()).startsWith('%PDF'));assert(pdfHTML.includes('data:font/woff2;base64,'));assert(!pdfHTML.includes('class="print-controls"'));
 unavailable=true;const fallback=await fetch(base+'/44/pdf',{headers});assert.equal(fallback.status,200);const fallbackHTML=await fallback.text();assert(fallbackHTML.includes('/vendor/html2pdf.bundle.min.js'));assert(fallbackHTML.includes('data-pdf-filename="Raw_Oil_Transaction_44.pdf"'));assert(!fallbackHTML.includes('<script>unsafe</script>'));
 for(const endpoint of ['print','pdf']){assert.equal((await fetch(base+'/44/'+endpoint,{redirect:'manual'})).status,302);assert.equal((await fetch(base+'/bad/'+endpoint,{headers})).status,404);assert.equal((await fetch(base+'/99/'+endpoint,{headers})).status,404);}
 }finally{s.close();}
});
