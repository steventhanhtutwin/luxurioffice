const ExcelJS=require('exceljs');
const GREEN='254C40',BLACK='000000';
const number=value=>value===null||value===undefined?null:Number(value);
const excelDate=value=>value?new Date(String(value).slice(0,10)+'T00:00:00Z'):null;
function createReport(title,columns,filters,rows){
 if(rows.length>1048566)throw new Error('Excel row limit exceeded. Narrow the filters and try again.');
 const workbook=new ExcelJS.Workbook();workbook.creator='Innocreation ERP';workbook.created=new Date();
 const sheet=workbook.addWorksheet(title,{views:[{state:'frozen',ySplit:7}],pageSetup:{orientation:'landscape',paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}});
 sheet.columns=columns;const end=columns.length;
 const merged=(row,text)=>{sheet.mergeCells(row,1,row,end);sheet.getCell(row,1).value=text;};
 merged(1,'INNOCREATION / '+title);sheet.getRow(1).height=35;sheet.getCell(1,1).font={name:'Myanmar Text',size:18,bold:true,color:{argb:GREEN}};
 merged(2,'Warehouse · Standard unit: gram (g)');
 merged(3,filters);sheet.getRow(3).height=42;sheet.getCell(3,1).alignment={wrapText:true,vertical:'middle'};
 const exported=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',dateStyle:'medium',timeStyle:'short'}).format(new Date());
 merged(4,'Exported: '+exported+' (Asia/Bangkok) · '+rows.length+' records · All matching rows, all pages');
 sheet.getCell(4,1).font={name:'Myanmar Text',size:10,color:{argb:BLACK}};
 sheet.getRow(7).values=columns.map(c=>c.header);sheet.getRow(7).height=28;
 sheet.getRow(7).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:GREEN}};cell.font={name:'Myanmar Text',bold:true,color:{argb:'FFFFFF'},size:10};cell.alignment={vertical:'middle',wrapText:true};});
 for(const data of rows){const row=sheet.addRow(data);row.height=28;row.eachCell({includeEmpty:true},cell=>{cell.font={name:'Myanmar Text',size:10,color:{argb:BLACK}};cell.alignment={vertical:'middle',wrapText:true};});}
 sheet.autoFilter={from:{row:7,column:1},to:{row:Math.max(7,7+rows.length),column:end}};
 for(const col of columns){if(col.format)sheet.getColumn(col.key).numFmt=col.format;}
 sheet.pageSetup.printTitlesRow='7:7';
 return {workbook,sheet,merged};
}
async function summaryWorkbook(items,filters){
 const columns=[{header:'Item Code',key:'code',width:18,format:'@'},{header:'Item Name',key:'name',width:38},{header:'Categories',key:'category',width:27},{header:'Class',key:'item_class',width:17},{header:'Opening Qty (g)',key:'opening',width:20,format:'#,##0.000'},{header:'Stock In (g)',key:'stock_in',width:20,format:'#,##0.000'},{header:'Stock Out (g)',key:'stock_out',width:20,format:'#,##0.000'},{header:'Closing Qty (g)',key:'closing',width:20,format:'#,##0.000'},{header:'Start Date',key:'date',width:17,format:'yyyy-mm-dd'},{header:'Opening Status',key:'status',width:23}];
 const rows=items.map(item=>({code:String(item.code),name:item.name,category:item.category,item_class:item.item_class,opening:number(item.opening_grams),stock_in:number(item.stock_in),stock_out:number(item.stock_out),closing:number(item.closing_grams),date:excelDate(item.opening_date),status:item.opening_grams===null?'Opening pending':'Verified'}));
 const {workbook,sheet,merged}=createReport('Raw Oil Balance',columns,'Filters · Search: '+(filters.q||'All')+' · Category: '+(filters.category||'All'),rows);
 const pending=rows.filter(r=>r.status==='Opening pending').length;
 merged(5,pending?pending+' items have unverified opening quantities. Their opening/closing cells and report totals remain blank.':'Closing Qty = Opening Qty + Stock In - Stock Out. All recorded movements since each item start date.');
 sheet.getRow(5).height=32;sheet.getCell(5,1).alignment={wrapText:true};
 const total=sheet.addRow({code:'TOTAL',status:pending?'Opening pending':''});total.height=28;
 for(const [key,letter]of [['opening','E'],['stock_in','F'],['stock_out','G'],['closing','H']]){
 if(pending&&(key==='opening'||key==='closing'))continue;
 const value=rows.reduce((sum,row)=>sum+(row[key]||0),0);total.getCell(key).value=rows.length?{formula:'SUM('+letter+'8:'+letter+(7+rows.length)+')',result:value}:0;
 }
 total.eachCell({includeEmpty:true},cell=>{cell.font={name:'Myanmar Text',bold:true,color:{argb:BLACK}};});
 return workbook.xlsx.writeBuffer();
}
async function transactionWorkbook(entries,filters){
 const columns=[{header:'Transaction ID',key:'id',width:18,format:'@'},{header:'Date',key:'date',width:17,format:'yyyy-mm-dd'},{header:'Vr No',key:'voucher',width:20,format:'@'},{header:'Item Code',key:'code',width:18,format:'@'},{header:'Item Name',key:'name',width:38},{header:'Categories',key:'category',width:27},{header:'Type',key:'direction',width:12},{header:'From',key:'from',width:23},{header:'To',key:'to',width:23},{header:'Qty (g)',key:'qty',width:20,format:'#,##0.000'},{header:'Remark',key:'remark',width:40},{header:'Entered By',key:'entered_by',width:24}];
 const rows=entries.map(tx=>({id:String(tx.id),date:excelDate(tx.day),voucher:String(tx.voucher),code:String(tx.code),name:tx.name,category:tx.category,direction:tx.direction,from:tx.direction==='IN'?tx.place:'Warehouse',to:tx.direction==='IN'?'Warehouse':tx.place,qty:number(tx.qty_grams),remark:tx.remark||'',entered_by:tx.entered_by}));
 const {workbook,sheet,merged}=createReport('Raw Oil Transaction',columns,'Filters · Search: '+(filters.q||'All')+' · Type: '+(filters.direction||'IN + OUT')+' · From date: '+(filters.from||'Any')+' · To date: '+(filters.to||'Any'),rows);
 merged(5,rows.length?'Warehouse receipts and issues. Quantities are positive; Type and From / To indicate direction.':'No transactions match these filters.');
 sheet.getRow(5).height=30;
 return workbook.xlsx.writeBuffer();
}
module.exports={summaryWorkbook,transactionWorkbook,createReport};
