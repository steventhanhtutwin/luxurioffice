const {createReport}=require('./raw-oil-excel');
function filters(query){const get=(key,max)=>{if(query[key]===undefined)return '';if(typeof query[key]!=='string'||query[key].length>max)throw Object.assign(Error('Invalid filter'),{status:400});return query[key];};return {q:get('q',100).trim(),category:get('category',100),size:get('size',40)};}
function matching(items,f){return items.filter(i=>(String(i.item_code||'')+' '+i.item_name).toLowerCase().includes(f.q.toLowerCase())&&(!f.category||i.category===f.category)&&(!f.size||String(i.size_ml||'')===f.size));}
async function warehouseWorkbook(items,f){
 const columns=[{header:'Item Code',key:'id',width:12,format:'@'},{header:'Item Name',key:'name',width:48},{header:'Categories',key:'category',width:28},{header:'Size (ml)',key:'size',width:15,format:'@'},...['Opening','Stock In','Stock Out','Closing'].map((header,index)=>({header,key:['opening','stockIn','stockOut','closing'][index],width:19,format:'#,##0.###'}))];
 const rows=matching(items,f).map(i=>({id:i.item_code||'',name:i.item_name,category:i.category,size:i.size_ml||'',opening:Number(i.opening_qty),stockIn:Number(i.imported_stock_in),stockOut:Number(i.imported_stock_out),closing:Number(i.closing_qty)}));
 const report=createReport('Packaging Warehouse',columns,`Search: ${f.q||'All'} · Category: ${f.category||'All'} · Size (ml): ${f.size||'All'}`,rows);
 report.sheet.getCell('A2').value='Packaging Warehouse · Undated imported stock snapshot · Size (ml) is product size';report.sheet.getCell('A1').font={name:'Myanmar Text',size:18,bold:true,color:{argb:'155D52'}};
 report.sheet.getRow(7).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'E5EFEB'}};cell.font={name:'Myanmar Text',size:10,bold:true,color:{argb:'155D52'}};});
 if(!rows.length)report.merged(5,'No items match the selected filters.');return report.workbook.xlsx.writeBuffer();
}
module.exports={filters,matching,warehouseWorkbook};
