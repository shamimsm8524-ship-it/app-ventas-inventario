(()=>{
  function unitCost(total,quantity){
    const cost=Number(total),count=Number(quantity);
    if(!Number.isFinite(cost)||cost<0)throw new Error('El costo debe ser un número mayor o igual a cero.');
    if(!Number.isFinite(count)||count<=0)throw new Error('La cantidad de compra debe ser mayor que cero.');
    return cost/count;
  }
  const api={unitCost};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.VareliaPurchaseMath=api;
})();
