(()=>{
  if(window.__vareliaPremiumAdmin)return;
  window.__vareliaPremiumAdmin=true;

  const style=document.createElement('style');
  style.textContent=`
    .vpAdminNav{position:relative}.vpAdminBadge{float:right;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#ec4899;color:#fff;font-size:10px;display:inline-grid;place-items:center;margin-left:8px}.vpAdminBadge[hidden]{display:none!important}
    .vpAdminModal{position:fixed;inset:0;z-index:100080;display:none;align-items:center;justify-content:center;padding:15px;background:#0f172ab5;backdrop-filter:blur(8px)}.vpAdminModal.show{display:flex}
    .vpAdminCard{width:min(96vw,760px);max-height:92vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#111827);border-radius:24px;padding:20px;box-shadow:0 30px 90px #0006}.vpAdminHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.vpAdminHead h2{margin:0;font-size:22px}.vpAdminHead p{margin:4px 0 0;color:var(--muted,#64748b);font-size:12px}.vpAdminClose{border:0;width:38px;height:38px;border-radius:12px;background:var(--bg,#f1f5f9);font-size:22px;color:inherit}.vpAdminTools{display:flex;gap:8px;margin:14px 0}.vpAdminRefresh{border:1px solid var(--line,#e5e7eb);background:var(--bg,#f8fafc);color:inherit;border-radius:12px;padding:10px 13px;font-weight:900}.vpAdminList{display:grid;gap:12px}.vpAdminEmpty{padding:24px;border:1px dashed var(--line,#e5e7eb);border-radius:16px;text-align:center;color:var(--muted,#64748b)}
    .vpReq{border:1px solid var(--line,#e5e7eb);border-radius:18px;padding:14px;background:var(--card,#fff)}.vpReqTop{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}.vpReq h3{margin:0;font-size:16px}.vpReqEmail{margin-top:3px;font-size:11px;color:var(--muted,#64748b);word-break:break-word}.vpReqStatus{font-size:10px;font-weight:950;border-radius:999px;padding:6px 9px;background:#fef3c7;color:#92400e;white-space:nowrap}.vpReqStatus.approved{background:#d1fae5;color:#047857}.vpReqStatus.rejected{background:#fee2e2;color:#b91c1c}.vpReqGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}.vpReqMini{padding:9px 10px;background:var(--bg,#f8fafc);border-radius:12px;font-size:11px}.vpReqMini b{display:block;font-size:10px;color:var(--muted,#64748b);margin-bottom:2px}.vpReqActions{display:flex;flex-wrap:wrap;gap:7px}.vpReqActions button{border:0;border-radius:11px;padding:9px 11px;font-weight:900;font-size:11px}.vpViewReceipt{background:#e0e7ff;color:#3730a3}.vpApprove{background:#d1fae5;color:#047857}.vpReject{background:#fee2e2;color:#b91c1c}.vpReqActions button:disabled{opacity:.55}.vpAdminLoading{opacity:.65;pointer-events:none}@media(max-width:520px){.vpReqGrid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');modal.className='vpAdminModal';
  modal.innerHTML=`<div class="vpAdminCard"><div class="vpAdminHead"><div><h2>👑 Solicitudes Premium</h2><p>Pagos enviados por clientes para activar Varelia Premium.</p></div><button type="button" class="vpAdminClose">×</button></div><div class="vpAdminTools"><button type="button" class="vpAdminRefresh">↻ Actualizar</button></div><div class="vpAdminList"><div class="vpAdminEmpty">Cargando solicitudes…</div></div></div>`;
  document.body.appendChild(modal);
  const list=modal.querySelector('.vpAdminList'),refreshBtn=modal.querySelector('.vpAdminRefresh');
  modal.querySelector('.vpAdminClose').onclick=()=>modal.classList.remove('show');modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});

  let navBtn=null,isAdmin=false,rows=[],adminCheckSeq=0;
  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const statusLabel=s=>s==='approved'?'Aprobado':s==='rejected'?'Rechazado':s==='cancelled'?'Cancelado':'Pendiente';
  const dateFmt=v=>v?new Date(v).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'}):'—';

  function removeNav(){
    if(navBtn){navBtn.remove();navBtn=null}
    document.querySelectorAll('.vpAdminNav').forEach(el=>el.remove());
  }
  function resetAdminUi(){
    isAdmin=false;rows=[];modal.classList.remove('show');removeNav();
    list.innerHTML='<div class="vpAdminEmpty">Cargando solicitudes…</div>';
  }
  function addNav(){
    if(navBtn||!isAdmin)return;
    const nav=document.querySelector('.nav');if(!nav)return;
    navBtn=document.createElement('button');navBtn.type='button';navBtn.className='vpAdminNav';navBtn.innerHTML='👑 Solicitudes Premium <span class="vpAdminBadge" hidden>0</span>';nav.appendChild(navBtn);navBtn.onclick=()=>{if(!isAdmin)return;modal.classList.add('show');loadRequests()};
  }
  function updateBadge(){if(!navBtn)return;const n=rows.filter(r=>r.status==='pending'&&r.receipt_path).length,b=navBtn.querySelector('.vpAdminBadge');b.textContent=n;b.hidden=!n}
  function render(){
    updateBadge();
    if(!rows.length){list.innerHTML='<div class="vpAdminEmpty">No hay solicitudes Premium todavía.</div>';return}
    list.innerHTML=rows.map(r=>{
      const pending=r.status==='pending',hasReceipt=!!r.receipt_path;
      return `<div class="vpReq" data-id="${esc(r.id)}"><div class="vpReqTop"><div><h3>${esc(r.business_name||'Negocio')}</h3><div class="vpReqEmail">${esc(r.user_email||'')}</div></div><span class="vpReqStatus ${esc(r.status)}">${statusLabel(r.status)}</span></div><div class="vpReqGrid"><div class="vpReqMini"><b>Plan</b>S/ ${Number(r.amount||28).toFixed(2)} · ${Number(r.duration_months||1)} mes</div><div class="vpReqMini"><b>Método</b>${esc((r.payment_method||'—').toUpperCase())}</div><div class="vpReqMini"><b>Pagador</b>${esc(r.payer_name||'No indicado')}</div><div class="vpReqMini"><b>Enviado</b>${dateFmt(r.paid_at||r.created_at)}</div></div><div class="vpReqActions">${hasReceipt?'<button type="button" class="vpViewReceipt">👁 Ver comprobante</button>':''}${pending&&hasReceipt?'<button type="button" class="vpApprove">✓ Aprobar Premium</button><button type="button" class="vpReject">✕ Rechazar</button>':''}</div></div>`
    }).join('');
  }
  async function loadRequests(){
    if(!isAdmin||!window.vareliaSupabase)return;list.classList.add('vpAdminLoading');
    try{const {data,error}=await window.vareliaSupabase.rpc('get_premium_requests_admin');if(error)throw error;if(!isAdmin)return;rows=Array.isArray(data)?data:[];render()}
    catch(e){console.error('Premium admin',e);if(isAdmin)list.innerHTML='<div class="vpAdminEmpty">No se pudieron cargar las solicitudes.</div>'}
    finally{list.classList.remove('vpAdminLoading')}
  }
  refreshBtn.onclick=()=>{if(isAdmin)loadRequests()};

  list.addEventListener('click',async e=>{
    if(!isAdmin)return;
    const card=e.target.closest('.vpReq');if(!card)return;const id=card.dataset.id,r=rows.find(x=>x.id===id);if(!r)return;const sb=window.vareliaSupabase;
    if(e.target.closest('.vpViewReceipt')){
      const w=window.open('','_blank');try{const {data,error}=await sb.storage.from('premium-receipts').createSignedUrl(r.receipt_path,300);if(error)throw error;if(w)w.location=data.signedUrl;else location.href=data.signedUrl}catch(err){if(w)w.close();window.vareliaToast?.('No se pudo abrir el comprobante.','warn')}
      return;
    }
    if(e.target.closest('.vpApprove')){
      if(!confirm(`¿Aprobar Premium por 1 mes para ${r.business_name||'este negocio'}?`))return;
      card.classList.add('vpAdminLoading');try{const {error}=await sb.rpc('approve_premium_request',{p_request_id:id});if(error)throw error;window.vareliaToast?.('Premium activado por 1 mes.','ok');await loadRequests()}catch(err){console.error(err);window.vareliaToast?.('No se pudo aprobar la solicitud.','warn')}finally{card.classList.remove('vpAdminLoading')}return;
    }
    if(e.target.closest('.vpReject')){
      const reason=prompt('Motivo del rechazo (opcional):','');if(reason===null)return;card.classList.add('vpAdminLoading');try{const {error}=await sb.rpc('reject_premium_request',{p_request_id:id,p_reason:reason||null});if(error)throw error;window.vareliaToast?.('Solicitud rechazada.','ok');await loadRequests()}catch(err){console.error(err);window.vareliaToast?.('No se pudo rechazar la solicitud.','warn')}finally{card.classList.remove('vpAdminLoading')}
    }
  });

  async function detectAdmin(){
    const seq=++adminCheckSeq;
    const sb=window.vareliaSupabase;if(!sb){resetAdminUi();return false}
    try{
      const {data:userData}=await sb.auth.getUser();if(seq!==adminCheckSeq)return false;
      const uid=userData?.user?.id;if(!uid){resetAdminUi();return false}
      const {data,error}=await sb.from('platform_admins').select('user_id').eq('user_id',uid).maybeSingle();if(seq!==adminCheckSeq)return false;if(error)throw error;
      isAdmin=!!data;
      if(isAdmin){addNav();loadRequests()}else resetAdminUi();
      return isAdmin;
    }catch(e){if(seq===adminCheckSeq)resetAdminUi();console.warn('Admin Premium',e);return false}
  }
  const timer=setInterval(()=>{if(window.vareliaSupabase){clearInterval(timer);detectAdmin()}},400);setTimeout(()=>clearInterval(timer),15000);
  window.addEventListener('varelia:business-scope-ready',()=>setTimeout(detectAdmin,200));
  const authTimer=setInterval(()=>{const sb=window.vareliaSupabase;if(!sb)return;clearInterval(authTimer);sb.auth.onAuthStateChange(()=>{adminCheckSeq++;resetAdminUi();setTimeout(detectAdmin,250)})},300);setTimeout(()=>clearInterval(authTimer),15000);
})();