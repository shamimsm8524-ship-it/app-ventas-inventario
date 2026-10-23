(()=>{
  function unitCost(total,quantity){
    const cost=Number(total),count=Number(quantity);
    if(!Number.isFinite(cost)||cost<0)throw new Error('El costo debe ser un número mayor o igual a cero.');
    if(!Number.isFinite(count)||count<=0)throw new Error('La cantidad de compra debe ser mayor que cero.');
    return cost/count;
  }
  function stockFromPackages(packages,unitsPerPackage){
    const count=Number(packages),size=Number(unitsPerPackage);
    if(!Number.isFinite(count)||count<0)throw new Error('La cantidad de cajas debe ser mayor o igual a cero.');
    if(!Number.isFinite(size)||size<=0)throw new Error('Indica cuántas unidades trae cada caja.');
    return Number((count*size).toFixed(6));
  }
  const api={unitCost,stockFromPackages};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.VareliaPurchaseMath=api;
})();
