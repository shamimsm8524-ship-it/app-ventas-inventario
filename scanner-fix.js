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
      #scannerDialog .modal{width:min(94vw,520px);max-height:92vh;overflow:auto}
      #scannerDialog #scannerVideo{display:none!important}
      #scannerDialog #vareliaReader{width:100%!important;min-height:0!important;background:#000;border-radius:18px;overflow:hidden}
      #scannerDialog #vareliaReader video{display:block!important;width:100%!important;height:auto!important;max-height:52vh!important;object-fit:cover!important}
      #scannerDialog #vareliaReader canvas{display:none!important}
      #scannerDialog #vareliaReader__scan_region{min-height:0!important}
      #scannerDialog #vareliaReader__scan_region>img{display:none!important}
      #scannerDialog #vareliaReader__dashboard{display:none!important}
      #scannerDialog .scannerInfo{margin:10px 0;color:var(--muted);font-size:13px}
      #scannerDialog .scannerManual{display:flex;gap:8px;margin-top:12px}
      #scannerDialog .scannerManual input{min-width:0;flex:1}
      #scannerDialog .scannerCartPanel{display:none;margin:10px 0 12px;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
      #scannerDialog .scannerCartHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
      #scannerDialog .scannerCartHead b{font-size:15px}
      #scannerDialog .scannerCartItems{display:grid;gap:7px;max-height:155px;overflow:auto}
      #scannerDialog .scannerCartItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}
      #scannerDialog .scannerCartItem:last-child{border-bottom:0}
      #scannerDialog .scannerCartItem span{min-width:0}
      #scannerDialog .scannerCartItem small{display:block;color:var(--muted);margin-top:2px}
      #scannerDialog .scannerCartItem strong{white-space:nowrap;color:var(--p)}
      #scannerDialog .scannerCartFoot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
      #scannerDialog .scannerCartFoot strong{font-size:18px}
      #scannerDialog #scannerCartCheckout{padding:10px 14px;border:0;border-radius:12px;background:var(--p);color:#fff;font-weight:900}

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
    // El carrito de Nueva venta ya se renderiza correctamente desde index.html.
    // No sobrescribir sus filas: aquí antes se perdían peso, cantidades y controles.
    function enhanceCart(){
      const checkout=document.getElementById('checkout');
      if(checkout&&!checkout.dataset.posNamed){checkout.dataset.posNamed='1';checkout.textContent='💳 Cobrar venta'}
    }
    setTimeout(enhanceCart,300);

    function renderScannerCart(){
      const panel=ensureScannerCartPanel(),items=document.getElementById('scannerCartItems'),totalEl=document.getElementById('scannerCartTotal'),countEl=document.getElementById('scannerCartCount');
      if(!panel||!items||!totalEl||!countEl)return;
      panel.style.display=target==='sale'?'block':'none';
      let list=[];try{list=Array.isArray(cart)?cart:[]}catch{}
      countEl.textContent=list.length+(list.length===1?' producto':' productos');
      if(!list.length){items.innerHTML='<small style="color:var(--muted)">Aún no hay productos.</small>';totalEl.textContent='S/ 0.00';return}
      items.innerHTML=list.map(i=>{
        const qty=Number(i.qty)||0,kg=String(i.unit||'').trim().toLowerCase()==='kg',med=String(i.medicineSaleUnit||'');
        const detail=kg?(qty<1?Math.round(qty*1000)+' g':qty.toFixed(3)+' kg'):med?(med+' · Cant. '+qty):('Cant. '+qty);
        return '<div class="scannerCartItem"><span><b>'+esc(i.baseName||i.name||'Producto')+'</b><small>'+esc(detail)+'</small></span><strong>S/ '+(Number(i.price||0)*qty).toFixed(2)+'</strong></div>'
      }).join('');
      totalEl.textContent='S/ '+list.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0).toFixed(2);
    }
    window.addEventListener('varelia:cart-changed',renderScannerCart);

    const modal=dialog.querySelector('.modal');
    if(modal&&!document.getElementById('vareliaReader')){
      const oldVideo=document.getElementById('scannerVideo');if(oldVideo)oldVideo.style.display='none';
      const info=document.createElement('div');info.id='scannerInfo';info.className='scannerInfo';info.textContent='Apunta la cámara al código de barras. La lectura será automática.';
      const reader=document.createElement('div');reader.id='vareliaReader';reader.className='vareliaReader';
      const manual=document.createElement('div');manual.className='scannerManual';manual.innerHTML='<input id="scannerManualCode" inputmode="numeric" placeholder="O escribe el código"><button type="button" class="btn primary" id="scannerUseManual">Usar</button>';
      const cartPanel=document.createElement('div');cartPanel.id='scannerCartPanel';cartPanel.className='scannerCartPanel';cartPanel.innerHTML='<div class="scannerCartHead"><b>🛒 Carrito</b><span id="scannerCartCount">0 productos</span></div><div id="scannerCartItems" class="scannerCartItems"></div><div class="scannerCartFoot"><div><small style="display:block;color:var(--muted)">Total</small><strong id="scannerCartTotal">S/ 0.00</strong></div><button type="button" id="scannerCartCheckout">Cobrar</button></div>';
      const result=document.createElement('div');result.id='scannerProductResult';result.className='scannerProductResult';result.hidden=true;
      modal.append(info,cartPanel,reader,manual,result);
      document.getElementById('scannerUseManual').onclick=()=>{const v=document.getElementById('scannerManualCode').value.trim();if(v)finish(v)};
      document.getElementById('scannerCartCheckout').onclick=async()=>{await closeScanner();try{if(typeof openSale==='function')openSale(false)}catch(e){console.error(e)}};
    }
    function ensureScannerCartPanel(){
      if(!modal)return null;
      let panel=document.getElementById('scannerCartPanel');
      if(panel)return panel;
      panel=document.createElement('div');
      panel.id='scannerCartPanel';panel.className='scannerCartPanel';
      panel.innerHTML='<div class="scannerCartHead"><b>🛒 Carrito</b><span id="scannerCartCount">0 productos</span></div><div id="scannerCartItems" class="scannerCartItems"></div><div class="scannerCartFoot"><div><small style="display:block;color:var(--muted)">Total</small><strong id="scannerCartTotal">S/ 0.00</strong></div><button type="button" id="scannerCartCheckout">Cobrar</button></div>';
      const info=document.getElementById('scannerInfo'),reader=document.getElementById('vareliaReader');
      if(reader)modal.insertBefore(panel,reader);else if(info)info.after(panel);else modal.prepend(panel);
      const pay=panel.querySelector('#scannerCartCheckout');
      if(pay)pay.onclick=async()=>{await closeScanner();try{if(typeof openSale==='function')openSale(false)}catch(e){console.error(e)}};
      return panel;
    }
    ensureScannerCartPanel();

    const sleep=ms=>new Promise(r=>setTimeout(r,ms));
    let torchOn=false;
    function torchTrack(){
      try{
        const v=document.querySelector('#vareliaReader video');
        return v?.srcObject?.getVideoTracks?.()[0]||null;
      }catch{return null}
    }
    function torchCapabilities(){
      let caps={};
      try{caps=scanner?.getRunningTrackCapabilities?.()||{}}catch{}
      if(!caps||typeof caps!=='object')caps={};
      if(!('torch' in caps)){
        try{caps={...caps,...(torchTrack()?.getCapabilities?.()||{})}}catch{}
      }
      return caps;
    }
    async function setTorch(on){
      const wanted=!!on;
      let lastError=null;
      if(scanner?.applyVideoConstraints){
        try{
          await scanner.applyVideoConstraints({advanced:[{torch:wanted}]});
          torchOn=wanted;
        }catch(e){lastError=e}
      }
      if(torchOn!==wanted){
        const track=torchTrack();
        if(!track)throw lastError||new Error('NO_TRACK');
        try{
          await track.applyConstraints({advanced:[{torch:wanted}]});
          torchOn=wanted;
        }catch(e){lastError=e}
      }
      if(torchOn!==wanted){
        const track=torchTrack();
        try{
          await track?.applyConstraints?.({torch:wanted});
          torchOn=wanted;
        }catch(e){lastError=e}
      }
      if(torchOn!==wanted)throw lastError||new Error('NO_TORCH');
      const b=document.getElementById('scannerTorch');
      if(b){
        b.textContent=torchOn?'🔦 Apagar linterna':'🔦 Encender linterna';
        b.setAttribute('aria-pressed',torchOn?'true':'false');
      }
    }
    function ensureTorchButton(){
      let b=document.getElementById('scannerTorch');
      if(!b){
        b=document.createElement('button');
        b.type='button';
        b.id='scannerTorch';
        b.className='btn secondary';
        b.style.cssText='width:100%;margin-top:10px;font-weight:900';
        const r=document.getElementById('vareliaReader');
        r?.after(b);
      }
      b.disabled=false;
      b.textContent=torchOn?'🔦 Apagar linterna':'🔦 Encender linterna';
      b.setAttribute('aria-pressed',torchOn?'true':'false');
      b.onclick=async()=>{
        if(b.disabled)return;
        b.disabled=true;
        b.textContent=torchOn?'Apagando…':'Encendiendo…';
        try{
          await setTorch(!torchOn);
          window.vareliaToast?.(torchOn?'Linterna encendida.':'Linterna apagada.','ok');
        }catch(e){
          console.warn('Linterna no disponible en este motor/cámara',e,{caps:torchCapabilities()});
          torchOn=false;
          b.textContent='🔦 Linterna no disponible';
          b.setAttribute('aria-pressed','false');
          window.vareliaToast?.('Este celular o el motor de la app no expone el flash de la cámara.','warn');
          await sleep(900);
        }finally{
          b.disabled=false;
          if(b.textContent==='Encendiendo…'||b.textContent==='Apagando…'||b.textContent==='🔦 Linterna no disponible'){
            b.textContent=torchOn?'🔦 Apagar linterna':'🔦 Encender linterna';
          }
        }
      };
    }
    function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
    function norm(v){return String(v??'').trim().replace(/[^0-9A-Za-z]/g,'').toUpperCase()}
    function codeCandidates(v){const n=norm(v),d=digits(n),out=[n];if(d){out.push(d,d.replace(/^0+/,''));if(d.length===14&&d[0]==='0')out.push(d.slice(1));if(d.length===13)out.push(d.slice(1));if(d.length>13)out.push(d.slice(-13),d.slice(-12),d.slice(-8));}return [...new Set(out.filter(Boolean))]}
    function digits(v){return String(v??'').replace(/\D/g,'')}
    function equivalent(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;if(a===b)return true;const ad=digits(a),bd=digits(b);if(ad&&bd){if(ad===bd)return true;if(ad.replace(/^0+/,'')===bd.replace(/^0+/,''))return true;if(ad.length>=12&&bd.length>=12&&ad.slice(-12)===bd.slice(-12))return true}return false}
    function loadLib(){return new Promise((resolve,reject)=>{if(window.Html5Qrcode)return resolve();let existing=document.querySelector('script[data-varelia-html5qrcode]');if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}const s=document.createElement('script');s.dataset.vareliaHtml5qrcode='1';s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
    function allStoredProducts(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!/product/i.test(k))continue;let v;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch{continue}if(Array.isArray(v))v.forEach(x=>{if(x&&typeof x==='object'&&('barcode'in x||'name'in x))out.push(x)})}}catch{}return out}
    async function lookupFactoryProduct(code){
      const sources=[
        'https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,manufacturing_places,categories_tags,image_front_url',
        'https://world.openbeautyfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,manufacturing_places,categories_tags,image_front_url',
        'https://world.openproductsfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,manufacturing_places,categories_tags,image_front_url'
      ];
      for(const url of sources){try{const res=await fetch(url,{headers:{Accept:'application/json'}});if(!res.ok)continue;const j=await res.json();const x=j?.product;if(j?.status===1&&x){const name=String(x.product_name_es||x.product_name||'').trim(),brand=String(x.brands||'').trim(),maker=String(x.manufacturing_places||'').trim();if(name||brand)return {name:name||brand,brand,maker,image:x.image_front_url||'',source:url.includes('openbeauty')?'Open Beauty Facts':url.includes('openproducts')?'Open Products Facts':'Open Food Facts'};}}catch(e){console.warn('Consulta de producto',e)}}return null;
    }
    async function offerNewProduct(code){
      const info=document.getElementById('scannerInfo');if(info){info.style.display='block';info.textContent='Buscando nombre y marca del producto…'}
      const data=await lookupFactoryProduct(code);await closeScanner();
      if(typeof openProduct==='function')openProduct();else try{document.getElementById('newProduct')?.click()}catch{}
      await sleep(120);const bc=document.getElementById('barcode'),nm=document.getElementById('productName'),ds=document.getElementById('description'),preview=document.getElementById('imagePreview');
      if(bc)bc.value=code;if(data){if(nm&&!nm.value)nm.value=data.name;const details=[data.brand&&'Marca: '+data.brand,data.maker&&'Fabricación: '+data.maker,'Datos encontrados en '+data.source].filter(Boolean).join(' · ');if(ds&&!ds.value)ds.value=details;if(preview&&data.image){preview.src=data.image;preview.hidden=false}window.vareliaToast?.('Producto identificado: '+data.name,'ok');}else{window.vareliaToast?.('Código leído. No figura en las bases públicas; completa el nombre manualmente.','warn')}
    }
    function findProduct(code){const pools=[];try{if(Array.isArray(products))pools.push(...products)}catch{}pools.push(...allStoredProducts());const cc=codeCandidates(code);const found=pools.find(x=>cc.some(c=>equivalent(x?.barcode,c)));if(!found)return null;try{const live=products.find(x=>String(x.id)===String(found.id))||products.find(x=>equivalent(x.barcode,code));return live||found}catch{return found}}
    function persistProducts(){try{if(typeof save==='function')save();else if(typeof K!=='undefined'&&K.products)localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})))}catch(e){console.warn(e)}}
    function selectedInventoryProduct(){try{return inventoryProductId?products.find(x=>String(x.id)===String(inventoryProductId))||null:null}catch{return null}}
    function resetUI(){const r=document.getElementById('vareliaReader'),res=document.getElementById('scannerProductResult'),manual=document.querySelector('.scannerManual'),info=document.getElementById('scannerInfo');if(r){r.style.display='block';r.innerHTML=''}if(res){res.hidden=true;res.innerHTML=''}if(manual)manual.style.display='flex';if(info){info.style.display='block';info.textContent=target==='sale'?'Modo caja: escanea productos uno tras otro. Cada lectura se agrega a la venta.':'Apunta la cámara al código de barras. La lectura será automática.'}const m=document.getElementById('scannerManualCode');if(m)m.value=''}
    async function stopCamera(){try{if(torchOn)await setTorch(false)}catch{}torchOn=false;const current=scanner;scanner=null;if(!current)return;try{const state=current.getState?.();if(state===2||state===3)await current.stop()}catch{}try{await current.clear()}catch{}await sleep(180)}
    async function closeScanner(){await stopCamera();try{if(dialog.open)dialog.close()}catch{}opening=false;finishing=false;resetUI()}
    async function cameraConfig(){try{const cams=await Html5Qrcode.getCameras();if(cams?.length){const back=cams.find(c=>/back|rear|environment|trasera|posterior/i.test(c.label||''))||cams[cams.length-1];if(back?.id)return back.id}}catch(e){console.warn('No se pudo listar cámaras',e)}return {facingMode:'environment'}}
    async function startCamera(){const reader=document.getElementById('vareliaReader');reader.innerHTML='';reader.style.display='block';scanner=new Html5Qrcode('vareliaReader');const formats=[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE];const config={fps:18,qrbox:(vw,vh)=>({width:Math.max(220,Math.min(340,Math.floor(vw*.88))),height:Math.max(120,Math.min(190,Math.floor(vh*.42)))}),formatsToSupport:formats,disableFlip:false};const cam=await cameraConfig();try{const r=await scanner.start(cam,config,text=>finish(text),()=>{});ensureTorchButton();return r}catch(first){console.warn('Primer intento de cámara falló',first);await stopCamera();scanner=new Html5Qrcode('vareliaReader');const r=await scanner.start({facingMode:'environment'},config,text=>finish(text),()=>{});ensureTorchButton();return r}}
    const SCANNER_CART_BACKUP_KEY='varelia_scanner_cart_backup_v1';
    function saveScannerCartBackup(){
      try{
        if(Array.isArray(cart)&&cart.length){
          localStorage.setItem(SCANNER_CART_BACKUP_KEY,JSON.stringify(cart));
        }
      }catch(e){console.warn('No se pudo respaldar carrito del escáner',e)}
    }
    function restoreScannerCartBackup(force=false){
      try{
        const saved=JSON.parse(localStorage.getItem(SCANNER_CART_BACKUP_KEY)||'[]');
        if(!Array.isArray(saved)||!saved.length)return false;
        if(force||!Array.isArray(cart)||!cart.length){
          cart=saved.map(x=>({...x}));
          try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
          try{if(typeof renderCart==='function')renderCart()}catch{}
          try{window.VareliaPOS?.sync?.()}catch{}
          return true;
        }
      }catch(e){console.warn('No se pudo restaurar carrito del escáner',e)}
      return false;
    }
    function nativeScannerSummary(){
      let list=[];
      try{list=Array.isArray(cart)?cart:[]}catch{}
      const total=list.reduce((s,i)=>s+Number(i.price||0)*Number(i.qty||0),0);
      const lines=list.map(i=>{
        const qty=Number(i.qty)||0;
        const med=String(i.medicineSaleUnit||'');
        const kg=String(i.unit||'').trim().toLowerCase()==='kg';
        const detail=med?med:(kg?(qty<1?Math.round(qty*1000)+' g':qty.toFixed(3)+' kg'):('x'+qty));
        return '• '+String(i.baseName||i.name||'Producto')+' '+detail+' · S/ '+(Number(i.price||0)*qty).toFixed(2);
      });
      const head='🛒 '+list.length+(list.length===1?' producto':' productos')+' · Total S/ '+total.toFixed(2);
      return [head,...lines].join('\n');
    }
    function openNativeScanner(which){
      const native=window.VareliaAndroid;
      if(!native)return false;
      try{
        if(typeof native.openScannerWithCart==='function')native.openScannerWithCart(which,nativeScannerSummary());
        else if(typeof native.openScanner==='function')native.openScanner(which);
        else return false;
        return true;
      }catch(e){console.warn('Escáner nativo no disponible',e);return false}
    }
    async function openScanner(which){if(opening)return;target=which;finishing=false;if(openNativeScanner(which))return;opening=true;ensureScannerCartPanel();resetUI();renderScannerCart();try{if(!window.isSecureContext)throw new Error('HTTPS_REQUIRED');if(!navigator.mediaDevices?.getUserMedia)throw new Error('CAMERA_UNSUPPORTED');await loadLib();await stopCamera();if(!dialog.open)dialog.showModal();await sleep(160);await startCamera()}catch(e){console.error('Scanner',e);await stopCamera();try{if(dialog.open)dialog.close()}catch{}const msg=String(e?.name||'')+' '+String(e?.message||e);window.vareliaSound?.('error');if(/NotAllowed|Permission|denied/i.test(msg))alert('Permite la cámara en Chrome para poder escanear.');else if(/NotFound|DevicesNotFound/i.test(msg))alert('No se encontró una cámara disponible en este equipo.');else if(/NotReadable|TrackStart|Could not start video source/i.test(msg))alert('La cámara está ocupada. Cierra otra app que use la cámara y vuelve a intentarlo.');else if(/HTTPS_REQUIRED/.test(msg))alert('Abre Varelia usando https:// para usar la cámara.');else alert('No se pudo iniciar la cámara. Vuelve a tocar Escanear.')}finally{opening=false}}
    function renderCard(p,code){const result=document.getElementById('scannerProductResult'),reader=document.getElementById('vareliaReader'),manual=document.querySelector('.scannerManual'),info=document.getElementById('scannerInfo');if(reader)reader.style.display='none';if(manual)manual.style.display='none';if(info)info.style.display='none';const img=p.image?`<img class="scanProductImg" src="${p.image}" alt="">`:'<div class="scanProductImg scanNoImg">Sin imagen</div>';result.innerHTML=`<div class="scanProductTop">${img}<div class="scanProductData"><div class="scanProductName">${esc(p.name||'Producto')}</div><div class="meta">Código: ${esc(code)}</div><div class="scanStock">Stock: <b>${Number(p.stock||0)} ${esc(p.unit||'Unidad')}</b></div><div class="scanPrice">S/ ${Number(p.sellPrice||0).toFixed(2)}</div></div></div><label class="scanQtyLabel">Cantidad<input id="scannerActionQty" type="number" min="1" step="1" value="1"></label><div class="scanActions"><button type="button" class="btn secondary" id="scannerIncrease">➕ Aumentar stock</button><button type="button" class="btn primary" id="scannerSell">🛒 Vender</button></div><button type="button" class="btn secondary scanAgain" id="scannerAgain">📷 Escanear otro producto</button>`;result.hidden=false;
      document.getElementById('scannerIncrease').onclick=()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1)),before=+p.stock||0;p.stock=before+q;persistProducts();window.vareliaSound?.('add');window.vareliaToast?.('Stock actualizado: +'+q,'ok');renderCard(p,code)};
      document.getElementById('scannerSell').onclick=async()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1));if((+p.stock||0)<q){window.vareliaSound?.('error');return alert('Stock insuficiente. Disponible: '+Number(p.stock||0))}await closeScanner();try{if(typeof openSale==='function'&&!saleDialog?.open)openSale();if(typeof addToCart==='function')addToCart(p,q);enhanceCart();window.vareliaSound?.('sale')}catch(e){console.error(e);window.vareliaSound?.('error');alert('No se pudo preparar la venta.')}};
      document.getElementById('scannerAgain').onclick=async()=>{await stopCamera();opening=false;finishing=false;openScanner(target)};
    }
    async function addSaleScan(p){
      try{
        if(typeof addToCart!=='function')throw new Error('CART_UNAVAILABLE');
        const isMedicine=!!p.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim());
        const isWeight=/^(kg|kilo|kilos|kilogramo|kilogramos|g|gr|gramo|gramos)$/i.test(String(p.unit||'').trim());

        // Durante el escaneo mantenemos el carrito visible dentro de esta misma ventana.
        addToCart(p,1);
        try{enhanceCart()}catch{}
        try{renderCart()}catch{}
        try{window.VareliaPOS?.sync?.()}catch{}
        try{renderScannerCart()}catch{}
        setTimeout(()=>{
          try{renderCart()}catch{}
          try{window.VareliaPOS?.sync?.()}catch{}
        },80);

        if(!isMedicine&&!isWeight){
          window.vareliaSound?.('add');
          window.vareliaToast?.((p.name||'Producto')+' · S/ '+Number(p.sellPrice||0).toFixed(2)+' agregado al carrito','ok');
        }
        if(saleSearch)saleSearch.value='';
        return true;
      }catch(e){
        console.error(e);
        window.vareliaSound?.('error');
        window.vareliaToast?.('No se pudo agregar el producto al carrito.','warn');
        return false;
      }
    }
    window.VareliaNativeAddSaleAndSummary=(raw)=>{
      try{
        const code=norm(raw),p=findProduct(code);
        if(!p)return '⚠ Código '+code+' no vinculado.\n\n'+nativeScannerSummary();
        const med=!!p.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim());
        const weight=/^(kg|kilo|kilos|kilogramo|kilogramos|g|gr|gramo|gramos)$/i.test(String(p.unit||'').trim());
        if(med)return '⚠ '+(p.name||'Medicamento')+' requiere elegir presentación.\n\n'+nativeScannerSummary();
        if(weight)return '⚠ '+(p.name||'Producto')+' requiere elegir peso.\n\n'+nativeScannerSummary();
        addToCart(p,1);
        try{enhanceCart()}catch{}
        try{renderCart()}catch{}
        try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
        try{saveScannerCartBackup()}catch{}
        try{renderScannerCart()}catch{}
        try{window.VareliaPOS?.sync?.()}catch{}
        return nativeScannerSummary();
      }catch(e){
        console.error(e);
        return '⚠ No se pudo agregar el producto.\n\n'+nativeScannerSummary();
      }
    };
    window.VareliaNativeScanResult=(which,raw)=>{
      target=which||target;
      finishing=false;
      if(target==='inventory'&&dialog&&!dialog.open){try{resetUI();dialog.showModal()}catch{}}
      finish(raw);
    };
    window.VareliaNativeScannerAction=(action)=>{
      if(action==='checkout'){
        // El respaldo del escáner es la fuente principal al volver a Venta.
        restoreScannerCartBackup(true);
        try{if(typeof renderCart==='function')renderCart()}catch{}
        try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}

        try{
          const scannerDialog=document.getElementById('scannerDialog');
          if(scannerDialog?.open)scannerDialog.close();
        }catch{}
        try{
          if(saleDialog?.open)saleDialog.close();
          saleDialog?.classList.remove('vposBridge');
          document.body.classList.remove('vposReset');
        }catch{}

        try{
          if(typeof switchView==='function')switchView('sales');
          else document.querySelector('.nav [data-view="sales"]')?.click();
        }catch(e){console.error(e)}

        const showPos=()=>{
          // Algunos manejadores móviles vuelven a inicializar Venta.
          // Restauramos de nuevo después del cambio de pantalla para evitar carrito vacío.
          restoreScannerCartBackup(true);
          try{if(typeof renderCart==='function')renderCart()}catch{}
          try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
          try{window.VareliaPOS?.sync?.()}catch{}
          const pos=document.getElementById('vareliaPosSales');
          if(pos){
            pos.style.display='';
            try{pos.scrollIntoView({behavior:'smooth',block:'start'})}catch{}
          }
        };
        setTimeout(showPos,80);
        setTimeout(showPos,260);
        setTimeout(showPos,650);
      }
    };
    async function finish(raw){if(finishing)return;finishing=true;const code=norm(raw);if(!code){finishing=false;return}window.vareliaSound?.('scan');await stopCamera();let p=findProduct(code);
      if(target==='product'&&!p){const el=document.getElementById('barcode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}await closeScanner();return}
      if(target==='inventory'){const el=document.getElementById('inventoryCode');if(el)el.value=code;if(!p){const selected=selectedInventoryProduct();if(selected){selected.barcode=code;persistProducts();try{await Promise.resolve(window.syncProductToCloud?.(selected));window.vareliaToast?.('Código guardado en el producto.','ok')}catch(e){console.error(e);window.vareliaToast?.('No se pudo guardar el código en la nube.','warn')}p=selected}}}
      if(target==='sale'){
        if(p){
          const added=await addSaleScan(p);
          const med=!!p.medicine||/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(p.category||'').trim());
          const weight=/^(kg|kilo|kilos|kilogramo|kilogramos|g|gr|gramo|gramos)$/i.test(String(p.unit||'').trim());
          const info=document.getElementById('scannerInfo');
          if(info){
            info.style.display='block';
            info.textContent=med?'✓ '+(p.name||'Medicamento')+' leído. Elige Caja, Blíster o Pastilla para continuar.':weight?'✓ '+(p.name||'Producto')+' leído. Elige el peso en kilos o gramos para continuar.':'✓ '+(p.name||'Producto')+' agregado al carrito.';
          }
          finishing=false;

          // Mantén abierta esta misma ventana y sigue escaneando.
          if(added&&!med&&!weight){
            try{renderScannerCart()}catch{}
            await sleep(220);
            try{await startCamera()}catch(e){console.warn(e)}
          }
          return;
        }
        window.vareliaSound?.('error');
        const info=document.getElementById('scannerInfo');if(info){info.style.display='block';info.textContent='Código '+code+' no vinculado. Puedes seguir escaneando o escribir otro código.'}
        finishing=false;await sleep(180);try{if(!openNativeScanner(target))await startCamera()}catch(e){console.warn(e)}return;
      }
      if(p){renderCard(p,code);finishing=false;return}
      if(target==='inventory'||target==='product'){await offerNewProduct(code);finishing=false;return}
      window.vareliaSound?.('error');alert('Código leído: '+code+'\nEste código todavía no está vinculado a un producto.');finishing=false;resetUI();try{if(dialog.open)dialog.close()}catch{}
    }
    if(saleSearch&&!saleSearch.dataset.posEnter){saleSearch.dataset.posEnter='1';saleSearch.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;const code=norm(saleSearch.value);const p=findProduct(code);if(!p)return;e.preventDefault();await addSaleScan(p);saleSearch.select()})}
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();closeScanner()};dialog.addEventListener('cancel',e=>{e.preventDefault();closeScanner()});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});window.addEventListener('pagehide',()=>stopCamera());
  })
})();