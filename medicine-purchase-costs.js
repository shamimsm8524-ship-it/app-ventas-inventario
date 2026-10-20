(()=>{
  if(window.__vareliaMedicinePurchaseCostsV1)return;
  window.__vareliaMedicinePurchaseCostsV1=true;

  const META='__varelia_medicine_purchase_costs_v1__';
  const COST_IDS={box:'vMedicineBuyBoxPrice',blister:'vMedicineBuyBlisterPrice',unit:'vMedicineBuyUnitPrice'};
  const SELL_IDS={box:'vMedicineBoxPrice',blister:'vMedicineBlisterPrice',unit:'vMedicineUnitPrice'};
  let formKey='';
  let lastWrappedSync=null;
  let lastWrappedAdd=null;

  const norm=v=>String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?n:0};
  const money=v=>'S/ '+num(v).toFixed(2);
  const isMedicine=p=>!!(p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim()));
  const list=()=>{try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}return Array.isArray(window.products)?window.products:[]};
  const activeCart=()=>{try{if(typeof cart!=='undefined'&&Array.isArray(cart))return cart}catch{}return Array.isArray(window.cart)?window.cart:[]};
  const canonicalUnit=v=>{const n=norm(v);if(/^cajas?$/.test(n)||/^boxes?$/.test(n))return'box';if(/^blister(?:es|s)?$/.test(n))return'blister';if(/^pastillas?$/.test(n)||/^tabletas?$/.test(n)||/^pills?$/.test(n)||/^unidad(?:es)?$/.test(n))return'unit';return''};
  const unitLabel=u=>u==='box'?'caja':u==='blister'?'blíster':'pastilla / unidad';

  function stripMeta(chars){
    return (Array.isArray(chars)?chars:[]).filter(c=>String(c?.name||'')!==META);
  }
  function readMeta(chars){
    const row=(Array.isArray(chars)?chars:[]).find(c=>String(c?.name||'')===META);
    if(!row)return null;
    const out={box:0,blister:0,unit:0,explicit:true};
    for(const v of Array.isArray(row.values)?row.values:[]){
      const s=String(v?.label??v??'');
      const m=s.match(/^(box|blister|unit):(-?\d+(?:\.\d+)?)$/i);
      if(m)out[m[1].toLowerCase()]=num(m[2]);
    }
    return out;
  }
  function metadata(costs){
    return {name:META,values:[
      {label:'box:'+num(costs.box),color:''},
      {label:'blister:'+num(costs.blister),color:''},
      {label:'unit:'+num(costs.unit),color:''}
    ]};
  }
  function productCosts(p){
    if(!p)return {box:0,blister:0,unit:0,explicit:false};
    const meta=readMeta(p.characteristics);
    const direct={
      box:num(p.medicineBuyBoxPrice),
      blister:num(p.medicineBuyBlisterPrice),
      unit:num(p.medicineBuyUnitPrice),
      explicit:!!p.medicinePurchaseCostsExplicit
    };
    if(meta){
      return {
        box:direct.box||meta.box,
        blister:direct.blister||meta.blister,
        unit:direct.unit||meta.unit,
        explicit:true
      };
    }
    // Migración sin cálculo: el antiguo "Precio de compra" se conserva únicamente
    // como costo de la caja. Nunca se divide entre blísteres ni pastillas.
    if(!direct.box&&num(p.buyPrice)>0)direct.box=num(p.buyPrice);
    return direct;
  }
  function applyCosts(p,costs,explicit=true){
    if(!p)return;
    p.medicineBuyBoxPrice=num(costs.box);
    p.medicineBuyBlisterPrice=num(costs.blister);
    p.medicineBuyUnitPrice=num(costs.unit);
    p.medicinePurchaseCostsExplicit=!!explicit;
    // Compatibilidad: buyPrice representa el costo de compra de la caja en medicamentos.
    // No se usa para calcular automáticamente el costo de otras presentaciones.
    if(num(costs.box)>0)p.buyPrice=num(costs.box);
  }
  function hydrateProduct(p){
    if(!isMedicine(p))return false;
    const meta=readMeta(p.characteristics);
    if(meta)applyCosts(p,meta,true);
    else {
      const c=productCosts(p);
      if(c.box||c.blister||c.unit)applyCosts(p,c,!!p.medicinePurchaseCostsExplicit);
    }
    if(Array.isArray(p.characteristics))p.characteristics=stripMeta(p.characteristics);
    return !!meta;
  }
  function hydrateAll(){
    let changed=false;
    for(const p of list())changed=hydrateProduct(p)||changed;
    return changed;
  }
  function findCurrent(){
    const id=String(document.getElementById('productId')?.value||'').trim();
    const barcode=String(document.getElementById('barcode')?.value||'').trim();
    const name=String(document.getElementById('productName')?.value||'').trim().toLowerCase();
    return (id&&list().find(p=>String(p?.id||'')===id))
      ||(barcode&&list().find(p=>String(p?.barcode||'').trim()===barcode))
      ||(name&&list().find(p=>String(p?.name||'').trim().toLowerCase()===name))
      ||null;
  }
  function sameProduct(a,b){
    if(!a||!b)return false;
    if(String(a.id||'')&&String(a.id||'')===String(b.id||''))return true;
    const ab=String(a.barcode||'').trim(),bb=String(b.barcode||'').trim();
    if(ab&&ab===bb)return true;
    return String(a.name||'').trim().toLowerCase()===String(b.name||'').trim().toLowerCase();
  }
  function liveProduct(p){
    if(!p)return null;
    return list().find(x=>sameProduct(x,p))||p;
  }

  function ensureUi(){
    const fields=document.getElementById('vMedicineFields');
    const boxSell=document.getElementById('vMedicineBoxPrice');
    if(!fields||!boxSell)return null;
    let block=document.getElementById('vMedicinePurchaseCosts');
    if(!block){
      block=document.createElement('section');
      block.id='vMedicinePurchaseCosts';
      block.style.cssText='margin:14px 0;padding:14px;border:1px solid var(--line,#e5e7eb);border-radius:18px;background:color-mix(in srgb,var(--card,#fff) 94%,#16a34a 6%);';
      block.innerHTML=`
        <div style="font-weight:900;font-size:16px;margin-bottom:4px">💰 Costos de compra del medicamento</div>
        <div style="font-size:12px;color:var(--muted,#64748b);line-height:1.45;margin-bottom:12px">Estos costos los escribes tú. Varelia no los divide ni los calcula automáticamente.</div>
        <div class="two">
          <label><span>Precio de compra por caja</span><input id="${COST_IDS.box}" type="number" min="0" step="0.01" placeholder="S/ 0.00" inputmode="decimal"></label>
          <label><span>Precio de compra por blíster</span><input id="${COST_IDS.blister}" type="number" min="0" step="0.01" placeholder="S/ 0.00" inputmode="decimal"></label>
        </div>
        <label><span>Precio de compra por pastilla / unidad</span><input id="${COST_IDS.unit}" type="number" min="0" step="0.01" placeholder="S/ 0.00" inputmode="decimal"></label>
        <div id="vMedicinePurchaseCostsNote" style="font-size:11px;color:var(--muted,#64748b);line-height:1.45;margin-top:8px">Si vendes una presentación, su precio de compra debe estar registrado para calcular la ganancia correctamente.</div>`;
      const anchor=boxSell.closest('.two')||boxSell.closest('label')||boxSell;
      anchor.parentNode?.insertBefore(block,anchor);
    }
    return block;
  }
  function medicineVisible(){const f=document.getElementById('vMedicineFields');return !!f&&f.style.display!=='none'}
  function syncGenericBuyVisibility(){
    const input=document.getElementById('buyPrice');
    const label=input?.closest('label');
    if(!label)return;
    if(!label.dataset.vareliaMedicineOldDisplay)label.dataset.vareliaMedicineOldDisplay=label.style.display||'__empty__';
    if(medicineVisible())label.style.display='none';
    else label.style.display=label.dataset.vareliaMedicineOldDisplay==='__empty__'?'':label.dataset.vareliaMedicineOldDisplay;
  }
  function readFormCosts(){
    return {
      box:num(document.getElementById(COST_IDS.box)?.value),
      blister:num(document.getElementById(COST_IDS.blister)?.value),
      unit:num(document.getElementById(COST_IDS.unit)?.value)
    };
  }
  function salePrices(){
    return {
      box:num(document.getElementById(SELL_IDS.box)?.value),
      blister:num(document.getElementById(SELL_IDS.blister)?.value),
      unit:num(document.getElementById(SELL_IDS.unit)?.value)
    };
  }
  function syncRequired(){
    const sells=salePrices();
    for(const k of ['box','blister','unit']){
      const input=document.getElementById(COST_IDS[k]);if(!input)continue;
      input.required=sells[k]>0;
      input.setCustomValidity('');
      if(input.required&&!(num(input.value)>0)){
        input.setCustomValidity('Escribe el precio de compra por '+unitLabel(k)+'. Varelia no lo calcula automáticamente.');
      }
    }
  }
  function populateForm(force=false){
    const block=ensureUi();
    syncGenericBuyVisibility();
    if(!block||!medicineVisible())return;
    const p=findCurrent();
    const key=String(document.getElementById('productId')?.value||'__new__')+'|'+String(document.getElementById('barcode')?.value||'');
    if(!force&&key===formKey)return syncRequired();
    formKey=key;
    const c=p?productCosts(p):{box:0,blister:0,unit:0};
    for(const k of ['box','blister','unit']){
      const input=document.getElementById(COST_IDS[k]);
      if(input)input.value=c[k]>0?String(c[k]):'';
    }
    syncRequired();
  }
  function applyFormToProduct(p){
    if(!isMedicine(p)||!medicineVisible())return productCosts(p);
    const current=findCurrent();
    if(current&&!sameProduct(current,p))return productCosts(p);
    const c=readFormCosts();
    applyCosts(p,c,true);
    const generic=document.getElementById('buyPrice');
    if(generic&&c.box>0)generic.value=String(c.box);
    return c;
  }

  function wrapSync(){
    const current=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
    if(typeof current!=='function'||current.__vareliaMedicinePurchaseCostsV1)return false;
    const original=current;
    const wrapped=async function(p,...args){
      if(isMedicine(p)){
        hydrateProduct(p);
        const costs=applyFormToProduct(p);
        const visibleChars=stripMeta(p.characteristics);
        p.characteristics=[...visibleChars,metadata(costs)];
        try{
          return await original.call(this,p,...args);
        }finally{
          p.characteristics=stripMeta(p.characteristics);
        }
      }
      return original.call(this,p,...args);
    };
    wrapped.__vareliaMedicinePurchaseCostsV1=true;
    wrapped.__vareliaMedicinePurchaseCostsOriginal=original;
    window.vareliaCentralStockSyncProduct=wrapped;
    window.syncProductToCloud=wrapped;
    try{syncProductToCloud=wrapped}catch{}
    lastWrappedSync=wrapped;
    return true;
  }

  function selectedCost(p,unit){
    const live=liveProduct(p);
    hydrateProduct(live);
    const c=productCosts(live);
    return unit==='box'?c.box:unit==='blister'?c.blister:unit==='unit'?c.unit:0;
  }
  function attachCostToCart(product,unit,cost){
    const rows=activeCart();
    const candidates=rows.filter(x=>sameProduct(x,product));
    let row=candidates.find(x=>canonicalUnit(x?.medicineSaleUnit??x?.medicine_sale_unit??x?.saleUnit??x?.sale_unit)===unit)||candidates[candidates.length-1];
    if(!row)return;
    row.medicineBuyPriceAtSale=cost;
    row.buyPriceAtSale=cost;
    row.costAtSale=cost;
    row.medicinePurchaseCostExplicit=true;
    try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
  }
  function wrapAddToCart(){
    const current=window.addToCart;
    if(typeof current!=='function'||current.__vareliaMedicinePurchaseCostsV1)return false;
    const original=current;
    const wrapped=function(p,...args){
      if(isMedicine(p)){
        const unit=canonicalUnit(p?.medicineSaleUnit??p?.medicine_sale_unit??p?.saleUnit??p?.sale_unit??p?.medicineDisplayUnit);
        if(unit){
          const cost=selectedCost(p,unit);
          if(!(cost>0)){
            const msg='Configura el precio de compra por '+unitLabel(unit)+' antes de vender este medicamento. Varelia no lo calculará automáticamente.';
            try{window.vareliaToast?.(msg,'warn')}catch{}
            alert(msg);
            return;
          }
          p.medicineBuyPriceAtSale=cost;
          p.buyPriceAtSale=cost;
          p.costAtSale=cost;
          p.medicinePurchaseCostExplicit=true;
          const result=original.call(this,p,...args);
          attachCostToCart(p,unit,cost);
          return result;
        }
      }
      return original.call(this,p,...args);
    };
    wrapped.__vareliaMedicinePurchaseCostsV1=true;
    wrapped.__vareliaMedicinePurchaseCostsOriginal=original;
    window.addToCart=wrapped;
    try{addToCart=wrapped}catch{}
    lastWrappedAdd=wrapped;
    return true;
  }

  async function persistSaleCosts(sale){
    if(!sale||!Array.isArray(sale.items))return;
    const sb=window.vareliaSupabase;
    let failed=false,changed=false;
    for(const item of sale.items){
      const p=liveProduct(item);
      if(!isMedicine(p))continue;
      const unit=canonicalUnit(item?.medicineSaleUnit??item?.medicine_sale_unit??item?.saleUnit??item?.sale_unit??item?.medicineDisplayUnit);
      if(!unit)continue;
      let cost=num(item?.medicineBuyPriceAtSale??item?.buyPriceAtSale??item?.costAtSale);
      if(!(cost>0))cost=selectedCost(p,unit);
      if(!(cost>0)){
        failed=true;
        continue;
      }
      item.medicineBuyPriceAtSale=cost;
      item.buyPriceAtSale=cost;
      item.costAtSale=cost;
      item.medicinePurchaseCostExplicit=true;
      changed=true;
      const rowId=String(item?.cloudSaleItemId||item?.sale_item_id||'').trim();
      if(sb&&rowId){
        try{
          const res=await sb.from('varelia_sale_items').update({buy_price_at_sale:cost}).eq('id',rowId);
          if(res?.error)throw res.error;
        }catch(err){
          console.error('No se pudo guardar el costo exacto del medicamento en la venta',err);
          failed=true;
        }
      }else if(sb){
        failed=true;
      }
    }
    if(changed){try{if(typeof save==='function')save()}catch{}}
    if(failed){
      const msg='La venta se registró, pero Varelia no pudo confirmar el costo exacto de compra de uno de los medicamentos. Esa ganancia no debe considerarse exacta.';
      try{window.vareliaToast?.(msg,'warn')}catch{}
    }
  }

  function boot(){
    hydrateAll();
    ensureUi();
    syncGenericBuyVisibility();
    populateForm(true);
    wrapSync();
    wrapAddToCart();

    const dlg=document.getElementById('productDialog');
    if(dlg)new MutationObserver(()=>{
      if(dlg.open){formKey='';[0,80,220].forEach(ms=>setTimeout(()=>populateForm(true),ms))}
      else syncGenericBuyVisibility();
    }).observe(dlg,{attributes:true,attributeFilter:['open']});

    document.addEventListener('input',e=>{
      if(e.target?.matches?.('#vMedicineBoxPrice,#vMedicineBlisterPrice,#vMedicineUnitPrice,'+
        '#vMedicineBuyBoxPrice,#vMedicineBuyBlisterPrice,#vMedicineBuyUnitPrice'))syncRequired();
    },true);
    document.addEventListener('change',e=>{
      if(e.target?.matches?.('#productCategory,#vMedicineToggle'))setTimeout(()=>{ensureUi();syncGenericBuyVisibility();populateForm(true)},0);
    },true);
    document.addEventListener('click',e=>{
      if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct'))[40,140,320].forEach(ms=>setTimeout(()=>populateForm(true),ms));
    },true);
    window.addEventListener('varelia:central-stock-updated',()=>{
      const hadMeta=hydrateAll();
      if(hadMeta){try{if(typeof render==='function')render()}catch{}}
      setTimeout(()=>populateForm(true),20);
    });
    window.addEventListener('varelia:sale-recorded',e=>{persistSaleCosts(e.detail?.sale).catch(err=>console.error(err))});

    // Otros módulos también envuelven addToCart/sync. Mantener esta validación como capa externa.
    setInterval(()=>{
      if(window.vareliaCentralStockSyncProduct!==lastWrappedSync)wrapSync();
      if(window.addToCart!==lastWrappedAdd)wrapAddToCart();
      if(document.getElementById('productDialog')?.open){ensureUi();syncGenericBuyVisibility();syncRequired()}
    },700);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
