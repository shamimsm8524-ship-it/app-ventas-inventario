(()=>{
  if(window.__vareliaMedicineSaleUnitServerFixV5)return;
  window.__vareliaMedicineSaleUnitServerFixV5=true;

  const normalize=value=>String(value||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const canonical=value=>{
    const n=normalize(value);
    if(/^blister(?:es|s)?$/.test(n))return 'blister';
    if(/^cajas?$/.test(n)||/^boxes?$/.test(n))return 'caja';
    if(/^pastillas?$/.test(n)||/^tabletas?$/.test(n)||/^pills?$/.test(n))return 'pastilla';
    return String(value||'').trim();
  };

  function activeCart(){
    try{if(typeof cart!=='undefined'&&Array.isArray(cart))return cart}catch{}
    return Array.isArray(window.cart)?window.cart:null;
  }

  let pending=[];
  let fallbackTimer=0;
  function restore(){
    clearTimeout(fallbackTimer);
    const rows=pending.splice(0);
    for(const x of rows){
      if(!x?.item)continue;
      if(x.had)x.item.medicineSaleUnit=x.value;
      else delete x.item.medicineSaleUnit;
    }
  }

  function prepareServerUnits(){
    restore();
    const rows=activeCart();
    if(!rows?.length)return;
    for(const item of rows){
      const raw=String(item?.medicineSaleUnit??item?.medicine_sale_unit??item?.sale_unit??item?.saleUnit??'').trim();
      if(!raw)continue;
      const serverUnit=canonical(raw);
      if(!serverUnit)continue;
      const had=Object.prototype.hasOwnProperty.call(item,'medicineSaleUnit');
      pending.push({item,value:item.medicineSaleUnit,had});
      item.medicineDisplayUnit=item.medicineDisplayUnit||raw;
      // Mantener la unidad canónica durante TODO el checkout. Antes se restauraba
      // a los 50 ms y la RPC asíncrona podía volver a recibir "Blíster" con tilde,
      // cayendo al cálculo por pastillas (10 x precio unitario).
      item.medicineSaleUnit=serverUnit;
    }
    fallbackTimer=setTimeout(restore,20000);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#checkout,#vposCheckout'))prepareServerUnits();
  },true);
  window.addEventListener('varelia:sale-recorded',()=>setTimeout(restore,0));
  window.addEventListener('varelia:checkout-confirmed',()=>setTimeout(restore,0));
})();

// Sistema definitivo de medicamentos: cada presentación conserva su propio
// costo de compra escrito por el usuario. No se divide ni se estima automáticamente.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-purchase-costs-v1]'))return;
  const s=document.createElement('script');
  s.src='/medicine-purchase-costs.js?v=20261020-v1';
  s.async=false;
  s.dataset.vareliaMedicinePurchaseCostsV1='1';
  document.head.appendChild(s);
})();

// Persistencia fuerte: captura los costos antes del submit y los guarda en el
// producto local y en el metadato que viaja a Supabase.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-purchase-save-fix-v1]'))return;
  const s=document.createElement('script');
  s.src='/medicine-purchase-save-fix.js?v=20261020-v1';
  s.async=false;
  s.dataset.vareliaMedicinePurchaseSaveFixV1='1';
  document.head.appendChild(s);
})();

// Un solo bloque visual para Compra y Venta por presentación.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-price-layout-v2]'))return;
  const s=document.createElement('script');
  s.src='/medicine-price-layout.js?v=20261020-v2';
  s.async=false;
  s.dataset.vareliaMedicinePriceLayoutV2='1';
  document.head.appendChild(s);
})();

// Confirmación visible al guardar y mensaje claro cuando falta un costo.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-save-feedback-v1]'))return;
  const s=document.createElement('script');
  s.src='/medicine-save-feedback.js?v=20261020-v1';
  s.async=false;
  s.dataset.vareliaMedicineSaveFeedbackV1='1';
  document.head.appendChild(s);
})();

// Ganancias: stock_qty son pastillas descontadas, no la cantidad de cajas/blísteres vendida.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-profit-history-fix-v5]'))return;
  const s=document.createElement('script');
  s.src='/medicine-profit-history-fix.js?v=20261020-v5';
  s.async=false;
  s.dataset.vareliaMedicineProfitHistoryFixV5='1';
  document.head.appendChild(s);
})();

// Solo mejora el texto de la tarjeta de ganancias; no cambia importes.
(()=>{
  if(document.querySelector('script[data-varelia-profit-label-copy-fix-v1]'))return;
  const s=document.createElement('script');
  s.src='/profit-label-copy-fix.js?v=20261020-v1';
  s.async=false;
  s.dataset.vareliaProfitLabelCopyFixV1='1';
  document.head.appendChild(s);
})();
