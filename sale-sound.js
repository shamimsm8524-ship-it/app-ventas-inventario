(()=>{
  if(window.__vareliaSaleSoundV1)return;
  window.__vareliaSaleSoundV1=true;

  let ctx=null;
  let lastSale=0;

  function getCtx(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    try{ctx=new AC()}catch{return null}
    return ctx;
  }

  function resume(){
    const c=getCtx();
    if(c&&c.state==='suspended')c.resume().catch(()=>{});
  }

  function tone(freq,start,duration,volume=0.08,type='sine'){
    const c=getCtx();if(!c)return;
    const o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,c.currentTime+start);
    g.gain.setValueAtTime(0.0001,c.currentTime+start);
    g.gain.exponentialRampToValueAtTime(volume,c.currentTime+start+0.008);
    g.gain.exponentialRampToValueAtTime(0.0001,c.currentTime+start+duration);
    o.connect(g);g.connect(c.destination);
    o.start(c.currentTime+start);o.stop(c.currentTime+start+duration+0.03);
  }

  function cashClick(){
    const c=getCtx();if(!c)return;
    const len=Math.max(1,Math.floor(c.sampleRate*0.045));
    const buffer=c.createBuffer(1,len,c.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,5);
    const src=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
    src.buffer=buffer;f.type='highpass';f.frequency.value=1500;g.gain.value=0.12;
    src.connect(f);f.connect(g);g.connect(c.destination);src.start();
  }

  function sale(){
    const now=Date.now();
    if(now-lastSale<1200)return;
    lastSale=now;
    resume();
    setTimeout(()=>{
      cashClick();
      tone(1046.5,0.02,0.18,0.075,'sine');
      tone(1318.5,0.10,0.20,0.07,'sine');
      tone(1568.0,0.18,0.34,0.085,'sine');
      tone(2093.0,0.21,0.30,0.035,'triangle');
    },0);
  }

  function click(){
    resume();
    tone(660,0,0.045,0.018,'sine');
  }

  function add(){
    resume();
    tone(880,0,0.07,0.025,'sine');
  }

  function error(){
    resume();
    tone(220,0,0.13,0.04,'square');
    tone(180,0.12,0.16,0.035,'square');
  }

  window.vareliaSound=(kind)=>{
    if(kind==='sale')return sale();
    if(kind==='click')return click();
    if(kind==='error')return error();
    return add();
  };

  document.addEventListener('pointerdown',resume,{passive:true});
  document.addEventListener('keydown',resume,{passive:true});
})();