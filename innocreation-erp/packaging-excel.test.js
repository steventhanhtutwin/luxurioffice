const test=require('node:test'),assert=require('node:assert/strict'),ExcelJS=require('exceljs');const {filters,matching,warehouseWorkbook}=require('./packaging-excel');
const rows=require('./data/packaging-items.json').map(r=>({id:r.id,item_code:'FG-'+String(r.id).padStart(6,'0'),item_name:r.name,category:r.category,size_ml:r.size,opening_qty:r.opening,imported_stock_in:r.stock_in,imported_stock_out:r.stock_out,closing_qty:r.opening+r.stock_in-r.stock_out}));
test('Packaging Excel uses the same combined, literal filters as the table',()=>{
 const f=filters({q:' Rosewood ',category:'Perfume (Elixir)',size:'30'}),out=matching(rows,f);assert(out.length>0);assert(out.every(r=>r.item_name.toLowerCase().includes('rosewood')&&r.category===f.category&&r.size_ml==='30'));
 assert.equal(matching(rows,filters({q:'%'})).length,0);assert(matching(rows,filters({category:'Burner '})).every(r=>r.category==='Burner '));assert.throws(()=>filters({q:['bad']}));assert.throws(()=>filters({q:'a'.repeat(101)}));
});
test('Packaging Excel exports all matches, numeric stock columns, source note, header colors and no edit controls',async()=>{
 for(const f of [filters({}),filters({category:'Perfume (Elixir)',size:'30'}),filters({q:'No matching item at all'})]){const book=new ExcelJS.Workbook();await book.xlsx.load(await warehouseWorkbook(rows,f));const s=book.worksheets[0],expected=matching(rows,f);assert.equal(s.getCell('A2').value.includes('gram'),false);assert(s.getCell('A2').value.includes('Undated'));assert.equal(s.getRow(7).cellCount,8);assert.equal(s.getCell('E7').value,'Opening');assert.equal(s.getCell('A7').fill.fgColor.argb,'FFE5EFEB'.slice(2));assert.equal(s.views[0].ySplit,7);
 if(expected.length){assert.equal(s.rowCount,7+expected.length);assert.equal(s.getCell('A8').value,expected[0].item_code);assert.equal(typeof s.getCell('E8').value,'number');assert.equal(s.getCell('H8').value,Number(expected[0].closing_qty));}else assert(s.getCell('A5').value.includes('No items'));}
});
