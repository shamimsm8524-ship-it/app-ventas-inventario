(()=>{
  if(window.__vareliaMedicineSaleUnitServerFixV4)return;
  window.__vareliaMedicineSaleUnitServerFixV4=true;

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

  function prepareServerUnits(){
    const rows=activeCart();
    if(!rows?.length)return;
    const restore=[];
    for(const item of rows){
      const raw=String(item?.medicineSaleUnit??item?.medicine_sale_unit??item?.sale_unit??item?.saleUnit??'').trim();
      if(!raw)continue;
      const serverUnit=canonical(raw);
      if(!serverUnit||serverUnit===raw)continue;
      restore.push({item,value:item.medicineSaleUnit,had:Object.prototype.hasOwnProperty.call(item,'medicineSaleUnit')});
      item.medicineSaleUnit=serverUnit;
      item.medicineDisplayUnit=raw;
    }
    if(restore.length)setTimeout(()=>{
      for(const x of restore){
        if(x.had)x.item.medicineSaleUnit=x.value;
        else delete x.item.medicineSaleUnit;
      }
    },50);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#checkout,#vposCheckout'))prepareServerUnits();
  },true);
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

// Un solo bloque visual para Compra y Venta por presentación.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-price-layout-v1]'))return;
  const s=document.createElement('script');
  s.src='/medicine-price-layout.js?v=20261020-v1';
  s.async=false;
  s.dataset.vareliaMedicinePriceLayoutV1='1';
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
