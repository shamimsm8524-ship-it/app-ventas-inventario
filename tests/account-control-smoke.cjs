const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
 await page.setContent('<main class="content"><section id="mobileAdminHub"><div class="vmobileHubGrid"></div></section></main>');
 await page.evaluate(()=>{
  window.__context={principal:true,status:'active',allowed:true,approval_enabled:false,email_ready:false};window.__calls=[];
  window.__rows=[{id:'principal',email:'primary@example.test',name:'Principal',role:'owner',business_id:'b0',business_name:'Principal',principal:true,status:'active',confirmed:true},{id:'owner',email:'owner@example.test',name:'Afiliado',role:'owner',business_id:'b1',business_name:'Tienda Uno',status:'active',confirmed:true},{id:'staff',email:'staff@example.test',name:'<img src=x onerror="alert(1)">',role:'cashier',business_id:'b1',business_name:'Tienda Uno',status:'active',confirmed:true}];
  window.vareliaSupabase={auth:{onAuthStateChange(fn){window.__authChange=fn}},async rpc(name){if(name==='varelia_access_context')return {data:window.__context,error:null};if(name==='varelia_control_accounts')return {data:{accounts:JSON.parse(JSON.stringify(window.__rows)),activity:[]},error:null};throw Error('Unexpected RPC')},functions:{async invoke(name,{body}){window.__calls.push(body);if(body.action==='access')window.__rows.find(r=>r.id===body.userId).status=body.status;return {data:{ok:true,message:'Invitación enviada'},error:null}}}};
  window.vareliaSignOut=()=>window.__authChange('SIGNED_OUT');
 });
 await page.addScriptTag({path:path.resolve(__dirname,'../account-control.js')});
 await page.locator('#vareliaControlEntry').click();await page.locator('[data-ac-account="staff"]').waitFor();
 assert.equal(await page.locator('.acBusiness').count(),2);assert.equal(await page.locator('[data-ac-account="principal"] .acActions').count(),0);
 assert.equal(await page.locator('#acAccounts img').count(),0);assert.match(await page.locator('#acApprovalNotice').innerText(),/todavía no requieren/);
 await page.locator('#acSearch').fill('staff@example.test');assert.equal(await page.locator('.acAccount').count(),1);assert.match(await page.locator('.acBusiness').innerText(),/Administrador: owner@example.test/);
 page.on('dialog',d=>d.accept());await page.locator('[data-ac-access="blocked"]').click();
 await page.waitForFunction(()=>document.getElementById('acStatus').textContent==='Acceso actualizado.');
 assert.equal(await page.evaluate(()=>window.__calls.length),1);assert.equal(await page.evaluate(()=>window.__rows.find(r=>r.id==='staff').status),'blocked');
 await page.locator('[data-ac-access="reauthorize"]').click();assert.match(await page.locator('#acStatus').innerText(),/continúa bloqueada/);assert.equal(await page.evaluate(()=>window.__calls.length),1);
 await page.locator('[data-ac-access="removed"]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='staff').status==='removed');
 await page.locator('#acFilter').selectOption('removed');await page.locator('[data-ac-account="staff"]').waitFor();
 console.log('PASS: primary panel groups affiliated owners and sellers, escapes names, blocks/removes access, and cannot bypass code requirement for reactivation');
 await page.locator('#acSearch').fill('');await page.locator('#acInviteDetails summary').click();
 await page.locator('#acInviteForm [name=name]').fill('Nuevo vendedor');await page.locator('#acInviteForm [name=email]').fill('new@example.test');
 await page.locator('#acInviteForm [name=role]').selectOption('cashier');await page.locator('#acBusinessSelect').selectOption('b1');await page.locator('#acInviteForm [type=submit]').click();
 await page.waitForFunction(()=>window.__calls.some(c=>c.action==='invite'));
 const invitation=await page.evaluate(()=>window.__calls.find(c=>c.action==='invite'));assert.equal(invitation.role,'cashier');assert.equal(invitation.businessId,'b1');
 await page.evaluate(()=>window.__authChange('SIGNED_OUT'));assert.equal(await page.locator('#vareliaControlEntry').count(),0);assert.equal(await page.locator('#vareliaAccountControl').evaluate(d=>d.open),false);assert.equal(await page.locator('#acAccounts').innerText(),'');
 await page.evaluate(()=>{window.__context={principal:false,status:'blocked',allowed:false};window.dispatchEvent(new Event('focus'))});
 await page.locator('#vareliaAccountAccessGate').waitFor({state:'visible'});assert.equal(await page.locator('#vareliaControlEntry').count(),0);
 await page.locator('#vareliaAccountAccessGate button').click();assert.equal(await page.locator('#vareliaAccountAccessGate').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: invitation records correct business; logout clears global account data; non-principal has no panel and blocked account sees access gate');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
