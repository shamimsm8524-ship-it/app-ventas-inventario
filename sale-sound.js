(()=>{
  if(window.__vareliaSaleSoundV2)return;
  window.__vareliaSaleSoundV2=true;

  let ctx=null;
  let lastSale=0;

  function getCtx(){
    if(ctx)return ctx;
    const AC=window.AudioContext||window.webkitAudioContext;
    if(!AC)return null;
    try{ctx=new AC()}catch{return null}
    return ctx;
  }

  async function resume(){
    const c=getCtx();
    if(!c)return null;
    if(c.state!=='running'){
      try{await c.resume()}catch{}
    }
    return c.state==='running'?c:null;
  }

  function tone(c,freq,start,duration,volume=0.11,type='sine'){
    if(!c||c.state!=='running')return;
    try{
      const o=c.createOscillator(),g=c.createGain(),at=c.currentTime+start;
      o.type=type;
      o.frequency.setValueAtTime(freq,at);
      g.gain.setValueAtTime(0.0001,at);
      g.gain.exponentialRampToValueAtTime(volume,at+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,at+duration);
      o.connect(g);g.connect(c.destination);
      o.start(at);o.stop(at+duration+0.03);
    }catch(e){console.warn('Varelia audio tone',e)}
  }

  function cashClick(c){
    if(!c||c.state!=='running')return;
    try{
      const len=Math.max(1,Math.floor(c.sampleRate*0.045));
      const buffer=c.createBuffer(1,len,c.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<len;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/len,5);
      const src=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
      src.buffer=buffer;f.type='highpass';f.frequency.value=1300;g.gain.value=0.16;
      src.connect(f);f.connect(g);g.connect(c.destination);src.start();
    }catch(e){console.warn('Varelia cash audio',e)}
  }

  async function sale(){
    const now=Date.now();
    if(now-lastSale<1200)return;
    lastSale=now;
    const c=await resume();
    if(!c)return;
    cashClick(c);
    tone(c,1046.5,0.02,0.18,0.12,'sine');
    tone(c,1318.5,0.10,0.20,0.11,'sine');
    tone(c,1568.0,0.18,0.34,0.13,'sine');
    tone(c,2093.0,0.21,0.30,0.055,'triangle');
  }

  async function click(){
    const c=await resume();
    if(c)tone(c,660,0,0.07,0.10,'sine');
  }

  async function add(){
    const c=await resume();
    if(c)tone(c,880,0,0.09,0.12,'sine');
  }

  async function error(){
    const c=await resume();
    if(!c)return;
    tone(c,220,0,0.13,0.10,'square');
    tone(c,180,0.13,0.16,0.085,'square');
  }

  window.vareliaSound=(kind)=>{
    if(kind==='sale')return sale();
    if(kind==='click')return click();
    if(kind==='error')return error();
    return add();
  };

  // Desbloquea el AudioContext dentro del gesto fisico del usuario.
  const unlock=()=>{void resume()};
  document.addEventListener('pointerdown',unlock,{capture:true,passive:true});
  document.addEventListener('touchstart',unlock,{capture:true,passive:true});
  document.addEventListener('keydown',unlock,{capture:true,passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)unlock()});
})();