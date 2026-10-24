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
      .vmobileHubHead p{margin:5px 0 0;color:var(--muted);font-size:12px}
      .vmobileHubGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}
      .vmobileHubCard{min-height:108px;border:1px solid var(--line);border-radius:19px;background:var(--card);color:var(--ink);padding:15px;text-align:left;box-shadow:0 8px 24px rgba(15,23,42,.055);display:flex;flex-direction:column;justify-content:space-between;gap:11px}
      .vmobileHubIcon{width:39px;height:39px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 9%,var(--card));color:var(--p);font-size:19px}
      .vmobileHubCard b{display:block;font-size:13px}
      .vmobileHubCard small{display:block;margin-top:3px;color:var(--muted);font-size:10px}
      .vdelivery{margin-top:14px}.vdelivery h3{margin:0 0 5px}.vdelivery p{margin:0 0 12px;color:var(--muted);font-size:12px}
      .vdeliveryRow{display:grid;grid-template-columns:minmax(0,1fr) 112px;gap:10px;align-items:center;padding:12px 0;border-top:1px solid var(--line)}
      .vdeliveryMethod{display:flex;align-items:center;gap:9px;font-weight:850}.vdeliveryMethod input{width:20px;height:20px;accent-color:var(--p)}
      .vdeliveryPrice{position:relative}.vdeliveryPrice:before{content:'S/';position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px;font-weight:850;color:var(--muted)}
      .vdeliveryPrice input{padding-left:31px;text-align:right}.vdeliveryHint{font-size:11px;color:var(--muted);line-height:1.4}.vdeliverySave{width:100%;margin-top:12px}

      @media(max-width:980px){
        body.varelia-simple-mobile{padding-bottom:72px}
        body.varelia-simple-mobile #sidebar,body.varelia-simple-mobile #overlay,body.varelia-simple-mobile #menuBtn,body.varelia-simple-mobile #newSaleFab{display:none!important}
        body.varelia-simple-mobile .content{padding-bottom:98px!important}

        html body #vmobileNav.vmobileNav{
          position:fixed!important;
          left:12px!important;
          right:12px!important;
          bottom:max(8px,env(safe-area-inset-bottom))!important;
          z-index:9990!important;
          height:88px!important;
          min-height:88px!important;
          padding:7px 7px 8px!important;
          display:grid!important;
          grid-template-columns:repeat(6,minmax(0,1fr))!important;
          align-items:center!important;
          background:rgba(255,255,255,.97)!important;
          backdrop-filter:blur(18px)!important;
          -webkit-backdrop-filter:blur(18px)!important;
          border:1px solid rgba(148,163,184,.22)!important;
          border-radius:24px!important;
          box-shadow:0 10px 28px rgba(15,23,42,.14)!important;
          overflow:visible!important;
        }

        html body #vmobileNav.vmobileNav button{
          min-width:0!important;
          height:72px!important;
          min-height:72px!important;
          padding:3px 1px 2px!important;
          border:0!important;
          border-radius:18px!important;
          background:transparent!important;
          background-image:none!important;
          color:#475569!important;
          box-shadow:none!important;
          display:grid!important;
          grid-template-rows:44px auto!important;
          place-items:center!important;
          align-content:center!important;
          gap:4px!important;
          font-size:10px!important;
          line-height:1!important;
          font-weight:850!important;
          letter-spacing:-.01em!important;
          transition:transform .16s ease,color .16s ease!important;
          -webkit-tap-highlight-color:transparent!important;
        }
        html body #vmobileNav.vmobileNav button:active{transform:scale(.95)!important}

        html body #vmobileNav.vmobileNav button>span{
          width:40px!important;
          height:40px!important;
          min-width:40px!important;
          min-height:40px!important;
          margin:0!important;
          border-radius:13px!important;
          display:grid!important;
          place-items:center!important;
          color:#fff!important;
          font-size:0!important;
          line-height:1!important;
          box-shadow:0 5px 12px rgba(15,23,42,.10)!important;
          transition:transform .18s ease,box-shadow .18s ease!important;
        }
        html body #vmobileNav.vmobileNav button>span svg{width:23px!important;height:23px!important;display:block!important;stroke:currentColor!important;fill:none!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important}

        html body #vmobileNav.vmobileNav [data-mobile-tab="sales"]>span{background:linear-gradient(145deg,#2f9bff,#0868ea)!important}
        html body #vmobileNav.vmobileNav [data-mobile-tab="products"]>span{background:linear-gradient(145deg,#ff4a9b,#df0a65)!important}
        html body #vmobileNav.vmobileNav [data-mobile-tab="inventory"]>span{background:linear-gradient(145deg,#22d7ad,#05a77f)!important}
        html body #vmobileNav.vmobileNav [data-mobile-tab="mobileHistoryHub"]>span{background:linear-gradient(145deg,#ffbe35,#f29100)!important}
        html body #vmobileNav.vmobileNav [data-mobile-tab="mobileAdminHub"]>span{background:linear-gradient(145deg,#a679ff,#7147e8)!important}
        html body #vmobileNav.vmobileNav [data-mobile-tab="mobileSettingsHub"]>span{background:linear-gradient(145deg,#8997aa,#58677a)!important}

        html body #vmobileNav.vmobileNav button.active,
        html body #vmobileNav.vmobileNav button.active:hover,
        html body #vmobileNav.vmobileNav button.active:focus{
          background:transparent!important;
          background-image:none!important;
          border-color:transparent!important;
          color:#0868ea!important;
          box-shadow:none!important;
        }
        html body #vmobileNav.vmobileNav button.active>span{
          width:44px!important;
          height:44px!important;
          min-width:44px!important;
          min-height:44px!important;
          border-radius:14px!important;
          transform:translateY(-1px)!important;
          background:linear-gradient(145deg,#2f9bff,#0868ea)!important;
          color:#fff!important;
          box-shadow:0 8px 18px rgba(8,104,234,.30)!important;
        }

        body.varelia-simple-mobile #products .head{margin-bottom:9px!important}
        body.varelia-simple-mobile #products .toolbar{margin-bottom:7px!important}
        body.varelia-simple-mobile #products .toolbar input{height:34px!important;min-height:34px!important;padding:6px 9px!important;border-radius:10px!important;font-size:12px!important}
        body.varelia-simple-mobile #products .btn{min-height:32px!important;padding:6px 9px!important;border-radius:9px!important;font-size:12px!important;line-height:1.1!important}
        body.varelia-simple-mobile #products .catalogHeadActions{gap:5px!important}
      }

      @media(max-width:380px){
        html body #vmobileNav.vmobileNav{left:7px!important;right:7px!important;padding-left:4px!important;padding-right:4px!important}
        html body #vmobileNav.vmobileNav button{font-size:9px!important}
        html body #vmobileNav.vmobileNav button>span{width:37px!important;height:37px!important;min-width:37px!important;min-height:37px!important}
        html body #vmobileNav.vmobileNav button.active>span{width:41px!important;height:41px!important;min-width:41px!important;min-height:41px!important}
      }
    `;
    document.head.appendChild(style);
    document.body.classList.add('varelia-simple-mobile');

    const history=document.createElement('section');
    history.id='mobileHistoryHub';history.className='view vmobileHub';
    history.innerHTML=`<div class="vmobileHubHead"><h2>Historial</h2><p>Consulta tus resultados, ganancias y cierres.</p></div><div class="vmobileHubGrid"><button class="vmobileHubCard" data-mobile-action="reports"><span class="vmobileHubIcon">▥</span><div><b>Reportes</b><small>Ventas y movimientos.</small></div></button><button class="vmobileHubCard" data-mobile-action="profit"><span class="vmobileHubIcon">↗</span><div><b>Ganancias</b><small>Ingresos y utilidad.</small></div></button><button class="vmobileHubCard" data-mobile-action="cash"><span class="vmobileHubIcon">▣</span><div><b>Caja y cierres</b><small>Caja e historial.</small></div></button></div>`;
    main.appendChild(history);

    const admin=document.createElement('section');
    admin.id='mobileAdminHub';admin.className='view vmobileHub';
    admin.innerHTML=`<div class="vmobileHubHead"><h2>Administración</h2><p>Gestiona el negocio.</p></div><div class="vmobileHubGrid"><button class="vmobileHubCard" data-mobile-action="sellers"><span class="vmobileHubIcon">♙</span><div><b>Vendedores</b></div></button><button class="vmobileHubCard" data-mobile-action="categories"><span class="vmobileHubIcon">◇</span><div><b>Categorías</b></div></button><button class="vmobileHubCard" data-mobile-action="purchases"><span class="vmobileHubIcon">▣</span><div><b>Compras</b></div></button><button class="vmobileHubCard" data-mobile-action="suppliers"><span class="vmobileHubIcon">▱</span><div><b>Proveedores</b></div></button><button class="vmobileHubCard" data-mobile-action="appearance"><span class="vmobileHubIcon">◉</span><div><b>Apariencia</b></div></button><button class="vmobileHubCard" data-mobile-action="account"><span class="vmobileHubIcon">👤</span><div><b>Mi cuenta</b><small id="vAccountEmail">Ver cuenta y cerrar sesión.</small></div></button><button class="vmobileHubCard" data-mobile-action="help"><span class="vmobileHubIcon">?</span><div><b>Ayuda</b></div></button></div>`;
    main.appendChild(admin);

    const settings=document.createElement('section');
    settings.id='mobileSettingsHub';settings.className='view vmobileHub';
    settings.innerHTML=`<div class="vmobileHubHead"><h2>Ajustes</h2><p>Configuración del negocio y del catálogo público.</p></div><div class="vrefPanel"><div class="card vdelivery" id="deliverySettingsCard"><h3>🚚 Métodos de entrega</h3><p>Activa las opciones que verá el cliente y coloca el costo de cada envío.</p><div class="vdeliveryRow"><div><label class="vdeliveryMethod"><input id="vdPickup" type="checkbox">Recojo en tienda</label><div class="vdeliveryHint">Sin costo</div></div><div class="vdeliveryPrice"><input value="0.00" disabled></div></div><div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdIndrive" type="checkbox">InDrive</label><div class="vdeliveryPrice"><input id="vdIndriveCost" type="number" min="0" step="0.10" inputmode="decimal"></div></div><div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdOlva" type="checkbox">Olva</label><div class="vdeliveryPrice"><input id="vdOlvaCost" type="number" min="0" step="0.10" inputmode="decimal"></div></div><div class="vdeliveryRow"><label class="vdeliveryMethod"><input id="vdShalom" type="checkbox">Shalom</label><div class="vdeliveryPrice"><input id="vdShalomCost" type="number" min="0" step="0.10" inputmode="decimal"></div></div><div class="vdeliveryHint">En Shalom el cliente indicará dirección/destino y sucursal o agencia.</div><button id="vdSave" class="btn primary vdeliverySave" type="button">Guardar métodos de entrega</button></div></div>`;
    main.appendChild(settings);

    const KEY='varelia_video_settings_v1';
    const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch{return{}}};
    const loadDelivery=()=>{
      const s=read(),d=s.delivery||{};
      document.getElementById('vdPickup').checked=s.publicAllowPickup!==false;
      [['Indrive','indrive'],['Olva','olva'],['Shalom','shalom']].forEach(([a,k])=>{
        document.getElementById('vd'+a).checked=d[k]?.enabled!==false;
        document.getElementById('vd'+a+'Cost').value=Math.max(0,Number(d[k]?.cost||0)).toFixed(2);
      });
    };
    loadDelivery();
    document.getElementById('vdSave').onclick=()=>{
      const s=read(),num=id=>Math.max(0,Number(document.getElementById(id).value||0));
      s.publicAllowPickup=document.getElementById('vdPickup').checked;
      s.publicAllowDelivery=true;
      s.delivery={...(s.delivery||{}),indrive:{enabled:document.getElementById('vdIndrive').checked,cost:num('vdIndriveCost')},olva:{enabled:document.getElementById('vdOlva').checked,cost:num('vdOlvaCost')},shalom:{enabled:document.getElementById('vdShalom').checked,cost:num('vdShalomCost')}};
      localStorage.setItem(KEY,JSON.stringify(s));
      window.dispatchEvent(new CustomEvent('varelia:catalog-settings-changed'));
      window.vareliaPublicCatalogSync?.();
      window.vareliaToast?.('Métodos de entrega guardados.','ok');
    };

    const icon=(paths)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${paths}</svg>`;
    const icons={
      sales:icon('<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9 21v-7h6v7"/>'),
      products:icon('<path d="M6 8h12l-1 13H7L6 8Z"/><path d="M9 8a3 3 0 0 1 6 0"/>'),
      inventory:icon('<path d="m4 8 8-4 8 4-8 4-8-4Z"/><path d="M4 8v8l8 4 8-4V8"/><path d="M12 12v8"/>'),
      history:icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
      admin:icon('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
      settings:icon('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1a1.7 1.7 0 0 0-1.4-1.5 1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2v-4h.1A1.7 1.7 0 0 0 3.6 8.2a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.1A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 8c.2.35.3.75.3 1.15V9.4H22v4h-.1a1.7 1.7 0 0 0-1.5 1.6Z"/>')
    };

    const nav=document.createElement('nav');
    nav.className='vmobileNav';nav.id='vmobileNav';
    nav.innerHTML=`
      <button data-mobile-tab="sales"><span>${icons.sales}</span>Venta</button>
      <button data-mobile-tab="products"><span>${icons.products}</span>Catálogo</button>
      <button data-mobile-tab="inventory"><span>${icons.inventory}</span>Inventario</button>
      <button data-mobile-tab="mobileHistoryHub"><span>${icons.history}</span>Historial</button>
      <button data-mobile-tab="mobileAdminHub"><span>${icons.admin}</span>Admin</button>
      <button data-mobile-tab="mobileSettingsHub"><span>${icons.settings}</span>Ajustes</button>`;
    document.body.appendChild(nav);

    const brandLogo=document.querySelector('.logo');
    if(brandLogo){
      brandLogo.setAttribute('role','button');
      brandLogo.setAttribute('aria-label','Ir al inicio');
      brandLogo.style.cursor='pointer';
      brandLogo.onclick=()=>show('sales');
    }

    function show(id){
      const t=document.getElementById(id);if(!t)return;
      document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v===t));
      nav.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.mobileTab===id));
      scrollTo(0,0);
    }
    nav.onclick=e=>{const b=e.target.closest('[data-mobile-tab]');if(b)show(b.dataset.mobileTab)};

    const syncActiveNav=()=>{
      const active=document.querySelector('main.content .view.active')?.id||'';
      const group={cash:'mobileHistoryHub',reports:'mobileHistoryHub',profit:'mobileHistoryHub',sellers:'mobileAdminHub',categories:'mobileAdminHub',suppliers:'mobileAdminHub',purchases:'mobileAdminHub',appearance:'mobileSettingsHub'};
      const selected=group[active]||active;
      nav.querySelectorAll('[data-mobile-tab]').forEach(b=>{
        const on=b.dataset.mobileTab===selected;
        b.classList.toggle('active',on);
        if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
      });
    };

    let navSyncPending=false;
    new MutationObserver(records=>{
      if(!records.some(r=>r.target.classList?.contains('view')||r.type==='childList'))return;
      if(navSyncPending)return;
      navSyncPending=true;
      queueMicrotask(()=>{navSyncPending=false;syncActiveNav()});
    }).observe(main,{subtree:true,attributes:true,attributeFilter:['class'],childList:true});
    syncActiveNav();

    document.addEventListener('click',e=>{
      const b=e.target.closest('[data-mobile-action]');if(!b)return;
      const a=b.dataset.mobileAction;
      if(a==='account'){
        (async()=>{
          const sb=window.vareliaSupabase;let email='Cuenta activa';
          try{const {data}=await sb?.auth.getSession();email=data?.session?.user?.email||email}catch{}
          const yes=confirm('Cuenta conectada: '+email+'\n\n¿Quieres cerrar sesión?');
          if(yes){try{await sb?.auth.signOut()}catch{}location.replace('/login.html')}
        })();
        return;
      }
      if(a==='reports'||a==='profit'||a==='help'){window.vareliaShowExtraView?.(a);return}
      if(a==='sellers'){document.querySelector('.premiumSellersItem')?.click();return}
      show(a==='purchases'?'purchases':a);
    },true);
  });
})();
