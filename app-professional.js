(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    // Prevent accidental duplicate submissions.
    document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;const btn=form.querySelector('button[type="submit"],button:not([type])');if(!btn)return;if(btn.dataset.busy==='1'){e.preventDefault();return}btn.dataset.busy='1';const old=btn.textContent;btn.dataset.oldText=old;setTimeout(()=>{btn.dataset.busy='0';if(btn.dataset.oldText)btn.textContent=btn.dataset.oldText},900)},true);

    // Safer cart logic: never exceed available stock.
    if(typeof window.addToCart==='function'&&!window.__vareliaCartGuard){
      window.__vareliaCartGuard=true;const original=window.addToCart;
      window.addToCart=function(p){if(!p)return;const current=(Array.isArray(window.cart)?window.cart:typeof cart!=='undefined'?cart:[]).find?.(x=>x.id===p.id);const inCart=+current?.qty||0;const available=+p.stock||0;if(available<=0)return alert('Este producto no tiene stock disponible.');if(inCart>=available)return alert('No puedes vender más de '+available+' '+(p.unit||'unidad')+'.');return original(p)};
    }

    // Validate products and normalize common bad values.
    try{if(Array.isArray(products)){let changed=false;const seen=new Set();for(const p of products){p.name=String(p.name||'').trim()||'Producto sin nombre';p.stock=Math.max(0,Number(p.stock)||0);p.buyPrice=Math.max(0,Number(p.buyPrice)||0);p.sellPrice=Math.max(0,Number(p.sellPrice)||0);p.reorderLevel=Math.max(0,Math.floor(Number(p.reorderLevel)||0));p.barcode=String(p.barcode||'').trim();if(p.barcode){if(seen.has(p.barcode)){p.barcode='';changed=true}else seen.add(p.barcode)}}if(changed&&typeof save==='function')save()}}catch(e){console.warn(e)}

    // Global toast component for polished feedback.
    const toast=document.createElement('div');toast.id='vareliaToast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.appendChild(toast);
    window.vareliaToast=(text,type='ok')=>{toast.textContent=text;toast.className='show '+type;clearTimeout(toast._t);toast._t=setTimeout(()=>toast.className='',2600)};

    // Replace harsh browser errors where possible.
    window.addEventListener('error',e=>{console.error(e.error||e.message);});
    window.addEventListener('unhandledrejection',e=>{console.error('Unhandled promise',e.reason)});

    // Touch-friendly behavior and confirm destructive actions.
    document.addEventListener('click',e=>{const del=e.target.closest('[data-delete],[data-delsupplier],[data-delcat]');if(!del)return;if(del.dataset.confirmed==='1'){delete del.dataset.confirmed;return}e.preventDefault();e.stopImmediatePropagation();if(confirm('¿Seguro que deseas eliminarlo? Esta acción no se puede deshacer.')){del.dataset.confirmed='1';del.click()}},true);

    // Connectivity indicator.
    const updateOnline=()=>{document.body.classList.toggle('is-offline',!navigator.onLine);if(!navigator.onLine)window.vareliaToast?.('Sin conexión. Los cambios locales se conservarán.','warn')};
    addEventListener('online',updateOnline);addEventListener('offline',updateOnline);updateOnline();

    // Avoid negative stock after legacy data.
    try{if(Array.isArray(products)){products.forEach(p=>{if((+p.stock||0)<0)p.stock=0})}}catch{}
  })
})();