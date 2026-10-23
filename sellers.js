(()=>{
  if(window.__vareliaSellers)return;
  window.__vareliaSellers=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const style=document.createElement('style');
    style.id='vareliaSellersCss';
    style.textContent=`
      .vsellersView{padding:2px 0 30px}
      .vsellersHead{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:18px}
      .vsellersHead h2{margin:0;font-size:27px;letter-spacing:-.035em}
      .vsellersHead p{margin:5px 0 0;color:var(--muted);font-size:13px}
      .vsellersAdd{border:0;border-radius:13px;padding:11px 14px;background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff;font-weight:900}
      .vsellersGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .vsellerCard{border:1px solid var(--line);border-radius:18px;background:var(--card);padding:15px;box-shadow:0 10px 28px rgba(15,23,42,.055)}
      .vsellerTop{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
      .vsellerAvatar{width:44px;height:44px;border-radius:15px;display:grid;place-items:center;background:linear-gradient(135deg,#fce7f3,#ede9fe);font-weight:950;color:#a21caf;flex:0 0 auto}
      .vsellerInfo{flex:1;min-width:0}.vsellerInfo b{display:block;font-size:14px}.vsellerInfo small{display:block;color:var(--muted);font-size:11px;margin-top:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .vsellerPerms{display:flex;flex-wrap:wrap;gap:5px;margin-top:12px}.vsellerPerms span{padding:5px 8px;border-radius:999px;background:var(--bg);font-size:10px;font-weight:800;color:var(--muted)}
      .vsellerActions{display:flex;gap:7px;margin-top:13px}.vsellerActions button{flex:1;border:1px solid var(--line);border-radius:11px;background:var(--card);color:var(--ink);padding:9px;font-weight:850}.vsellerActions .danger{color:#be123c;background:#fff1f2;border-color:#fecdd3}
      .vsellerEmpty{padding:28px;text-align:center;border:1px dashed var(--line);border-radius:18px;color:var(--muted)}
      .vsellerModal{position:fixed;inset:0;z-index:100080;display:none;align-items:center;justify-content:center;padding:18px;background:#0f172ab8;backdrop-filter:blur(7px)}
      .vsellerModal.show{display:flex}.vsellerModalCard{width:min(94vw,500px);max-height:92vh;overflow:auto;background:var(--card);color:var(--ink);border-radius:23px;padding:20px;box-shadow:0 30px 80px #0005}
      .vsellerModalHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.vsellerModalHead h3{margin:0}.vsellerModalClose{border:0;width:38px;height:38px;border-radius:12px;background:var(--bg);color:inherit;font-size:22px}
      .vsellerForm{display:grid;gap:11px;margin-top:15px}.vsellerForm label{display:grid;gap:6px;font-size:12px;font-weight:850}.vsellerForm input[type=text],.vsellerForm input[type=email],.vsellerForm input[type=password]{width:100%;border:1px solid var(--line);border-radius:13px;background:var(--card);color:var(--ink);padding:11px 12px}
      .vsellerPermGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.vsellerCheck{display:flex!important;align-items:center;gap:8px!important;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--bg);font-size:11px!important}.vsellerCheck input{width:17px;height:17px}
      .vsellerSave{border:0;border-radius:13px;padding:12px 14px;background:linear-gradient(135deg,#f0066e,#a92bf5);color:#fff;font-weight:900;margin-top:3px}
      .vsellerSave:disabled{opacity:.65}.vsellerMsg{min-height:18px;font-size:11px;color:#b91c1c}
      #vareliaUserRole{display:block;font-size:10px;font-weight:900;color:#cbd5e1;text-transform:uppercase;letter-spacing:.05em}
      body.varelia-seller .premiumPlan,body.varelia-seller #vareliaEditBusinessName{display:none!important}
      @media(max-width:700px){.vsellersGrid{grid-template-columns:1fr}.vsellersHead{flex-direction:column}.vsellersAdd{width:100%}.vsellerPermGrid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);

    let profile=null,sellers=[],editingId='';
    const waitFor=async()=>{for(let i=0;i<80&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,100));return window.vareliaSupabase};

    function initials(name){return String(name||'V').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'V'}
    function toast(t,type='ok'){window.vareliaToast?.(t,type)}
    function permsText(p={}){
      const map=[['sales','Ventas'],['products','Productos'],['inventory','Inventario'],['cash','Caja'],['reports','Reportes'],['profit','Ganancias']];
      return map.filter(([k])=>p[k]).map(([,v])=>v);
    }
    function defaults(){return {sales:true,products:true,inventory:true,cash:true,reports:false,profit:false}}

    function ensureRoleLabel(){
      const email=document.getElementById('vareliaUserEmail');
      if(!email||document.getElementById('vareliaUserRole'))return;
      const span=document.createElement('span');span.id='vareliaUserRole';
      email.insertAdjacentElement('afterend',span);
    }
    function updateRoleLabel(){
      ensureRoleLabel();
      const el=document.getElementById('vareliaUserRole');
      if(el)el.textContent=profile?.role==='owner'?'Administrador / Propietario':'Vendedor';
    }

    function can(key){
      if(!profile||profile.role==='owner')return true;
      const p={...defaults(),...(profile.permissions||{})};
      return !!p[key];
    }
    function applySellerAccess(){
      const isSeller=profile&&profile.role!=='owner';
      document.body.classList.toggle('varelia-seller',!!isSeller);
      updateRoleLabel();
      if(!isSeller)return;

      const set=(sel,ok)=>document.querySelectorAll(sel).forEach(el=>el.style.setProperty('display',ok?'':'none','important'));
      set('.premiumReportsItem',can('reports'));
      set('.premiumGainItem',can('profit'));
      set('.nav [data-view="products"],.nav [data-view="categories"]',can('products'));
      set('.nav [data-view="inventory"],#supplierGroup,.nav [data-view="suppliers"],.nav [data-view="purchases"]',can('inventory'));
      set('.nav [data-view="sales"]',can('sales'));
      set('.nav [data-view="cash"]',can('cash'));
      set('.nav [data-view="appearance"]',false);
      set('.premiumSellersItem',false);

      const active=document.querySelector('.view.active')?.id||'';
      const allowedActive =
        active==='dashboard'||active==='help'||
        (active==='mobileHistoryHub'&&(can('sales')||can('reports')||can('cash')))||
        ((active==='products'||active==='categories')&&can('products'))||
        ((active==='inventory'||active==='suppliers'||active==='purchases')&&can('inventory'))||
        (active==='sales'&&can('sales'))||(active==='cash'&&can('cash'))||
        (active==='reports'&&can('reports'))||(active==='profit'&&can('profit'));
      if(!allowedActive){
        try{window.vareliaShowExtraView?.('help')}catch{}
        const dash=document.querySelector('.nav [data-view="dashboard"]');
        if(dash)dash.click();
      }
    }

    function guardClicks(){
      if(window.__vareliaSellerGuard)return;
      window.__vareliaSellerGuard=true;
      document.addEventListener('click',e=>{
        if(!profile||profile.role==='owner')return;
        const t=e.target.closest('.premiumReportsItem,.premiumGainItem,.nav [data-view]');
        if(!t)return;
        let ok=true;
        if(t.classList.contains('premiumReportsItem'))ok=can('reports');
        else if(t.classList.contains('premiumGainItem'))ok=can('profit');
        else{
          const v=t.dataset.view;
          if(v==='products'||v==='categories')ok=can('products');
          if(v==='inventory'||v==='suppliers'||v==='purchases')ok=can('inventory');
          if(v==='sales')ok=can('sales');
          if(v==='cash')ok=can('cash');
          if(v==='appearance')ok=false;
        }
        if(!ok){e.preventDefault();e.stopImmediatePropagation();toast('No tienes permiso para entrar aquí.','warn')}
      },true);
    }

    function ensureSection(){
      let sec=document.getElementById('sellers');
      if(sec)return sec;
      const main=document.querySelector('main.content');if(!main)return null;
      sec=document.createElement('section');sec.id='sellers';sec.className='view vsellersView';
      sec.innerHTML='<div class="vsellersHead"><div><h2>Vendedores</h2><p>Crea accesos para tu equipo y decide qué puede ver cada vendedor.</p></div><button type="button" class="vsellersAdd" id="vsellersAdd">＋ Agregar vendedor</button></div><div id="vsellersList"></div>';
      main.appendChild(sec);
      sec.querySelector('#vsellersAdd').onclick=()=>openModal();
      return sec;
    }

    function ensureNav(){
      if(profile?.role!=='owner')return;
      const nav=document.querySelector('#sidebar .nav');
      const salesBtn=nav?.querySelector('[data-view="sales"]');
      if(!nav||!salesBtn||nav.querySelector('.premiumSellersItem'))return;
      const b=document.createElement('button');b.type='button';b.className='premiumSellersItem';
      b.innerHTML='<span class="premiumNavIcon">♙</span><span>Vendedores</span>';
      salesBtn.insertAdjacentElement('afterend',b);
      b.onclick=e=>{e.preventDefault();openView()};
    }

    function openView(){
      const sec=ensureSection();if(!sec)return;
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===sec));
      document.querySelectorAll('#sidebar .nav button').forEach(b=>b.classList.toggle('active',b.classList.contains('premiumSellersItem')));
      document.getElementById('sidebar')?.classList.remove('open','show');
      document.getElementById('overlay')?.classList.remove('show');
      renderList();
      loadSellers();
      try{scrollTo({top:0,behavior:'smooth'})}catch{}
    }

    function ensureModal(){
      let m=document.getElementById('vsellerModal');if(m)return m;
      m=document.createElement('div');m.id='vsellerModal';m.className='vsellerModal';
      m.innerHTML=`<div class="vsellerModalCard"><div class="vsellerModalHead"><div><h3 id="vsellerModalTitle">Agregar vendedor</h3><p class="notice" style="margin:4px 0 0">El vendedor usará su correo y contraseña para entrar a Varelia.</p></div><button type="button" class="vsellerModalClose">×</button></div><form class="vsellerForm" id="vsellerForm"><label>Nombre del vendedor<input id="vsellerName" type="text" maxlength="80" required></label><label id="vsellerEmailWrap">Correo<input id="vsellerEmail" type="email" required></label><label id="vsellerPassWrap">Contraseña temporal<input id="vsellerPass" type="password" minlength="6" autocomplete="new-password" required></label><div><b style="font-size:12px">Permisos</b><div class="vsellerPermGrid" style="margin-top:7px"><label class="vsellerCheck"><input type="checkbox" data-perm="sales">Ventas</label><label class="vsellerCheck"><input type="checkbox" data-perm="products">Productos</label><label class="vsellerCheck"><input type="checkbox" data-perm="inventory">Inventario</label><label class="vsellerCheck"><input type="checkbox" data-perm="cash">Caja</label><label class="vsellerCheck"><input type="checkbox" data-perm="reports">Reportes</label><label class="vsellerCheck"><input type="checkbox" data-perm="profit">Ganancias</label></div></div><div class="vsellerMsg" id="vsellerMsg"></div><button class="vsellerSave" id="vsellerSave">Guardar vendedor</button></form></div>`;
      document.body.appendChild(m);
      m.querySelector('.vsellerModalClose').onclick=()=>m.classList.remove('show');
      m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')});
      m.querySelector('#vsellerForm').onsubmit=saveSeller;
      return m;
    }

    function getFormPerms(m){
      const p={};m.querySelectorAll('[data-perm]').forEach(x=>p[x.dataset.perm]=x.checked);return p;
    }
    function setFormPerms(m,p){
      const d={...defaults(),...(p||{})};m.querySelectorAll('[data-perm]').forEach(x=>x.checked=!!d[x.dataset.perm]);
    }
    function openModal(s=null){
      const m=ensureModal();editingId=s?.id||'';
      m.querySelector('#vsellerModalTitle').textContent=s?'Editar vendedor':'Agregar vendedor';
      m.querySelector('#vsellerName').value=s?.name||'';
      m.querySelector('#vsellerEmail').value=s?.email||'';
      m.querySelector('#vsellerPass').value='';
      m.querySelector('#vsellerEmailWrap').style.display=s?'none':'grid';
      m.querySelector('#vsellerPassWrap').style.display=s?'none':'grid';
      m.querySelector('#vsellerEmail').required=!s;
      m.querySelector('#vsellerPass').required=!s;
      m.querySelector('#vsellerMsg').textContent='';
      setFormPerms(m,s?.permissions||defaults());
      m.classList.add('show');
    }

    async function invoke(body){
      const sb=window.vareliaSupabase;
      const {data,error}=await sb.functions.invoke('varelia-sellers',{body});
      if(error){
        let message=error.message||'No se pudo completar la operación';
        try{
          const detail=await error.context?.json?.();
          if(detail?.error)message=detail.error;
        }catch{}
        throw new Error(message);
      }
      if(data?.error)throw new Error(data.error);
      return data;
    }
    async function loadSellers(){
      if(profile?.role!=='owner')return;
      const list=document.getElementById('vsellersList');if(list)list.innerHTML='<div class="vsellerEmpty">Cargando vendedores…</div>';
      try{const data=await invoke({action:'list'});sellers=Array.isArray(data?.sellers)?data.sellers.map(s=>({...s,name:String(s.full_name||s.name||'Vendedor')})):[];renderList()}
      catch(e){if(list)list.innerHTML='<div class="vsellerEmpty">No se pudieron cargar los vendedores.</div>';console.error(e)}
    }
    function renderList(){
      const list=document.getElementById('vsellersList');if(!list)return;
      if(!sellers.length){list.innerHTML='<div class="vsellerEmpty"><b>Aún no tienes vendedores.</b><br><span style="font-size:11px">Toca “Agregar vendedor” para crear el primero.</span></div>';return}
      list.innerHTML='<div class="vsellersGrid">'+sellers.map(s=>`<article class="vsellerCard" data-id="${s.id}"><div class="vsellerTop"><div class="vsellerAvatar">${initials(s.name)}</div><div class="vsellerInfo"><b>${String(s.name||'Vendedor').replace(/[&<>"]/g,'')}</b><small>${String(s.email||'').replace(/[&<>"]/g,'')}</small></div></div><div class="vsellerPerms">${permsText(s.permissions).map(x=>'<span>'+x+'</span>').join('')||'<span>Sin permisos</span>'}</div><button type="button" class="btn secondary" data-seller-history style="width:100%;margin-top:12px">Historial de ventas</button><div class="vsellerActions"><button type="button" data-edit>Editar</button><button type="button" class="danger" data-delete>Eliminar</button></div></article>`).join('')+'</div>';
      list.querySelectorAll('[data-seller-history]').forEach(b=>b.onclick=()=>openSellerHistory(sellers.find(s=>s.id===b.closest('[data-id]').dataset.id)));
      list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(sellers.find(s=>s.id===b.closest('[data-id]').dataset.id)));
      list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteSeller(b.closest('[data-id]').dataset.id));
    }
    const historyEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const historyMoney=n=>'S/ '+Number(n||0).toFixed(2);
    function historyPayments(sale,total){
      const cents=Math.max(0,Math.round(Number(total||0)*100)),out={};
      const label=value=>{const s=String(value||'').trim(),v=s.toLowerCase();return /efectivo|cash/.test(v)?'Efectivo':/yape/.test(v)?'Yape':/plin/.test(v)?'Plin':/transfer/.test(v)?'Transferencia':/tarjeta|card/.test(v)?'Tarjeta':/fiado|cr[eé]dito/.test(v)?'Fiado':/mixto|mixed/.test(v)?'Mixto':s||'Sin registrar'};
      const breakdown=sale?.paymentBreakdown||sale?.payment_breakdown;
      if(breakdown&&typeof breakdown==='object'&&!Array.isArray(breakdown))for(const [k,v] of Object.entries(breakdown)){const n=Number(v);if(Number.isFinite(n)&&n>0){const method=label(k);out[method]=(out[method]||0)+Math.round(n*100)}}
      let sum=Object.values(out).reduce((a,b)=>a+b,0);
      // Cash received can include change: only allocate the sale amount.
      if(sum>cents&&out.Efectivo){const change=Math.min(out.Efectivo,sum-cents);out.Efectivo-=change;sum-=change}
      if(sum>cents)return {'Sin registrar':cents/100};
      if(!sum){const method=label(sale?.paymentMethod||sale?.payment_method);return {[method==='Mixto'?'Sin registrar':method]:cents/100}}
      if(sum<cents)out['Sin registrar']=(out['Sin registrar']||0)+cents-sum;
      return Object.fromEntries(Object.entries(out).filter(([,n])=>n>0).map(([k,n])=>[k,n/100]));
    }

    let historyVersion=0;
    async function openSellerHistory(s){
      if(profile?.role!=='owner'||!profile.business_id||!s)return;
      document.getElementById('vsellerHistory')?.remove();
      const modal=document.createElement('dialog');modal.id='vsellerHistory';
      modal.style.cssText='box-sizing:border-box;width:min(94vw,620px);max-height:90dvh;overflow:auto;border:0;border-radius:20px;padding:18px;background:var(--card);color:var(--ink)';
      modal.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px"><div><h2 style="margin:0;font-size:22px;line-height:1.2">Historial de ventas</h2><p>'+historyEsc(s.name||s.full_name||'Vendedor')+'</p></div><button type="button" data-hclose aria-label="Cerrar historial" class="btn secondary" style="align-self:flex-start;flex:0 0 40px;width:40px;height:40px;min-height:40px;padding:4px;font-size:24px">×</button></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="btn secondary" data-hperiod="today">Hoy</button><button type="button" class="btn secondary" data-hperiod="month">Este mes</button><button type="button" class="btn secondary" data-hperiod="all">Todo</button></div><label style="display:grid;gap:6px;margin-top:12px;font-weight:700">Seleccionar día<input type="date" data-hdate style="box-sizing:border-box;max-width:100%;min-height:44px;padding:10px;border:1px solid var(--line);border-radius:10px;background:var(--card);color:var(--ink)"></label><div data-hbody style="margin-top:14px"></div><div style="display:flex;justify-content:space-between;gap:10px;margin-top:12px"><button type="button" class="btn secondary" data-hprev>Anterior</button><button type="button" class="btn secondary" data-hnext>Siguiente</button></div>';
      document.body.appendChild(modal);let period='today',offset=0,rows=[],cache=null;const dateInput=modal.querySelector('[data-hdate]');const now=new Date();dateInput.value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-');
      const business=profile.business_id,owner=profile.id,sellerId=s.id,pageSize=50;
      const close=()=>{historyVersion++;modal.close();modal.remove()};
      modal.querySelector('[data-hclose]').onclick=close;modal.addEventListener('cancel',e=>{e.preventDefault();close()});
      function stillOwner(){const p=window.vareliaCurrentUserProfile;return profile?.id===owner&&profile?.business_id===business&&profile?.role==='owner'&&(!p||(p.id===owner&&p.business_id===business&&p.role==='owner'))}
      async function read(query){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
        try{const result=await query.abortSignal(controller.signal);if(result.error)throw result.error;return result.data||[]}finally{clearTimeout(timer)}
      }
      async function receipt(row,button){
        if(!stillOwner())return;button.disabled=true;
        try{
          const sb=window.vareliaSupabase;
          const details=await read(sb.from('varelia_sale_details').select('receipt').eq('business_id',business).eq('seller_id',sellerId).eq('sale_id',row.id).limit(1));
          let sale={...(details[0]?.receipt||{}),id:row.id,cloudSaleId:row.id,date:row.created_at,total:Number(row.total),sellerId,sellerName:s.name||s.full_name||'Vendedor'};
          if(!Array.isArray(sale.items)||!sale.items.length){
            const items=await read(sb.from('varelia_sale_items').select('product_id,product_name,qty,unit_price,sale_unit,stock_qty').eq('business_id',business).eq('sale_id',row.id));
            sale.items=items.map(i=>({id:i.product_id,name:i.product_name,qty:Number(i.qty),price:Number(i.unit_price),unit:i.sale_unit,subtotal:Number(i.qty)*Number(i.unit_price)}));
          }
          if(!stillOwner())return;
          if(!window.VareliaReceipt?.show)throw new Error('El visor de tickets todavía no está disponible.');
          // Close the native dialog so it cannot cover the receipt overlay.
          modal.close();window.VareliaReceipt.show(sale);
        }catch(e){toast(e.message||'No se pudo abrir el ticket.','warn')}finally{button.disabled=false}
      }
      async function load(){
        const version=++historyVersion,body=modal.querySelector('[data-hbody]');
        body.textContent='Cargando ventas…';modal.querySelectorAll('[data-hprev],[data-hnext]').forEach(b=>b.disabled=true);
        modal.querySelectorAll('[data-hperiod]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.hperiod===period)));
        try{
          if(!stillOwner())throw new Error('La sesión del negocio cambió. Vuelve a abrir Vendedores.');
          if(!cache){
            const sb=window.vareliaSupabase;let all=[],start=null,end=null;
            if(period!=='all'){
              start=period==='day'?new Date(dateInput.value+'T00:00:00'):new Date();start.setHours(0,0,0,0);
              if(!Number.isFinite(start.getTime()))throw new Error('Selecciona una fecha válida.');
              if(period==='month')start.setDate(1);
              end=new Date(start);if(period==='month')end.setMonth(end.getMonth()+1);else end.setDate(end.getDate()+1);
            }
            for(let skip=0;;skip+=500){
              let query=sb.from('varelia_sales').select('id,total,created_at,created_by').eq('business_id',business).eq('created_by',sellerId).order('created_at',{ascending:false}).order('id',{ascending:false}).range(skip,skip+499);
              if(start)query=query.gte('created_at',start.toISOString()).lt('created_at',end.toISOString());
              const batch=await read(query);if(version!==historyVersion||!stillOwner())return;all.push(...batch);if(batch.length<500)break;
            }
            const receipts=new Map();
            for(let skip=0;skip<all.length;skip+=100){
              const data=await read(sb.from('varelia_sale_details').select('sale_id,receipt').eq('business_id',business).eq('seller_id',sellerId).in('sale_id',all.slice(skip,skip+100).map(r=>r.id)));
              if(version!==historyVersion||!stillOwner())return;
              data.forEach(d=>receipts.set(String(d.sale_id),d.receipt||{}));
            }
            cache=all.map(r=>({...r,receipt:receipts.get(String(r.id))||{},payments:historyPayments(receipts.get(String(r.id)),r.total)}));
          }
          if(version!==historyVersion||!modal.isConnected||!stillOwner())return;
          const hasNext=cache.length>offset+pageSize;rows=cache.slice(offset,offset+pageSize);
          const total=cache.reduce((n,r)=>n+Number(r.total||0),0),payments={Efectivo:0,Yape:0,Plin:0,Transferencia:0,Tarjeta:0};
          cache.forEach(r=>Object.entries(r.payments).forEach(([method,value])=>payments[method]=(payments[method]||0)+value));
          const payText=p=>Object.entries(p).map(([k,v])=>historyEsc(k)+': '+historyMoney(v)).join(' · ');
          const periodText=period==='all'?'Todo el historial':period==='month'?'Este mes':period==='day'?new Date(dateInput.value+'T00:00:00').toLocaleDateString('es-PE'):'Hoy';
          body.innerHTML='<section data-hsummary style="padding:14px;background:var(--bg);border:1px solid var(--line);border-radius:14px"><b>'+historyEsc(periodText)+'</b><p>'+cache.length+' ventas · Total vendido: <strong>'+historyMoney(total)+'</strong></p><b>Ventas por forma de pago</b>'+Object.entries(payments).map(([k,v])=>'<div data-hpayment="'+historyEsc(k)+'" style="display:flex;justify-content:space-between;gap:12px;margin-top:8px"><span>'+historyEsc(k==='Fiado'?'Fiado (venta a crédito)':k)+'</span><strong>'+historyMoney(v)+'</strong></div>').join('')+(payments['Sin registrar']?'<small>Hay ventas antiguas sin información de pago. No se asignan a efectivo.</small>':'')+'</section>'+(rows.length?'<p>Tickets '+(offset+1)+'–'+(offset+rows.length)+' de '+cache.length+'</p>'+rows.map((r,i)=>'<article style="border:1px solid var(--line);border-radius:12px;padding:12px;margin-top:8px"><div style="display:flex;justify-content:space-between;gap:12px"><span>'+historyEsc(new Date(r.created_at).toLocaleString('es-PE'))+'</span><b>'+historyMoney(r.total)+'</b></div><div style="margin-top:8px;font-weight:700">'+payText(r.payments)+'</div>'+(Array.isArray(r.receipt.items)?'<div style="margin-top:6px;color:var(--muted)">'+r.receipt.items.map(item=>historyEsc(item.name||item.product_name||'Producto')+' × '+historyEsc(item.qty??item.quantity??1)).join(' · ')+'</div>':'')+'<button type="button" class="btn secondary" data-hticket="'+i+'" style="margin-top:8px">Ver ticket</button></article>').join(''):'<p>No hay ventas de este vendedor en este período.</p>');
          body.querySelectorAll('[data-hticket]').forEach(b=>b.onclick=()=>receipt(rows[Number(b.dataset.hticket)],b));
          modal.querySelector('[data-hprev]').disabled=offset===0;modal.querySelector('[data-hnext]').disabled=!hasNext;
        }catch(e){if(version===historyVersion&&modal.isConnected){body.textContent='No se pudo cargar el historial. '+(e.message||'Revisa la conexión.');const retry=document.createElement('button');retry.type='button';retry.className='btn secondary';retry.textContent='Reintentar';retry.onclick=load;body.appendChild(retry)}}
      }
      modal.querySelectorAll('[data-hperiod]').forEach(b=>b.onclick=()=>{period=b.dataset.hperiod;offset=0;cache=null;load()});
      dateInput.onchange=()=>{if(!dateInput.value)return;period='day';offset=0;cache=null;load()};
      modal.querySelector('[data-hprev]').onclick=()=>{offset=Math.max(0,offset-pageSize);load()};
      modal.querySelector('[data-hnext]').onclick=()=>{offset+=pageSize;load()};
      modal.showModal();load();
    }

    async function saveSeller(e){
      e.preventDefault();
      const m=ensureModal(),btn=m.querySelector('#vsellerSave'),msg=m.querySelector('#vsellerMsg');
      const name=m.querySelector('#vsellerName').value.trim();
      const permissions=getFormPerms(m);
      btn.disabled=true;msg.textContent='';
      try{
        if(editingId)await invoke({action:'update',sellerId:editingId,name,permissions});
        else await invoke({action:'create',name,email:m.querySelector('#vsellerEmail').value.trim(),password:m.querySelector('#vsellerPass').value,permissions});
        m.classList.remove('show');toast(editingId?'Vendedor actualizado.':'Vendedor creado.');editingId='';await loadSellers();
      }catch(err){msg.textContent=err.message||'No se pudo guardar el vendedor.'}
      finally{btn.disabled=false}
    }
    async function deleteSeller(id){
      const s=sellers.find(x=>x.id===id);if(!s)return;
      if(!confirm('¿Eliminar el acceso de '+s.name+'?'))return;
      try{await invoke({action:'delete',sellerId:id});toast('Vendedor eliminado.');await loadSellers()}
      catch(e){alert('No se pudo eliminar el vendedor: '+(e.message||e))}
    }

    async function loadProfile(){
      const sb=await waitFor();if(!sb)return;
      try{
        const {data:u}=await sb.auth.getUser();const user=u?.user;if(!user)return;
        const {data,error}=await sb.from('profiles').select('id,full_name,business_id,role,permissions').eq('id',user.id).maybeSingle();
        if(error)throw error;
        profile=data||{id:user.id,full_name:user.email?.split('@')[0]||'Usuario',role:'owner',permissions:{}};
        window.vareliaCurrentUserProfile=profile;
        window.vareliaSellerId=profile.id||'';
        window.vareliaSellerName=profile.full_name||user.email?.split('@')[0]||'Usuario';
        window.vareliaSellerRole=profile.role||'owner';
        guardClicks();
        let tries=0;
        const timer=setInterval(()=>{tries++;ensureRoleLabel();ensureNav();ensureSection();applySellerAccess();if(tries>30)clearInterval(timer)},200);
        if(profile.role==='owner')setTimeout(loadSellers,2200);
      }catch(e){console.warn('Vendedores',e)}
    }

    loadProfile();
    window.addEventListener('varelia:business-scope-ready',()=>setTimeout(loadProfile,120));
  window.addEventListener('varelia:account-isolation-ready',()=>setTimeout(loadProfile,120));
  });
})();
