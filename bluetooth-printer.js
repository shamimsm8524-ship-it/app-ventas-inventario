(()=>{
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn()}
  ready(()=>{
    const wait=setInterval(()=>{
      const toolbar=document.getElementById('bcToolbar');
      if(!toolbar)return;
      clearInterval(wait);

      const style=document.createElement('style');
      style.textContent=`
      .bt-print-btn{border:1px solid color-mix(in srgb,var(--p) 40%,var(--line))!important;background:var(--card)!important;color:var(--p)!important;box-shadow:none!important}
      .bt-system-btn{border:0!important;background:linear-gradient(135deg,#0f172a,#334155)!important;color:#fff!important;box-shadow:none!important}
      .bt-print-status{display:flex;align-items:center;gap:7px;width:100%;margin-top:2px;padding:9px 11px;border-radius:12px;background:var(--bg);color:var(--muted);font-size:12px;font-weight:800}
      .bt-dot{width:9px;height:9px;border-radius:50%;background:#94a3b8;flex:0 0 auto}.bt-dot.on{background:#16a34a;box-shadow:0 0 0 4px #16a34a22}.bt-dot.warn{background:#f59e0b;box-shadow:0 0 0 4px #f59e0b22}
      `;
      document.head.appendChild(style);

      let btDevice=null;
      let btServer=null;

      const btn=document.createElement('button');
      btn.type='button';
      btn.id='btPrinterBtn';
      btn.className='bt-print-btn';
      btn.textContent='🖨️ Conectar impresora Bluetooth';
      toolbar.appendChild(btn);

      const printBtn=document.createElement('button');
      printBtn.type='button';
      printBtn.id='btSystemPrintBtn';
      printBtn.className='bt-system-btn';
      printBtn.textContent='🧾 Abrir impresión';
      toolbar.appendChild(printBtn);

      const status=document.createElement('div');
      status.className='bt-print-status';
      status.innerHTML='<span class="bt-dot"></span><span id="btPrinterStatusText">Impresora Bluetooth no conectada</span>';
      toolbar.insertAdjacentElement('afterend',status);

      function setStatus(text,mode='off'){
        const dot=status.querySelector('.bt-dot');
        const txt=status.querySelector('#btPrinterStatusText');
        dot.classList.toggle('on',mode==='on');
        dot.classList.toggle('warn',mode==='warn');
        txt.textContent=text;
      }

      async function connectPrinter(){
        if(!window.isSecureContext){alert('Bluetooth requiere abrir Varelia por HTTPS.');return}
        if(!navigator.bluetooth){
          setStatus('Bluetooth web no disponible en este navegador','warn');
          alert('Este navegador no permite conexión Bluetooth directa. En Android usa Google Chrome. Si tu impresora es Bluetooth clásica, empareja primero desde Ajustes > Bluetooth y luego toca “Abrir impresión”.');
          return;
        }
        try{
          setStatus('Buscando dispositivos Bluetooth cercanos...','warn');
          btDevice=await navigator.bluetooth.requestDevice({acceptAllDevices:true});
          btn.disabled=true;btn.textContent='Conectando...';
          if(btDevice.gatt)btServer=await btDevice.gatt.connect();
          const name=btDevice.name||'Dispositivo Bluetooth';
          setStatus('Conectada: '+name,'on');
          btn.textContent='✓ '+name;
          btn.disabled=false;
          try{localStorage.setItem('varelia_bt_printer_name',name)}catch{}
          btDevice.addEventListener('gattserverdisconnected',()=>{
            setStatus('Impresora desconectada','warn');
            btn.textContent='🖨️ Conectar impresora Bluetooth';
          });
        }catch(e){
          btn.disabled=false;btn.textContent='🖨️ Conectar impresora Bluetooth';
          if(e?.name==='NotFoundError')setStatus('No se seleccionó ninguna impresora','warn');
          else{setStatus('No se pudo conectar','warn');alert('No se pudo conectar por Bluetooth: '+(e.message||e));}
        }
      }

      btn.onclick=connectPrinter;
      printBtn.onclick=()=>{
        setStatus(btDevice&&btDevice.gatt?.connected?'Impresora conectada. Elige esa impresora en el diálogo de impresión.':'Selecciona tu impresora Bluetooth en el diálogo de impresión.','on');
        window.print();
      };

      window.addEventListener('beforeprint',()=>{
        if(btDevice&&btDevice.gatt?.connected)setStatus('Impresora conectada. Selecciónala para imprimir.','on');
      });

      try{
        const saved=localStorage.getItem('varelia_bt_printer_name');
        if(saved)setStatus('Última impresora: '+saved+' · toca Conectar para volver a usarla','warn');
      }catch{}
    },150);
  });
})();