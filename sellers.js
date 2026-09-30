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
      if(error)throw new Error(error.message||'No se pudo completar la operación');
      if(data?.error)throw new Error(data.error);
      return data;
    }
    async function loadSellers(){
      if(profile?.role!=='owner')return;
      const list=document.getElementById('vsellersList');if(list)list.innerHTML='<div class="vsellerEmpty">Cargando vendedores…</div>';
      try{const data=await invoke({action:'list'});sellers=Array.isArray(data?.sellers)?data.sellers:[];renderList()}
      catch(e){if(list)list.innerHTML='<div class="vsellerEmpty">No se pudieron cargar los vendedores.</div>';console.error(e)}
    }
    function renderList(){
      const list=document.getElementById('vsellersList');if(!list)return;
      if(!sellers.length){list.innerHTML='<div class="vsellerEmpty"><b>Aún no tienes vendedores.</b><br><span style="font-size:11px">Toca “Agregar vendedor” para crear el primero.</span></div>';return}
      list.innerHTML='<div class="vsellersGrid">'+sellers.map(s=>`<article class="vsellerCard" data-id="${s.id}"><div class="vsellerTop"><div class="vsellerAvatar">${initials(s.name)}</div><div class="vsellerInfo"><b>${String(s.name||'Vendedor').replace(/[&<>"]/g,'')}</b><small>${String(s.email||'').replace(/[&<>"]/g,'')}</small></div></div><div class="vsellerPerms">${permsText(s.permissions).map(x=>'<span>'+x+'</span>').join('')||'<span>Sin permisos</span>'}</div><div class="vsellerActions"><button type="button" data-edit>Editar</button><button type="button" class="danger" data-delete>Eliminar</button></div></article>`).join('')+'</div>';
      list.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openModal(sellers.find(s=>s.id===b.closest('[data-id]').dataset.id)));
      list.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>deleteSeller(b.closest('[data-id]').dataset.id));
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
  });
})();