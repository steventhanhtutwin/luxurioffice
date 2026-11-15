// Preserve the meaning of older Finance returns without rewriting existing records.
function prStatusSQL(alias='r'){return `CASE WHEN ${alias}.status='RFQ_IN_PROGRESS' AND (SELECT a.action FROM purchase_audit a WHERE a.pr_id=${alias}.id AND a.action IN ('FINANCE_RESUBMIT','SUBMITTED_FINANCE','FINANCE_CHECKED','FINANCE_REJECTED','MD_RESUBMIT','MD_REJECTED','REJECTED') ORDER BY a.id DESC LIMIT 1)='FINANCE_RESUBMIT' THEN 'FINANCE_RESUBMIT' ELSE ${alias}.status END`;}
module.exports={prStatusSQL};
