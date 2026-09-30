(()=>{
  if(window.__vareliaSimpleMobileNav)return;
  window.__vareliaSimpleMobileNav=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const main=document.querySelector('main.content');
    if(!main)return;

    const style=document.createElement('style');
    style.id='vareliaSimpleMobileNavCss';
    style.textContent=`
      .vmobileNav{display:none}
      .vmobileHub{padding:2px 0 28px}
      .vmobileHubHead{margin-bottom:15px}
      .vmobileHubHead h2{margin:0;font-size:25px}
      .vmobileHubHead p{margin:5px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
      .vmobileHubGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .vmobileHubCard{min-height:108px;border:1px solid var(--line);border-radius:19px;background:var(--card);color:var(--ink);padding:15px;text-align:left;box-shadow:0 8px 24px rgba(15,23,42,.055);display:flex;flex-direction:column;justify-content:space-between;gap:11px}
      .vmobileHubCard:active{transform:scale(.985)}
      .vmobileHubIcon{width:39px;height:39px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 9%,var(--card));color:var(--p);font-size:19px}
      .vmobileHubCard b{display:block;font-size:13px}.vmobileHubCard small{display:block;margin-top:3px;color:var(--muted);font-size:10px;line-height:1.35}
      @media(max-width:980px){
        body.varelia-simple-mobile{padding-bottom:72px}
        body.varelia-simple-mobile #sidebar{display:none!important}
        body.varelia-simple-mobile #overlay{display:none!important}
        body.varelia-simple-mobile #menuBtn{display:none!important}
        body.varelia-simple-mobile #newSaleFab{display:none!important}
        body.varelia-simple-mobile .content{padding-bottom:92px!important}
        .vmobileNav{position:fixed;left:0;right:0;bottom:0;z-index:9990;height:92px;padding:8px max(6px,env(safe-area-inset-left)) calc(8px + env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(6,1fr);background:color-mix(in srgb,var(--card) 97%,transparent);backdrop-filter:blur(16px);border-top:1px solid var(--line);box-shadow:0 -8px 28px rgba(15,23,42,.1)}
        .vmobileNav button{border:0;background:transparent;color:var(--muted);border-radius:13px;display:grid;place-items:center;align-content:center;gap:5px;padding:7px 1px;font-size:10px;font-weight:850;min-width:0;pointer-events:auto!important;touch-action:manipulation;user-select:none;-webkit-tap-highlight-color:transparent}
        .vmobileNav button span{font-size:33px;line-height:1}.vmobileNav button.active{color:var(--p);background:color-mix(in srgb,var(--p) 7%,var(--card))}
        .vmobileNav button.active span{transform:translateY(-1px)}
      }
      @media(max-width:360px){.vmobileNav button{font-size:9px}.vmobileNav button span{font-size:29px}.vmobileHubGrid{gap:8px}.vmobileHubCard{padding:12px}}
    `;
    document.head.appendChild(style);

    document.body.classList.add('varelia-simple-mobile');

    const history=document.createElement('section');
    history.id='mobileHistoryHub';
    history.className='view vmobileHub';
    history.innerHTML=`
      <div class="vmobileHubHead"><h2>Historial</h2><p>Consulta tus resultados, ganancias y cierres sin tener opciones repetidas.</p></div>
      <div class="vmobileHubGrid">
        <button class="vmobileHubCard" type="button" data-mobile-action="reports"><span class="vmobileHubIcon">▥</span><div><b>Reportes</b><small>Ventas, métodos de pago y movimientos.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="profit"><span class="vmobileHubIcon">↗</span><div><b>Ganancias</b><small>Ingresos, costos y utilidad.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="cash"><span class="vmobileHubIcon">▣</span><div><b>Caja y cierres</b><small>Caja activa e historial de cierres.</small></div></button>
      </div>`;
    main.appendChild(history);

    const admin=document.createElement('section');
    admin.id='mobileAdminHub';
    admin.className='view vmobileHub';
    admin.innerHTML=`
      <div class="vmobileHubHead"><h2>Administración</h2><p>Gestiona el equipo, catálogo y operación del negocio.</p></div>
      <div class="vmobileHubGrid">
        <button class="vmobileHubCard" type="button" data-mobile-action="sellers"><span class="vmobileHubIcon">♙</span><div><b>Vendedores</b><small>Cuentas y permisos del equipo.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="categories"><span class="vmobileHubIcon">◇</span><div><b>Categorías</b><small>Organiza los productos.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="purchases"><span class="vmobileHubIcon">▣</span><div><b>Compras</b><small>Ingreso de mercadería.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="suppliers"><span class="vmobileHubIcon">▱</span><div><b>Proveedores</b><small>Directorio de proveedores.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="appearance"><span class="vmobileHubIcon">◉</span><div><b>Apariencia</b><small>Colores y tema.</small></div></button>
        <button class="vmobileHubCard" type="button" data-mobile-action="help"><span class="vmobileHubIcon">?</span><div><b>Ayuda</b><small>Guía rápida de Varelia.</small></div></button>
      </div>`;
    main.appendChild(admin);

    const settings=document.createElement('section');
    settings.id='mobileSettingsHub';
    settings.className='view vmobileHub';
    settings.innerHTML=`
      <div class="vmobileHubHead"><h2>Ajustes</h2><p>Configuración del negocio, pagos, tickets y respaldo.</p></div>
      <div class="vrefPanel"><div class="empty">Cargando configuración…</div></div>`;
    main.appendChild(settings);

    const nav=document.createElement('nav');
    nav.className='vmobileNav';
    nav.id='vmobileNav';
    nav.setAttribute('aria-label','Navegación principal');
    nav.innerHTML=`
      <button type="button" data-mobile-tab="sales"><span>▣</span>Venta</button>
      <button type="button" data-mobile-tab="products"><span>◇</span>Catálogo</button>
      <button type="button" data-mobile-tab="inventory"><span>▥</span>Inventario</button>
      <button type="button" data-mobile-tab="mobileHistoryHub"><span>◷</span>Historial</button>
      <button type="button" data-mobile-tab="mobileAdminHub"><span>▦</span>Admin</button>
      <button type="button" data-mobile-tab="mobileSettingsHub"><span>⚙</span>Ajustes</button>`;
    document.body.appendChild(nav);

    const owner=()=>!window.vareliaCurrentUserProfile||window.vareliaCurrentUserProfile.role==='owner';
    const can=k=>{
      const p=window.vareliaCurrentUserProfile;
      if(!p||p.role==='owner')return true;
      const d={sales:true,products:true,inventory:true,cash:true,reports:false,profit:false,...(p.permissions||{})};
      return !!d[k];
    };

    function rawShow(id){
      const target=document.getElementById(id);
      if(!target)return false;
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===target));
      document.querySelectorAll('#sidebar .nav button').forEach(b=>b.classList.remove('active'));
      setActive(id);
      try{scrollTo({top:0,behavior:'smooth'})}catch{}
      return true;
    }
    function clickView(id){
      const ok=rawShow(id);
      if(!ok)return false;
      const b=document.querySelector('#sidebar .nav [data-view="'+id+'"]');
      if(b)b.classList.add('active');
      try{
        const map={sales:'ventas',products:'productos',inventory:'inventario',categories:'categorias',suppliers:'proveedores',purchases:'mercaderia',cash:'caja',appearance:'apariencia'};
        if(map[id])history.replaceState(null,'',location.pathname+location.search+'#'+map[id]);
      }catch{}
      return true;
    }
    function setActive(id){
      let tab=id;
      if(['reports','profit','cash'].includes(id))tab='mobileHistoryHub';
      if(['sellers','categories','purchases','suppliers','appearance','help'].includes(id))tab='mobileAdminHub';
      nav.querySelectorAll('[data-mobile-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===tab));
    }
    function openExtra(kind){
      if(kind==='reports'&&!can('reports'))return window.vareliaToast?.('No tienes permiso para ver Reportes.','warn');
      if(kind==='profit'&&!can('profit'))return window.vareliaToast?.('No tienes permiso para ver Ganancias.','warn');
      if(document.getElementById(kind)){rawShow(kind);setActive(kind);return}
      try{window.vareliaShowExtraView?.(kind)}catch{}
      if(document.getElementById(kind)){rawShow(kind);setActive(kind);return}
      setTimeout(()=>openExtra(kind),250);
    }
    function openSeller(){
      if(!owner())return window.vareliaToast?.('Solo el propietario administra vendedores.','warn');
      const b=document.querySelector('.premiumSellersItem');
      if(b){b.click();setActive('sellers');return}
      setTimeout(openSeller,250);
    }

    function activateMobileTab(id){
      if(id==='sales'){if(!can('sales'))return window.vareliaToast?.('No tienes permiso para Ventas.','warn');clickView('sales')}
      else if(id==='products'){if(!can('products'))return window.vareliaToast?.('No tienes permiso para Catálogo.','warn');clickView('products')}
      else if(id==='inventory'){if(!can('inventory'))return window.vareliaToast?.('No tienes permiso para Inventario.','warn');clickView('inventory')}
      else if(id==='mobileHistoryHub'||id==='mobileAdminHub'||id==='mobileSettingsHub')rawShow(id);
      setActive(id);
    }
    nav.querySelectorAll('[data-mobile-tab]').forEach(btn=>{
      btn.onclick=e=>{e.preventDefault();e.stopPropagation();activateMobileTab(btn.dataset.mobileTab)};
      btn.addEventListener('pointerdown',e=>{
        if(e.pointerType==='mouse')return;
        e.preventDefault();e.stopPropagation();activateMobileTab(btn.dataset.mobileTab);
      },{passive:false});
    });

    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-mobile-action]');if(!b)return;
      const a=b.dataset.mobileAction;
      if(a==='reports'||a==='profit'||a==='help')return openExtra(a);
      if(a==='sellers')return openSeller();
      if(a==='cash'){if(!can('cash'))return window.vareliaToast?.('No tienes permiso para Caja.','warn');return clickView('cash')}
      if(a==='categories'){if(!can('products'))return window.vareliaToast?.('No tienes permiso para Categorías.','warn');return clickView('categories')}
      if(a==='purchases'||a==='suppliers'){if(!can('inventory'))return window.vareliaToast?.('No tienes permiso para Compras.','warn');return clickView(a)}
      if(a==='appearance'){if(!owner())return window.vareliaToast?.('Solo el propietario puede cambiar los ajustes.','warn');return clickView('appearance')}
    },true);

    // El logo/nombre Varelia funciona como botón Inicio.
    const homeTargets=[document.querySelector('.brand .logo'),document.querySelector('.brand h1'),document.querySelector('.brand .left')].filter(Boolean);
    const goHome=e=>{
      e?.preventDefault?.();
      e?.stopPropagation?.();
      if(rawShow('dashboard')){
        nav.querySelectorAll('[data-mobile-tab]').forEach(b=>b.classList.remove('active'));
        try{history.replaceState(null,'',location.pathname+location.search+'#inicio')}catch{}
      }
    };
    homeTargets.forEach(el=>{
      el.style.cursor='pointer';
      el.addEventListener('click',goHome,true);
      el.addEventListener('pointerdown',ev=>{
        if(ev.pointerType==='mouse')return;
        ev.preventDefault();
        ev.stopPropagation();
        goHome(ev);
      },{passive:false,capture:true});
    });

    // Keep the bottom tab highlighted even when another script changes the visible view.
    document.addEventListener('click',e=>{
      const v=e.target.closest('#sidebar .nav [data-view]');
      if(v)setTimeout(()=>setActive(v.dataset.view),40);
      if(e.target.closest('.premiumReportsItem'))setTimeout(()=>setActive('reports'),40);
      if(e.target.closest('.premiumGainItem'))setTimeout(()=>setActive('profit'),40);
      if(e.target.closest('.premiumSellersItem'))setTimeout(()=>setActive('sellers'),40);
      if(e.target.closest('.premiumHelpItem'))setTimeout(()=>setActive('help'),40);
    },false);

    // On phones/APK, start in Venta like the reference app.
    if(innerWidth<=980){
      setTimeout(()=>{
        const active=document.querySelector('.view.active')?.id;
        if(active)setActive(active);
        else{clickView('sales');setActive('sales')}
      },2200);
    }
  });
})();