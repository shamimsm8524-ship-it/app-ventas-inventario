(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    let scanner=null,target='inventory',starting=false,finishing=false;
    const productBtn=document.getElementById('scanForProduct');
    const inventoryBtn=document.getElementById('scanForInventory');
    const saleBtn=document.getElementById('scanForSale');
    const dialog=document.getElementById('scannerDialog');
    const closeBtn=document.getElementById('closeScanner');
    if(!dialog||(!productBtn&&!inventoryBtn&&!saleBtn))return;

    const modal=dialog.querySelector('.modal');
    const oldVideo=document.getElementById('scannerVideo');
    if(oldVideo)oldVideo.style.display='none';

    let info=document.getElementById('scannerInfo');
    if(!info){info=document.createElement('div');info.id='scannerInfo';info.style.cssText='padding:9px 0 12px;color:var(--muted);font-size:13px';info.textContent='Apunta la cámara al código de barras. La lectura será automática.';modal.appendChild(info)}
    let reader=document.getElementById('vareliaReader');
    if(!reader){reader=document.createElement('div');reader.id='vareliaReader';reader.style.cssText='width:100%;min-height:280px;border-radius:16px;overflow:hidden;background:#000';modal.appendChild(reader)}
    let manual=document.getElementById('scannerManualWrap');
    if(!manual){manual=document.createElement('div');manual.id='scannerManualWrap';manual.style.cssText='display:flex;gap:8px;margin-top:12px';manual.innerHTML='<input id="scannerManualCode" placeholder="O escribe el código manualmente"><button type="button" class="btn primary" id="scannerUseManual">Usar</button>';modal.appendChild(manual)}
    let result=document.getElementById('scannerProductResult');
    if(!result){result=document.createElement('div');result.id='scannerProductResult';result.style.cssText='display:none;margin-top:14px;border:1px solid var(--line);border-radius:18px;padding:14px;background:var(--card);box-shadow:var(--shadow)';modal.appendChild(result)}

    function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
    function norm(v){return String(v??'').trim().replace(/[^0-9A-Za-z]/g,'').toUpperCase()}
    function digits(v){return String(v??'').replace(/\D/g,'')}
    function equivalent(a,b){a=norm(a);b=norm(b);if(!a||!b)return false;if(a===b)return true;const ad=digits(a),bd=digits(b);if(ad&&bd){if(ad===bd)return true;if(ad.replace(/^0+/,'')===bd.replace(/^0+/,''))return true;if(ad.length>=12&&bd.length>=12&&ad.slice(-12)===bd.slice(-12))return true}return false}
    function allStoredProducts(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(!k||!/product/i.test(k))continue;let v;try{v=JSON.parse(localStorage.getItem(k)||'null')}catch{continue}if(Array.isArray(v))for(const x of v)if(x&&typeof x==='object'&&('barcode'in x||'name'in x))out.push(x)}}catch{}return out}
    function findProduct(code){const pool=[];try{if(typeof products!=='undefined'&&Array.isArray(products))pool.push(...products)}catch{}pool.push(...allStoredProducts());const found=pool.find(x=>equivalent(x?.barcode,code));if(!found)return null;try{if(typeof products!=='undefined'&&Array.isArray(products)){const live=products.find(x=>String(x.id)===String(found.id))||products.find(x=>equivalent(x.barcode,code));return live||found}}catch{}return found}
    function persistProducts(){try{if(typeof save==='function'){save();return}if(typeof K!=='undefined'&&K.products&&typeof products!=='undefined')localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})))}catch(e){console.warn(e)}}
    function selectedInventoryProduct(){try{if(typeof inventoryProductId!=='undefined'&&inventoryProductId&&typeof products!=='undefined')return products.find(x=>String(x.id)===String(inventoryProductId))||null}catch{}return null}
    function loadLib(){return new Promise((resolve,reject)=>{if(window.Html5Qrcode)return resolve();const s=document.createElement('script');s.src='https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js?v=3';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}

    async function stopCamera(){
      const current=scanner;scanner=null;
      if(!current)return;
      try{await current.stop()}catch{}
      try{await current.clear()}catch{}
    }
    async function closeScanner(){await stopCamera();try{if(dialog.open)dialog.close()}catch{}finishing=false;starting=false}

    async function openScanner(which){
      if(starting)return;
      target=which;starting=true;finishing=false;
      result.style.display='none';reader.style.display='block';manual.style.display='flex';info.style.display='block';
      reader.innerHTML='';
      try{
        if(!window.isSecureContext)throw new Error('secure');
        if(!navigator.mediaDevices?.getUserMedia)throw new Error('camera');
        await loadLib();
        if(!dialog.open)dialog.showModal();
        await new Promise(r=>setTimeout(r,120));
        scanner=new Html5Qrcode('vareliaReader');
        const formats=[Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.QR_CODE];
        await scanner.start({facingMode:{ideal:'environment'}},{fps:10,qrbox:{width:260,height:150},formatsToSupport:formats},text=>finish(text),()=>{});
      }catch(e){
        await stopCamera();
        try{if(dialog.open)dialog.close()}catch{}
        if(String(e?.name||e).match(/NotAllowed|Permission|denied/i))alert('Debes permitir el acceso a la cámara en Chrome.');
        else alert('No se pudo iniciar el escáner. Cierra Varelia, vuelve a abrirla en Chrome y permite la cámara.');
      }finally{starting=false}
    }

    function showProductCard(p,code){
      const img=p.image?`<img src="${p.image}" style="width:100px;height:100px;object-fit:cover;border-radius:16px;border:1px solid var(--line)">`:`<div style="width:100px;height:100px;border-radius:16px;background:var(--bg);display:grid;place-items:center;color:var(--muted);font-size:12px">Sin imagen</div>`;
      reader.style.display='none';manual.style.display='none';info.style.display='none';
      result.innerHTML=`<div style="display:flex;gap:12px;align-items:center">${img}<div style="min-width:0;flex:1"><div style="font-size:20px;font-weight:900">${esc(p.name||'Producto')}</div><div class="meta">Código: ${esc(code)}</div><div style="margin-top:6px;font-size:16px"><b>Stock: ${Number(p.stock||0)} ${esc(p.unit||'Unidad')}</b></div><div style="margin-top:4px;color:var(--p);font-size:18px;font-weight:900">S/ ${Number(p.sellPrice||0).toFixed(2)}</div></div></div><div style="display:grid;grid-template-columns:90px 1fr 1fr;gap:8px;margin-top:14px"><input id="scannerActionQty" type="number" min="1" value="1" style="text-align:center"><button type="button" class="btn secondary" id="scannerIncrease">➕ Aumentar</button><button type="button" class="btn primary" id="scannerSell">🛒 Vender</button></div><button type="button" class="btn secondary" id="scannerAgain" style="width:100%;margin-top:9px">📷 Escanear otro</button>`;
      result.style.display='block';
      document.getElementById('scannerIncrease').onclick=()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1));const before=+p.stock||0;p.stock=before+q;try{if(typeof addMovement==='function')addMovement(p,'add',q,before,p.stock,'Escáner')}catch{}persistProducts();showProductCard(p,code)};
      document.getElementById('scannerSell').onclick=async()=>{const q=Math.max(1,Math.floor(+document.getElementById('scannerActionQty').value||1));if((+p.stock||0)<q)return alert('No hay suficiente stock.');await closeScanner();try{if(typeof openSale==='function')openSale();for(let i=0;i<q;i++)if(typeof addToCart==='function')addToCart(p)}catch{alert('No se pudo agregar a la venta.')}};
      document.getElementById('scannerAgain').onclick=()=>openScanner(target);
    }

    async function finish(raw){
      if(finishing)return;finishing=true;
      const code=norm(raw);if(!code){finishing=false;return}
      await stopCamera();
      let p=findProduct(code);
      if(target==='product'&&!p){const el=document.getElementById('barcode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}await closeScanner();return}
      if(target==='inventory'){
        const el=document.getElementById('inventoryCode');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}
        if(!p){const selected=selectedInventoryProduct();if(selected){selected.barcode=code;persistProducts();p=selected}}
      }
      if(target==='sale'){const el=document.getElementById('saleSearch');if(el){el.value=code;el.dispatchEvent(new Event('input',{bubbles:true}))}}
      if(p){showProductCard(p,code);finishing=false;return}
      alert('Código leído: '+code+'\nNo pude encontrar el producto registrado.');await closeScanner();
    }

    document.getElementById('scannerUseManual').onclick=()=>{const v=document.getElementById('scannerManualCode').value.trim();if(v)finish(v)};
    if(productBtn)productBtn.onclick=e=>{e.preventDefault();openScanner('product')};
    if(inventoryBtn)inventoryBtn.onclick=e=>{e.preventDefault();openScanner('inventory')};
    if(saleBtn)saleBtn.onclick=e=>{e.preventDefault();openScanner('sale')};
    if(closeBtn)closeBtn.onclick=e=>{e.preventDefault();closeScanner()};
    dialog.addEventListener('cancel',e=>{e.preventDefault();closeScanner()});
  })
})();