(()=>{
  if(window.__vareliaCommercialPresentationsV18)return;
  window.__vareliaCommercialPresentationsV18=true;

  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>'S/ '+Number(n||0).toFixed(2);
  const round2=n=>Math.round((Number(n)||0)*100)/100;
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  const productsList=()=>{try{return Array.isArray(products)?products:[]}catch{return Array.isArray(window.products)?window.products:[]}};
  const cartList=()=>{try{return Array.isArray(cart)?cart:[]}catch{return[]}};
  const liveProduct=p=>productsList().find(x=>String(x.id)===String(p?.id))||p;
  const isContinuous=p=>['kg','kilo','kilos','kilogramo','kilogramos','gramo','gramos','g','gr','litro','litros','l','ml','mililitro','mililitros','metro','metros','m','m²','m2'].includes(String(p?.unit||'').trim().toLowerCase());
  const isMedicine=p=>!!p?.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p?.category||'').trim());
  const localDate=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
  const slug=s=>String(s||'presentacion').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'').slice(0,42)||'presentacion';

  function normalizePricing(raw){
    const r=raw&&typeof raw==='object'?raw:{};
    return {
      version:2,
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
  function normalizePresentations(raw){
    const src=Array.isArray(raw)?raw:[];
    const used=new Set();
    return src.map((x,i)=>{
      const name=String(x?.name||'').trim();
      const base=slug(x?.id||name||('presentacion_'+(i+1)));
      let id=base,n=2;while(used.has(id))id=base+'_'+n++;
      used.add(id);
      return {id,name,units:Math.max(0,Number(x?.units)||0),price:Math.max(0,Number(x?.price)||0),active:x?.active!==false};
    }).filter(x=>x.name&&x.units>0&&x.price>0);
  }
  function pricingFor(p){return normalizePricing(p?.advancedPricing||{});}
  function presentationsFor(p){return normalizePresentations(p?.salePresentations||[]);}
  function hasCommercialOptions(p){
    if(!p||isMedicine(p)||isContinuous(p))return false;
    const c=pricingFor(p),pres=presentationsFor(p).filter(x=>x.active);
    return !!(pres.length||c.wholesaleEnabled||c.promoEnabled);
  }
  function promoActive(c,date=localDate()){
    if(!c?.promoEnabled||!(Number(c.promoValue)>0))return false;
    if(c.promoStart&&date<c.promoStart)return false;
    if(c.promoEnd&&date>c.promoEnd)return false;
    return true;
  }
  function promoLabel(c){
    if(!promoActive(c))return '';
    const name=String(c.promoName||'Promoción').trim()||'Promoción';
    return c.promoType==='fixed'?`${name} - ${money(c.promoValue)}`:`${name} -${Number(c.promoValue).toFixed(Number(c.promoValue)%1?1:0)}%`;
  }
  function applyPromo(base,c){
    base=Math.max(0,Number(base)||0);
    if(!promoActive(c))return round2(base);
    if(c.promoType==='fixed')return round2(Math.max(.01,base-(Number(c.promoValue)||0)));
    return round2(Math.max(.01,base*(1-Math.min(100,Number(c.promoValue)||0)/100));
  }

  let draftPresentations=[];
  const presets=[
    {name:'Six Pack',units:6},
    {name:'Media docena',units:6},
    {name:'Docena',units:12},
    {name:'Pack x24',units:24},
    {name:'Medio cajón',units:''},
    {name:'Cajón',units:''}
  ];

  function ensureProductBox(){
    const form=$('productForm');if(!form)return false;
    document.getElementById('vAdvancedPricingBox')?.remove();
    if($('vCommercialPricingBox'))return true;
    const box=document.createElement('section');box.id='vCommercialPricingBox';box.className='card';box.style.cssText='margin:14px 0;display:grid;gap:14px;background:color-mix(in srgb,var(--p) 4%,var(--card));border:1px solid color-mix(in srgb,var(--p) 18%,var(--line))';
    box.innerHTML=`
      <div><b style="font-size:19px">📦 Presentaciones y precios por cantidad</b><div class="meta" style="font-size:13px;margin-top:4px">Configura cómo vendes este producto: Six Pack, media docena, docena, cajón, medio cajón, pack u otra presentación. Tú defines cuántas unidades contiene y su precio.</div></div>
      <div>
        <div style="font-weight:900;margin-bottom:8px">Presentaciones de venta</div>
        <div id="vCommercialPresets" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px"></div>
        <div id="vCommercialPresentationRows" style="display:grid;gap:9px"></div>
        <button type="button" class="btn secondary" id="vCommercialAddCustom" style="width:100%;margin-top:9px">+ Agregar otra presentación</button>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:13px">
        <label style="display:flex;align-items:center;gap:9px"><input id="vCommercialWholesaleEnabled" type="checkbox" style="width:20px;height:20px"> <span>Activar precio al por mayor por unidad</span></label>
        <div id="vCommercialWholesaleFields" style="display:none;grid-template-columns:1fr 1fr;gap:10px;margin-top:9px"><label><span>Desde cuántas unidades</span><input id="vCommercialWholesaleMin" type="number" min="2" step="1" inputmode="numeric" value="12"></label><label><span>Precio mayorista por unidad</span><input id="vCommercialWholesalePrice" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ej. 2.50"></label></div>
      </div>
      <div style="border-top:1px solid var(--line);padding-top:13px">
        <label style="display:flex;align-items:center;gap:9px"><input id="vCommercialPromoEnabled" type="checkbox" style="width:20px;height:20px"> <span>Activar promoción / descuento</span></label>
        <div id="vCommercialPromoFields" style="display:none;gap:10px;margin-top:9px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label><span>Tipo</span><select id="vCommercialPromoType"><option value="percent">Porcentaje (%)</option><option value="fixed">Monto fijo (S/)</option></select></label><label><span>Descuento</span><input id="vCommercialPromoValue" type="number" min="0.01" step="0.01" inputmode="decimal" placeholder="Ej. 10"></label></div>
          <label><span>Nombre de la promoción</span><input id="vCommercialPromoName" maxlength="40" placeholder="Ej. Oferta de la semana"></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><label><span>Desde (opcional)</span><input id="vCommercialPromoStart" type="date"></label><label><span>Hasta (opcional)</span><input id="vCommercialPromoEnd" type="date"></label></div>
        </div>
      </div>
      <div class="meta" style="font-size:12px;line-height:1.45">El stock siempre se guarda en la unidad base. Al vender 1 Six Pack de 6, Varelia descontará 6 unidades; 1 docena descontará 12; un cajón descontará la cantidad que configures.</div>`;
    const anchor=$('reorderLevel')?.closest('label')||form.querySelector('button[type="submit"]');
    if(anchor?.parentNode)anchor.parentNode.insertBefore(box,anchor);else form.appendChild(box);

    const presetWrap=$('vCommercialPresets');
    presetWrap.innerHTML=presets.map((p,i)=>`<button type="button" class="btn secondary" data-vcp-preset="${i}" style="padding:8px 10px">${esc(p.name)}</button>`).join('');
    presetWrap.onclick=e=>{const b=e.target.closest('[data-vcp-preset]');if(!b)return;const p=presets[Number(b.dataset.vcpPreset)];addDraft(p.name,p.units,'');};
    $('vCommercialAddCustom').onclick=()=>addDraft('','','');
    $('vCommercialWholesaleEnabled').onchange=toggleConfig;
    $('vCommercialPromoEnabled').onchange=toggleConfig;
    renderDraft();toggleConfig();refreshEligibility();
    return true;
  }
  function toggleConfig(){
    if($('vCommercialWholesaleFields'))$('vCommercialWholesaleFields').style.display=$('vCommercialWholesaleEnabled')?.checked?'grid':'none';
    if($('vCommercialPromoFields'))$('vCommercialPromoFields').style.display=$('vCommercialPromoEnabled')?.checked?'grid':'none';
  }
  function refreshEligibility(){
    const box=$('vCommercialPricingBox');if(!box)return;
    const p={unit:$('unit')?.value||'',category:$('productCategory')?.value||'',medicine:$('vMedicineToggle')?.checked};
    box.style.display=(!isMedicine(p)&&!isContinuous(p))?'grid':'none';
  }
  function addDraft(name='',units='',price=''){
    const base=slug(name||'presentacion');let id=base,n=2;const ids=new Set(draftPresentations.map(x=>x.id));while(ids.has(id))id=base+'_'+n++;
    draftPresentations.push({id,name:String(name||''),units:units===''?'':Number(units),price:price===''?'':Number(price),active:true});
    renderDraft();
  }
  function renderDraft(){
    const wrap=$('vCommercialPresentationRows');if(!wrap)return;
    if(!draftPresentations.length){wrap.innerHTML='<div class="meta" style="padding:10px;border:1px dashed var(--line);border-radius:13px">Todavía no agregaste presentaciones. Puedes vender solo por unidad o agregar Six Pack, docena, cajón, etc.</div>';return}
    wrap.innerHTML=draftPresentations.map((p,i)=>`<div data-vcp-row="${i}" style="display:grid;grid-template-columns:minmax(0,1.4fr) minmax(90px,.7fr) minmax(105px,.8fr) 42px;gap:7px;align-items:end;border:1px solid var(--line);padding:9px;border-radius:14px;background:var(--card)">
      <label><span>Nombre</span><input data-vcp-name value="${esc(p.name)}" placeholder="Ej. Cajón"></label>
      <label><span>Unidades</span><input data-vcp-units type="number" min="1" step="1" inputmode="numeric" value="${p.units===''?'':esc(p.units)}" placeholder="24"></label>
      <label><span>Precio</span><input data-vcp-price type="number" min="0.01" step="0.01" inputmode="decimal" value="${p.price===''?'':esc(p.price)}" placeholder="S/ 0.00"></label>
      <button type="button" class="btn danger" data-vcp-remove="${i}" aria-label="Eliminar">×</button>
    </div>`).join('');
    wrap.oninput=e=>{const row=e.target.closest('[data-vcp-row]');if(!row)return;const i=Number(row.dataset.vcpRow),p=draftPresentations[i];if(!p)return;if(e.target.matches('[data-vcp-name]'))p.name=e.target.value;if(e.target.matches('[data-vcp-units]'))p.units=e.target.value;if(e.target.matches('[data-vcp-price]'))p.price=e.target.value;};
    wrap.onclick=e=>{const b=e.target.closest('[data-vcp-remove]');if(!b)return;draftPresentations.splice(Number(b.dataset.vcpRemove),1);renderDraft();};
  }
  function readFormPricing(){
    return normalizePricing({
      wholesaleEnabled:$('vCommercialWholesaleEnabled')?.checked,
      wholesaleMinQty:$('vCommercialWholesaleMin')?.value,
      wholesalePrice:$('vCommercialWholesalePrice')?.value,
      promoEnabled:$('vCommercialPromoEnabled')?.checked,
      promoType:$('vCommercialPromoType')?.value,
      promoValue:$('vCommercialPromoValue')?.value,
      promoName:$('vCommercialPromoName')?.value,
      promoStart:$('vCommercialPromoStart')?.value,
      promoEnd:$('vCommercialPromoEnd')?.value
    });
  }
  function readFormPresentations(){
    const usedNames=new Set(),usedIds=new Set(),out=[];
    for(let i=0;i<draftPresentations.length;i++){
      const raw=draftPresentations[i],name=String(raw.name||'').trim(),units=Math.floor(Number(raw.units)||0),price=Number(raw.price)||0;
      if(!name&&!units&&!price)continue;
      if(!name)throw new Error('Escribe el nombre de la presentación '+(i+1)+'.');
      if(units<=0)throw new Error('Escribe cuántas unidades contiene "'+name+'".');
      if(price<=0)throw new Error('Escribe el precio de venta de "'+name+'".');
      const nk=name.toLowerCase();if(usedNames.has(nk))throw new Error('La presentación "'+name+'" está repetida.');usedNames.add(nk);
      let id=slug(raw.id||name),n=2;while(usedIds.has(id))id=slug(name)+'_'+n++;usedIds.add(id);
      out.push({id,name,units,price:round2(price),active:true});
    }
    return out;
  }
  function validate(pricing,pres){
    if(pricing.wholesaleEnabled&&!(pricing.wholesalePrice>0))return 'Escribe el precio mayorista por unidad.';
    if(pricing.wholesaleEnabled&&pricing.wholesaleMinQty<2)return 'El precio mayorista debe empezar desde 2 unidades o más.';
    if(pricing.promoEnabled&&!(pricing.promoValue>0))return 'Escribe el descuento de la promoción.';
    if(pricing.promoEnabled&&pricing.promoType==='percent'&&pricing.promoValue>100)return 'El descuento porcentual no puede superar 100%.';
    if(pricing.promoEnabled&&pricing.promoStart&&pricing.promoEnd&&pricing.promoEnd<pricing.promoStart)return 'La fecha final de la promoción no puede ser anterior a la inicial.';
    return '';
  }
  function fillForm(p){
    if(!ensureProductBox())return;
    draftPresentations=presentationsFor(p).map(x=>({...x}));renderDraft();
    const c=pricingFor(p);
    $('vCommercialWholesaleEnabled').checked=!!c.wholesaleEnabled;$('vCommercialWholesaleMin').value=c.wholesaleMinQty||12;$('vCommercialWholesalePrice').value=c.wholesalePrice||'';
    $('vCommercialPromoEnabled').checked=!!c.promoEnabled;$('vCommercialPromoType').value=c.promoType||'percent';$('vCommercialPromoValue').value=c.promoValue||'';$('vCommercialPromoName').value=c.promoName||'Promoción';$('vCommercialPromoStart').value=c.promoStart||'';$('vCommercialPromoEnd').value=c.promoEnd||'';
    toggleConfig();refreshEligibility();
  }
  function resetForm(){
    if(!ensureProductBox())return;draftPresentations=[];renderDraft();
    $('vCommercialWholesaleEnabled').checked=false;$('vCommercialWholesaleMin').value=12;$('vCommercialWholesalePrice').value='';
    $('vCommercialPromoEnabled').checked=false;$('vCommercialPromoType').value='percent';$('vCommercialPromoValue').value='';$('vCommercialPromoName').value='Promoción';$('vCommercialPromoStart').value='';$('vCommercialPromoEnd').value='';toggleConfig();refreshEligibility();
  }

  function bindForm(){
    if(!ensureProductBox())return false;
    const form=$('productForm');if(!form||form.dataset.vcpBound==='1')return !!form;
    form.dataset.vcpBound='1';
    form.addEventListener('submit',e=>{
      if($('vCommercialPricingBox')?.style.display==='none')return;
      let pres,pricing;
      try{pres=readFormPresentations();pricing=readFormPricing()}catch(err){e.preventDefault();e.stopImmediatePropagation();toast(err.message||String(err),'warn');return}
      const problem=validate(pricing,pres);if(problem){e.preventDefault();e.stopImmediatePropagation();toast(problem,'warn');return}
      const pending={id:String($('productId')?.value||''),barcode:String($('barcode')?.value||'').trim(),name:String($('productName')?.value||'').trim(),pres,pricing};
      let tries=0;
      const apply=async()=>{
        tries++;const ps=productsList();let p=(pending.id&&ps.find(x=>String(x.id)===pending.id))||(pending.barcode&&ps.find(x=>String(x.barcode||'')===pending.barcode))||ps.find(x=>String(x.name||'').trim()===pending.name);
        if(!p){if(tries<100)return setTimeout(apply,100);toast('No se pudieron guardar las presentaciones. Vuelve a abrir el producto.','warn');return}
        p.salePresentations=pending.pres.map(x=>({...x}));p.advancedPricing=normalizePricing(pending.pricing);
        try{if(typeof save==='function')save()}catch{}
        try{if(typeof window.vareliaSyncProduct==='function')await window.vareliaSyncProduct(p);else if(typeof window.syncProductToCloud==='function')await window.syncProductToCloud(p)}catch(err){console.error(err);toast('Producto guardado localmente; falta sincronizar sus presentaciones.','warn')}
      };
      setTimeout(apply,80);
    },true);
    document.addEventListener('click',e=>{
      if(e.target.closest?.('[data-edit]'))setTimeout(()=>{const id=String($('productId')?.value||'');const p=productsList().find(x=>String(x.id)===id);if(p)fillForm(p)},60);
      if(e.target.closest?.('#newProduct'))setTimeout(resetForm,50);
    },true);
    $('unit')?.addEventListener('change',refreshEligibility);$('productCategory')?.addEventListener('change',refreshEligibility);$('vMedicineToggle')?.addEventListener('change',refreshEligibility);
    return true;
  }

  function quoteOption(p,kind,ref,qty){
    const c=pricingFor(p),n=Math.max(1,Math.floor(Number(qty)||1));
    let base=Math.max(0,Number(p.sellPrice)||0),units=1,label=String(p.unit||'Unidad'),presentationId='',minimum=1,pricingMode='unit';
    if(kind==='presentation'){
      const pres=presentationsFor(p).find(x=>x.id===ref&&x.active);if(!pres)return null;base=pres.price;units=pres.units;label=pres.name;presentationId=pres.id;pricingMode='presentation';
    }else if(kind==='wholesale'){
      base=c.wholesalePrice;units=1;label='Mayorista';minimum=c.wholesaleMinQty;pricingMode='wholesale';
    }
    const pl=promoLabel(c),price=applyPromo(base,c);
    return {kind,price,basePrice:round2(base),units,label,presentationId,minimum,pricingMode,promoLabel:pl,qty:n};
  }

  function ensurePicker(){
    let layer=$('vCommercialSalePicker');if(layer)return layer;
    layer=document.createElement('div');layer.id='vCommercialSalePicker';layer.style.cssText='display:none;position:fixed;inset:0;z-index:100700;background:rgba(15,23,42,.58);padding:16px;align-items:center;justify-content:center';
    layer.innerHTML=`<div style="width:min(95vw,540px);max-height:90vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;padding:20px;box-shadow:0 24px 80px rgba(0,0,0,.28)">
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:start"><div><h3 id="vCommercialSaleName" style="margin:0;font-size:23px"></h3><div id="vCommercialSaleStock" class="meta"></div></div><button type="button" id="vCommercialSaleClose" style="border:0;background:transparent;color:inherit;font-size:31px">×</button></div>
      <div style="margin-top:15px;font-weight:900;font-size:17px">Selecciona cómo vender</div>
      <div id="vCommercialSaleModes" style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0 16px"></div>
      <label><span id="vCommercialQtyLabel">Cantidad</span><input id="vCommercialSaleQty" type="number" min="1" step="1" inputmode="numeric" value="1"></label>
      <div id="vCommercialSaleQuote" style="margin:14px 0;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--bg)"></div>
      <button type="button" id="vCommercialSaleAdd" class="btn primary" style="width:100%;font-size:18px">Agregar a la venta</button>
    </div>`;
    document.body.appendChild(layer);layer.querySelector('#vCommercialSaleClose').onclick=()=>closePicker();layer.addEventListener('click',e=>{if(e.target===layer)closePicker()});return layer;
  }
  let pickerState=null,previousAdd=null;
  function closePicker(){const l=$('vCommercialSalePicker');if(l)l.style.display='none';pickerState=null}
  function openPicker(p,qty=1){
    if(!hasCommercialOptions(p))return false;
    const layer=ensurePicker(),pres=presentationsFor(p).filter(x=>x.active),c=pricingFor(p);
    const options=[{key:'unit',kind:'unit',ref:'',label:p.unit||'Unidad'},...pres.map(x=>({key:'presentation:'+x.id,kind:'presentation',ref:x.id,label:x.name})),...(c.wholesaleEnabled?[{key:'wholesale',kind:'wholesale',ref:'',label:'Mayorista'}]:[])];
    pickerState={p,options,selected:options[0]};
    $('vCommercialSaleName').textContent=p.name||'Producto';$('vCommercialSaleStock').textContent=`Stock disponible: ${Number(p.stock||0)} ${p.unit||'unidades'}`;
    $('vCommercialSaleModes').innerHTML=options.map((o,i)=>`<button type="button" class="btn ${i===0?'primary':'secondary'}" data-vcp-mode="${esc(o.key)}">${esc(o.label)}</button>`).join('');
    const input=$('vCommercialSaleQty');input.value=Math.max(1,Math.floor(Number(qty)||1));
    const draw=()=>{
      if(!pickerState)return;const o=pickerState.selected,n=Math.max(1,Math.floor(Number(input.value)||1)),r=quoteOption(p,o.kind,o.ref,n);if(!r)return;
      const needed=n*r.units,minimumOk=o.kind!=='wholesale'||n>=r.minimum,stockOk=needed<=Number(p.stock||0),ok=minimumOk&&stockOk;
      $('vCommercialQtyLabel').textContent=o.kind==='presentation'?`Cantidad de ${r.label}`:o.kind==='wholesale'?'Cantidad mayorista':'Cantidad';
      $('vCommercialSaleQuote').innerHTML=`<div style="display:flex;justify-content:space-between;gap:12px"><span>Precio aplicado</span><b>${money(r.price)} / ${esc(r.label.toLowerCase())}</b></div>${o.kind==='presentation'?`<div class="meta" style="margin-top:6px">📦 1 ${esc(r.label)} = ${r.units} ${esc(p.unit||'unidades')}</div>`:''}${o.kind==='wholesale'?`<div class="meta" style="margin-top:6px">🏷️ Mayorista desde ${r.minimum} ${esc(p.unit||'unidades')}</div>`:''}${r.promoLabel?`<div class="meta" style="margin-top:6px;color:var(--p);font-weight:850">🎁 ${esc(r.promoLabel)}</div>`:''}<div style="display:flex;justify-content:space-between;gap:12px;margin-top:9px;padding-top:9px;border-top:1px solid var(--line)"><b>Total</b><b style="color:var(--p)">${money(r.price*n)}</b></div><div class="meta" style="margin-top:6px">Stock que saldrá: ${needed} ${esc(p.unit||'unidades')}</div>${!minimumOk?`<div style="margin-top:8px;color:#b45309;font-weight:900">El precio mayorista aplica desde ${r.minimum} unidades.</div>`:''}${!stockOk?'<div style="margin-top:8px;color:#b91c1c;font-weight:900">Stock insuficiente.</div>':''}`;
      const add=$('vCommercialSaleAdd');add.disabled=!ok;add.style.opacity=ok?'1':'.55';
      document.querySelectorAll('#vCommercialSaleModes [data-vcp-mode]').forEach(b=>{const on=b.dataset.vcpMode===o.key;b.classList.toggle('primary',on);b.classList.toggle('secondary',!on)});
    };
    $('vCommercialSaleModes').onclick=e=>{const b=e.target.closest('[data-vcp-mode]');if(!b||!pickerState)return;const o=pickerState.options.find(x=>x.key===b.dataset.vcpMode);if(!o)return;pickerState.selected=o;if(o.kind==='wholesale'&&Number(input.value)<c.wholesaleMinQty)input.value=c.wholesaleMinQty;draw()};
    input.oninput=draw;
    $('vCommercialSaleAdd').onclick=()=>{
      if(!pickerState)return;const o=pickerState.selected,n=Math.max(1,Math.floor(Number(input.value)||1)),r=quoteOption(p,o.kind,o.ref,n);if(!r)return;const needed=n*r.units;if((o.kind==='wholesale'&&n<r.minimum)||needed>Number(p.stock||0))return draw();
      const prepared={...p,__commercialPrepared:true,__advancedPrepared:true,medicine:false,selectionLabel:r.label+(r.promoLabel?' · '+r.promoLabel:''),sellPrice:r.price,medicineMultiplier:r.units,medicineSaleUnit:'',advancedServerSaleUnit:'',unit:o.kind==='presentation'?r.label:p.unit};
      closePicker();try{if(typeof openSale==='function')openSale(false);else window.openSale?.(false)}catch{}
      const add=previousAdd||window.addToCart;add.call(window,prepared,n);
      try{const list=cartList(),item=[...list].reverse().find(x=>String(x.id)===String(p.id)&&String(x.selectionLabel||'').startsWith(r.label));if(item){item.originalPrice=r.basePrice;item.discountLabel=r.promoLabel||'';item.pricingMode=r.pricingMode;item.advancedPricingMode=r.pricingMode;item.salePresentationId=r.presentationId||'';item.presentationId=r.presentationId||'';item.salePresentationUnits=r.units;item.baseUnit=p.unit||'Unidad';item.advancedServerSaleUnit='';item.medicineSaleUnit='';item.medicine=false;item.medicineMultiplier=r.units;if(typeof persistSaleCart==='function')persistSaleCart();if(typeof renderCart==='function')renderCart();}}
      catch(err){console.warn('Varelia presentaciones de venta',err)}
    };
    draw();layer.style.display='flex';return true;
  }

  function installAdd(){
    const current=window.addToCart||(()=>{try{return addToCart}catch{return null}})();if(typeof current!=='function')return false;
    if(current.__vareliaCommercialV18)return true;previousAdd=current;
    const wrapped=function(p,qty=1){const live=liveProduct(p);if(!live||!hasCommercialOptions(live)||p?.__commercialPrepared)return previousAdd.apply(this,arguments);if(Array.isArray(live.characteristics)&&live.characteristics.length&&!p?.__characteristicsSelected)return previousAdd.apply(this,arguments);openPicker({...live,...p},qty)};
    wrapped.__vareliaCommercialV18=true;wrapped.__original=current;window.addToCart=wrapped;try{addToCart=wrapped}catch{}return true;
  }
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-add]');if(!b)return;const p=productsList().find(x=>String(x.id).trim()===String(b.dataset.add||'').trim());if(!p||!hasCommercialOptions(p))return;e.preventDefault();e.stopImmediatePropagation();installAdd();const add=window.addToCart||(()=>{try{return addToCart}catch{return null}})();if(typeof add==='function')add(p,1)},true);

  window.VareliaCommercialPresentations={normalizePricing,normalizePresentations,pricingFor,presentationsFor,hasCommercialOptions,promoActive,applyPromo};
  let tries=0;const timer=setInterval(()=>{tries++;bindForm();installAdd();refreshEligibility();if(tries>120)clearInterval(timer)},100);
  addEventListener('pageshow',()=>{setTimeout(()=>{bindForm();installAdd();refreshEligibility()},30)});
})();
