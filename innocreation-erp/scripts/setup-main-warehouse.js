const pool=require('../db');const {configureMainWarehouse}=require('../fg-main-warehouse');
configureMainWarehouse(pool).then(result=>console.log('Main Warehouse ready. Original: '+result.oldName+'; location ID: '+result.id+'. Existing balances and transfers retained.')).catch(err=>{console.error('Main Warehouse setup failed:',err.message);process.exitCode=1;}).finally(()=>pool.end());
