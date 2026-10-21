(()=>{
  if(window.__vareliaAdvancedPricingFlowV17)return;
  window.__vareliaAdvancedPricingFlowV17=true;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const productsList=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const cartList=()=>{try{return Array.isArray(cart)?cart:[]}catch{return[]}};
  const api=()=>window.VareliaAdvancedPricing||null;
  const liveProduct=p=>productsList().find(x=>String(x.id)===String(p?.id))||p;

  function configFor(p){
    const a=api();
    let c=a?.getConfig?.(p)||null;
    if(c)return c;
    const marker=/^varelia precios por cantidad$/i.test(String(p?.medicinePresentation||p?.medicine_presentation||'').trim());
    if(!marker)return null;
    const regular=Math.max(0,Number(p?.unitMedicinePrice||p?.sellPrice)||0);
    const wholesale=Math.max(0,Number(p?.blisterPrice)||0);
    const dozen=Math.max(0,Number(p?.boxPrice)||0);
    const hasWholesale=wholesale>0&&regular>0&&Math.abs(wholesale-regular)>0.009;
    c={
      version:1,proxy:true,
      dozenEnabled:dozen>0,dozenPrice:dozen,
      wholesaleEnabled:hasWholesale,wholesaleMinQty:12,wholesalePrice:hasWholesale?wholesale:0,
      promoEnabled:false,promoType:'percent',promoValue:0,promoStart:'',promoEnd:'',promoName:'Promoción'
    };
    return (c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled)?c:null;
  }

  function promoActive(c){
    const a=api();
    if(a?.promoActive)return !!a.promoActive(c);
    if(!c?.promoEnabled||!(Number(c.promoValue)>0))return false;
    const d=new Date(),day=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    if(c.promoStart&&day<c.promoStart)return false;
    if(c.promoEnd&&day>c.promoEnd)return false;
    return true;
  }
  function promoLabel(c){
    if(!promoActive(c))return '';
    const name=String(c.promoName||'Promoción').trim()||'Promoción';
    return c.promoType==='fixed'?`${name} - ${money(c.promoValue)}`:`${name} -${Number(c.promoValue).toFixed(Number(c.promoValue)%1?1:0)}%`;
  }
  function applyPromo(base,c){
    const a=api();
    if(a?.applyPromo)return Number(a.applyPromo(base,c))||0;
    base=Math.max(0,Number(base)||0);
    if(!promoActive(c))return base;
    if(c.promoType==='fixed')return Math.max(.01,base-(Number(c.promoValue)||0));
    return Math.max(.01,base*(1-Math.min(100,Number(c.promoValue)||0)/100));
  }

  function quoteExplicit(p,c,mode,qty){
    qty=Math.max(1,Math.floor(Number(qty)||1));
    let base=Math.max(0,Number(p.sellPrice)||0),multiplier=1,channel='pastilla',label='',minimum=1;
    if(mode==='dozen'){
      base=Math.max(0,Number(c.dozenPrice)||0);multiplier=12;channel='caja';label='Docena';
    }else if(mode==='wholesale'){
      base=Math.max(0,Number(c.wholesalePrice)||0);multiplier=1;channel='blister';label='Mayorista';minimum=Math.max(2,Math.floor(Number(c.wholesaleMinQty)||2));
    }
    const pl=promoLabel(c),promo=!!pl;
    if(pl)label=label?`${label} · ${pl}`:pl;
    return {mode,qty,basePrice:base,price:applyPromo(base,c),multiplier,channel,label,minimum,promo,promoLabel:pl,wholesale:mode==='wholesale'};
  }

  function ensurePicker(){
    let layer=document.getElementById('vAdvFlowPickerV17');
    if(layer)return layer;
    layer=document.createElement('div');
    layer.id='vAdvFlowPickerV17';
    layer.style.cssText='display:none;position:fixed;inset:0;z-index:100500;background:rgba(15,23,42,.58);padding:16px;align-items:center;justify-content:center';
    layer.innerHTML=`<div style="width:min(94vw,500px);max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><div><h3 id="vAdvFlowName" style="margin:0;font-size:22px"></h3><div id="vAdvFlowStock" class="meta"></div></div><button type="button" id="vAdvFlowClose" style="border:0;background:transparent;color:inherit;font-size:30px">×</button></div>
      <div style="margin-top:14px;font-weight:850">Selecciona cómo vender</div>
      <div id="vAdvFlowModes" style="display:grid;gap:9px;margin:10px 0 16px"></div>
      <label><span id="vAdvFlowQtyLabel">Cantidad</span><input id="vAdvFlowQty" type="number" min="1" step="1" inputmode="numeric" value="1"></label>
      <div id="vAdvFlowQuote" style="margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--bg)"></div>
      <button type="button" id="vAdvFlowAdd" class="btn primary" style="width:100%;font-size:18px">Agregar a la venta</button>
    </div>`;
    document.body.appendChild(layer);
    layer.querySelector('#vAdvFlowClose').onclick=()=>{layer.style.display='none';state=null};
    layer.addEventListener('click',e=>{if(e.target===layer){layer.style.display='none';state=null}});
    return layer;
  }

  let state=null;
  let previousAdd=null;
  function openPicker(p,qty=1){
    const c=configFor(p);if(!c)return false;
    const layer=ensurePicker();
    state={p,c,mode:'unit'};
    layer.querySelector('#vAdvFlowName').textContent=p.name||'Producto';
    layer.querySelector('#vAdvFlowStock').textContent=`Stock disponible: ${Number(p.stock||0)} ${p.unit||'unidades'}`;
    const modes=layer.querySelector('#vAdvFlowModes');
    const options=[{mode:'unit',label:p.unit||'Unidad'}];
    if(c.dozenEnabled&&Number(c.dozenPrice)>0)options.push({mode:'dozen',label:'Docena'});
    if(c.wholesaleEnabled&&Number(c.wholesalePrice)>0)options.push({mode:'wholesale',label:'Mayorista'});
    modes.innerHTML=options.map((o,i)=>`<button type="button" class="btn ${i===0?'primary':'secondary'}" data-vadv-flow-mode="${o.mode}">${esc(o.label)}</button>`).join('');
    modes.style.gridTemplateColumns=options.length===1?'1fr':options.length===2?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))';
    const input=layer.querySelector('#vAdvFlowQty');input.value=Math.max(1,Math.floor(Number(qty)||1));

    const draw=()=>{
      if(!state)return;
      const n=Math.max(1,Math.floor(Number(input.value)||1));
      const r=quoteExplicit(p,c,state.mode,n);
      const minimumOk=state.mode!=='wholesale'||n>=r.minimum;
      const needed=n*r.multiplier,stockOk=needed<=Number(p.stock||0),ok=minimumOk&&stockOk;
      layer.querySelector('#vAdvFlowQtyLabel').textContent=state.mode==='dozen'?'Cantidad de docenas':state.mode==='wholesale'?'Cantidad mayorista':'Cantidad';
      const unitText=state.mode==='dozen'?'docena':String(p.unit||'unidad').toLowerCase();
      layer.querySelector('#vAdvFlowQuote').innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px"><span>Precio aplicado</span><b>${money(r.price)} / ${esc(unitText)}</b></div>${state.mode==='wholesale'?`<div class="meta" style="margin-top:6px">🏷️ Mayorista desde ${r.minimum} ${esc(p.unit||'unidades')}</div>`:''}${r.promo?`<div class="meta" style="margin-top:6px;color:var(--p);font-weight:850">🎁 ${esc(r.promoLabel)}</div>`:''}<div style="display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line)"><b>Total</b><b style="color:var(--p)">${money(r.price*n)}</b></div><div class="meta" style="margin-top:6px">Stock que saldrá: ${needed} ${esc(p.unit||'unidades')}</div>${!minimumOk?`<div style="margin-top:8px;color:#b45309;font-weight:900">El precio mayorista aplica desde ${r.minimum} unidades.</div>`:''}${!stockOk?'<div style="margin-top:8px;color:#b91c1c;font-weight:900">Stock insuficiente.</div>':''}`;
      const add=layer.querySelector('#vAdvFlowAdd');add.disabled=!ok;add.style.opacity=ok?'1':'.55';
      modes.querySelectorAll('[data-vadv-flow-mode]').forEach(b=>{const on=b.dataset.vadvFlowMode===state.mode;b.classList.toggle('primary',on);b.classList.toggle('secondary',!on)});
    };

    modes.onclick=e=>{
      const b=e.target.closest('[data-vadv-flow-mode]');if(!b||!state)return;
      state.mode=b.dataset.vadvFlowMode;
      if(state.mode==='wholesale'){
        const min=Math.max(2,Math.floor(Number(c.wholesaleMinQty)||2));
        if(Number(input.value)<min)input.value=min;
      }
      draw();
    };
    input.oninput=draw;
    layer.querySelector('#vAdvFlowAdd').onclick=()=>{
      if(!state)return;
      const n=Math.max(1,Math.floor(Number(input.value)||1)),r=quoteExplicit(p,c,state.mode,n),needed=n*r.multiplier;
      if((state.mode==='wholesale'&&n<r.minimum)||needed>Number(p.stock||0)){draw();return}
      const prepared={...p,__advancedPrepared:true,__medicineSelected:true,medicine:false,
        selectionLabel:r.label||((r.mode==='dozen')?'Docena':(r.mode==='wholesale'?'Mayorista':'')),
        sellPrice:r.price,medicineMultiplier:r.multiplier,advancedServerSaleUnit:r.channel,medicineSaleUnit:'',
        unit:r.mode==='dozen'?'Docena':p.unit};
      layer.style.display='none';state=null;
      try{if(typeof openSale==='function')openSale(false);else window.openSale?.(false)}catch{}
      const add=previousAdd||window.addToCart;
      add.call(window,prepared,n);
      try{
        const list=cartList(),key=String(p.id)+'::'+String(prepared.selectionLabel||''),item=list.find(x=>String(x.cartKey||'')===key)||[...list].reverse().find(x=>String(x.id)===String(p.id));
        if(item){
          item.originalPrice=r.basePrice;item.discountLabel=r.promoLabel||'';item.advancedPricingMode=r.mode;
          item.advancedPricingWholesale=r.mode==='wholesale';item.baseUnit=p.unit||'Unidad';
          item.advancedServerSaleUnit=r.channel;item.medicineMultiplier=r.multiplier;item.medicineSaleUnit='';item.medicine=false;
          if(typeof persistSaleCart==='function')persistSaleCart();
          if(typeof renderCart==='function')renderCart();
        }
      }catch(err){console.warn('Varelia flujo de precios',err)}
    };
    draw();layer.style.display='flex';
    return true;
  }

  function install(){
    const current=window.addToCart||(()=>{try{return addToCart}catch{return null}})();
    if(typeof current!=='function')return false;
    if(current.__vareliaAdvancedPricingFlowV17)return true;
    previousAdd=current;
    const wrapped=function(p,qty=1){
      const live=liveProduct(p);
      const c=configFor(live);
      if(!live||!c||p?.__advancedPrepared)return previousAdd.apply(this,arguments);
      if(Array.isArray(live.characteristics)&&live.characteristics.length&&!p?.__characteristicsSelected)return previousAdd.apply(this,arguments);
      openPicker({...live,...p},qty);
    };
    wrapped.__vareliaAdvancedPricingFlowV17=true;wrapped.__original=current;
    window.addToCart=wrapped;try{addToCart=wrapped}catch{}
    return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-add]');if(!b)return;
    const p=productsList().find(x=>String(x.id).trim()===String(b.dataset.add||'').trim());
    if(!p||!configFor(p))return;
    e.preventDefault();e.stopImmediatePropagation();
    install();
    const add=window.addToCart||(()=>{try{return addToCart}catch{return null}})();
    if(typeof add==='function')add(p,1);
  },true);

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()&&tries>10)clearInterval(timer);if(tries>80)clearInterval(timer)},100);
  addEventListener('pageshow',()=>setTimeout(install,30));
})();
