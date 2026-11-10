const transactionCategories=Object.freeze(['Purchase','Return','Adjustment']);
function transactionCategory(value){if(typeof value!=='string'||!transactionCategories.includes(value))throw new Error('Transaction Category ကို Purchase, Return, Adjustment ထဲမှ ရွေးပါ။');return value;}
module.exports={transactionCategories,transactionCategory};
