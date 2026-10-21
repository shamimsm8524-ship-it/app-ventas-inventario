(()=>{
  if(window.__vareliaSaleProfitLogicFixV30)return;
  window.__vareliaSaleProfitLogicFixV30=true;

  const normalize=value=>String(value??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const list=name=>{
    try{
      if(Array.isArray(window[name]))return window[name];
      return eval(`typeof ${name}!=='undefined'&&Array.isArray(${name})?${name}:[]`);
    }catch{return []}
  };
  const num=value=>value===null||value===undefined||value===''?NaN:Number(value);

  function productFor(item,products){
    const ids=[item?.productId,item?.product_id,item?.id,item?.cloudProductId].filter(v=>v!==null&&v!==undefined&&String(v)!=='').map(String);
    let p=products.find(x=>ids.includes(String(x?.id))||ids.includes(String(x?._cloudId))||ids.includes(String(x?.cloudId)));
    if(p)return p;
    const itemName=normalize(item?.productName??item?.product_name??item?.name).split(' · ')[0].trim();
    if(!itemName)return null;
    return products.find(x=>normalize(x?.name)===itemName)||null;
  }

  function presentationsFor(product){
    const rows=Array.isArray(product?.salePresentations)?product.salePresentations:(Array.isArray(product?.sale_presentations)?product.sale_presentations:[]);
    return rows.map((x,i)=>({
      id:String(x?.id??x?.presentation_id??('presentation_'+(i+1))),
      name:String(x?.name??x?.label??'').trim(),
      units:Number(x?.units??x?.presentation_units??x?.quantity??0)||0,
      price:Number(x?.price??x?.sale_price??0)||0
    })).filter(x=>x.name&&x.units>0);
  }

  function presentationFromSale(item,product){
    const rows=presentationsFor(product);
    if(!rows.length)return null;
    const explicitId=String(item?.salePresentationId??item?.sale_presentation_id??item?.presentationId??item?.presentation_id??'').trim();
    if(explicitId){
      const byId=rows.find(x=>String(x.id)===explicitId);
      if(byId)return byId;
    }
    const rawUnit=normalize(item?.saleUnit??item?.sale_unit??item?.unit??item?.unitType??item?.presentation??'');
    if(rawUnit){
      const byUnit=rows.find(x=>normalize(x.name)===rawUnit);
      if(byUnit)return byUnit;
    }
    const itemName=normalize(item?.productName??item?.product_name??item?.name);
    if(itemName){
      const byName=rows.find(x=>{
        const n=normalize(x.name);
        return n&&(
          itemName.endsWith(' · '+n)||
          itemName.endsWith(' - '+n)||
          itemName===normalize(product?.name)+' · '+n||
          itemName===normalize(product?.name)+' - '+n
        );
      });
      if(byName)return byName;
    }
    return null;
  }

  function enrichPresentation(item,product){
    if(!item||!product||product.medicine===true)return false;
    const presentation=presentationFromSale(item,product);
    if(!presentation)return false;
    let changed=false;
    const currentUnits=num(item.salePresentationUnits??item.sale_presentation_units??item.presentationUnits??item.presentation_units);
    if(!(currentUnits>0)&&presentation.units>0){
      item.salePresentationUnits=presentation.units;
      changed=true;
    }
    const currentId=String(item.salePresentationId??item.sale_presentation_id??item.presentationId??item.presentation_id??'').trim();
    if(!currentId&&presentation.id){
      item.salePresentationId=presentation.id;
      changed=true;
    }
    const rawUnit=String(item.saleUnit??item.sale_unit??item.unit??'').trim();
    if((!rawUnit||['unidad','unid','unit'].includes(normalize(rawUnit)))&&presentation.name){
      item.saleUnit=presentation.name;
      changed=true;
    }
    if(changed){
      try{Object.defineProperty(item,'__vareliaProfitPresentationInferred',{value:true,writable:true,configurable:true,enumerable:false})}catch{}
    }
    return changed;
  }

  function normalizeWeight(item,product){
    if(!item||!product)return false;
    const raw=normalize(item.saleUnit??item.sale_unit??item.unit??'');
    const base=normalize(product.unit??product.saleUnit??product.sale_unit??'');
    const qty=num(item.qty??item.quantity);
    const currentStock=num(item.stockQty??item.stock_qty);
    if(!Number.isFinite(qty)||qty<0||Number.isFinite(currentStock))return false;
    let stockQty=NaN;
    if(['g','gr','gramo','gramos'].includes(raw)&&['kg','kilo','kilos','kilogramo','kilogramos'].includes(base))stockQty=qty/1000;
    else if(['ml','mililitro','mililitros'].includes(raw)&&['l','lt','litro','litros'].includes(base))stockQty=qty/1000;
    if(!Number.isFinite(stockQty))return false;
    item.stockQty=stockQty;
    return true;
  }

  function patchSales(){
    const sales=list('sales'),products=list('products');
    if(!sales.length||!products.length)return 0;
    let changed=0;
    for(const sale of sales){
      const items=Array.isArray(sale?.items)?sale.items:[];
      for(const item of items){
        const product=productFor(item,products);
        if(!product)continue;
        if(enrichPresentation(item,product))changed++;
        if(normalizeWeight(item,product))changed++;
      }
    }
    return changed;
  }

  function refreshProfitIfOpen(){
    patchSales();
    const profit=document.getElementById('profit');
    if(!profit?.classList.contains('active'))return;
    const refresh=[...profit.querySelectorAll('button')].find(b=>/actualizar|refrescar/i.test(String(b.textContent||'')));
    if(refresh)refresh.click();
  }

  patchSales();
  document.addEventListener('click',e=>{
    const t=e.target?.closest?.('button,a,[data-view],[data-target]');
    const text=String(t?.textContent||'');
    const view=String(t?.dataset?.view||t?.dataset?.target||'');
    if(/ganancias?/i.test(text)||/profit|ganancia/i.test(view))patchSales();
  },true);
  window.addEventListener('varelia:sale-recorded',()=>setTimeout(()=>{patchSales();refreshProfitIfOpen()},0));
  window.addEventListener('varelia:checkout-confirmed',()=>setTimeout(patchSales,0));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)patchSales()});
  setTimeout(patchSales,250);
  setTimeout(patchSales,1200);
})();
