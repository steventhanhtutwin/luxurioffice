const roles=Object.freeze([{value:'admin',label:'Admin'},{value:'staff',label:'Staff'},{value:'warehouse_supervisor',label:'Warehouse Supervisor'},{value:'warehouse_accountant',label:'Warehouse Accountant'}]);
const legacyRoles=new Set(['inventory','packaging','purchasing','production']);
const normalizedRole=value=>legacyRoles.has(value)?'staff':value;
const roleLabel=value=>roles.find(role=>role.value===normalizedRole(value))?.label||String(value||'');
module.exports={roles,roleLabel,normalizedRole};
