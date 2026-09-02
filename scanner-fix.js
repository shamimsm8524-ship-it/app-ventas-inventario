(()=>{
  if(window.__vareliaScannerInitialized)return;
  window.__vareliaScannerInitialized=true;
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    let scanner=null,target='inventory',opening=false,finishing=false;
    const productBtn=document.getElementById('scanForProduct'),inventoryBtn=document.getElementById('scanForInventory'),saleBtn=document.getElementById('scanForSale'),dialog=document.getElementById('scannerDialog'),closeBtn=document.getElementById('closeScanner');
    if(!dialog||(!productBtn&&!inventoryBtn&&!saleBtn))return;

    const posStyle=document.createElement('style');
    posStyle.textContent=`
      #saleDialog .cartitem.posCartRow{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:12px;align-items:center;padding:12px 0}
      .posCartName{min-width:0}.posCartName b{display:block;font-size:14px}.posCartName small{display:block;color:var(--muted);margin-top:3px}
      .posCartQty{min-width:52px;text-align:center;font-weight:900;padding:7px 9px;border-radius:10px;background:var(--bg)}
      .posCartMoney{text-align:right;white-space:nowrap}.posCartMoney small{display:block;color:var(--muted);font-size:11px}.posCartMoney b{display:block;font-size:15px;color:var(--p)}
      .posScanHint{margin:0 0 12px;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--p) 7%,var(--card));border:1px solid color-mix(in srgb,var(--p) 20%,var(--line));font-size:12px;color:var(--muted)}
      .posScanHint b{color:var(--ink)}
      @media(max-width:560px){#saleDialog .cartitem.posCartRow{grid-template-columns:minmax(0,1fr) auto}.posCartMoney{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;text-align:left;border-top:1px dashed var(--line);padding-top:7px}.posCartMoney small,.posCartMoney b{display:inline}}
    `;
    document.head.appendChild(posStyle);

    const saleDialog=document.getElementById('saleDialog'),saleSearch=document.getElementById('saleSearch'),cartEl=document.getElementById('cart');
    if(saleDialog&&!document.getElementById('posScanHint')){
      const hint=document.createElement('div');hint.id='posScanHint';hint.className='posScanHint';hint.innerHTML='<b>Modo caja rápida:</b> escanea un producto y se agregará automáticamente. Si vuelves a escanear el mismo producto, aumentará la cantidad.';
      const results=document.getElementById('saleResults');(results||cartEl)?.before(hint);
    }

    function productByName(name){try{return products.find(p=>String(p.name||'').trim().toLowerCase()===String(name||'').trim().toLowerCase())||null}catch{return null}}
    function enhanceCart(){
      if(!cartEl)return;
      cartEl.querySelectorAll('.cartitem').forEach(row=>{
        if(row.classList.contains('posCartRow'))return;
        const name=(row.querySelector('span')?.textContent||'').trim();
        const qty=Math.max(1,parseInt(row.querySelector('strong')?.textContent||'1')||1);
        const p=productByName(name);if(!p)return;
        const price=Number(p.sellPrice||0),sub=price*qty;
        row.classList.add('posCartRow');
        row.innerHTML=`<div class="posCartName"><b>${esc(name)}</b><small>Precio unitario: S/ ${price.toFixed(2)}</small></div><div class="posCartQty">x${qty}</div><div class="posCartMoney"><small>Subtotal</small><b>S/ ${sub.toFixed(2)}</b></div>`;
      });
      const checkout=document.getElementById('checkout');if(checkout&&!checkout.dataset.posNamed){checkout.dataset.posNamed='1';checkout.textContent='💳 Cobrar venta'}
    }
    if(cartEl){new MutationObserver(()=>requestAnimationFrame(enhanceCart)).observe(cartEl,{childList:true,subtree:true});setTimeout(enhanceCart,300)}

    const modal=dialog.querySelector('.modal');
    if(modal&&!document.getElementById('vareliaReader')){
      const oldVideo=document.getElementById('scannerVideo');if(oldVideo)oldVideo.style.display='none';
      const info=document.createElement('div');info.id='scannerInfo';info.className='scannerInfo';info.textContent='Apunta la cámara al código de barras. La lectura será automática.';
      const reader=document.createElement('div');reader.id='vareliaReader';reader.className='vareliaReader';
      const manual=document.createElement('div');manual.className='scannerManual';manual.innerHTML='<input id="scannerManualCode" inputmode="numeric" placeholder="O escribe el código"><button type="button" class="btn primary" id="scannerUseManual">Usar</button>';
      const result=document.createElement('div');result.id='scannerProductResult';result.className='scannerProductResult';result.hidden=true;
      modal.append(info,reader,manual,result);
      document.getElementById('scannerUseManual').onclick=()=>{const v=document.getElementById('scannerManualCode').value.trim();if(v)finish(v)};
    }
    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
    function norm(v){return String(v??'').trim().replace(/[^0-9A-Za-z]/g,'').toUpperCase()}
    function digits(v){return String(v??'').replace(/\D/g,'')}
    function equivalent(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;if(a===b)return true;const ad=digits(a),bd=digits(b);if(ad&&bd){if(ad===bd)return true;if(ad.replace(/^0+/,'')===bd.replace(/^0+/,''))return true;if(ad.length>=12&&bd.length>=12&&ad.slice(-12)===bd.slice(-12))return true}return false}
    function loadLib(){return new Promise((resolve,reject)=>{if(window.Html5Qrcode)return resolve();let existing=document.querySelector('script[data-varelia-html5qrcode]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.dataset.vareliaHtml5qrcode='1';s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
    function allStoredProducts(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!/product/i.test(k))continue;let v;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch{continue}if(Array.isArray(v))v.forEach(x=>{if(x&&typeof x==='object'&&('barcode'in x||'name'in x))out.push(x)})}}catch{}return out}
    function findProduct(code){const pools=[];try{if(Array.isArray(products))pools.push(...products)}catch{}pools.push(...allStoredProducts());const found=pools.find(x=>equivalent(x?.barcode,code));if(!found)return null;try{const live=products.find(x=>String(x.id)===String(found.id))||products.find(x=>equivalent(x.barcode,code));return live||found}catch{return found}}
    function persistProducts(){try{if(typeof save==='function')save();else if(typeof K!=='undefined'&&K.products)localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})))}catch(e){console.warn(e)}}
    function selectedInventoryProduct(){try{return inventoryProductId?products.find(x=>String(x.id)===String(inventoryProductId))||null:null}catch{return null}}
    function resetUI(){const r=document.getElementById('vareliaReader'),res=document.getElementById('scannerProductResult'),manual=document.querySelector('.scannerManual'),info=document.getElementById('scannerInfo');if(r){r.style.display='block';r.innerHTML=''}if(res){res.hidden=true;res.innerHTML=''}if(manual)manual.style.display='flex';if(info){info.style.display='block';info.textContent=target==='sale'?'Modo caja: escanea productos uno tras otro. Cada lectura se agrega a la venta.':'Apunta la cámara al código de barras. La lectura será automática.'}const m=document.getElementById('scannerManualCode');if(m)m.value=''}
    async function stopCamera(){const current=scanner;scanner=null;if(!current)return;try{const state=current.getState?.();if(state===2||state===3)await current.stop()}catch{}try{await current.clear()}catch{}await sleep(180)}
    async function closeScanner(){await stopCamera();try{if(dialog.open)dialog.close()}catch{}opening=false;finishing=false;resetUI()}
    async function cameraConfig(){try{const cams=await Html5Qrcode.getCameras();if(cams?.length){const back=cams.find(c=>/back|rear|environment|trasera|posterior/i.test(c.label||''))||cams[cams.length-1];if(back?.id)return back.id}}catch(e){console.warn('No se pudo listar cámaras',e)}return {facingMode:'environment'}}
    async function startCamera(){const reader=document.getElementById('vareliaReader');reader.innerHTML='';reader.style.display='block';scanner=new Html5Qrcode('vareliaReader');const formats=[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE];const config={fps:10,qrbox:{width:280,height:145},formatsToSupport:formats,aspectRatio:1.777,disableFlip:false};const cam=await cameraConfig();try{return await scanner.start(cam,config,text=>finish(text),()=>{})}catch(first){console.warn('Primer intento de cámara falló',first);await stopCamera();scanner=new Html5Qrcode('vareliaReader');return await scanner.start({facingMode:'environment'},config,text=>finish(text),()=>{})}}
    async function openScanner(which){if(opening)return;target=which;opening=true;finishing=false;resetUI();try{if(!window.isSecureContext)throw new Error('HTTPS_REQUIRED');if(!navigator.mediaDevices?.getUserMedia)throw new Error('CAMERA_UNSUPPORTED');await loadLib();await stopCamera();if(!dialog.open)dialog.showModal();await sleep(160);await startCamera()}catch(e){console.error('Scanner',e);await stopCamera();try{if(dialog.open)dialog.close()}catch{}const msg=String(e?.name||'')+' '+String(e?.message||e);window.vareliaSound?.('error');if(/NotAllowed|Permission|denied/i.test(msg))alert('Permite la cámara en Chrome para poder escanear.');else if(/NotFound|DevicesNotFound/i.test(msg))alert('No se encontró una cámara disponible en este equipo.');else if(/NotReadable|TrackStart|Could not start video source/i.test(msg))alert('La cámara está ocupada. Cierra otra app que use la cámara y vuelve a intentarlo.');else if(/HTTPS_REQUIRED/.test(msg))alert('Abre Varelia usando https:// para usar la cámara.');else alert('No se pudo iniciar la cámara. Vuelve a tocar Escanear.')}finally{opening=false}}
    function renderCard(p,code){const result=document.getElementById('scannerProductResult'),reader=document.getElementById('vareliaReader'),manual=document.querySelector('.scannerManual'),info=document.getElementById('scannerInfo');if(reader)reader.style.display='none';if(manual)manual.style.display='none';if(info)info.style.display='none';const img=p.image?`<img class="scanProductImg" src="${p.image}" alt="">`:'<div class="scanProductImg scanNoImg">Sin imagen</div>';result.innerHTML=`<div class="scanProductTop">${img}<div class="scanProductData"><div class="scanProductName">${esc(p.name||'Producto')}</div><div class="meta">Código: ${esc(code)}</div><div class="scanStock">Stock: <b>${Number(p.stock||0)} ${esc(p.unit||'Unidad')}</b></div><div class="scanPrice">S/ ${Number(p.sellPrice||0).toFixed(2)}</div></div></div><label class="scanQtyLabel">Cantidad<input id="scannerActionQty" type="number" min="1" step="1" value="1"></label><div class="scanActions"><button type="button" class="btn secondary" id="scannerIncrease">➕ Aumentar stock</button><button type="button" class="btn primary" id="scannerSell">🛒 Vender</button></div><button type="button" class="btn secondary scanAgain" id="scannerAgain">📷 Escanear otro producto</button>`;result.hidden=false;
      document.getElementById('scannerIncrease').onclick=()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1)),before=+p.stock||0;p.stock=before+q;persistProducts();window.vareliaSound?.('add');window.vareliaToast?.('Stock actualizado: +'+q,'ok');renderCard(p,code)};
      document.getElementById('scannerSell').onclick=async()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1));if((+p.stock||0)<q){window.vareliaSound?.('error');return alert('Stock insuficiente. Disponible: '+Number(p.stock||0))}await closeScanner();try{if(typeof openSale==='function'&&!saleDialog?.open)openSale();if(typeof addToCart==='function')addToCart(p,q);enhanceCart();window.vareliaSound?.('sale')}catch(e){console.error(e);window.vareliaSound?.('error');alert('No se pudo preparar la venta.')}};
      document.getElementById('scannerAgain').onclick=async()=>{await stopCamera();opening=false;finishing=false;openScanner(target)};
    }
    async function addSaleScan(p){
      try{
        if(!saleDialog?.open&&typeof openSale==='function')openSale();
        if(typeof addToCart!=='function')throw new Error('CART_UNAVAILABLE');
        addToCart(p,1);enhanceCart();
        window.vareliaSound?.('add');window.vareliaToast?.(`${p.name||'Producto'} · S/ ${Number(p.sellPrice||0).toFixed(2)} agregado`,'ok');
        if(saleSearch)saleSearch.value='';
      }catch(e){console.error(e);window.vareliaSound?.('error');}
    }
    async function finish(raw){if(finishing)return;finishing=true;const code=norm(raw);if(!code){finishing=false;return}window.vareliaSound?.('scan');await stopCamera();let p=findProduct(code);
      if(target==='product'&&!p){const el=document.getElementById('barcode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}await closeScanner();return}
      if(target==='inventory'){const el=document.getElementById('inventoryCode');if(el)el.value=code;if(!p){const selected=selectedInventoryProduct();if(selected){selected.barcode=code;persistProducts();p=selected}}}
      if(target==='sale'){
        if(p){await addSaleScan(p);try{if(dialog.open)dialog.close()}catch{}opening=false;finishing=false;resetUI();setTimeout(()=>{if(saleDialog?.open)openScanner('sale')},420);return}
        window.vareliaSound?.('error');alert('Código leído: '+code+'\nEste código todavía no está vinculado a un producto.');try{if(dialog.open)dialog.close()}catch{}opening=false;finishing=false;setTimeout(()=>{if(saleDialog?.open)openScanner('sale')},500);return;
      }
      if(p){renderCard(p,code);finishing=false;return}
      window.vareliaSound?.('error');alert('Código leído: '+code+'\nEste código todavía no está vinculado a un producto.');finishing=false;resetUI();try{if(dialog.open)dialog.close()}catch{}
    }
    if(saleSearch&&!saleSearch.dataset.posEnter){saleSearch.dataset.posEnter='1';saleSearch.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;const code=norm(saleSearch.value);const p=findProduct(code);if(!p)return;e.preventDefault();await addSaleScan(p);saleSearch.select()})}
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();closeScanner()};dialog.addEventListener('cancel',e=>{e.preventDefault();closeScanner()});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});window.addEventListener('pagehide',()=>stopCamera());
  })
})();