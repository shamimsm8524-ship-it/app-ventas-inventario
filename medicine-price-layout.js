(()=>{
  if(window.__vareliaMedicinePriceLayoutV2)return;
  window.__vareliaMedicinePriceLayoutV2=true;

  const rows=[
    {key:'box',title:'Caja',buy:'vMedicineBuyBoxPrice',sell:'vMedicineBoxPrice'},
    {key:'blister',title:'Blíster',buy:'vMedicineBuyBlisterPrice',sell:'vMedicineBlisterPrice'},
    {key:'unit',title:'Pastilla / unidad',buy:'vMedicineBuyUnitPrice',sell:'vMedicineUnitPrice'}
  ];

  function hideLegacyBlock(){
    const legacy=document.getElementById('vMedicinePurchaseCosts');
    if(legacy){
      legacy.hidden=true;
      legacy.style.setProperty('display','none','important');
      legacy.setAttribute('aria-hidden','true');
    }
    let style=document.getElementById('vareliaMedicineUnifiedPriceCssV2');
    if(!style){
      style=document.createElement('style');
      style.id='vareliaMedicineUnifiedPriceCssV2';
      style.textContent='#vMedicinePurchaseCosts{display:none!important} #vMedicineUnifiedPrices #vMedicinePurchaseCosts{display:none!important}';
      document.head.appendChild(style);
    }
  }

  function build(){
    const fields=document.getElementById('vMedicineFields');
    if(!fields)return false;

    const existing=document.getElementById('vMedicineUnifiedPrices');
    if(existing){hideLegacyBlock();return true;}

    const refs=rows.map(r=>({
      ...r,
      buyEl:document.getElementById(r.buy),
      sellEl:document.getElementById(r.sell),
      buyLabel:document.getElementById(r.buy)?.closest('label')||null,
      sellLabel:document.getElementById(r.sell)?.closest('label')||null
    }));
    if(refs.some(r=>!r.buyEl||!r.sellEl))return false;

    const legacy=document.getElementById('vMedicinePurchaseCosts');
    const anchor=legacy||refs[0].sellLabel||refs[0].sellEl;
    if(!anchor?.parentNode)return false;

    const unified=document.createElement('section');
    unified.id='vMedicineUnifiedPrices';
    unified.style.cssText='margin:14px 0;padding:14px;border:1px solid var(--line,#e5e7eb);border-radius:18px;background:color-mix(in srgb,var(--card,#fff) 95%,#16a34a 5%);';
    unified.innerHTML='<div style="font-weight:900;font-size:18px;margin-bottom:4px">💰 Precios del medicamento</div><div style="font-size:12px;color:var(--muted,#64748b);line-height:1.45;margin-bottom:12px">Escribe el costo de la caja y cuántos blísteres y pastillas contiene. Los costos por blíster y pastilla se calculan automáticamente. Los precios de venta los eliges tú.</div>';

    anchor.parentNode.insertBefore(unified,anchor);

    for(const r of refs){
      const row=document.createElement('div');
      row.style.cssText='padding:12px 0;border-top:1px solid var(--line,#e5e7eb);';

      const title=document.createElement('div');
      title.textContent=r.title;
      title.style.cssText='font-weight:900;font-size:15px;margin-bottom:8px;';

      const grid=document.createElement('div');
      grid.className='two';

      const buy=document.createElement('label');
      const buySpan=document.createElement('span');
      buySpan.textContent=r.key==='box'?'Costo de la caja':'Costo calculado';
      buy.appendChild(buySpan);
      buy.appendChild(r.buyEl);

      const sell=document.createElement('label');
      const sellSpan=document.createElement('span');
      sellSpan.textContent='Venta';
      sell.appendChild(sellSpan);
      sell.appendChild(r.sellEl);

      grid.appendChild(buy);
      grid.appendChild(sell);
      row.appendChild(title);
      row.appendChild(grid);
      unified.appendChild(row);

      if(r.buyLabel&&r.buyLabel!==buy)r.buyLabel.remove();
      if(r.sellLabel&&r.sellLabel!==sell)r.sellLabel.remove();
    }

    const note=document.createElement('div');
    note.style.cssText='font-size:11px;color:var(--muted,#64748b);line-height:1.45;margin-top:8px';
    note.textContent='La ganancia usa el costo de compra que escribiste para la presentación realmente vendida.';
    unified.appendChild(note);

    // Se conserva el contenedor antiguo oculto porque medicine-purchase-costs.js
    // lo usa como ancla interna. Así no vuelve a crearlo dentro de Caja.
    hideLegacyBlock();
    return true;
  }

  function run(){
    hideLegacyBlock();
    if(build())return;
    setTimeout(run,120);
  }

  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit],#newProduct,#inventoryNewProduct'))setTimeout(run,80);
  },true);

  const mo=new MutationObserver(()=>{
    hideLegacyBlock();
    if(document.getElementById('productDialog')?.open)setTimeout(build,0);
  });

  const boot=()=>{mo.observe(document.documentElement,{childList:true,subtree:true});run()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
