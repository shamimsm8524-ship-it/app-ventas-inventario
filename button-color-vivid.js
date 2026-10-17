(()=>{
  if(window.__vareliaButtonColorVividV2)return;
  window.__vareliaButtonColorVividV2=true;

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
    hsl.s=Math.max(hsl.s,96);
    hsl.l=clamp(hsl.l,30,42);
    const out=hslToRgb(hsl.h,hsl.s,hsl.l);
    return rgbToHex(out.r,out.g,out.b);
  }

  function darker(hex){
    const rgb=hexToRgb(hex);
    const hsl=rgbToHsl(rgb.r,rgb.g,rgb.b);
    hsl.l=clamp(hsl.l-8,22,34);
    const out=hslToRgb(hsl.h,100,hsl.l);
    return rgbToHex(out.r,out.g,out.b);
  }

  function selected(){
    let c=String(document.getElementById('customColor')?.value||'').trim();
    if(c&&!c.startsWith('#'))c='#'+c;
    if(!valid(c)){try{c=localStorage.getItem('varelia_action_button_color_v3')||''}catch{}}
    return valid(c)?c.toLowerCase():null;
  }

  function apply(){
    const raw=selected();if(!raw)return;
    const c=vivid(raw);if(!c)return;const c2=darker(c);
    const root=document.documentElement;
    root.style.setProperty('--varelia-action',c,'important');
    root.style.setProperty('--varelia-action-2',c2,'important');
    let style=document.getElementById('vareliaButtonColorVividCss');
    if(!style){style=document.createElement('style');style.id='vareliaButtonColorVividCss';document.head.appendChild(style)}
    style.textContent=`
      html body button.primary,html body .btn.primary,html body .primary,
      html body #newProduct,html body #inventoryNewProduct,html body #newSaleTop,html body #newSaleFab,
      html body #businessBrandSave,html body #vposCheckout,html body #checkout,html body #applyCustomColor,html body .vcsOk,
      html body .chip.active,html body .segmented button.active,
      html body #vmobileNav button.active,html body .vmobileNav button.active,html body .mobileNav button.active{
        background-color:${c}!important;
        background-image:linear-gradient(135deg,${c},${c2})!important;
        border-color:${c}!important;
        color:#fff!important;
      }
    `;
    const a=document.getElementById('hexPreview');if(a)a.style.background=c;
    const b=document.getElementById('colorBigPreview');if(b)b.style.background=c;
  }

  function delayedApply(){apply();setTimeout(apply,20);setTimeout(apply,80)}
  function wire(){
    const input=document.getElementById('customColor'),wheel=document.getElementById('colorWheel'),slider=document.getElementById('lightSlider');
    if(input&&!input.dataset.vareliaVivid2){input.dataset.vareliaVivid2='1';input.addEventListener('input',delayedApply);input.addEventListener('change',delayedApply)}
    if(wheel&&!wheel.dataset.vareliaVivid2){wheel.dataset.vareliaVivid2='1';wheel.addEventListener('pointerdown',delayedApply);wheel.addEventListener('pointermove',delayedApply);wheel.addEventListener('pointerup',delayedApply);wheel.addEventListener('pointercancel',delayedApply)}
    if(slider&&!slider.dataset.vareliaVivid2){slider.dataset.vareliaVivid2='1';slider.addEventListener('input',delayedApply);slider.addEventListener('change',delayedApply)}
    apply();
  }

  const boot=()=>{wire();delayedApply()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  document.addEventListener('click',e=>{if(e.target?.closest?.('[data-view="appearance"],button'))setTimeout(()=>{wire();delayedApply()},0)},true);
  new MutationObserver(()=>setTimeout(wire,0)).observe(document.documentElement,{childList:true,subtree:true});
  setInterval(()=>{if(document.getElementById('appearance')?.classList.contains('active'))apply()},180);
})();

(()=>{
  if(document.querySelector('script[data-varelia-ampicilina-recovery-v2]'))return;
  const s=document.createElement('script');
  s.src='/ampicilina-recovery.js?v=20261016-v2';
  s.async=false;
  s.dataset.vareliaAmpicilinaRecoveryV2='1';
  document.head.appendChild(s);
})();

// Conteo y guardado correcto de medicamentos. v3 fuerza descarga nueva en Android/WebView.
(()=>{
  if(document.querySelector('script[data-varelia-medicine-stock-count-fix-v3]'))return;
  const s=document.createElement('script');
  s.src='/medicine-stock-count-fix.js?v=20261016-v3';
  s.async=false;
  s.dataset.vareliaMedicineStockCountFixV3='1';
  document.head.appendChild(s);
})();
