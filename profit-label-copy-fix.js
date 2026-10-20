(()=>{
  if(window.__vareliaProfitLabelCopyFixV1)return;
  window.__vareliaProfitLabelCopyFixV1=true;

  function apply(){
    document.querySelectorAll('[data-gain-per-product] article').forEach(card=>{
      card.querySelectorAll('div,span,small,label').forEach(el=>{
        if(el.children.length===0&&String(el.textContent||'').trim()==='Costo total de compra'){
          el.textContent='Costo de lo vendido';
        }
      });
    });
  }

  let timer=0;
  const schedule=()=>{clearTimeout(timer);timer=setTimeout(apply,40)};
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('button')||/Ganancias/i.test(String(e.target?.textContent||'')))schedule();
  },true);
  schedule();
})();
