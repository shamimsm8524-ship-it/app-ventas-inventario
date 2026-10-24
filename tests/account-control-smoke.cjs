const assert=require('node:assert/strict'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});try{
  const page=await browser.newPage({viewport:{width:393,height:852},isMobile:true,hasTouch:true});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent('<main class="content"><section id="mobileAdminHub"><div class="vmobileHubGrid"></div></section></main>');
  await page.evaluate(()=>{
   const old=new Date(Date.now()-40*86400000).toISOString(),due=new Date(Date.now()-2*86400000).toISOString();
   window.__context={principal:true,status:'active',allowed:true,approval_enabled:true,email_ready:false,approval_channel:'panel'};window.__calls=[];
   window.__rows=[
    {id:'principal',email:'primary@example.test',name:'Principal',role:'owner',business_id:'b0',business_name:'Principal',principal:true,status:'active',confirmed:true,created_at:old},
    {id:'owner',email:'owner@example.test',name:'Afiliado',role:'owner',business_id:'b1',business_name:'Tienda Uno',status:'active',confirmed:true,created_at:old,affiliated_at:old,next_due_at:due},
    {id:'staff',email:'staff@example.test',name:'<img src=x onerror="alert(1)">',role:'cashier',business_id:'b1',business_name:'Tienda Uno',status:'active',confirmed:true,created_at:old},
    {id:'pending',email:'pending@example.test',name:'Nuevo',role:'owner',business_id:'b2',business_name:'Tienda Dos',status:'pending',confirmed:true,created_at:new Date().toISOString(),affiliated_at:new Date().toISOString(),next_due_at:new Date(Date.now()+30*86400000).toISOString(),approval_code:'123456',approval_expires_at:new Date(Date.now()+3600000).toISOString()}
   ];
   window.vareliaSupabase={auth:{onAuthStateChange(fn){window.__authChange=fn}},async rpc(name,args){
    if(name==='varelia_access_context')return {data:window.__context,error:null};
    if(name==='varelia_control_accounts')return {data:{context:window.__context,accounts:JSON.parse(JSON.stringify(window.__rows)),activity:[]},error:null};
    if(name==='varelia_control_mark_paid'){
     const row=window.__rows.find(r=>r.id===args.p_user_id);window.__calls.push({action:'payment',userId:args.p_user_id});row.last_paid_at=new Date().toISOString();row.next_due_at=new Date(Date.now()+30*86400000).toISOString();return {data:{ok:true,next_due_at:row.next_due_at},error:null};
    }
    throw Error('Unexpected RPC '+name)
   },functions:{async invoke(name,{body}){window.__calls.push(body);const row=window.__rows.find(r=>r.id===body.userId);if(body.action==='access'&&row)row.status=body.status;if(body.action==='reissue'&&row){row.status='pending';row.approval_code='654321';row.approval_expires_at=new Date(Date.now()+3600000).toISOString()}if(body.action==='approve'&&row){row.status='active';row.approval_code=null;row.approval_expires_at=null}return {data:{ok:true,message:body.action==='invite'?'Invitación enviada y acceso autorizado.':undefined},error:null}}}};
   window.vareliaSignOut=()=>window.__authChange('SIGNED_OUT');
  });
  await page.addScriptTag({path:path.resolve(__dirname,'../account-control.js')});
  assert.equal(await page.locator('#vareliaControlEntry .vceIcon').count(),1);assert.match(await page.locator('#vareliaControlEntry').innerText(),/Panel principal/);
  await page.locator('#vareliaControlEntry').click();await page.locator('[data-ac-account="pending"]').waitFor();
  assert.equal(await page.locator('.acBusiness').count(),3);assert.equal(await page.locator('[data-ac-account="principal"] .acActions').count(),0);
  assert.equal(await page.locator('#acCounts .acStat').count(),4);assert.equal(await page.locator('#acPaymentAlerts .acPaymentAlert').count(),1);
  assert.match(await page.locator('[data-ac-account="owner"]').innerText(),/Afiliado desde/);assert.match(await page.locator('[data-ac-account="owner"]').innerText(),/Pago pendiente/);
  page.on('dialog',d=>d.accept());await page.locator('#acPaymentAlerts [data-ac-paid]').click();await page.waitForFunction(()=>window.__calls.some(c=>c.action==='payment'));
  await page.waitForFunction(()=>document.querySelectorAll('#acPaymentAlerts .acPaymentAlert').length===0);
  assert.equal(await page.locator('#acAccounts img').count(),0);assert.match(await page.locator('#acApprovalNotice').innerText(),/código aparece aquí/i);
  assert.match(await page.locator('[data-ac-account="pending"] .acCode').innerText(),/123456/);assert.equal(await page.locator('[data-ac-account="pending"] [data-ac-approve]').count(),1);
  await page.locator('[data-ac-account="pending"] [data-ac-approve]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='pending').status==='active');
  assert.ok(await page.evaluate(()=>window.__calls.some(c=>c.action==='approve'&&c.code==='123456')));
  await page.locator('#acSearch').fill('staff@example.test');assert.equal(await page.locator('.acAccount').count(),1);assert.match(await page.locator('.acBusiness').innerText(),/Administrador: owner@example.test/);
  await page.locator('[data-ac-access="blocked"]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='staff').status==='blocked');
  await page.locator('[data-ac-reissue]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='staff').status==='pending');
  assert.match(await page.locator('[data-ac-account="staff"] .acCode').innerText(),/654321/);
  await page.locator('[data-ac-account="staff"] [data-ac-approve]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='staff').status==='active');
  await page.locator('[data-ac-account="staff"] [data-ac-access="removed"]').click();await page.waitForFunction(()=>window.__rows.find(r=>r.id==='staff').status==='removed');
  await page.locator('#acFilter').selectOption('removed');await page.locator('[data-ac-account="staff"]').waitFor();
  await page.locator('#acSearch').fill('');await page.locator('#acInviteDetails summary').click();assert.match(await page.locator('#acInviteDetails summary').innerText(),/Agregar cuenta/);
  await page.locator('#acInviteForm [name=name]').fill('Nuevo vendedor');await page.locator('#acInviteForm [name=email]').fill('new@example.test');
  await page.locator('#acInviteForm [name=role]').selectOption('cashier');await page.locator('#acBusinessSelect').selectOption('b1');await page.locator('#acInviteForm [type=submit]').click();
  await page.waitForFunction(()=>window.__calls.some(c=>c.action==='invite'));const invitation=await page.evaluate(()=>window.__calls.find(c=>c.action==='invite'));assert.equal(invitation.role,'cashier');assert.equal(invitation.businessId,'b1');
  await page.evaluate(()=>window.__authChange('SIGNED_OUT'));assert.equal(await page.locator('#vareliaControlEntry').count(),0);assert.equal(await page.locator('#vareliaAccountControl').evaluate(d=>d.open),false);assert.equal(await page.locator('#acAccounts').innerText(),'');
  await page.evaluate(()=>{window.__context={principal:false,status:'pending',allowed:false,approval_enabled:true,approval_channel:'panel'};window.dispatchEvent(new Event('focus'))});
  await page.locator('#vareliaAccountAccessGate').waitFor({state:'visible'});assert.match(await page.locator('#vareliaAccountAccessGate').innerText(),/pendiente de aprobación/i);assert.equal(await page.locator('#vareliaControlEntry').count(),0);
  await page.locator('#vareliaAccountAccessGate button').click();assert.equal(await page.locator('#vareliaAccountAccessGate').count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: principal panel shows approval codes, affiliate dates, monthly payment reminders, account controls, and keeps private UI isolated');
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
