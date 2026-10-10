/* Varelia 2.0 - Supabase Realtime lifecycle; app supplies business-scoped reload handlers. */
(function(global){
'use strict';
let channel=null,client=null,business=null,onlineListener=null,offlineListener=null;
let state='disconnected',listeners=new Set(),reloadTimer=null;
const emit=s=>{state=s;listeners.forEach(fn=>{try{fn(s)}catch(e){console.error(e)}})};
const allowed=new Set(['products','sales','public_orders','storefront_settings','storefront_products']);
const handlers={};
function reload(table){const fn=handlers[table];if(typeof fn==='function')Promise.resolve().then(fn).catch(e=>console.error('Sync reload:',e));}
function refreshAll(){for(const t of allowed)reload(t)}
function disconnect(){
 if(reloadTimer){clearTimeout(reloadTimer);reloadTimer=null;}
 if(onlineListener)global.removeEventListener('online',onlineListener);
 if(offlineListener)global.removeEventListener('offline',offlineListener);
 onlineListener=offlineListener=null;
 if(client&&channel)client.removeChannel(channel);
 channel=null;client=null;business=null;emit('disconnected');
}
function connect(supabaseClient,businessId,onChange={},onStatus){
 disconnect();
 if(!supabaseClient||!/^[0-9a-f-]{36}$/i.test(businessId||''))throw new Error('Invalid sync connection');
 client=supabaseClient;business=businessId;
 for(const t of allowed)handlers[t]=onChange[t];
 if(typeof onStatus==='function')listeners.add(onStatus);
 const filter='business_id=eq.'+businessId;
 channel=client.channel('varelia-business-'+businessId);
 for(const t of allowed)channel.on('postgres_changes',{event:'*',schema:'public',table:t,filter},()=>reload(t));
 channel.subscribe((status)=>{
  if(status==='SUBSCRIBED'){emit('connected');refreshAll();}
  else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')emit(navigator.onLine?'reconnecting':'offline');
  else if(status==='CLOSED')emit('disconnected');
 });
 onlineListener=()=>{emit('reconnecting');refreshAll();};
 offlineListener=()=>emit('offline');
 global.addEventListener('online',onlineListener);global.addEventListener('offline',offlineListener);
 if(!navigator.onLine)emit('offline');
 return disconnect;
}
function onStatus(fn){listeners.add(fn);fn(state);return()=>listeners.delete(fn)}
global.VareliaSync={connect,disconnect,onStatus,getStatus:()=>state};
})(window);
