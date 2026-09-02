(()=>{
  if(window.__vareliaReaderStatusFixV2)return;
  window.__vareliaReaderStatusFixV2=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    try{localStorage.removeItem('varelia_reader_ready')}catch{}
    let armed=false,confirmed=false;
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
        if(armed||confirmed)return;
        btn.textContent='🔗 Conectar lector';
        paint('Lector no conectado','off');
      };
      disconnected();

      btn.addEventListener('click',()=>{
        armed=true;confirmed=false;
        btn.textContent='🔗 Activando lector...';
        paint('Esperando conexión del lector...','warn');
        setTimeout(()=>{
          const dev=window.__vareliaBarcodeReaderDevice;
          if(dev?.opened){
            confirmed=true;
            btn.textContent='✓ Lector conectado';
            paint('Conectado: '+(dev.productName||'lector USB'),'on');
          }else if(!confirmed){
            btn.textContent='✓ Modo lector activado';
            paint('Esperando el primer escaneo USB/Bluetooth','warn');
          }
        },900);
      },true);

      input.addEventListener('keydown',e=>{
        if(e.key!=='Enter'||!input.value.trim()||!armed)return;
        setTimeout(()=>{
          confirmed=true;
          btn.textContent='✓ Lector activo';
          paint('Escaneo recibido · listo para el siguiente','on');
        },100);
      },true);

      const guard=new MutationObserver(()=>{
        if(!armed&&!confirmed){
          if(btn.textContent!=='🔗 Conectar lector'||text.textContent!=='Lector no conectado'||dot.classList.contains('on')||dot.classList.contains('warn')) disconnected();
        }else if(armed&&!confirmed){
          const dev=window.__vareliaBarcodeReaderDevice;
          if(dev?.opened){
            confirmed=true;
            btn.textContent='✓ Lector conectado';
            paint('Conectado: '+(dev.productName||'lector USB'),'on');
          }else if(dot.classList.contains('on')){
            btn.textContent='✓ Modo lector activado';
            paint('Esperando el primer escaneo USB/Bluetooth','warn');
          }
        }
      });
      guard.observe(btn,{childList:true,characterData:true,subtree:true});
      guard.observe(text,{childList:true,characterData:true,subtree:true});
      guard.observe(dot,{attributes:true,attributeFilter:['class']});
    },100);
    setTimeout(()=>clearInterval(wait),15000);
  });
})();