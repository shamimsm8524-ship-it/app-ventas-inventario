(()=>{
if(window.__vareliaVariantStockGuardV3)return;
window.__vareliaVariantStockGuardV3=true;
window.__VARELIA_VARIANT_GUARD_BUILD__='20261015-v3';

const medCat=v=>/^(pastillas?|medicinas?|medicamentos?)$/i.test(String(v||'').trim());
const list=()=>{
  try{if(Array.isArray(window.products))return window.products}catch{}
  try{if(typeof products!=='undefined'&&Array.isArray(products))return products}catch{}
  return [];
};
const norm=a=>(Array.isArray(a)?a:[]).map(v=>String(v??'').trim().toLowerCase());
const sameVals=(a,b)=>JSON.stringify(norm(a))===JSON.stringify(norm(b));
const comboTotal=p=>(Array.isArray(p?.variantCombinations)?p.variantCombinations:[]).reduce((a,c)=>a+Math.max(0,Number(c?.stock)||0),0);
const byId=id=>list().find(p=>String(p.id||'').trim()===String(id||'').trim());
const obviousNonMedicine=p=>{
  const text=(String(p?.name||'')+' '+String(p?.category||'')).toLowerCase();
  const chars=Array.isArray(p?.characteristics)?p.characteristics:[];
  return /zapat|zapato|calzado|tenis|sandalia|ropa|polo|camis|blusa|pantal|short|vestido|falda|casaca|chompa|gorra|mochila|bolso/.test(text)
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
function repairOne(p,doSync=true){
  if(!p)return false;
  let changed=false;
  const total=comboTotal(p);
  if(total>0&&Number(p.stock||0)!==total){p.stock=total;changed=true}
  // Si claramente es ropa/calzado, no debe quedar como medicamento por una categoría antigua.
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
  if(typeof original!=='function'||original.__vareliaVariantGuardV3)return false;
  const wrapped=function(p,...rest){
    if(!p)return original.call(this,p,...rest);
    const live=byId(p.id)
      ||list().find(x=>String(x.barcode||'').trim()&&String(x.barcode||'').trim()===String(p.barcode||'').trim())
      ||p;
    let q={...live,...p};
    const total=comboTotal(q);
    // El stock real de un producto con variantes es la suma de sus combinaciones.
    if(total>0){
      q.stock=total;
      if(live&&typeof live==='object')live.stock=total;
    }
    if(q.medicine&&obviousNonMedicine(q)){
      q.medicine=false;
      if(live&&typeof live==='object')live.medicine=false;
    }
    // El selector "Otro producto" manda sobre el nombre de la categoría.
    // Se neutraliza la categoría solo en la copia usada para vender; no se cambia la categoría guardada.
    if(q.medicine===false&&medCat(q.category)){
      q={...q,category:''};
      try{
        const d=document.getElementById('saleDialog');
        if(typeof openSale==='function'&&!d?.open)openSale(false);
      }catch{}
    }
    return original.call(this,q,...rest);
  };
  wrapped.__vareliaVariantGuardV3=true;
  wrapped.__original=original;
  window.addToCart=wrapped;
  try{addToCart=wrapped}catch{}
  return true;
}

function patchSubmit(){
  const form=document.getElementById('productForm');
  if(!form||typeof form.onsubmit!=='function'||form.onsubmit.__vareliaVariantGuardV3)return false;
  const original=form.onsubmit;
  const wrapped=async function(e){
    const id0=String(document.getElementById('productId')?.value||'').trim();
    const barcode0=String(document.getElementById('barcode')?.value||'').trim();
    const name0=String(document.getElementById('productName')?.value||'').trim();
    const cat0=String(document.getElementById('productCategory')?.value||'').trim();
    const wantedMedicine=!!document.getElementById('vMedicineToggle')?.checked;
    const old=byId(id0),oldStock=Number(old?.stock)||0;
    const rowCount=document.querySelectorAll('#vcharRows .vcharRow').length;
    let snap={characteristics:[],variantCombinations:[]};
    try{snap=window.VareliaCharacteristics?.readEditor?.()||snap}catch{}
    let result;
    try{
      result=await original.call(this,e);
    }finally{
      setTimeout(()=>{
        const arr=list();
        let p=id0&&arr.find(x=>String(x.id||'').trim()===id0);
        if(!p&&barcode0)p=[...arr].reverse().find(x=>String(x.barcode||'').trim()===barcode0);
        if(!p&&name0)p=[...arr].reverse().find(x=>String(x.name||'').trim()===name0&&(!cat0||String(x.category||'').trim()===cat0));
        if(!p)return;

        // Reaplicar exactamente lo que estaba visible en el editor al tocar Guardar.
        if(rowCount>0){
          p.characteristics=Array.isArray(snap.characteristics)?snap.characteristics:[];
          p.variantCombinations=Array.isArray(snap.variantCombinations)?snap.variantCombinations:[];
        }

        // La elección del usuario es la fuente de verdad; la categoría no debe activar medicamento sola.
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
  wrapped.__vareliaVariantGuardV3=true;
  form.onsubmit=wrapped;
  return true;
}

function patchCheckout(){
  const btn=document.getElementById('checkout');
  if(!btn||typeof btn.onclick!=='function'||btn.onclick.__vareliaVariantGuardV3)return false;
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
        const vals=item.selectedCharacteristics.map(x=>x.value);
        const combo=p.variantCombinations.find(c=>sameVals(c?.values,vals));
        if(!combo)return;
        combo.stock=Math.max(0,(Number(combo.stock)||0)-Math.max(0,Number(item.qty)||0));
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
  wrapped.__vareliaVariantGuardV3=true;
  btn.onclick=wrapped;
  return true;
}

function boot(){
  patchAddToCart();
  patchSubmit();
  patchCheckout();
  repairAll();
  window.addEventListener('varelia:central-stock-updated',()=>setTimeout(()=>{
    patchAddToCart();patchSubmit();patchCheckout();repairAll();
  },60));
  setTimeout(()=>{patchAddToCart();patchSubmit();patchCheckout();repairAll()},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
