(()=>{
  if(window.__vareliaPremiumAdminOpenFix)return;
  window.__vareliaPremiumAdminOpenFix=true;
  const ADMIN_EMAIL='milagroslove.1693@gmail.com';

  async function authorized(){
    const sb=window.vareliaSupabase;if(!sb)return false;
    try{
      const {data:userData,error:userError}=await sb.auth.getUser();
      if(userError)return false;
      const user=userData?.user;
      if(!user||String(user.email||'').trim().toLowerCase()!==ADMIN_EMAIL)return false;
      const {data,error}=await sb.from('platform_admins').select('user_id').eq('user_id',user.id).maybeSingle();
      return !error&&!!data;
    }catch{return false}
  }

  async function openAdmin(){
    const ok=await authorized();
    if(!ok){
      document.querySelectorAll('.vpAdminModal.show').forEach(el=>el.classList.remove('show'));
      window.vareliaToast?.('Esta cuenta no tiene acceso de administración.','warn');
      return;
    }
    document.body?.classList.add('varelia-super-admin');
    const modal=document.querySelector('.vpAdminModal');
    if(!modal){
      window.vareliaToast?.('El panel todavía está cargando. Intenta de nuevo en un momento.','warn');
      return;
    }
    document.getElementById('sidebar')?.classList.remove('open','show');
    document.querySelector('.overlay')?.classList.remove('show');
    modal.classList.add('show');
    setTimeout(()=>modal.querySelector('.vpAdminRefresh')?.click(),80);
  }

  document.addEventListener('click',e=>{
    const btn=e.target.closest?.('.vpAdminNav');
    if(!btn)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    openAdmin();
  },true);

  window.vareliaOpenPremiumAdmin=openAdmin;
})();

// La APK limpia/desregistra Service Workers al arrancar, por lo que una corrección
// inyectada solo desde sw.js puede no ejecutarse en esa primera carga. Cargar el
// guard de variantes directamente desde un módulo que la app ya incluye siempre.
(()=>{
  if(window.__vareliaDirectVariantGuardLoaderV5)return;
  window.__vareliaDirectVariantGuardLoaderV5=true;
  let attempts=0;
  function load(){
    if(window.__vareliaVariantStockGuardV3)return;
    attempts++;
    if(!window.VareliaCharacteristics||typeof window.addToCart!=='function'||!document.getElementById('productForm')){
      if(attempts<160)setTimeout(load,100);
      return;
    }
    if(document.querySelector('script[data-varelia-variant-guard-direct]'))return;
    const s=document.createElement('script');
    s.src='/variant-stock-guard.js?v=20261015-direct-v5';
    s.async=false;
    s.dataset.vareliaVariantGuardDirect='1';
    s.onerror=()=>{s.remove();if(attempts<160)setTimeout(load,300)};
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(load,0),{once:true});
  else setTimeout(load,0);
})();

// En efectivo, si el cliente entrega menos que el total, mostrar el faltante
// en el bloque grande (no "Vuelto S/ 0.00") para que sea imposible confundirlo.
(()=>{
  if(window.__vareliaCashMissingDisplayFixV1)return;
  window.__vareliaCashMissingDisplayFixV1=true;

  const total=()=>{
    const shown=Number(String(document.getElementById('saleTotal')?.textContent||'').replace(/[^0-9.]/g,''));
    if(Number.isFinite(shown)&&shown>0)return shown;
    const pos=Number(String(document.getElementById('vposTotal')?.textContent||'').replace(/[^0-9.]/g,''));
    return Number.isFinite(pos)?pos:0;
  };

  function refresh(){
    const inp=document.getElementById('vpayReceived');
    if(!inp)return;
    const row=inp.parentElement?.querySelector('.vpayChange');
    const label=row?.querySelector('span');
    const out=row?.querySelector('strong');
    const msg=document.getElementById('vpayCashMsg');
    if(!label||!out)return;

    const received=Math.max(0,Number(inp.value)||0);
    const due=Math.max(0,total());
    if(received<due){
      const missing=due-received;
      label.textContent='Falta';
      out.textContent='S/ '+missing.toFixed(2);
      out.style.color='#b91c1c';
      if(msg){
        msg.textContent='Faltan S/ '+missing.toFixed(2)+' para completar el pago.';
        msg.style.color='#b91c1c';
        msg.style.fontWeight='800';
      }
    }else{
      const change=received-due;
      label.textContent='Vuelto';
      out.textContent='S/ '+Math.max(0,change).toFixed(2);
      out.style.color='var(--p)';
      if(msg){
        msg.textContent='';
        msg.style.color='var(--muted)';
        msg.style.fontWeight='';
      }
    }
  }

  const schedule=()=>setTimeout(refresh,0);
  document.addEventListener('input',e=>{if(e.target?.id==='vpayReceived')schedule()},true);
  document.addEventListener('change',e=>{if(e.target?.id==='vpayReceived')schedule()},true);
})();

// Mantener el modal de Reportes sincronizado mientras está abierto.
// reports-profit.js observa cambios de hijos para recalcular, pero su comprobación
// antigua del modal dependía de un id que no siempre existe en la vista móvil.
(()=>{
  if(window.__vareliaReportLiveRefreshV1)return;
  window.__vareliaReportLiveRefreshV1=true;

  const salesList=()=>{
    try{
      if(Array.isArray(window.sales))return window.sales;
      if(typeof sales!=='undefined'&&Array.isArray(sales))return sales;
    }catch{}
    return [];
  };

  const reportPanel=()=>{
    const titles=[...document.querySelectorAll('h1,h2,h3,h4')].filter(el=>/^(\s*📊\s*)?Reportes\s*$/i.test(String(el.textContent||'').trim()));
    for(const title of titles){
      for(let panel=title.parentElement,depth=0;panel&&panel!==document.body&&depth<9;panel=panel.parentElement,depth++){
        const text=String(panel.textContent||'');
        if(!text.includes('Productos más vendidos'))continue;
        const close=[...panel.querySelectorAll('button')].find(b=>String(b.textContent||'').trim()==='Cerrar');
        if(close)return panel;
      }
    }
    return null;
  };

  const signature=()=>{
    const list=salesList();
    const last=list[list.length-1]||{};
    let total=0;
    for(const s of list)total+=Number(s?.total)||0;
    let breakdown='';
    try{breakdown=JSON.stringify(last?.paymentBreakdown||last?.payment_breakdown||{})}catch{}
    return [list.length,total.toFixed(3),last?.id||last?.sale_id||'',last?.date||last?.created_at||'',last?.paymentMethod||last?.payment_method||'',breakdown,last?.status||last?.state||''].join('|');
  };

  let lastSignature='',lastPanel=null;
  const poke=()=>{
    const panel=reportPanel();
    if(!panel){lastPanel=null;lastSignature=signature();return}
    const sig=signature();
    if(panel===lastPanel&&sig===lastSignature)return;
    lastPanel=panel;lastSignature=sig;
    const marker=document.createElement('span');
    marker.hidden=true;
    marker.setAttribute('aria-hidden','true');
    marker.dataset.vareliaReportRefresh='1';
    panel.appendChild(marker);
    queueMicrotask(()=>marker.remove());
  };

  const burst=()=>[0,120,450,900,1500].forEach(ms=>setTimeout(()=>{lastSignature='';poke()},ms));
  window.addEventListener('varelia:sale-recorded',burst);
  window.addEventListener('focus',()=>{lastSignature='';poke()});
  window.addEventListener('pageshow',()=>{lastSignature='';poke()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){lastSignature='';poke()}});
  setInterval(()=>{if(document.visibilityState==='visible')poke()},350);
})();

// Cobro estable: el carrito visible es la fuente de verdad para cualquier producto.
// Si otro manejador vacía `cart` antes del cobro, se reconstruye automáticamente
// desde las filas visibles (incluidas talla/color) y se conserva hasta confirmar la venta.
(()=>{
  if(window.__vareliaCheckoutCartSnapshotFixV2)return;
  window.__vareliaCheckoutCartSnapshotFixV2=true;
  const KEY='varelia_scanner_cart_backup_v1';

  const cloneItem=x=>({
    ...x,
    id:x?.id??x?.productId,
    productId:x?.productId??x?.id,
    price:Number(x?.price??x?.sellPrice??0)||0,
    qty:Number(x?.qty??x?.quantity??0)||0,
    selectedCharacteristics:Array.isArray(x?.selectedCharacteristics)?x.selectedCharacteristics.map(y=>({...y})):[]
  });

  const rowItem=row=>{
    if(!row)return null;
    const p=row.p||{};
    const raw=row.item||{};
    const id=raw.id??raw.productId??p.id??row.key;
    const qty=Number(raw.qty??raw.quantity??row.qty??0)||0;
    if(id==null||qty<=0)return null;
    const selected=Array.isArray(raw.selectedCharacteristics)
      ?raw.selectedCharacteristics
      :(Array.isArray(row.selectedCharacteristics)?row.selectedCharacteristics:[]);
    return cloneItem({
      ...p,
      ...raw,
      id,
      productId:raw.productId??id,
      name:String(raw.name??row.name??p.name??'Producto'),
      price:Number(raw.price??raw.sellPrice??row.price??p.sellPrice??0)||0,
      qty,
      unit:raw.unit??p.unit??'Unidad',
      cartKey:String(raw.cartKey??row.key??id),
      selectedCharacteristics:selected,
      selectedCombination:raw.selectedCombination??row.selectedCombination??null,
      medicineSaleUnit:raw.medicineSaleUnit??row.medicineSaleUnit??'',
      medicineMultiplier:Number(raw.medicineMultiplier??row.medicineMultiplier??1)||1,
      saleType:raw.saleType??row.saleType??''
    });
  };

  const validItems=rows=>(Array.isArray(rows)?rows:[]).map(cloneItem).filter(x=>x.id!=null&&x.qty>0);

  function posRows(){
    try{
      const state=window.VareliaPOS?.sync?.();
      return (Array.isArray(state?.rows)?state.rows:[]).map(rowItem).filter(Boolean);
    }catch{}
    return [];
  }

  function savedItems(){
    try{return validItems(JSON.parse(localStorage.getItem(KEY)||'[]'))}catch{return[]}
  }

  function hasVisibleSale(){
    if(document.querySelector('#vposItems .vposRow'))return true;
    const total=Number(String(document.getElementById('vposTotal')?.textContent||'').replace(/[^0-9.]/g,''));
    return Number.isFinite(total)&&total>0;
  }

  function remember(items){
    items=validItems(items);
    if(!items.length)return false;
    try{localStorage.setItem(KEY,JSON.stringify(items));return true}catch{return false}
  }

  function patchPos(){
    const pos=window.VareliaPOS;
    if(!pos||pos.__vareliaCheckoutCartBridgeV2)return false;
    const original=typeof pos.getCartItems==='function'?pos.getCartItems.bind(pos):null;
    pos.getCartItems=()=>{
      let items=[];
      try{items=validItems(original?.()||[])}catch{}
      if(!items.length)items=posRows();
      if(!items.length&&hasVisibleSale())items=savedItems();
      if(items.length)remember(items);
      return items.map(x=>({...x}));
    };
    pos.__vareliaCheckoutCartBridgeV2=true;
    return true;
  }

  function visibleCart(includeSaved=true){
    try{
      if(typeof cart!=='undefined'&&Array.isArray(cart)&&cart.length){
        const items=validItems(cart);
        if(items.length)return items;
      }
    }catch{}
    patchPos();
    try{
      const items=validItems(window.VareliaPOS?.getCartItems?.()||[]);
      if(items.length)return items;
    }catch{}
    const rows=posRows();
    if(rows.length)return rows;
    return includeSaved&&hasVisibleSale()?savedItems():[];
  }

  function restoreCart(items){
    items=validItems(items);
    if(!items.length)return false;
    try{
      if(typeof cart!=='undefined'&&Array.isArray(cart)&&cart.length===0){
        cart.splice(0,cart.length,...items.map(x=>({...x})));
        try{if(typeof renderCart==='function')renderCart()}catch{}
        try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
      }
      return true;
    }catch{return false}
  }

  function syncBackup(){
    patchPos();
    const items=visibleCart(false);
    if(items.length){remember(items);return}
    if(!hasVisibleSale()){
      try{localStorage.removeItem(KEY)}catch{}
    }
  }

  document.addEventListener('click',e=>{
    const checkout=e.target?.closest?.('#vposCheckout,#checkout');
    if(checkout){
      const snapshot=visibleCart(true);
      if(snapshot.length){remember(snapshot);restoreCart(snapshot)}
      return;
    }
    if(e.target?.closest?.('#newSaleTop,#newSaleFab,#vposNew')){
      setTimeout(()=>{try{localStorage.removeItem(KEY)}catch{}},0);
    }
  },true);

  document.addEventListener('input',e=>{
    if(e.target?.matches?.('[data-pos-qty],[data-cart-qty]'))setTimeout(syncBackup,0);
  },true);
  document.addEventListener('change',e=>{
    if(e.target?.matches?.('[data-pos-qty],[data-cart-qty]'))setTimeout(syncBackup,0);
  },true);

  const observer=new MutationObserver(()=>setTimeout(syncBackup,0));
  const armObserver=()=>{
    const box=document.getElementById('vposItems');
    if(box&&!box.dataset.vareliaCheckoutObserved){
      box.dataset.vareliaCheckoutObserved='1';
      observer.observe(box,{childList:true,subtree:true,characterData:true});
    }
  };

  window.addEventListener('varelia:checkout-confirmed',()=>{
    setTimeout(()=>{
      try{localStorage.removeItem(KEY)}catch{}
      syncBackup();
    },500);
  });

  const boot=()=>{patchPos();armObserver();syncBackup()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0),{once:true});
  else setTimeout(boot,0);
  setInterval(()=>{patchPos();armObserver()},700);
})();

// Compatibilidad directa con el actualizador interno de Reportes.
(()=>{
  if(window.__vareliaReportModalCompatV2)return;
  window.__vareliaReportModalCompatV2=true;

  function findReportPanel(){
    const titles=[...document.querySelectorAll('h1,h2,h3,h4')].filter(el=>/^(\s*📊\s*)?Reportes\s*$/i.test(String(el.textContent||'').trim()));
    for(const title of titles){
      for(let panel=title.parentElement,depth=0;panel&&panel!==document.body&&depth<9;panel=panel.parentElement,depth++){
        const close=[...panel.querySelectorAll('button')].find(b=>String(b.textContent||'').trim()==='Cerrar');
        if(close&&(panel.querySelector('[data-report-synced]')||String(panel.textContent||'').includes('Productos más vendidos')))return panel;
      }
    }
    return null;
  }

  function arm(){
    const panel=findReportPanel();
    if(!panel)return null;
    const expected=document.getElementById('vareliaHistoryExtraModal');
    if(!expected)panel.id='vareliaHistoryExtraModal';
    else if(expected!==panel&&!/Reportes/i.test(String(expected.textContent||''))){
      expected.removeAttribute('id');
      panel.id='vareliaHistoryExtraModal';
    }
    return panel;
  }

  function poke(){
    const panel=arm();
    if(!panel)return;
    const marker=document.createElement('i');
    marker.hidden=true;
    marker.dataset.vareliaReportCompatRefresh='1';
    panel.appendChild(marker);
    queueMicrotask(()=>marker.remove());
  }

  const burst=()=>[0,80,220,500,900,1500].forEach(ms=>setTimeout(poke,ms));
  window.addEventListener('varelia:sale-recorded',burst);
  window.addEventListener('varelia:checkout-confirmed',burst);
  document.addEventListener('click',e=>{
    const text=String(e.target?.closest?.('button')?.textContent||'').trim().replace(/^[📊📅🗓️]\s*/u,'');
    if(text==='Reportes')setTimeout(burst,30);
  },true);
  new MutationObserver(()=>arm()).observe(document.body,{childList:true,subtree:true});
  setInterval(()=>{if(document.visibilityState==='visible')poke()},900);
  setTimeout(poke,300);
})();

// Los medicamentos usan su propio flujo (caja/blíster/pastilla). Nunca deben
// heredar Talla/Color/Marca del editor de productos normales.
(()=>{
  if(window.__vareliaMedicineVariantIsolationV1)return;
  window.__vareliaMedicineVariantIsolationV1=true;
  const medCat=v=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(v||'').trim());
  const obviousGoods=p=>/zapat|zapato|calzado|tenis|sandalia|ropa|polo|camis|blusa|pantal|short|vestido|falda|casaca|chompa|gorra|mochila|bolso/i.test(String(p?.name||'')+' '+String(p?.category||''));
  const isMedicine=p=>{
    if(!p||obviousGoods(p))return false;
    return !!p.medicine||medCat(p.category)||!!String(p.laboratory||p.medicinePresentation||p.batch||p.expiryDate||'').trim()||Number(p.medicineStockBoxes||0)>0;
  };
  const list=()=>{try{return Array.isArray(window.products)?window.products:(typeof products!=='undefined'&&Array.isArray(products)?products:[])}catch{return[]}};

  function patchCharacteristics(){
    const vc=window.VareliaCharacteristics;
    if(!vc)return false;
    if(typeof vc.select==='function'&&!vc.select.__medicineIsolation){
      const original=vc.select;
      const wrapped=function(p,cb){
        if(isMedicine(p)){
          return cb({...p,__characteristicsSelected:true,characteristics:[],variantCombinations:[],selectedCharacteristics:[],selectionLabel:'',selectedCombination:null});
        }
        return original.call(this,p,cb);
      };
      wrapped.__medicineIsolation=true;
      wrapped.__original=original;
      vc.select=wrapped;
    }
    if(typeof vc.readEditor==='function'&&!vc.readEditor.__medicineIsolation){
      const originalRead=vc.readEditor;
      const wrappedRead=function(){
        const toggle=document.getElementById('vMedicineToggle');
        const type=document.getElementById('vMedicineTypeSelect');
        if(toggle?.checked||type?.value==='medicine')return{characteristics:[],variantCombinations:[]};
        return originalRead.call(this);
      };
      wrappedRead.__medicineIsolation=true;
      wrappedRead.__original=originalRead;
      vc.readEditor=wrappedRead;
    }
    return true;
  }

  function repairMedicines(){
    const changed=[];
    for(const p of list()){
      if(!isMedicine(p))continue;
      let dirty=false;
      if(!p.medicine){p.medicine=true;dirty=true}
      if(Array.isArray(p.characteristics)&&p.characteristics.length){p.characteristics=[];dirty=true}
      if(Array.isArray(p.variantCombinations)&&p.variantCombinations.length){p.variantCombinations=[];dirty=true}
      if(dirty)changed.push(p);
    }
    if(!changed.length)return;
    try{if(typeof save==='function')save()}catch{}
    try{if(typeof render==='function')render()}catch{}
    changed.forEach(p=>{try{Promise.resolve(window.syncProductToCloud?.(p)).catch(()=>{})}catch{}});
  }

  const run=()=>{patchCharacteristics();repairMedicines()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(run,0),{once:true});
  else setTimeout(run,0);
  window.addEventListener('varelia:central-stock-updated',()=>setTimeout(run,80));
  window.addEventListener('varelia:forced-sync-complete',()=>setTimeout(run,80));
  setTimeout(run,1200);
})();

// Apariencia: paleta general separada del color de botones. Solo modifica esta pantalla.
(()=>{
  if(window.__vareliaAppearanceColorsV3)return;
  window.__vareliaAppearanceColorsV3=true;
  const KEY='varelia_action_button_color_v3';
  const DEFAULT='#2563eb';
  const valid=c=>/^#[0-9a-f]{6}$/i.test(String(c||'').trim());
  const saved=()=>{try{const c=localStorage.getItem(KEY);return valid(c)?c.toLowerCase():DEFAULT}catch{return DEFAULT}};
  const darker=(hex,delta=-24)=>{
    const n=parseInt(hex.slice(1),16);
    const r=Math.max(0,Math.min(255,(n>>16)+delta));
    const g=Math.max(0,Math.min(255,((n>>8)&255)+delta));
    const b=Math.max(0,Math.min(255,(n&255)+delta));
    return '#'+((r<<16)|(g<<8)|b).toString(16).padStart(6,'0');
  };

  function applyActionColor(color){
    const c=valid(color)?String(color).toLowerCase():DEFAULT;
    let style=document.getElementById('vareliaAppearanceColorsCss');
    if(!style){style=document.createElement('style');style.id='vareliaAppearanceColorsCss';document.head.appendChild(style)}
    style.textContent=`
      :root{--varelia-action:${c};--varelia-action-2:${darker(c)}}
      #appearance{display:none}
      #appearance.active{display:block}
      #appearance .appearanceHero,#appearance .vareliaColorCard,#appearance .vareliaBackgroundCard{margin-bottom:16px}
      #appearance .vareliaColorCard,#appearance .vareliaBackgroundCard{background:var(--card);border:1px solid var(--line);border-radius:22px;padding:18px;box-shadow:var(--shadow)}
      #appearance .vareliaStep{display:inline-flex;align-items:center;gap:6px;margin-bottom:8px;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--p) 9%,var(--card));color:var(--p);font-size:11px;font-weight:900}
      #appearance .vareliaColorCard .colorPickerBox{margin-top:12px}
      #appearance .appearanceOptions{display:block!important}
      #appearance .appearanceOptions>.optionCard{margin:0}
      html body button.primary,html body .btn.primary,html body .primary,
      html body #newProduct,html body #inventoryNewProduct,html body #newSaleTop,html body #newSaleFab,
      html body #businessBrandSave,html body #vposCheckout,html body #checkout,html body #applyCustomColor,html body .vcsOk,
      html body .chip.active,html body .segmented button.active,
      html body #vmobileNav button.active,html body .vmobileNav button.active,html body .mobileNav button.active{
        background-color:var(--varelia-action)!important;
        background-image:linear-gradient(135deg,var(--varelia-action),var(--varelia-action-2))!important;
        color:#fff!important;border-color:var(--varelia-action)!important;
      }
      @media(max-width:700px){#appearance .appearanceHero,#appearance .vareliaColorCard,#appearance .vareliaBackgroundCard{border-radius:20px;padding:16px}}
    `;
  }

  function pickerColor(){
    let c=String(document.getElementById('customColor')?.value||'').trim();
    if(c&&!c.startsWith('#'))c='#'+c;
    return valid(c)?c.toLowerCase():null;
  }

  function syncPicker(color){
    const c=valid(color)?String(color).toLowerCase():saved();
    try{if(typeof syncWheelFromHex==='function')syncWheelFromHex(c)}catch{}
    const input=document.getElementById('customColor');if(input)input.value=c.toUpperCase();
    const a=document.getElementById('hexPreview');if(a)a.style.background=c;
    const b=document.getElementById('colorBigPreview');if(b)b.style.background=c;
  }

  function previewPicker(){
    const c=pickerColor();
    if(c)applyActionColor(c);
  }

  function savePicker(showToast=true){
    const c=pickerColor();
    if(!c)return false;
    try{localStorage.setItem(KEY,c)}catch{}
    applyActionColor(c);
    if(showToast)window.vareliaToast?.('Color de botones actualizado.','ok');
    return true;
  }

  function orderAppearance(){
    const view=document.getElementById('appearance');if(!view)return;
    const hero=view.querySelector('.appearanceHero');
    const options=view.querySelector('.appearanceOptions');
    if(!hero||!options)return;

    if(!hero.querySelector('.vareliaStep')){
      const step=document.createElement('div');step.className='vareliaStep';step.textContent='1 · Paleta general';
      hero.insertBefore(step,hero.firstChild);
      const note=hero.querySelector('.notice');if(note)note.textContent='Cambia fondos, tarjetas, detalles y colores secundarios de Varelia.';
    }

    const cards=[...options.querySelectorAll('.optionCard')];
    const custom=cards.find(card=>/Color personalizado|Color de botones/i.test(String(card.querySelector('strong')?.textContent||'')));
    const background=cards.find(card=>/Fondo de la app/i.test(String(card.querySelector('strong')?.textContent||'')));

    if(custom&&!custom.classList.contains('vareliaColorCard')){
      custom.classList.add('vareliaColorCard');
      const title=custom.querySelector('strong');if(title)title.textContent='🎯 Color de botones';
      const note=custom.querySelector('.notice');if(note)note.textContent='Toca o desliza la rueda: los botones cambian al instante. La paleta general no cambia.';
      const step=document.createElement('div');step.className='vareliaStep';step.textContent='2 · Botones';
      custom.insertBefore(step,custom.firstChild);
      hero.insertAdjacentElement('afterend',custom);
    }

    if(background&&!background.classList.contains('vareliaBackgroundCard')){
      background.classList.add('vareliaBackgroundCard');
      const step=document.createElement('div');step.className='vareliaStep';step.textContent='3 · Fondo';
      background.insertBefore(step,background.firstChild);
    }
  }

  function wirePicker(){
    const apply=document.getElementById('applyCustomColor');
    const reset=document.getElementById('resetPicker');
    const wheel=document.getElementById('colorWheel');
    const slider=document.getElementById('lightSlider');
    const input=document.getElementById('customColor');
    const themeGrid=document.getElementById('themeGrid');

    if(apply&&!apply.dataset.vareliaButtonsWired){
      apply.dataset.vareliaButtonsWired='1';
      apply.onclick=e=>{
        e.preventDefault();
        if(!savePicker(true))alert('Elige un color válido.');
      };
    }
    if(reset&&!reset.dataset.vareliaButtonsWired){
      reset.dataset.vareliaButtonsWired='1';
      reset.onclick=e=>{
        e.preventDefault();
        try{localStorage.removeItem(KEY)}catch{}
        applyActionColor(DEFAULT);syncPicker(DEFAULT);
        window.vareliaToast?.('Color de botones restablecido.','ok');
      };
    }
    if(wheel&&!wheel.dataset.vareliaButtonsWired){
      wheel.dataset.vareliaButtonsWired='1';
      const live=()=>requestAnimationFrame(previewPicker);
      wheel.addEventListener('pointerdown',live);
      wheel.addEventListener('pointermove',live);
      wheel.addEventListener('pointerup',()=>setTimeout(()=>savePicker(false),0));
      wheel.addEventListener('pointercancel',()=>setTimeout(()=>savePicker(false),0));
    }
    if(slider&&!slider.dataset.vareliaButtonsWired){
      slider.dataset.vareliaButtonsWired='1';
      slider.addEventListener('input',()=>setTimeout(previewPicker,0));
      slider.addEventListener('change',()=>setTimeout(()=>savePicker(false),0));
    }
    if(input&&!input.dataset.vareliaButtonsWired){
      input.dataset.vareliaButtonsWired='1';
      input.addEventListener('input',()=>setTimeout(previewPicker,0));
      input.addEventListener('change',()=>setTimeout(()=>savePicker(false),0));
    }
    if(themeGrid&&!themeGrid.dataset.vareliaButtonsWired){
      themeGrid.dataset.vareliaButtonsWired='1';
      themeGrid.addEventListener('click',()=>setTimeout(()=>syncPicker(saved()),0));
    }
  }

  const boot=()=>{orderAppearance();applyActionColor(saved());syncPicker(saved());wirePicker()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  document.addEventListener('click',e=>{
    const nav=e.target?.closest?.('[data-view="appearance"],button');
    if(nav&&/Apariencia/i.test(String(nav.textContent||'')))setTimeout(()=>{orderAppearance();wirePicker();syncPicker(saved())},0);
  },true);
})();