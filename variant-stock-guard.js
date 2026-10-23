(()=>{
if(window.__vareliaVariantStockGuardV4)return;
window.__vareliaVariantStockGuardV4=true;
window.__VARELIA_VARIANT_GUARD_BUILD__='20261015-v4';

const DRAFT_PREFIX='varelia_variant_draft_v4:';
const DRAFT_MAX_AGE=5*60*1000;
const medCat=v=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(v||'').trim());
const list=()=>{
  try{if(Array.isArray(window.products))return window.products}catch{}
  try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
  return [];
};
const n=v=>Math.max(0,Number(String(v??'').trim().replace(',','.'))||0);
const text=v=>String(v??'').trim();
const norm=a=>(Array.isArray(a)?a:[]).map(v=>text(v).toLowerCase());
const sameVals=(a,b)=>JSON.stringify(norm(a))===JSON.stringify(norm(b));
const comboTotal=p=>(Array.isArray(p?.variantCombinations)?p.variantCombinations:[]).reduce((a,c)=>a+n(c?.stock),0);
const byId=id=>list().find(p=>text(p.id)===text(id));
const obviousNonMedicine=p=>{
  const words=(String(p?.name||'')+' '+String(p?.category||'')).toLowerCase();
  const chars=Array.isArray(p?.characteristics)?p.characteristics:[];
  return /zapat|zapato|calzado|tenis|sandalia|ropa|polo|camis|blusa|pantal|short|vestido|falda|casaca|chompa|gorra|mochila|bolso/.test(words)
    ||chars.some(c=>/^(talla|color)$/i.test(String(c?.name||'')));
};

function saveNow(){try{if(typeof save==='function')save()}catch{}}
function renderNow(){try{if(typeof render==='function')render()}catch{}}
function syncLater(p){
  if(!p)return;
  try{Promise.resolve(window.syncProductToCloud?.(p)).catch(()=>{})}catch{}
  setTimeout(()=>{
    try{
      Promise.resolve(window.syncProductToCloud?.(p)).catch(()=>{});
      window.vareliaPublicCatalogSync?.();
    }catch{}
  },1400);
}

function draftKeys(p={}){
  const keys=[];
  const scope=String(window.vareliaBusinessScope||localStorage.getItem('varelia_active_business_id')||'no_account')+':';
  const id=text(p.id||document.getElementById('productId')?.value);
  const barcode=text(p.barcode||document.getElementById('barcode')?.value);
  const name=text(p.name||document.getElementById('productName')?.value).toLowerCase();
  if(id)keys.push(DRAFT_PREFIX+scope+'id:'+id);
  if(barcode)keys.push(DRAFT_PREFIX+scope+'barcode:'+barcode);
  if(name)keys.push(DRAFT_PREFIX+scope+'name:'+name);
  return [...new Set(keys)];
}
function putDraft(data,p={}){
  if(!data?.characteristics?.length||!data?.variantCombinations?.length)return;
  const body=JSON.stringify({at:Date.now(),characteristics:data.characteristics,variantCombinations:data.variantCombinations});
  draftKeys(p).forEach(k=>{try{localStorage.setItem(k,body)}catch{}});
}
function getDraft(p={}){
  for(const k of draftKeys(p)){
    try{
      const d=JSON.parse(localStorage.getItem(k)||'null');
      if(!d)continue;
      if(Date.now()-Number(d.at||0)>DRAFT_MAX_AGE){localStorage.removeItem(k);continue}
      if(d.characteristics?.length&&d.variantCombinations?.length)return d;
    }catch{}
  }
  return null;
}
function clearDraft(p={}){draftKeys(p).forEach(k=>{try{localStorage.removeItem(k)}catch{}})}

function editorSnapshot(){
  const editor=document.getElementById('vcharEditor');
  let snap={characteristics:[],variantCombinations:[]};
  try{snap=window.VareliaCharacteristics?.readEditor?.()||snap}catch{}
  if(!editor)return snap;

  // Fuente de verdad: los números que el usuario está viendo justo antes de Guardar.
  const comboInputs=[...editor.querySelectorAll('[data-combo]')];
  if(comboInputs.length){
    const visible=comboInputs.map(i=>({
      values:text(i.dataset.combo).split('||').filter(Boolean),
      stock:n(i.value)
    })).filter(c=>c.values.length);
    if(visible.length)snap.variantCombinations=visible;
  }

  // Respaldo para cualquier versión anterior del editor.
  if(snap.variantCombinations?.length&&snap.variantCombinations.every(c=>n(c.stock)===0)){
    const numberInputs=[...editor.querySelectorAll('input[type="number"]')].filter(i=>!i.disabled&&i.offsetParent!==null);
    if(numberInputs.length>=snap.variantCombinations.length){
      const tail=numberInputs.slice(-snap.variantCombinations.length);
      snap.variantCombinations=snap.variantCombinations.map((c,i)=>({...c,stock:n(tail[i]?.value)}));
    }
  }
  return snap;
}

function restoreDraft(p,doSync=false){
  if(p?._cloudId)return false;
  const d=getDraft(p);if(!d)return false;
  const current=comboTotal(p),draftTotal=(d.variantCombinations||[]).reduce((a,c)=>a+n(c?.stock),0);
  if(current>0){clearDraft(p);return false}
  if(draftTotal<=0)return false;
  p.characteristics=d.characteristics;
  p.variantCombinations=d.variantCombinations;
  p.stock=draftTotal;
  saveNow();renderNow();
  if(doSync)syncLater(p);
  return true;
}

function repairOne(p,doSync=true){
  if(!p||p._cloudId)return false;
  let changed=restoreDraft(p,false);
  const total=comboTotal(p);
  if(total>0&&Number(p.stock||0)!==total){p.stock=total;changed=true}
  if(p.medicine&&obviousNonMedicine(p)){p.medicine=false;changed=true}
  if(changed){saveNow();if(doSync)syncLater(p)}
  return changed;
}
function repairAll(){
  const changed=[];
  list().forEach(p=>{if(repairOne(p,false))changed.push(p)});
  if(changed.length){saveNow();renderNow();changed.forEach(syncLater)}
}

function patchAddToCart(){
  const original=window.addToCart;
  if(typeof original!=='function'||original.__vareliaVariantGuardV4)return false;
  const wrapped=function(p,...rest){
    if(!p)return original.call(this,p,...rest);
    const live=byId(p.id)
      ||list().find(x=>text(x.barcode)&&text(x.barcode)===text(p.barcode))
      ||list().find(x=>text(x.name).toLowerCase()===text(p.name).toLowerCase())
      ||p;
    restoreDraft(live,false);
    let q={...live,...p};
    const total=comboTotal(q);
    if(total>0){
      q.stock=total;
      if(live&&typeof live==='object')live.stock=total;
    }
    if(q.medicine&&obviousNonMedicine(q)){
      q.medicine=false;
      if(live&&typeof live==='object')live.medicine=false;
    }
    if(q.medicine===false&&medCat(q.category)){
      q={...q,category:''};
      try{
        const d=document.getElementById('saleDialog');
        if(typeof openSale==='function'&&!d?.open)openSale(false);
      }catch{}
    }
    return original.call(this,q,...rest);
  };
  wrapped.__vareliaVariantGuardV4=true;
  wrapped.__original=original;
  window.addToCart=wrapped;
  try{addToCart=wrapped}catch{}
  return true;
}

function patchSubmit(){
  return false; // The core form now saves the visible combinations atomically.

  const form=document.getElementById('productForm');
  if(!form||typeof form.onsubmit!=='function'||form.onsubmit.__vareliaVariantGuardV4)return false;
  const original=form.onsubmit;
  const wrapped=async function(e){
    const id0=text(document.getElementById('productId')?.value);
    const barcode0=text(document.getElementById('barcode')?.value);
    const name0=text(document.getElementById('productName')?.value);
    const cat0=text(document.getElementById('productCategory')?.value);
    const wantedMedicine=!!document.getElementById('vMedicineToggle')?.checked;
    const old=byId(id0),oldStock=Number(old?.stock)||0;
    const rowCount=document.querySelectorAll('#vcharRows .vcharRow').length;
    const snap=editorSnapshot();
    if(rowCount>0)putDraft(snap,old||{id:id0,barcode:barcode0,name:name0});

    let result;
    try{
      result=await original.call(this,e);
    }finally{
      setTimeout(()=>{
        const arr=list();
        let p=id0&&arr.find(x=>text(x.id)===id0);
        if(!p&&barcode0)p=[...arr].reverse().find(x=>text(x.barcode)===barcode0);
        if(!p&&name0)p=[...arr].reverse().find(x=>text(x.name)===name0&&(!cat0||text(x.category)===cat0));
        if(!p)return;

        if(rowCount>0){
          p.characteristics=Array.isArray(snap.characteristics)?snap.characteristics:[];
          p.variantCombinations=Array.isArray(snap.variantCombinations)?snap.variantCombinations:[];
        }
        p.medicine=wantedMedicine;
        if(!wantedMedicine){
          const total=comboTotal(p);
          if(total>0)p.stock=total;
          else if(oldStock>0&&Number(p.stock||0)<=0)p.stock=oldStock;
        }

        saveNow();
        renderNow();
        syncLater(p);
      },0);
    }
    return result;
  };
  wrapped.__vareliaVariantGuardV4=true;
  form.onsubmit=wrapped;
  return true;
}

function patchCheckout(){
  if(window.vareliaCentralStockIn)return false; // Cloud transaction owns variant stock.

  const btn=document.getElementById('checkout');
  if(!btn||typeof btn.onclick!=='function'||btn.onclick.__vareliaVariantGuardV4)return false;
  const original=btn.onclick;
  const wrapped=function(e){
    let before=0,snapshot=[];
    try{before=Array.isArray(sales)?sales.length:0}catch{}
    try{
      snapshot=Array.isArray(cart)?cart.map(x=>({
        ...x,
        selectedCharacteristics:Array.isArray(x.selectedCharacteristics)?x.selectedCharacteristics.map(y=>({...y})):[]
      })):[];
    }catch{}

    const result=original.call(this,e);

    setTimeout(()=>{
      let after=before;
      try{after=Array.isArray(sales)?sales.length:before}catch{}
      if(after<=before)return;

      const changed=[];
      snapshot.forEach(item=>{
        if(!item?.selectedCharacteristics?.length)return;
        const p=byId(item.id);
        if(!p||!Array.isArray(p.variantCombinations)||!p.variantCombinations.length)return;
        clearDraft(p);
        const vals=item.selectedCharacteristics.map(x=>x.value);
        const combo=p.variantCombinations.find(c=>sameVals(c?.values,vals));
        if(!combo)return;
        combo.stock=Math.max(0,n(combo.stock)-Math.max(0,Number(item.qty)||0));
        p.stock=comboTotal(p);
        if(!changed.includes(p))changed.push(p);
      });

      if(changed.length){
        saveNow();
        renderNow();
        changed.forEach(syncLater);
      }
    },0);
    return result;
  };
  wrapped.__vareliaVariantGuardV4=true;
  btn.onclick=wrapped;
  return true;
}

let draftTimer=null;
function scheduleDraft(e){
  if(!e.target?.closest?.('#vcharEditor'))return;
  clearTimeout(draftTimer);
  draftTimer=setTimeout(()=>{
    const id=text(document.getElementById('productId')?.value);
    const p=byId(id)||{};
    putDraft(editorSnapshot(),p);
  },80);
}
document.addEventListener('input',scheduleDraft,true);
document.addEventListener('change',scheduleDraft,true);

document.addEventListener('click',e=>{
  const b=e.target?.closest?.('[data-add]');if(!b)return;
  const p=byId(b.dataset.add);if(!p)return;
  restoreDraft(p,false);
  repairOne(p,false);
},true);

function boot(){
  patchAddToCart();
  patchSubmit();
  patchCheckout();
  repairAll();
  window.addEventListener('varelia:central-stock-updated',()=>setTimeout(()=>{
    patchAddToCart();patchSubmit();patchCheckout();repairAll();
  },60));
  window.addEventListener('varelia:forced-sync-complete',()=>setTimeout(repairAll,60));
  setTimeout(()=>{patchAddToCart();patchSubmit();patchCheckout();repairAll()},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
