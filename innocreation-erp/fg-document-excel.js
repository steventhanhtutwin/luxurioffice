const {createReport}=require('./raw-oil-excel');
function direction(doc,mainId){return Number(doc.to_id)===Number(mainId)?'Stock In':Number(doc.from_id)===Number(mainId)?'Stock Out':doc.kind==='IN'?'Stock In':doc.kind==='OUT'?'Stock Out':'Transfer';}
async function documentWorkbook(documents,filters,mainId,statusLabel,transfers=false){
 const columns=[['ID','id',14],['Date','date',17],['Type','type',18],['Reference','reference',24],['From','from',28],['To','to',28],['Status','status',32],['Created By','creator',25],['Supervisor','supervisor',25],['Final Approver','accountant',25],['Remark','remark',45]].map(([header,key,width])=>({header,key,width,...(['id','reference'].includes(key)?{format:'@'}:key==='date'?{format:'yyyy-mm-dd'}:{})}));
 const rows=documents.map(d=>({id:String(d.id),date:d.day?new Date(d.day+'T00:00:00Z'):null,type:direction(d,mainId),reference:String(d.reference),from:d.from_name,to:d.to_name,status:statusLabel(d.status),creator:d.created_name,supervisor:d.supervisor_name||'',accountant:d.final_name||'',remark:d.remark||''}));
 const {workbook,merged,sheet}=createReport(transfers?'FG Transfer Approval':'FG Transactions',columns,'Filters · Search: '+(filters.q||'All')+' · Status: '+(filters.status?statusLabel(filters.status):'All')+' · Type: '+(filters.kind==='IN'?'Stock In':filters.kind==='OUT'?'Stock Out':'All')+' · From: '+(filters.from||'Any')+' · To: '+(filters.to||'Any'),rows);
 merged(5,rows.length?'Document list. Waiting/rejected documents do not affect stock. Quantities and item lines are available in the document detail page.':'No documents match these filters.');sheet.getRow(5).height=32;sheet.getCell(5,1).alignment={wrapText:true};return workbook.xlsx.writeBuffer();
}
module.exports={documentWorkbook,direction};
