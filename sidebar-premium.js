(()=>{
  const svg=(name)=>({
    dashboard:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>',
    products:'<svg viewBox="0 0 24 24"><path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Z"/><path d="m4 7.5 8 4.5 8-4.5"/><path d="M4 7.5V16l8 5 8-5V7.5"/></svg>',
    inventory:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9v6M12 7v10M16 10v4"/></svg>',
    categories:'<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10H3z"/><path d="M3 7V5h7l2 2"/></svg>',
    suppliers:'<svg viewBox="0 0 24 24"><path d="M3 16V8h11v8"/><path d="M14 11h4l3 3v2h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>',
    purchases:'<svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8"/></svg>',
    sales:'<svg viewBox="0 0 24 24"><path d="M3 4h2l2 11h10l2-7H7"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/></svg>',
    cash:'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M7 9h.01M17 15h.01"/></svg>',
    appearance:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-3v-.08a1.7 1.7 0 0 0-1.04-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 6.6 15a1.7 1.7 0 0 0-1.56-1.04H5v-3h.08A1.7 1.7 0 0 0 6.64 9.9 1.7 1.7 0 0 0 6.3 8.02l-.06-.06L8.36 5.84l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.34 4.7V4h3v.08a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.12 2.12-.06.06a1.7 1.7 0 0 0-.34 1.88c.18.44.55.8 1.04 1.04H20v3h-.08A1.7 1.7 0 0 0 19.4 15Z"/></svg>'
  }[name]||'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>');
  const chevron='<svg class="navChevron" viewBox="0 0 24 24"><path d="m7 9 5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const labelMap={dashboard:'Dashboard',products:'Productos',inventory:'Inventario',categories:'Categorías',suppliers:'Proveedores',purchases:'Ingreso de mercadería',sales:'Ventas',cash:'Caja',appearance:'Apariencia'};
  function decorate(btn,key,label){if(!btn||btn.dataset.premiumDecorated==='1')return;btn.dataset.premiumDecorated='1';btn.innerHTML=`<span class="navIcon">${svg(key)}</span><span class="navLabel">${label||labelMap[key]||key}</span>`;}
  function sectionTitle(text){const d=document.createElement('div');d.className='navSectionTitle';d.textContent=text;return d}
  function setup(){
    const side=document.getElementById('sidebar'),nav=side?.querySelector('.nav');if(!side||!nav)return;
    if(!side.querySelector('.sidePremiumBrand')){const b=document.createElement('div');b.className='sidePremiumBrand';b.innerHTML='<div class="sidePremiumMark">VS</div><div class="sidePremiumName"><strong>Varelia Store</strong><span>Panel de control</span></div>';side.insertBefore(b,side.firstChild)}
    nav.querySelectorAll('[data-view]').forEach(btn=>decorate(btn,btn.dataset.view));
    const sup=document.getElementById('supplierMenu');if(sup){sup.dataset.premiumDecorated='1';sup.innerHTML=`<span class="navIcon">${svg('suppliers')}</span><span class="navLabel">Compras</span>${chevron}`}
    const cashParent=[...nav.querySelectorAll('button')].find(b=>/caja/i.test(b.textContent)&&!b.dataset.view);if(cashParent&&cashParent.id!=='supplierMenu'){cashParent.dataset.premiumDecorated='1';cashParent.innerHTML=`<span class="navIcon">${svg('cash')}</span><span class="navLabel">Caja</span>${chevron}`}
    [...nav.querySelectorAll('button')].forEach(b=>{
      const t=b.textContent.toLowerCase();
      if(b.dataset.premiumDecorated==='1')return;
      if(t.includes('ajuste rápido'))decorate(b,'inventory','Ajuste rápido');
      else if(t.includes('resumen')||t.includes('cierres'))decorate(b,'cash','Resumen y cierres');
      else if(t.includes('ganancias'))decorate(b,'sales','Ganancias por producto');
      else if(t.includes('respaldo'))decorate(b,'inventory','Respaldo semanal');
    });
    if(!nav.querySelector('.navSectionTitle')){
      const dash=nav.querySelector('[data-view="dashboard"]');if(dash)nav.insertBefore(sectionTitle('Principal'),dash);
      const prod=nav.querySelector('[data-view="products"]');if(prod)nav.insertBefore(sectionTitle('Catálogo'),prod);
      const group=document.getElementById('supplierGroup');if(group)nav.insertBefore(sectionTitle('Compras'),group);
      const sales=nav.querySelector('[data-view="sales"]');if(sales)nav.insertBefore(sectionTitle('Ventas'),sales);
      const app=nav.querySelector('[data-view="appearance"]');if(app)nav.insertBefore(sectionTitle('Sistema'),app);
    }
    let user=side.querySelector('#vareliaUserBar');if(user&&user.parentElement===side){user.style.order='99'}
  }
  const run=()=>{setup();setTimeout(setup,300);setTimeout(setup,900)};
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',run):run();
  new MutationObserver(()=>setup()).observe(document.documentElement,{childList:true,subtree:true});
})();
