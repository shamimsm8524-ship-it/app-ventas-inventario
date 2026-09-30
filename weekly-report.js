(()=>{
  if(window.__vareliaWeeklyReport)return;
  window.__vareliaWeeklyReport=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    document.getElementById('weeklyReport')?.remove();
    document.querySelectorAll('[data-view="weeklyReport"],.weeklyReportNavItem,.reportCashItem').forEach(el=>el.remove());
    if(typeof sales==='undefined'||typeof closures==='undefined'||typeof K==='undefined')return;

    const money=n=>'S/ '+Number(n||0).toFixed(2);

    async function getEmail(){
      let e=document.getElementById('vareliaUserEmail')?.textContent?.trim()||'';
      if(!e&&window.vareliaSupabase){
        try{
          const {data}=await window.vareliaSupabase.auth.getSession();
          e=data?.session?.user?.email||'';
        }catch{}
      }
      return e;
    }

    function report(){
      const now=new Date();
      const total=sales.reduce((a,s)=>a+(Number(s.total)||0),0);
      const units=sales.reduce((a,s)=>a+(s.items||[]).reduce((b,i)=>b+(Number(i.qty)||0),0),0);
      const lines=[
        'REPORTE VARELIA',
        'Generado: '+now.toLocaleString('es-PE'),
        '',
        'RESUMEN',
        'Ventas registradas: '+sales.length,
        'Unidades vendidas: '+units,
        'Total vendido: '+money(total),
        'Cierres de caja: '+closures.length,
        '',
        'VENTAS'
      ];
      if(!sales.length)lines.push('Sin ventas registradas.');
      sales.forEach((s,idx)=>{
        lines.push('Venta '+(idx+1)+' - '+new Date(s.date).toLocaleString('es-PE')+' - '+money(s.total)+' - '+(s.paymentMethod||'No registrado'));
        (s.items||[]).forEach(i=>lines.push('  • '+i.name+' x'+i.qty+' @ '+money(i.price)+' = '+money((Number(i.qty)||0)*(Number(i.price)||0))));
      });
      lines.push('','CIERRES DE CAJA');
      if(!closures.length)lines.push('Sin cierres registrados.');
      closures.forEach((c,idx)=>lines.push('Cierre '+(idx+1)+' - '+new Date(c.closedAt).toLocaleString('es-PE')+' - '+money(c.closureTotal??c.total)));
      return lines.join('\n');
    }

    async function openMail(subject){
      const email=await getEmail();
      if(!email)return alert('No se pudo detectar el correo afiliado. Cierra sesión y vuelve a ingresar.');
      const body=report();
      try{
        localStorage.setItem('varelia_last_weekly_backup',JSON.stringify({
          createdAt:new Date().toISOString(),
          email,
          body,
          sales:JSON.parse(JSON.stringify(sales)),
          closures:JSON.parse(JSON.stringify(closures))
        }));
      }catch{}
      location.href='mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);
      return true;
    }

    const sendBackup=()=>openMail('Varelia - Copia del reporte');
    const closeWeek=async()=>{
      if(!sales.length&&!closures.length)return alert('No hay ventas ni cierres para respaldar.');
      const ok=confirm('Primero se abrirá Gmail con la copia del reporte. Varelia NO borrará nada todavía. ¿Continuar?');
      if(!ok)return;
      const opened=await openMail('Varelia - Cierre semanal');
      if(!opened)return;
      sessionStorage.setItem('varelia_weekly_reset_pending','1');
    };

    window.VareliaWeeklyReport={send:sendBackup,close:closeWeek,getEmail,report};

    window.addEventListener('focus',()=>{
      setTimeout(()=>{
        if(sessionStorage.getItem('varelia_weekly_reset_pending')!=='1')return;
        const sent=confirm('¿Ya enviaste la copia del reporte?\n\nAceptar = cerrar la semana y empezar Ventas + Caja en S/ 0.00.\nCancelar = conservar todo.');
        if(!sent){
          sessionStorage.removeItem('varelia_weekly_reset_pending');
          return;
        }
        sales.splice(0,sales.length);
        closures.splice(0,closures.length);
        cashStart=new Date().toISOString();
        try{
          localStorage.setItem(K.sales,'[]');
          localStorage.setItem(K.closures,'[]');
          localStorage.setItem(K.cashStart,JSON.stringify(cashStart));
          localStorage.setItem('varelia_last_weekly_reset',new Date().toISOString());
        }catch{}
        sessionStorage.removeItem('varelia_weekly_reset_pending');
        try{
          if(typeof save==='function')save();
          else if(typeof render==='function')render();
        }catch{}
        window.vareliaSound?.('sale');
        window.vareliaToast?.('Semana cerrada. Ventas y Caja están en 0.');
      },500);
    });
  });
})();