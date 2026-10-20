(()=>{
  if(window.__vareliaMedicineSaleUnitServerFixV2)return;
  window.__vareliaMedicineSaleUnitServerFixV2=true;

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

(()=>{
  if(document.querySelector('script[data-varelia-medicine-profit-history-fix-v2]'))return;
  const s=document.createElement('script');
  s.src='/medicine-profit-history-fix.js?v=20261020-v2';
  s.async=false;
  s.dataset.vareliaMedicineProfitHistoryFixV2='1';
  document.head.appendChild(s);
})();
