// Legacy scannerVideo framing is incompatible with the Html5Qrcode camera.
// scanner-fix.js owns the camera, cart and layout as a single screen.
(()=>{
  const clean=()=>{
    document.getElementById('vareliaLargeScannerCss')?.remove();
    document.querySelectorAll('#scannerDialog .vscannerStage').forEach(stage=>{
      const video=stage.querySelector('#scannerVideo');
      if(video)stage.before(video);
      stage.remove();
    });
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',clean,{once:true});else clean();
})();
