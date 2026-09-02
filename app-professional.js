(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    document.addEventListener('submit',e=>{const form=e.target;if(!(form instanceof HTMLFormElement))return;const btn=form.querySelector('button[type="submit"],button:not([type])');if(!btn)return;if(btn.dataset.busy==='1'){e.preventDefault();return}btn.dataset.busy='1';const old=btn.textContent;btn.dataset.oldText=old;setTimeout(()=>{btn.dataset.busy='0';if(btn.dataset.oldText)btn.textContent=btn.dataset.oldText},900)},true);

    if(typeof window.addToCart==='function'&&!window.__vareliaCartGuard){
      window.__vareliaCartGuard=true;const original=window.addToCart;
      window.addToCart=function(p){if(!p)return;const current=(Array.isArray(window.cart)?window.cart:typeof cart!=='undefined'?cart:[]).find?.(x=>x.id===p.id);const inCart=+current?.qty||0;const available=+p.stock||0;if(available<=0)return alert('Este producto no tiene stock disponible.');if(inCart>=available)return alert('No puedes vender más de '+available+' '+(p.unit||'unidad')+'.');const r=original(p);window.vareliaSound?.('add');return r};
    }

    try{if(Array.isArray(products)){let changed=false;const seen=new Set();for(const p of products){p.name=String(p.name||'').trim()||'Producto sin nombre';p.stock=Math.max(0,Number(p.stock)||0);p.buyPrice=Math.max(0,Number(p.buyPrice)||0);p.sellPrice=Math.max(0,Number(p.sellPrice)||0);p.reorderLevel=Math.max(0,Math.floor(Number(p.reorderLevel)||0));p.barcode=String(p.barcode||'').trim();if(p.barcode){if(seen.has(p.barcode)){p.barcode='';changed=true}else seen.add(p.barcode)}}if(changed&&typeof save==='function')save()}}catch(e){console.warn(e)}

    const toast=document.createElement('div');toast.id='vareliaToast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.appendChild(toast);
    window.vareliaToast=(text,type='ok')=>{toast.textContent=text;toast.className='show '+type;clearTimeout(toast._t);toast._t=setTimeout(()=>toast.className='',2600)};

    let audioCtx=null;
    function ctx(){if(!audioCtx){const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;audioCtx=new C()}if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}
    function tone(freq,start,duration,volume=.08,type='sine'){const c=ctx();if(!c)return;const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+start);g.gain.setValueAtTime(0.0001,c.currentTime+start);g.gain.exponentialRampToValueAtTime(volume,c.currentTime+start+.012);g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+start+duration);o.connect(g);g.connect(c.destination);o.start(c.currentTime+start);o.stop(c.currentTime+start+duration+.02)}
    window.vareliaSound=(kind='verify')=>{try{if(kind==='scan'||kind==='verify'){tone(880,0,.09,.07,'square');tone(1320,.10,.13,.07,'square')}else if(kind==='add'){tone(660,0,.08,.06);tone(880,.08,.10,.065)}else if(kind==='sale'){tone(740,0,.08,.065);tone(988,.09,.09,.07);tone(1318,.19,.14,.075)}else if(kind==='error'){tone(260,0,.13,.06,'sawtooth');tone(210,.13,.18,.055,'sawtooth')}}catch(e){console.warn('Audio',e)}};
    const unlock=()=>{ctx();document.removeEventListener('pointerdown',unlock,true);document.removeEventListener('touchstart',unlock,true)};document.addEventListener('pointerdown',unlock,true);document.addEventListener('touchstart',unlock,true);

    window.addEventListener('error',e=>{console.error(e.error||e.message)});window.addEventListener('unhandledrejection',e=>{console.error('Unhandled promise',e.reason)});
    document.addEventListener('click',e=>{const del=e.target.closest('[data-delete],[data-delsupplier],[data-delcat]');if(!del)return;if(del.dataset.confirmed==='1'){delete del.dataset.confirmed;return}e.preventDefault();e.stopImmediatePropagation();if(confirm('¿Seguro que deseas eliminarlo? Esta acción no se puede deshacer.')){del.dataset.confirmed='1';del.click()}},true);
    const updateOnline=()=>{document.body.classList.toggle('is-offline',!navigator.onLine);if(!navigator.onLine)window.vareliaToast?.('Sin conexión. Los cambios locales se conservarán.','warn')};addEventListener('online',updateOnline);addEventListener('offline',updateOnline);updateOnline();
    try{if(Array.isArray(products)){products.forEach(p=>{if((+p.stock||0)<0)p.stock=0})}}catch{}

    const checkoutBtn=document.getElementById('checkout');if(checkoutBtn)checkoutBtn.addEventListener('click',()=>setTimeout(()=>window.vareliaSound?.('sale'),80));
    const invBtn=document.getElementById('applyInventory');if(invBtn)invBtn.addEventListener('click',()=>setTimeout(()=>window.vareliaSound?.('add'),80));

    if(!document.getElementById('vareliaBulkScan')){const s=document.createElement('script');s.id='vareliaBulkScan';s.src='bulk-scan.js?v=20260819-1';document.body.appendChild(s)}

    /* Load the approved dashboard after the existing app/auth boot sequence. */
    setTimeout(()=>{
      if(!document.getElementById('vareliaApprovedDashboardCss')){const l=document.createElement('link');l.id='vareliaApprovedDashboardCss';l.rel='stylesheet';l.href='dashboard-premium.css?v=20260902-5';document.head.appendChild(l)}
      if(!document.getElementById('vareliaApprovedDashboardJs')){const s=document.createElement('script');s.id='vareliaApprovedDashboardJs';s.src='dashboard-premium.js?v=20260902-5';document.body.appendChild(s)}
    },1500);
  })
})();