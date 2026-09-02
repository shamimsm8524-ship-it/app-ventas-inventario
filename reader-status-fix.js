(()=>{
  if(window.__vareliaReaderStatusFixV3)return;
  window.__vareliaReaderStatusFixV3=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    try{localStorage.removeItem('varelia_reader_ready')}catch{}
    let armed=false,confirmed=false,attemptTimer=null;
    const wait=setInterval(()=>{
      const btn=document.getElementById('vposReaderBtn');
      const text=document.getElementById('vposReaderText');
      const dot=document.getElementById('vposReaderDot');
      const input=document.getElementById('vposInput');
      if(!btn||!text||!dot||!input)return;
      clearInterval(wait);

      const paint=(label,state='off')=>{
        text.textContent=label;
        dot.classList.toggle('on',state==='on');
        dot.classList.toggle('warn',state==='warn');
      };
      const disconnected=()=>{
        armed=false;confirmed=false;
        window.__vareliaReaderArmed=false;
        window.__vareliaReaderConfirmed=false;
        try{localStorage.removeItem('varelia_reader_ready')}catch{}
        btn.disabled=false;
        btn.textContent='🔗 Conectar lector';
        paint('Lector no conectado','off');
      };
      const connected=(label)=>{
        confirmed=true;armed=true;
        window.__vareliaReaderArmed=true;
        window.__vareliaReaderConfirmed=true;
        btn.disabled=false;
        btn.textContent='✓ Lector conectado';
        paint(label||'Lector conectado','on');
      };
      disconnected();

      btn.addEventListener('click',()=>{
        clearTimeout(attemptTimer);
        armed=true;confirmed=false;
        window.__vareliaReaderArmed=true;
        window.__vareliaReaderConfirmed=false;
        btn.textContent='🔗 Activando lector...';
        paint('Buscando lector USB/Bluetooth...','warn');
        attemptTimer=setTimeout(()=>{
          const dev=window.__vareliaBarcodeReaderDevice;
          if(dev?.opened){
            connected('Conectado: '+(dev.productName||'lector USB'));
          }else if(!confirmed){
            disconnected();
          }
        },8000);
      },true);

      input.addEventListener('keydown',e=>{
        if(e.key!=='Enter'||!input.value.trim()||!armed)return;
        clearTimeout(attemptTimer);
        setTimeout(()=>connected('Escaneo recibido · listo para el siguiente'),100);
      },true);

      const guard=new MutationObserver(()=>{
        const dev=window.__vareliaBarcodeReaderDevice;
        if(armed&&dev?.opened&&!confirmed){
          clearTimeout(attemptTimer);
          connected('Conectado: '+(dev.productName||'lector USB'));
          return;
        }
        if(!armed&&!confirmed){
          if(btn.textContent!=='🔗 Conectar lector'||text.textContent!=='Lector no conectado'||dot.classList.contains('on')||dot.classList.contains('warn')){
            btn.textContent='🔗 Conectar lector';
            paint('Lector no conectado','off');
          }
        }else if(armed&&!confirmed&&dot.classList.contains('on')){
          paint('Buscando lector USB/Bluetooth...','warn');
        }
      });
      guard.observe(btn,{childList:true,characterData:true,subtree:true});
      guard.observe(text,{childList:true,characterData:true,subtree:true});
      guard.observe(dot,{attributes:true,attributeFilter:['class']});
      addEventListener('pageshow',()=>{clearTimeout(attemptTimer);disconnected()});
    },100);
    setTimeout(()=>clearInterval(wait),15000);
  });
})();