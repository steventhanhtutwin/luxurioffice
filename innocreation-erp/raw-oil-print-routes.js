const ejs=require('ejs'),path=require('node:path');
const {transactionSelect}=require('./raw-oil-filters');
const {statusLabel}=require('./raw-oil-void-service');
const {renderPDF,printCSS}=require('./fg-pdf');
function installRawOilPrintRoutes({router,pool,asyncRoute,pdfRenderer=renderPDF}){
 async function data(id){
 if(!/^\d{1,20}$/.test(String(id)))return null;
 const [rows]=await pool.execute(transactionSelect+" WHERE t.id=? AND NOT EXISTS (SELECT 1 FROM raw_oil_adjustment_approvals print_adjustment WHERE print_adjustment.transaction_id=t.id AND print_adjustment.status<>'APPROVED')",[id]);if(!rows.length)return null;
 const [requests]=await pool.execute('SELECT v.*,u.display_name requester,a.display_name decider FROM raw_oil_void_requests v JOIN users u ON u.id=v.requested_by LEFT JOIN users a ON a.id=v.decided_by WHERE v.transaction_id=? ORDER BY v.id',[id]);
 const [approvals]=await pool.execute('SELECT a.*,s.display_name supervisor_name,k.display_name accountant_name FROM raw_oil_adjustment_approvals a LEFT JOIN users s ON s.id=a.supervisor_by LEFT JOIN users k ON k.id=a.accountant_by WHERE a.transaction_id=?',[id]);
 return {tx:rows[0],requests,approval:approvals[0]||null,statusLabel};
 }
 router.get('/transactions/:id/print',asyncRoute(async(req,res)=>{const value=await data(req.params.id);if(!value)return res.status(404).send('Transaction not found');res.set('Cache-Control','private, no-store');res.render('raw-oil/print',{...value,pdfMode:false});}));
 router.get('/transactions/:id/pdf',asyncRoute(async(req,res)=>{
 const value=await data(req.params.id);if(!value)return res.status(404).send('Transaction not found');res.set('Cache-Control','private, no-store');
 try{const html=await ejs.renderFile(path.join(__dirname,'views/raw-oil/print.ejs'),{...value,pdfMode:true,css:printCSS()});const bytes=await pdfRenderer(html);res.attachment('Raw_Oil_Transaction_'+value.tx.id+'.pdf').type('application/pdf').send(bytes);}
 catch(err){console.error('Raw Oil PDF:',err.code||err.message);res.status(503).render('raw-oil/pdf-unavailable',{id:value.tx.id});}
 }));
}
module.exports={installRawOilPrintRoutes};
