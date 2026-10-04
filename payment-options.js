(()=>{
  if(window.__vareliaPaymentOptionsV2)return;
  window.__vareliaPaymentOptionsV2=true;

  const METHODS=['Efectivo','Yape','Plin','Transferencia','Tarjeta'];
  const QR_YAPE_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_yape_v2'):'varelia_qr_yape_v2__no_account';
  const QR_PLIN_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_plin_v2'):'varelia_qr_plin_v2__no_account';
  const QR_YAPE_HOLDER_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_yape_holder_v2'):'varelia_qr_yape_holder_v2__no_account';
  const QR_PLIN_HOLDER_STORE=window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_qr_plin_holder_v2'):'varelia_qr_plin_holder_v2__no_account';
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
    #vpayNativePicker{position:relative}
    #vpayNativeMethodButton{width:100%;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);padding:13px 14px;font-weight:900;font-size:15px;display:flex;align-items:center;justify-content:space-between}
    #vpayNativeMethodMenu{display:none;position:absolute;left:0;right:0;top:calc(100% + 6px);z-index:9999;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 45px rgba(15,23,42,.22);overflow:hidden}
    #vpayNativeMethodMenu.show{display:block}
    #vpayNativeMethodMenu button{display:flex;width:100%;align-items:center;justify-content:space-between;border:0;border-bottom:1px solid var(--line);background:var(--card);color:var(--ink);padding:14px 15px;text-align:left;font-weight:850;font-size:15px}
    #vpayNativeMethodMenu button:last-child{border-bottom:0}
    #vpayNativeMethodMenu button.active{color:var(--p);background:color-mix(in srgb,var(--p) 8%,var(--card))}
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
    #vpayAdminYapeQrPreview,#vpayAdminPlinQrPreview,#vpayAdminGenericQrPreview{display:none;width:min(240px,75vw);max-height:240px;object-fit:contain;border-radius:12px;background:#fff;padding:8px;border:1px solid var(--line)}
    #vpayAdminYapeQrPreview.show,#vpayAdminPlinQrPreview.show,#vpayAdminGenericQrPreview.show{display:block}
    #vpayAdminSave{border:0;border-radius:12px;padding:12px 14px;background:var(--p);color:#fff;font-weight:900}
    .vpayMethodsNote{font-size:11px;color:var(--muted);line-height:1.45}.vpayCash{display:grid;gap:9px}.vpayCash label{font-size:12px;font-weight:850}.vpayCash input{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-size:17px;font-weight:850}.vpayChange{display:flex;justify-content:space-between;align-items:center;padding:12px;border-radius:12px;background:var(--card);border:1px solid var(--line)}.vpayChange strong{font-size:23px;color:var(--p)}
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
      .select('business_id,payment_methods,payment_qr_data,yape_qr_data,plin_qr_data,generic_qr_data,payment_qr_yape,payment_qr_plin,payment_qr_other,payment_holder,transfer_details')
      .eq('business_id',businessId).maybeSingle();
    if(error)throw error;
    settings=data||{business_id:businessId,payment_methods:METHODS,payment_qr_data:null,yape_qr_data:null,plin_qr_data:null,generic_qr_data:null,payment_qr_yape:null,payment_qr_plin:null,payment_qr_other:null,payment_holder:'',transfer_details:''};

    if(isOwner()&&!settings.yape_qr_data&&!settings.plin_qr_data&&!settings.generic_qr_data){
      const legacy=findLegacyQr();
      if(legacy){
        const up=await sb.from('varelia_business_settings').upsert({
          business_id:businessId,
          payment_qr_data:legacy,
          generic_qr_data:legacy,
          payment_methods:METHODS
        },{onConflict:'business_id'}).select('business_id,payment_methods,payment_qr_data,yape_qr_data,plin_qr_data,generic_qr_data,payment_holder,transfer_details').single();
        if(!up.error)settings=up.data;
      }
    }
    return settings;
  }

  function isNativeAndroid(){
    try{return !!window.VareliaAndroid?.isNativeApp?.()}catch{}
    try{return new URL(location.href).searchParams.has('native_app')}catch{}
    return false;
  }

  function ensureNativePaymentPicker(sel,methods){
    if(!sel)return;
    let picker=document.getElementById('vpayNativePicker');
    if(!isNativeAndroid()){
      sel.style.display='';
      if(picker)picker.remove();
      return;
    }
    sel.style.display='none';
    if(!picker){
      picker=document.createElement('div');
      picker.id='vpayNativePicker';
      picker.innerHTML='<button type="button" id="vpayNativeMethodButton"><span></span><b>⌄</b></button><div id="vpayNativeMethodMenu"></div>';
      sel.insertAdjacentElement('afterend',picker);
      const button=picker.querySelector('#vpayNativeMethodButton'),menu=picker.querySelector('#vpayNativeMethodMenu');
      button.onclick=e=>{e.preventDefault();e.stopPropagation();menu.classList.toggle('show')};
      menu.onclick=e=>{
        const option=e.target.closest('[data-vpay-native-method]');if(!option)return;
        e.preventDefault();e.stopPropagation();
        const value=String(option.dataset.vpayNativeMethod||'');
        if(value&&[...sel.options].some(o=>o.value===value)){
          sel.value=value;
          try{localStorage.setItem((window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account'),value)}catch{}
          sel.dispatchEvent(new Event('change',{bubbles:true}));
        }
        menu.classList.remove('show');
      };
      document.addEventListener('click',e=>{if(!e.target.closest('#vpayNativePicker'))menu.classList.remove('show')},true);
    }
    const button=picker.querySelector('#vpayNativeMethodButton'),menu=picker.querySelector('#vpayNativeMethodMenu');
    if(button)button.querySelector('span').textContent=sel.value||methods[0]||'Efectivo';
    if(menu){
      menu.innerHTML=methods.map(m=>'<button type="button" data-vpay-native-method="'+esc(m)+'" class="'+(m===sel.value?'active':'')+'"><span>'+esc(m)+'</span><span>'+(m===sel.value?'●':'○')+'</span></button>').join('');
    }
  }

  function methodList(){
    const list=Array.isArray(settings?.payment_methods)?settings.payment_methods:[];
    const merged=[];
    for(const m of [...list,...METHODS])if(m&&m!=='QR'&&!merged.includes(m))merged.push(m);
    return merged;
  }

  function ensurePaymentPanel(){
    const pos=document.getElementById('vareliaPosSales');
    const box=pos?.querySelector('.vposBox');
    const bottom=pos?.querySelector('.vposBottom');
    const legacyCheckout=document.getElementById('checkout');
    if(!bottom&&!legacyCheckout)return false;

    document.querySelectorAll('.vposPaymentBar').forEach(x=>x.remove());
    let existing=document.getElementById('vareliaPaymentPanel');
    if(!existing){
      existing=document.createElement('div');
      existing.id='vareliaPaymentPanel';
      existing.innerHTML='<div class="vpayHead"><b>💳 Cobro</b><span style="font-size:11px;color:var(--muted)">Pago único o combinado</span></div><select id="vposPaymentMethod"></select><label style="display:flex;gap:8px;align-items:center;margin-top:10px;font-size:13px;font-weight:900"><input id="vpayMixedToggle" type="checkbox" style="width:18px;height:18px"> Pago mixto (combinar métodos)</label><div id="vareliaPaymentDetail"></div>';
      if(bottom)bottom.insertAdjacentElement('beforebegin',existing);else legacyCheckout.insertAdjacentElement('beforebegin',existing);
    }

    const sel=document.getElementById('vposPaymentMethod');
    if(!sel)return false;
    const previous=sel.value||localStorage.getItem((window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account'))||'Efectivo';
    const methods=methodList();
    const signature=methods.join('|');
    if(sel.dataset.vareliaMethods!==signature||sel.options.length!==methods.length){
      sel.dataset.vareliaMethods=signature;
      sel.innerHTML=methods.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join('');
      sel.value=methods.includes(previous)?previous:methods[0]||'Efectivo';
    }else if(methods.includes(previous)&&sel.value!==previous){
      sel.value=previous;
    }
    sel.disabled=false;
    sel.onchange=()=>{
      try{localStorage.setItem((window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account'),sel.value)}catch{}
      ensureNativePaymentPicker(sel,methods);
      renderPaymentDetail();
    };
    ensureNativePaymentPicker(sel,methods);
    const mt=document.getElementById('vpayMixedToggle');
    if(mt&&!mt.dataset.bound){mt.dataset.bound='1';mt.onchange=renderPaymentDetail;}
    renderPaymentDetail();
    return true;
  }

  function renderPaymentDetail(){
    const detail=document.getElementById('vareliaPaymentDetail');
    const sel=document.getElementById('vposPaymentMethod');
    if(!detail||!sel)return;
    const method=sel.value;
    const mixed=document.getElementById('vpayMixedToggle')?.checked;
    if(mixed){
      const total=currentSaleTotal(),methods=methodList();
      const options=methods.map(m=>'<option value="'+esc(m)+'">'+esc(m)+'</option>').join('');
      detail.innerHTML='<div class="vpayCash"><small style="color:var(--muted)">Elige el método y escribe cuánto paga. Puedes combinar dos o más.</small><div id="vpayMixedRows"></div><button type="button" class="btn secondary" id="vpayAddMixed" style="width:100%;margin-top:2px">+ Agregar otro pago</button><div class="vpayChange"><span id="vpayMixedLabel">Falta</span><strong id="vpayMixedResult">S/ '+total.toFixed(2)+'</strong></div><small id="vpayMixedTotal" style="color:var(--muted)">Recibido: S/ 0.00 · Total: S/ '+total.toFixed(2)+'</small></div>';
      const rows=document.getElementById('vpayMixedRows');
      const calc=()=>{const liveTotal=currentSaleTotal(),parts=[...rows.querySelectorAll('.vpayMixedRow')],received=parts.reduce((s,r)=>s+(Number(r.querySelector('.vpayPart')?.value)||0),0),diff=received-liveTotal,label=document.getElementById('vpayMixedLabel'),out=document.getElementById('vpayMixedResult');label.textContent=diff>=0?'Vuelto':'Falta';out.textContent='S/ '+Math.abs(diff).toFixed(2);out.style.color=diff>=0?'var(--p)':'#b91c1c';document.getElementById('vpayMixedTotal').textContent='Recibido: S/ '+received.toFixed(2)+' · Total: S/ '+liveTotal.toFixed(2)};
      const addRow=(preferred='')=>{const row=document.createElement('div');row.className='vpayMixedRow';row.style.cssText='display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px;gap:8px;align-items:end;margin:9px 0';row.innerHTML='<label style="margin:0">Método<select class="vpayMixedMethod" style="width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--ink);font-weight:850">'+options+'</select></label><label style="margin:0">Monto (S/)<input class="vpayPart" type="number" inputmode="decimal" min="0" step="0.10" placeholder="0.00"></label><button type="button" class="vpayRemoveMixed" aria-label="Quitar pago" style="height:46px;border:1px solid #fecaca;background:#fff1f2;color:#b91c1c;border-radius:12px;font-size:20px">×</button>';rows.appendChild(row);const sel=row.querySelector('.vpayMixedMethod');if(preferred&&methods.includes(preferred))sel.value=preferred;row.querySelector('.vpayPart').oninput=calc;row.querySelector('.vpayRemoveMixed').onclick=()=>{if(rows.children.length<=2)return;row.remove();calc()};calc()};
      addRow(methods.includes(method)?method:methods[0]);addRow(methods.find(m=>m!==method)||methods[0]);
      document.getElementById('vpayAddMixed').onclick=()=>addRow(methods[0]);return;
    }
    let local={};try{local=JSON.parse(localStorage.getItem((window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_video_settings_v1'):'varelia_video_settings_v1__no_account'))||'{}')}catch{}
    const live=window.vareliaVideoSettings||{};
    const previewYape=document.getElementById('vYapePreview')?.src||'';
    const previewPlin=document.getElementById('vPlinPreview')?.src||'';
    const dedicatedYape=localStorage.getItem(QR_YAPE_STORE)||'';
    const dedicatedPlin=localStorage.getItem(QR_PLIN_STORE)||'';
    const holder=String(method==='Yape'
      ? (localStorage.getItem(QR_YAPE_HOLDER_STORE)||live.yapeHolder||local.yapeHolder||settings?.payment_holder||'')
      : method==='Plin'
        ? (localStorage.getItem(QR_PLIN_HOLDER_STORE)||live.plinHolder||local.plinHolder||settings?.payment_holder||'')
        : (settings?.payment_holder||'')).trim();
    // Fuente estricta por método. Nunca usar el QR del otro método ni el QR genérico como reemplazo.
    const qr=method==='Yape'
      ? String(previewYape||dedicatedYape||live.yapeQr||local.yapeQr||settings?.yape_qr_data||settings?.payment_qr_yape||'')
      : method==='Plin'
        ? String(previewPlin||dedicatedPlin||live.plinQr||local.plinQr||settings?.plin_qr_data||settings?.payment_qr_plin||'')
        : String(settings?.generic_qr_data||settings?.payment_qr_other||settings?.payment_qr_data||'');
    const transfer=String(live.transferDetails||local.transferDetails||settings?.transfer_details||'').trim();

    if(method==='Efectivo'){
      const total=currentSaleTotal();
      detail.innerHTML='<div class="vpayCash"><label>Monto recibido (S/)</label><input id="vpayReceived" type="number" inputmode="decimal" min="0" step="0.10" placeholder="0.00"><div class="vpayChange"><span>Vuelto</span><strong id="vpayChange">S/ 0.00</strong></div><small id="vpayCashMsg" style="color:var(--muted)"></small></div>';
      const inp=document.getElementById('vpayReceived'),out=document.getElementById('vpayChange'),msg=document.getElementById('vpayCashMsg');
      const calc=()=>{const received=Number(inp.value)||0,liveTotal=currentSaleTotal(),change=received-liveTotal;out.textContent='S/ '+Math.max(0,change).toFixed(2);msg.textContent=received>0&&received<liveTotal?'Faltan S/ '+(liveTotal-received).toFixed(2):'';out.style.color=received>=liveTotal?'var(--p)':'#b91c1c'};
      inp.oninput=calc;calc();return;
    }

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
    document.getElementById('vareliaPaymentAdmin')?.remove();
    return true;
    const hub=document.getElementById('mobileSettingsHub');
    if(!hub||!isOwner())return false;
    if(document.getElementById('vareliaPaymentAdmin'))return true;

    const card=document.createElement('div');
    card.id='vareliaPaymentAdmin';
    card.innerHTML=`
      <h3>💳 Métodos de pago</h3>
      <p>Configura QR diferentes para Yape, Plin y un QR adicional.</p>
      <div class="vpayAdminGrid">
        <label>Titular del pago<input id="vpayAdminHolder" type="text" maxlength="120" placeholder="Nombre del titular"></label>
        <label>QR de Yape<input id="vpayAdminYapeQr" type="file" accept="image/*"></label>
        <img id="vpayAdminYapeQrPreview" alt="Vista previa QR Yape">
        <label>QR de Plin<input id="vpayAdminPlinQr" type="file" accept="image/*"></label>
        <img id="vpayAdminPlinQrPreview" alt="Vista previa QR Plin">
        <label>QR adicional<input id="vpayAdminGenericQr" type="file" accept="image/*"></label>
        <img id="vpayAdminGenericQrPreview" alt="Vista previa QR adicional">
        <label>Datos de transferencia<textarea id="vpayAdminTransfer" rows="4" maxlength="1000" placeholder="Banco, cuenta, CCI, titular..."></textarea></label>
        <div class="vpayMethodsNote">Disponibles al cobrar: Efectivo · Yape · Plin · Transferencia · Tarjeta · QR</div>
        <button id="vpayAdminSave" type="button">Guardar métodos de pago</button>
      </div>`;
    const head=hub.querySelector('.head,.vmobileHubHead');
    if(head)head.insertAdjacentElement('afterend',card);else hub.prepend(card);

    const holder=card.querySelector('#vpayAdminHolder');
    const transfer=card.querySelector('#vpayAdminTransfer');
    const yapeFile=card.querySelector('#vpayAdminYapeQr');
    const plinFile=card.querySelector('#vpayAdminPlinQr');
    const genericFile=card.querySelector('#vpayAdminGenericQr');
    const yapePreview=card.querySelector('#vpayAdminYapeQrPreview');
    const plinPreview=card.querySelector('#vpayAdminPlinQrPreview');
    const genericPreview=card.querySelector('#vpayAdminGenericQrPreview');
    holder.value=String(settings?.payment_holder||'');
    transfer.value=String(settings?.transfer_details||'');
    const showPreview=(el,src)=>{if(src){el.src=src;el.classList.add('show')}};
    showPreview(yapePreview,settings?.yape_qr_data||settings?.payment_qr_yape||'');
    showPreview(plinPreview,settings?.plin_qr_data||settings?.payment_qr_plin||'');
    showPreview(genericPreview,settings?.generic_qr_data||'');
    const bindFile=(file,preview)=>{
      file.onchange=()=>{
        const f=file.files?.[0];if(!f)return;
        if(f.size>3*1024*1024){file.value='';return toast('El QR debe pesar menos de 3 MB.')}
        const reader=new FileReader();
        reader.onload=()=>{preview.src=String(reader.result||'');preview.classList.add('show')};
        reader.readAsDataURL(f);
      };
    };
    bindFile(yapeFile,yapePreview);
    bindFile(plinFile,plinPreview);
    bindFile(genericFile,genericPreview);

    card.querySelector('#vpayAdminSave').onclick=async()=>{
      const btn=card.querySelector('#vpayAdminSave');btn.disabled=true;
      try{
        const yapeQr=yapePreview.classList.contains('show')?yapePreview.src:String(settings?.yape_qr_data||settings?.payment_qr_yape||'');
        const plinQr=plinPreview.classList.contains('show')?plinPreview.src:String(settings?.plin_qr_data||settings?.payment_qr_plin||'');
        const genericQr=genericPreview.classList.contains('show')?genericPreview.src:String(settings?.generic_qr_data||'');
        const payload={
          business_id:businessId,
          payment_methods:METHODS,
          payment_qr_data:yapeQr||plinQr||genericQr||null,
          yape_qr_data:yapeQr||null,
          plin_qr_data:plinQr||null,
          generic_qr_data:genericQr||null,
          payment_holder:holder.value.trim()||null,
          transfer_details:transfer.value.trim()||null
        };
        const {data,error}=await sb.from('varelia_business_settings').upsert(payload,{onConflict:'business_id'})
          .select('business_id,payment_methods,payment_qr_data,yape_qr_data,plin_qr_data,generic_qr_data,payment_holder,transfer_details').single();
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

  function currentSaleTotal(){
    const shown=Number(String(document.getElementById('saleTotal')?.textContent||'').replace(/[^0-9.]/g,''));
    if(Number.isFinite(shown)&&shown>0)return shown;
    try{
      if(Array.isArray(cart)){
        const sum=cart.reduce((a,i)=>a+Number(i.price||0)*Number(i.qty||0),0);
        if(sum>0)return sum;
      }
    }catch{}
    return Number(String(document.getElementById('vposTotal')?.textContent||'').replace(/[^0-9.]/g,''))||0;
  }

  function paymentSnapshot(){
    const total=currentSaleTotal();
    const mixed=!!document.getElementById('vpayMixedToggle')?.checked;
    let breakdown={},received=0;
    if(mixed){
      document.querySelectorAll('.vpayMixedRow').forEach(r=>{const x=r.querySelector('.vpayPart'),m=r.querySelector('.vpayMixedMethod')?.value,n=Math.max(0,Number(x?.value)||0);if(n&&m){breakdown[m]=(breakdown[m]||0)+n;received+=n}});
    }else{
      const method=document.getElementById('vposPaymentMethod')?.value||'Efectivo';
      received=method==='Efectivo'?(Number(document.getElementById('vpayReceived')?.value)||0):total;
      if(received>0)breakdown[method]=received;
    }
    const missing=Math.max(0,total-received),change=Math.max(0,received-total);
    if(change&&breakdown.Efectivo)breakdown.Efectivo=Math.max(0,breakdown.Efectivo-change);
    const used=Object.entries(breakdown).filter(([,v])=>v>0);
    return {total,mixed,breakdown:Object.fromEntries(used),received,missing,change,method:used.length>1?'Pago mixto':(used[0]?.[0]||document.getElementById('vposPaymentMethod')?.value||'Efectivo')};
  }

  function capturePayment(){
    let before=0;try{before=Array.isArray(sales)?sales.length:0}catch{}
    let snap=paymentSnapshot();
    const native=window.VareliaPaymentSnapshot;
    const nativeCash=document.getElementById('vCash');
    const nativePay=document.getElementById('vposPay');
    if(nativePay&&native&&Number(native.total)>=0&&Math.abs(Number(native.total)-Number(snap.total))<.01){
      snap={...native};
    }else if(nativePay&&nativeCash){
      const total=currentSaleTotal();
      const received=Math.max(0,Number(nativeCash.value)||0);
      const method=document.getElementById('vposPayMethod')?.value||'Efectivo';
      if(method==='Efectivo'){
        const change=Math.max(0,received-total),missing=Math.max(0,total-received);
        snap={total,received,missing,change,breakdown:received?{Efectivo:Math.min(received,total)}:{},method:'Efectivo'};
      }
    }
    if(snap.missing>.005){toast('Faltan S/ '+snap.missing.toFixed(2)+' para completar el pago.');return false}
    pendingSale={...snap,before,at:Date.now()};
    window.VareliaPaymentSnapshot={...snap,at:Date.now()};
    try{localStorage.setItem((window.vareliaScopedLocalKey?window.vareliaScopedLocalKey('varelia_last_payment_method'):'varelia_last_payment_method__no_account'),pendingSale.method)}catch{}
    setTimeout(applyPaymentToSale,80);setTimeout(applyPaymentToSale,220);setTimeout(applyPaymentToSale,500);setTimeout(applyPaymentToSale,1000);
    return true;
  }

  function applyPaymentToSale(){
    if(!pendingSale)return;
    try{
      if(!Array.isArray(sales)||sales.length<=pendingSale.before)return;
      const sale=sales[sales.length-1];
      sale.paymentMethod=pendingSale.method;
      sale.paymentBreakdown=pendingSale.breakdown;
      sale.amountReceived=pendingSale.received;
      sale.changeGiven=pendingSale.change;
      sale.paymentTotal=pendingSale.total;
      if(typeof save==='function')save();
      pendingSale=null;
    }catch{}
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#vposCheckout,#checkout');
    if(!target)return;
    // El POS principal ya valida el importe y guarda VareliaPaymentSnapshot.
    // Al disparar el botón legado, no volver a validar contra un segundo formulario.
    if(target.id==='checkout'&&window.VareliaPaymentSnapshot&&Date.now()-Number(window.VareliaPaymentSnapshot.at||0)<5000){
      const snap=window.VareliaPaymentSnapshot;
      let before=0;try{before=Array.isArray(sales)?sales.length:0}catch{}
      pendingSale={...snap,before,at:Date.now()};
      setTimeout(applyPaymentToSale,80);setTimeout(applyPaymentToSale,220);setTimeout(applyPaymentToSale,500);setTimeout(applyPaymentToSale,1000);
      return;
    }
    if(target.id==='vposCheckout')return;
    if(!capturePayment()){e.preventDefault();e.stopImmediatePropagation()}
  },true);

  window.addEventListener('varelia:payment-settings-changed',()=>{
    try{
      ensurePaymentPanel();
      renderPaymentDetail();
    }catch(err){console.warn('Varelia payment refresh',err)}
  });

  async function init(){
    try{
      // El cobro debe mostrarse siempre, incluso si Supabase/perfil tarda o falla.
      ensurePaymentPanel();
      let quickTries=0;
      const quickTimer=setInterval(()=>{quickTries++;ensurePaymentPanel();if(quickTries>80)clearInterval(quickTimer)},150);
      if(!await waitSupabase())return;
      if(!await loadProfile()||!businessId)return;
      await loadSettings();
      ensurePaymentPanel();
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