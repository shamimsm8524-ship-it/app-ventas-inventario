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

// En algunos WebView, al pulsar el botón grande de Cobrar, otro manejador puede
// vaciar el arreglo global antes de que central-stock-sync.js lea el carrito.
// Guardar una copia JUSTO al pulsar Cobrar permite que el flujo central recupere
// exactamente los productos que todavía están visibles en pantalla.
(()=>{
  if(window.__vareliaCheckoutCartSnapshotFixV1)return;
  window.__vareliaCheckoutCartSnapshotFixV1=true;
  const KEY='varelia_scanner_cart_backup_v1';

  const cloneItem=x=>({
    ...x,
    id:x?.id??x?.productId,
    price:Number(x?.price??x?.sellPrice??0)||0,
    qty:Number(x?.qty??x?.quantity??0)||0,
    selectedCharacteristics:Array.isArray(x?.selectedCharacteristics)?x.selectedCharacteristics.map(y=>({...y})):[]
  });

  function visibleCart(){
    try{
      if(typeof cart!=='undefined'&&Array.isArray(cart)&&cart.length)return cart.map(cloneItem).filter(x=>x.id!=null&&x.qty>0);
    }catch{}
    try{
      const rows=window.VareliaPOS?.getCartItems?.();
      if(Array.isArray(rows)&&rows.length)return rows.map(cloneItem).filter(x=>x.id!=null&&x.qty>0);
    }catch{}
    return [];
  }

  document.addEventListener('click',e=>{
    if(!e.target?.closest?.('#vposCheckout'))return;
    const snapshot=visibleCart();
    if(!snapshot.length)return;
    let raw='';
    try{
      raw=JSON.stringify(snapshot);
      localStorage.setItem(KEY,raw);
    }catch{return}
    // centralCheckout copia este respaldo de forma síncrona al comenzar. Luego se
    // elimina para que nunca pueda reutilizarse en una venta posterior vacía.
    setTimeout(()=>{
      try{if(localStorage.getItem(KEY)===raw)localStorage.removeItem(KEY)}catch{}
    },3000);
  },true);
})();