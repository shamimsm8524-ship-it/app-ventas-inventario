(()=>{
  if(window.__vareliaCentralStockSync)return;
  window.__vareliaCentralStockSync=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const withTimeout=(promise,ms,label)=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' no respondió en '+Math.round(ms/1000)+' segundos. Se reintentará automáticamente.')),ms))]);
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  let sb=null,profile=null,businessId='',role='',channel=null,refreshTimer=null,saleBusy=false,initBusy=false,initAgain=false,retryTimer=null,retryDelay=2500;
  let stockSnapshot=null,stockPollTimer=null,stockPollBusy=false;

  const localProducts=()=>{try{return Array.isArray(products)?products:[]}catch{return[]}};
  const localCategories=()=>{try{return Array.isArray(categories)?categories:[]}catch{return[]}};
  const isOwner=()=>role==='owner';

  const ADV_PRICING_RE=/\s*\[\[VARELIA_ADV_PRICING_V1:([^\]]+)\]\]\s*$/;
  function stripAdvancedPricing(value){return String(value||'').replace(ADV_PRICING_RE,'').trimEnd()}
  function normalizeAdvancedPricing(raw){
    const r=raw&&typeof raw==='object'?raw:{};
    return {
      version:1,proxy:!!r.proxy,
      dozenEnabled:!!r.dozenEnabled,dozenPrice:Math.max(0,Number(r.dozenPrice)||0),
      wholesaleEnabled:!!r.wholesaleEnabled,wholesaleMinQty:Math.max(2,Math.floor(Number(r.wholesaleMinQty)||12)),wholesalePrice:Math.max(0,Number(r.wholesalePrice)||0),
      promoEnabled:!!r.promoEnabled,promoType:['percent','fixed'].includes(String(r.promoType))?String(r.promoType):'percent',promoValue:Math.max(0,Number(r.promoValue)||0),
      promoStart:String(r.promoStart||''),promoEnd:String(r.promoEnd||''),promoName:String(r.promoName||'Promoción').trim()||'Promoción',
      baseSellPrice:Math.max(0,Number(r.baseSellPrice)||0),baseBuyPrice:Math.max(0,Number(r.baseBuyPrice)||0),baseUnit:String(r.baseUnit||'Unidad')
    };
  }
  function readAdvancedPricing(value){
    const m=String(value||'').match(ADV_PRICING_RE);if(!m)return null;
    try{return normalizeAdvancedPricing(JSON.parse(decodeURIComponent(m[1])))}catch{return null}
  }
  function localDay(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
  function advancedPromoActive(c){const day=localDay();return !!(c?.promoEnabled&&Number(c.promoValue)>0&&(!c.promoStart||day>=c.promoStart)&&(!c.promoEnd||day<=c.promoEnd))}
  function advancedPromoPrice(base,c){base=Math.max(0,Number(base)||0);if(!advancedPromoActive(c))return Math.round(base*100)/100;const out=c.promoType==='fixed'?Math.max(.01,base-c.promoValue):Math.max(.01,base*(1-Math.min(100,c.promoValue)/100));return Math.round(out*100)/100}
  function pricingProxyFor(p){const c=normalizeAdvancedPricing(p?.advancedPricing||{});return !p?.medicine&&(c.dozenEnabled||c.wholesaleEnabled||c.promoEnabled)?c:null}
  function writeAdvancedPricing(spec,p,c){
    const clean=stripAdvancedPricing(spec);if(!c)return clean;
    const meta={...c,proxy:true,baseSellPrice:Math.max(0,Number(p.sellPrice)||0),baseBuyPrice:Math.max(0,Number(p.buyPrice)||0),baseUnit:String(p.unit||'Unidad')};
    const tag='[[VARELIA_ADV_PRICING_V1:'+encodeURIComponent(JSON.stringify(meta))+']]';
    return clean?clean+'\n'+tag:tag;
  }

  async function waitClient(){
    for(let i=0;i<80&&!window.vareliaSupabase;i++)await sleep(100);
    sb=window.vareliaSupabase;
    return sb;
  }

  async function loadProfile(){
    if(!sb)return null;
    // La sesión persistida puede estar disponible antes de que /auth/v1/user responda.
    // RLS en Supabase sigue validando el JWT en todas las consultas.
    const {data:stored}=await withTimeout(sb.auth.getSession(),12000,'La restauración de sesión');
    let user=stored?.session?.user||null;
    // La sesión almacenada no garantiza que el servidor acepte el JWT.
    // Refrescar el token antes de consultar tablas protegidas por RLS.
    if(stored?.session?.expires_at && stored.session.expires_at*1000 < Date.now()+60000){
      const renewed=await withTimeout(sb.auth.refreshSession(),12000,'La renovación de sesión');
      if(renewed.error)throw new Error('Tu sesión caducó: '+renewed.error.message);
      user=renewed.data?.session?.user||null;
    }
    if(!user){
      const {data:u}=await withTimeout(sb.auth.getUser(),12000,'La verificación de sesión');
      user=u?.user||null;
    }
    if(!user)return null;
    // Compatibilidad con esquemas donde profiles todavía no tiene la columna opcional permissions.
    // Un campo opcional ausente no debe bloquear toda la sincronización del inventario.
    let profileQuery=await withTimeout(sb.from('profiles').select('id,business_id,role,permissions').eq('id',user.id).maybeSingle(),12000,'La consulta del perfil');
    if(profileQuery.error && (profileQuery.error.code==='42703' || /permissions.*(column|field)|column.*permissions/i.test(String(profileQuery.error.message||'')))){
      profileQuery=await withTimeout(sb.from('profiles').select('id,business_id,role').eq('id',user.id).maybeSingle(),12000,'La consulta compatible del perfil');
    }
    if(profileQuery.error)throw profileQuery.error;
    const found=profileQuery.data;
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
    const rawCommercial=p?.commercialPricing||p?.advancedPricing||{};
    const commercial={
      version:2,
      wholesaleEnabled:!!rawCommercial.wholesaleEnabled,
      wholesaleMinQty:Math.max(2,Math.floor(Number(rawCommercial.wholesaleMinQty)||12)),
      wholesalePrice:Math.max(0,Number(rawCommercial.wholesalePrice)||0),
      promoEnabled:!!rawCommercial.promoEnabled,
      promoType:['percent','fixed'].includes(String(rawCommercial.promoType))?String(rawCommercial.promoType):'percent',
      promoValue:Math.max(0,Number(rawCommercial.promoValue)||0),
      promoStart:String(rawCommercial.promoStart||''),
      promoEnd:String(rawCommercial.promoEnd||''),
      promoName:String(rawCommercial.promoName||'Promoción').trim()||'Promoción'
    };
    const presentations=(Array.isArray(p?.salePresentations)?p.salePresentations:[]).map((x,i)=>({
      id:String(x?.id||('presentacion_'+(i+1))).trim(),
      name:String(x?.name||'').trim(),
      units:Math.max(0,Math.floor(Number(x?.units)||0)),
      price:Math.max(0,Number(x?.price)||0),
      active:x?.active!==false
    })).filter(x=>x.id&&x.name&&x.units>0&&x.price>0);
    const medicine=!!p.medicine;
    return {
      business_id:businessId,
      category_id:categoryId||null,
      legacy_id:String(p.id||''),
      barcode:String(p.barcode||'').trim()||null,
      name:String(p.name||'Producto').trim()||'Producto',
      description:String(p.description||''),
      specifications:stripAdvancedPricing(String(p.specifications||'')),
      variants:String(p.variants||''),
      characteristics:Array.isArray(p.characteristics)?p.characteristics:[],
      variant_combinations:Array.isArray(p.variantCombinations)?p.variantCombinations:[],
      buy_price:Math.max(0,Number(p.buyPrice)||0),
      sell_price:Math.max(0,Number(p.sellPrice)||0),
      stock:Math.max(0,Number(p.stock)||0),
      unit:String(p.unit||'Unidad'),
      reorder_level:Math.max(0,Number(p.reorderLevel)||0),
      image_data:String(p.image||''),
      medicine,
      laboratory:medicine?(String(p.laboratory||'').trim()||null):null,
      medicine_presentation:medicine?(String(p.medicinePresentation||'').trim()||null):null,
      batch:medicine?(String(p.batch||'').trim()||null):null,
      expiry_date:medicine?(String(p.expiryDate||'').trim()||null):null,
      blisters_per_box:medicine?Math.max(1,Math.floor(Number(p.blistersPerBox)||1)):null,
      units_per_blister:medicine?Math.max(1,Math.floor(Number(p.unitsPerBlister)||1)):null,
      box_price:medicine?Math.max(0,Number(p.boxPrice)||0):null,
      blister_price:medicine?Math.max(0,Number(p.blisterPrice)||0):null,
      unit_medicine_price:medicine?Math.max(0,Number(p.unitMedicinePrice)||0):null,
      medicine_stock_boxes:medicine?Math.max(0,Math.floor(Number(p.medicineStockBoxes)||0)):null,
      sale_presentations:medicine?[]:presentations,
      advanced_pricing:medicine?{}:commercial
    };
  }

  async function seedIfNeeded(){
    const countRes=await sb.from('varelia_products').select('id',{count:'exact',head:true}).eq('business_id',businessId);
    if(countRes.error)throw countRes.error;
    // No abandonar los datos locales cuando la nube ya tiene algunos productos.
    // Un inventario remoto parcial (por ejemplo, solo una zanahoria) no debe
    // provocar que se pierdan de la vista los productos que aún existen localmente.
    if(!isOwner())return (countRes.count||0)>0;

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
    const [catsRes,prodRes]=await withTimeout(Promise.all([
      sb.from('varelia_categories').select('id,name').eq('business_id',businessId).order('name'),
      sb.from('varelia_products').select('id,legacy_id,category_id,barcode,name,description,specifications,variants,characteristics,variant_combinations,buy_price,sell_price,stock,unit,reorder_level,image_data,medicine,laboratory,medicine_presentation,batch,expiry_date,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,medicine_stock_boxes,sale_presentations,advanced_pricing,updated_at').eq('business_id',businessId).order('created_at')
    ]),15000,'La lectura del inventario en la nube');
    if(catsRes.error)throw catsRes.error;
    if(prodRes.error)throw prodRes.error;
    const rows=prodRes.data||[];
    stockSnapshot=stockVersion(rows);
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
      const rawCommercial=p.advanced_pricing&&typeof p.advanced_pricing==='object'?p.advanced_pricing:{};
      const commercial={version:2,wholesaleEnabled:!!rawCommercial.wholesaleEnabled,wholesaleMinQty:Math.max(2,Math.floor(Number(rawCommercial.wholesaleMinQty)||12)),wholesalePrice:Math.max(0,Number(rawCommercial.wholesalePrice)||0),promoEnabled:!!rawCommercial.promoEnabled,promoType:['percent','fixed'].includes(String(rawCommercial.promoType))?String(rawCommercial.promoType):'percent',promoValue:Math.max(0,Number(rawCommercial.promoValue)||0),promoStart:String(rawCommercial.promoStart||''),promoEnd:String(rawCommercial.promoEnd||''),promoName:String(rawCommercial.promoName||'Promoción').trim()||'Promoción'};
      const presentations=Array.isArray(p.sale_presentations)?p.sale_presentations:[];
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
      specifications:stripAdvancedPricing(String(p.specifications||'')),
      advancedPricing:null,
      commercialPricing:commercial,
      salePresentations:presentations.map((x,i)=>({id:String(x?.id||('presentacion_'+(i+1))),name:String(x?.name||''),units:Math.max(0,Math.floor(Number(x?.units)||0)),price:Math.max(0,Number(x?.price)||0),active:x?.active!==false})).filter(x=>x.name&&x.units>0&&x.price>0),
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
    // Congelar el método elegido ANTES de cualquier espera de red.
    const pay={...(window.VareliaPaymentSnapshot||{})};
    const fiado=pay.method==='Fiado'&&Date.now()-Number(pay.at||0)<30000;
    const client=String(pay.customerName||'').trim();
    if(fiado&&client.length<2){toast('Escribe el nombre del cliente antes de fiar.','warn');return}
    let current=[];
    try{current=Array.isArray(cart)?cart.map(x=>({...x})):[]}catch{}
    // Recuperar primero el respaldo del escáner: en algunos WebView el flujo de cobro
    // vacía el arreglo global antes de que el manejador central valide la venta.
    if(!current.length){
      try{
        const saved=JSON.parse(localStorage.getItem('varelia_scanner_cart_backup_v1')||'[]');
        if(Array.isArray(saved)&&saved.length){
          current=saved.map(x=>({...x})).filter(x=>x.id!=null&&Number(x.qty)>0);
          if(current.length&&Array.isArray(cart)){
            cart.splice(0,cart.length,...current.map(x=>({...x})));
            try{if(typeof renderCart==='function')renderCart()}catch{}
            try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
          }
        }
      }catch(e){console.warn('No se pudo recuperar el respaldo del carrito',e)}
    }
    // Si no hay respaldo, recuperar las filas del POS; normalizar ID/precio/cantidad.
    if(!current.length){
      try{
        const visible=window.VareliaPOS?.getCartItems?.();
        if(Array.isArray(visible)&&visible.length){
          current=visible.map(x=>({...x,id:x.id??x.productId,price:Number(x.price??x.sellPrice)||0,qty:Number(x.qty)||0})).filter(x=>x.id!=null&&x.qty>0);
          if(current.length&&Array.isArray(cart)){
            cart.splice(0,cart.length,...current.map(x=>({...x})));
            try{if(typeof renderCart==='function')renderCart()}catch{}
            try{if(typeof persistSaleCart==='function')persistSaleCart()}catch{}
          }
        }
      }catch(e){console.warn('No se pudo recuperar el carrito visible',e)}
    }
    if(!current.length)return alert('El carrito está vacío. Regresa a Ventas y agrega el producto nuevamente.');

    saleBusy=true;
    const legacy=document.getElementById('checkout');
    const pos=document.getElementById('vposCheckout');
    const legacyLabel=legacy?.textContent||'';
    const posLabel=pos?.textContent||'💳 Cobrar venta';
    if(legacy)legacy.disabled=true;
    if(pos){pos.disabled=true;pos.textContent='⏳ Procesando cobro…';}
    toast('Procesando cobro…','ok');

    try{
      const payload=[];
      for(const item of current){
        let p=localProducts().find(x=>String(x.id)===String(item.id));
        if(!p)throw new Error('Producto no encontrado: '+String(item.name||''));
        const cloudId=await withTimeout(ensureCloudProductId(p),12000,'La sincronización del producto');
        if(!cloudId)throw new Error('Este producto aún no está sincronizado. Actualiza la página e inténtalo nuevamente.');
        const unit=String(item.medicineSaleUnit||item.sale_unit||item.saleUnit||'').trim();
        const presentationId=String(item.salePresentationId||item.presentationId||'').trim();
        const pricingMode=String(item.pricingMode||item.advancedPricingMode||'').trim();
        payload.push({
          product_id:cloudId,
          qty:Math.max(0.001,Number(item.qty)||0),
          unit_price:Math.max(0,Number(item.price)||0),
          ...(unit?{sale_unit:unit}:{}),
          ...(presentationId?{presentation_id:presentationId}:{}),
          ...(pricingMode?{pricing_mode:pricingMode}:{})
        });
      }

      let data=null,error=null,commitTimer=null;
      const commitController=typeof AbortController!=='undefined'?new AbortController():null;
      try{
        const request=fiado
          ?sb.rpc('varelia_commit_credit_sale',{p_items:payload,p_customer_name:client})
          :sb.rpc('varelia_commit_sale',{p_items:payload,p_source:'Venta'});
        let result;
        if(commitController&&request&&typeof request.abortSignal==='function'){
          commitTimer=setTimeout(()=>commitController.abort(),15000);
          result=await request.abortSignal(commitController.signal);
        }else{
          result=await withTimeout(request,15000,'El cobro');
        }
        data=result?.data??null;
        error=result?.error??null;
      }catch(commitError){
        const msg=String(commitError?.message||commitError||'');
        if(commitError?.name==='AbortError'||/abort|no respondió/i.test(msg)){
          throw new Error('El cobro tardó demasiado y se detuvo para que Varelia no quede congelada. Revisa Historial antes de volver a cobrar para evitar duplicar la venta.');
        }
        throw commitError;
      }finally{
        if(commitTimer)clearTimeout(commitTimer);
      }
      if(error)throw error;

      const remoteItems=Array.isArray(data?.items)?data.items:[];
      const soldItems=current.map((item,i)=>{
        const p=localProducts().find(x=>String(x.id)===String(item.id));
        const remote=remoteItems.find(x=>String(x.product_id)===String(p?._cloudId))||remoteItems[i]||{};
        return {
          ...item,
          price:Number(remote.unit_price??item.price)||0,
          saleUnit:String(remote.sale_unit||item.saleUnit||item.unit||''),
          stockQty:Number(remote.stock_qty??item.stockQty??0)||0,
          salePresentationId:String(remote.presentation_id||item.salePresentationId||''),
          salePresentationUnits:Number(remote.presentation_units??item.salePresentationUnits??0)||0,
          cloudProductId:String(remote.product_id||p?._cloudId||''),
          cloudSaleItemId:String(remote.sale_item_id||'')
        };
      });

      let committedSale=null;
      try{
        const committedTotal=Number(data?.total)||current.reduce((a,i)=>a+(Number(i.price)||0)*(Number(i.qty)||0),0);
        const committedDate=new Date().toISOString();
        const committedId=(typeof uid==='function'?uid():String(Date.now()));
        const sellerProfile=window.vareliaCurrentUserProfile||{};
        const sellerRole=String(sellerProfile.role||window.vareliaSellerRole||'').trim().toLowerCase();
        const committedSellerName=sellerRole==='owner'?'':(sellerProfile.full_name||window.vareliaSellerName||
          document.getElementById('vareliaUserEmail')?.textContent?.trim()?.split('@')[0]||'Usuario');
        committedSale={
          id:committedId,
          sellerId:sellerProfile.id||window.vareliaSellerId||'',
          sellerName:committedSellerName,
          sellerRole:sellerRole||'',
          receiptNumber:'V-'+committedDate.slice(0,10).replace(/-/g,'')+'-'+String(committedId).replace(/[^a-z0-9]/gi,'').slice(-6).toUpperCase(),
          cloudSaleId:String(data?.sale_id||''),
          date:committedDate,
          items:soldItems,
          total:committedTotal,
          paymentMethod:fiado?'Fiado':(pay.method||'Efectivo'),
          paymentBreakdown:fiado?{}:(pay.breakdown||{}),
          amountReceived:fiado?0:Math.max(0,Number(pay.received)||committedTotal),
          changeGiven:fiado?0:Math.max(0,Number(pay.change)||0),
          ...(fiado?{customerName:client,paidAmount:0,
            payments:[],paymentStatus:'pending',cloudCreditId:String(data?.credit_sale_id||data?.sale_id||'')}:{}),
        };
        sales.push(committedSale);
        cart=[];
        try{if(saleDialog?.open)saleDialog.close()}catch{}
      }catch(e){console.warn('Historial local',e)}

      // La RPC ya confirmó el cobro en Supabase. Guardar y avisar a las
      // pantallas AHORA: no esperar a que termine de consultar el inventario.
      // Esta parte es solo una actualización de vistas y de la copia local.
      try{
        if(typeof save==='function')save();
        else if(typeof renderSales==='function')renderSales();
      }catch(err){console.warn('Actualizar ticket local tras cobro',err)}
      // La venta ya fue confirmada por Supabase: abrir el comprobante real.
      // El evento por sí solo no basta si algún flujo antiguo del POS no instaló
      // su listener; por eso comprobamos que el modal se haya abierto y llamamos
      // directamente al módulo de comprobantes como respaldo.
      if(committedSale){
        window.__vareliaLastReceipt=committedSale;
        try{window.dispatchEvent(new CustomEvent('varelia:checkout-confirmed',{detail:{sale:committedSale}}))}
        catch(err){console.warn('No se pudo avisar al comprobante',err)}
        try{
          const receiptPanel=document.getElementById('vreceiptOverlay');
          const emergencyPanel=document.getElementById('vareliaEmergencyReceipt');
          const isReceiptOpen=()=>!!document.getElementById('vreceiptOverlay')?.classList.contains('show')||!!document.getElementById('vareliaEmergencyReceipt');
          if(!isReceiptOpen() && typeof window.VareliaReceipt?.show==='function'){
            window.VareliaReceipt.show(committedSale);
          }
          if(!isReceiptOpen() && !receiptPanel && !emergencyPanel){
            console.warn('El módulo de comprobantes no está listo; se conserva la venta confirmada para reintentar');
          }
        }catch(err){console.warn('No se pudo abrir directamente el comprobante',err)}
      }
      try{
        window.dispatchEvent(new CustomEvent('varelia:sale-recorded',{
          detail:{saleId:String(data?.sale_id||''),source:'cloud-confirmed',sale:committedSale}
        }));
      }catch(err){console.warn('Notificación de venta confirmada',err)}
      toast(fiado?'Fiado registrado en la nube a nombre de '+client+'.':'Venta registrada. Actualizando historial y reportes.','ok');
      // La sincronización de stock posterior NO debe bloquear ni deshacer
      // una venta que Supabase ya confirmó, ni retrasar sus reportes.
      try{await refreshCloud()}catch(err){console.warn('Inventario pendiente tras venta confirmada',err)}
      try{await refreshPublicStock()}catch(err){console.warn('Stock público pendiente',err)}
      try{window.vareliaSound?.('sale')}catch{}
    }catch(e){
      console.error(e);
      toast(e?.message||'No se pudo registrar la venta.','warn');
      await refreshCloud().catch(()=>{});
    }finally{
      saleBusy=false;
      if(legacy){legacy.disabled=false;if(legacyLabel)legacy.textContent=legacyLabel;}
      if(pos){pos.disabled=false;pos.textContent=posLabel||'💳 Cobrar venta';}
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
        // Confirmar la fila en la nube y reconstruir la lista visible desde Supabase.
        // Si una lectura de sincronización anterior llega tarde, volver a incluir
        // la categoría recién confirmada para que no desaparezca de la pantalla.
        try{await refreshCloud()}catch(refreshErr){console.warn('Categoría guardada; actualización de lista pendiente:',refreshErr)}
        if(!categories.some(c=>String(c).trim().toLowerCase()===name.toLowerCase()))categories.push(name);
        window.categories=categories;
        try{localStorage.setItem(K.categories,JSON.stringify(categories))}catch{}
        if(typeof renderCategories==='function')renderCategories();
        if(typeof fillCats==='function')fillCats();
        if(typeof renderProducts==='function')renderProducts();
        input.value='';
        toast('Categoría guardada y lista actualizada.','ok');
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

  function stockVersion(rows){
    return (rows||[]).map(p=>[String(p.id||''),String(p.stock??''),String(p.updated_at||'')].join(':')).sort().join('|');
  }

  // Respaldo liviano cuando Android suspende o pierde el canal Realtime.
  // Solo consulta ID, stock y fecha de modificación: NO escribe inventario.
  async function pollStockChanges(){
    if(stockPollBusy||saleBusy||!sb||!businessId||
       document.visibilityState==='hidden'||navigator.onLine===false)return;
    stockPollBusy=true;
    const requestedBusiness=businessId;
    try{
      const result=await withTimeout(
        sb.from('varelia_products').select('id,stock,updated_at').eq('business_id',requestedBusiness),
        10000,'Verificación de stock compartido');
      if(result.error)throw result.error;
      if(requestedBusiness!==businessId)return;
      const remote=stockVersion(result.data||[]);
      if(stockSnapshot!==null&&remote!==stockSnapshot)scheduleRefresh();
    }catch(err){console.warn('Respaldo de stock en tiempo real',err)}
    finally{stockPollBusy=false}
  }
  function startStockPoll(){
    if(stockPollTimer)clearInterval(stockPollTimer);
    stockPollTimer=setInterval(pollStockChanges,12000);
  }

  function subscribe(){
    try{
      if(channel)sb.removeChannel(channel);
      channel=sb.channel('varelia-stock-'+businessId)
        .on('postgres_changes',{event:'*',schema:'public',table:'varelia_products',filter:'business_id=eq.'+businessId},scheduleRefresh)
        .subscribe(status=>{
          if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED')
            console.warn('Stock realtime:',status,'; respaldo automático activo');
        });
      startStockPoll();
    }catch(e){
      console.warn('Realtime stock; usando verificación automática',e);
      startStockPoll();
    }
  }

  async function init(){
    if(initBusy){initAgain=true;return}
    initBusy=true;
    try{
      if(!await waitClient())throw new Error('Supabase todavía no está listo. Se reintentará la conexión.');
      // Siempre volver a leer el perfil: businessId/rol pueden haber cambiado al entrar con otra cuenta.
      // No salir silenciosamente: un cliente o perfil ausente debe activar el reintento automático.
      const activeProfile=await loadProfile();
      // Nunca dejar el estado visual eternamente en "Conectando".
      // Si no hay sesión, indicar la causa y esperar al evento real de autenticación.
      if(!activeProfile){
        if(typeof window.vareliaSetCloudStatus==='function')window.vareliaSetCloudStatus('☁️ Sin sesión activa · comprobando de nuevo automáticamente',true);
        // En WebView la sesión puede restaurarse después del primer getSession().
        // No cancelar el reintento aquí: esperar solo a onAuthStateChange deja la app
        // bloqueada si el evento inicial ya ocurrió antes de registrar el listener.
        clearTimeout(retryTimer);
        retryTimer=setTimeout(()=>{
          if(navigator.onLine!==false)init().catch(err=>console.error('Reintento de restauración de sesión',err));
        },retryDelay);
        retryDelay=Math.min(retryDelay*2,20000);
        return;
      }
      if(!businessId)throw new Error('La cuenta no tiene un negocio vinculado. Abre Ajustes y vuelve a iniciar sesión.');
      if(channel){try{await sb.removeChannel(channel)}catch{} channel=null;}
      // La sincronización no debe quedar bloqueada por un respaldo inicial fallido.
      // Primero intentamos traer la cuenta desde la nube; si falla, reintentamos.
      try{ await withTimeout(seedIfNeeded(),15000,'El respaldo inicial del inventario'); }catch(seedErr){ console.warn('Respaldo inicial omitido o agotó el tiempo:',seedErr); }
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
      try{if(typeof window.vareliaSetCloudStatus==='function')window.vareliaSetCloudStatus('☁️ Error de sincronización: '+msg.slice(0,110),true)}catch{}
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
    const cloudLoaded=await refreshCloud();
    if(!cloudLoaded)throw new Error('No se recibió confirmación del inventario de Supabase.');
    try{await withTimeout(refreshPublicStock(),8000,'La actualización del stock público')}catch(e){console.warn('Stock público pendiente',e)}
    subscribe();
    window.dispatchEvent(new CustomEvent('varelia:forced-sync-complete',{detail:{businessId:String(businessId)}}));
    return {businessId:String(businessId),products:localProducts().length,categories:localCategories().length};
  };

  // Reiniciar la sincronización cada vez que cambia la cuenta activa.
  // Antes se ejecutaba una sola vez y, al cambiar de administrador, la vista podía seguir apuntando al negocio anterior.
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(()=>init().catch(e=>console.error('Varelia cambio de cuenta',e)),80));
  // La sesión del WebView puede restaurarse después del primer intento de conexión.
  // Volver a iniciar al recibir autenticación, sin borrar datos locales.
  const authWait=setInterval(()=>{
    const client=window.vareliaSupabase;
    if(!client)return;
    clearInterval(authWait);
    client.auth.onAuthStateChange((event,session)=>{
      if(session?.user&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')){
        setTimeout(()=>init().catch(console.error),150);
      }
    });
  },100);
  // Public bridge used by pricing/options modules after the normal product save.
  window.vareliaSyncProduct=syncProduct;
  setTimeout(init,350);
})();