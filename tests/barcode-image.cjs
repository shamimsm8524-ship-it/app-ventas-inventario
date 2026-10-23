const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage();await page.setContent('<div id="reader"></div>');
 await page.addScriptTag({path:'/tmp/varelia-browser/node_modules/html5-qrcode/html5-qrcode.min.js'});
 const result=await page.evaluate(async()=>{
  const code='7750670313537',L=['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'],G=['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'],parity=['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
  let bars='101';for(let i=1;i<=6;i++)bars+=(parity[+code[0]][i-1]==='L'?L:G)[+code[i]];bars+='01010';for(let i=7;i<13;i++)bars+=L[+code[i]].replace(/[01]/g,x=>x==='0'?'1':'0');bars+='101';
  const c=document.createElement('canvas');c.width=460;c.height=260;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='black';[...bars].forEach((b,i)=>{if(b==='1')ctx.fillRect(40+i*4,25,4,200)});
  const blob=await new Promise(r=>c.toBlob(r,'image/png'));
  const scanner=new Html5Qrcode('reader',{formatsToSupport:[Html5QrcodeSupportedFormats.EAN_13],verbose:false});
  return await scanner.scanFile(new File([blob],'ean13.png',{type:'image/png'}),false);
 });assert.equal(result,'7750670313537');console.log('PASS: actual image decoder reads bottle EAN-13 7750670313537 from generated barcode image');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
