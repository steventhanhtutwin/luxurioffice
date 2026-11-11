const test=require('node:test'),assert=require('node:assert/strict');
const {businessNow,displayDateTime}=require('./raw-oil-datetime');
test('business date and time cross midnight together in Bangkok regardless of host timezone',()=>{
 assert.deepEqual(businessNow(new Date('2026-11-11T16:59:59Z')),{day:'2026-11-11',time:'23:59:59'});
 assert.deepEqual(businessNow(new Date('2026-11-11T17:00:00Z')),{day:'2026-11-12',time:'00:00:00'});
 assert.equal(displayDateTime({day:'2026-11-11',transaction_time:'09:15:30'}),'2026-11-11 09:15:30');
 assert.equal(displayDateTime({day:'2026-11-10',transaction_time:null}),'2026-11-10');
});
