/* ─── share.js — 공유 시스템 ─── */
'use strict';

const Share = (() => {
  function _e(s) { return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c])); }

  function buildUrl(route) {
    const base=`${location.protocol}//${location.host}${location.pathname}`;
    const p=new URLSearchParams({region:route.region,theme:route.theme,title:route.title});
    return `${base}#home?${p}`;
  }

  function buildText(route) {
    const places=route.places.slice(0,3).map((p,i)=>`${i+1}. ${p.name}`).join(' → ');
    return `✦ TripMate 추천 루트\n📍 ${route.title}\n${places}\n\n${buildUrl(route)}`;
  }

  async function copyLink(route) {
    const url=buildUrl(route);
    try {
      await navigator.clipboard.writeText(url);
      UI.toast('링크가 복사되었습니다! 🔗','success');
    } catch(_) {
      const ta=document.createElement('textarea');
      ta.value=url; ta.style.cssText='position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      UI.toast('링크가 복사되었습니다!','success');
    }
  }

  async function copyText(route) {
    try { await navigator.clipboard.writeText(buildText(route)); UI.toast('루트 정보가 복사되었습니다!','success'); }
    catch(_) { UI.toast('복사에 실패했습니다.','error'); }
  }

  function twitter(route) {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(buildText(route))}`,'_blank','width=550,height=420');
  }

  function kakao(route) {
    if (window.Kakao?.isInitialized?.()&&window.Kakao.Share) {
      window.Kakao.Share.sendDefault({ objectType:'text', text:buildText(route), link:{mobileWebUrl:buildUrl(route),webUrl:buildUrl(route)} });
    } else { copyText(route); UI.toast('카카오톡 SDK 미연결 — 텍스트 복사됨','info'); }
  }

  async function native(route) {
    if (!navigator.share) return false;
    try { await navigator.share({title:route.title,text:buildText(route),url:buildUrl(route)}); return true; }
    catch(_) { return false; }
  }

  function renderPanel(route, containerId) {
    const $el=$(`#${containerId}`); if (!$el.length) return;
    const url=buildUrl(route);
    const qrSrc=`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}&bgcolor=0b0e15&color=c4a360&margin=1`;
    const hasNative=!!navigator.share;
    $el.html(`
      <div>
        <div class="sh-title">루트 공유</div>
        <div class="sh-url-row">
          <input class="sh-url-inp" type="text" value="${_e(url)}" readonly/>
          <button class="btn-primary-sm" id="shCopyLink">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            복사
          </button>
        </div>
        <div class="sh-btns">
          ${hasNative?'<button class="sh-btn sh-btn-primary" id="shNative"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg> 공유하기</button>':''}
          <button class="sh-btn" id="shTwitter"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> X(트위터)</button>
          <button class="sh-btn" id="shKakao"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.477 3 2 6.582 2 11c0 2.698 1.52 5.086 3.875 6.572L5 21l4.125-2.178C10.016 19.071 11 19.143 12 19.143 17.523 19.143 22 15.561 22 11c0-4.418-4.477-8-10-8z"/></svg> 카카오톡</button>
          <button class="sh-btn" id="shText"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> 텍스트 복사</button>
        </div>
        <div class="section-label" style="margin-bottom:12px">QR 코드</div>
        <div class="sh-qr-wrap">
          <img class="sh-qr-img" src="${qrSrc}" alt="QR 코드" loading="lazy" onerror="this.style.display='none'">
          <p class="sh-qr-label">스캔하면 바로 루트를 열 수 있어요</p>
        </div>
        <div class="section-label" style="margin-top:20px;margin-bottom:8px">공유 텍스트 미리보기</div>
        <div class="sh-text-box">${_e(buildText(route))}</div>
      </div>`);

    $el.find('#shCopyLink').on('click', ()=>copyLink(route));
    $el.find('#shTwitter').on('click', ()=>twitter(route));
    $el.find('#shKakao').on('click', ()=>kakao(route));
    $el.find('#shText').on('click', ()=>copyText(route));
    $el.find('#shNative').on('click', async()=>{ const ok=await native(route); if(!ok) copyLink(route); });
    $el.find('.sh-url-inp').on('click',function(){$(this).select();});
  }

  return Object.freeze({ buildUrl, copyLink, copyText, twitter, renderPanel });
})();
