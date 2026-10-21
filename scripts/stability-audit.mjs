import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const exists=p=>fs.existsSync(path.join(root,p));
const errors=[];
const warnings=[];

const critical=[
  'index.html','central-stock-sync.js','pos-sales.js','pos-receipt.js','video-features.js',
  'reports-profit.js','sale-sound.js','medicine-stock-count-fix.js',
  'medicine-sale-unit-server-fix.js','medicine-purchase-costs.js',
  'medicine-purchase-save-fix.js','medicine-price-layout.js','advanced-pricing.js','sw.js'
];
for(const file of critical)if(!exists(file))errors.push(`Falta archivo crítico: ${file}`);

const index=read('index.html');
const scriptRefs=[...index.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map(m=>m[1])
  .filter(src=>!/^https?:\/\//i.test(src))
  .map(src=>src.split('?')[0].replace(/^\//,''));

const counts=new Map();
for(const ref of scriptRefs){
  counts.set(ref,(counts.get(ref)||0)+1);
  if(!exists(ref))errors.push(`index.html carga un script inexistente: ${ref}`);
}
for(const [ref,count] of counts)if(count>1)warnings.push(`Script cargado ${count} veces en index.html: ${ref}`);

const sw=read('sw.js');
const swHelpers=[...sw.matchAll(/fetch\(['"]\/([^'"]+\.js)(?:\?[^'"]*)?['"]/g)].map(m=>m[1]);
for(const ref of new Set(swHelpers))if(!exists(ref))errors.push(`sw.js intenta cargar un helper inexistente: ${ref}`);

const unitFix=read('medicine-sale-unit-server-fix.js');
if(/setTimeout\(\(\)=>\{[\s\S]{0,500}medicineSaleUnit[\s\S]{0,500}\},\s*50\s*\)/.test(unitFix)){
  errors.push('La unidad de medicamento vuelve a restaurarse a los 50 ms: la RPC asíncrona puede recibir la presentación incorrecta.');
}
if(!unitFix.includes('varelia:sale-recorded'))errors.push('El normalizador de presentaciones no espera a que termine la venta para restaurar el carrito.');

const videoFeatures=read('video-features.js');
if(/const\s+bottom\s*=\s*pos\.querySelector\(['"]\.vposPaymentBar['"]\);\s*const\s+box\s*=/.test(videoFeatures)){
  errors.push('video-features.js usa .vposPaymentBar sin comprobar que exista; esto provoca insertAdjacentElement sobre null durante el arranque.');
}
if(!/const\s+bottom\s*=\s*pos\.querySelector\(['"]\.vposPaymentBar['"]\);\s*if\(!bottom\)return false;/.test(videoFeatures)){
  errors.push('Falta el guard de arranque para .vposPaymentBar en video-features.js.');
}


const advanced=read('advanced-pricing.js');
if(!scriptRefs.includes('advanced-pricing.js'))errors.push('index.html no carga advanced-pricing.js.');
if(!advanced.includes('VareliaAdvancedPricing'))errors.push('advanced-pricing.js no expone el motor de precios por cantidad.');
const central=read('central-stock-sync.js');
if(!central.includes('VARELIA_ADV_PRICING_V1'))errors.push('central-stock-sync.js no conserva la configuración de docena/mayorista/promoción en la nube.');
if(index.includes("p.stock = Math.max(0, before - i.qty);"))errors.push('El checkout local aún descuenta presentaciones en vez de unidades reales de stock.');

const profit=read('reports-profit.js');
if(!profit.includes('presentationSale')||!profit.includes('costQty')||!profit.includes('sale_presentation_id')) errors.push('reports-profit.js no distingue presentación vendida de unidades de stock para calcular ganancias.'); // presentation profit accounting
if(profit.includes('const qty=Number.isFinite(stockNumber)?stockNumber')){
  warnings.push('reports-profit.js aún contiene compatibilidad antigua con stock_qty; el corrector de medicamentos debe permanecer activo hasta migrarlo al núcleo.');
}

const oldAmpicilinaRuntime=scriptRefs.filter(x=>/ampicilina-(?:recovery|price-repair)\.js/i.test(x));
if(oldAmpicilinaRuntime.length)errors.push(`No se deben cargar reparadores específicos de Ampicilina en producción: ${oldAmpicilinaRuntime.join(', ')}`);

if(warnings.length){
  console.log('\nADVERTENCIAS:');
  for(const w of warnings)console.log(' - '+w);
}
if(errors.length){
  console.error('\nERRORES DE INTEGRIDAD:');
  for(const e of errors)console.error(' - '+e);
  process.exit(1);
}
console.log(`\nVarelia stability audit OK: ${scriptRefs.length} scripts locales verificados, ${critical.length} módulos críticos presentes.`);
