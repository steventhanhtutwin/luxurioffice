const transactionCategories=Object.freeze(['Purchase','Return']);
function transactionCategory(value){if(typeof value!=='string'||!transactionCategories.includes(value))throw new Error('Transaction Category ကို Purchase, Return ထဲမှ ရွေးပါ။');return value;}
module.exports={transactionCategories,transactionCategory};
