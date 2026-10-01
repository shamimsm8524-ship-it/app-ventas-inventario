(()=>{
 if(window.__vareliaKgSaleUiFix)return;window.__vareliaKgSaleUiFix=true;
 const products=()=>{try{return Array.isArray(window.products)?window.products:[]}catch{return[]}};
 const norm=v=>String(v||'').trim().toLowerCase();
 const getProduct=row=>{
   const id=row?.dataset?.posRowId;
   const name=row?.querySelector('.vposName b')?.textContent||'';
   const barcode=(row?.querySelector('.vposName small')?.textContent||'').split('·')[0].trim();
   return products().find(p=>String(p.id)===String(id))||
          products().find(p=>barcode&&String(p.barcode||'').trim()===barcode)||
          products().find(p=>norm(p.name)===norm(name));
 };
 const fix=()=>{
   document.querySelectorAll('#vareliaPosSales #vposItems .vposRow').forEach(row=>{
     const p=getProduct(row);if(!p||norm(p.unit)!=='kg')return;
     const qty=row.querySelector('.vposQty');if(!qty)return;
     row.dataset.kgProduct='1';
     const current=(()=>{try{const i=Array.isArray(window.cart)?window.cart.find(x=>String(x.id)===String(p.id)):null;return Number(i?.qty)||0}catch{return 0}})();
     qty.innerHTML='<button type="button" class="btn secondary vkgChoose" style="width:auto;min-width:128px;padding:9px 11px;font-size:13px">⚖️ '+(current&&current!==1?(current*1000).toFixed(0)+' g':'Elegir peso')+'</button>';
     const price=row.querySelector('.vposPrice');if(price)price.textContent='S/ '+Number(p.sellPrice||0).toFixed(2)+' / kg';
     const small=row.querySelector('.vposName small');if(small&&!small.textContent.includes('kg'))small.textContent=String(p.barcode||'Sin código')+' · Stock '+Number(p.stock||0)+' kg';
     qty.querySelector('.vkgChoose').onclick=e=>{e.preventDefault();e.stopPropagation();window.VareliaWeightSale?.open(p)};
   });
 };
 document.addEventListener('click',e=>{
   const b=e.target.closest('#vareliaPosSales .vkgChoose');if(!b)return;e.preventDefault();e.stopImmediatePropagation();
   const row=b.closest('.vposRow'),p=getProduct(row);if(p)window.VareliaWeightSale?.open(p);
 },true);
 const boot=()=>{fix();const host=document.querySelector('#vareliaPosSales #vposItems');if(host&&!host.dataset.kgObserved){host.dataset.kgObserved='1';new MutationObserver(()=>requestAnimationFrame(fix)).observe(host,{childList:true,subtree:true})}};
 let n=0,t=setInterval(()=>{boot();if(++n>120)clearInterval(t)},200);
 addEventListener('pageshow',()=>setTimeout(boot,100));
 addEventListener('varelia:central-stock-updated',()=>setTimeout(boot,50));
})();