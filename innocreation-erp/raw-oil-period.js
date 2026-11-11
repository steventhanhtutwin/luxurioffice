const {date}=require('./raw-oil-values');
const {activeTransactions}=require('./raw-oil-void-service');
function periodValues(query){const value=k=>typeof query[k]==='string'?query[k].trim():'';const from=value('from'),to=value('to');if(from)date(from);if(to)date(to);if(from&&to&&from>to)throw Error('From date သည် To date ထက် မကျော်ရပါ။');return {from,to};}
function periodSummary({from,to}){
 const params=[];
 const before=from?'transaction_date<?':'0';if(from)params.push(from);
 const range=[];if(from){range.push('transaction_date>=?');params.push(from);}if(to){range.push('transaction_date<=?');params.push(to);}const during=range.join(' AND ')||'1';
 // Repeat parameters in SQL appearance order for the IN and OUT expressions.
 const movementParams=params.slice(from?1:0);params.push(...movementParams);
 const aggregate=`SELECT item_id,SUM(CASE WHEN ${before} THEN CASE WHEN direction='IN' THEN qty_grams ELSE -qty_grams END ELSE 0 END) prior_delta,SUM(CASE WHEN ${during} AND direction='IN' THEN qty_grams ELSE 0 END) stock_in,SUM(CASE WHEN ${during} AND direction='OUT' THEN qty_grams ELSE 0 END) stock_out FROM raw_oil_transactions WHERE ${activeTransactions} GROUP BY item_id`;
 const started=to?'i.opening_date<=?':'1';if(to)params.unshift(to,to,to,to);
 const opening=`CASE WHEN i.opening_grams IS NULL OR NOT (${started}) THEN NULL ELSE i.opening_grams+COALESCE(t.prior_delta,0) END`;
 const sql=`SELECT i.id,i.code,i.name,i.category,i.item_class,i.opening_date,i.opening_grams original_opening_grams,${opening} opening_grams,CASE WHEN ${started} THEN COALESCE(t.stock_in,0) ELSE 0 END stock_in,CASE WHEN ${started} THEN COALESCE(t.stock_out,0) ELSE 0 END stock_out,CASE WHEN i.opening_grams IS NULL OR NOT (${started}) THEN NULL ELSE i.opening_grams+COALESCE(t.prior_delta,0)+COALESCE(t.stock_in,0)-COALESCE(t.stock_out,0) END closing_grams`;
 // not_started is evaluated outside the joined query to avoid extra bound placeholders.
 return {sql:sql+` FROM raw_oil_items i LEFT JOIN (${aggregate}) t ON t.item_id=i.id`,params};
}
module.exports={periodValues,periodSummary};
