(()=>{
  if(window.__vareliaButtonColorVividV1)return;
  window.__vareliaButtonColorVividV1=true;

  const valid=hex=>/^#[0-9a-f]{6}$/i.test(String(hex||'').trim());
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  function hexToRgb(hex){
    const n=parseInt(hex.slice(1),16);
    return {r:(n>>16)&255,g:(n>>8)&255,b:n&255};
  }

  function rgbToHex(r,g,b){
    return '#'+((clamp(Math.round(r),0,255)<<16)|(clamp(Math.round(g),0,255)<<8)|clamp(Math.round(b),0,255)).toString(16).padStart(6,'0');
  }

  function rgbToHsl(r,g,b){
    r/=255;g/=255;b/=255;
    const max=Math.max(r,g,b),min=Math.min(r,g,b);
    let h=0,s=0;
    const l=(max+min)/2;
    if(max!==min){
      const d=max-min;
      s=l>.5?d/(2-max-min):d/(max+min);
      switch(max){
        case r:h=(g-b)/d+(g<b?6:0);break;
        case g:h=(b-r)/d+2;break;
        default:h=(r-g)/d+4;
      }
      h/=6;
    }
    return {h:h*360,s:s*100,l:l*100};
  }

  function hslToRgb(h,s,l){
    h=((h%360)+360)%360/360;s=clamp(s,0,100)/100;l=clamp(l,0,100)/100;
    if(s===0){const v=l*255;return {r:v,g:v,b:v}}
    const q=l<.5?l*(1+s):l+s-l*s;
    const p=2*l-q;
    const hue=t=>{
      if(t<0)t+=1;if(t>1)t-=1;
      if(t<1/6)return p+(q-p)*6*t;
      if(t<1/2)return q;
      if(t<2/3)return p+(q-p)*(2/3-t)*6;
      return p;
    };
    return {r:hue(h+1/3)*255,g:hue(h)*255,b:hue(h-1/3)*255};
  }

  function vivid(hex){
    if(!valid(hex))return null;
    const rgb=hexToRgb(hex);
    const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    // Conservar el tono escogido, pero evitar colores lavados o demasiado claros.
    hsl.s=Math.max(hsl.s,82);
    hsl.l=clamp(hsl.l,34,50);
    const out=hslToRgb(hsl.h,hsl.s,hsl.l);
    return rgbToHex(out.r,out.g,out.b);
  }

  function darker(hex){
    const rgb=hexToRgb(hex);
    const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    hsl.l=clamp(hsl.l-10,24,42);
    const out=hslToRgb(hsl.h,Math.max(hsl.s,84),hsl.l);
    return rgbToHex(out.r,out.g,out.b);
  }

  function selected(){
    let c=String(document.getElementById('customColor')?.value||'').trim();
    if(c&&!c.startsWith('#'))c='#'+c;
    if(!valid(c)){
      try{c=localStorage.getItem('varelia_action_button_color_v3')||''}catch{}
    }
    return valid(c)?c.toLowerCase():null;
  }

  function apply(){
    const raw=selected();
    if(!raw)return;
    const c=vivid(raw);if(!c)return;
    const root=document.documentElement;
    root.style.setProperty('--varelia-action',c);
    root.style.setProperty('--varelia-action-2',darker(c));
    const a=document.getElementById('hexPreview');if(a)a.style.background=c;
    const b=document.getElementById('colorBigPreview');if(b)b.style.background=c;
  }

  function wire(){
    const input=document.getElementById('customColor');
    const wheel=document.getElementById('colorWheel');
    const slider=document.getElementById('lightSlider');
    if(input&&!input.dataset.vareliaVivid){
      input.dataset.vareliaVivid='1';
      input.addEventListener('input',()=>setTimeout(apply,0));
      input.addEventListener('change',()=>setTimeout(apply,0));
    }
    if(wheel&&!wheel.dataset.vareliaVivid){
      wheel.dataset.vareliaVivid='1';
      wheel.addEventListener('pointerdown',()=>setTimeout(apply,0));
      wheel.addEventListener('pointermove',()=>setTimeout(apply,0));
      wheel.addEventListener('pointerup',()=>setTimeout(apply,0));
    }
    if(slider&&!slider.dataset.vareliaVivid){
      slider.dataset.vareliaVivid='1';
      slider.addEventListener('input',()=>setTimeout(apply,0));
      slider.addEventListener('change',()=>setTimeout(apply,0));
    }
    apply();
  }

  const boot=()=>{wire();apply()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('[data-view="appearance"],button'))setTimeout(wire,0);
  },true);
  new MutationObserver(()=>setTimeout(wire,0)).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(document.getElementById('appearance')?.classList.contains('active'))apply()},350);
})();
