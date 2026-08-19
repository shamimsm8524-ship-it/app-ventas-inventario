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
    function norm(v){return String(v??'').trim().replace(/[^0-9A-Za-z]/g,'').toUpperCase()}
    function digits(v){return String(v??'').replace(/\D/g,'')}
    function equivalent(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;if(a===b)return true;const ad=digits(a),bd=digits(b);if(ad&&bd){if(ad===bd)return true;if(ad.replace(/^0+/,'')===bd.replace(/^0+/,''))return true;if(ad.length>=12&&bd.length>=12&&ad.slice(-12)===bd.slice(-12))return true}return false}
    function allStoredProducts(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!/product/i.test(k))continue;let v;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch{continue}if(Array.isArray(v))for(const x of v)if(x&&typeof x==='object'&&('barcode'in x||'name'in x))out.push(x)}}catch{}return out}
    function findProduct(code){let pools=[];try{if(typeof products!=='undefined'&&Array.isArray(products))pools.push(...products)}catch{}pools.push(...allStoredProducts());const p=pools.find(x=>equivalent(x?.barcode,code));if(!p)return null;try{if(typeof products!=='undefined'&&Array.isArray(products)){const live=products.find(x=>String(x.id)===String(p.id))||products.find(x=>equivalent(x.barcode,code));if(live)return live;products.push(p)}}catch{}return p}
    function persistProducts(){try{if(typeof K!=='undefined'&&K.products&&typeof products!=='undefined')localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})));if(typeof save==='function')save()}catch(e){console.warn(e)}}
    function selectedInventoryProduct(){try{if(typeof inventoryProductId!=='undefined'&&inventoryProductId&&typeof products!=='undefined')return products.find(x=>String(x.id)===String(inventoryProductId))||null}catch{}return null}
    async function openScanner(which){if(busy)return;target=which;busy=true;try{if(!window.isSecureContext){alert('Para usar la cámara debes abrir Varelia con https://');return}if(!navigator.mediaDevices?.getUserMedia){alert('Este navegador no permite usar la cámara. Abre Varelia directamente en Google Chrome.');return}await loadLib();if(typeof dialog.showModal==='function'&&!dialog.open)dialog.showModal();scanner=new Html5Qrcode('vareliaReader');const formats=[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE];await scanner.start({facingMode:'environment'},{fps:12,qrbox:{width:280,height:150},formatsToSupport:formats,aspectRatio:1.777},text=>finish(text),()=>{})}catch(e){try{if(dialog.open)dialog.close()}catch{}alert('No se pudo abrir la cámara. Verifica el permiso de cámara en Chrome.')}finally{busy=false}}
    async function stop(){try{if(scanner){await scanner.stop();await scanner.clear()}}catch{}scanner=null;try{if(dialog.open)dialog.close()}catch{}}
    async function finish(code){code=norm(code);if(!code)return;await stop();let p=findProduct(code);
      if(target==='product'){const el=document.getElementById('barcode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}return}
      if(target==='inventory'){
        const el=document.getElementById('inventoryCode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}
        if(!p){const selected=selectedInventoryProduct();if(selected){selected.barcode=code;persistProducts();p=selected}}
        if(p&&typeof selectInv==='function'){selectInv(p);return}
        alert('Código leído: '+code+'\nNo pude asociarlo a un producto. Selecciona primero el producto y vuelve a escanear para vincularlo automáticamente.');return
      }
      if(target==='sale'){
        const el=document.getElementById('saleSearch');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}
        if(p&&typeof addToCart==='function'){addToCart(p);return}
        alert('Código leído: '+code+'\nNo pude encontrar el producto para la venta.');
      }
    }
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();stop()};dialog.addEventListener('cancel',e=>{e.preventDefault();stop()});
  })
})();