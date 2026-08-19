(()=>{
  if(window.__vareliaPublicCatalog)return;
  window.__vareliaPublicCatalog=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    if(typeof products==='undefined')return;
    const section=document.getElementById('products');
    const head=section?.querySelector('.head');
    const newProduct=document.getElementById('newProduct');
    if(!section||!head||!newProduct)return;

    const actions=document.createElement('div');
    actions.className='catalogHeadActions';
    const btn=document.createElement('button');
    btn.type='button';btn.className='btn secondary';btn.id='publicCatalogBtn';btn.textContent='🔗 Catálogo público';
    actions.appendChild(btn);actions.appendChild(newProduct);head.appendChild(actions);

    const style=document.createElement('style');style.textContent=`
      .catalogHeadActions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.catalogHeadActions .btn{white-space:nowrap}
      #catalogShareDialog{width:min(92vw,520px)}.catalogShareBox{padding:18px}.catalogShareBox h2{margin:0 0 5px}.catalogShareBox p{margin:0 0 14px;color:var(--muted);font-size:13px}.catalogLinkBox{display:flex;gap:8px;align-items:center}.catalogLinkBox input{font-size:12px}.catalogShareActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.catalogShareActions .btn{width:100%}.catalogShareActions .wide{grid-column:1/-1}.catalogSyncState{font-size:11px;color:var(--muted);margin-top:10px}@media(max-width:560px){.catalogHeadActions{width:100%}.catalogHeadActions .btn{flex:1}.catalogShareActions{grid-template-columns:1fr}}
    `;document.head.appendChild(style);

    const dialog=document.createElement('dialog');dialog.id='catalogShareDialog';dialog.innerHTML=`<div class="catalogShareBox"><div class="modalhead"><div><h2>Catálogo público</h2><p>Este enlace muestra únicamente los productos disponibles de tu negocio.</p></div><button type="button" class="close" id="catalogClose">×</button></div><div class="catalogLinkBox"><input id="catalogPublicLink" readonly><button type="button" class="btn secondary" id="catalogCopy">Copiar</button></div><div class="catalogShareActions"><button type="button" class="btn primary" id="catalogOpen">Ver catálogo</button><button type="button" class="btn secondary" id="catalogShare">Compartir</button></div><div class="catalogSyncState" id="catalogSyncState">Preparando catálogo…</div></div>`;document.body.appendChild(dialog);

    const $=id=>document.getElementById(id);let lastSignature='',publicId='',syncing=null;
    const toast=t=>window.vareliaToast?window.vareliaToast(t):alert(t);
    const color=()=>getComputedStyle(document.documentElement).getPropertyValue('--p').trim()||'#be185d';
    const imageCache=new Map();

    function signature(){return JSON.stringify({c:color(),p:products.map(p=>[p.id,p.name,p.category,+p.sellPrice||0,+p.stock||0,p.unit,p.description||'',p.image?.length||0,p.image?.slice(-32)||''])})}
    function compressImage(src){
      if(!src||!String(src).startsWith('data:image/'))return Promise.resolve('');
      const key=src.length+'|'+src.slice(-48);if(imageCache.has(key))return Promise.resolve(imageCache.get(key));
      if(src.length<220000){imageCache.set(key,src);return Promise.resolve(src)}
      return new Promise(resolve=>{const img=new Image();img.onload=()=>{try{const max=820,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);const out=canvas.toDataURL('image/jpeg',.72);imageCache.set(key,out);resolve(out)}catch{resolve('')}};img.onerror=()=>resolve('');img.src=src})
    }
    async function payload(){
      const available=products.filter(p=>(+p.stock||0)>0);
      return Promise.all(available.map(async p=>({id:String(p.id||''),name:String(p.name||''),category:String(p.category||''),sellPrice:+p.sellPrice||0,stock:+p.stock||0,unit:String(p.unit||'Unidad'),description:String(p.description||''),image:await compressImage(p.image||'')})));
    }
    async function waitSb(){for(let i=0;i<60&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,120));return window.vareliaSupabase}
    async function syncNow(force=false){
      if(syncing)return syncing;
      const sig=signature();if(!force&&sig===lastSignature&&publicId)return publicId;
      syncing=(async()=>{
        const sb=await waitSb();if(!sb)throw new Error('Supabase no disponible');
        const {data:sess}=await sb.auth.getSession();if(!sess?.session?.user)throw new Error('Inicia sesión para publicar el catálogo');
        $('catalogSyncState').textContent='Actualizando productos disponibles…';
        const rows=await payload();
        const {data,error}=await sb.rpc('varelia_sync_public_catalog',{p_products:rows,p_theme_color:color()});
        if(error)throw error;
        publicId=String(data||'');lastSignature=sig;
        const url=location.origin+'/catalogo.html?c='+encodeURIComponent(publicId);
        $('catalogPublicLink').value=url;$('catalogSyncState').textContent='Catálogo actualizado · '+rows.length+' producto(s) disponible(s)';
        return publicId;
      })().finally(()=>{syncing=null});
      return syncing;
    }
    async function catalogUrl(force=false){const id=await syncNow(force);return location.origin+'/catalogo.html?c='+encodeURIComponent(id)}
    btn.addEventListener('click',async()=>{btn.disabled=true;try{dialog.showModal();$('catalogSyncState').textContent='Preparando catálogo…';await catalogUrl(true)}catch(e){console.error(e);dialog.close();alert('No se pudo preparar el catálogo público. Inténtalo otra vez.')}finally{btn.disabled=false}});
    $('catalogClose').onclick=()=>dialog.close();
    $('catalogOpen').onclick=async()=>{try{const url=await catalogUrl(false);window.open(url,'_blank','noopener')}catch(e){alert('No se pudo abrir el catálogo.')}};
    $('catalogCopy').onclick=async()=>{try{const url=await catalogUrl(false);await navigator.clipboard.writeText(url);toast('Link del catálogo copiado.')}catch{const i=$('catalogPublicLink');i.select();document.execCommand('copy');toast('Link del catálogo copiado.')}};
    $('catalogShare').onclick=async()=>{try{const url=await catalogUrl(false);if(navigator.share)await navigator.share({title:'Catálogo de productos',text:'Mira nuestros productos disponibles',url});else{await navigator.clipboard.writeText(url);toast('Link del catálogo copiado.')}}catch{}};

    setTimeout(()=>syncNow(false).catch(()=>{}),2200);
    setInterval(()=>{if(document.visibilityState==='visible')syncNow(false).catch(()=>{})},7000);
    window.addEventListener('focus',()=>syncNow(false).catch(()=>{}));
  });
})();