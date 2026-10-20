(()=>{
  if(window.__vareliaAmpicilinaPriceRepairV1)return;
  window.__vareliaAmpicilinaPriceRepairV1=true;

  const BARCODE='2071674969557';
  const NAME='ampicilina';
  let busy=false,done=false,tries=0;

  const list=()=>{
    try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
    return Array.isArray(window.products)?window.products:[];
  };
  const near=(a,b)=>Math.abs(Number(a)-Number(b))<0.000001;
  const find=()=>list().find(p=>String(p?.barcode||'').trim()===BARCODE&&String(p?.name||'').trim().toLowerCase()===NAME)||null;

  function exactBrokenSignature(p){
    return !!p&&p.medicine===true
      &&Math.floor(Number(p.blistersPerBox)||0)===10
      &&Math.floor(Number(p.unitsPerBlister)||0)===10
      &&near(p.boxPrice,60)
      &&near(p.blisterPrice,30)
      &&near(p.unitMedicinePrice,3)
      &&near(p.buyPrice,35);
  }

  function refreshOpenForm(p){
    const id=String(document.getElementById('productId')?.value||'');
    const barcode=String(document.getElementById('barcode')?.value||'').trim();
    const name=String(document.getElementById('productName')?.value||'').trim().toLowerCase();
    if(!(id===String(p.id||'')||barcode===BARCODE||name===NAME))return;
    const blister=document.getElementById('vMedicineBlisterPrice');
    if(blister&&String(blister.value||'')!=='10'){
      blister.value='10';
      blister.dispatchEvent(new Event('input',{bubbles:true}));
      blister.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  async function repair(){
    if(done||busy)return;
    tries++;
    const p=find();
    if(!p){if(tries>80)done=true;return}
    refreshOpenForm(p);
    if(!exactBrokenSignature(p)){
      if(near(p.blisterPrice,10))done=true;
      return;
    }

    busy=true;
    try{
      // Reparación única y deliberadamente estrecha: solo la Ampicilina exacta
      // que quedó con S/30 por blíster tras el fallo histórico.
      p.blisterPrice=10;
      refreshOpenForm(p);
      try{if(typeof save==='function')save()}catch{}
      try{
        if(typeof K!=='undefined'&&K?.products)localStorage.setItem(K.products,JSON.stringify(list()));
      }catch{}

      const sync=window.vareliaCentralStockSyncProduct||window.syncProductToCloud;
      if(typeof sync==='function'){
        await Promise.race([
          Promise.resolve(sync(p)),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('Sincronización tardó demasiado')),15000))
        ]);
      }

      // Verificar en Supabase cuando la sesión está disponible.
      const sb=window.vareliaSupabase;
      if(sb&&p._cloudId){
        const check=await Promise.race([
          sb.from('varelia_products').select('blister_price').eq('id',p._cloudId).maybeSingle(),
          new Promise((_,reject)=>setTimeout(()=>reject(new Error('Verificación tardó demasiado')),8000))
        ]).catch(()=>null);
        const remote=Number(check?.data?.blister_price);
        if(Number.isFinite(remote)&&!near(remote,10))throw new Error('La nube todavía conserva otro precio de blíster');
      }

      done=true;
      try{window.dispatchEvent(new CustomEvent('varelia:ampicilina-price-repaired',{detail:{blisterPrice:10}}))}catch{}
      try{window.dispatchEvent(new CustomEvent('varelia:catalog-product-changed'))}catch{}
      try{window.vareliaToast?.('Ampicilina: precio por blíster corregido a S/ 10.00.','ok')}catch{}
    }catch(err){
      console.warn('Reparación de precio de Ampicilina',err);
      // Mantener el dato local correcto y reintentar la nube.
      p.blisterPrice=10;
      refreshOpenForm(p);
      setTimeout(()=>{busy=false;repair()},2500);
      return;
    }
    busy=false;
  }

  const schedule=()=>setTimeout(repair,50);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
  window.addEventListener('varelia:central-stock-updated',schedule);
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-edit],button'))setTimeout(repair,120)},true);
  const timer=setInterval(()=>{
    if(done){clearInterval(timer);return}
    repair();
    if(tries>120)clearInterval(timer);
  },500);
})();
