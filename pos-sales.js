(()=>{
  if(window.__vareliaPosSales)return;
  window.__vareliaPosSales=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const wait=setInterval(()=>{
      const salesSec=document.getElementById('sales'),salesList=document.getElementById('salesList'),legacyCart=document.getElementById('cart'),legacyTotal=document.getElementById('saleTotal'),legacyCheckout=document.getElementById('checkout'),saleDialog=document.getElementById('saleDialog'),scanForSale=document.getElementById('scanForSale');
      if(!salesSec||!salesList||!legacyCart||!legacyTotal||!legacyCheckout||!saleDialog||!scanForSale||typeof addToCart!=='function')return;
      clearInterval(wait);
      if(document.getElementById('vareliaPosSales'))return;

      const style=document.createElement('style');
      style.textContent=`
        #sales>.flowRole{display:none!important}
        #sales .head{margin-bottom:14px}
        #vareliaPosSales{display:grid;gap:14px}
        .vposHero,.vposBox,.vposHistory{background:var(--card);border:1px solid var(--line);border-radius:20px;box-shadow:0 10px 28px rgba(15,23,42,.07)}
        .vposHero{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 8%,var(--card)),var(--card))}
        .vposHero h3{font-size:22px;margin:5px 0 3px}.vposHero p{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
        .vposStatus{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:900;color:#047857;background:#d1fae5;border-radius:999px;padding:6px 9px}
        .vposNew{white-space:nowrap}
        .vposBox{padding:16px}
        .vposSearch{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:9px}.vposSearch input{font-size:16px;padding:14px 15px}.vposScan{min-width:132px}
        .vposHelp{display:flex;align-items:center;gap:7px;color:var(--muted);font-size:12px;margin:9px 2px 0}.vposHelp b{color:var(--ink)}
        .vposSuggestions{display:none;margin-top:9px;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)}.vposSuggestions.show{display:block}
        .vposSuggestion{width:100%;border:0;border-bottom:1px solid var(--line);background:var(--card);color:var(--ink);padding:11px 12px;display:flex;justify-content:space-between;gap:12px;text-align:left}.vposSuggestion:last-child{border-bottom:0}.vposSuggestion small{color:var(--muted)}
        .vposTable{margin-top:14px;border:1px solid var(--line);border-radius:16px;overflow:hidden}.vposHead,.vposRow{display:grid;grid-template-columns:minmax(0,1fr) 100px 78px 110px;gap:9px;align-items:center}.vposHead{padding:10px 13px;background:var(--bg);color:var(--muted);font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.04em}.vposRow{padding:13px;border-top:1px solid var(--line)}.vposName b{display:block;font-size:14px}.vposName small{display:block;color:var(--muted);font-size:11px;margin-top:3px}.vposPrice,.vposSubtotal{font-weight:850}.vposSubtotal{text-align:right;color:var(--p)}.vposQty{text-align:center;font-weight:900;background:var(--bg);padding:7px;border-radius:10px}
        .vposEmpty{padding:30px 16px;text-align:center;color:var(--muted);font-size:13px}.vposEmpty strong{display:block;color:var(--ink);font-size:16px;margin-bottom:5px}
        .vposBottom{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:end;margin-top:16px}.vposCount{font-size:12px;color:var(--muted)}.vposCount b{color:var(--ink)}.vposTotal{text-align:right}.vposTotal small{display:block;color:var(--muted);font-weight:800}.vposTotal strong{display:block;color:var(--p);font-size:34px;line-height:1.05;margin-top:3px}.vposCheckout{grid-column:1/-1;width:100%;font-size:17px;padding:15px}
        .vposHistory{overflow:hidden}.vposHistory summary{cursor:pointer;list-style:none;padding:15px 17px;font-weight:900;display:flex;justify-content:space-between;align-items:center}.vposHistory summary::-webkit-details-marker{display:none}.vposHistory summary:after{content:'⌄';color:var(--muted)}.vposHistory[open] summary:after{transform:rotate(180deg)}.vposHistoryBody{border-top:1px solid var(--line);padding:14px}
        #saleDialog.vposBridge{display:none!important}body.vposReset #saleDialog{display:none!important}
        @media(max-width:650px){.vposHero{align-items:flex-start}.vposHero{display:grid}.vposNew{width:100%}.vposSearch{grid-template-columns:1fr}.vposScan{width:100%}.vposHead{display:none}.vposRow{grid-template-columns:minmax(0,1fr) auto}.vposPrice{font-size:12px;color:var(--muted)}.vposQty{grid-column:2;grid-row:1}.vposSubtotal{grid-column:1/-1;border-top:1px dashed var(--line);padding-top:8px;display:flex;justify-content:space-between}.vposSubtotal:before{content:'Subtotal';color:var(--muted);font-weight:700}.vposBottom{grid-template-columns:1fr}.vposTotal{text-align:left}.vposTotal strong{font-size:38px}}
      `;
      document.head.appendChild(style);

      const head=salesSec.querySelector('.head');
      const title=head?.querySelector('h2'),notice=head?.querySelector('.notice');
      if(title)title.textContent='Punto de venta';
      if(notice)notice.textContent='Escanea productos, revisa precios y cobra en segundos.';
      salesSec.querySelectorAll(':scope > .flowRole').forEach(el=>el.remove());

      const root=document.createElement('div');root.id='vareliaPosSales';
      root.innerHTML=`
        <div class="vposHero">
          <div><span class="vposStatus">● Caja lista</span><h3>Caja rápida</h3><p>Funciona como una caja de supermercado: cada lectura agrega el producto y actualiza el total.</p></div>
          <button type="button" class="btn primary vposNew" id="vposNew">+ Nueva venta</button>
        </div>
        <div class="vposBox">
          <div class="vposSearch"><input id="vposInput" autocomplete="off" inputmode="search" placeholder="Escanea código o busca un producto"><button type="button" class="btn secondary vposScan" id="vposScan">📷 Escanear</button></div>
          <div class="vposHelp"><b>Modo continuo:</b> si escaneas el mismo producto otra vez, aumenta la cantidad.</div>
          <div class="vposSuggestions" id="vposSuggestions"></div>
          <div class="vposTable"><div class="vposHead"><span>Producto</span><span>Precio</span><span>Cant.</span><span style="text-align:right">Subtotal</span></div><div id="vposItems"></div></div>
          <div class="vposBottom"><div class="vposCount" id="vposCount">0 productos</div><div class="vposTotal"><small>TOTAL A PAGAR</small><strong id="vposTotal">S/ 0.00</strong></div><button type="button" class="btn primary vposCheckout" id="vposCheckout">💳 Cobrar venta</button></div>
        </div>
        <details class="vposHistory"><summary>Historial de ventas</summary><div class="vposHistoryBody" id="vposHistoryBody"></div></details>`;
      salesList.before(root);
      root.querySelector('#vposHistoryBody').appendChild(salesList);

      const input=root.querySelector('#vposInput'),suggestions=root.querySelector('#vposSuggestions'),itemsEl=root.querySelector('#vposItems'),totalEl=root.querySelector('#vposTotal'),countEl=root.querySelector('#vposCount'),checkoutBtn=root.querySelector('#vposCheckout');
      const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
      const norm=v=>String(v??'').trim().toLowerCase();
      const allProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return []}};
      const byName=name=>allProducts().find(p=>norm(p.name)===norm(name))||null;
      const exactProduct=q=>{q=norm(q);if(!q)return null;return allProducts().find(p=>norm(p.barcode)===q)||allProducts().find(p=>norm(p.name)===q)||null};
      const matches=q=>{q=norm(q);if(!q)return[];return allProducts().filter(p=>norm(p.barcode).includes(q)||norm(p.name).includes(q)).slice(0,7)};

      function legacyRows(){
        try{
          if(Array.isArray(cart)){
            return cart.map(i=>{
              const p=allProducts().find(x=>String(x.id)===String(i.id))||byName(i.name)||{id:i.id,name:i.name,barcode:'',stock:0,sellPrice:i.price};
              const name=String(i.name||p.name||'Producto'),qty=Math.max(1,Number(i.qty)||1),price=Number(i.price??p.sellPrice??0);
              return {p,name,qty,price,subtotal:price*qty};
            });
          }
        }catch(e){console.warn('POS cart',e)}
        return [...legacyCart.querySelectorAll('.cartitem')].map(row=>{
          const name=(row.querySelector('.posCartName b')?.textContent||row.querySelector('span')?.textContent||'').trim();
          let qty=parseInt((row.querySelector('.posCartQty')?.textContent||row.querySelector('strong')?.textContent||'1').replace(/\D/g,''))||1;
          const p=byName(name),price=Number(p?.sellPrice||0);return p?{p,name,qty,price,subtotal:price*qty}:null;
        }).filter(Boolean);
      }
      function sync(){
        const rows=legacyRows();
        if(!rows.length)itemsEl.innerHTML='<div class="vposEmpty"><strong>Escanea el primer producto</strong>Los productos aparecerán aquí con su precio, cantidad y subtotal.</div>';
        else itemsEl.innerHTML=rows.map(x=>`<div class="vposRow"><div class="vposName"><b>${esc(x.name)}</b><small>${esc(x.p.barcode||'Sin código')} · Stock ${Number(x.p.stock||0)}</small></div><div class="vposPrice">S/ ${x.price.toFixed(2)}</div><div class="vposQty">x${x.qty}</div><div class="vposSubtotal">S/ ${x.subtotal.toFixed(2)}</div></div>`).join('');
        const units=rows.reduce((a,x)=>a+x.qty,0),total=rows.reduce((a,x)=>a+x.subtotal,0);
        countEl.innerHTML=`<b>${units}</b> ${units===1?'unidad':'unidades'} · ${rows.length} ${rows.length===1?'producto':'productos'}`;
        totalEl.textContent='S/ '+total.toFixed(2);checkoutBtn.textContent=total>0?'💳 Cobrar S/ '+total.toFixed(2):'💳 Cobrar venta';checkoutBtn.disabled=!rows.length;
        return {rows,units,total};
      }
      new MutationObserver(()=>requestAnimationFrame(sync)).observe(legacyCart,{childList:true,subtree:true,characterData:true});

      function addProduct(p,qty=1){
        if(!p)return false;qty=Math.max(1,Math.floor(Number(qty)||1));
        if(Number(p.stock||0)<=0){window.vareliaSound?.('error');window.vareliaToast?.('Sin stock: '+p.name,'warn');return false}
        try{addToCart(p,qty);window.vareliaSound?.('add');window.vareliaToast?.(`${p.name} · S/ ${Number(p.sellPrice||0).toFixed(2)} agregado`,'ok');setTimeout(sync,0);return true}catch(e){console.error(e);window.vareliaSound?.('error');return false}
      }
      function hideSuggestions(){suggestions.classList.remove('show');suggestions.innerHTML=''}
      function showSuggestions(q){const list=matches(q);if(!list.length){hideSuggestions();return}suggestions.innerHTML=list.map(p=>`<button type="button" class="vposSuggestion" data-pos-id="${esc(p.id)}"><span><b>${esc(p.name)}</b><small>${esc(p.barcode||'Sin código')}</small></span><strong>S/ ${Number(p.sellPrice||0).toFixed(2)}</strong></button>`).join('');suggestions.classList.add('show')}
      suggestions.addEventListener('click',e=>{const b=e.target.closest('[data-pos-id]');if(!b)return;const p=allProducts().find(x=>String(x.id)===String(b.dataset.posId));if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});
      input.addEventListener('input',()=>showSuggestions(input.value));
      input.addEventListener('keydown',e=>{if(e.key!=='Enter')return;const q=input.value.trim(),p=exactProduct(q)||matches(q)[0];if(!p)return; e.preventDefault();if(addProduct(p)){input.value='';hideSuggestions();input.focus()}});

      function bridgeScanner(){saleDialog.classList.add('vposBridge');try{if(!saleDialog.open)saleDialog.show()}catch{}scanForSale.click()}
      root.querySelector('#vposScan').onclick=bridgeScanner;

      function startNew(){
        try{if(saleDialog.open)saleDialog.close()}catch{}saleDialog.classList.remove('vposBridge');document.body.classList.add('vposReset');
        try{if(typeof openSale==='function')openSale()}catch(e){console.warn(e)}
        try{if(saleDialog.open)saleDialog.close()}catch{}document.body.classList.remove('vposReset');input.value='';hideSuggestions();sync();input.focus();window.vareliaToast?.('Nueva venta lista','ok')
      }
      root.querySelector('#vposNew').onclick=startNew;
      checkoutBtn.onclick=()=>{const s=sync();if(!s.rows.length)return;try{legacyCheckout.click();setTimeout(()=>{sync();try{if(typeof renderSales==='function')renderSales()}catch{}window.vareliaToast?.('Venta registrada','ok')},160)}catch(e){console.error(e);window.vareliaSound?.('error')}};

      function goSales(){const nav=document.querySelector('.nav [data-view="sales"]');if(nav)nav.click();else try{switchView('sales')}catch{}setTimeout(()=>{startNew();root.scrollIntoView({behavior:'smooth',block:'start'})},80)}
      document.addEventListener('click',e=>{const b=e.target.closest('#newSaleTop,#newSaleFab');if(!b)return;e.preventDefault();e.stopImmediatePropagation();goSales()},true);
      document.addEventListener('click',e=>{const b=e.target.closest('.nav [data-view="sales"]');if(!b)return;setTimeout(()=>input.focus(),120)},true);

      window.VareliaPOS={addProduct,startNew,sync,isActive:()=>salesSec.classList.contains('active'),focus:()=>input.focus()};
      sync();setTimeout(sync,350);setTimeout(()=>salesSec.querySelectorAll(':scope > .flowRole').forEach(el=>el.remove()),1200);
    },120);
  });
})();