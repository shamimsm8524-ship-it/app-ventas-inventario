(()=>{
  if(window.__vareliaPaymentOptionsV2)return;
  window.__vareliaPaymentOptionsV2=true;

  const METHODS=['Efectivo','Yape','Plin','Transferencia','Tarjeta','QR'];
  const toast=(m,t='warn')=>window.vareliaToast?window.vareliaToast(m,t):alert(m);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let sb=null,profile=null,businessId='',settings=null,pendingSale=null;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isOwner=()=>String(profile?.role||'')==='owner';

  const style=document.createElement('style');
  style.id='vareliaPaymentOptionsV2Css';
  style.textContent=`
    #vareliaPaymentPanel{margin-top:14px;padding:14px;border:1px solid var(--line);border-radius:16px;background:var(--bg)}
    #vareliaPaymentPanel .vpayHead{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}
    #vareliaPaymentPanel .vpayHead b{font-size:13px}
    #vposPaymentMethod{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:12px;font-weight:850;font-size:15px}
    #vareliaPaymentDetail{margin-top:12px}
    .vpayQrBox{text-align:center;padding:14px;border:1px dashed var(--line);border-radius:15px;background:var(--card)}
    .vpayQrBox img{display:block;width:min(280px,80vw);height:auto;max-height:280px;object-fit:contain;margin:0 auto 10px;border-radius:12px;background:#fff;padding:8px}
    .vpayQrBox strong{display:block;font-size:14px}.vpayQrBox small{display:block;color:var(--muted);margin-top:5px}
    .vpayTransfer{padding:13px;border-radius:14px;background:var(--card);border:1px solid var(--line)}
    .vpayTransfer pre{white-space:pre-wrap;margin:7px 0 10px;font:inherit;color:var(--ink)}
    .vpayCopy{border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);padding:8px 10px;font-weight:850}
    #vareliaPaymentAdmin{margin:14px 0;padding:15px;border:1px solid var(--line);border-radius:16px;background:var(--card)}
    #vareliaPaymentAdmin h3{margin:0 0 5px;font-size:15px}#vareliaPaymentAdmin p{margin:0 0 12px;color:var(--muted);font-size:12px}
    #vareliaPaymentAdmin .vpayAdminGrid{display:grid;gap:11px}
    #vareliaPaymentAdmin label{display:grid;gap:6px;font-size:12px;font-weight:850}
    #vareliaPaymentAdmin input,#vareliaPaymentAdmin textarea{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:11px}
    #vpayAdminQrPreview{display:none;width:min(240px,75vw);max-height:240px;object-fit:contain;border-radius:12px;background:#fff;padding:8px;border:1px solid var(--line)}
    #vpayAdminQrPreview.show{display:block}
    #vpayAdminSave{border:0;border-radius:12px;padding:12px 14px;background:var(--p);color:#fff;font-weight:900}
    .vpayMethodsNote{font-size:11px;color:var(--muted);line-height:1.45}
  `;
  document.head.appendChild(style);

  async function waitSupabase(){
    for(let i=0;i<100&&!window.vareliaSupabase;i++)await sleep(100);
    sb=window.vareliaSupabase||null;
    return sb;
  }

  async function loadProfile(){
    if(!sb)return null;
    const {data:u}=await sb.auth.getUser();
    const user=u?.user;if(!user)return null;
    const {data,error}=await sb.from('profiles').select('id,business_id,role,permissions').eq('id',user.id).maybeSingle();
    if(error)throw error;
    profile=data||null;
    businessId=String(profile?.business_id||'');
    return profile;
  }

  function findLegacyQr(){
    const scan=(obj,depth=0)=>{
      if(!obj||depth>5)return '';
      if(Array.isArray(obj)){for(const x of obj){const r=scan(x,depth+1);if(r)return r}return ''}
      if(typeof obj!=='object')return '';
      for(const [k,v] of Object.entries(obj)){
        if(/qr/i.test(k)&&typeof v==='string'&&v.startsWith('data:image/'))return v;
        if(v&&typeof v==='object'){const r=scan(v,depth+1);if(r)return r}
      }
      return '';
    };
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!/varelia/i.test(key))continue;
      try{
        const raw=localStorage.getItem(key)||'';
        const obj=JSON.parse(raw);
        const r=scan(obj);if(r)return r;
      }catch{}
    }
    return '';
  }

  async function loadSettings(){
    if(!sb||!businessId)return null;
    const {data,error}=await sb.from('varelia_business_settings')
      .select('business_id,payment_methods,payment_qr_data,payment_holder,transfer_details')
      .eq('business_id',businessId).maybeSingle();
    if(error)throw error;
    settings=data||{business_id:businessId,payment_methods:METHODS,payment_qr_data:null,payment_holder:'',transfer_details:''};

    if(isOwner()&&!settings.payment_qr_data){
      const legacy=findLegacyQr();
      if(legacy){
        const up=await sb.from('varelia_business_settings').upsert({
          business_id:businessId,
          payment_qr_data:legacy,
          payment_methods:METHODS
        },{onConflict:'business_id'}).select('business_id,payment_methods,payment_qr_data,payment_holder,transfer_details').single();
        if(!up.error)settings=up.data;
      }
    }
    return settings;
  }

  function methodList(){
    const list=Array.isArray(settings?.payment_methods)?settings.payment_methods:[];
    const merged=[];
    for(const m of [...list,...METHODS])if(m&&!merged.includes(m))merged.push(m);
    return merged;
  }

  function ensurePaymentPanel(){
    const pos=document.getElementById('vareliaPosSales');
    const box=pos?.querySelector('.vposBox');
    const bottom=pos?.querySelector('.vposBottom');
    if(!pos||!box||!bottom)return false;

    document.querySelectorAll('.vposPaymentBar').forEach(x=>x.remove());
    let existing=document.getElementById('vareliaPaymentPanel');
    if(!existing){
      existing=document.createElement('div');
      existing.id='vareliaPaymentPanel';
      existing.innerHTML='<div class="vpayHead"><b>💳 Método de pago</b><span style="font-size:11px;color:var(--muted)">El personal puede elegir cómo pagó el cliente</span></div><select id="vposPaymentMethod"></select><div id="vareliaPaymentDetail"></div>';
      bottom.insertAdjacentElement('beforebegin',existing);
    }

    const sel=document.getElementById('vposPaymentMethod');
    if(!sel)return false;
    const previous=sel.value||localStorage.getItem('varelia_last_payment_method')||'Efectivo';
    const methods=methodList();
    sel.innerHTML=methods.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join('');
    sel.value=methods.includes(previous)?previous:methods[0]||'Efectivo';
    sel.disabled=false;
    sel.onchange=()=>{
      try{localStorage.setItem('varelia_last_payment_method',sel.value)}catch{}
      renderPaymentDetail();
    };
    renderPaymentDetail();
    return true;
  }

  function renderPaymentDetail(){
    const detail=document.getElementById('vareliaPaymentDetail');
    const sel=document.getElementById('vposPaymentMethod');
    if(!detail||!sel)return;
    const method=sel.value;
    const holder=String(settings?.payment_holder||'').trim();
    const qr=String(settings?.payment_qr_data||'');
    const transfer=String(settings?.transfer_details||'').trim();

    if(['Yape','Plin','QR'].includes(method)){
      detail.innerHTML=qr
        ? '<div class="vpayQrBox"><img src="'+qr+'" alt="Código QR de pago"><strong>Escanea para pagar'+(method==='QR'?'':' con '+esc(method))+'</strong>'+(holder?'<small>Titular: '+esc(holder)+'</small>':'')+'</div>'
        : '<div class="vpayQrBox"><strong>QR de pago no configurado</strong><small>'+(isOwner()?'Cárgalo en Ajustes → Métodos de pago.':'El administrador debe cargar el QR de Yape/Plin.')+'</small></div>';
      return;
    }

    if(method==='Transferencia'){
      detail.innerHTML=transfer
        ? '<div class="vpayTransfer"><b>Datos para transferencia</b><pre id="vpayTransferText">'+esc(transfer)+'</pre><button type="button" class="vpayCopy" id="vpayCopyTransfer">📋 Copiar datos</button>'+(holder?'<div style="margin-top:7px;font-size:11px;color:var(--muted)">Titular: '+esc(holder)+'</div>':'')+'</div>'
        : '<div class="vpayTransfer"><b>Transferencia</b><div style="margin-top:5px;font-size:11px;color:var(--muted)">'+(isOwner()?'Agrega los datos de cuenta en Ajustes → Métodos de pago.':'Consulta los datos de transferencia con el administrador.')+'</div></div>';
      const copy=document.getElementById('vpayCopyTransfer');
      if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(transfer);toast('Datos copiados.','ok')}catch{toast('No se pudo copiar.')}};
      return;
    }

    detail.innerHTML='';
  }

  function ensureAdminCard(){
    const hub=document.getElementById('mobileSettingsHub');
    if(!hub||!isOwner())return false;
    if(document.getElementById('vareliaPaymentAdmin'))return true;

    const card=document.createElement('div');
    card.id='vareliaPaymentAdmin';
    card.innerHTML=`
      <h3>💳 Métodos de pago</h3>
      <p>Configura el QR que verá el personal al cobrar con Yape, Plin o QR.</p>
      <div class="vpayAdminGrid">
        <label>Titular del pago<input id="vpayAdminHolder" type="text" maxlength="120" placeholder="Nombre del titular"></label>
        <label>QR de Yape / Plin<input id="vpayAdminQr" type="file" accept="image/*"></label>
        <img id="vpayAdminQrPreview" alt="Vista previa del QR">
        <label>Datos de transferencia<textarea id="vpayAdminTransfer" rows="4" maxlength="1000" placeholder="Banco, cuenta, CCI, titular..."></textarea></label>
        <div class="vpayMethodsNote">Disponibles al cobrar: Efectivo · Yape · Plin · Transferencia · Tarjeta · QR</div>
        <button id="vpayAdminSave" type="button">Guardar métodos de pago</button>
      </div>`;
    const head=hub.querySelector('.head,.vmobileHubHead');
    if(head)head.insertAdjacentElement('afterend',card);else hub.prepend(card);

    const holder=card.querySelector('#vpayAdminHolder');
    const transfer=card.querySelector('#vpayAdminTransfer');
    const file=card.querySelector('#vpayAdminQr');
    const preview=card.querySelector('#vpayAdminQrPreview');
    holder.value=String(settings?.payment_holder||'');
    transfer.value=String(settings?.transfer_details||'');
    if(settings?.payment_qr_data){preview.src=settings.payment_qr_data;preview.classList.add('show')}

    file.onchange=()=>{
      const f=file.files?.[0];if(!f)return;
      if(f.size>3*1024*1024){file.value='';return toast('El QR debe pesar menos de 3 MB.')}
      const reader=new FileReader();
      reader.onload=()=>{preview.src=String(reader.result||'');preview.classList.add('show')};
      reader.readAsDataURL(f);
    };

    card.querySelector('#vpayAdminSave').onclick=async()=>{
      const btn=card.querySelector('#vpayAdminSave');btn.disabled=true;
      try{
        const qr=preview.classList.contains('show')?preview.src:String(settings?.payment_qr_data||'');
        const payload={
          business_id:businessId,
          payment_methods:METHODS,
          payment_qr_data:qr||null,
          payment_holder:holder.value.trim()||null,
          transfer_details:transfer.value.trim()||null
        };
        const {data,error}=await sb.from('varelia_business_settings').upsert(payload,{onConflict:'business_id'})
          .select('business_id,payment_methods,payment_qr_data,payment_holder,transfer_details').single();
        if(error)throw error;
        settings=data;
        ensurePaymentPanel();
        toast('Métodos de pago y QR guardados.','ok');
      }catch(err){
        console.error(err);toast(err?.message||'No se pudo guardar la configuración.');
      }finally{btn.disabled=false}
    };
    return true;
  }

  function capturePayment(){
    const sel=document.getElementById('vposPaymentMethod');
    let before=0;try{before=Array.isArray(sales)?sales.length:0}catch{}
    pendingSale={method:sel?.value||'Efectivo',before,at:Date.now()};
    try{localStorage.setItem('varelia_last_payment_method',pendingSale.method)}catch{}
    setTimeout(applyPaymentToSale,180);
    setTimeout(applyPaymentToSale,450);
    setTimeout(applyPaymentToSale,900);
  }

  function applyPaymentToSale(){
    if(!pendingSale)return;
    try{
      if(!Array.isArray(sales)||sales.length<=pendingSale.before)return;
      const sale=sales[sales.length-1];
      sale.paymentMethod=pendingSale.method;
      if(typeof save==='function')save();
      pendingSale=null;
    }catch{}
  }

  document.addEventListener('click',e=>{
    if(e.target.closest?.('#vposCheckout,#checkout'))capturePayment();
  },true);

  async function init(){
    try{
      if(!await waitSupabase())return;
      if(!await loadProfile()||!businessId)return;
      await loadSettings();
      let tries=0;
      const timer=setInterval(()=>{
        tries++;
        ensurePaymentPanel();
        ensureAdminCard();
        if(tries>160)clearInterval(timer);
      },250);
      window.addEventListener('pageshow',()=>setTimeout(()=>{ensurePaymentPanel();ensureAdminCard()},100));
    }catch(err){
      console.error('Varelia payment options',err);
    }
  }

  init();
})();