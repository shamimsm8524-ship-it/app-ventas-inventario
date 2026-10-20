(()=>{
  if(window.__vareliaAmpicilinaRecoveryV4)return;
  window.__vareliaAmpicilinaRecoveryV4=true;

  const DONE='varelia_ampicilina_recovered_v2';
  const CLOUD_ID='84cde96f-4492-4115-8bc5-3cfa22ecb336';
  const LEGACY_ID='mureef4xsz29g';
  const BARCODE='2071674969557';
  const NAME='Ampicilina';
  const CATEGORY='Medicinas';
  let busy=false,remoteVerified=false;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const list=()=>{
    try{if(Array.isArray(window.products))return window.products}catch{}
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return [];
  };
  const same=p=>String(p?._cloudId||'')===CLOUD_ID||String(p?.barcode||'').trim()===BARCODE||String(p?.name||'').trim().toLowerCase()===NAME.toLowerCase();
  const exists=()=>list().some(same);
  const mark=()=>{try{localStorage.setItem(DONE,'1')}catch{}};
  const marked=()=>{try{return localStorage.getItem(DONE)==='1'}catch{return false}};

  const fallback=()=>({
    id:LEGACY_ID,_cloudId:'',barcode:BARCODE,name:NAME,category:CATEGORY,
    buyPrice:0,sellPrice:3,stock:0,unit:'Unidad',reorderLevel:0,
    description:'',specifications:'',variants:'',characteristics:[],variantCombinations:[],image:'',
    medicine:true,laboratory:'',medicinePresentation:'',batch:'',expiryDate:'',
    blistersPerBox:1,unitsPerBlister:10,boxPrice:0,blisterPrice:6,unitMedicinePrice:0,medicineStockBoxes:0,
    __ampicilinaRecovery:true
  });

  async function waitSupabase(){for(let i=0;i<100&&!window.vareliaSupabase;i++)await sleep(100);return window.vareliaSupabase||null}

  async function categoryName(sb,id){
    if(!id)return CATEGORY;
    try{const {data}=await sb.from('varelia_categories').select('name').eq('id',id).maybeSingle();return String(data?.name||CATEGORY)}catch{return CATEGORY}
  }

  function mapRow(row,cat){
    return {
      id:String(row.legacy_id||row.id||LEGACY_ID),_cloudId:String(row.id||''),barcode:String(row.barcode||BARCODE),name:String(row.name||NAME),category:String(cat||CATEGORY),
      buyPrice:Number(row.buy_price)||0,sellPrice:Number(row.sell_price)||0,stock:Number(row.stock)||0,unit:String(row.unit||'Unidad'),reorderLevel:Number(row.reorder_level)||0,
      description:String(row.description||''),specifications:String(row.specifications||''),variants:String(row.variants||''),
      characteristics:Array.isArray(row.characteristics)?row.characteristics:[],variantCombinations:Array.isArray(row.variant_combinations)?row.variant_combinations:[],image:String(row.image_data||''),
      medicine:row.medicine!==false,laboratory:String(row.laboratory||''),medicinePresentation:String(row.medicine_presentation||''),batch:String(row.batch||''),expiryDate:String(row.expiry_date||''),
      blistersPerBox:Number(row.blisters_per_box)||1,unitsPerBlister:Number(row.units_per_blister)||10,boxPrice:Number(row.box_price)||0,blisterPrice:Number(row.blister_price)||6,
      unitMedicinePrice:Number(row.unit_medicine_price)||0,medicineStockBoxes:Number(row.medicine_stock_boxes)||0
    };
  }

  function injectLocal(p){
    const arr=list();
    const found=arr.findIndex(same);
    if(found>=0){
      if(p._cloudId)arr[found]={...arr[found],...p};
    }else arr.push(p);
    try{
      if(Array.isArray(window.categories)&&!window.categories.includes(CATEGORY))window.categories.push(CATEGORY);
      if(typeof categories!=='undefined'&&Array.isArray(categories)&&!categories.includes(CATEGORY))categories.push(CATEGORY);
    }catch{}
    try{
      if(typeof K!=='undefined'){
        if(K.products)localStorage.setItem(K.products,JSON.stringify(arr));
        const cats=Array.isArray(window.categories)?window.categories:(typeof categories!=='undefined'&&Array.isArray(categories)?categories:[]);
        if(K.categories)localStorage.setItem(K.categories,JSON.stringify(cats));
      }
    }catch{}
    try{if(typeof render==='function')render();else window.render?.()}catch{}
    try{if(typeof renderProducts==='function')renderProducts();else window.renderProducts?.()}catch{}
  }

  async function findRemote(sb,businessId){
    const cols='id,business_id,legacy_id,category_id,barcode,name,description,specifications,variants,characteristics,variant_combinations,buy_price,sell_price,stock,unit,reorder_level,image_data,medicine,laboratory,medicine_presentation,batch,expiry_date,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,medicine_stock_boxes';
    let q=await sb.from('varelia_products').select(cols).eq('business_id',businessId).eq('id',CLOUD_ID).maybeSingle();
    if(q.data)return q.data;
    q=await sb.from('varelia_products').select(cols).eq('business_id',businessId).eq('barcode',BARCODE).limit(1).maybeSingle();
    if(q.data)return q.data;
    q=await sb.from('varelia_products').select(cols).eq('business_id',businessId).ilike('name',NAME).limit(1).maybeSingle();
    return q.data||null;
  }

  async function ensureCategory(sb,businessId,role){
    let q=await sb.from('varelia_categories').select('id,name').eq('business_id',businessId).eq('name',CATEGORY).maybeSingle();
    if(q.data?.id)return q.data.id;
    if(role!=='owner')return null;
    q=await sb.from('varelia_categories').insert({business_id:businessId,name:CATEGORY}).select('id').single();
    if(!q.error&&q.data?.id)return q.data.id;
    const retry=await sb.from('varelia_categories').select('id').eq('business_id',businessId).eq('name',CATEGORY).maybeSingle();
    return retry.data?.id||null;
  }

  async function recreate(sb,businessId,role){
    if(role!=='owner')return null;
    const categoryId=await ensureCategory(sb,businessId,role);if(!categoryId)return null;
    const payload={business_id:businessId,category_id:categoryId,legacy_id:LEGACY_ID,barcode:BARCODE,name:NAME,description:'',specifications:'',variants:'',characteristics:[],variant_combinations:[],buy_price:0,sell_price:3,stock:0,unit:'Unidad',reorder_level:0,image_data:'',medicine:true,laboratory:null,medicine_presentation:null,batch:null,expiry_date:null,blisters_per_box:1,units_per_blister:10,box_price:0,blister_price:6,unit_medicine_price:0,medicine_stock_boxes:0};
    const cols='id,business_id,legacy_id,category_id,barcode,name,description,specifications,variants,characteristics,variant_combinations,buy_price,sell_price,stock,unit,reorder_level,image_data,medicine,laboratory,medicine_presentation,batch,expiry_date,blisters_per_box,units_per_blister,box_price,blister_price,unit_medicine_price,medicine_stock_boxes';
    const ins=await sb.from('varelia_products').insert(payload).select(cols).single();
    if(!ins.error&&ins.data)return ins.data;
    console.warn('Ampicilina: no se pudo recrear en nube',ins.error);
    return await findRemote(sb,businessId);
  }

  async function run(){
    if(busy)return;
    busy=true;
    try{
      if(!exists())injectLocal(fallback());
      if(marked()&&exists()){remoteVerified=true;return}

      const sb=await waitSupabase();if(!sb)return;
      const auth=await sb.auth.getUser();const user=auth.data?.user;if(!user)return;
      const prof=await sb.from('profiles').select('business_id,role').eq('id',user.id).maybeSingle();
      const businessId=String(prof.data?.business_id||''),role=String(prof.data?.role||'');if(!businessId)return;

      let row=await findRemote(sb,businessId),created=false;
      if(!row){row=await recreate(sb,businessId,role);created=!!row}
      if(!row){injectLocal(fallback());return}

      const cat=await categoryName(sb,row.category_id);
      injectLocal(mapRow(row,cat));
      remoteVerified=true;mark();
      window.vareliaToast?.(created?'Ampicilina recuperada. Revisa y registra el stock real.':'Ampicilina recuperada en Medicinas.','ok');
      setTimeout(()=>{try{window.vareliaForceSync?.()}catch{}},700);
    }catch(err){
      console.warn('Recuperación de Ampicilina',err);
      if(!exists())injectLocal(fallback());
    }finally{busy=false}
  }

  const keepVisible=()=>{if(!remoteVerified&&!exists())injectLocal(fallback())};
  const boot=()=>{setTimeout(run,900);setTimeout(run,3000);setTimeout(run,7000)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.addEventListener('varelia:sync-connected',()=>setTimeout(run,250));
  window.addEventListener('varelia:forced-sync-complete',()=>setTimeout(()=>{keepVisible();run()},300));
  window.addEventListener('varelia:central-stock-updated',()=>setTimeout(()=>{keepVisible();if(!remoteVerified)run()},200));
  setInterval(()=>{if(!remoteVerified)keepVisible()},1200);
})();

// Selector de unidad de Ampicilina: no fuerza valores mientras Android muestra el selector nativo.
(()=>{
  if(window.__vareliaAmpicilinaUnitSelectorFixV2)return;
  window.__vareliaAmpicilinaUnitSelectorFixV2=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  const el=id=>document.getElementById(id);
  const text=id=>String(el(id)?.value||'').trim();
  const isAmpForm=()=>text('barcode')===BARCODE||text('productName').toLowerCase()===NAME;

  function productList(){
    try{if(Array.isArray(window.products))return window.products}catch{}
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return [];
  }

  function currentProduct(){
    const id=text('productId');
    return (id&&productList().find(p=>String(p?.id||'')===id))
      ||productList().find(p=>String(p?.barcode||'').trim()===BARCODE)
      ||productList().find(p=>String(p?.name||'').trim().toLowerCase()===NAME)
      ||null;
  }

  function ensureBlisterOption(){
    const unit=el('unit');
    if(!unit||!isAmpForm())return;
    if(!Array.from(unit.options||[]).some(o=>String(o.value||o.textContent).trim()==='Blíster')){
      const option=document.createElement('option');
      option.value='Blíster';
      option.textContent='Blíster';
      const caja=Array.from(unit.options||[]).find(o=>String(o.value||o.textContent).trim()==='Caja');
      if(caja?.nextSibling)unit.insertBefore(option,caja.nextSibling);else unit.appendChild(option);
    }
  }

  function prepareEditor(){
    if(!isAmpForm())return;
    ensureBlisterOption();
  }

  function rememberSelection(e){
    if(e.target?.id!=='unit'||!isAmpForm())return;
    const value=String(e.target.value||'').trim();
    if(!value)return;
    const p=currentProduct();
    if(p)p.unit=value;
    try{if(typeof save==='function')save()}catch{}
  }

  document.addEventListener('change',rememberSelection,true);
  document.addEventListener('input',rememberSelection,true);
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-edit]')){
      setTimeout(prepareEditor,30);
      setTimeout(prepareEditor,150);
    }
  },true);
})();
