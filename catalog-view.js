(()=>{
  if(window.__vareliaCatalogViewModes)return;
  window.__vareliaCatalogViewModes=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const grid=document.getElementById('grid');
    const chips=document.getElementById('chips');
    if(!grid||!chips)return;

    const style=document.createElement('style');
    style.textContent=`
      .catalogViewBar{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0 12px;flex-wrap:wrap}
      .catalogViewLabel{font-size:11px;color:var(--muted);font-weight:850}
      .catalogViewButtons{display:flex;gap:4px;padding:3px;background:transparent;border:0;border-radius:12px;box-shadow:none}
      .catalogViewBtn{border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:11px;padding:7px 9px;font-size:11px;font-weight:850;white-space:nowrap;min-height:34px}
      .catalogViewBtn.active{background:color-mix(in srgb,var(--p) 10%,var(--card));color:var(--p);border-color:color-mix(in srgb,var(--p) 45%,var(--line));box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--p) 10%,transparent)}

      #grid.catalog-mode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}
      #grid.catalog-mode-list{grid-template-columns:1fr}
      #grid.catalog-mode-list .product{display:grid;grid-template-columns:170px minmax(0,1fr);min-height:170px}
      #grid.catalog-mode-list .photo{height:100%;min-height:170px;aspect-ratio:auto;border-radius:0}
      #grid.catalog-mode-list .body{min-width:0}
      #grid.catalog-mode-list .choose{max-width:280px}

      #grid.catalog-mode-compact{grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      #grid.catalog-mode-compact .product{border-radius:16px}
      #grid.catalog-mode-compact .photo{aspect-ratio:1.15/1}
      #grid.catalog-mode-compact .body{padding:10px}
      #grid.catalog-mode-compact .body h2{font-size:14px;margin:6px 0 3px}
      #grid.catalog-mode-compact .desc{font-size:11px;min-height:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      #grid.catalog-mode-compact .cat{font-size:10px;padding:4px 7px}
      #grid.catalog-mode-compact .price{font-size:17px}
      #grid.catalog-mode-compact .available{font-size:9px;padding:5px 6px}
      #grid.catalog-mode-compact .specs{margin-top:7px;padding-top:7px}
      #grid.catalog-mode-compact .specs summary{font-size:11px}
      #grid.catalog-mode-compact .choose{font-size:11px;padding:9px 8px;border-radius:11px}

      @media(max-width:850px){#grid.catalog-mode-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#grid.catalog-mode-compact{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @media(max-width:560px){
        .catalogViewBar{align-items:center;display:grid;grid-template-columns:auto 1fr;gap:7px}.catalogViewLabel{width:auto;white-space:nowrap}.catalogViewButtons{width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.catalogViewBtn{padding:7px 4px;font-size:10px;min-height:32px}
        #grid.catalog-mode-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
        #grid.catalog-mode-grid .body{padding:10px}#grid.catalog-mode-grid .body h2{font-size:14px}#grid.catalog-mode-grid .price{font-size:17px}#grid.catalog-mode-grid .available{font-size:9px;padding:5px 6px}#grid.catalog-mode-grid .choose{font-size:11px;padding:9px 7px}
        #grid.catalog-mode-list .product{grid-template-columns:112px minmax(0,1fr);min-height:132px}
        #grid.catalog-mode-list .photo{min-height:132px;height:100%}
        #grid.catalog-mode-list .body{padding:10px}#grid.catalog-mode-list .body h2{font-size:15px;margin-top:5px}#grid.catalog-mode-list .desc{min-height:0}#grid.catalog-mode-list .bottom{padding-top:8px}#grid.catalog-mode-list .choose{padding:9px 8px;font-size:11px}
        #grid.catalog-mode-compact{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      }
    `;
    document.head.appendChild(style);

    const bar=document.createElement('div');
    bar.className='catalogViewBar';
    bar.innerHTML='<span class="catalogViewLabel">Ver productos como</span><div class="catalogViewButtons"><button type="button" class="catalogViewBtn" data-catalog-view="list">☰ Lista</button><button type="button" class="catalogViewBtn" data-catalog-view="grid">▦ Cuadrícula</button><button type="button" class="catalogViewBtn" data-catalog-view="compact">▥ Compacta</button></div>';
    chips.insertAdjacentElement('afterend',bar);

    const key='varelia_catalog_view_mode_v1';
    const valid=['grid','list','compact'];
    function apply(mode){
      if(!valid.includes(mode))mode='grid';
      grid.classList.remove('catalog-mode-grid','catalog-mode-list','catalog-mode-compact');
      grid.classList.add('catalog-mode-'+mode);
      bar.querySelectorAll('[data-catalog-view]').forEach(b=>b.classList.toggle('active',b.dataset.catalogView===mode));
      try{localStorage.setItem(key,mode)}catch{}
    }
    bar.addEventListener('click',e=>{const b=e.target.closest('[data-catalog-view]');if(b)apply(b.dataset.catalogView)});
    let saved='grid';try{saved=localStorage.getItem(key)||'grid'}catch{}
    apply(saved);
  });
})();