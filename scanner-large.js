(()=>{
  if(window.__vareliaLargeScanner)return;
  window.__vareliaLargeScanner=true;
  const ready=fn=>document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();
  ready(()=>{
    const dialog=document.getElementById('scannerDialog');
    const video=document.getElementById('scannerVideo');
    if(!dialog||!video)return;

    const style=document.createElement('style');
    style.id='vareliaLargeScannerCss';
    style.textContent=`
      #scannerDialog{
        width:100vw!important;
        max-width:none!important;
        height:100dvh!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        border:0!important;
        background:rgba(0,0,0,.88)!important;
      }
      #scannerDialog::backdrop{background:rgba(0,0,0,.82)!important}
      #scannerDialog>.modal{
        width:100%!important;
        max-width:none!important;
        height:100dvh!important;
        max-height:none!important;
        margin:0!important;
        padding:0!important;
        border-radius:0!important;
        background:#050505!important;
        display:flex!important;
        flex-direction:column!important;
        overflow:hidden!important;
      }
      #scannerDialog .modalhead{
        position:relative!important;
        z-index:4!important;
        flex:0 0 auto!important;
        min-height:68px!important;
        padding:14px 18px!important;
        background:rgba(0,0,0,.72)!important;
        color:#fff!important;
        border-bottom:1px solid rgba(255,255,255,.12)!important;
      }
      #scannerDialog .modalhead h2{
        color:#fff!important;
        font-size:20px!important;
        margin:0!important;
      }
      #scannerDialog #closeScanner{
        width:44px!important;
        height:44px!important;
        border-radius:14px!important;
        background:rgba(255,255,255,.15)!important;
        color:#fff!important;
        font-size:28px!important;
      }
      #scannerDialog .vscannerStage{
        position:relative!important;
        flex:1 1 auto!important;
        min-height:0!important;
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        overflow:hidden!important;
        background:#000!important;
      }
      #scannerDialog #scannerVideo{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-height:70dvh!important;
        object-fit:cover!important;
        border-radius:0!important;
        background:#000!important;
      }
      #scannerDialog .vscannerShade{
        position:absolute!important;
        inset:0!important;
        z-index:2!important;
        pointer-events:none!important;
        background:
          linear-gradient(rgba(0,0,0,.34),rgba(0,0,0,.34)) top/100% calc(50% - 105px) no-repeat,
          linear-gradient(rgba(0,0,0,.34),rgba(0,0,0,.34)) bottom/100% calc(50% - 105px) no-repeat;
      }
      #scannerDialog .vscannerFrame{
        position:absolute!important;
        z-index:3!important;
        left:7vw!important;
        right:7vw!important;
        top:50%!important;
        height:210px!important;
        transform:translateY(-50%)!important;
        border:3px solid #fff!important;
        border-radius:22px!important;
        box-shadow:0 0 0 9999px rgba(0,0,0,.18),0 0 24px rgba(255,255,255,.22)!important;
        pointer-events:none!important;
      }
      #scannerDialog .vscannerLine{
        position:absolute!important;
        left:18px!important;
        right:18px!important;
        top:50%!important;
        height:2px!important;
        background:#ff167d!important;
        box-shadow:0 0 12px #ff167d!important;
        animation:vscannerSweep 1.8s ease-in-out infinite alternate!important;
      }
      #scannerDialog .vscannerHint{
        position:absolute!important;
        z-index:4!important;
        left:18px!important;
        right:18px!important;
        bottom:28px!important;
        color:#fff!important;
        text-align:center!important;
        font-weight:850!important;
        font-size:14px!important;
        text-shadow:0 2px 8px #000!important;
        pointer-events:none!important;
      }
      @keyframes vscannerSweep{
        from{transform:translateY(-68px)}
        to{transform:translateY(68px)}
      }
      @media(min-width:700px){
        #scannerDialog>.modal{
          width:min(94vw,850px)!important;
          height:min(92dvh,820px)!important;
          margin:4dvh auto!important;
          border-radius:24px!important;
        }
        #scannerDialog .vscannerFrame{left:12%;right:12%;height:250px!important}
      }
    `;
    document.head.appendChild(style);

    if(!video.parentElement?.classList.contains('vscannerStage')){
      const stage=document.createElement('div');
      stage.className='vscannerStage';
      video.parentNode.insertBefore(stage,video);
      stage.appendChild(video);

      const shade=document.createElement('div');
      shade.className='vscannerShade';
      stage.appendChild(shade);

      const frame=document.createElement('div');
      frame.className='vscannerFrame';
      frame.innerHTML='<div class="vscannerLine"></div>';
      stage.appendChild(frame);

      const hint=document.createElement('div');
      hint.className='vscannerHint';
      hint.textContent='Acerca el código y colócalo dentro del recuadro';
      stage.appendChild(hint);
    }
  });
})();