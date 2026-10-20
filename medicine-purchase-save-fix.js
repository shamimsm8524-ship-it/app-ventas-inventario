(()=>{
  if(window.__vareliaMedicinePurchaseSaveFixV1)return;
  window.__vareliaMedicinePurchaseSaveFixV1=true;

  const META='__varelia_medicine_purchase_costs_v1__';
  const ids={box:'vMedicineBuyBoxPrice',blister:'vMedicineBuyBlisterPrice',unit:'vMedicineBuyUnitPrice'};
  let pending=null;
  let lastWrapped=null;

  const n=v=>{const x=Number(v);return Number.isFinite(x)&&x>=0?x:0};
  const val=id=>n(document.getElementById(id)?.value);
  const text=id=>String(document.getElementById(id)?.value||'').trim();
  const list=()=>{try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}return Array.isArray(window.products)?window.products:[]};
  const isMedicine=p=>!!(p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim()));
  const costs=()=>({box:val(ids.box),blister:val(ids.blister),unit:val(ids.unit)});
  const keyFromForm=()=>({id:text('productId'),barcode:text('barcode'),name:text('productName').toLowerCase()});
  const same=(p,k)=>!!p&&!!k&&((k.id&&String(p.id||'')===k.id)||(k.barcode&&String(p.barcode||'').trim()===k.barcode)||(k.name&&String(p.name||'').trim().toLowerCase()===k.name));
  const strip=chars=>(Array.isArray(chars)?chars:[]).filter(c=>String(c?.name||'')!==META);
  const meta=c=>({name:META,values:[{label:'box:'+n(c.box),color:''},{label:'blister:'+n(c.blister),color:''},{label:'unit:'+n(c.unit),color:''}]});

  function apply(p,c,withMeta=false){
    if(!p)return;
    p.medicineBuyBoxPrice=n(c.box);
    p.medicineBuyBlisterPrice=n(c.blister);
    p.medicineBuyUnitPrice=n(c.unit);
    p.medicinePurchaseCostsExplicit=true;
    if(n(c.box)>0)p.buyPrice=n(c.box);
    if(withMeta)p.characteristics=[...strip(p.characteristics),meta(c)];
  }

  function capture(){
    const fields=document.getElementById('vMedicineFields');
    if(!fields||fields.style.display==='none')return;
    pending={key:keyFromForm(),costs:costs(),at:Date.now()};
    const current=list().find(p=>same(p,pending.key));
    if(current){
      apply(current,pending.costs,false);
      try{if(typeof save==='function')save()}catch{}
    }
  }

  // El click sucede antes del submit que intercepta el guardado principal.
  document.addEventListener('click',e=>{
    const btn=e.target?.closest?.('#productForm button[type="submit"],#productForm input[type="submit"]');
    if(btn)capture();
  },true);

  function wrapSync(){
    const current=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
    if(typeof current!=='function'||current.__vareliaMedicinePurchaseSaveFixV1)return false;
    const original=current;
    const wrapped=async function(p,...args){
      if(isMedicine(p)&&pending&&Date.now()-pending.at<60000&&same(p,pending.key)){
        const c=pending.costs;
        apply(p,c,true);
        try{
          return await original.call(this,p,...args);
        }finally{
          // Mantener los costos directos en el producto local, pero ocultar el metadato interno.
          p.characteristics=strip(p.characteristics);
          apply(p,c,false);
        }
      }
      return original.call(this,p,...args);
    };
    wrapped.__vareliaMedicinePurchaseSaveFixV1=true;
    window.vareliaCentralStockSyncProduct=wrapped;
    window.syncProductToCloud=wrapped;
    try{syncProductToCloud=wrapped}catch{}
    lastWrapped=wrapped;
    return true;
  }

  // Si otro módulo vuelve a envolver la sincronización, esta capa se mantiene afuera.
  setInterval(()=>{
    if(window.vareliaCentralStockSyncProduct!==lastWrapped)wrapSync();
  },300);

  window.addEventListener('varelia:central-stock-updated',()=>{
    if(!pending)return;
    const p=list().find(x=>same(x,pending.key));
    if(p){
      // La nube devuelve el metadato en characteristics; el módulo de costos lo hidrata.
      // Como defensa adicional, conservar aquí los valores recién confirmados.
      apply(p,pending.costs,false);
      try{if(typeof save==='function')save()}catch{}
    }
  });

  wrapSync();
})();
