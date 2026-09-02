(()=>{
  if(window.__vareliaReaderStatusFix)return;
  window.__vareliaReaderStatusFix=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    try{localStorage.removeItem('varelia_reader_ready')}catch{}
    const wait=setInterval(()=>{
      const btn=document.getElementById('vposReaderBtn');
      const text=document.getElementById('vposReaderText');
      const dot=document.getElementById('vposReaderDot');
      if(!btn||!text||!dot)return;
      clearInterval(wait);
      btn.textContent='🔗 Conectar lector';
      text.textContent='Lector no conectado';
      dot.classList.remove('on','warn');
      btn.addEventListener('click',()=>{
        text.textContent='Esperando conexión del lector...';
        dot.classList.remove('on');
        dot.classList.add('warn');
      },true);
    },120);
    setTimeout(()=>clearInterval(wait),12000);
  });
})();