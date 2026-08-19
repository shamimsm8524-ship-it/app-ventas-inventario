(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    const wait=setInterval(()=>{
      if(typeof products==='undefined'||typeof K==='undefined'||!document.getElementById('products'))return;
      clearInterval(wait);

      const style=document.createElement('style');
      style.textContent=`
      .bc-generate{margin-top:7px;width:100%;border:1px dashed color-mix(in srgb,var(--p) 45%,var(--line));background:color-mix(in srgb,var(--p) 6%,var(--card));color:var(--p);border-radius:12px;padding:9px 11px;font-weight:850}
      .bc-toolbar{display:flex;gap:8px;margin:0 0 12px;flex-wrap:wrap}.bc-toolbar button{border:0;border-radius:13px;padding:11px 14px;background:linear-gradient(135deg,var(--p),var(--p2));color:#fff;font-weight:900;box-shadow:0 7px 18px color-mix(in srgb,var(--p) 18%,transparent)}
      .bc-modal{position:fixed;inset:0;z-index:100001;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172a99;backdrop-filter:blur(8px)}.bc-modal.show{display:flex}.bc-card{width:min(96vw,760px);max-height:88vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:24px;padding:18px;box-shadow:0 30px 80px #0005}.bc-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.bc-head h2{margin:0;font-size:22px}.bc-close{width:40px;height:40px;border:0;border-radius:12px;background:var(--bg);color:var(--ink);font-size:22px}.bc-row{display:grid;grid-template-columns:minmax(0,1fr) 92px auto;gap:9px;align-items:center;padding:11px 0;border-bottom:1px solid var(--line)}.bc-row strong{display:block;font-size:14px}.bc-row small{display:block;color:var(--muted);margin-top:2px}.bc-row input{padding:9px 10px}.bc-row button{border:0;border-radius:11px;padding:10px 12px;background:var(--p);color:#fff;font-weight:850}.bc-empty{padding:24px;text-align:center;color:var(--muted)}.bc-status{display:inline-flex;align-items:center;gap:5px;margin-top:5px;padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900}.bc-ok{background:#dcfce7;color:#166534}.bc-bad{background:#fee2e2;color:#991b1b}.bc-note{margin:0 0 12px;padding:10px 12px;border:1px solid var(--line);border-radius:13px;background:color-mix(in srgb,var(--p) 5%,var(--card));font-size:12px;color:var(--muted);line-height:1.45}@media(max-width:560px){.bc-row{grid-template-columns:1fr 78px}.bc-row button{grid-column:1/-1}}
      `;
      document.head.appendChild(style);

      function checkDigit12(s){let sum=0;for(let i=0;i<12;i++)sum+=(+s[i])*(i%2===0?1:3);return String((10-(sum%10))%10)}
      function isValidEAN13(code){code=String(code||'').trim();return /^\d{13}$/.test(code)&&checkDigit12(code.slice(0,12))===code[12]}
      function uniqueEAN(){
        let code='';
        do{
          const base=('20'+Date.now().toString().slice(-8)+Math.floor(Math.random()*100).toString().padStart(2,'0')).slice(0,12);
          code=base+checkDigit12(base);
        }while(products.some(p=>String(p.barcode||'')===code));
        return code;
      }
      function persist(){try{localStorage.setItem(K.products,JSON.stringify(products.map(p=>{const c={...p};delete c.image;return c})));if(typeof save==='function')save()}catch(e){console.warn(e)}}
      function typeOfCode(code){return isValidEAN13(code)?'EAN-13':'CODE128'}
      function statusHtml(code){if(!code)return '<span class="bc-status bc-bad">Sin código</span>';if(isValidEAN13(code))return '<span class="bc-status bc-ok">✓ EAN-13 válido y escaneable</span>';return '<span class="bc-status bc-ok">✓ CODE128 escaneable</span>'}

      const barcodeInput=document.getElementById('barcode');
      if(barcodeInput&&!document.getElementById('bcGenerateOne')){
        const b=document.createElement('button');b.type='button';b.id='bcGenerateOne';b.className='bc-generate';b.textContent='✨ Generar código EAN-13 escaneable';
        barcodeInput.insertAdjacentElement('afterend',b);
        b.onclick=()=>{barcodeInput.value=uniqueEAN();barcodeInput.dispatchEvent(new Event('input',{bubbles:true}));alert('Código EAN-13 válido generado. Ya puede imprimirse y escanearse.')};
      }

      const section=document.getElementById('products');
      const toolbar=section.querySelector('.toolbar');
      if(toolbar&&!document.getElementById('bcToolbar')){
        const wrap=document.createElement('div');wrap.id='bcToolbar';wrap.className='bc-toolbar';
        const open=document.createElement('button');open.type='button';open.textContent='🏷️ Códigos de barras e imprimir';wrap.appendChild(open);
        toolbar.insertAdjacentElement('afterend',wrap);
        open.onclick=()=>openManager();
      }

      const modal=document.createElement('div');modal.id='bcModal';modal.className='bc-modal';
      modal.innerHTML='<div class="bc-card"><div class="bc-head"><div><h2>Códigos de barras</h2><div class="meta">Genera, valida e imprime etiquetas realmente escaneables.</div></div><button class="bc-close" type="button">×</button></div><div class="bc-note">Los códigos nuevos se generan como <b>EAN-13 válido</b>. Las etiquetas se imprimen en negro sobre blanco, con espacio libre alrededor y tamaño suficiente para lectores físicos y cámaras.</div><div id="bcList"></div></div>';
      document.body.appendChild(modal);
      modal.querySelector('.bc-close').onclick=()=>modal.classList.remove('show');
      modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});

      function openManager(){renderList();modal.classList.add('show')}
      function renderList(){
        const list=modal.querySelector('#bcList');
        if(!products.length){list.innerHTML='<div class="bc-empty">Primero crea un producto.</div>';return}
        list.innerHTML=products.map(p=>`<div class="bc-row" data-bcid="${p.id}"><div><strong>${escapeHtml(p.name||'Producto')}</strong><small>${p.barcode?escapeHtml(String(p.barcode)):'Sin código de barras'}</small>${statusHtml(p.barcode)}</div><input type="number" min="1" max="200" value="1" aria-label="Cantidad de etiquetas"><button type="button">${p.barcode?'🖨️ Imprimir':'✨ Generar'}</button></div>`).join('');
        list.querySelectorAll('.bc-row').forEach(row=>row.querySelector('button').onclick=()=>{
          const p=products.find(x=>String(x.id)===row.dataset.bcid);if(!p)return;
          if(!p.barcode){p.barcode=uniqueEAN();persist();renderList();return}
          const qty=Math.max(1,Math.min(200,parseInt(row.querySelector('input').value)||1));printLabels(p,qty);
        });
      }
      function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
      function loadJsBarcode(){return new Promise((resolve,reject)=>{if(window.JsBarcode)return resolve();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
      async function makeSvg(code){await loadJsBarcode();const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');const format=typeOfCode(code);JsBarcode(svg,String(code),{format,width:2.35,height:62,displayValue:true,fontSize:15,textMargin:4,margin:12,background:'#ffffff',lineColor:'#000000'});return svg}
      async function printLabels(p,qty){
        try{await loadJsBarcode()}catch{return alert('No se pudo cargar el generador de códigos. Revisa tu conexión.')}
        let testSvg;
        try{testSvg=await makeSvg(p.barcode)}catch{return alert('El código no se puede convertir a un formato escaneable. Genera uno nuevo.')}
        if(!testSvg.querySelectorAll('rect').length&&!testSvg.querySelectorAll('path').length)return alert('No se pudo validar el código para impresión.');
        const labels=[];
        for(let i=0;i<qty;i++){
          const svg=await makeSvg(p.barcode);
          labels.push(`<div class="label"><div class="name">${escapeHtml(p.name||'Producto')}</div><div class="barcode">${svg.outerHTML}</div><div class="price">S/ ${Number(p.sellPrice||0).toFixed(2)}</div><div class="kind">${typeOfCode(p.barcode)}</div></div>`)
        }
        const w=window.open('','_blank');if(!w)return alert('Tu navegador bloqueó la ventana de impresión. Permite ventanas emergentes para Varelia.');
        w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas - ${escapeHtml(p.name||'Producto')}</title><style>@page{margin:7mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;margin:0;background:#fff;color:#000}.sheet{display:grid;grid-template-columns:repeat(3,minmax(54mm,1fr));gap:4mm}.label{background:#fff;border:1px dashed #cbd5e1;border-radius:2.5mm;padding:3mm 4mm;text-align:center;break-inside:avoid;min-height:38mm;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden}.name{font-size:11px;font-weight:700;max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:1mm}.barcode{width:100%;background:#fff;padding:1mm 2mm}.barcode svg{display:block;width:100%;height:auto;max-height:22mm}.price{font-size:14px;font-weight:800;margin-top:1mm}.kind{font-size:8px;color:#555;margin-top:.5mm}@media print{.label{border-color:#ddd}.sheet{gap:3mm}}</style></head><body><div class="sheet">${labels.join('')}</div><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);w.document.close();
      }
    },120);
  })
})();