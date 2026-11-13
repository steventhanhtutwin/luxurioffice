const manualStockSQL=`SELECT p.*,p.imported_stock_in+p.received_qty AS imported_stock_in,f.code AS item_code,
 p.opening_qty+p.imported_stock_in+p.received_qty-p.imported_stock_out AS closing_qty,
 CASE WHEN b.opening_qty IS NULL THEN NULL ELSE b.opening_qty+COALESCE(t.delta,0) END AS main_stock
 FROM packaging_stock p LEFT JOIN fg_items f ON f.id=p.fg_item_id
 LEFT JOIN fg_settings s ON s.id=1
 LEFT JOIN fg_balances b ON b.item_id=f.id AND b.location_id=s.main_location_id
 LEFT JOIN (SELECT item_id,location_id,SUM(CASE WHEN direction='IN' THEN qty ELSE -qty END) AS delta FROM fg_ledger GROUP BY item_id,location_id) t ON t.item_id=f.id AND t.location_id=s.main_location_id
 ORDER BY p.id`;
module.exports={manualStockSQL};
