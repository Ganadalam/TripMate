/* ══════════════════════════════════════════════════════════════
   community.js — 커뮤니티 게시판 (사진·링크·루트 공유)
══════════════════════════════════════════════════════════════ */
'use strict';

const Community = (() => {
  function _e(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c])); }

  const CAT_CONFIG = {
    route:  { label:'루트 공유', color:'#c4a360', bg:'rgba(196,163,96,.1)' },
    review: { label:'후기',      color:'#4ade80', bg:'rgba(74,222,128,.1)'  },
    photo:  { label:'사진',      color:'#60a5fa', bg:'rgba(96,165,250,.1)'  },
    free:   { label:'자유',      color:'#a78bfa', bg:'rgba(167,139,250,.1)' },
  };

  const DUMMY_POSTS = [
    { id:'bp-1', cat:'photo', nick:'여행사진가', title:'제주 새별오름 노을 사진 공유해요', content:'저번 주말에 새별오름에서 찍은 노을입니다. 황금 시간대에 맞춰 가니 정말 환상적이었어요!', photos:['https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&q=80'], link:'', likes:24, at:'2025-10-28T16:00:00Z' },
    { id:'bp-2', cat:'route', nick:'서울탐험가', title:'성수·을지로 카페 원데이 코스 공유', content:'오늘 다녀온 성수~을지로 카페 루트입니다. 어니언→블루보틀→테라로사 순서가 최고예요. 각 카페 간 도보 15분 내외라 걷기도 좋아요.', photos:['https://images.unsplash.com/photo-1509785307050-d4066910ec1e?w=600&q=80','https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&q=80'], link:'', likes:18, at:'2025-10-27T10:00:00Z' },
    { id:'bp-3', cat:'review', nick:'부산러버', title:'광안대교 야경 — 이 시간대에 가세요', content:'해질녘 7시~8시 사이가 최고입니다. 카메라 들고 가면 인생샷 보장! 광안리 앞 카페에서 커피 한 잔 하면서 감상하면 완벽해요.', photos:['https://images.unsplash.com/photo-1538485399081-7191377e8241?w=600&q=80'], link:'https://example.com/review', likes:31, at:'2025-10-26T20:00:00Z' },
    { id:'bp-4', cat:'free', nick:'여행초보', title:'경주 첫 방문 여행 후기 + 팁 공유', content:'처음 경주를 갔는데 생각보다 볼 거리가 많아서 2박3일로도 부족했어요. 불국사+석굴암은 아침 일찍 가는 게 핵심이고, 황리단길은 저녁에 가야 감성이 살아요!', photos:[], link:'', likes:9, at:'2025-10-25T08:00:00Z' },
  ];

  let _currentCat = 'all';
  const _photoSlots = [null, null, null, null]; // base64 or URL

  /* 파일 → base64 */
  function _fileToBase64(file) {
    return new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onload = e => res(e.target.result);
      reader.onerror = rej;
      reader.readAsDataURL(file);
    });
  }

  function _relDate(iso) {
    try {
      const diff = Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000);
      if (m<1) return '방금';
      if (m<60) return `${m}분 전`;
      const h=Math.floor(m/60); if (h<24) return `${h}시간 전`;
      return new Intl.DateTimeFormat('ko-KR',{month:'short',day:'numeric'}).format(new Date(iso));
    } catch { return ''; }
  }

  function _renderPost(p) {
    const cfg = CAT_CONFIG[p.cat] || CAT_CONFIG.free;
    const photosHtml = p.photos?.length
      ? `<div class="bp-photos bp-photos-${p.photos.length}">${p.photos.map(u=>`<div class="bp-photo"><img src="${_e(u)}" loading="lazy" onerror="this.closest('.bp-photo').style.display='none'"/></div>`).join('')}</div>`
      : '';
    const linkHtml = p.link
      ? `<a class="bp-link" href="${_e(p.link)}" target="_blank" rel="noopener"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>${_e(new URL(p.link).hostname.replace('www.',''))}</a>`
      : '';
    return `
      <div class="board-item" data-id="${p.id}">
        <div class="bi-top">
          <div class="bi-author">
            <div class="bi-avatar">${(p.nick||'?')[0].toUpperCase()}</div>
            <div>
              <div class="bi-nick">${_e(p.nick)}</div>
              <div class="bi-date">${_relDate(p.at)}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="bi-cat-tag" style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33">${cfg.label}</span>
            <button class="bi-del" data-id="${p.id}" aria-label="삭제"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
          </div>
        </div>
        ${p.title?`<div class="bi-title">${_e(p.title)}</div>`:''}
        <div class="bi-content">${_e(p.content).replace(/\n/g,'<br>')}</div>
        ${photosHtml}
        ${linkHtml}
        <div class="bi-foot">
          <button class="bi-like ${p._liked?'liked':''}" data-id="${p.id}">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="${p._liked?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            <span>${p.likes||0}</span>
          </button>
        </div>
      </div>`;
  }

  function render(cat='all') {
    _currentCat = cat;
    const saved = Storage.Board.all();
    const combined = [...DUMMY_POSTS, ...saved];
    const filtered = cat === 'all' ? combined : combined.filter(p=>p.cat===cat);
    filtered.sort((a,b)=>new Date(b.at)-new Date(a.at));
    const $l = $('#boardList').empty();
    if (!filtered.length) {
      $l.html('<div class="empty" style="padding:60px 20px"><div class="empty-ico">📝</div><h3>게시글이 없어요</h3><p>첫 게시글을 작성해보세요!</p></div>');
      return;
    }
    $l.html(filtered.map(_renderPost).join(''));
  }

  function submit() {
    const nick    = $('#bNick').val().trim();
    const cat     = $('#bCat').val();
    const title   = $('#bTitle').val().trim();
    const content = $('#bContent').val().trim();
    const link    = $('#bLink').val().trim();
    const photoUrl= $('#bPhotoUrl').val().trim();

    if (!nick||nick.length<2) { UI.toast('닉네임을 2자 이상 입력해주세요.','warning'); return; }
    if (!title) { UI.toast('제목을 입력해주세요.','warning'); return; }
    if (!content||content.length<5) { UI.toast('내용을 5자 이상 입력해주세요.','warning'); return; }

    // 사진 수집
    const photos = _photoSlots.filter(Boolean);
    if (photoUrl) photos.push(photoUrl);

    Storage.Board.add({ nick, cat, title, content, link, photos, likes:0 });
    // Reset
    $('#bNick,#bTitle,#bContent,#bLink,#bPhotoUrl').val('');
    $('#bLen').text('0');
    _photoSlots.fill(null);
    $('.pu-slot').each(function(){
      $(this).find('.pu-preview').hide();
      $(this).find('.pu-remove').hide();
      $(this).find('.pu-plus').show();
    });
    render(_currentCat);
    UI.toast('게시글이 등록되었습니다! 🎉','success');
    $('html,body').animate({scrollTop:$('#boardList').offset().top-100},400);
  }

  function bindEvents() {
    // Board tabs
    $(document).on('click','.board-tab',function(){
      $('.board-tab').removeClass('active'); $(this).addClass('active');
      render($(this).data('bt'));
    });

    // Submit
    $('#bSubmit').on('click',submit);
    $('#bContent').on('input',function(){$('#bLen').text($(this).val().length);});

    // 사진 슬롯 클릭
    $(document).on('click','.pu-slot',async function(e){
      if ($(e.target).is('.pu-remove')) return;
      const slot = parseInt($(this).data('slot'));
      $('#photoFileInput').off('change').on('change',async function(){
        const file = this.files[0]; if (!file) return;
        try {
          const b64 = await _fileToBase64(file);
          _photoSlots[slot] = b64;
          const $s = $(`.pu-slot[data-slot="${slot}"]`);
          $s.find('.pu-preview').attr('src',b64).show();
          $s.find('.pu-plus').hide();
          $s.find('.pu-remove').show();
        } catch { UI.toast('사진 업로드 실패','error'); }
        $(this).val('');
      });
      $('#photoFileInput').trigger('click');
    });

    // 사진 제거
    $(document).on('click','.pu-remove',function(e){
      e.stopPropagation();
      const slot = parseInt($(this).closest('.pu-slot').data('slot'));
      _photoSlots[slot] = null;
      const $s = $(`.pu-slot[data-slot="${slot}"]`);
      $s.find('.pu-preview').attr('src','').hide();
      $s.find('.pu-plus').show();
      $(this).hide();
    });

    // 삭제
    $(document).on('click','.bi-del',function(e){
      e.stopPropagation();
      const id = $(this).data('id');
      // DUMMY 삭제는 안되도록
      if (id.startsWith('bp-')) { UI.toast('샘플 게시글은 삭제할 수 없어요.','info'); return; }
      Storage.Board.remove(id);
      render(_currentCat);
      UI.toast('삭제됐습니다.','info');
    });

    // 좋아요
    $(document).on('click','.bi-like',function(e){
      e.stopPropagation();
      const $btn = $(this);
      $btn.toggleClass('liked');
      const n = parseInt($btn.find('span').text())||0;
      $btn.find('span').text($btn.hasClass('liked')?n+1:n-1);
      $btn.find('svg').attr('fill',$btn.hasClass('liked')?'currentColor':'none');
    });
  }

  return Object.freeze({ render, bindEvents });
})();
