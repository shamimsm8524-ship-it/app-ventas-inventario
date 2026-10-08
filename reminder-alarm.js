(()=>{
  if(window.__vareliaReminderAlarm)return;
  window.__vareliaReminderAlarm=true;

  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn,{once:true}):fn();
  ready(()=>{
    const purchases=document.getElementById('purchases');
    if(!purchases)return;

    const ENABLE_KEY='varelia_reminder_alarm_enabled_v1';
    const FIRED_KEY='varelia_reminder_alarm_fired_v1';
    const CHECK_MS=15000;
    const CATCHUP_MS=10*60*1000;
    let sb=null;
    let enabled=localStorage.getItem(ENABLE_KEY)==='1';
    let audioCtx=null;
    let alarmTimer=null;
    let stopTimer=null;
    let currentAlarmIds=[];
    let checking=false;

    const style=document.createElement('style');
    style.textContent=`
      .vr-alarmbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:-4px 0 14px;padding:11px 13px;border:1px solid var(--line);border-radius:14px;background:color-mix(in srgb,var(--p) 5%,var(--card))}.vr-alarmbar strong{display:block;font-size:12px}.vr-alarmbar span{display:block;margin-top:2px;color:var(--muted);font-size:10px}.vr-alarmbtn{white-space:nowrap;padding:9px 11px!important}.vr-alarm-overlay{position:fixed;inset:0;z-index:100000;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(15,23,42,.72);backdrop-filter:blur(9px)}.vr-alarm-overlay.show{display:flex}.vr-alarm-card{width:min(94vw,440px);background:var(--card);color:var(--ink);border-radius:24px;padding:24px;box-shadow:0 28px 80px rgba(15,23,42,.38);text-align:center;border:1px solid var(--line)}.vr-alarm-bell{font-size:56px;line-height:1;animation:vrRing .65s ease-in-out infinite alternate}.vr-alarm-card h2{margin:12px 0 7px}.vr-alarm-text{white-space:pre-wrap;line-height:1.45;margin:0 0 16px}.vr-alarm-stop{width:100%;font-size:16px}@keyframes vrRing{from{transform:rotate(-10deg) scale(1)}to{transform:rotate(10deg) scale(1.08)}}@media(max-width:560px){.vr-alarmbar{align-items:flex-start;flex-direction:column}.vr-alarmbtn{width:100%}}
    `;
    document.head.appendChild(style);

    const bar=document.createElement('div');
    bar.className='vr-alarmbar';
    bar.innerHTML=`<div><strong>🔊 Alarma de recordatorios</strong><span id="vrAlarmStatus">${enabled?'Alarmas activadas':'Activa el sonido para que Varelia te avise a la hora programada.'}</span></div><button type="button" class="btn ${enabled?'secondary':'primary'} vr-alarmbtn" id="vrAlarmEnable">${enabled?'✓ Alarmas activadas':'🔔 Activar alarmas'}</button>`;
    const reminderCard=purchases.querySelector('.vr-card');
    const reminderHead=reminderCard?.querySelector('.vr-head');
    if(reminderHead)reminderHead.insertAdjacentElement('afterend',bar);
    else purchases.querySelector('.head')?.insertAdjacentElement('afterend',bar);

    const overlay=document.createElement('div');
    overlay.className='vr-alarm-overlay';
    overlay.id='vrAlarmOverlay';
    overlay.innerHTML=`<div class="vr-alarm-card" role="alertdialog" aria-modal="true" aria-labelledby="vrAlarmTitle"><div class="vr-alarm-bell">🔔</div><h2 id="vrAlarmTitle">Recordatorio de Varelia</h2><p class="vr-alarm-text" id="vrAlarmText"></p><button type="button" class="btn primary vr-alarm-stop" id="vrAlarmStop">Detener alarma</button></div>`;
    document.body.appendChild(overlay);

    const enableBtn=document.getElementById('vrAlarmEnable');
    const status=document.getElementById('vrAlarmStatus');
    const alarmText=document.getElementById('vrAlarmText');
    const stopBtn=document.getElementById('vrAlarmStop');

    function getFired(){
      try{return JSON.parse(localStorage.getItem(FIRED_KEY)||'{}')||{}}catch{return {}}
    }
    function saveFired(map){
      const cutoff=Date.now()-7*24*60*60*1000;
      for(const k of Object.keys(map))if((+map[k]||0)<cutoff)delete map[k];
      try{localStorage.setItem(FIRED_KEY,JSON.stringify(map))}catch{}
    }
    function alarmKey(r){return `${r.id}|${r.event_date}|${String(r.event_time||'').slice(0,5)}`}

    function getAudioContext(){
      if(audioCtx)return audioCtx;
      const AC=window.AudioContext||window.webkitAudioContext;
      if(!AC)return null;
      try{audioCtx=new AC();return audioCtx}catch{return null}
    }
    async function unlockAudio(){
      const ctx=getAudioContext();
      if(!ctx)return false;
      try{if(ctx.state==='suspended')await ctx.resume();return ctx.state==='running'}catch{return false}
    }
    function beep(freq=880,duration=.18,delay=0){
      const ctx=getAudioContext();
      if(!ctx||ctx.state!=='running')return;
      const start=ctx.currentTime+delay;
      const osc=ctx.createOscillator();
      const gain=ctx.createGain();
      osc.type='sine';osc.frequency.setValueAtTime(freq,start);
      gain.gain.setValueAtTime(.0001,start);
      gain.gain.exponentialRampToValueAtTime(.22,start+.015);
      gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.03);
    }
    function ringPattern(){
      beep(880,.18,0);beep(1100,.18,.23);beep(880,.18,.46);
      try{navigator.vibrate?.([250,120,250,120,500])}catch{}
    }
    function stopAlarm(){
      if(alarmTimer){clearInterval(alarmTimer);alarmTimer=null}
      if(stopTimer){clearTimeout(stopTimer);stopTimer=null}
      currentAlarmIds=[];
      overlay.classList.remove('show');
      try{navigator.vibrate?.(0)}catch{}
    }

    function showBrowserNotification(items){
      if(!('Notification' in window)||Notification.permission!=='granted')return;
      const body=items.map(r=>r.description+(r.supplier_name?` · ${r.supplier_name}`:'')).join('\n');
      try{
        const n=new Notification(items.length>1?`Varelia · ${items.length} recordatorios`:'Varelia · Recordatorio',{body,tag:'varelia-reminder-'+items.map(r=>r.id).join('-'),renotify:true,requireInteraction:true});
        n.onclick=()=>{window.focus();n.close();purchases.scrollIntoView({behavior:'smooth',block:'start'})};
      }catch{}
    }

    async function startAlarm(items){
      if(!items.length)return;
      stopAlarm();
      currentAlarmIds=items.map(r=>r.id);
      const ok=await unlockAudio();
      alarmText.textContent=items.map(r=>`${String(r.event_time||'').slice(0,5)} · ${r.description}${r.supplier_name?`\nProveedor: ${r.supplier_name}`:''}`).join('\n\n');
      overlay.classList.add('show');
      showBrowserNotification(items);
      if(ok){ringPattern();alarmTimer=setInterval(ringPattern,1800);stopTimer=setTimeout(stopAlarm,45000)}
      else status.textContent='Toca “Alarmas activadas” para permitir el sonido en este dispositivo.';
    }

    function scheduledAt(r){
      if(!r.event_date||!r.event_time)return null;
      const [y,m,d]=r.event_date.split('-').map(Number);
      const [hh,mm,ss]=String(r.event_time).split(':').map(Number);
      const dt=new Date(y,m-1,d,hh||0,mm||0,ss||0,0);
      return Number.isNaN(dt.getTime())?null:dt;
    }

    async function ensureSb(){
      if(sb)return sb;
      for(let i=0;i<60&&!window.vareliaSupabase;i++)await new Promise(r=>setTimeout(r,100));
      sb=window.vareliaSupabase||null;
      return sb;
    }

    async function checkDue(){
      if(!enabled||checking)return;
      checking=true;
      try{
        const client=await ensureSb();if(!client)return;
        const {data:{user}}=await client.auth.getUser();if(!user)return;
        const now=Date.now();
        const from=new Date(now-CATCHUP_MS);
        const fromDate=`${from.getFullYear()}-${String(from.getMonth()+1).padStart(2,'0')}-${String(from.getDate()).padStart(2,'0')}`;
        const {data,error}=await client.from('business_reminders').select('id,event_date,event_time,description,supplier_name,completed').eq('completed',false).gte('event_date',fromDate).order('event_date',{ascending:true}).order('event_time',{ascending:true,nullsFirst:false});
        if(error)throw error;
        const fired=getFired();
        const due=(data||[]).filter(r=>{
          const at=scheduledAt(r);if(!at)return false;
          const diff=now-at.getTime();
          return diff>=0&&diff<=CATCHUP_MS&&!fired[alarmKey(r)];
        });
        if(due.length){
          for(const r of due)fired[alarmKey(r)]=now;
          saveFired(fired);
          await startAlarm(due);
        }
      }catch(e){console.error('Varelia reminder alarm:',e)}
      finally{checking=false}
    }

    async function activate(){
      enabled=true;localStorage.setItem(ENABLE_KEY,'1');
      const audioOk=await unlockAudio();
      let notificationText='';
      if('Notification' in window){
        try{
          if(Notification.permission==='default')await Notification.requestPermission();
          notificationText=Notification.permission==='granted'?' y notificaciones':' (sin notificaciones del navegador)';
        }catch{}
      }
      enableBtn.textContent='✓ Alarmas activadas';
      enableBtn.classList.remove('primary');enableBtn.classList.add('secondary');
      status.textContent=audioOk?`Sonido activado${notificationText}.`:'Alarmas activadas. Toca la pantalla si el navegador bloquea el audio.';
      ringPattern();
      setTimeout(()=>{try{navigator.vibrate?.(0)}catch{}},900);
      checkDue();
    }

    enableBtn.addEventListener('click',activate);
    stopBtn.addEventListener('click',stopAlarm);
    overlay.addEventListener('click',e=>{if(e.target===overlay)stopAlarm()});
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkDue()});
    window.addEventListener('focus',checkDue);
    document.addEventListener('pointerdown',()=>{if(enabled)unlockAudio()},{once:true,capture:true});

    if(enabled){status.textContent='Alarmas activadas. Varelia revisará los recordatorios con hora.'}
    setTimeout(checkDue,2000);
    setInterval(checkDue,CHECK_MS);
  });
})();