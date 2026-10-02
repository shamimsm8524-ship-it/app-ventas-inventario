(()=>{
  if(window.__vareliaPublicCatalog)return;
  window.__vareliaPublicCatalog=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    if(typeof products==='undefined')return;
    const section=document.getElementById('products');
    const head=section?.querySelector('.head');
    const newProduct=document.getElementById('newProduct');
    const productForm=document.getElementById('productForm');
    const productId=document.getElementById('productId');
    if(!section||!head||!newProduct)return;

    const SPECS_KEY='varelia_product_specs_v1';
    let specs={};
    try{specs=JSON.parse(localStorage.getItem(SPECS_KEY)||'{}')||{}}catch{specs={}}
    const saveSpecs=()=>{try{localStorage.setItem(SPECS_KEY,JSON.stringify(specs))}catch{}};

    // Las opciones visibles/seleccionables del producto se administran ahora
    // desde "Características del producto" (characteristics.js). Se conserva
    // specifications solo para productos antiguos ya guardados.

    const actions=document.createElement('div');
    actions.className='catalogHeadActions';
    const btn=document.createElement('button');
    btn.type='button';btn.className='btn secondary';btn.id='publicCatalogBtn';btn.textContent='🔗 Catálogo público';
    actions.appendChild(btn);actions.appendChild(newProduct);head.appendChild(actions);

    const style=document.createElement('style');style.textContent=`
      .catalogHeadActions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.catalogHeadActions .btn{white-space:nowrap}
      #catalogShareDialog{width:min(92vw,520px)}.catalogShareBox{padding:18px}.catalogShareBox h2{margin:0 0 5px}.catalogShareBox p{margin:0 0 14px;color:var(--muted);font-size:13px}.catalogLinkBox{display:flex;gap:8px;align-items:center}.catalogLinkBox input{font-size:12px}.catalogShareActions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.catalogShareActions .btn{width:100%}.catalogSyncState{font-size:11px;color:var(--muted);margin-top:10px}@media(max-width:560px){.catalogHeadActions{width:100%}.catalogHeadActions .btn{flex:1}.catalogShareActions{grid-template-columns:1fr}}
    `;document.head.appendChild(style);

    const dialog=document.createElement('dialog');dialog.id='catalogShareDialog';dialog.innerHTML=`<div class="catalogShareBox"><div class="modalhead"><div><h2>Catálogo público</h2><p>Este enlace muestra únicamente los productos disponibles de tu negocio. Tus clientes podrán marcar lo que desean y ver las especificaciones.</p></div><button type="button" class="close" id="catalogClose">×</button></div><div class="catalogLinkBox"><input id="catalogPublicLink" readonly><button type="button" class="btn secondary" id="catalogCopy">Copiar</button></div><div class="catalogShareActions"><button type="button" class="btn primary" id="catalogOpen">Ver catálogo</button><button type="button" class="btn secondary" id="catalogShare">Compartir</button></div><div class="catalogSyncState" id="catalogSyncState">Preparando catálogo…</div></div>`;document.body.appendChild(dialog);

    const $=id=>document.getElementById(id);let lastSignature='',publicId='',publicSlug='',syncing=null;
    const toast=t=>window.vareliaToast?window.vareliaToast(t):alert(t);
    const color=()=>getComputedStyle(document.documentElement).getPropertyValue('--p').trim()||'#be185d';
    const settings=()=>{try{return {...(JSON.parse(localStorage.getItem('varelia_video_settings_v1')||'{}')||{}),...(window.vareliaVideoSettings||{})}}catch{return window.vareliaVideoSettings||{}}};
    const catalogBusinessName=()=>{
      const s=settings();
      const candidates=[
        s.businessName,
        document.getElementById('vareliaBusinessName')?.textContent,
        document.querySelector('.brand h1')?.textContent
      ];
      const name=candidates.map(v=>String(v||'').trim().replace(/\s+/g,' ')).find(v=>v&&v!=='Mi Negocio'&&v!=='Catálogo');
      return String(name||'').slice(0,80);
    };
    const normalizeSocialUrl=(value,type='other')=>{
      let v=String(value||'').trim();if(!v)return '';
      if(type==='whatsapp'){
        const digits=v.replace(/\D/g,'');
        if(/^\+?[0-9\s()-]{7,}$/.test(v)&&digits)return 'https://wa.me/'+digits;
      }
      if(v.startsWith('@')){
        const h=v.slice(1);
        if(type==='tiktok')return 'https://www.tiktok.com/@'+h;
        if(type==='instagram')return 'https://www.instagram.com/'+h;
        if(type==='youtube')return 'https://www.youtube.com/@'+h;
      }
      if(!/^https?:\/\//i.test(v))v='https://'+v.replace(/^\/+/, '');
      try{
        const u=new URL(v);
        if(type==='tiktok'&&/(^|\.)tiktok\.com$/i.test(u.hostname)){
          const seg=u.pathname.split('/').filter(Boolean)[0]||'';
          if(seg&&!seg.startsWith('@'))u.pathname='/@'+seg;
        }
        return ['http:','https:'].includes(u.protocol)?u.href:''
      }catch{return ''}
    };
    const socialLinks=()=>{
      const s=settings(),out=[];
      const add=(type,label,value)=>{const url=normalizeSocialUrl(value,type);if(url)out.push({type,label,url})};
      add('tiktok','TikTok',s.socialTikTok);
      add('facebook','Facebook',s.socialFacebook);
      add('instagram','Instagram',s.socialInstagram);
      add('whatsapp','WhatsApp',s.socialWhatsApp);
      add('youtube','YouTube',s.socialYouTube);
      String(s.socialOther||'').split(/\r?\n/).forEach(line=>{
        const parts=line.split('|'),label=String(parts.shift()||'').trim(),raw=parts.join('|').trim();
        if(label&&raw)add('other',label,raw);
      });
      return out.slice(0,12);
    };
    const publicBusinessInfo=()=>{
      const s=settings();
      const methods=String(s.publicPaymentMethods||'Efectivo,Yape,Plin,Transferencia').split(',').map(x=>x.trim()).filter(Boolean).slice(0,12);
      let mapUrl=String(s.publicMapUrl||'').trim();
      if(mapUrl&&!/^https?:\/\//i.test(mapUrl))mapUrl='https://'+mapUrl.replace(/^\/+/, '');
      try{if(mapUrl){const u=new URL(mapUrl);mapUrl=['http:','https:'].includes(u.protocol)?u.href:''}}catch{mapUrl=''}
      const slogan=String(s.businessSlogan||'').trim().slice(0,120);return {slogan,delivery:{indrive:{enabled:s.deliveryInDriveEnabled!==false,cost:Math.max(0,Number(s.deliveryInDriveCost)||0)},olva:{enabled:s.deliveryOlvaEnabled!==false,cost:Math.max(0,Number(s.deliveryOlvaCost)||0)},shalom:{enabled:s.deliveryShalomEnabled!==false,cost:Math.max(0,Number(s.deliveryShalomCost)||0),pay_at_agency:s.deliveryShalomPayAgency!==false},pickup:s.publicAllowPickup!==false},phone:String(s.phone||'').trim().slice(0,40),whatsapp:normalizeSocialUrl(s.socialWhatsApp||s.phone||'','whatsapp'),address:String(s.address||'').trim().slice(0,240),hours:String(s.businessHours||'').trim().slice(0,300),map_url:mapUrl,allow_delivery:s.publicAllowDelivery!==false,allow_pickup:s.publicAllowPickup!==false,payment_methods:methods.length?methods:['Efectivo']};
    };
    const imageCache=new Map();
    const specFor=p=>String(specs[String(p.id)]??p.specifications??'');

    function signature(){return JSON.stringify({c:color(),n:catalogBusinessName(),s:socialLinks(),i:publicBusinessInfo(),p:products.map(p=>[p.id,p.name,p.category,+p.sellPrice||0,+p.stock||0,p.unit,p.description||'',specFor(p),p.characteristics||[],p.variantCombinations||[],p.image?.length||0,p.image?.slice(-32)||''])})}
    function compressImage(src){
      if(!src||!String(src).startsWith('data:image/'))return Promise.resolve('');
      const key=src.length+'|'+src.slice(-48);if(imageCache.has(key))return Promise.resolve(imageCache.get(key));
      if(src.length<220000){imageCache.set(key,src);return Promise.resolve(src)}
      return new Promise(resolve=>{const img=new Image();img.onload=()=>{try{const max=820,scale=Math.min(1,max/Math.max(img.width,img.height)),w=Math.max(1,Math.round(img.width*scale)),h=Math.max(1,Math.round(img.height*scale)),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);const out=canvas.toDataURL('image/jpeg',.72);imageCache.set(key,out);resolve(out)}catch{resolve('')}};img.onerror=()=>resolve('');img.src=src})
    }
    async function payload(){
      const available=products;
      return Promise.all(available.map(async p=>({id:String(p.id||''),name:String(p.name||''),category:String(p.category||''),sellPrice:+p.sellPrice||0,stock:+p.stock||0,unit:String(p.unit||'Unidad'),description:String(p.description||''),specifications:specFor(p),characteristics:Array.isArray(p.characteristics)?p.characteristics:[],variantCombinations:Array.isArray(p.variantCombinations)?p.variantCombinations:[],image:await compressImage(p.image||'')})));
    }
    async function waitSb(){for(let i=0;i<60&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,120));return window.vareliaSupabase}
    async function syncNow(force=false){
      if(syncing)return syncing;
      const sig=signature();if(!force&&sig===lastSignature&&publicId&&publicSlug)return publicId;
      syncing=(async()=>{
        const sb=await waitSb();if(!sb)throw new Error('Supabase no disponible');
        const {data:sess}=await sb.auth.getSession();if(!sess?.session?.user)throw new Error('Inicia sesión para publicar el catálogo');
        $('catalogSyncState').textContent='Actualizando productos disponibles…';
        const rows=await payload();
        const {data,error}=await sb.rpc('varelia_sync_public_catalog_v4',{p_products:rows,p_theme_color:color(),p_social_links:socialLinks(),p_business_name:catalogBusinessName(),p_business_info:publicBusinessInfo()});
        if(error)throw error;
        publicId=String(data||'');
        const {data:publicCatalog,error:slugError}=await sb.from('public_catalogs').select('public_slug').eq('public_id',publicId).eq('enabled',true).maybeSingle();
        if(slugError||!publicCatalog?.public_slug)throw slugError||new Error('No se pudo crear el enlace del catálogo');
        publicSlug=String(publicCatalog.public_slug);lastSignature=sig;
        const url=location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)+'&_v=20261002-ANTI-DUPLICADO-68';
        $('catalogPublicLink').value=url;$('catalogSyncState').textContent='Catálogo actualizado · '+rows.length+' producto(s) disponible(s)';
        return publicId;
      })().finally(()=>{syncing=null});
      return syncing;
    }
    window.vareliaPublicCatalogSync=()=>syncNow(true);
    async function catalogUrl(force=false){await syncNow(force);return location.origin+'/catalogo/milagros/catalogo-v2.html?c='+encodeURIComponent(publicId)+'&_v=20261002-ANTI-DUPLICADO-68'}
    btn.addEventListener('click',async()=>{btn.disabled=true;try{dialog.showModal();$('catalogSyncState').textContent='Preparando catálogo…';await catalogUrl(true)}catch(e){console.error(e);dialog.close();alert('No se pudo preparar el catálogo público. Inténtalo otra vez.')}finally{btn.disabled=false}});
    $('catalogClose').onclick=()=>dialog.close();
    $('catalogOpen').onclick=async()=>{try{const url=await catalogUrl(false);window.open(url,'_blank','noopener')}catch(e){alert('No se pudo abrir el catálogo.')}};
    $('catalogCopy').onclick=async()=>{try{const url=await catalogUrl(false);await navigator.clipboard.writeText(url);toast('Link del catálogo copiado.')}catch{const i=$('catalogPublicLink');i.select();document.execCommand('copy');toast('Link del catálogo copiado.')}};
    $('catalogShare').onclick=async()=>{try{const url=await catalogUrl(false);if(navigator.share)await navigator.share({title:'Catálogo de productos',text:'Mira nuestros productos disponibles',url});else{await navigator.clipboard.writeText(url);toast('Link del catálogo copiado.')}}catch{}};

    window.addEventListener('varelia:catalog-product-changed',()=>setTimeout(()=>syncNow(true).catch(()=>{}),350));
    window.addEventListener('varelia:catalog-settings-changed',()=>setTimeout(()=>syncNow(true).catch(()=>{}),350));
    // Fuente segura: publicar solo después de que el inventario central haya terminado de cargar.
    // Evita que datos locales viejos reemplacen el catálogo al abrir/actualizar la página.
    window.addEventListener('varelia:central-stock-updated',()=>setTimeout(()=>syncNow(true).catch(()=>{}),250));

  });
})();
