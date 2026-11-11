const pool=require('../db');
const items=require('../data/raw-oil-items.json');
async function setup(){
 await pool.query(`CREATE TABLE IF NOT EXISTS raw_oil_items (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(100) NOT NULL UNIQUE,
 name VARCHAR(200) NOT NULL, category VARCHAR(150) NOT NULL, item_class VARCHAR(100) NOT NULL DEFAULT 'Raw Oil',
 opening_grams DECIMAL(15,3) NULL, opening_date DATE NULL, opening_set_by INT UNSIGNED NULL,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT raw_oil_opening_nonnegative CHECK (opening_grams IS NULL OR opening_grams >= 0)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS raw_oil_places (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL UNIQUE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 await pool.query(`CREATE TABLE IF NOT EXISTS raw_oil_transactions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, item_id INT UNSIGNED NOT NULL,
 transaction_date DATE NOT NULL,
 transaction_time TIME NULL DEFAULT NULL, voucher VARCHAR(100) NOT NULL, direction ENUM('IN','OUT') NOT NULL,
 place_id INT UNSIGNED NOT NULL, qty_grams DECIMAL(15,3) NOT NULL, remark VARCHAR(500) NOT NULL DEFAULT '',
 created_by INT UNSIGNED NOT NULL, request_key CHAR(64) NOT NULL UNIQUE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY (item_id) REFERENCES raw_oil_items(id), FOREIGN KEY (place_id) REFERENCES raw_oil_places(id),
 FOREIGN KEY (created_by) REFERENCES users(id), INDEX oil_date(item_id,transaction_date), INDEX tx_date(transaction_date,id),
 CONSTRAINT raw_oil_qty_positive CHECK (qty_grams > 0)
 ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
 for(const name of ['BKK','Manufacturing'])await pool.execute('INSERT IGNORE INTO raw_oil_places (name) VALUES (?)',[name]);
 let added=0;for(const item of items){const [result]=await pool.execute('INSERT IGNORE INTO raw_oil_items (code,name,category,item_class) VALUES (?,?,?,?)',[item.code,item.name,item.category,item.class]);added+=result.affectedRows;}
 console.log('Raw Oil tables ready. '+added+' new master items imported. Existing items preserved.');
 console.log('Opening quantities and historical transactions were NOT imported. Set verified opening grams and a start date before entering movements.');
}
setup().catch(e=>{console.error('Raw Oil setup failed:',e.message);process.exitCode=1;}).finally(()=>pool.end());
