(()=>{
  if(window.__vareliaAdvancedPricingV1)return;
  window.__vareliaAdvancedPricingV1=true;

  const q=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  const productList=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const cartList=()=>{try{return Array.isArray(cart)?cart:[]}catch{return[]}};
  const isMedicine=p=>!!p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim());
  const isDiscrete=p=>!['kg','gramo','gramos','g','litro','litros','l','ml','mililitro','mililitros','metro','metros','m²','m2'].includes(String(p?.unit||'').trim().toLowerCase());
  const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};

  function normalizeConfig(raw){
    const r=raw&&typeof raw==='object'?raw:{};
    return {
      version:1,
      proxy:true,
      dozenEnabled:!!r.dozenEnabled,
      dozenPrice:Math.max(0,Number(r.dozenPrice)||0),
      wholesaleEnabled:!!r.wholesaleEnabled,
      wholesaleMinQty:Math.max(2,Math.floor(Number(r.wholesaleMinQty)||12)),
      wholesalePrice:Math.max(0,Number(r.wholesalePrice)||0),
      promoEnabled:!!r.promoEnabled,
      promoType:['percent','fixed'].includes(String(r.promoType))?String(r.promoType):'percent',
      promoValue:Math.max(0,Number(r.promoValue)||0),
      promoStart:String(r.promoStart||''),
      promoEnd:String(r.promoEnd||''),
      promoName:String(r.promoName||'Promoción').trim()||'Promoción'
    };
  }
  function getConfig(p){
    const c=normalizeConfig(p?.advancedPricing||{});
    if(!(c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled))return null;
    return c;
  }
  function promoActive(c,date=localDate()){
    if(!c?.promoEnabled||!(Number(c.promoValue)>0))return false;
    if(c.promoStart&&date<c.promoStart)return false;
    if(c.promoEnd&&date>c.promoEnd)return false;
    return true;
  }
  function applyPromo(base,c){
    base=Math.max(0,Number(base)||0);
    if(!promoActive(c))return round2(base);
    if(c.promoType==='fixed')return round2(Math.max(.01,base-c.promoValue));
    return round2(Math.max(.01,base*(1-Math.min(100,c.promoValue)/100)));
  }
  function promoLabel(c){
    if(!promoActive(c))return '';
    return c.promoType==='fixed'?`${c.promoName} - ${money(c.promoValue)}`:`${c.promoName} -${Number(c.promoValue).toFixed(Number(c.promoValue)%1?1:0)}%`;
  }
  function quote(p,mode='unit',qty=1){
    const c=getConfig(p);
    qty=Math.max(1,Math.floor(Number(qty)||1));
    if(!c)return {price:Math.max(0,Number(p?.sellPrice)||0),basePrice:Math.max(0,Number(p?.sellPrice)||0),mode:'unit',channel:'',multiplier:1,label:'',wholesale:false,promo:false};
    let base=Number(p.sellPrice)||0,channel='pastilla',multiplier=1,label='',wholesale=false;
    if(mode==='dozen'&&c.dozenEnabled){
      base=c.dozenPrice;channel='caja';multiplier=12;label='Docena';
    }else if(c.wholesaleEnabled&&qty>=c.wholesaleMinQty){
      base=c.wholesalePrice;channel='blister';multiplier=1;label='Mayorista';wholesale=true;
    }else{
      channel='pastilla';multiplier=1;label='';
    }
    const price=applyPromo(base,c),promo=promoActive(c),pl=promoLabel(c);
    if(pl)label=label?`${label} · ${pl}`:pl;
    return {price,basePrice:round2(base),mode:mode==='dozen'?'dozen':'unit',channel,multiplier,label,wholesale,promo,promoLabel:pl,config:c};
  }

  window.VareliaAdvancedPricing={normalizeConfig,getConfig,promoActive,applyPromo,quote};

  function ensureProductFields(){
    const form=q('productForm');if(!form||q('vAdvancedPricingBox'))return !!form;
    const box=document.createElement('section');box.id='vAdvancedPricingBox';box.className='card';box.style.cssText='margin:14px 0;display:grid;gap:13px;background:color-mix(in srgb,var(--p) 4%,var(--card));border:1px solid color-mix(in srgb,var(--p) 18%,var(--line))';
    box.innerHTML=`
      <div><b style="font-size:19px">📦 Precios por cantidad</b><div class="meta" style="font-size:13px;margin-top:4px">Configura docenas, precio mayorista y promociones. El stock sigue guardándose en la unidad base del producto.</div></div>
      <label style="display:flex;align-items:center;gap:9px"><input id="vAdvDozenEnabled" type="checkbox" style="width:20px;height:20px"> <span>Vender también por docena</span></label>
      <div id="vAdvDozenFields" style="display:none"><label><span>Precio de venta por docena (12 unidades)</span><input id="vAdvDozenPrice" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ej. 30.00"></label></div>
      <label style="display:flex;align-items:center;gap:9px"><input id="vAdvWholesaleEnabled" type="checkbox" style="width:20px;height:20px"> <span>Activar precio al por mayor</span></label>
      <div id="vAdvWholesaleFields" style="display:none;grid-template-columns:1fr 1fr;gap:10px"><label><span>Desde cuántas unidades</span><input id="vAdvWholesaleMin" type="number" min="2" step="1" inputmode="numeric" value="12"></label><label><span>Precio mayorista por unidad</span><input id="vAdvWholesalePrice" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ej. 2.50"></label></div>
      <label style="display:flex;align-items:center;gap:9px"><input id="vAdvPromoEnabled" type="checkbox" style="width:20px;height:20px"> <span>Activar promoción / descuento</span></label>
      <div id="vAdvPromoFields" style="display:none;gap:10px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label><span>Tipo de descuento</span><select id="vAdvPromoType"><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo (S/)</option></select></label><label><span>Descuento</span><input id="vAdvPromoValue" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ej. 10"></label></div>
        <label><span>Nombre de la promoción</span><input id="vAdvPromoName" maxlength="40" placeholder="Ej. Oferta de la semana"></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label><span>Desde (opcional)</span><input id="vAdvPromoStart" type="date"></label><label><span>Hasta (opcional)</span><input id="vAdvPromoEnd" type="date"></label></div>
      </div>
      <div id="vAdvPricingHint" class="meta" style="font-size:12px;line-height:1.45">Varelia aplicará automáticamente el precio correcto al vender. No divide ni inventa precios.</div>`;
    const anchor=q('reorderLevel')?.closest('label')||form.querySelector('button[type="submit"]');
    if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor);else form.appendChild(box);
    const toggle=()=>{
      q('vAdvDozenFields').style.display=q('vAdvDozenEnabled').checked?'block':'none';
      q('vAdvWholesaleFields').style.display=q('vAdvWholesaleEnabled').checked?'grid':'none';
      q('vAdvPromoFields').style.display=q('vAdvPromoEnabled').checked?'grid':'none';
      refreshEligibility();
    };
    ['vAdvDozenEnabled','vAdvWholesaleEnabled','vAdvPromoEnabled'].forEach(id=>q(id).addEventListener('change',toggle));
    q('unit')?.addEventListener('change',refreshEligibility);
    q('productCategory')?.addEventListener('change',refreshEligibility);
    toggle();
    return true;
  }
  function refreshEligibility(){
    const box=q('vAdvancedPricingBox');if(!box)return;
    const p={unit:q('unit')?.value||'',category:q('productCategory')?.value||'',medicine:q('vMedicineToggle')?.checked};
    const allowed=!isMedicine(p)&&isDiscrete(p);
    box.style.display=allowed?'grid':'none';
    if(!allowed){const h=q('vAdvPricingHint');if(h)h.textContent=isMedicine(p)?'Los medicamentos ya usan Caja, Blíster y Pastilla con sus propios precios.':'Docena y mayorista están disponibles para productos de unidades discretas.'}
  }
  function readFormConfig(){
    if(!q('vAdvancedPricingBox')||q('vAdvancedPricingBox').style.display==='none')return null;
    const c=normalizeConfig({
      dozenEnabled:q('vAdvDozenEnabled').checked,
      dozenPrice:q('vAdvDozenPrice').value,
      wholesaleEnabled:q('vAdvWholesaleEnabled').checked,
      wholesaleMinQty:q('vAdvWholesaleMin').value,
      wholesalePrice:q('vAdvWholesalePrice').value,
      promoEnabled:q('vAdvPromoEnabled').checked,
      promoType:q('vAdvPromoType').value,
      promoValue:q('vAdvPromoValue').value,
      promoName:q('vAdvPromoName').value,
      promoStart:q('vAdvPromoStart').value,
      promoEnd:q('vAdvPromoEnd').value
    });
    if(!(c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled))return null;
    return c;
  }
  function validateConfig(c){
    if(!c)return '';
    if(c.dozenEnabled&&!(c.dozenPrice>0))return 'Escribe el precio de venta por docena.';
    if(c.wholesaleEnabled&&!(c.wholesalePrice>0))return 'Escribe el precio mayorista por unidad.';
    if(c.wholesaleEnabled&&c.wholesaleMinQty<2)return 'La venta al por mayor debe comenzar desde 2 unidades o más.';
    if(c.promoEnabled&&!(c.promoValue>0))return 'Escribe el descuento de la promoción.';
    if(c.promoEnabled&&c.promoType==='percent'&&c.promoValue>100)return 'El descuento porcentual no puede ser mayor a 100%.';
    if(c.promoEnabled&&c.promoStart&&c.promoEnd&&c.promoEnd<c.promoStart)return 'La fecha final de la promoción no puede ser anterior a la fecha inicial.';
    return '';
  }
  function fillForm(p){
    ensureProductFields();
    const c=getConfig(p)||normalizeConfig({});
    q('vAdvDozenEnabled').checked=!!c.dozenEnabled;q('vAdvDozenPrice').value=c.dozenPrice||'';
    q('vAdvWholesaleEnabled').checked=!!c.wholesaleEnabled;q('vAdvWholesaleMin').value=c.wholesaleMinQty||12;q('vAdvWholesalePrice').value=c.wholesalePrice||'';
    q('vAdvPromoEnabled').checked=!!c.promoEnabled;q('vAdvPromoType').value=c.promoType||'percent';q('vAdvPromoValue').value=c.promoValue||'';q('vAdvPromoName').value=c.promoName||'Promoción';q('vAdvPromoStart').value=c.promoStart||'';q('vAdvPromoEnd').value=c.promoEnd||'';
    ['vAdvDozenEnabled','vAdvWholesaleEnabled','vAdvPromoEnabled'].forEach(id=>q(id).dispatchEvent(new Event('change')));
    refreshEligibility();
  }
  function currentEditingProduct(){
    const id=String(q('productId')?.value||'').trim();
    if(id){const p=productList().find(x=>String(x.id).trim()===id);if(p)return p}
    const bc=String(q('barcode')?.value||'').trim();if(bc){const p=productList().find(x=>String(x.barcode||'').trim()===bc);if(p)return p}
    return null;
  }

  let formBound=false;
  function bindProductForm(){
    if(formBound||!ensureProductFields())return;
    const form=q('productForm');if(!form)return;formBound=true;
    form.addEventListener('submit',e=>{
      const c=readFormConfig(),problem=validateConfig(c);
      if(problem){e.preventDefault();e.stopImmediatePropagation();toast(problem,'warn');return}
      const pending={id:String(q('productId')?.value||''),barcode:String(q('barcode')?.value||'').trim(),name:String(q('productName')?.value||'').trim(),config:c,at:Date.now()};
      let tries=0;
      const apply=async()=>{
        tries++;
        const ps=productList();
        let p=(pending.id&&ps.find(x=>String(x.id)===pending.id))||(pending.barcode&&ps.find(x=>String(x.barcode||'')===pending.barcode))||ps.find(x=>String(x.name||'').trim()===pending.name);
        if(!p){if(tries<20)setTimeout(apply,100);return}
        p.advancedPricing=pending.config?normalizeConfig(pending.config):null;
        try{if(typeof save==='function')save();else if(typeof K!=='undefined')localStorage.setItem(K.products,JSON.stringify(ps))}catch{}
        try{if(typeof window.vareliaSyncProduct==='function')await window.vareliaSyncProduct(p)}catch(err){console.error('Sincronización de precios por cantidad',err);toast('El producto se guardó, pero falta sincronizar los precios por cantidad. Toca la nube para reintentar.','warn')}
        try{window.dispatchEvent(new CustomEvent('varelia:advanced-pricing-saved',{detail:{id:p.id}}))}catch{}
      };
      setTimeout(apply,80);
    },true);
    const dialog=q('productDialog');
    if(dialog){
      new MutationObserver(()=>{if(dialog.open)setTimeout(()=>fillForm(currentEditingProduct()),30)}).observe(dialog,{attributes:true,attributeFilter:['open']});
      dialog.addEventListener('close',()=>{});
    }
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-edit]'))setTimeout(()=>fillForm(currentEditingProduct()),80);
      if(e.target.closest?.('#newProduct,#addProduct,[data-new-product]'))setTimeout(()=>fillForm(null),80);
    },true);
  }

  function ensureSalePicker(){
    let layer=q('vAdvancedSalePicker');if(layer)return layer;
    layer=document.createElement('div');layer.id='vAdvancedSalePicker';layer.style.cssText='display:none;position:fixed;inset:0;z-index:100000;background:rgba(15,23,42,.58);padding:16px;align-items:center;justify-content:center';
    layer.innerHTML=`<div style="width:min(94vw,480px);max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><h3 id="vAdvSaleName" style="margin:0;font-size:22px"></h3><div id="vAdvSaleStock" class="meta"></div></div><button type="button" id="vAdvSaleClose" style="border:0;background:transparent;font-size:30px">×</button></div><div id="vAdvSaleModes" style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:16px 0"></div><label><span id="vAdvSaleQtyLabel">Cantidad</span><input id="vAdvSaleQty" type="number" min="1" step="1" inputmode="numeric" value="1"></label><div id="vAdvSaleQuote" style="margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--bg)"></div><button type="button" id="vAdvSaleAdd" class="btn primary" style="width:100%;font-size:18px">Agregar a la venta</button></div>`;
    document.body.appendChild(layer);
    q('vAdvSaleClose').onclick=()=>{layer.style.display='none'};
    layer.addEventListener('click',e=>{if(e.target===layer)layer.style.display='none'});
    return layer;
  }

  let activePicker=null;
  function openSalePicker(p,initialQty=1,originalAdd){
    const c=getConfig(p);if(!c)return originalAdd(p,initialQty);
    const layer=ensureSalePicker();activePicker={p,mode:'unit',originalAdd};
    q('vAdvSaleName').textContent=p.name;q('vAdvSaleStock').textContent=`Stock disponible: ${Number(p.stock||0)} ${p.unit||'unidades'}`;
    const modes=q('vAdvSaleModes');modes.innerHTML=`<button type="button" class="btn primary" data-adv-mode="unit">${esc(p.unit||'Unidad')}</button>${c.dozenEnabled?'<button type="button" class="btn secondary" data-adv-mode="dozen">Docena</button>':''}`;modes.style.gridTemplateColumns=c.dozenEnabled?'1fr 1fr':'1fr';
    const qty=q('vAdvSaleQty');qty.value=Math.max(1,Math.floor(Number(initialQty)||1));
    function draw(){
      const n=Math.max(1,Math.floor(Number(qty.value)||1)),r=quote(p,activePicker.mode,n),needed=n*r.multiplier,ok=needed<=Number(p.stock||0);
      q('vAdvSaleQtyLabel').textContent=activePicker.mode==='dozen'?'Cantidad de docenas':'Cantidad';
      q('vAdvSaleQuote').innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px"><span>Precio aplicado</span><b>${money(r.price)}${activePicker.mode==='dozen'?' / docena':' / '+esc(p.unit||'unidad').toLowerCase()}</b></div>${r.wholesale?`<div class="meta" style="margin-top:6px">🏷️ Precio mayorista desde ${r.config.wholesaleMinQty} unidades</div>`:''}${r.promo?`<div class="meta" style="margin-top:6px;color:var(--p);font-weight:850">🎁 ${esc(r.promoLabel)}</div>`:''}<div style="display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line)"><b>Total</b><b style="color:var(--p)">${money(r.price*n)}</b></div><div class="meta" style="margin-top:6px">Stock que saldrá: ${needed} ${esc(p.unit||'unidades')}</div>${ok?'':'<div style="margin-top:8px;color:#b91c1c;font-weight:900">Stock insuficiente.</div>'}`;
      q('vAdvSaleAdd').disabled=!ok;q('vAdvSaleAdd').style.opacity=ok?'1':'.55';
      modes.querySelectorAll('[data-adv-mode]').forEach(b=>{const on=b.dataset.advMode===activePicker.mode;b.classList.toggle('primary',on);b.classList.toggle('secondary',!on)});
    }
    modes.onclick=e=>{const b=e.target.closest('[data-adv-mode]');if(!b)return;activePicker.mode=b.dataset.advMode;draw()};qty.oninput=draw;draw();
    q('vAdvSaleAdd').onclick=()=>{
      if(!activePicker)return;const n=Math.max(1,Math.floor(Number(qty.value)||1)),r=quote(p,activePicker.mode,n),needed=n*r.multiplier;if(needed>Number(p.stock||0)){draw();return}
      const prepared={...p,__advancedPrepared:true,selectionLabel:r.label||((r.mode==='dozen')?'Docena':(r.wholesale?'Mayorista':'')),sellPrice:r.price,medicineMultiplier:r.multiplier,medicineSaleUnit:r.channel,unit:r.mode==='dozen'?'Docena':p.unit};
      const add=activePicker.originalAdd;layer.style.display='none';activePicker=null;
      try{if(typeof openSale==='function')openSale(false)}catch{}
      add(prepared,n);
      try{
        const list=cartList(),key=String(p.id)+'::'+String(prepared.selectionLabel||''),item=list.find(x=>String(x.cartKey||'')===key)||[...list].reverse().find(x=>String(x.id)===String(p.id));
        if(item){item.originalPrice=r.basePrice;item.discountLabel=r.promoLabel||'';item.advancedPricingMode=r.mode;item.advancedPricingWholesale=!!r.wholesale;item.baseUnit=p.unit||'Unidad';if(typeof persistSaleCart==='function')persistSaleCart();if(typeof renderCart==='function')renderCart()}
      }catch{}
    };
    layer.style.display='flex';
  }

  let wrappedAdd=null,lastUnderlying=null;
  function patchAddToCart(){
    const current=window.addToCart||(()=>{try{return addToCart}catch{return null}})();
    if(typeof current!=='function')return false;
    if(current===wrappedAdd)return true;
    if(current.__vareliaAdvancedPricingV1)return true;
    lastUnderlying=current;
    const wrapped=function(p,qty=1){
      const live=productList().find(x=>String(x.id)===String(p?.id))||p;
      if(!live||isMedicine(live)||!getConfig(live)||p?.__advancedPrepared)return current.apply(this,arguments);
      if(Array.isArray(live.characteristics)&&live.characteristics.length&&!p?.__characteristicsSelected)return current.apply(this,arguments);
      openSalePicker({...live,...p},qty,current.bind(this));
    };
    wrapped.__vareliaAdvancedPricingV1=true;wrapped.__original=current;wrappedAdd=wrapped;window.addToCart=wrapped;try{addToCart=wrapped}catch{}return true;
  }

  let repriceBusy=false;
  function repriceCart(){
    if(repriceBusy)return;const list=cartList();if(!list.length)return;let changed=false;
    for(const item of list){
      const p=productList().find(x=>String(x.id)===String(item.id));if(!p||!getConfig(p)||isMedicine(p))continue;
      const mode=(item.advancedPricingMode==='dozen'||String(item.medicineSaleUnit)==='caja'||String(item.unit).toLowerCase()==='docena')?'dozen':'unit';
      const r=quote(p,mode,item.qty);const label=r.label||((mode==='dozen')?'Docena':(r.wholesale?'Mayorista':''));
      const nextName=p.name+(label?' · '+label:'');
      if(Number(item.price)!==Number(r.price)||item.medicineSaleUnit!==r.channel||Number(item.medicineMultiplier||1)!==r.multiplier||item.selectionLabel!==label||item.name!==nextName){
        item.price=r.price;item.originalPrice=r.basePrice;item.discountLabel=r.promoLabel||'';item.medicineSaleUnit=r.channel;item.medicineMultiplier=r.multiplier;item.selectionLabel=label;item.name=nextName;item.unit=mode==='dozen'?'Docena':p.unit;item.baseUnit=p.unit||'Unidad';item.advancedPricingMode=mode;item.advancedPricingWholesale=!!r.wholesale;changed=true;
      }
    }
    if(changed){repriceBusy=true;try{if(typeof persistSaleCart==='function')persistSaleCart();if(typeof renderCart==='function')renderCart()}finally{setTimeout(()=>{repriceBusy=false;decorateCart()},0)}}else decorateCart();
  }
  function decorateCart(){
    const list=cartList();for(const item of list){const p=productList().find(x=>String(x.id)===String(item.id));if(!p||!getConfig(p)||isMedicine(p))continue;const row=document.querySelector(`[data-cart-row="${CSS.escape(String(item.cartKey||item.id))}"]`);if(!row)continue;const small=row.querySelector('small');if(!small)continue;const mode=item.advancedPricingMode==='dozen'?'dozen':'unit',r=quote(p,mode,item.qty),u=mode==='dozen'?'docena':String(p.unit||'unidad').toLowerCase();small.textContent=(r.wholesale?'Precio mayorista':'Precio')+' por '+u+': '+money(item.price)+' · Cantidad: '+item.qty+(item.discountLabel?' · '+item.discountLabel:'');}}

  function decorateProductCards(){
    for(const p of productList()){
      const c=getConfig(p);if(!c||isMedicine(p))continue;
      document.querySelectorAll(`[data-add="${CSS.escape(String(p.id))}"]`).forEach(btn=>{
        const card=btn.closest('.product');if(!card||card.querySelector('.vAdvProductBadges'))return;
        const box=document.createElement('div');box.className='vAdvProductBadges';box.style.cssText='display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;font-size:11px;font-weight:850';
        const bits=[];if(c.dozenEnabled)bits.push(`📦 Docena ${money(applyPromo(c.dozenPrice,c))}`);if(c.wholesaleEnabled)bits.push(`🏷️ Mayorista ${money(applyPromo(c.wholesalePrice,c))} desde ${c.wholesaleMinQty}`);if(promoActive(c))bits.push(`🎁 ${esc(promoLabel(c))}`);box.innerHTML=bits.map(x=>`<span style="padding:4px 7px;border-radius:999px;background:color-mix(in srgb,var(--p) 8%,var(--card));color:var(--p)">${x}</span>`).join('');card.querySelector('.pb')?.insertBefore(box,card.querySelector('.actions'));
      });
    }
  }

  function decorateReports(){
    const advanced=productList().filter(p=>getConfig(p)&&!isMedicine(p));if(!advanced.length)return;
    const nodes=[...document.querySelectorAll('dialog,[role="dialog"],.modal')].filter(x=>x.offsetParent!==null||x.open);
    for(const root of nodes){
      for(const p of advanced){
        const text=String(root.textContent||'');if(!text.includes(p.name))continue;
        root.querySelectorAll('*').forEach(el=>{
          if(el.children.length) return;
          let t=el.textContent||'';
          if(!t)return;
          if(/pastilla/i.test(t))t=t.replace(/pastillas?/gi,String(p.unit||'unidad').toLowerCase());
          if(/bl[ií]ster/i.test(t))t=t.replace(/bl[ií]ster(?:es)?/gi,String(p.unit||'unidad').toLowerCase()+' mayorista');
          if(/caja/i.test(t))t=t.replace(/cajas?/gi,'docena');
          if(t!==el.textContent)el.textContent=t;
        });
      }
    }
  }

  let promotionSyncBusy=false;
  async function syncPromotionState(){
    if(promotionSyncBusy||typeof window.vareliaSyncProduct!=='function')return;promotionSyncBusy=true;
    try{
      const day=localDate();
      for(const p of productList()){
        const c=getConfig(p);if(!c||isMedicine(p))continue;
        const key=`${day}|${promoActive(c)?'1':'0'}|${c.promoType}|${c.promoValue}|${c.dozenPrice}|${c.wholesalePrice}|${c.wholesaleMinQty}`;
        const storageKey='varelia_adv_price_sync_'+String(p.id);
        if(localStorage.getItem(storageKey)===key)continue;
        try{await window.vareliaSyncProduct(p);localStorage.setItem(storageKey,key)}catch(e){console.warn('Actualización de promoción',p.name,e)}
      }
    }finally{promotionSyncBusy=false}
  }

  function boot(){
    bindProductForm();patchAddToCart();decorateProductCards();repriceCart();
    window.addEventListener('varelia:central-stock-updated',()=>{setTimeout(()=>{bindProductForm();patchAddToCart();decorateProductCards();repriceCart();syncPromotionState()},80)});
    window.addEventListener('varelia:cart-changed',()=>setTimeout(repriceCart,0));
    document.addEventListener('click',e=>{if(e.target.closest?.('[data-cart-plus],[data-cart-minus],[data-cart-delete]'))setTimeout(repriceCart,30)},true);
    document.addEventListener('input',e=>{if(e.target.matches?.('[data-cart-qty]'))setTimeout(repriceCart,20)},true);
    const mo=new MutationObserver(()=>{setTimeout(()=>{decorateProductCards();decorateReports();if(q('productDialog')?.open)refreshEligibility()},0)});mo.observe(document.body,{childList:true,subtree:true});
    setInterval(()=>{patchAddToCart();syncPromotionState()},60000);
    setTimeout(syncPromotionState,2500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
