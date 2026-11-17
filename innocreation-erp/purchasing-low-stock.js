// Shared by the Inventory queue and transactional request creation.
const activeMaterialPR="r.warehouse='Main Warehouse' AND (r.status IN ('READY_RFQ','RFQ_IN_PROGRESS','FINANCE_RESUBMIT','MD_RESUBMIT','PENDING_FINANCE','FINANCE_CHECKED','PENDING_APPROVAL') OR (r.status='CONVERTED_PO' AND EXISTS(SELECT 1 FROM purchase_orders pending_po WHERE pending_po.pr_id=r.id AND pending_po.status<>'COMPLETED')))";
const pendingMaterialPR='r.material_id=? AND '+activeMaterialPR;
module.exports={pendingMaterialPR,activeMaterialPR};
