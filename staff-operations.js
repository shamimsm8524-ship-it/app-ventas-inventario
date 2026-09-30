(()=>{
  if(window.__vareliaStaffOperations)return;
  window.__vareliaStaffOperations=true;

  const toast=(m,t='warn')=>window.vareliaToast?window.vareliaToast(m,t):alert(m);
  const getProfile=()=>window.vareliaCurrentUserProfile||null;
  const isStaff=()=>{const p=getProfile();return !!p&&String(p.role||'owner')!=='owner'};
  const getProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  const style=document.createElement('style');
  style.id='vareliaStaffOperationsCss';
  style.textContent=`
    #vstaffQuickQtyWrap{display:grid;gap:3px;min-width:92px}
    #vstaffQuickQtyWrap span{font-size:10px;font-weight:900;color:var(--muted);text-transform:uppercase}
    #vstaffQuickQty{width:92px!important;min-width:92px!important;text-align:center!important;font-size:18px!important;font-weight:950!important;padding:10px!important}
    #vstaffOpsCard{margin:0 0 16px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
    #vstaffOpsCard h3{margin:0 0 5px;font-size:15px}#vstaffOpsCard p{margin:0 0 12px;color:var(--muted);font-size:12px}
    .vstaffOpsButtons{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .vstaffOpBtn{border:0;border-radius:13px;padding:13px 11px;font-weight:900;font-size:13px;background:var(--bg);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}
    .vstaffOpBtn.return{background:#ecfdf5;color:#047857;box-shadow:inset 0 0 0 1px #a7f3d0}
    .vstaffOpBtn.restock{background:#eff6ff;color:#1d4ed8;box-shadow:inset 0 0 0 1px #bfdbfe}
    #vstaffStockDialog{width:min(92vw,480px);border:0;border-radius:22px;padding:0;background:var(--card);color:var(--ink);box-shadow:0 28px 90px #0005}
    #vstaffStockDialog::backdrop{background:#0f172a99;backdrop-filter:blur(4px)}
    .vstaffStockCard{padding:20px}.vstaffStockHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vstaffStockHead h3{margin:0}
    .vstaffStockClose{border:0;width:38px;height:38px;border-radius:11px;background:var(--bg);color:inherit;font-size:22px}
    .vstaffStockForm{display:grid;gap:12px;margin-top:15px}.vstaffStockForm label{display:grid;gap:6px;font-size:12px;font-weight:850}
    .vstaffStockForm select,.vstaffStockForm input{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:12px}
    .vstaffStockSave{border:0;border-radius:13px;padding:13px;background:var(--p);color:#fff;font-weight:900}
    #vstaffPosReturn{margin-left:8px}
    @media(max-width:650px){
      #vareliaPosSales .vposSearch{grid-template-columns:minmax(0,1fr) 88px!important}
      #vareliaPosSales .vposSearch #vposScan{grid-column:1/-1}
      #vstaffQuickQtyWrap{min-width:88px}#vstaffQuickQty{width:88px!important;min-width:88px!important}
      .vstaffOpsButtons{grid-template-columns:1fr}
      #vstaffPosReturn{margin-left:0;margin-top:8px;width:100%}
    }
  `;
  document.head.appendChild(style);

  function ensureQuickQty(){
    const search=document.querySelector('#vareliaPosSales .vposSearch');
    const input=document.getElementById('vposInput');
    const scan=document.getElementById('vposScan');
    if(!search||!input||!scan)return false;
    if(!document.getElementById('vstaffQuickQtyWrap')){
      const wrap=document.createElement('label');
      wrap.id='vstaffQuickQtyWrap';
      wrap.innerHTML='<span>Cantidad</span><input id="vstaffQuickQty" type="number" inputmode="numeric" min="1" step="1" value="1">';
      search.insertBefore(wrap,scan);
    }
    search.style.gridTemplateColumns='minmax(0,1fr) 92px auto';
    return true;
  }

  function quickQty(){
    const el=document.getElementById('vstaffQuickQty');
    return Math.max(1,Math.floor(Number(el?.value)||1));
  }

  function resetQuickQty(){
    const el=document.getElementById('vstaffQuickQty');if(el)el.value='1';
  }

  document.addEventListener('click',e=>{
    const suggestion=e.target.closest?.('#vposSuggestions [data-pos-id]');
    if(!suggestion)return;
    const qty=quickQty();
    if(qty<=1)return;
    const p=getProducts().find(x=>String(x.id)===String(suggestion.dataset.posId));
    if(!p)return;
    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    if(window.VareliaPOS?.addProduct?.(p,qty)){
      resetQuickQty();
      const s=document.getElementById('vposSuggestions');if(s){s.innerHTML='';s.classList.remove('show')}
      const input=document.getElementById('vposInput');if(input){input.value='';input.focus()}
    }
  },true);

  function setCartQtyById(id,value){
    try{
      if(!Array.isArray(cart))return;
      const item=cart.find(x=>String(x.id)===String(id));
      const p=getProducts().find(x=>String(x.id)===String(id));
      if(!item||!p)return;
      const max=Math.max(1,Math.floor(Number(p.stock)||1));
      let q=Math.max(1,Math.min(Math.floor(Number(value)||1),max));
      item.qty=q;
      try{if(typeof renderCart==='function')renderCart()}catch{}
      try{window.VareliaPOS?.sync?.()}catch{}
    }catch(err){console.error(err)}
  }

  document.addEventListener('click',e=>{
    const plus=e.target.closest?.('[data-pos-plus],[data-force-plus]');
    const minus=e.target.closest?.('[data-pos-minus],[data-force-minus]');
    if(!plus&&!minus)return;
    const btn=plus||minus;
    let id=btn.dataset.posPlus||btn.dataset.posMinus||'';
    if(!id && (btn.dataset.forcePlus!=null||btn.dataset.forceMinus!=null)){
      const idx=Number(btn.dataset.forcePlus??btn.dataset.forceMinus);
      try{id=String(cart?.[idx]?.id||'')}catch{}
    }
    if(!id)return;
    let current=1;try{current=Number(cart.find(x=>String(x.id)===id)?.qty)||1}catch{}
    e.preventDefault();e.stopImmediatePropagation();e.stopPropagation();
    setCartQtyById(id,current+(plus?1:-1));
  },true);

  document.addEventListener('input',e=>{
    const inp=e.target.closest?.('[data-pos-qty],[data-force-qty]');
    if(!inp)return;
    let id=inp.dataset.posQty||'';
    if(!id&&inp.dataset.forceQty!=null){try{id=String(cart?.[Number(inp.dataset.forceQty)]?.id||'')}catch{}}
    if(id)setCartQtyById(id,inp.value);
  },true);

  function ensureDialog(){
    let d=document.getElementById('vstaffStockDialog');
    if(d)return d;
    d=document.createElement('dialog');
    d.id='vstaffStockDialog';
    d.innerHTML=`<div class="vstaffStockCard">
      <div class="vstaffStockHead"><div><h3 id="vstaffStockTitle">Movimiento de mercadería</h3><div style="font-size:11px;color:var(--muted);margin-top:4px">Selecciona producto y cantidad.</div></div><button type="button" class="vstaffStockClose">×</button></div>
      <form class="vstaffStockForm" id="vstaffStockForm">
        <label>Producto<select id="vstaffStockProduct"></select></label>
        <label>Cantidad<input id="vstaffStockQty" type="number" inputmode="numeric" min="1" step="1" value="1" required></label>
        <input id="vstaffStockEvent" type="hidden" value="restock">
        <button class="vstaffStockSave" type="submit">Confirmar</button>
      </form>
    </div>`;
    document.body.appendChild(d);
    d.querySelector('.vstaffStockClose').onclick=()=>d.close();
    d.querySelector('#vstaffStockForm').onsubmit=submitStock;
    return d;
  }

  function fillProducts(d){
    const sel=d.querySelector('#vstaffStockProduct');
    const list=getProducts().filter(p=>Number(p.stock)>=0);
    sel.innerHTML=list.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} · Stock ${Number(p.stock)||0}</option>`).join('');
  }

  function openStock(event){
    const d=ensureDialog();
    fillProducts(d);
    if(!d.querySelector('#vstaffStockProduct').options.length)return toast('No hay productos disponibles.');
    d.querySelector('#vstaffStockEvent').value=event;
    d.querySelector('#vstaffStockQty').value='1';
    d.querySelector('#vstaffStockTitle').textContent=event==='return'?'↩ Devolver mercadería':'📦 Reponer mercadería';
    d.querySelector('.vstaffStockSave').textContent=event==='return'?'Registrar devolución':'Registrar reposición';
    d.showModal();
  }

  async function submitStock(e){
    e.preventDefault();
    const d=ensureDialog();
    const id=d.querySelector('#vstaffStockProduct').value;
    const qty=Math.max(1,Math.floor(Number(d.querySelector('#vstaffStockQty').value)||1));
    const event=d.querySelector('#vstaffStockEvent').value==='return'?'return':'restock';
    const p=getProducts().find(x=>String(x.id)===String(id));
    if(!p)return toast('Selecciona un producto.');
    if(typeof window.vareliaCentralStockIn!=='function')return toast('Actualiza la página y vuelve a intentarlo.');
    const saveBtn=d.querySelector('.vstaffStockSave');saveBtn.disabled=true;
    try{
      await window.vareliaCentralStockIn({product:p,event,qty});
      d.close();
      toast(event==='return'
        ? 'Devolución registrada. '+qty+' unidad(es) regresaron al stock.'
        : 'Reposición registrada. Se agregaron '+qty+' unidad(es) al stock.','ok');
    }catch(err){
      console.error(err);toast(err?.message||'No se pudo registrar el movimiento.');
    }finally{saveBtn.disabled=false}
  }

  function ensureOps(){
    if(!isStaff())return false;
    const inv=document.getElementById('inventory');
    if(inv&&!document.getElementById('vstaffOpsCard')){
      const card=document.createElement('div');
      card.id='vstaffOpsCard';
      card.innerHTML='<h3>Movimientos permitidos al personal</h3><p>Estas operaciones son las únicas que pueden aumentar el stock.</p><div class="vstaffOpsButtons"><button type="button" class="vstaffOpBtn restock" data-vstaff-op="restock">📦 Reponer mercadería</button><button type="button" class="vstaffOpBtn return" data-vstaff-op="return">↩ Devolver mercadería</button></div>';
      const head=inv.querySelector('.head');
      if(head)head.insertAdjacentElement('afterend',card);else inv.prepend(card);
    }

    const hero=document.querySelector('#vareliaPosSales .vposHero');
    if(hero&&!document.getElementById('vstaffPosReturn')){
      const b=document.createElement('button');
      b.id='vstaffPosReturn';b.type='button';b.className='btn secondary';b.textContent='↩ Devolución';
      b.onclick=()=>openStock('return');
      hero.appendChild(b);
    }
    return true;
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest?.('[data-vstaff-op]');
    if(!b)return;
    e.preventDefault();openStock(b.dataset.vstaffOp);
  });

  function tick(){
    ensureQuickQty();
    ensureOps();
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;tick();if(tries>160)clearInterval(timer)},250);
  new MutationObserver(()=>tick()).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('pageshow',()=>setTimeout(tick,100));
})();