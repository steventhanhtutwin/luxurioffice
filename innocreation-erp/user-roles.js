const roles=[{value:'admin',label:'Admin'},{value:'inventory',label:'Inventory'},{value:'packaging',label:'Packaging'},{value:'purchasing',label:'Purchasing'},{value:'production',label:'Production'},{value:'warehouse_supervisor',label:'Warehouse Supervisor'},{value:'warehouse_accountant',label:'Warehouse Accountant'}];
const roleLabel=value=>roles.find(role=>role.value===value)?.label||(value==='staff'?'Staff':String(value||''));
module.exports={roles,roleLabel};
