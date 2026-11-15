const {text,fail}=require('./purchasing-values');
const {businessNow}=require('./raw-oil-datetime');
function supplierFilters(query){
 const search=text(query.q??'','Search',100,true),statusFilter=query.status??'ALL';
 if(!['ALL','ACTIVE','VOID'].includes(statusFilter))throw fail('Invalid supplier status filter.');
 return {search,statusFilter,where:"(s.name LIKE ? OR s.contact LIKE ? OR EXISTS(SELECT 1 FROM purchase_supplier_contacts pc WHERE pc.supplier_id=s.id AND pc.phone LIKE ?)) AND (?='ALL' OR (CASE WHEN reg.status='VOID' THEN 'VOID' ELSE 'ACTIVE' END)=?)",params:['%'+search+'%','%'+search+'%','%'+search+'%',statusFilter,statusFilter]};
}
async function exportSuppliers(pool,query){
 const {where,params}=supplierFilters(query);
 const matched='SELECT s.id FROM purchase_suppliers s LEFT JOIN purchase_supplier_registration reg ON reg.supplier_id=s.id WHERE '+where;
 const [suppliers]=await pool.execute('SELECT s.*,reg.vendor_code,reg.category,reg.status supplier_status,c.country,c.tax_id,p.payment_terms,p.contact_person,p.email FROM purchase_suppliers s LEFT JOIN purchase_supplier_registration reg ON reg.supplier_id=s.id LEFT JOIN purchase_supplier_company c ON c.supplier_id=s.id LEFT JOIN purchase_supplier_profiles p ON p.supplier_id=s.id WHERE '+where+' ORDER BY s.name,s.id',params);
 const [banks]=await pool.execute('SELECT b.*,d.swift FROM purchase_supplier_banks b LEFT JOIN purchase_supplier_bank_details d ON d.bank_id=b.id WHERE b.supplier_id IN ('+matched+') ORDER BY b.is_active DESC,b.is_primary DESC,b.id',params);
 const [contacts]=await pool.execute('SELECT * FROM purchase_supplier_contacts WHERE supplier_id IN ('+matched+') ORDER BY is_active DESC,id',params);
 const bankMap=new Map(),contactMap=new Map();for(const b of banks){const k=String(b.supplier_id);if(!bankMap.has(k))bankMap.set(k,[]);bankMap.get(k).push(b);}for(const c of contacts){const k=String(c.supplier_id);if(!contactMap.has(k))contactMap.set(k,[]);contactMap.get(k).push(c);}
 const workbook=new(require('exceljs').Workbook)(),sheet=workbook.addWorksheet('Suppliers & Bank Accounts');
 const columns=[['Vendor Code',18],['Supplier Name',35],['Category',25],['Country',18],['Tax ID',24],['Payment Terms',24],['Supplier Status',17],['Total Linked Banks',19],['Primary Payout?',18],['Currency',12],['Bank Name',30],['Beneficiary Name',30],['Account Number / IBAN',28],['SWIFT / BIC',20],['Payment / Intermediary Notes',40],['Procurement Contact',28],['Procurement Email',30],['Finance Contact',28],['Finance Email',30],['Bank Account Status',20]];
 sheet.columns=columns.map(([header,width],i)=>({header,key:String(i),width}));
 for(const s of suppliers){const k=String(s.id),allBanks=bankMap.get(k)||[],people=contactMap.get(k)||[];const procurement=people.find(c=>/procurement|purchasing|primary/i.test(c.contact_type))||people.find(c=>!/finance|billing|remittance/i.test(c.contact_type));const finance=people.find(c=>c!==procurement&&/finance|billing|remittance/i.test(c.contact_type));for(const b of allBanks.length?allBanks:[null]){
 // Assign strings directly: never convert account numbers to numeric values or formulas.
 const values=[s.vendor_code||'SUP-'+String(s.id).padStart(5,'0'),s.name,s.category||'',s.country||'',s.tax_id||'',s.payment_terms||'',s.supplier_status==='VOID'?'Void':'Active',allBanks.length,b?(b.is_primary&&b.is_active?'Yes':'No'):'',b?.currency||'',b?.bank_name||'',b?.account_holder||'',b?.account_number||'',b?.swift||'',b?.note||'',procurement?.contact_name||s.contact_person||'',procurement?.email||s.email||'',finance?.contact_name||'',finance?.email||'',b?(b.is_active?'Active':'Inactive'):''];
 const row=sheet.addRow(values.map((v,i)=>i===7?Number(v):String(v)));row.eachCell({includeEmpty:true},(cell,i)=>{if(i!==8)cell.numFmt='@';cell.alignment={vertical:'top',wrapText:true};});
 }}
 sheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'35594D'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'E5EFEB'}};cell.alignment={vertical:'middle',wrapText:true};});sheet.getRow(1).height=32;sheet.views=[{state:'frozen',ySplit:1}];sheet.autoFilter={from:'A1',to:'T'+Math.max(1,sheet.rowCount)};
 return {buffer:Buffer.from(await workbook.xlsx.writeBuffer()),filename:'Supplier_List_'+businessNow().day+'.xlsx'};
}
module.exports={supplierFilters,exportSuppliers};
