(()=>{
  if(window.__vareliaCentralStockSync)return;
  window.__vareliaCentralStockSync=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  let sb=null,profile=null,businessId='',role='',channel=null,refreshTimer=null,saleBusy=false,initBusy=false,initAgain=false,retryTimer=null,retryDelay=2500;

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
    const {data:found,error}=await sb.from('profiles').select('id,business_id,role,permissions').eq('id',user.id).maybeSingle();
    if(error)throw error;
    let data=found;
    // Si una cuenta Gmail nueva todavía no tiene perfil, créale/reutiliza
    // exclusivamente su negocio antes de sincronizar el inventario.
    if(!data?.business_id&&typeof window.vareliaEnsureAccount==='function'){
      data=await window.vareliaEnsureAccount(user);
    }
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
    // Refrescar siempre la cuenta activa antes de escribir. Evita guardar la categoría
    // con un business_id viejo si la sesión/cuenta cambió recientemente.
    await loadProfile();
    if(!businessId)throw new Error('La cuenta no tiene negocio activo.');
    if(!isOwner())throw new Error('Solo el administrador puede crear categorías.');
    let {data,error}=await sb.from('varelia_categories').select('id,name').eq('business_id',businessId).eq('name',name).maybeSingle();
    if(error)throw error;
    if(data?.id)return data.id;
    if(!isOwner())return null;
    const ins=await sb.from('varelia_categories').insert({business_id:businessId,name}).select('id').single();
    if(ins.error){
      const again=await sb.from('varelia_categories').select('id').eq('business_id',businessId).eq('name',name).maybeSingle();
      if(again.error)throw ins.error;
      if(!again.data?.id)throw ins.error;
      return again.data.id;
    }
    if(ins.error||!ins.data?.id)throw new Error('La categoría no quedó registrada en la base de datos.');
    const verify=await sb.from('varelia_categories').select('id,business_id,name').eq('business_id',businessId).eq('id',ins.data.id).maybeSingle();
    if(verify.error)throw verify.error;
    if(!verify.data?.id)throw new Error('La categoría no quedó registrada en la base de datos.');
    return verify.data.id;
  }

  window.vareliaEnsureCategory=async function(name){
    if(!businessId)throw new Error('Cuenta todavía no inicializada.');
    const id=await ensureCategory(name);
    if(!id)throw new Error('No se pudo asociar la categoría a esta cuenta.');
    // No recargar toda la lista aquí: el botón de categorías actualiza la UI
    // después de confirmar el INSERT. Así evitamos que otra sincronización concurrente
    // sobrescriba la categoría recién creada.
    return id;
  };

  function productPayload(p,categoryId){
    return {
      business_id:businessId,
      category_id:categoryId||null,
      legacy_id:String(p.id||''),
      barcode:String(p.barcode||'').trim()||null,
      name:String(p.name||'Producto').trim()||'Producto',
      description:String(p.description||''),
      specifications:String(p.specifications||''),
      variants:String(p.variants||''),
      characteristics:Array.isArray(p.characteristics)?p.characteristics:[],
      variant_combinations:Array.isArray(p.variantCombinations)?p.variantCombinations:[],
      buy_price:Math.max(0,Number(p.buyPrice)||0),
      sell_price:Math.max(0,Number(p.sellPrice)||0),
      stock:Math.max(0,Number(p.stock)||0),
      unit:String(p.unit||'Unidad'),
      reorder_level:Math.max(0,Number(p.reorderLevel)||0),
      image_data:String(p.image||''),
      medicine:!!p.medicine,
      laboratory:String(p.laboratory||'').trim()||null,
      medicine_presentation:String(p.medicinePresentation||'').trim()||null,
      batch:String(p.batch||'').trim()||null,
      expiry_date:String(p.expiryDate||'').trim()||null,
      blisters_per_box:Math.max(1,Math.floor(Number(p.blistersPerBox)||1)),
      units_per_blister:Math.max(1,Math.floor(Number(p.unitsPerBlister)||1)),
      box_price:Math.max(0,Number(p.boxPrice)||0),
      blister_price:Math.max(0,Number(p.blisterPrice)||0),
      unit_medicine_price:Math.max(0,Number(p.unitMedicinePrice)||0),
      medicine_stock_boxes:Math.max(0,Math.floor(Number(p.medicineStockBoxes)||0))
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
    if(!sb)throw new Error('Supabase no está disponible.');
    if(!businessId)throw new Error('La cuenta no tiene negocio activo.');
    const [catsRes,prodRes]=await Promise.all([
      sb.from('varelia_categories').select('id,name').eq('business_id',businessId).order('name'),
      sb.from('varelia_products').select('id,legacy_id,category_id,barcode,name,description,specifications,variants,characteristics,variant_combinations,buy_price,sell_price,stock,unit,reorder_level,image_data,medicine,laboratory,medicine_presentation,batch,expiry_date,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,medicine_stock_boxes').eq('business_id',businessId).order('created_at')
    ]);
    if(catsRes.error)throw catsRes.error;
    if(prodRes.error)throw prodRes.error;
    const rows=prodRes.data||[];
    // Las categorías deben sincronizarse aunque el negocio todavía no tenga productos.
    const catRows=catsRes.data||[];
    categories=catRows.map(x=>String(x.name||'')).filter(Boolean);
    window.categories=categories;
    try{
      if(typeof K!=='undefined')localStorage.setItem(K.categories,JSON.stringify(categories));
      if(typeof renderCategories==='function')renderCategories();
    }catch(e){console.warn('No se pudo guardar categorías locales',e)}
    if(!rows.length){
      if(typeof render==='function')render();
      window.dispatchEvent(new CustomEvent('varelia:central-stock-updated'));
      return true;
    }

    const catMap=new Map(catRows.map(x=>[String(x.id),String(x.name||'')]));
    const mapped=rows.map(p=>{
      const variantTotal=Array.isArray(p.variant_combinations)?p.variant_combinations.reduce((a,c)=>a+(Number(c?.stock)||0),0):0;
      const remoteStock=Number(p.stock)||0;
      // Si el stock principal quedó en 0 pero las tallas/colores sí tienen unidades,
      // el inventario debe mostrar la suma de las combinaciones.
      const effectiveRemoteStock=(remoteStock<=0&&variantTotal>0)?variantTotal:remoteStock;
      const key=String(p.id||'');
      const pending=lastProductStockWrite.get(key);
      const stock=(pending&&Date.now()-pending.at<5000)?pending.stock:effectiveRemoteStock;
      return {
      id:String(p.legacy_id||p.id),
      _cloudId:String(p.id),
      barcode:String(p.barcode||''),
      name:String(p.name||'Producto'),
      category:catMap.get(String(p.category_id||''))||'',
      buyPrice:Number(p.buy_price)||0,
      sellPrice:Number(p.sell_price)||0,
      stock:stock,
      unit:String(p.unit||'Unidad'),
      reorderLevel:Number(p.reorder_level)||0,
      description:String(p.description||''),
      specifications:String(p.specifications||''),
      variants:String(p.variants||''),
      characteristics:Array.isArray(p.characteristics)?p.characteristics:[],
      variantCombinations:Array.isArray(p.variant_combinations)?p.variant_combinations:[],
      image:String(p.image_data||''),
      medicine:!!p.medicine,
      laboratory:String(p.laboratory||''),
      medicinePresentation:String(p.medicine_presentation||''),
      batch:String(p.batch||''),
      expiryDate:String(p.expiry_date||''),
      blistersPerBox:Number(p.blisters_per_box)||1,
      unitsPerBlister:Number(p.units_per_blister)||1,
      boxPrice:Number(p.box_price)||0,
      blisterPrice:Number(p.blister_price)||0,
      unitMedicinePrice:Number(p.unit_medicine_price)||0,
      medicineStockBoxes:Number(p.medicine_stock_boxes)||0
      };
    });

    products=mapped;
    window.products=products;
    try{
      if(typeof K!=='undefined'){
        localStorage.setItem(K.products,JSON.stringify(products));
        localStorage.setItem(K.categories,JSON.stringify(categories));
      }
    }catch(e){console.warn('No se pudo guardar copia local del inventario:',e)}
    try{
      if(typeof render==='function')render();
    }catch(e){console.warn('La interfaz no pudo renderizar el inventario, pero la nube sí respondió:',e)}
    try{window.dispatchEvent(new CustomEvent('varelia:central-stock-updated'))}catch{}
    return true
  }

  let suppressRefreshUntil=0;
  let lastProductStockWrite=new Map();
  function scheduleRefresh(){
    clearTimeout(refreshTimer);
    const wait=Math.max(120,suppressRefreshUntil-Date.now()+150);
    refreshTimer=setTimeout(async()=>{
      try{
        if(Date.now()<suppressRefreshUntil)return scheduleRefresh();
        await refreshCloud();
      }catch(e){console.error('Sync stock',e)}
    },wait);
  }

  const productSyncLocks=new Map();
  async function syncProduct(p){
    if(!isOwner()||!p)return;
    const key=String(p.id||'');
    if(productSyncLocks.has(key))return productSyncLocks.get(key);
    suppressRefreshUntil=Date.now()+2500;
    const task=(async()=>{
      const categoryId=await ensureCategory(p.category);
      // Última defensa para productos nuevos: si el objeto llega con stock 0,
      // recuperar la cantidad que el administrador acaba de escribir en el campo visible.
      if(!p._cloudId && Math.max(0,Number(p.stock)||0)===0){
        const field=document.getElementById('productQty');
        const remembered=window.vareliaProductQtyLast;
        const raw=field?.value??remembered??'';
        if(String(raw).trim()!=='')p.stock=Math.max(0,Number(raw)||0);
      }
      // Defensa final: para productos con tallas/colores, el stock principal siempre
      // debe ser la suma de las cantidades de las combinaciones visibles.
      if(Array.isArray(p.variantCombinations)&&p.variantCombinations.length){
        const variantTotal=p.variantCombinations.reduce((a,c)=>a+(Number(c?.stock)||0),0);
        if(variantTotal>0)p.stock=variantTotal;
      }
      const payload=productPayload(p,categoryId);
      const legacy=String(p.id||'');
      const existingBefore=await sb.from('varelia_products').select('id,stock').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
      if(existingBefore.error)throw existingBefore.error;
      const existedBefore=!!existingBefore.data?.id;
      // Upsert atómico por negocio + id local: evita dos INSERT simultáneos
      // cuando el formulario y las características se guardan en el mismo instante.
      let up=await sb.from('varelia_products').upsert(payload,{onConflict:'business_id,legacy_id'}).select('id').single();
      // Respaldo seguro: si el upsert no puede resolver el conflicto, buscar y actualizar/insertar sin perder el producto nuevo.
      if(up.error){
        const found=await sb.from('varelia_products').select('id').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle();
        if(found.error)throw up.error;
        if(found.data?.id)up=await sb.from('varelia_products').update(payload).eq('id',found.data.id).select('id').single();
        else up=await sb.from('varelia_products').insert(payload).select('id').single();
      }
      if(up.error)throw up.error;
      if(!up.data?.id)throw new Error('La base de datos no devolvió el producto guardado.');
      // Verificación real: no mostramos "guardado" hasta comprobar que el registro
      // existe en la cuenta/negocio correcto después del INSERT/UPSERT.
      const verify=await sb.from('varelia_products')
        .select('id,legacy_id,business_id,name,stock,sell_price,buy_price')
        .eq('business_id',businessId)
        .eq('id',up.data.id)
        .maybeSingle();
      if(verify.error)throw verify.error;
      if(!verify.data?.id)throw new Error('El producto no quedó registrado en la base de datos.');
      if(String(verify.data.business_id)!==String(businessId))throw new Error('El producto quedó asociado a otra cuenta.');
      // Verificación de stock: la cantidad escrita en el formulario debe quedar
      // exactamente igual en Supabase. Si algún proceso intermedio la cambia,
      // hacemos una corrección explícita y volvemos a comprobarla antes de
      // considerar el producto guardado.
      const expectedStock=Array.isArray(p.variantCombinations)&&p.variantCombinations.length
        ? Math.max(0,p.variantCombinations.reduce((a,c)=>a+(Number(c?.stock)||0),0))
        : Math.max(0,Number(p.stock)||0);
      let verifiedStock=Number(verify.data.stock)||0;
      if(Math.abs(verifiedStock-expectedStock)>0.000001){
        const repair=await sb.from('varelia_products')
          .update({stock:expectedStock})
          .eq('business_id',businessId)
          .eq('id',verify.data.id)
          .select('id,stock')
          .maybeSingle();
        if(repair.error)throw repair.error;
        if(!repair.data?.id||Math.abs((Number(repair.data.stock)||0)-expectedStock)>0.000001){
          throw new Error('La cantidad inicial no pudo quedar guardada correctamente.');
        }
        verifiedStock=Number(repair.data.stock)||0;
      }
      if(!existedBefore&&verifiedStock>0){
        const mv=await sb.from('varelia_inventory_movements').insert({business_id:businessId,product_id:verify.data.id,product_name:verify.data.name,type:'add',qty:Number(verify.data.stock),stock_before:0,stock_after:Number(verify.data.stock),source:'producto_nuevo'});
        if(mv.error)throw mv.error;
      }
      p._cloudId=verify.data.id;
      lastProductStockWrite.set(String(verify.data.id),{stock:verifiedStock,at:Date.now()});
      suppressRefreshUntil=Date.now()+5000;
      await refreshPublicStock();
      window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'));
    })().finally(()=>productSyncLocks.delete(key));
    productSyncLocks.set(key,task);
    return task;
  }

  function installProductBridge(){
    const fn=p=>syncProduct(p).catch(e=>{console.error(e);toast('No se pudo sincronizar el producto.','warn');throw e});
    try{syncProductToCloud=fn}catch{}
    window.syncProductToCloud=fn;
    window.vareliaCentralStockSyncProduct=fn;
    window.vareliaCentralStockReady=true;
  window.__VARELIA_STOCK_SYNC_BUILD__='20261007-STOCK-FIX-V6';

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
        payload.push({product_id:cloudId,qty:Math.max(0.001,Number(item.qty)||0)});
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

  function installCategoryBridge(){
    const btn=document.getElementById('addCategory');
    const input=document.getElementById('newCategoryName');
    if(!btn||!input||btn.dataset.centralCategories==='1')return;
    btn.dataset.centralCategories='1';
    btn.onclick=async()=>{
      const name=String(input.value||'').trim();
      if(!name)return toast('Escribe el nombre de la categoría.','warn');
      if(!isOwner())return toast('Solo el administrador puede crear categorías.','warn');
      btn.disabled=true;
      try{
        await ensureCategory(name);
        if(!categories.some(c=>String(c)===name))categories.push(name);
        window.categories=categories;
        try{localStorage.setItem(K.categories,JSON.stringify(categories))}catch{}
        if(typeof renderCategories==='function')renderCategories();
        if(typeof fillCats==='function')fillCats();
        input.value='';
        toast('Categoría guardada.','ok');
      }catch(e){
        console.error(e);
        toast('No se pudo guardar la categoría.','warn');
      }finally{btn.disabled=false}
    };
  }

  function installCategoryDeleteBridge(){
    const list=document.getElementById('categoryList');
    if(!list||list.dataset.centralDelete==='1')return;
    list.dataset.centralDelete='1';
    list.addEventListener('click',async e=>{
      const btn=e.target.closest('[data-delcat]');
      if(!btn)return;
      e.preventDefault();e.stopPropagation();
      const name=String(btn.dataset.delcat||'').trim();
      if(!name)return;
      if(!isOwner())return toast('Solo el administrador puede eliminar categorías.','warn');
      const used=localProducts().filter(p=>String(p.category||'')===name).length;
      if(used>0)return toast('No se puede eliminar "'+name+'" porque tiene '+used+' producto(s). Mueve primero esos productos a otra categoría.','warn');
      if(!confirm('¿Eliminar la categoría "'+name+'"?'))return;
      btn.disabled=true;
      try{
        const del=await sb.from('varelia_categories').delete().eq('business_id',businessId).eq('name',name);
        if(del.error)throw del.error;
        categories=categories.filter(c=>String(c)!==name);window.categories=categories;
        try{localStorage.setItem(K.categories,JSON.stringify(categories));renderCategories()}catch{}
        await refreshCloud();
        toast('Categoría eliminada.','ok');
      }catch(err){
        console.error(err);
        toast('No se pudo eliminar la categoría.','warn');
        btn.disabled=false;
      }
    },true);
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
    if(initBusy){initAgain=true;return}
    initBusy=true;
    try{
      if(!await waitClient())throw new Error('Supabase todavía no está listo. Se reintentará la conexión.');
      // Siempre volver a leer el perfil: businessId/rol pueden haber cambiado al entrar con otra cuenta.
      // No salir silenciosamente: un cliente o perfil ausente debe activar el reintento automático.
      const activeProfile=await loadProfile();
      if(!activeProfile)throw new Error('No se detectó una sesión activa. Se reintentará la conexión.');
      if(!businessId)throw new Error('Esta cuenta no tiene un negocio vinculado. Se reintentará la conexión.');
      if(channel){try{await sb.removeChannel(channel)}catch{} channel=null;}
      // La sincronización no debe quedar bloqueada por un respaldo inicial fallido.
      // Primero intentamos traer la cuenta desde la nube; si falla, reintentamos.
      try{ await seedIfNeeded(); }catch(seedErr){ console.warn('Respaldo inicial omitido:',seedErr); }
      let cloudOk=false,lastErr=null;
      for(let attempt=1;attempt<=3&&!cloudOk;attempt++){
        try{
          cloudOk=await refreshCloud();
          if(!cloudOk)throw new Error('La nube no devolvió el inventario.');
        }catch(syncErr){
          lastErr=syncErr;
          if(attempt<3)await sleep(700*attempt);
        }
      }
      if(!cloudOk)throw lastErr||new Error('No se pudo sincronizar con Supabase.');
      installProductBridge();
      installCategoryBridge();
      installCategoryDeleteBridge();
      installCheckoutBridge();
      subscribe();
      clearTimeout(retryTimer);retryTimer=null;retryDelay=2500;
      window.dispatchEvent(new CustomEvent('varelia:sync-connected',{detail:{businessId:String(businessId),products:localProducts().length}}));

      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        installProductBridge();
        installCategoryBridge();
        installCategoryDeleteBridge();
        installCheckoutBridge();
        if(tries>60)clearInterval(timer);
      },500);

      addEventListener('focus',scheduleRefresh);
      addEventListener('pageshow',scheduleRefresh);
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh()});
    }catch(e){
      console.error('Varelia central stock',e);
      window.dispatchEvent(new CustomEvent('varelia:business-scope-error',{detail:{error:e}}));
      window.dispatchEvent(new CustomEvent('varelia:sync-error',{detail:{message:String(e?.message||e?.details||e?.hint||e||'Error desconocido')}}));
      const msg=String(e?.message||e?.details||e?.hint||e||'Error desconocido');
      toast('No se pudo sincronizar: '+msg.slice(0,180),'warn');
      // Reintento automático real cuando falla la nube; nunca borra el inventario local.
      clearTimeout(retryTimer);
      retryTimer=setTimeout(()=>{if(navigator.onLine!==false)init().catch(err=>console.error('Reintento de nube',err))},retryDelay);
      retryDelay=Math.min(retryDelay*2,20000);
    }finally{
      initBusy=false;
      // No perder un evento de inicio de sesión que llegue mientras la primera inicialización está activa.
      if(initAgain){
        initAgain=false;
        setTimeout(()=>init().catch(e=>console.error('Varelia reintento de sincronización',e)),120);
      }
    }
  }

  // Sincronización forzada: vuelve a validar la cuenta activa y trae inmediatamente
  // inventario/categorías desde Supabase. No depende de realtime ni del temporizador.
  window.vareliaForceSync=async function(){
    if(!sb)await waitClient();
    if(!sb)throw new Error('Supabase todavía no está disponible.');
    const oldBusiness=String(businessId||'');
    await loadProfile();
    if(!businessId)throw new Error('La cuenta no tiene negocio activo.');
    // Nunca borrar los datos locales durante una sincronización.
    // Cada cuenta ya usa claves locales separadas por business_id.
    if(oldBusiness&&oldBusiness!==String(businessId)){
      console.info('Varelia: cambio de negocio detectado',oldBusiness,'->',businessId);
    }
    if(channel){try{await sb.removeChannel(channel)}catch{} channel=null;}
    await refreshCloud();
    await refreshPublicStock();
    subscribe();
    window.dispatchEvent(new CustomEvent('varelia:forced-sync-complete',{detail:{businessId:String(businessId)}}));
    return {businessId:String(businessId),products:localProducts().length,categories:localCategories().length};
  };

  // Reiniciar la sincronización cada vez que cambia la cuenta activa.
  // Antes se ejecutaba una sola vez y, al cambiar de administrador, la vista podía seguir apuntando al negocio anterior.
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>init().catch(e=>console.error('Varelia cambio de cuenta',e)),80));
  setTimeout(init,350);
})();