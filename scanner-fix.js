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
      #scannerDialog #scannerVideo,#scannerDialog .vscannerStage{display:none!important}
      #scannerDialog{height:min(92dvh,780px);max-height:92vh} #scannerDialog .modal{box-sizing:border-box;height:100%} #scannerDialog #vareliaReader{width:100%!important;height:min(38vh,300px)!important;min-height:min(38vh,300px)!important;background:#000;border-radius:18px;overflow:hidden}
      #scannerDialog #vareliaReader video{display:block!important;width:100%!important;height:100%!important;max-height:100%!important;object-fit:cover!important}
      #scannerDialog #vareliaReader{position:relative}
      #scannerDialog[data-camera-loading="1"] #vareliaReader:after{content:'Encendiendo cámara…';position:absolute;inset:0;display:grid;place-items:center;color:white;background:#172033;font:600 16px/1.4 Arial,sans-serif;z-index:2}
      #scannerDialog #vareliaReader canvas{display:none!important}
      #scannerDialog #vareliaReader__scan_region{height:100%!important;min-height:0!important}
      #scannerDialog #vareliaReader__scan_region>img{display:none!important}
      #scannerDialog #vareliaReader__dashboard{display:none!important}
      #scannerDialog .scannerInfo{height:3em;overflow:auto;margin:10px 0;color:var(--muted);font-size:13px}
      #scannerDialog .scannerManual{display:flex;gap:8px;margin-top:12px}
      #scannerDialog .scannerManual input{min-width:0;flex:1}
      #scannerDialog .scannerCartPanel{display:none;margin:10px 0 12px;padding:12px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
      #scannerDialog .scannerCartHead{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
      #scannerDialog .scannerCartHead b{font-size:15px}
      #scannerDialog .scannerCartItems{display:grid;gap:7px;height:100px;overflow:auto;overflow-anchor:none}
      #scannerDialog .scannerCartItem{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:8px 0;border-bottom:1px solid var(--line)}
      #scannerDialog .scannerCartItem:last-child{border-bottom:0}
      #scannerDialog .scannerCartItem span{min-width:0}
      #scannerDialog .scannerCartItem small{display:block;color:var(--muted);margin-top:2px}
      #scannerDialog .scannerCartItem strong{white-space:nowrap;color:var(--p)}
      #scannerDialog .scannerCartFoot{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
      #scannerDialog .scannerCartFoot strong{font-size:18px}
      #scannerDialog #scannerCartCheckout{padding:10px 14px;border:0;border-radius:12px;background:var(--p);color:#fff;font-weight:900}

      /* Keep checkout visible on small phones; only the product list scrolls. */
      #scannerDialog{box-sizing:border-box!important;width:min(96vw,520px)!important;max-width:96vw!important;height:min(94dvh,800px)!important;max-height:94dvh!important;padding:0!important;overflow:hidden!important;border:0;border-radius:20px;background:#fff!important;color:#172033!important;--card:#fff;--ink:#172033;--muted:#667085;--line:#e2e8f0}
      #scannerDialog .modal{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;gap:8px!important;width:100%!important;height:100%!important;max-height:100%!important;padding:12px!important;overflow:hidden!important;background:#fff!important;color:#172033!important}
      #scannerDialog .modal>*{flex-shrink:0;min-width:0}
      #scannerDialog .modalhead{margin:0!important;padding:0!important;min-height:42px}
      #scannerDialog .modalhead h2{font:800 21px/1.2 Arial,sans-serif!important;margin:0!important}
      #scannerDialog .scannerInfo{box-sizing:border-box;height:36px!important;min-height:36px;margin:0!important;padding:0!important;font:13px/18px Arial,sans-serif!important;white-space:normal!important;color:#667085!important;overflow:auto}
      #scannerDialog #vareliaReader{flex:1 1 0!important;height:auto!important;min-height:80px!important;border-radius:12px!important}
      #scannerDialog #scannerTorch{margin:0!important;padding:8px 12px!important;min-height:40px!important;font:700 14px/20px Arial,sans-serif!important}
      #scannerDialog .scannerManual{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:8px!important;margin:0!important}
      #scannerDialog .scannerManual input,#scannerDialog .scannerManual button{box-sizing:border-box!important;width:auto!important;min-height:42px!important;height:42px!important;margin:0!important;padding:8px 12px!important;font:16px/22px Arial,sans-serif!important}
      #scannerDialog[data-scan-target="sale"] .scannerCartPanel{box-sizing:border-box!important;display:flex!important;flex-direction:column!important;flex:0 0 clamp(176px,28dvh,230px)!important;min-height:0!important;overflow:hidden!important;margin:0!important;padding:10px!important;color:#172033!important;background:#fff!important}
      #scannerDialog .scannerCartHead{margin:0 0 5px!important;font:14px/20px Arial,sans-serif!important}
      #scannerDialog .scannerCartItems{flex:1 1 0;min-height:0!important;height:auto!important;overflow:auto!important;overscroll-behavior:contain}
      #scannerDialog .scannerCartItem{padding:6px 0!important;font:14px/19px Arial,sans-serif!important}
      #scannerDialog .scannerCartItem b{overflow-wrap:anywhere}
      #scannerDialog .scannerCartFoot{flex:0 0 auto!important;margin-top:6px!important;padding-top:6px!important}
      #scannerDialog #scannerCartCheckout{min-height:44px!important;width:auto!important;flex:0 0 auto!important;padding:10px 16px!important;font:800 16px/22px Arial,sans-serif!important}

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
        const presentation=String(i.selectionLabel||i.medicineSaleUnit||(i.salePresentationId?i.unit:'')||'Unidad');
        const detail=kg?(qty<1?Math.round(qty*1000)+' g':qty.toFixed(3)+' kg'):(presentation+' · Cant. '+qty+(Number(i.salePresentationUnits)>1?' · '+Number(i.salePresentationUnits)+' unidades por presentación':''));
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
      modal.append(info,reader,manual,cartPanel,result);
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
      let library={},track={};
      try{library=scanner?.getRunningTrackCapabilities?.()||{}}catch{}
      try{track=torchTrack()?.getCapabilities?.()||{}}catch{}
      // Some WebViews omit torch in capabilities even though getSettings exposes it.
      const includesTrue=v=>v===true||(Array.isArray(v)&&v.includes(true));
      const settings=torchTrack()?.getSettings?.()||{};
      return {...library,...track,torch:includesTrue(track.torch)||includesTrue(library.torch)||typeof settings.torch==='boolean'};
    }
    async function setTorch(on){
      const wanted=!!on,track=torchTrack();
      if(!track?.applyConstraints)throw new Error('NO_TORCH_SUPPORT');
      let lastError;
      for(const constraints of [{torch:wanted,advanced:[{torch:wanted}]},{advanced:[{torch:wanted}]}]){
        try{
          await track.applyConstraints(constraints);
          if(track.getSettings?.().torch===wanted){
            torchOn=wanted;
            const b=document.getElementById('scannerTorch');
            if(b){b.textContent=torchOn?'🔦 Apagar linterna':'🔦 Encender linterna';b.setAttribute('aria-pressed',String(torchOn))}
            return;
          }
          lastError=new Error('TORCH_NOT_CONFIRMED');
        }catch(e){lastError=e}
      }
      throw lastError||new Error('NO_TORCH');
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
      b.disabled=!torchTrack()?.applyConstraints;
      b.title=b.disabled?'Espera a que se inicie la cámara.':'';
      b.textContent=b.disabled?'Iniciando cámara…':torchOn?'🔦 Apagar linterna':'🔦 Encender linterna';
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
          b.setAttribute('aria-pressed','false');
          const native=window.VareliaAndroid;
          if(typeof native?.openScannerWithCart==='function'||typeof native?.openScanner==='function'){
            b.textContent='🔦 Usar lector con linterna';
            b.onclick=async()=>{
              b.disabled=true;
              const which=target;
              try{await closeScanner();openNativeScanner(which)}finally{b.disabled=false}
            };
            window.vareliaToast?.('La linterna está disponible en el lector Android. Toca «Usar lector con linterna». Tu carrito se conserva.','info');
          }else{
            b.textContent='🔦 Linterna no disponible';
            window.vareliaToast?.('Android no confirmó el encendido del flash desde esta cámara. La lectura sigue disponible.','warn');
          }
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
    let libraryLoading=null;
    function loadLib(){
      if(window.Html5Qrcode)return Promise.resolve();
      if(libraryLoading)return libraryLoading;
      libraryLoading=(async()=>{
        for(const src of ['vendor/html5-qrcode-2.3.8.min.js','https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js','https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js']){
          try{await new Promise((resolve,reject)=>{
            const script=document.createElement('script');let timer;
            const done=err=>{clearTimeout(timer);script.onload=script.onerror=null;if(err){script.remove();reject(err)}else resolve()};
            script.src=src;script.dataset.vareliaHtml5qrcode='1';script.onload=()=>done(window.Html5Qrcode?null:new Error('SCANNER_LIBRARY_MISSING'));script.onerror=()=>done(new Error('SCANNER_LIBRARY_FAILED'));
            timer=setTimeout(()=>done(new Error('SCANNER_LIBRARY_TIMEOUT')),6000);document.head.appendChild(script);
          });return}catch(e){console.warn('Biblioteca del escáner',e)}
        }
        throw new Error('SCANNER_LIBRARY_FAILED');
      })().finally(()=>{libraryLoading=null});
      return libraryLoading;
    }
    // Fetch the decoder ahead of the first scan without requesting the camera.
    const decoderPreload=document.createElement('link');
    decoderPreload.rel='preload';decoderPreload.as='script';
    decoderPreload.href='vendor/html5-qrcode-2.3.8.min.js';
    document.head.appendChild(decoderPreload);
    for(const button of [productBtn,inventoryBtn,saleBtn]){
      button?.addEventListener('pointerdown',()=>{loadLib().catch(()=>{})},{passive:true});
      button?.addEventListener('focus',()=>{loadLib().catch(()=>{})});
    }
    function allStoredProducts(){
      const out=[],seen=new Set();
      const looksLikeProduct=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&(
        ['barcode','barCode','bar_code','barcodeValue','barcode_value','ean','ean13','ean_13','upc','upcCode','codigoBarras','codigo_barras','productCode','product_code','sku','gtin','gtin13'].some(k=>x[k]!==undefined&&x[k]!==null&&String(x[k]).trim()!=='')||
        (String(x.name||x.productName||'').trim()!==''&&('sellPrice'in x||'price'in x||'stock'in x||'category'in x))
      );
      const add=x=>{if(looksLikeProduct(x)){const key=String(x.id??x.barcode??x.barCode??x.codigoBarras??x.name??'');if(!seen.has(key)){seen.add(key);out.push(x)}}};
      const walk=(v,depth=0)=>{if(!v||depth>3)return;if(Array.isArray(v)){v.forEach(x=>{add(x);if(x&&typeof x==='object')walk(x,depth+1)});return}if(typeof v==='object'){for(const [k,x] of Object.entries(v)){if(/products?|inventory|catalog|items|variants|data/i.test(k))walk(x,depth+1)}}};
      try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);let v;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch{continue}if(/product|inventory|catalog|varelia|data/i.test(String(k||'')))walk(v)}}catch{}
      return out;
    }
    async function lookupFactoryProduct(code){
      const sources=[
        'https://world.openfoodfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,quantity',
        'https://world.openbeautyfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,quantity',
        'https://world.openproductsfacts.org/api/v2/product/'+encodeURIComponent(code)+'.json?fields=product_name,product_name_es,brands,quantity'
      ];
      const clean=(value)=>String(value||'').replace(/\\s+/g,' ').trim();
      const normalizeQuantity=(value)=>{
        let q=clean(value);
        q=q.replace(/^x\\s*/i,'').replace(/(\\d)\\s*(?:lt|ltr|litros?)\\b/ig,'$1 L').replace(/(\\d)\\s*(?:ml)\\b/ig,'$1 ml').replace(/(\\d)\\s*(kg|gr?)\\b/ig,'$1 $2');
        return q;
      };
      for(const url of sources){
        try{
          const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2000);let res;try{res=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal})}finally{clearTimeout(timer)};
          if(!res.ok)continue;
          const j=await res.json(),x=j?.product;
          if(j?.status!==1||!x)continue;
          const rawName=clean(x.product_name_es||x.product_name),brand=clean(String(x.brands||'').split(',')[0]),quantity=normalizeQuantity(x.quantity);
          if(!rawName&&!brand)continue;
          let name=rawName||brand;
          if(brand&&!name.toLocaleLowerCase().includes(brand.toLocaleLowerCase()))name=brand+' '+name;
          if(quantity&&!name.toLocaleLowerCase().includes(quantity.toLocaleLowerCase()))name+=' '+quantity;
          name=clean(name).replace(/\\s+x\\s+(\\d)/ig,' $1').replace(/(\\d)\\s*(?:lt|ltr|litros?)\\b/ig,'$1 L');
          return {name,source:url.includes('openbeauty')?'Open Beauty Facts':url.includes('openproducts')?'Open Products Facts':'Open Food Facts'};
        }catch(e){console.warn('Consulta de producto',e)}
      }
      return null;
    }
    async function offerNewProduct(code){
      await closeScanner();
      const form=document.getElementById('productDialog');
      // Scanning from an open product must preserve its name, prices and draft stock.
      if(!form?.open){if(typeof openProduct==='function')openProduct();else document.getElementById('newProduct')?.click()}
      const bc=document.getElementById('barcode'),nm=document.getElementById('productName'),id=document.getElementById('productId')?.value||'';
      if(bc){bc.value=code;bc.dispatchEvent(new Event('input',{bubbles:true}))}
      window.vareliaToast?.('Código leído. Pulsa Guardar producto para confirmarlo.','info');
      if(!nm||String(nm.value||'').trim())return;
      // Optional external name lookup never blocks editing, saving or closing the form.
      lookupFactoryProduct(code).then(data=>{
        if(!data||!form?.open||String(document.getElementById('productId')?.value||'')!==String(id)||bc?.value!==code||String(nm.value||'').trim())return;
        nm.value=data.name;nm.dispatchEvent(new Event('input',{bubbles:true}));
        window.vareliaToast?.('Nombre encontrado: '+data.name,'ok');
      }).catch(e=>console.warn('Nombre opcional del producto',e));
    }
    function productCodes(x){
      if(!x||typeof x!=='object')return[];
      const keys=['barcode','barCode','bar_code','barcodeValue','barcode_value','ean','ean13','ean_13','upc','upcCode','codigoBarras','codigo_barras','gtin','gtin13'];
      const out=[];
      const addFrom=obj=>{if(!obj||typeof obj!=='object')return;for(const k of keys){const v=obj[k];if(v!==undefined&&v!==null&&String(v).trim())out.push(String(v).trim())}};
      addFrom(x);
      for(const group of ['variants','variantCombinations','combinations','options'])if(Array.isArray(x[group]))x[group].forEach(addFrom);
      return [...new Set(out)];
    }
    function findProduct(code){
      // Fuente de verdad: la clave K.products del usuario autenticado.
      // Si aún no existe una sesión/ámbito activo, no permitir coincidencias.
      const raw=norm(code);
      const rawDigits=/^\d{12,14}$/.test(raw)?raw.replace(/^0+/,''):'';
      if(!raw) return null;
      let scope='', storageKey='', current=[];
      try{
        scope=String(localStorage.getItem('varelia_active_business_id')||window.vareliaBusinessScope||'').trim();
        if(!scope||scope==='no_account') return null;
        storageKey=(typeof K!=='undefined'&&K&&K.products)?String(K.products):'';
        if(!storageKey||!storageKey.endsWith('__'+scope.replace(/[^a-zA-Z0-9_-]/g,'_'))) return null;
        // The current scoped inventory includes cloud updates that may not yet be persisted.
        if(typeof products!=='undefined'&&Array.isArray(products))current=products;
        else{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');current=Array.isArray(saved)?saved:[]}

      }catch(e){console.warn('No se pudo validar el inventario activo para escanear',e);return null}
      return current.find(x=>productCodes(x).some(v=>{
        const candidate=norm(v);
        if(!candidate) return false;
        if(candidate===raw) return true;
        const candidateDigits=/^\d{12,14}$/.test(candidate)?candidate.replace(/^0+/,''):'';
        return !!rawDigits && !!candidateDigits && candidateDigits===rawDigits;
      }))||null;
    }
    function persistProducts(){try{if(typeof save==='function')save();else if(typeof K!=='undefined'&&K.products)localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})))}catch(e){console.warn(e)}}
    function selectedInventoryProduct(){try{return inventoryProductId?products.find(x=>String(x.id)===String(inventoryProductId))||null:null}catch{return null}}
    function resetUI(){const r=document.getElementById('vareliaReader'),res=document.getElementById('scannerProductResult'),manual=document.querySelector('.scannerManual'),info=document.getElementById('scannerInfo');if(r){r.style.display='block';r.innerHTML=''}if(res){res.hidden=true;res.innerHTML=''}if(manual)manual.style.display='flex';if(info){info.style.display='block';info.textContent=target==='sale'?'Modo caja: escanea productos uno tras otro. Cada lectura se agrega a la venta.':'Apunta la cámara al código de barras. La lectura será automática.'}const m=document.getElementById('scannerManualCode');if(m)m.value=''}
    async function stopCamera(){try{if(torchOn)await setTorch(false)}catch{}torchOn=false;const current=scanner;scanner=null;if(!current)return;try{const state=current.getState?.();if(state===2||state===3)await current.stop()}catch{}try{await current.clear()}catch{}}
    async function closeScanner(){await stopCamera();try{if(dialog.open)dialog.close()}catch{}opening=false;finishing=false;resetUI()}
    function cameraConfig(){return {facingMode:'environment'}}
    let lastCameraCode='',lastCameraSeen=0;
    function acceptCameraRead(decoded){
      const code=norm(decoded),now=performance.now();
      if(!code||finishing)return;
      const duplicate=code===lastCameraCode&&now-lastCameraSeen<600;
      lastCameraCode=code;lastCameraSeen=now;
      // A barcode held in view counts once. A different product is ready immediately.
      if(!duplicate)finish(code);
    }
    async function startCamera(){lastCameraCode='';lastCameraSeen=0;const reader=document.getElementById('vareliaReader');if(!reader)throw new Error('SCANNER_READER_MISSING');reader.innerHTML='';reader.style.display='block';const F=window.Html5QrcodeSupportedFormats||{};const formats=['EAN_13','EAN_8','UPC_A','UPC_E','CODE_128','CODE_39','ITF','CODABAR'].map(k=>F[k]).filter(v=>v!==undefined);const config={fps:15,disableFlip:true};const onSuccess=acceptCameraRead;const cam=cameraConfig();scanner=new Html5Qrcode('vareliaReader',{verbose:false,formatsToSupport:formats.length?formats:undefined,experimentalFeatures:{useBarCodeDetectorIfSupported:true}});try{const r=await scanner.start(cam,config,onSuccess,()=>{});try{Promise.resolve(scanner.applyVideoConstraints?.({advanced:[{focusMode:'continuous'}]})).catch(()=>{})}catch{}ensureTorchButton();return r}catch(first){if(/NotAllowed|Permission|NotFound|DevicesNotFound|denied/i.test(String(first?.name||'')+' '+String(first?.message||first)))throw first;console.warn('Primer intento de cámara falló; reintentando cámara trasera',first);await stopCamera();reader.innerHTML='';scanner=new Html5Qrcode('vareliaReader',{verbose:false,formatsToSupport:formats.length?formats:undefined,experimentalFeatures:{useBarCodeDetectorIfSupported:true}});try{const r=await scanner.start({facingMode:'environment'},config,onSuccess,()=>{});try{Promise.resolve(scanner.applyVideoConstraints?.({advanced:[{focusMode:'continuous'}]})).catch(()=>{})}catch{}ensureTorchButton();return r}catch(second){console.error('No se pudo iniciar lector de códigos',second);throw second}}}
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
    async function openScanner(which){if(opening)return;target=which;dialog.dataset.scanTarget=which;finishing=false;if((!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)&&openNativeScanner(which))return;opening=true;ensureScannerCartPanel();resetUI();renderScannerCart();try{if(!window.isSecureContext)throw new Error('HTTPS_REQUIRED');if(!navigator.mediaDevices?.getUserMedia)throw new Error('CAMERA_UNSUPPORTED');if(!dialog.open)dialog.showModal();const info=document.getElementById('scannerInfo');if(info)info.textContent='Encendiendo cámara…';dialog.dataset.cameraLoading='1';await Promise.all([stopCamera(),loadLib()]);if(!dialog.open)return;await startCamera();delete dialog.dataset.cameraLoading;if(info)info.textContent=target==='sale'?'Modo caja: escanea productos uno tras otro. Cada lectura se agrega a la venta.':'Apunta la cámara al código de barras. La lectura será automática.'}catch(e){console.error('Scanner',e);await stopCamera();const msg=String(e?.name||'')+' '+String(e?.message||e);window.vareliaSound?.('error');if(/NotAllowed|Permission|denied/i.test(msg))alert('Permite la cámara en Chrome para poder escanear.');else if(/NotFound|DevicesNotFound/i.test(msg))alert('No se encontró una cámara disponible en este equipo.');else if(/NotReadable|TrackStart|Could not start video source/i.test(msg))alert('La cámara está ocupada. Cierra otra app que use la cámara y vuelve a intentarlo.');else if(/HTTPS_REQUIRED/.test(msg))alert('Abre Varelia usando https:// para usar la cámara.');else alert('No se pudo iniciar la cámara. Puedes escribir el código en esta ventana y pulsar Usar, o volver a intentar.')}finally{delete dialog.dataset.cameraLoading;opening=false}}
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
        restoreScannerCartBackup(false);try{localStorage.removeItem(SCANNER_CART_BACKUP_KEY)}catch{}
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
          // Refresh layout without restoring an obsolete quantity over user edits.
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
    async function finish(raw){if(finishing)return;finishing=true;const code=norm(raw);if(!code){finishing=false;return}window.vareliaSound?.('scan');if(target!=='sale')await stopCamera();let p=findProduct(code);
      if(target==='product'){await offerNewProduct(code);finishing=false;return}
      if(target==='inventory'){const el=document.getElementById('inventoryCode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}if(p&&typeof selectInv==='function'){selectInv(p);window.vareliaToast?.('Producto encontrado: '+p.name,'ok')}else window.vareliaToast?.('Código leído, pero no corresponde a un producto de este negocio.','warn');await closeScanner();return}
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

          // Keep the same stream, focus and torch across consecutive reads.
          if(added&&!med&&!weight){
            try{renderScannerCart()}catch{}

          }
          finishing=false;return;
        }
        window.vareliaSound?.('error');
        const info=document.getElementById('scannerInfo');if(info){info.style.display='block';info.textContent='Código '+code+' no vinculado. Puedes seguir escaneando o escribir otro código.'}
        finishing=false;return;
      }
      if(p){renderCard(p,code);finishing=false;return}
      if(target==='inventory'||target==='product'){await offerNewProduct(code);finishing=false;return}
      window.vareliaSound?.('error');alert('Código leído: '+code+'\nEste código todavía no está vinculado a un producto.');finishing=false;resetUI();try{if(dialog.open)dialog.close()}catch{}
    }
    if(saleSearch&&!saleSearch.dataset.posEnter){saleSearch.dataset.posEnter='1';saleSearch.addEventListener('keydown',async e=>{if(e.key!=='Enter')return;const code=norm(saleSearch.value);const p=findProduct(code);if(!p)return;e.preventDefault();await addSaleScan(p);saleSearch.select()})}
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();closeScanner()};dialog.addEventListener('cancel',e=>{e.preventDefault();closeScanner()});document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera()});window.addEventListener('pagehide',()=>stopCamera());
  })
})();
