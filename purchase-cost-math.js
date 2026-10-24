(()=>{
  function unitCost(total,quantity){
    const cost=Number(total),count=Number(quantity);
    if(!Number.isFinite(cost)||cost<0)throw new Error('El costo debe ser un número mayor o igual a cero.');
    if(!Number.isFinite(count)||count<=0)throw new Error('La cantidad de compra debe ser mayor que cero.');
    return cost/count;
  }
  function stockFromPackages(packages,unitsPerPackage){
    const count=Number(packages),size=Number(unitsPerPackage);
    if(!Number.isFinite(count)||count<0)throw new Error('La cantidad de cajas debe ser mayor o igual a cero.');
    if(!Number.isFinite(size)||size<=0)throw new Error('Indica cuántas unidades trae cada caja.');
    return Number((count*size).toFixed(6));
  }
  const api={unitCost,stockFromPackages};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.VareliaPurchaseMath=api;
})();

// Experiencia de respaldo móvil: conserva exactamente el mismo contenido del
// respaldo, pero lo entrega como archivo propio de Varelia para evitar que
// Android lo abra como texto/JSON después de descargarlo.
(()=>{
  if(typeof window==='undefined'||window.__vareliaBackupDownloadUxV1)return;
  window.__vareliaBackupDownloadUxV1=true;

  const pad=n=>String(n).padStart(2,'0');
  const backupName=()=>{
    const d=new Date();
    return `Respaldo_Varelia_${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}.varelia`;
  };

  const prepareRestoreInput=()=>{
    const input=document.getElementById('vbackupFile');
    if(input)input.setAttribute('accept','.varelia,.json,application/json,application/octet-stream');
  };

  const notifySaved=button=>{
    try{window.vareliaToast?.('✅ Respaldo guardado correctamente.','ok')}catch{}
    if(!button)return;
    const old=button.dataset.vareliaBackupLabel||button.textContent||'⬇ Descargar respaldo';
    if(!button.dataset.vareliaBackupLabel)button.dataset.vareliaBackupLabel=old;
    button.textContent='✓ Respaldo guardado';
    setTimeout(()=>{if(button.isConnected)button.textContent=old},1800);
  };

  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('[data-vsetting-action="download"]');
    if(!button)return;

    const nativeCreate=URL.createObjectURL;
    const nativeClick=HTMLAnchorElement.prototype.click;
    let active=true;

    // Fuerza el respaldo como descarga binaria para que Android no intente
    // mostrarlo en el visor de documentos como si fuera código.
    URL.createObjectURL=function(value){
      if(active&&value instanceof Blob){
        try{
          const forced=new Blob([value],{type:'application/octet-stream'});
          return nativeCreate.call(URL,forced);
        }catch{}
      }
      return nativeCreate.call(URL,value);
    };

    HTMLAnchorElement.prototype.click=function(){
      if(active&&/^varelia-respaldo-/i.test(String(this.download||''))){
        this.download=backupName();
        this.type='application/octet-stream';
      }
      return nativeClick.apply(this,arguments);
    };

    // El manejador original de Varelia genera el respaldo de forma síncrona.
    // Restauramos inmediatamente las APIs para no afectar otras descargas.
    setTimeout(()=>{
      active=false;
      URL.createObjectURL=nativeCreate;
      HTMLAnchorElement.prototype.click=nativeClick;
      notifySaved(button);
      prepareRestoreInput();
    },0);
  },true);

  const boot=()=>{
    prepareRestoreInput();
    const observer=new MutationObserver(prepareRestoreInput);
    observer.observe(document.documentElement,{childList:true,subtree:true});
  };
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot,{once:true}):boot();
})();

// Ticket interno impreso: mantiene el tamaño de papel configurado, pero hace
// más angosta únicamente el área de contenido para que no se vea tan estirada.
(()=>{
  if(typeof window==='undefined'||window.__vareliaCompactInternalPrintV1)return;
  window.__vareliaCompactInternalPrintV1=true;

  const compactHtml=(title,html)=>{
    const name=String(title||'');
    let out=String(html||'');
    if(!/^Comprobante\b/i.test(name)||!out.includes('COMPROBANTE INTERNO DE VENTA'))return out;

    // Mantiene el papel igual y reduce solamente el ancho visual del contenido.
    // 80 mm: contenido de 72 mm -> 52 mm.
    // 58 mm: contenido de 52 mm -> 42 mm.
    // Reemplazar primero 52 mm evita que el valor nuevo de 80 mm se vuelva a reducir.
    out=out.replace(/\.paper\{width:52mm/g,'.paper{width:42mm');
    out=out.replace(/\.paper\{width:72mm/g,'.paper{width:52mm');
    return out;
  };

  const install=()=>{
    const bridge=window.VareliaAndroid;
    if(!bridge||typeof bridge.printHtmlDocument!=='function')return false;
    if(bridge.printHtmlDocument.__vareliaCompactInternalPrintV1)return true;
    try{
      const nativePrint=bridge.printHtmlDocument.bind(bridge);
      const wrapped=function(title,html){
        return nativePrint(title,compactHtml(title,html));
      };
      wrapped.__vareliaCompactInternalPrintV1=true;
      bridge.printHtmlDocument=wrapped;
      return bridge.printHtmlDocument===wrapped;
    }catch{return false}
  };

  if(!install()){
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(install()||tries>=80)clearInterval(timer);
    },250);
  }
})();
