(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function build(payload,image){
    const o={...payload.options},qty=Number(payload.qty),p=payload.product||{},code=String(p.barcode||'');
    const allowed=['a4','letter','roll58','roll80','rollCustom'];
    if(!allowed.includes(o.paper)||![o.width,o.height,o.margin,o.gap,o.paperWidth,o.paperHeight,o.columns].every(Number.isFinite)||o.width<30||o.width>200||o.height<20||o.height>150||o.margin<0||o.margin>30||o.gap<0||o.gap>20||o.paperWidth<30||o.paperWidth>216||o.paperHeight<20||o.paperHeight>297||!Number.isInteger(qty)||qty<1||qty>200||!Number.isInteger(o.columns)||o.columns<1||o.columns>8||!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(image))throw Error('Formato de etiquetas inválido. Vuelve a elegir las medidas en Varelia.');
    o.roll=o.paper.startsWith('roll');
    if(o.width+2*o.margin>o.paperWidth||o.columns*o.width+(o.columns-1)*o.gap+2*o.margin>o.paperWidth)throw Error('Las etiquetas no caben en el papel seleccionado.');
    const imageHeight=Math.max(9,Math.min(20,o.height*.46)),font=o.height<=22?8:10;
const css='@page{size:'+(o.roll?(o.paperWidth+'mm '+o.height+'mm'):(o.paper==='letter'?'letter':'A4'))+';margin:'+o.margin+'mm}*{box-sizing:border-box}html,body{margin:0;padding:0;height:auto!important;min-height:0!important;background:white;color:black;font-family:Arial,sans-serif}.labels{display:grid;grid-template-columns:repeat('+o.columns+','+o.width+'mm);grid-auto-rows:'+o.height+'mm;gap:'+o.gap+'mm;align-content:start;justify-content:start}.label{width:'+o.width+'mm;height:'+o.height+'mm;overflow:hidden;break-inside:avoid;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1mm;border:1px dashed #ccc}.name{max-width:100%;font-size:'+font+'pt;line-height:1.1;text-align:center;overflow:hidden;max-height:'+Math.max(4,o.height*.24)+'mm}.label img{display:block;width:'+(o.width-4)+'mm;height:'+imageHeight+'mm;object-fit:contain;flex:0 0 '+imageHeight+'mm}.price{font-size:'+(font+1)+'pt;line-height:1.1}@media screen{body{padding:12px}.labels{grid-template-columns:repeat(auto-fit,'+o.width+'mm)}}@media print{.label{border:0}'+(o.roll?'.labels{display:block;width:'+o.paperWidth+'mm}.label{margin:0 auto;break-after:page;page-break-after:always}.label:last-child{break-after:auto;page-break-after:auto}':'')+'}';
    const label='<section class="label"><b class="name">'+esc(p.name||'Producto')+'</b><img alt="'+esc(code)+'" src="'+image+'"><b class="price">S/ '+Math.max(0,Number(p.price)||0).toFixed(2)+'</b></section>';
    const body='<main class="labels">'+label.repeat(qty)+'</main>';
    const html='<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Etiquetas de código de barras</title><style>'+css+'</style></head><body>'+body+'</body></html>';
    return {css,body,html};
  }
  window.VareliaLabelLayout={build};
})();
