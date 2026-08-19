(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    let scanner=null,target='inventory',busy=false;
    const productBtn=document.getElementById('scanForProduct'),inventoryBtn=document.getElementById('scanForInventory'),saleBtn=document.getElementById('scanForSale'),dialog=document.getElementById('scannerDialog'),closeBtn=document.getElementById('closeScanner');
    if(!dialog||(!productBtn&&!inventoryBtn&&!saleBtn))return;
    const modal=dialog.querySelector('.modal');
    if(modal&&!document.getElementById('vareliaReader')){
      const oldVideo=document.getElementById('scannerVideo');if(oldVideo)oldVideo.style.display='none';
      const info=document.createElement('div');info.id='scannerInfo';info.style.cssText='padding:9px 0 12px;color:var(--muted);font-size:13px';info.textContent='Apunta la cámara al código de barras. La lectura será automática.';
      const reader=document.createElement('div');reader.id='vareliaReader';reader.style.cssText='width:100%;min-height:280px;border-radius:16px;overflow:hidden;background:#000';
      const manual=document.createElement('div');manual.style.cssText='display:flex;gap:8px;margin-top:12px';manual.innerHTML='<input id="scannerManualCode" placeholder="O escribe el código manualmente"><button type="button" class="btn primary" id="scannerUseManual">Usar</button>';
      modal.appendChild(info);modal.appendChild(reader);modal.appendChild(manual);document.getElementById('scannerUseManual').onclick=()=>{const v=document.getElementById('scannerManualCode').value.trim();if(v)finish(v)};
    }
    function loadLib(){return new Promise((resolve,reject)=>{if(window.Html5Qrcode)return resolve();const s=document.createElement('script');s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
    function norm(v){return String(v??'').trim().replace(/\s+/g,'')}
    function equivalent(a,b){a=norm(a);b=norm(b);if(a===b)return true;if(/^\d+$/.test(a)&&/^\d+$/.test(b)){if(a.length===13&&a[0]==='0'&&a.slice(1)===b)return true;if(b.length===13&&b[0]==='0'&&b.slice(1)===a)return true}return false}
    function findProduct(code){
      let p=null;
      try{if(typeof products!=='undefined'&&Array.isArray(products))p=products.find(x=>equivalent(x.barcode,code))||null}catch{}
      if(p)return p;
      try{
        const key=(typeof K!=='undefined'&&K.products)||'miNegocio_products_v1';
        const stored=JSON.parse(localStorage.getItem(key)||'[]');
        const sp=Array.isArray(stored)?stored.find(x=>equivalent(x.barcode,code)):null;
        if(sp&&typeof products!=='undefined'&&Array.isArray(products)){
          const existing=products.find(x=>String(x.id)===String(sp.id));
          if(existing){Object.assign(existing,sp);p=existing}else{products.push(sp);p=sp}
        }else p=sp||null;
      }catch{}
      return p;
    }
    async function openScanner(which){if(busy)return;target=which;busy=true;try{if(!window.isSecureContext){alert('Para usar la cámara debes abrir Varelia con https://');return}if(!navigator.mediaDevices?.getUserMedia){alert('Este navegador no permite usar la cámara. Abre Varelia directamente en Google Chrome.');return}await loadLib();if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();scanner=new Html5Qrcode('vareliaReader');const formats=[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE];await scanner.start({facingMode:'environment'},{fps:12,qrbox:{width:280,height:150},formatsToSupport:formats,aspectRatio:1.777},text=>finish(text),()=>{})}catch(e){try{if(dialog.open)dialog.close()}catch{}const msg=e?.message||String(e||'');if(/permission|NotAllowed|denied/i.test(msg))alert('Debes permitir el acceso a la cámara para escanear.');else alert('No se pudo abrir la cámara. Prueba abrir Varelia directamente en Google Chrome y permite el acceso a la cámara.')}finally{busy=false}}
    async function stop(){try{if(scanner){await scanner.stop();await scanner.clear()}}catch{}scanner=null;try{if(dialog.open)dialog.close()}catch{}}
    async function finish(code){code=norm(code);if(!code)return;await stop();const p=findProduct(code);
      if(target==='product'){const el=document.getElementById('barcode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}return}
      if(target==='inventory'){const el=document.getElementById('inventoryCode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}if(p&&typeof selectInv==='function'){selectInv(p);return}alert('Código leído: '+code+'\nNo se encontró coincidencia. Revisa que el código guardado del producto sea exactamente el mismo.')}
      if(target==='sale'){const el=document.getElementById('saleSearch');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}if(p&&typeof addToCart==='function'){addToCart(p);return}alert('Código leído: '+code+'\nNo se encontró coincidencia. Revisa que el código guardado del producto sea exactamente el mismo.')}
    }
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();stop()};dialog.addEventListener('cancel',e=>{e.preventDefault();stop()});
  })
})();