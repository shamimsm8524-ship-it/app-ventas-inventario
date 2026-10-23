const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const {unitCost}=require('../purchase-cost-math.js');
const report=read('reports-profit.js');
const source=report.slice(report.indexOf('  function gainItemData('),report.indexOf('  function gainProductSummary('));
const ctx={};vm.createContext(ctx);vm.runInContext(source,ctx);
const product={id:'local',_cloudId:'cloud',name:'Vaporera',unit:'Unidad',buyPrice:unitCost(120,36),sellPrice:15};
test('36 units at S/120: unit profit S/11.67, full carton cost S/120',()=>{
  assert.equal((15-unitCost(120,36)).toFixed(2),'11.67');
  assert.equal((unitCost(120,36)*36).toFixed(2),'120.00');
});
test('single unit and continuous inventory retain their cost basis',()=>{
  assert.equal(unitCost(12,1),12);assert.equal(unitCost(45,2.5),18);assert.equal(unitCost(0,36),0);
});
for(const [total,qty] of [[120,0],[120,-1],[-1,36],[NaN,36],[120,Infinity]]){
  test(`invalid purchase ${total}/${qty} is rejected`,()=>assert.throws(()=>unitCost(total,qty)));
}
test('historical unit cost survives a change of current product cost',()=>{
  const row=ctx.gainItemData({product_id:'cloud',qty:1,unit_price:15,buy_price_at_sale:3.333333},[{...product,buyPrice:9}]);
  assert.equal(row.buy,3.333333);assert.equal(row.estimated,false);assert.equal((row.subtotal-row.buy*row.costQty).toFixed(2),'11.67');
});
test('missing historical cost resolves the cloud product ID',()=>{
  const row=ctx.gainItemData({product_id:'cloud',qty:1,unit_price:15},[product]);
  assert.equal(row.buy,product.buyPrice);assert.equal(row.estimated,true);
});
test('a dozen costs 12 units and preserves the chosen presentation quantity',()=>{
  const row=ctx.gainItemData({id:'local',qty:2,unit_price:150,sale_presentation_id:'docena',sale_presentation_units:12,stock_qty:24,sale_unit:'Docena'},[product]);
  assert.equal(row.qty,2);assert.equal(row.buy*row.costQty,80);assert.equal(row.subtotal,300);
});
test('a non-medicine Caja uses its commercial presentation cost',()=>{
  const row=ctx.gainItemData({id:'local',qty:1,unit_price:200,sale_presentation_id:'caja',sale_presentation_units:36,stock_qty:36,sale_unit:'Caja'},[product]);
  assert.equal(row.buy*row.costQty,120);
});
test('500 grams use half a kilogram of cost',()=>{
  const row=ctx.gainItemData({id:'weight',qty:500,unit_price:.02,sale_unit:'g'},[{id:'weight',unit:'Kg',buyPrice:12}]);
  assert.equal(row.qty,.5);assert.equal(row.buy*row.costQty,6);assert.equal(row.subtotal,10);
});
test('zero historical cost is not replaced with a current cost',()=>{
  const row=ctx.gainItemData({id:'local',qty:1,unit_price:15,buy_price_at_sale:0},[product]);
  assert.equal(row.buy,0);assert.equal(row.estimated,false);
});
test('empty payment history formats zero rather than showing template source',()=>{
  const src=read('video-features.js');
  assert(!src.includes("'<div class=\"vrefPayment\"><span>Sin ventas</span><b>${money(0)}</b></div>'"));
  assert(src.includes('`<div class="vrefPayment"><span>Sin ventas</span><b>${money(0)}</b></div>`'));
});
test('product form saves commercial fields before cloud synchronization',()=>{
  const src=read('index.html');assert(src.indexOf('obj.commercialPricing=')<src.indexOf('await syncFn(saved)'));
  assert(!read('advanced-pricing.js').includes('setTimeout(apply,120)'));
  assert(read('central-stock-sync.js').includes('!p.__commercialEdited'));
});
