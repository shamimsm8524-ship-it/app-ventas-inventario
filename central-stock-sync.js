(()=>{
  if(window.__vareliaCentralStockSync)return;
  window.__vareliaCentralStockSync=true;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const withTimeout=(promise,ms,label)=>Promise.race([Promise.resolve(promise),new Promise((_,reject)=>setTimeout(()=>reject(new Error(label+' no respondió en '+Math.round(ms/1000)+' segundos. Se reintentará automáticamente.')),ms))]);
  const toast=(m,t='ok')=>window.vareliaToast?window.vareliaToast(m,t):console.log(m);
  let sb=null,profile=null,businessId='',role='',channel=null,refreshTimer=null,saleBusy=false,initBusy=false,initAgain=false,retryTimer=null,retryDelay=1000;
  let stockSnapshot=null,stockPollTimer=null,stockPollBusy=false;
  const categoryIds=new Map();

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
    const {data:stored,error:sessionError}=await withTimeout(sb.auth.getSession(),10000,'La lectura de sesión');
    if(sessionError)throw sessionError;
    let user=stored?.session?.user||null;
    // The shared reader and SDK own renewal. A still-valid token must not wait
    // for a second forced refresh here; database requests validate it on the server.
    if(!user)return null;
    const cached=window.vareliaCurrentUserProfile;
    if(cached?.id===user.id&&cached.business_id){
      profile=cached;businessId=String(cached.business_id);role=String(cached.role||'');return profile;
    }
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

  async function ensureCategory(name,profileReady=false){
    name=String(name||'').trim();
    if(!name)return null;
    // Refrescar siempre la cuenta activa antes de escribir. Evita guardar la categoría
    // con un business_id viejo si la sesión/cuenta cambió recientemente.
    if(!profileReady)await loadProfile();
    if(!businessId)throw new Error('La cuenta no tiene negocio activo.');
    if(!isOwner())throw new Error('Solo el administrador puede crear categorías.');
    const cacheKey=businessId+':'+name;
    if(categoryIds.has(cacheKey))return categoryIds.get(cacheKey);
    let {data,error}=await sb.from('varelia_categories').select('id,name').eq('business_id',businessId).eq('name',name).maybeSingle();
    if(error)throw error;
    if(data?.id){categoryIds.set(cacheKey,data.id);return data.id;}
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
    categoryIds.set(cacheKey,verify.data.id);
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
      purchaseCost:rawCommercial.purchaseCost,
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
      price:Math.max(0,Number(x?.price)||0),buyCost:x?.buyCost!=null&&x.buyCost!==''&&Number.isFinite(Number(x.buyCost))&&Number(x.buyCost)>=0?Number(x.buyCost):null,
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
      units_per_box:String(p.unit||'').trim().toLowerCase()==='caja'?Math.max(1,Math.floor(Number(p.unitsPerBox)||1)):null,
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
    if(!isOwner())return false;
    const requestedBusiness=businessId;
    const ps=localProducts().filter(p=>!p._cloudId);
    if(!ps.length)return false;

    const categoryNames=[...new Set([...localCategories(),...ps.map(p=>p.category)].map(x=>String(x||'').trim()).filter(Boolean))];
    const categoryMap=new Map();
    for(const name of categoryNames){
      if(requestedBusiness!==businessId)return false;
      const id=await ensureCategory(name,true);
      if(id)categoryMap.set(name,id);
    }

    for(const p of ps){
      if(requestedBusiness!==businessId)return false;
      if(p._cloudId)continue;
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

  async function readCloud(){
    if(!sb)throw new Error('Supabase no está disponible.');
    if(!businessId)throw new Error('La cuenta no tiene negocio activo.');
    const requestedBusiness=businessId;
    const controller=new AbortController();
    const deadline=setTimeout(()=>controller.abort(),8000);
    let catsRes,prodRes;
    try{[catsRes,prodRes]=await withTimeout(Promise.all([
      sb.from('varelia_categories').select('id,name').eq('business_id',businessId).order('name').abortSignal(controller.signal),
      sb.from('varelia_products').select('id,legacy_id,category_id,barcode,name,description,specifications,variants,characteristics,variant_combinations,buy_price,sell_price,stock,unit,units_per_box,reorder_level,image_data,medicine,laboratory,medicine_presentation,batch,expiry_date,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,medicine_stock_boxes,sale_presentations,advanced_pricing,updated_at').eq('business_id',businessId).order('created_at').abortSignal(controller.signal)
    ]),9000,'La lectura del inventario en la nube')}finally{clearTimeout(deadline)}
    if(requestedBusiness!==businessId)return false;
    if(catsRes.error)throw catsRes.error;
    if(prodRes.error)throw prodRes.error;
    const rows=prodRes.data||[];
    stockSnapshot=stockVersion(rows);
    // Las categorías deben sincronizarse aunque el negocio todavía no tenga productos.
    const catRows=catsRes.data||[];
    for(const key of categoryIds.keys())if(key.startsWith(businessId+':'))categoryIds.delete(key);
    for(const row of catRows)categoryIds.set(businessId+':'+String(row.name||'').trim(),row.id);
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
      const effectiveRemoteStock=remoteStock;
      const key=String(p.id||'');
      const pending=lastProductStockWrite.get(key);
      const stock=(pending&&Date.now()-pending.at<5000)?pending.stock:effectiveRemoteStock;
      const rawCommercial=p.advanced_pricing&&typeof p.advanced_pricing==='object'?p.advanced_pricing:{};
      const commercial={version:2,purchaseCost:rawCommercial.purchaseCost,wholesaleEnabled:!!rawCommercial.wholesaleEnabled,wholesaleMinQty:Math.max(2,Math.floor(Number(rawCommercial.wholesaleMinQty)||12)),wholesalePrice:Math.max(0,Number(rawCommercial.wholesalePrice)||0),promoEnabled:!!rawCommercial.promoEnabled,promoType:['percent','fixed'].includes(String(rawCommercial.promoType))?String(rawCommercial.promoType):'percent',promoValue:Math.max(0,Number(rawCommercial.promoValue)||0),promoStart:String(rawCommercial.promoStart||''),promoEnd:String(rawCommercial.promoEnd||''),promoName:String(rawCommercial.promoName||'Promoción').trim()||'Promoción'};
      const presentations=Array.isArray(p.sale_presentations)?p.sale_presentations:[];
      return {
      id:String(p.legacy_id||p.id),
      _cloudId:String(p.id),
      _cloudUpdatedAt:p.updated_at,
      barcode:String(p.barcode||''),
      name:String(p.name||'Producto'),
      category:catMap.get(String(p.category_id||''))||'',
      buyPrice:Number(p.buy_price)||0,
      sellPrice:Number(p.sell_price)||0,
      stock:stock,
      unit:String(p.unit||'Unidad'),
      unitsPerBox:Number(p.units_per_box)||0,
      reorderLevel:Number(p.reorder_level)||0,
      description:String(p.description||''),
      specifications:stripAdvancedPricing(String(p.specifications||'')),
      advancedPricing:null,
      commercialPricing:commercial,
      salePresentations:presentations.map((x,i)=>({id:String(x?.id||('presentacion_'+(i+1))),name:String(x?.name||''),units:Math.max(0,Math.floor(Number(x?.units)||0)),price:Math.max(0,Number(x?.price)||0),buyCost:x?.buyCost!=null&&x.buyCost!==''&&Number.isFinite(Number(x.buyCost))&&Number(x.buyCost)>=0?Number(x.buyCost):null,active:x?.active!==false})).filter(x=>x.name&&x.units>0&&x.price>0),
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

    const pending=localProducts().filter(p=>!p._cloudId&&!mapped.some(row=>String(row.id)===String(p.id)));
    products=[...mapped,...pending];
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

  let cloudReadInFlight=null;
  let syncLifecycleBound=false;
  let bridgeTimer=null;
  function refreshCloud(){
    if(cloudReadInFlight?.businessId===businessId)return cloudReadInFlight.promise;
    const request={businessId,promise:null};
    request.promise=readCloud().finally(()=>{if(cloudReadInFlight===request)cloudReadInFlight=null});
    cloudReadInFlight=request;return request.promise;
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
    if(!p)throw new Error('Selecciona un producto.');
    if(!sb)await withTimeout(waitClient(),8000,'La conexión');
    if(!businessId||!profile)await withTimeout(loadProfile(),10000,'La cuenta');
    if(!isOwner())throw new Error('Solo el propietario puede guardar productos.');
    const key=String(p.id||'');
    if(productSyncLocks.has(key))return productSyncLocks.get(key);
    suppressRefreshUntil=Date.now()+2500;
    const controller=new AbortController();
    const deadline=setTimeout(()=>controller.abort(),20000);
    const task=withTimeout((async()=>{
      const categoryId=await withTimeout(ensureCategory(p.category,true),10000,'La categoría');
      if(controller.signal.aborted)throw new Error('La conexión tardó demasiado. Puedes reintentar Guardar.');
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
      // A known row version lets UPDATE itself check concurrency: no pre-read is needed.
      const existingBefore=p._cloudId&&p._cloudUpdatedAt
        ?{data:{id:p._cloudId,updated_at:p._cloudUpdatedAt},error:null}
        :await sb.from('varelia_products').select('id,stock,updated_at').eq('business_id',businessId).eq('legacy_id',legacy).maybeSingle().abortSignal(controller.signal);
      if(existingBefore.error)throw existingBefore.error;
      const existedBefore=!!existingBefore.data?.id;
      if(existedBefore&&p._cloudUpdatedAt&&p._cloudUpdatedAt!==existingBefore.data.updated_at){
        throw new Error('El producto cambió en otro dispositivo. Actualiza el inventario antes de guardar para conservar las ventas recientes.');
      }
      // Presentaciones comerciales y precio mayorista tienen su propio módulo de guardado.
      // En productos normales ya existentes, la sincronización general NO debe escribir
      // estos dos campos porque un objeto local todavía no hidratado puede venir vacío
      // y borrar Six Pack/Docena/Mayorista que sí están correctamente guardados en nube.
      // Si el producto se convierte en medicamento, sí permitimos limpiarlos porque
      // los medicamentos usan su modelo Caja / Blíster / Pastilla.
      if(existedBefore&&!p.medicine&&!p.__commercialEdited){
        delete payload.sale_presentations;
        delete payload.advanced_pricing;
      }
      // Upsert atómico por negocio + id local: evita dos INSERT simultáneos
      // cuando el formulario y las características se guardan en el mismo instante.
      let up;
      if(existedBefore){
        up=await sb.from('varelia_products').update(payload)
          .eq('business_id',businessId).eq('id',existingBefore.data.id)
          .eq('updated_at',existingBefore.data.updated_at).select('id,legacy_id,business_id,name,stock,sell_price,buy_price,updated_at').maybeSingle().abortSignal(controller.signal);
        if(!up.error&&!up.data?.id)throw new Error('El inventario cambió durante el guardado. Actualiza antes de reintentar.');
      }else{
        up=await sb.from('varelia_products').insert(payload).select('id,legacy_id,business_id,name,stock,sell_price,buy_price,updated_at').single().abortSignal(controller.signal);
      }
      if(up.error)throw up.error;
      if(!up.data?.id)throw new Error('La base de datos no devolvió el producto guardado.');
      // Verificación real: no mostramos "guardado" hasta comprobar que el registro
      // existe en la cuenta/negocio correcto después del INSERT/UPSERT.
      const verify=up;
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
      // Another sale may commit after our update. The current cloud stock wins;
      // never overwrite it with a second absolute stock update during verification.
      if(!existedBefore&&verifiedStock>0){
        const mv=await sb.from('varelia_inventory_movements').insert({business_id:businessId,product_id:verify.data.id,product_name:verify.data.name,type:'add',qty:Number(verify.data.stock),stock_before:0,stock_after:Number(verify.data.stock),source:'producto_nuevo'}).abortSignal(controller.signal);
        if(mv.error)throw mv.error;
      }
      p._cloudId=verify.data.id;
      p._cloudUpdatedAt=verify.data.updated_at;
      p.stock=verifiedStock;
      lastProductStockWrite.set(String(verify.data.id),{stock:verifiedStock,at:Date.now()});
      suppressRefreshUntil=Date.now()+5000;
      // The product is confirmed. Public catalog work must never hold the form open.
      void withTimeout(refreshPublicStock(),8000,'El catálogo público').catch(e=>console.warn('Catálogo pendiente',e));
      window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'));
    })(),21000,'El guardado del producto').finally(()=>{clearTimeout(deadline);controller.abort();productSyncLocks.delete(key)});
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

  function newRequestId(){
    const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
    const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
    return hex.slice(0,8)+'-'+hex.slice(8,12)+'-'+hex.slice(12,16)+'-'+hex.slice(16,20)+'-'+hex.slice(20);
  }

  function validQuantity(value){
    const qty=Number(value);
    if(!Number.isFinite(qty)||qty<=0)throw new Error('La cantidad debe ser un número mayor que cero.');
    return qty;
  }

  async function centralCheckout(){
    if(saleBusy)return false;
    if(!sb)await waitClient();
    if(!sb)throw new Error('Supabase todavía no está disponible.');
    if(!businessId)await loadProfile();
    if(!businessId)throw new Error('La cuenta no tiene un negocio activo.');
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
          variant_values:(Array.isArray(item.selectedCharacteristics)?item.selectedCharacteristics:[]).map(x=>String(x.value)),
          qty:validQuantity(item.qty),
          unit_price:Math.max(0,Number(item.price)||0),
          ...(unit?{sale_unit:unit}:{}),
          ...(presentationId?{presentation_id:presentationId}:{}),
          ...(pricingMode?{pricing_mode:pricingMode}:{})
        });
      }

      // Reuse the same request after a lost response, including across app restarts.
      const requestKey='varelia_checkout_pending_v1:'+String(profile?.id||businessId);
      const fingerprint=JSON.stringify({payload,method:pay.method||'Efectivo',customer:fiado?client:''});
      let pending=null;
      try{pending=JSON.parse(localStorage.getItem(requestKey)||'null')}catch{}
      if(pending?.fingerprint!==fingerprint||!pending?.id){
        pending={id:newRequestId(),fingerprint};
        localStorage.setItem(requestKey,JSON.stringify(pending));
      }
      payload[0].request_id=pending.id;
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
          throw new Error('El cobro tardó demasiado y se detuvo para que Varelia no quede congelada. Puedes reintentar el mismo carrito: se comprobará el cobro anterior para evitar duplicarlo.');
        }
        throw commitError;
      }finally{
        if(commitTimer)clearTimeout(commitTimer);
      }
      if(error)throw error;
      localStorage.removeItem(requestKey);

      const remoteItems=Array.isArray(data?.items)?data.items:[];
      const soldItems=current.map((item,i)=>{
        const p=localProducts().find(x=>String(x.id)===String(item.id));
        const remote=remoteItems[i]||{};
        return {
          ...item,
          price:Number(remote.unit_price??item.price)||0,
          buyPriceAtSale:(remote.buy_price_at_sale!=null&&remote.buy_price_at_sale!==''&&Number.isFinite(Number(remote.buy_price_at_sale)))
            ?Number(remote.buy_price_at_sale)
            :(item.buyPriceAtSale??item.buy_price_at_sale??item.costAtSale),
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
        if(!sales.some(s=>String(s.cloudSaleId||'')===committedSale.cloudSaleId))sales.push(committedSale);
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
      return true;
    }catch(e){
      console.error(e);
      toast(e?.message||'No se pudo registrar la venta.','warn');
      await refreshCloud().catch(()=>{});
      return false;
    }finally{
      saleBusy=false;
      if(legacy){legacy.disabled=false;if(legacyLabel)legacy.textContent=legacyLabel;}
      if(pos){pos.disabled=false;pos.textContent=posLabel||'💳 Cobrar venta';}
    }
  }

  // API directa para el POS visible: evita que una venta pase por el flujo local
  // mientras el puente del botón oculto todavía está terminando de instalarse.
  window.vareliaCentralCheckout=centralCheckout;

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

  window.vareliaCentralCloseCash=async function(total){
    if(!sb)await waitClient();if(!businessId)await loadProfile();
    const key='varelia_cash_close_pending_v1:'+String(profile?.id||businessId);
    let id=localStorage.getItem(key);if(!id){id=newRequestId();localStorage.setItem(key,id)}
    const {data,error}=await sb.rpc('varelia_record_cash_closure',{p_id:id,p_total:total});
    if(error)throw error;
    if(!data?.id)throw new Error('El cierre no quedó confirmado.');
    localStorage.removeItem(key);return data;
  };
  let cashRefreshBusy=false;
  async function refreshCashClosures(){
    if(cashRefreshBusy||!sb||!businessId)return;
    cashRefreshBusy=true;const requestedBusiness=businessId;
    try{
      const {data,error}=await sb.from('varelia_cash_closures').select('*').eq('business_id',businessId).order('closed_at',{ascending:false});
      if(error)throw error;if(requestedBusiness!==businessId)return;
      for(const row of data||[]){
        const value={id:row.id,cloudClosureId:row.id,closedAt:row.closed_at,total:Number(row.total),closureTotal:Number(row.total),dayKey:row.day_key,sellerId:row.created_by,sellerName:row.created_by===profile?.id?(window.vareliaCurrentUserProfile?.full_name||'Mi caja'):'Vendedor'};
        const old=closures.find(c=>String(c.cloudClosureId||c.id)===String(row.id));if(old)Object.assign(old,value);else closures.push(value);

      }
      const ownClosures=closures.filter(c=>!c.sellerId||String(c.sellerId)===String(profile?.id));
      const times=ownClosures.map(c=>new Date(c.closedAt).getTime()).filter(Number.isFinite);
      cashStart=times.length?new Date(Math.max(...times)).toISOString():'1970-01-01T00:00:00.000Z';
      if(typeof save==='function')save();
    }catch(e){console.warn('No se pudieron actualizar los cierres de caja',e)}finally{cashRefreshBusy=false}
  }
  window.addEventListener('varelia:central-stock-updated',refreshCashClosures);

  window.vareliaCentralDeleteSupplier=async function(supplier){
    if(!sb)await waitClient();if(!businessId)await loadProfile();
    let query=sb.from('varelia_suppliers').delete().eq('business_id',businessId);
    query=supplier._cloudId?query.eq('id',supplier._cloudId):query.eq('legacy_id',String(supplier.id));
    const {error}=await query;if(error)throw error;
  };
  window.vareliaCentralSaveSupplier=async function(supplier){
    if(!sb)await waitClient();
    const {data,error}=await sb.rpc('varelia_save_supplier',{p_supplier:supplier});
    if(error)throw error;
    if(!data?.id)throw new Error('El proveedor no quedó confirmado.');
    return data;
  };
  window.vareliaCentralPurchase=async function({supplier,items,documentNumber}){
    const remoteSupplier=await window.vareliaCentralSaveSupplier(supplier);
    const payload=[];
    for(const item of items){
      const product=localProducts().find(p=>String(p.id)===String(item.id));
      if(!product)throw new Error('Producto no encontrado.');
      const id=await ensureCloudProductId(product);
      if(!id)throw new Error('El producto todavía no está sincronizado.');
      payload.push({product_id:id,qty:validQuantity(item.qty),cost:Number(item.cost)});
    }
    const key='varelia_purchase_pending_v1:'+String(profile?.id||businessId);
    const fingerprint=JSON.stringify({supplier:remoteSupplier.id,payload,documentNumber});
    let pending;try{pending=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(pending?.fingerprint!==fingerprint){
      pending={fingerprint,id:newRequestId()};localStorage.setItem(key,JSON.stringify(pending));
    }
    const {data,error}=await sb.rpc('varelia_commit_purchase',{p_request_id:pending.id,p_supplier_id:remoteSupplier.id,p_items:payload,p_document:documentNumber});
    if(error)throw error;
    if(!data?.purchase_id)throw new Error('La compra no quedó confirmada.');
    localStorage.removeItem(key);
    try{await refreshCloud()}catch(e){console.warn('Compra confirmada; actualización visual pendiente',e)}
    return data;
  };
  let auxiliaryBusy=false;
  async function refreshAuxiliaryRecords(){
    if(auxiliaryBusy||!sb||!businessId||role!=='owner')return;
    auxiliaryBusy=true;
    const requestedBusiness=businessId;
    try{
      const [s,p]=await Promise.all([
        sb.from('varelia_suppliers').select('*').eq('business_id',requestedBusiness),
        sb.from('varelia_purchases').select('*,varelia_purchase_items(*)').eq('business_id',requestedBusiness).order('created_at',{ascending:false})
      ]);
      if(requestedBusiness!==businessId)return;
      if(s.error||p.error)throw s.error||p.error;
      const remoteIds=new Set((s.data||[]).map(x=>String(x.id)));
      suppliers=suppliers.filter(x=>!x._cloudId||remoteIds.has(String(x._cloudId)));
      for(const row of s.data||[]){
        const id=String(row.legacy_id||row.id);
        const value={...row,id,_cloudId:row.id};
        const old=suppliers.find(x=>String(x.id)===id);if(old)Object.assign(old,value);else suppliers.push(value);
      }
      for(const row of p.data||[]){
        const value={id:row.id,cloudPurchaseId:row.id,date:row.created_at,supplierName:row.supplier_name,total:Number(row.total),items:(row.varelia_purchase_items||[]).map(i=>({id:localProducts().find(x=>String(x._cloudId)===String(i.product_id))?.id||i.product_id,name:i.product_name,qty:Number(i.qty),cost:Number(i.unit_cost),unit:i.unit}))};
        const old=purchases.find(x=>String(x.cloudPurchaseId||x.id)===String(row.id));if(old)Object.assign(old,value);else purchases.push(value);
      }
      if(typeof save==='function')save();
    }catch(e){console.warn('No se pudieron actualizar proveedores/compras',e)}
    finally{auxiliaryBusy=false}
  }
  window.addEventListener('varelia:central-stock-updated',refreshAuxiliaryRecords);

  window.vareliaCentralAdjustStock=async function({product,qty,event}){
    if(!sb)await waitClient();
    if(!businessId)await loadProfile();
    const cloudId=await ensureCloudProductId(product);
    if(!cloudId)throw new Error('El producto todavía no está sincronizado.');
    const {data,error}=await sb.rpc('varelia_adjust_stock',{p_product_id:cloudId,p_qty:validQuantity(qty),p_event:event});
    if(error)throw error;
    await refreshCloud();
    try{await refreshPublicStock()}catch(e){console.warn('Stock público pendiente',e)}
    return data;
  };

  window.vareliaCentralStockIn=async function({product,event='restock',qty}){
    if(!product)throw new Error('Selecciona un producto.');
    const cloudId=await ensureCloudProductId(product);
    if(!cloudId)throw new Error('El producto todavía no está sincronizado.');
    const {data,error}=await sb.rpc('varelia_staff_stock_in',{
      p_product_id:cloudId,
      p_qty:validQuantity(qty),
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
      p_qty:validQuantity(qty)
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
        retryDelay=Math.min(retryDelay*2,10000);
        return;
      }
      if(!businessId)throw new Error('La cuenta no tiene un negocio vinculado. Abre Ajustes y vuelve a iniciar sesión.');
      if(channel){try{Promise.resolve(sb.removeChannel(channel)).catch(console.warn)}catch{}channel=null;}
      window.vareliaSetCloudStatus?.('☁️ Sincronizando…');
      const cloudOk=await refreshCloud();
      if(!cloudOk)throw new Error('No se pudo confirmar el inventario de esta cuenta.');
      installProductBridge();
      installCategoryBridge();
      installCategoryDeleteBridge();
      installCheckoutBridge();
      subscribe();
      clearTimeout(retryTimer);retryTimer=null;retryDelay=1000;
      window.dispatchEvent(new CustomEvent('varelia:sync-connected',{detail:{businessId:String(businessId),products:localProducts().length}}));
      // A local-only backup must never delay the first confirmed cloud read.
      if(localProducts().some(p=>!p._cloudId))void withTimeout(seedIfNeeded(),15000,'El respaldo inicial').then(()=>refreshCloud()).catch(e=>console.warn('Respaldo pendiente',e));

      let tries=0;
      if(bridgeTimer)clearInterval(bridgeTimer);
      bridgeTimer=setInterval(()=>{
        tries++;
        installProductBridge();
        installCategoryBridge();
        installCategoryDeleteBridge();
        installCheckoutBridge();
        if(tries>60){clearInterval(bridgeTimer);bridgeTimer=null}
      },500);

      if(!syncLifecycleBound){
        syncLifecycleBound=true;
        addEventListener('focus',scheduleRefresh);
        addEventListener('pageshow',scheduleRefresh);
        document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')scheduleRefresh()});
      }
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
      retryDelay=Math.min(retryDelay*2,10000);
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
    if(channel){try{Promise.resolve(sb.removeChannel(channel)).catch(console.warn)}catch{}channel=null;}
    const cloudLoaded=await refreshCloud();
    if(!cloudLoaded)throw new Error('No se recibió confirmación del inventario de Supabase.');
    void withTimeout(refreshPublicStock(),8000,'La actualización del stock público').catch(e=>console.warn('Stock público pendiente',e));
    installProductBridge();installCategoryBridge();installCategoryDeleteBridge();installCheckoutBridge();
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
      if(event==='SIGNED_OUT'){
        businessId='';profile=null;role='';stockSnapshot=null;
        clearTimeout(retryTimer);clearInterval(stockPollTimer);clearInterval(bridgeTimer);
        if(channel){try{sb.removeChannel(channel)}catch{}channel=null;}
        return;
      }
      if(session?.user&&(event==='SIGNED_IN'||event==='INITIAL_SESSION'||event==='TOKEN_REFRESHED')){
        setTimeout(()=>init().catch(console.error),150);
      }
    });
  },100);
  // Public bridge used by pricing/options modules after the normal product save.
  window.vareliaSyncProduct=syncProduct;
  setTimeout(init,350);
})();
