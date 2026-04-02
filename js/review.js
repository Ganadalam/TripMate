/* ─── review.js — 리뷰 시스템 ─── */
'use strict';

const Review = (() => {
  function _e(s) { return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c])); }

  function _starsStatic(rating) {
    return Array.from({length:5},(_,i)=>`<span style="color:${i<Math.round(rating)?'var(--g400)':'var(--bdr-3)'}">★</span>`).join('');
  }

  function _starsInteractive(name='rv') {
    return Array.from({length:5},(_,i)=>{
      const v=i+1;
      return `<input type="radio" class="sp-input" id="sp-${name}-${v}" name="${name}" value="${v}"><label class="sp-label" for="sp-${name}-${v}" title="${CONFIG.RATING_LABELS[v]}">★</label>`;
    }).reverse().join('');
  }

  function _relTime(iso) {
    const diff=Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000);
    if (m<1) return '방금 전';
    if (m<60) return `${m}분 전`;
    const h=Math.floor(m/60); if (h<24) return `${h}시간 전`;
    const d=Math.floor(h/24); if (d<7) return `${d}일 전`;
    return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(iso));
  }

  function inlineBadge(rid) {
    const avg=Storage.Reviews.avg(rid), cnt=Storage.Reviews.count(rid);
    if (!cnt) return '<span style="font-size:10px;color:var(--tx-3)">리뷰 없음</span>';
    const stars=Array.from({length:5},(_,i)=>`<span style="color:${i<Math.round(avg)?'var(--g400)':'var(--bdr-3)'}">★</span>`).join('');
    return `<span class="rc-rating"><span class="stars">${stars}</span><span class="num">${avg.toFixed(1)}</span><span class="cnt">(${cnt})</span></span>`;
  }

  function render(rid, containerId) {
    const $w=$(`#${containerId}`); if (!$w.length) return;
    const reviews=Storage.Reviews.byRoute(rid);
    const avg=Storage.Reviews.avg(rid), cnt=reviews.length;

    const summary = cnt ? `
      <div class="rv-summary">
        <div class="rv-avg-big">${avg.toFixed(1)}</div>
        <div class="rv-summary-right">
          <div class="rv-stars-lg">${_starsStatic(avg)}</div>
          <div class="rv-cnt">리뷰 ${cnt}개</div>
        </div>
      </div>` : '';

    const list = reviews.length
      ? reviews.map(r=>`
        <div class="rv-item">
          <div class="rv-item-top">
            <div class="rv-author">
              <div class="rv-avatar">${(r.nick||'?')[0].toUpperCase()}</div>
              <div><div class="rv-nick">${_e(r.nick)}</div><div class="rv-date">${_relTime(r.at)}</div></div>
            </div>
            <div class="rv-item-right">
              <div class="rv-stars">${_starsStatic(r.rating)}</div>
              <span class="rv-label">${CONFIG.RATING_LABELS[r.rating]||''}</span>
              <button class="rv-del" data-id="${r.id}" data-rid="${rid}" aria-label="삭제">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          </div>
          ${r.text?`<div class="rv-text">${_e(r.text)}</div>`:''}
        </div>`).join('')
      : '<p class="rv-empty">첫 번째 리뷰를 남겨보세요!</p>';

    $w.html(`
      <div style="display:flex;flex-direction:column;gap:16px">
        <h3 style="font-family:var(--f-display);font-size:20px;font-weight:700">리뷰 <span style="font-size:13px;color:var(--g400);font-family:var(--f-body)">${cnt}</span></h3>
        ${summary}
        <div class="rv-list" id="rvList-${rid}">${list}</div>
        <div class="rv-form">
          <div class="rv-form-title">✍️ 리뷰 작성</div>
          <div class="rv-form-row">
            <input class="rv-nick-inp" id="rvNick-${rid}" type="text" placeholder="닉네임" maxlength="10"/>
            <div class="star-picker" id="starPicker-${rid}">${_starsInteractive(`rv-${rid}`)}</div>
            <span class="rv-hint" id="rvHint-${rid}">별점을 선택해주세요</span>
          </div>
          <div class="rv-ta-wrap">
            <textarea class="rv-textarea" id="rvText-${rid}" placeholder="이 루트는 어떠셨나요? (${CONFIG.REVIEW_MAX_LEN}자 이내)" maxlength="${CONFIG.REVIEW_MAX_LEN}"></textarea>
            <span class="rv-char"><span id="rvLen-${rid}">0</span>/${CONFIG.REVIEW_MAX_LEN}</span>
          </div>
          <button class="btn-primary-sm rv-submit" id="rvSubmit-${rid}" data-rid="${rid}">리뷰 등록</button>
        </div>
      </div>`);

    _bind(rid, containerId);
  }

  function _bind(rid, containerId) {
    const $w=$(`#${containerId}`);
    $w.find(`[name="rv-${rid}"]`).on('change', function(){
      $w.find(`#rvHint-${rid}`).text(CONFIG.RATING_LABELS[$(this).val()]||'');
    });
    $w.find(`#rvText-${rid}`).on('input', function(){
      $w.find(`#rvLen-${rid}`).text($(this).val().length);
    });
    $w.find(`#rvSubmit-${rid}`).on('click', ()=>_submit(rid, containerId));
    $w.on('click','.rv-del',function(){
      Storage.Reviews.remove($(this).data('rid'), $(this).data('id'));
      render(rid, containerId);
      UI.toast('리뷰가 삭제되었습니다.','info');
    });
  }

  function _submit(rid, containerId) {
    const $w=$(`#${containerId}`);
    const nick=$w.find(`#rvNick-${rid}`).val().trim();
    const rating=parseInt($w.find(`[name="rv-${rid}"]:checked`).val()||'0');
    const text=$w.find(`#rvText-${rid}`).val().trim();
    if (!nick||nick.length<2) { UI.toast('닉네임을 2자 이상 입력해주세요.','warning'); return; }
    if (!rating) { UI.toast('별점을 선택해주세요.','warning'); return; }
    Storage.Reviews.add(rid, {nick, rating, text});
    render(rid, containerId);
    UI.toast('리뷰가 등록되었습니다! ⭐','success');
  }

  return Object.freeze({ render, inlineBadge });
})();
