(()=>{
  if(window.__vareliaProfessionalFlow)return;
  window.__vareliaProfessionalFlow=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const style=document.createElement('style');
    style.textContent=`
      .flowRole{display:flex;gap:12px;align-items:flex-start;padding:13px 14px;margin:0 0 14px;border:1px solid color-mix(in srgb,var(--p) 20%,var(--line));border-radius:16px;background:linear-gradient(135deg,color-mix(in srgb,var(--p) 6%,var(--card)),var(--card));box-shadow:0 7px 20px rgba(15,23,42,.05)}
      .flowRoleIcon{width:38px;height:38px;flex:0 0 38px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--p) 10%,var(--card));font-size:20px}.flowRole strong{display:block;font-size:14px}.flowRole span{display:block;color:var(--muted);font-size:12px;margin-top:2px;line-height:1.45}.flowTag{display:inline-flex!important;width:auto!important;margin-top:7px!important;padding:4px 8px;border-radius:999px;background:var(--bg);font-size:11px!important;font-weight:850;color:var(--p)!important}
      .flowNavHint{display:block;font-size:10px;font-weight:650;color:#94a3b8;margin-top:2px;line-height:1.2}.nav button.active .flowNavHint{color:#fff;opacity:.82}
    `;
    document.head.appendChild(style);

    const roles={
      products:{icon:'📦',title:'Catálogo de productos',desc:'Aquí creas y editas cada producto: nombre, imagen, código de barras, categoría y precios.',tag:'No modifica stock por sí solo'},
      categories:{icon:'🗂️',title:'Organización del catálogo',desc:'Sirve únicamente para crear y ordenar las categorías de tus productos.',tag:'Organización'},
      inventory:{icon:'📊',title:'Control de existencias',desc:'Consulta cuánto stock tienes, revisa productos con stock bajo y localiza artículos por código.',tag:'Consulta y control'},
      suppliers:{icon:'🤝',title:'Directorio de proveedores',desc:'Guarda los datos de las empresas o personas a quienes compras mercadería.',tag:'Datos de proveedores'},
      purchases:{icon:'📥',title:'Ingreso de mercadería',desc:'Usa esta sección cuando recibas una compra o reposición. Registra proveedor, cantidades y costos para aumentar el stock correctamente.',tag:'Entradas formales de stock'},
      sales:{icon:'🛒',title:'Punto de venta',desc:'Registra las ventas. Al confirmar una venta, las unidades salen automáticamente del inventario.',tag:'Salidas por venta'},
      cash:{icon:'💰',title:'Control de caja',desc:'Muestra y controla el dinero generado por las ventas y los cierres de caja.',tag:'Dinero, no inventario'},
      appearance:{icon:'🎨',title:'Personalización',desc:'Cambia la apariencia visual de Varelia sin afectar productos, inventario ni ventas.',tag:'Configuración visual'}
    };

    function addRole(id,data){
      const sec=document.getElementById(id);if(!sec||sec.querySelector('.flowRole'))return;
      const head=sec.querySelector('.head');if(!head)return;
      const box=document.createElement('div');box.className='flowRole';box.innerHTML=`<div class="flowRoleIcon">${data.icon}</div><div><strong>${data.title}</strong><span>${data.desc}</span><span class="flowTag">${data.tag}</span></div>`;head.insertAdjacentElement('afterend',box);
    }
    Object.entries(roles).forEach(([id,data])=>addRole(id,data));

    const navLabels={
      products:['📦 Productos','Catálogo'],inventory:['📊 Inventario','Consulta de stock'],categories:['🗂️ Categorías','Organización'],suppliers:['🤝 Proveedores','Directorio'],purchases:['📥 Mercadería','Entradas de stock'],sales:['🛒 Ventas','Salidas por venta'],cash:['💰 Caja','Control de dinero'],appearance:['🎨 Apariencia','Diseño']
    };
    Object.entries(navLabels).forEach(([id,[label,hint]])=>{
      const b=document.querySelector(`.nav [data-view="${id}"]`);if(!b||b.dataset.flowNamed)return;b.dataset.flowNamed='1';
      if(id==='suppliers'||id==='purchases')return;
      b.innerHTML=`${label}<span class="flowNavHint">${hint}</span>`;
    });

    function tuneBulk(){
      const sec=document.getElementById('bulkScan'),btn=document.querySelector('.nav [data-view="bulkScan"]');
      if(btn&&!btn.dataset.flowNamed){btn.dataset.flowNamed='1';btn.innerHTML='📲 Ajuste rápido<span class="flowNavHint">Conteo y correcciones</span>'}
      if(!sec)return;
      const h=sec.querySelector('.head h2');if(h)h.textContent='Ajuste rápido por escaneo';
      const p=sec.querySelector('.head .notice');if(p)p.textContent='Para conteos físicos y correcciones rápidas. Las compras normales deben registrarse en Mercadería.';
      if(!sec.querySelector('.flowRole')){
        const head=sec.querySelector('.head'),box=document.createElement('div');box.className='flowRole';box.innerHTML='<div class="flowRoleIcon">📲</div><div><strong>Conteo y correcciones rápidas</strong><span>Escanea varios productos para corregir diferencias de inventario. No reemplaza el ingreso de una compra a proveedor ni una venta.</span><span class="flowTag">Ajustes excepcionales de stock</span></div>';head?.insertAdjacentElement('afterend',box)
      }
      const modeText=sec.querySelector('.bulkHero .notice');if(modeText)modeText.textContent='Cada lectura agrega 1 unidad al ajuste pendiente. Revisa el resultado antes de aplicarlo.';
      const apply=document.getElementById('bulkApply');if(apply)apply.textContent='✓ Confirmar ajuste de inventario';
    }
    tuneBulk();setTimeout(tuneBulk,500);setTimeout(tuneBulk,1500);

    // Make the supplier/merchandise relationship clearer without changing their existing behavior.
    const parent=document.querySelector('#supplierGroup .navparent');if(parent&&!parent.dataset.flowNamed){parent.dataset.flowNamed='1';const arrow=parent.querySelector('.arrow')?.outerHTML||'<span class="arrow">⌄</span>';parent.innerHTML=`📦 Compras y proveedores <span class="flowNavHint" style="margin-left:auto;margin-right:8px">Abastecimiento</span>${arrow}`}

    // Reinforce the correct workflow at stock-sensitive actions.
    document.addEventListener('click',e=>{
      const b=e.target.closest('.nav [data-view]');if(!b)return;
      if(b.dataset.view==='inventory')window.vareliaToast?.('Inventario es para consultar existencias. Para una reposición usa Mercadería; para conteos usa Ajuste rápido.');
      if(b.dataset.view==='purchases')window.vareliaToast?.('Mercadería registra entradas formales de stock con proveedor y costo.');
      if(b.dataset.view==='bulkScan')window.vareliaToast?.('Ajuste rápido es para conteos y correcciones, no para compras normales.');
    },false);
  });
})();