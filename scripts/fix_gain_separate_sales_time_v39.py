from pathlib import Path
import re

# Patch estrictamente el detalle visual de Ganancias:
# - no agrupar ventas distintas del mismo producto/presentación
# - mostrar la hora de cada venta
# Los totales, costos, stock, POS y comprobantes no se modifican.

p = Path('reports-profit.js')
s = p.read_text(encoding='utf-8')

anchor = """    return {revenue,cost,count:salesList.length,estimated,missing,unallocated,list};
  }
  function gainPeriodTotals(salesList){"""
insert = """    return {revenue,cost,count:salesList.length,estimated,missing,unallocated,list};
  }
  // Detalle de Ganancias por venta real. Mantiene la misma lógica de costo/precio
  // de gainItemData, pero no suma transacciones distintas entre sí.
  function gainSaleDetailLines(salesList){
    const products=arr('products'),lines=[];
    for(const sale of salesList){
      const items=(Array.isArray(sale.items)?sale.items:[]).map(it=>gainItemData(it,products));
      if(!items.length)continue;
      const total=Number(sale.total)||0;
      const preTotal=items.reduce((sum,it)=>sum+(Number.isFinite(it.subtotal)?Math.max(0,it.subtotal):0),0);
      const date=new Date(sale.date??sale.created_at??sale.createdAt??'');
      const saleTs=Number.isFinite(date.getTime())?date.getTime():0;
      const saleTime=saleTs?date.toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit',hour12:false}):'Sin hora';
      items.forEach((it,itemIndex)=>{
        const quantity=Number.isFinite(it.qty)?it.qty:0;
        let lineRevenue=NaN;
        if(preTotal>0&&Number.isFinite(it.subtotal))lineRevenue=total*Math.max(0,it.subtotal)/preTotal;
        else if(items.length===1)lineRevenue=total;
        const hasCost=Number.isFinite(it.costQty)&&Number.isFinite(it.buy);
        const lineCost=hasCost?it.costQty*it.buy:NaN;
        const reportSell=Number.isFinite(lineRevenue)&&quantity>0
          ?lineRevenue/quantity
          :(Number.isFinite(it.subtotal)&&quantity>0?it.subtotal/quantity:it.sell);
        const hasSell=Number.isFinite(reportSell)&&quantity>0;
        let missing=0;
        if(!Number.isFinite(lineRevenue))missing++;
        if(!hasCost)missing++;
        if(!hasSell)missing++;
        lines.push({
          name:it.name,unit:it.unit,qty:quantity,
          cost:hasCost?lineCost:0,revenue:Number.isFinite(lineRevenue)?lineRevenue:0,
          buyWeighted:hasCost?lineCost:0,buyQty:hasCost?it.costQty:0,
          sellWeighted:hasSell?reportSell*quantity:0,sellQty:hasSell?quantity:0,
          minBuy:hasCost?it.buy:Infinity,maxBuy:hasCost?it.buy:-Infinity,
          minSell:hasSell?reportSell:Infinity,maxSell:hasSell?reportSell:-Infinity,
          estimated:it.estimated?1:0,missing,saleTime,saleTs,itemIndex
        });
      });
    }
    return lines.sort((a,b)=>b.saleTs-a.saleTs||a.itemIndex-b.itemIndex);
  }
  function gainPeriodTotals(salesList){"""
if anchor not in s:
    if 'function gainSaleDetailLines(' not in s:
        raise SystemExit('reports-profit: summary anchor not found; refusing broad edit')
else:
    s = s.replace(anchor, insert, 1)

old = """        const result=gainProductSummary(periodSales);
        const complete=result.missing===0;"""
new = """        const result=gainProductSummary(periodSales);
        const saleLines=gainSaleDetailLines(periodSales);
        const complete=result.missing===0;"""
if old in s:
    s = s.replace(old, new, 1)
elif 'const saleLines=gainSaleDetailLines(periodSales);' not in s:
    raise SystemExit('reports-profit: draw summary anchor not found; refusing broad edit')

old = """        if(!result.list.length){"""
new = """        if(!saleLines.length){"""
if old in s:
    s = s.replace(old, new, 1)
elif 'if(!saleLines.length){' not in s:
    raise SystemExit('reports-profit: empty-detail anchor not found; refusing broad edit')

old = """        for(const item of result.list){
          const card=document.createElement('article');
          card.style.cssText='border:1px solid #ddd;border-radius:17px;padding:13px;min-width:0;box-sizing:border-box;';
          const name=document.createElement('h4');name.textContent=item.name;
          name.style.cssText='font-size:15px;margin:0 0 11px;font-weight:900;overflow-wrap:anywhere;';
          const grid=document.createElement('div');"""
new = """        for(const item of saleLines){
          const card=document.createElement('article');
          card.style.cssText='border:1px solid #ddd;border-radius:17px;padding:13px;min-width:0;box-sizing:border-box;';
          const name=document.createElement('h4');name.textContent=item.name;
          name.style.cssText='font-size:15px;margin:0 0 4px;font-weight:900;overflow-wrap:anywhere;';
          const time=document.createElement('div');time.textContent='Hora de venta: '+item.saleTime;
          time.style.cssText='font-size:11px;color:#64748b;font-weight:700;margin:0 0 11px;';
          const grid=document.createElement('div');"""
if old in s:
    s = s.replace(old, new, 1)
elif "for(const item of saleLines){" not in s:
    raise SystemExit('reports-profit: detail loop anchor not found; refusing broad edit')

old = """          card.append(name,grid);"""
new = """          card.append(name,time,grid);"""
if old in s:
    s = s.replace(old, new, 1)
elif 'card.append(name,time,grid);' not in s:
    raise SystemExit('reports-profit: detail card append anchor not found; refusing broad edit')

p.write_text(s, encoding='utf-8')

idx = Path('index.html')
h = idx.read_text(encoding='utf-8')
h, n = re.subn(r"const BUILD='[^']+'", "const BUILD='20261022-GAIN-SEPARATE-SALES-V39'", h, count=1)
if n != 1:
    raise SystemExit('index: build marker not found')
h, n = re.subn(r'reports-profit\.js\?v=[^\"\']+', 'reports-profit.js?v=20261022-gain-separate-sales-v39', h, count=1)
if n != 1:
    raise SystemExit('index: reports-profit script marker not found')
idx.write_text(h, encoding='utf-8')
