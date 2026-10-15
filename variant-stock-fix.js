(()=>{
  if(window.__vareliaVariantStockFixV2)return;
  window.__vareliaVariantStockFixV2=true;

  const DRAFT_PREFIX='varelia_variant_draft_v2:';
  const DRAFT_MAX_AGE=10*60*1000;
  const num=v=>Math.max(0,Number(String(v??'').trim().replace(',','.'))||0);
  const norm=v=>String(v??'').trim().toLowerCase();
  const list=()=>{try{return Array.isArray(window.products)?window.products:(typeof products!=='undefined'&&Array.isArray(products)?products:[])}catch{return[]}};
  const comboTotal=p=>(Array.isArray(p?.variantCombinations)?p.variantCombinations:[]).reduce((a,c)=>a+num(c?.stock),0);
  const hasChars=p=>Array.isArray(p?.characteristics)&&p.characteristics.some(c=>c&&c.name&&Array.isArray(c.values)&&c.values.length);

  function keysFor(p){
    const out=[];
    const id=String(p?.id||document.getElementById('productId')?.value||'').trim();
    const barcode=String(p?.barcode||document.getElementById('barcode')?.value||'').trim();
    const name=norm(p?.name||document.getElementById('productName')?.value||'');
    if(id)out.push(DRAFT_PREFIX+'id:'+id);
    if(barcode)out.push(DRAFT_PREFIX+'barcode:'+barcode);
    if(name)out.push(DRAFT_PREFIX+'name:'+name);
    return [...new Set(out)];
  }
  function saveDraft(data,p){
    if(!data||!Array.isArray(data.characteristics)||!data.characteristics.length||!Array.isArray(data.variantCombinations)||!data.variantCombinations.length)return;
    const payload={at:Date.now(),characteristics:data.characteristics,variantCombinations:data.variantCombinations};
    for(const k of keysFor(p))try{localStorage.setItem(k,JSON.stringify(payload))}catch{}
  }
  function getDraft(p){
    for(const k of keysFor(p)){
      try{
        const d=JSON.parse(localStorage.getItem(k)||'null');
        if(!d)continue;
        if(Date.now()-Number(d.at||0)>DRAFT_MAX_AGE){localStorage.removeItem(k);continue}
        if(Array.isArray(d.characteristics)&&d.characteristics.length&&Array.isArray(d.variantCombinations)&&d.variantCombinations.length)return d;
      }catch{}
    }
    return null;
  }
  function clearDraft(p){for(const k of keysFor(p))try{localStorage.removeItem(k)}catch{}}

  function readEditorNow(){
    const editor=document.getElementById('vcharEditor');
    if(!editor)return null;
    let base={characteristics:[],variantCombinations:[]};
    try{base=window.VareliaCharacteristics?.readEditor?.()||base}catch{}
    const comboEls=[...editor.querySelectorAll('[data-combo]')];
    if(comboEls.length){
      const live=comboEls.map(i=>({values:String(i.dataset.combo||'').split('||').filter(Boolean),stock:num(i.value)}));
      if(live.some(c=>c.values.length))base.variantCombinations=live;
    }
    if((!base.variantCombinations?.length||base.variantCombinations.every(c=>num(c.stock)===0))&&Array.isArray(base.variantCombinations)&&base.variantCombinations.length){
      const nums=[...editor.querySelectorAll('input[type="number"]')].filter(i=>!i.disabled&&i.offsetParent!==null);
      if(nums.length>=base.variantCombinations.length){
        const tail=nums.slice(-base.variantCombinations.length);
        base.variantCombinations=base.variantCombinations.map((c,i)=>({...c,stock:num(tail[i]?.value)}));
      }
    }
    return base;
  }

  function findLive(p){
    if(!p)return null;
    return list().find(x=>String(x.id||'').trim()===String(p.id||'').trim())
      ||list().find(x=>String(p.barcode||'').trim()&&String(x.barcode||'').trim()===String(p.barcode||'').trim())
      ||list().find(x=>norm(x.name)===norm(p.name))
      ||p;
  }

  function sameStructure(p,d){
    const a=Array.isArray(p?.variantCombinations)?p.variantCombinations:[],b=Array.isArray(d?.variantCombinations)?d.variantCombinations:[];
    if(!a.length||a.length!==b.length)return false;
    const key=c=>(Array.isArray(c?.values)?c.values:[]).map(norm).join('||');
    return a.map(key).sort().join('~~')===b.map(key).sort().join('~~')&&hasChars(p);
  }

  function persistLocal(){try{if(typeof save==='function')save()}catch{}}
  function repairStock(p){
    if(!p||!hasChars(p))return 0;
    const total=comboTotal(p);
    if(total>0&&num(p.stock)!==total){p.stock=total;persistLocal()}
    return total;
  }

  function restoreRecentDraft(p,allowSync=true){
    if(!p)return false;
    const d=getDraft(p);if(!d)return false;
    const currentTotal=comboTotal(p),draftTotal=(d.variantCombinations||[]).reduce((a,c)=>a+num(c.stock),0);
    if(sameStructure(p,d)&&currentTotal>0){clearDraft(p);return false}
    if(draftTotal<=0)return false;
    if(!hasChars(p)||currentTotal<=0){
      p.characteristics=d.characteristics;
      p.variantCombinations=d.variantCombinations;
      p.stock=draftTotal;
      persistLocal();
      if(allowSync)Promise.resolve(window.syncProductToCloud?.(p)).catch(()=>{});
      return true;
    }
    return false;
  }

  function backupCurrent(){
    const data=readEditorNow();if(!data)return;
    const id=String(document.getElementById('productId')?.value||'').trim();
    const p=list().find(x=>String(x.id||'').trim()===id)||null;
    saveDraft(data,p);
    if(p&&data.characteristics?.length&&data.variantCombinations?.length){
      p.characteristics=data.characteristics;
      p.variantCombinations=data.variantCombinations;
      const total=(data.variantCombinations||[]).reduce((a,c)=>a+num(c.stock),0);
      if(total>0)p.stock=total;
      persistLocal();
    }
  }

  let backupTimer=null;
  document.addEventListener('input',e=>{
    if(!e.target?.closest?.('#vcharEditor'))return;
    clearTimeout(backupTimer);backupTimer=setTimeout(backupCurrent,100);
  },true);
  document.addEventListener('change',e=>{
    if(!e.target?.closest?.('#vcharEditor'))return;
    clearTimeout(backupTimer);backupTimer=setTimeout(backupCurrent,50);
  },true);
  document.addEventListener('submit',e=>{
    if(e.target?.id!=='productForm')return;
    clearTimeout(backupTimer);backupCurrent();
  },true);

  document.addEventListener('click',e=>{
    const b=e.target?.closest?.('[data-add]');if(!b)return;
    const p=list().find(x=>String(x.id||'').trim()===String(b.dataset.add||'').trim());
    if(!p)return;
    restoreRecentDraft(p,false);
    repairStock(p);
  },true);

  function patchAddToCart(){
    const original=window.addToCart;
    if(typeof original!=='function'||original.__vareliaVariantStockFix)return;
    const fixed=function(p,qty){
      if(p){
        const live=findLive(p);
        if(live){restoreRecentDraft(live,false);const total=repairStock(live);if(total>0&&num(p.stock)<=0)p={...p,stock:total}}
      }
      return original.call(this,p,qty);
    };
    fixed.__vareliaVariantStockFix=true;
    window.addToCart=fixed;
  }

  function reconcile(){
    for(const p of list()){
      const restored=restoreRecentDraft(p,true);
      if(!restored)repairStock(p);
    }
    patchAddToCart();
  }

  window.addEventListener('varelia:central-stock-updated',()=>setTimeout(reconcile,30));
  window.addEventListener('varelia:forced-sync-complete',()=>setTimeout(reconcile,30));
  setTimeout(reconcile,80);
  setTimeout(reconcile,700);
  setTimeout(reconcile,1800);
})();
