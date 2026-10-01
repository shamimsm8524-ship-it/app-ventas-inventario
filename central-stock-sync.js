(()=>{
  if(window.__vareliaCentralStockSync)return;
  window.__vareliaCentralStockSync=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  let sb=null,profile=null,businessId='',role='',channel=null,refreshTimer=null,saleBusy=false;

  const localProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const localCategories=()=>{try{return Array.isArray(categories)?categories:[]}catch{return[]}};
  const isOwner=()=>role==='owner';

  async function waitClient(){
    for(let i=0;i<80&&!window.vareliaSupabase;i++)await sleep(100);
    sb=window.vareliaSupabase;
    return sb;
  }

  async function loadProfile(){
    if(!sb)return null;
    const {data:u}=await sb.auth.getUser();
    const user=u?.user;if(!user)return null;
    const {data,error}=await sb.from('profiles').select('id,business_id,role,permissions').eq('id',user.id).maybeSingle();
    if(error)throw error;
    profile=data;businessId=String(data?.business_id||'');role=String(data?.role||'');
    return profile;
  }

  async function fetchCategories(){
    const {data,error}=await sb.from('varelia_categories').select('id,name').eq('business_id',businessId).order('name');
    if(error)throw error;
    return data||[];
  }

  async function ensureCategory(name){
    name=String(name||'').trim();
    if(!name)return null;
    let {data,error}=await sb.from('varelia_categories').select('id,name').eq('business_id',businessId).eq('name',name).maybeSingle();
    if(error)throw error;
    if(data?.id)return data.id;
    if(!isOwner())return null;
    const ins=await sb.from('varelia_categories').insert({business_id:businessId,name}).select('id').single();
    if(ins.error){
      const again=await sb.from('varelia_categories').select('id').eq('business_id',businessId).eq('name',name).maybeSingle();
      if(again.error)throw ins.error;
      return again.data?.id||null;
    }
    return ins.data?.id||null;
  }

  function productPayload(p,categoryId){
    return {
      business_id:businessId,
      category_id:categoryId||null,
      legacy_id:String(p.id||''),
      barcode:String(p.barcode||'').trim()||null,
      name:String(p.name||'Producto').trim()||'Producto',
      description:String(p.description||''),
      specifications:String(p.variants||p.specifications||''),
      buy_price:Math.max(0,Number(p.buyPrice)||0),
      sell_price:Math.max(0,Number(p.sellPrice)||0),
      stock:Math.max(0,Number(p.stock)||0),
      unit:String(p.unit||'Unidad'),
      reorder_level:Math.max(0,Number(p.reorderLevel)||0),
      image_data:String(p.image||'')
    };
  }

  async function seedIfNeeded(){
    const countRes=await sb.from('varelia_products').select('id',{count:'exact',head:true}).eq('business_id',businessId);
    if(countRes.error)throw countRes.error;
    if((countRes.count||0)>0)return true;
    if(!isOwner())return false;

    const ps=localProducts();
    if(!ps.length)return false;

    const categoryNames=[...new Set([...localCategories(),...ps.map(p=>p.category)].map(x=>String(x||'').trim()).filter(Boolean))];
    const categoryMap=new Map();
    for(const name of categoryNames){
      const id=await ensureCategory(name);
      if(id)categoryMap.set(name,id);
    }

    for(const p of ps){
      const legacy=String(p.id||'').trim();
      if(!legacy)continue;
      const existing=await sb.from('varelia_products').select('id').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(existing.error)throw existing.error;
      if(existing.data?.id){p._cloudId=existing.data.id;continue}
      const payload=productPayload(p,categoryMap.get(String(p.category||'').trim())||null);
      const ins=await sb.from('varelia_products').insert(payload).select('id').single();
      if(ins.error)throw ins.error;
      p._cloudId=ins.data.id;
    }
    toast('Inventario conectado y respaldado en la nube.','ok');
    return true;
  }

  async function refreshCloud(){
    if(!sb||!businessId)return false;
    const [catsRes,prodRes]=await Promise.all([
      sb.from('varelia_categories').select('id,name').eq('business_id',businessId).order('name'),
      sb.from('varelia_products').select('id,legacy_id,category_id,barcode,name,description,specifications,buy_price,sell_price,stock,unit,reorder_level,image_data').eq('business_id',businessId).order('created_at')
    ]);
    if(catsRes.error)throw catsRes.error;
    if(prodRes.error)throw prodRes.error;
    const rows=prodRes.data||[];
    if(!rows.length)return false;

    const catMap=new Map((catsRes.data||[]).map(x=>[String(x.id),String(x.name||'')]));
    const mapped=rows.map(p=>({
      id:String(p.legacy_id||p.id),
      _cloudId:String(p.id),
      barcode:String(p.barcode||''),
      name:String(p.name||'Producto'),
      category:catMap.get(String(p.category_id||''))||'',
      buyPrice:Number(p.buy_price)||0,
      sellPrice:Number(p.sell_price)||0,
      stock:Number(p.stock)||0,
      unit:String(p.unit||'Unidad'),
      reorderLevel:Number(p.reorder_level)||0,
      description:String(p.description||''),
      specifications:String(p.specifications||''),
      variants:String(p.specifications||''),
      image:String(p.image_data||'')
    }));

    try{
      products=mapped;
      categories=(catsRes.data||[]).map(x=>String(x.name||'')).filter(Boolean);
      window.products=products;
      if(typeof K!=='undefined'){
        localStorage.setItem(K.products,JSON.stringify(products));
        localStorage.setItem(K.categories,JSON.stringify(categories));
      }
      if(typeof render==='function')render();
      window.dispatchEvent(new CustomEvent('varelia:central-stock-updated'));
      return true;
    }catch(e){console.error('No se pudo aplicar inventario central',e);return false}
  }

  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>refreshCloud().catch(e=>console.error('Sync stock',e)),120);
  }

  async function syncProduct(p){
    if(!isOwner()||!p)return;
    const categoryId=await ensureCategory(p.category);
    const payload=productPayload(p,categoryId);

    if(p._cloudId){
      const up=await sb.from('varelia_products').update(payload).eq('id',p._cloudId).eq('business_id',businessId).select('id').maybeSingle();
      if(up.error)throw up.error;
    }else{
      const legacy=String(p.id||'');
      const ex=await sb.from('varelia_products').select('id').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(ex.error)throw ex.error;
      if(ex.data?.id){
        p._cloudId=ex.data.id;
        const up=await sb.from('varelia_products').update(payload).eq('id',p._cloudId).eq('business_id',businessId);
        if(up.error)throw up.error;
      }else{
        const ins=await sb.from('varelia_products').insert(payload).select('id').single();
        if(ins.error)throw ins.error;
        p._cloudId=ins.data.id;
      }
    }
    window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'));
  }

  function installProductBridge(){
    const fn=p=>syncProduct(p).catch(e=>{console.error(e);toast('No se pudo sincronizar el producto.','warn');throw e});
    try{syncProductToCloud=fn}catch{}
    window.syncProductToCloud=fn;

    window.deleteProduct=async function(id){
      if(!isOwner())return toast('Solo el administrador puede eliminar productos.','warn');
      const target=String(id||'').trim();
      const p=localProducts().find(x=>String(x.id).trim()===target);
      if(!p)return;
      if(!confirm('¿Deseas eliminar definitivamente "'+p.name+'"?'))return;
      try{
        let q=sb.from('varelia_products').delete().eq('business_id',businessId);
        q=p._cloudId?q.eq('id',p._cloudId):q.eq('legacy_id',target);
        const del=await q;
        if(del.error)throw del.error;
        products=localProducts().filter(x=>String(x.id).trim()!==target);
        window.products=products;
        try{
          if(String(inventoryProductId).trim()===target)inventoryProductId=null;
          localStorage.setItem(K.products,JSON.stringify(products));
          if(productDialog?.open)productDialog.close();
          if(typeof render==='function')render();
        }catch{}
        window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'));
        toast('Producto eliminado.','ok');
      }catch(e){
        console.error(e);
        toast('No se pudo eliminar el producto porque tiene movimientos asociados o hubo un error.','warn');
      }
    };
  }

  async function refreshPublicStock(){
    try{
      const r=await sb.rpc('varelia_refresh_public_catalog_stock',{});
      if(r.error)throw r.error;
    }catch(e){console.warn('Catálogo stock',e)}
  }

  async function ensureCloudProductId(p){
    if(!p)return '';
    if(p._cloudId)return String(p._cloudId);
    const legacy=String(p.id||'').trim();
    if(legacy){
      const q=await sb.from('varelia_products').select('id').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(q.error)throw q.error;
      if(q.data?.id){p._cloudId=String(q.data.id);return p._cloudId}
    }
    if(isOwner()){
      await syncProduct(p);
      return String(p._cloudId||'');
    }
    return '';
  }

  async function centralCheckout(){
    if(saleBusy)return;
    let current=[];
    try{current=Array.isArray(cart)?cart.map(x=>({...x})):[]}catch{}
    if(!current.length)return alert('El carrito está vacío.');

    saleBusy=true;
    const legacy=document.getElementById('checkout');
    const pos=document.getElementById('vposCheckout');
    if(legacy)legacy.disabled=true;if(pos)pos.disabled=true;

    try{
      const payload=[];
      for(const item of current){
        let p=localProducts().find(x=>String(x.id)===String(item.id));
        if(!p)throw new Error('Producto no encontrado: '+String(item.name||''));
        const cloudId=await ensureCloudProductId(p);
        if(!cloudId)throw new Error('Este producto aún no está sincronizado. Actualiza la página e inténtalo nuevamente.');
        payload.push({product_id:cloudId,qty:Math.max(1,Math.floor(Number(item.qty)||1))});
      }

      const {data,error}=await sb.rpc('varelia_commit_sale',{p_items:payload,p_source:'Venta'});
      if(error)throw error;

      const remoteItems=Array.isArray(data?.items)?data.items:[];
      const soldItems=current.map((item,i)=>{
        const p=localProducts().find(x=>String(x.id)===String(item.id));
        const remote=remoteItems.find(x=>String(x.product_id)===String(p?._cloudId))||remoteItems[i]||{};
        return {
          ...item,
          cloudProductId:String(remote.product_id||p?._cloudId||''),
          cloudSaleItemId:String(remote.sale_item_id||'')
        };
      });

      try{
        sales.push({
          id:(typeof uid==='function'?uid():String(Date.now())),
          cloudSaleId:String(data?.sale_id||''),
          date:new Date().toISOString(),
          items:soldItems,
          total:Number(data?.total)||current.reduce((a,i)=>a+(Number(i.price)||0)*(Number(i.qty)||0),0)
        });
        cart=[];
        try{if(saleDialog?.open)saleDialog.close()}catch{}
      }catch(e){console.warn('Historial local',e)}

      await refreshCloud();
      try{if(typeof save==='function')save()}catch{}
      await refreshPublicStock();
      toast('Venta registrada y stock actualizado.','ok');
      try{window.vareliaSound?.('sale')}catch{}
    }catch(e){
      console.error(e);
      toast(e?.message||'No se pudo registrar la venta.','warn');
      await refreshCloud().catch(()=>{});
    }finally{
      saleBusy=false;
      if(legacy)legacy.disabled=false;if(pos)pos.disabled=false;
    }
  }

  function installCheckoutBridge(){
    const btn=document.getElementById('checkout');
    if(!btn)return;
    btn.onclick=centralCheckout;
    btn.dataset.centralStock='1';
  }

  window.vareliaCentralStockIn=async function({product,event='restock',qty}){
    if(!product)throw new Error('Selecciona un producto.');
    const cloudId=await ensureCloudProductId(product);
    if(!cloudId)throw new Error('El producto todavía no está sincronizado.');
    const {data,error}=await sb.rpc('varelia_staff_stock_in',{
      p_product_id:cloudId,
      p_qty:Math.max(1,Math.floor(Number(qty)||1)),
      p_event:event==='return'?'return':'restock'
    });
    if(error)throw error;
    await refreshCloud();
    await refreshPublicStock();
    return data||{};
  };

  window.vareliaCentralReturn=async function({saleId,saleItemId,qty}){
    if(!saleId||!saleItemId)throw new Error('La venta anterior no está vinculada a la nube.');
    const {data,error}=await sb.rpc('varelia_return_sale_item',{
      p_sale_id:saleId,
      p_sale_item_id:saleItemId,
      p_qty:Math.max(1,Math.floor(Number(qty)||1))
    });
    if(error)throw error;
    await refreshCloud();
    await refreshPublicStock();
    return data||{};
  };

  function subscribe(){
    try{
      if(channel)sb.removeChannel(channel);
      channel=sb.channel('varelia-stock-'+businessId)
        .on('postgres_changes',{event:'*',schema:'public',table:'varelia_products',filter:'business_id=eq.'+businessId},scheduleRefresh)
        .subscribe();
    }catch(e){console.warn('Realtime stock',e)}
  }

  async function init(){
    try{
      if(!await waitClient())return;
      if(!await loadProfile()||!businessId)return;
      await seedIfNeeded();
      await refreshCloud();
      installProductBridge();
      installCheckoutBridge();
      subscribe();

      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        installProductBridge();
        installCheckoutBridge();
        if(tries>60)clearInterval(timer);
      },500);

      addEventListener('focus',scheduleRefresh);
      addEventListener('pageshow',scheduleRefresh);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh()});
    }catch(e){
      console.error('Varelia central stock',e);
      toast('No se pudo activar la sincronización central del inventario. Tus datos locales no fueron borrados.','warn');
    }
  }

  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(init,80),{once:true});
  setTimeout(init,350);
})();