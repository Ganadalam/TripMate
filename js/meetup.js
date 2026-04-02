/* ══════════════════════════════════════════════════════════════
   meetup.js — 모임 시스템 (밥친구·여행메이트·동호회)
══════════════════════════════════════════════════════════════ */
'use strict';

const Meetup = (() => {
  function _e(s){ return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c])); }

  const TYPE_CONFIG = {
    meal:   { label:'밥친구',    icon:'🍽️', color:'#f97316', bg:'rgba(249,115,22,.1)' },
    travel: { label:'여행메이트',icon:'✈️', color:'#3b82f6', bg:'rgba(59,130,246,.1)' },
    hobby:  { label:'동호회',    icon:'🎯', color:'#8b5cf6', bg:'rgba(139,92,246,.1)'  },
    cafe:   { label:'카페·스터디',icon:'☕', color:'#c4a360', bg:'rgba(196,163,96,.1)' },
  };

  /* 더미 모임 데이터 */
  const DUMMY_MEETUPS = [
    { id:'mu-1', type:'meal', title:'홍대 숨은 맛집 탐방 같이 가요', region:'서울', nick:'미식가닉', date:'2025-11-15', count:3, content:'주말 점심에 홍대 인근 숨은 맛집들을 같이 다녀볼 분 구해요. 맛집 인증샷 찍는 걸 좋아하시는 분이면 더 좋아요!', route:'서울 먹방 추천 루트', joinCount:2, at:'2025-10-28T10:00:00Z' },
    { id:'mu-2', type:'travel', title:'제주 3박4일 여행메이트 구해요', region:'제주', nick:'제주러버', date:'2025-12-01', count:2, content:'12월 첫째 주 제주 여행 같이 갈 분 찾아요. 사진 찍는 걸 좋아하고 여유있게 여행하는 스타일이에요. 오름 트레킹 + 카페투어 위주 일정입니다.', route:'제주 자연 베스트 코스', joinCount:1, at:'2025-10-27T14:00:00Z' },
    { id:'mu-3', type:'hobby', title:'부산 사진 동호회 모집합니다', region:'부산', nick:'사진작가지망', date:'2025-11-22', count:10, content:'매월 부산 각지를 돌아다니며 사진 찍는 동호회입니다. 초보자도 환영! 매월 2회 정기 모임, SNS 포토 스터디 병행.', route:'부산 야경 시그니처 루트', joinCount:6, at:'2025-10-26T09:00:00Z' },
    { id:'mu-4', type:'cafe', title:'강릉 카페 투어 스터디 메이트', region:'강릉', nick:'커피매니아', date:'2025-11-08', count:4, content:'강릉 명물 카페들을 한 바퀴 돌며 커피 이야기 나눌 스터디 메이트 구해요. 각자 작업하면서 커피 얘기도 하고 싶어요.', route:'강릉 카페투어 추천 루트', joinCount:3, at:'2025-10-25T16:00:00Z' },
    { id:'mu-5', type:'meal', title:'경주 황리단길 맛집 탐방', region:'경주', nick:'맛집헌터', date:'2025-11-10', count:4, content:'경주 황리단길 신상 카페와 맛집을 함께 탐방할 분! 역사 관광지도 같이 돌아보면 더 좋아요.', route:'경주 문화 추천 루트', joinCount:1, at:'2025-10-24T11:00:00Z' },
    { id:'mu-6', type:'travel', title:'여수 밤바다 1박2일', region:'여수', nick:'밤바다낭만', date:'2025-11-29', count:3, content:'여수 밤바다 보고 싶어요. 1박2일로 여수 구석구석 탐방할 분! 드라마 촬영지, 오동도, 향일암 코스로 계획 중입니다.', route:'여수 야경 추천 루트', joinCount:2, at:'2025-10-23T18:00:00Z' },
  ];

  let _currentType = 'all';

  function _renderCard(mu) {
    const cfg = TYPE_CONFIG[mu.type] || TYPE_CONFIG.meal;
    const remaining = mu.count > 0 ? mu.count - mu.joinCount : null;
    const isFull = remaining !== null && remaining <= 0;
    return `
      <div class="meetup-card ${isFull?'is-full':''}" data-id="${mu.id}">
        <div class="mc-head" style="border-bottom:1px solid var(--bdr-1)">
          <div class="mc-type-badge" style="background:${cfg.bg};color:${cfg.color};border:1px solid ${cfg.color}33">
            ${cfg.icon} ${cfg.label}
          </div>
          ${isFull?'<span class="mc-full-badge">마감</span>':''}
          <div class="mc-region">${_e(mu.region)}</div>
        </div>
        <div class="mc-body">
          <div class="mc-title">${_e(mu.title)}</div>
          <div class="mc-author">
            <div class="mc-avatar" style="background:${cfg.bg};color:${cfg.color}">${(mu.nick||'?')[0]}</div>
            <span class="mc-nick">${_e(mu.nick)}</span>
            <span class="mc-date">${mu.date||''}</span>
          </div>
          <p class="mc-content">${_e(mu.content.length>80?mu.content.slice(0,80)+'…':mu.content)}</p>
          ${mu.route?`<div class="mc-route-tag">📍 ${_e(mu.route)}</div>`:''}
        </div>
        <div class="mc-foot">
          <div class="mc-stats">
            <span class="mc-stat">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              ${mu.joinCount}/${mu.count>0?mu.count:'∞'}
            </span>
          </div>
          <button class="mc-join-btn ${isFull?'disabled':''}" data-id="${mu.id}" ${isFull?'disabled':''}>
            ${isFull?'마감':'참여하기'}
          </button>
        </div>
      </div>`;
  }

  function render(type='all') {
    _currentType = type;
    const region = $('#meetupRegionFilter').val()||'';
    const sort   = $('#meetupSortFilter').val()||'latest';
    const all    = Storage.Meetup.all();
    const combined = [...DUMMY_MEETUPS, ...all];

    let filtered = combined.filter(m => {
      if (type !== 'all' && m.type !== type) return false;
      if (region && m.region !== region) return false;
      return true;
    });

    if (sort === 'popular')  filtered.sort((a,b)=>b.joinCount-a.joinCount);
    else if (sort === 'deadline') filtered.sort((a,b)=>new Date(a.date)-new Date(b.date));
    else filtered.sort((a,b)=>new Date(b.at)-new Date(a.at));

    const $g = $('#meetupGrid').empty();
    if (!filtered.length) {
      $g.html('<div class="empty" style="grid-column:1/-1"><div class="empty-ico">🤝</div><h3>모임이 없어요</h3><p>첫 모임을 만들어보세요!</p></div>');
      return;
    }
    $g.html(filtered.map(_renderCard).join(''));
  }

  function submit() {
    const type    = $('#mfType').val();
    const title   = $('#mfTitle').val().trim();
    const region  = $('#mfRegion').val();
    const nick    = $('#mfNick').val().trim();
    const date    = $('#mfDate').val();
    const count   = parseInt($('#mfCount').val())||0;
    const content = $('#mfContent').val().trim();
    const route   = $('#mfRoute').val().trim();

    if (!title) { UI.toast('제목을 입력해주세요.','warning'); return; }
    if (!nick)  { UI.toast('닉네임을 입력해주세요.','warning'); return; }
    if (!content||content.length<10) { UI.toast('내용을 10자 이상 입력해주세요.','warning'); return; }

    Storage.Meetup.add({ type, title, region, nick, date, count, content, route, joinCount:0 });
    $('#meetupFormWrap').hide();
    $('#mfType,#mfRegion').val($('#mfType option:first').val());
    $('#mfTitle,#mfNick,#mfDate,#mfContent,#mfRoute').val('');
    $('#mfLen').text('0');
    render(_currentType);
    UI.toast('모임이 등록되었습니다! 🎉','success');
  }

  function join(id) {
    // DUMMY 모임 처리
    const dummy = DUMMY_MEETUPS.find(m=>m.id===id);
    if (dummy) {
      if (dummy.count>0 && dummy.joinCount>=dummy.count) { UI.toast('이미 마감된 모임입니다.','warning'); return; }
      dummy.joinCount++;
      render(_currentType);
      UI.toast('모임 참여 신청이 완료됐어요! 🙌','success');
      return;
    }
    Storage.Meetup.join(id);
    render(_currentType);
    UI.toast('모임 참여 신청이 완료됐어요! 🙌','success');
  }

  function bindEvents() {
    // 탭
    $(document).on('click','.meetup-tab',function(){
      $('.meetup-tab').removeClass('active'); $(this).addClass('active');
      render($(this).data('mt'));
    });
    // 만들기
    $('#createMeetupBtn').on('click',()=>$('#meetupFormWrap').slideDown(200));
    $('#meetupFormClose').on('click',()=>$('#meetupFormWrap').slideUp(200));
    // 제출
    $('#mfSubmit').on('click',submit);
    // 글자 수
    $('#mfContent').on('input',function(){$('#mfLen').text($(this).val().length);});
    // 필터
    $('#meetupRegionFilter,#meetupSortFilter').on('change',()=>render(_currentType));
    // 참여
    $(document).on('click','.mc-join-btn:not(.disabled)',function(e){
      e.stopPropagation(); join($(this).data('id'));
    });
  }

  return Object.freeze({ render, bindEvents });
})();
