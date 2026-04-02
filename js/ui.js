/* ─── ui.js v4 — 사진 포함 카드 + 갤러리 + 즐겨찾기 필터 ─── */
'use strict';
const UI = (() => {
  function _e(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));}

  /* ── TOAST ── */
  function toast(msg,type='info'){
    const icons={success:'✓',error:'✕',info:'✦',warning:'⚠'};
    const $t=$(`<div class="toast-item toast-${type}"><span class="toast-icon">${icons[type]||'✦'}</span><span>${_e(msg)}</span></div>`);
    $('#toastDock').append($t);
    setTimeout(()=>{ $t.addClass('out'); setTimeout(()=>$t.remove(),250); }, CONFIG.TOAST_MS);
  }

  function updateFavBadge(){
    const n=Storage.Fav.count();
    $('#favBadge').text(n).attr('data-n',n);
    $('#favCountLbl').text(`${n}개의 루트`);
  }

  function fmtDate(s){
    if(!s)return'미정';
    try{return new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'long',day:'numeric'}).format(new Date(s));}catch{return s;}
  }

  function evStatus(start,end){
    const now=Date.now(),s=new Date(start).getTime(),e=new Date(end).getTime();
    if(now<s)return{label:'예정',cls:'upcoming'};
    if(now<=e)return{label:'진행중',cls:'ongoing'};
    return{label:'종료',cls:'ended'};
  }

  /* ══ ROUTE CARD (사진 포함) ══ */
  function routeCard(route, idx=0) {
    const isFav   = Storage.Fav.has(route.id);
    const badge   = Review.inlineBadge(route.id);
    const srcLabel = {kakao:'카카오 검색',curated:'큐레이션',blog:'블로그',custom:'직접 등록'};
    const coverSrc = route.coverImage || Images.getCardThumb(route);
    const grad     = Images.getGradient(route.id);

    const places = route.places.slice(0,5).map((p,i)=>{
      const color=CONFIG.MARKER_COLORS[i]||'#c4a360';
      return `<div class="rc-place">
        <div class="rc-place-n" style="background:${color}22;color:${color}">${i+1}</div>
        <span class="rc-place-name">${_e(p.name)}</span>
        <span class="rc-place-type">${_e(p.type||'')}</span>
      </div>`;
    }).join('');

    const $card=$(`
      <div class="route-card" data-id="${route.id}" style="animation-delay:${idx*65}ms" tabindex="0" role="article">
        <div class="rc-thumb">
          <div class="rc-thumb-img-wrap" style="background:${grad}">
            <img class="rc-thumb-img" 
              src="${_e(coverSrc)}" 
              alt="${_e(route.title)}"
              loading="lazy"
              onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'korea')+'/400/300';}else{this.style.display='none';}"
            />
          </div>
          <div class="rc-thumb-grad"></div>
          <div class="rc-badges">
            <span class="rc-badge rc-badge-region">📍 ${_e(route.region)}</span>
            <span class="rc-badge rc-badge-theme">${_e(route.theme)}</span>
          </div>
          <button class="rc-fav ${isFav?'on':''}" data-id="${route.id}" aria-label="${isFav?'즐겨찾기 해제':'즐겨찾기 추가'}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
          </button>
          <!-- 장소 썸네일 스트립 -->
          <div class="rc-place-strip">
            ${route.places.slice(0,4).map(p=>{
              const img=p.image||Images.getPlaceImage(p,route.region);
              return `<div class="rc-strip-item" style="background:${grad}"><img src="${_e(img)}" alt="${_e(p.name)}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'korea')+'/400/300';}else{this.style.display='none';}"/></div>`;
            }).join('')}
          </div>
        </div>
        <div class="rc-body">
          <div class="rc-title">${_e(route.title)}</div>
          <div class="rc-meta">
            <span class="rc-meta-item">📍 ${route.places.length}개 장소</span>
            <span class="rc-meta-item">${badge}</span>
          </div>
          <div class="rc-places">${places}</div>
        </div>
        <div class="rc-foot">
          <span class="rc-cta">상세 보기 →</span>
          <span class="rc-source">${srcLabel[route.source]||'추천'}</span>
        </div>
      </div>`);

    $card.on('mousemove',function(e){
      const r=this.getBoundingClientRect();
      $(this).css({'--mx':((e.clientX-r.left)/r.width*100).toFixed(1)+'%','--my':((e.clientY-r.top)/r.height*100).toFixed(1)+'%'});
    });
    return $card;
  }

  function renderRouteGrid(routes, gridId='routeGrid') {
    const $g=$(`#${gridId}`).empty();
    const $empty=gridId==='routeGrid'?$('#routeEmpty'):$('#favEmpty');
    if(!routes?.length){$empty.show();return;}
    $empty.hide();
    routes.forEach((r,i)=>$g.append(routeCard(r,i)));
  }

  /* ══ FAVORITES PAGE (필터링) ══ */
  function renderFavPage() {
    let favs = Storage.Fav.all();
    const searchQ  = $('#favSearch').val().toLowerCase().trim();
    const region   = $('#favRegionFilter').val();
    const theme    = $('#favThemeFilter').val();
    const sortBy   = $('#favSortFilter').val();

    // 필터
    if (searchQ)  favs = favs.filter(r=>r.title.toLowerCase().includes(searchQ)||r.region.includes(searchQ)||r.theme.includes(searchQ));
    if (region)   favs = favs.filter(r=>r.region===region);
    if (theme)    favs = favs.filter(r=>r.theme===theme);

    // 정렬
    if (sortBy==='title')   favs.sort((a,b)=>a.title.localeCompare(b.title));
    else if (sortBy==='region') favs.sort((a,b)=>a.region.localeCompare(b.region));
    else if (sortBy==='rating') favs.sort((a,b)=>Storage.Reviews.avg(b.id)-Storage.Reviews.avg(a.id));
    else favs.sort((a,b)=>new Date(b.savedAt)-new Date(a.savedAt));

    renderRouteGrid(favs,'favGrid');
    updateFavBadge();

    // 태그 클라우드
    const allFavs = Storage.Fav.all();
    const regions = [...new Set(allFavs.map(r=>r.region))];
    const themes  = [...new Set(allFavs.map(r=>r.theme))];
    const tags    = [...regions,...themes];
    const $tb = $('#favTagBar').empty();
    if(tags.length){
      tags.forEach(tag=>{
        const isRegion=regions.includes(tag);
        $tb.append(`<button class="fav-tag ${(isRegion&&region===tag)||(!isRegion&&theme===tag)?'active':''}" data-tag="${_e(tag)}" data-type="${isRegion?'region':'theme'}">${_e(tag)}</button>`);
      });
    }
  }

  /* ══ EVENT CARD ══ */
  /* 행사 카드 이미지 시드 생성 */
  function _evImgSrc(ev) {
    if (ev.image) return ev.image;
    const seeds = {
      '문화': '1548115184-bc6544d06a58', '축제': '1476514525535-07fb3b4ae5f1',
      '음식': '1498654896293-37aacf113fd9', '자연': '1501854140801-50d01698950b',
      '스포츠': '1530866495561-507c9faab2ed',
    };
    const id = seeds[ev.category] || '1476514525535-07fb3b4ae5f1';
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=600&h=320&q=80`;
  }

  function eventCard(ev, idx=0) {
    const st = evStatus(ev.startDate, ev.endDate);
    const imgSrc = _evImgSrc(ev);
    const picsumSeed = encodeURIComponent(ev.title || 'festival');
    const $card = $(`<div class="event-card" style="animation-delay:${idx*55}ms">
      <div class="ec-img-wrap">
        <img class="ec-img" src="${_e(imgSrc)}" alt="${_e(ev.title)}" loading="lazy"
          onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/${picsumSeed}/600/320';}else{this.parentElement.classList.add('ec-img-err');}" />
        <div class="ec-img-grad"></div>
        <span class="ec-cat ec-cat-abs">${_e(ev.category)}</span>
        <span class="ec-icon-abs">${ev.icon||'🎪'}</span>
      </div>
      <div class="ec-head">
        <div class="ec-title-row">
          <div class="ec-title">${_e(ev.title)}</div>
          <span class="ec-status ${st.cls}">${st.label}</span>
        </div>
      </div>
      <div class="ec-body">
        <div class="ec-row"><div class="ec-icon">📅</div><div class="ec-text"><span class="ec-label">기간</span>${fmtDate(ev.startDate)} — ${fmtDate(ev.endDate)}</div></div>
        <div class="ec-row"><div class="ec-icon">📍</div><div class="ec-text"><span class="ec-label">장소</span>${_e(ev.venue||ev.region)}</div></div>
        ${ev.desc?`<div class="ec-row"><div class="ec-icon">ℹ️</div><div class="ec-text"><span class="ec-label">소개</span>${_e(ev.desc.length>100?ev.desc.slice(0,100)+'…':ev.desc)}</div></div>`:''}
      </div>
    </div>`);
    return $card;
  }

  function renderEventGrid(events){
    const $g=$('#eventGrid').empty();
    if(!events?.length){$g.html('<div class="empty"><div class="empty-ico">🎪</div><h3>행사 정보가 없어요</h3><p>다른 기간을 선택해보세요</p></div>');return;}
    events.forEach((ev,i)=>$g.append(eventCard(ev,i)));
  }

  /* ══ PHOTO GALLERY TAB ══ */
  function renderPhotosPanel(route, containerId) {
    const $el=$(`#${containerId}`); if(!$el.length)return;
    const gallery = Images.getGallery(route);
    // 추가: 블로그에서 가져온 이미지
    if (route.galleryImages?.length) {
      route.galleryImages.forEach((u,i)=>{
        if (!gallery.find(g=>g.url===u)) {
          gallery.push({url:u, caption:`블로그 이미지 ${i+1}`, type:'blog'});
        }
      });
    }

    const items = gallery.map((img,i)=>`
      <div class="gallery-item" data-idx="${i}" data-src="${_e(img.url)}">
        <div class="gi-img-wrap">
          <img src="${_e(img.url)}" alt="${_e(img.caption||'')}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'photo')+'/600/400';}else{this.closest('.gallery-item').classList.add('gi-err');}"/>
          <div class="gi-overlay"><span>${_e(img.caption||'')}</span></div>
        </div>
        <div class="gi-caption">${_e(img.caption||'')}</div>
      </div>`).join('');

    $el.html(`
      <div style="padding:24px">
        <h3 style="font-family:var(--f-display);font-size:20px;font-weight:700;margin-bottom:16px">
          ${_e(route.title)} — 사진 ${gallery.length}장
        </h3>
        <div class="gallery-grid">${items}</div>
        <div class="lightbox" id="lightbox" style="display:none">
          <button class="lb-close" id="lbClose">✕</button>
          <button class="lb-prev" id="lbPrev">‹</button>
          <button class="lb-next" id="lbNext">›</button>
          <img class="lb-img" id="lbImg" src="" alt=""/>
          <div class="lb-cap" id="lbCap"></div>
        </div>
      </div>`);

    // Lightbox
    let curIdx=0;
    const imgs=gallery;
    function showLB(i){
      curIdx=Math.max(0,Math.min(i,imgs.length-1));
      $('#lbImg').attr('src',imgs[curIdx].url);
      $('#lbCap').text(imgs[curIdx].caption||'');
      $('#lightbox').show();
    }
    $el.find('.gallery-item').on('click',function(){showLB(parseInt($(this).data('idx')));});
    $el.find('#lbClose').on('click',()=>$('#lightbox').hide());
    $el.find('#lbPrev').on('click',()=>showLB(curIdx-1));
    $el.find('#lbNext').on('click',()=>showLB(curIdx+1));
    $(document).on('keydown.lb',e=>{ if(e.key==='ArrowLeft')showLB(curIdx-1); if(e.key==='ArrowRight')showLB(curIdx+1); if(e.key==='Escape')$('#lightbox').hide(); });
  }

  /* ══ MODAL ══ */
  let _mapInited=false;
  function openModal(route){
    _mapInited=false;
    $('.mt').removeClass('active'); $('.mp').removeClass('active');
    $('#modalTabs .mt:first').addClass('active'); $('#tab-info').addClass('active');
    _renderInfo(route);
    renderPhotosPanel(route,'photosPanel');
    Review.render(route.id,'reviewPanel');
    Share.renderPanel(route,'sharePanel');
    Weather.renderInto('weatherPanel',route.region);

    $('.mt').off('click.mt').on('click.mt',async function(){
      const tab=$(this).data('tab');
      $('.mt').removeClass('active'); $(this).addClass('active');
      $('.mp').removeClass('active'); $(`#tab-${tab}`).addClass('active');
      if(tab==='map'&&!_mapInited){
        _mapInited=true;
        $('#kakaoMap').html('<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--tx-3)"><div class="spin-ring" style="width:26px;height:26px;margin-right:12px"></div>지도 로딩 중...</div>');
        await MapModule.init('kakaoMap',route.region);
        await MapModule.render(route,'kakaoMap','mapSidebar');
        setTimeout(()=>MapModule.relayout(),120);
      }
    });
    $('#routeModal').addClass('open'); $('body').css('overflow','hidden');
  }

  function _renderInfo(route){
    const isFav=Storage.Fav.has(route.id);
    const coverSrc=route.coverImage||Images.getCardThumb(route);
    const grad=Images.getGradient(route.id);

    const places=route.places.map((p,i)=>{
      const color=CONFIG.MARKER_COLORS[i]||'#c4a360';
      const placeImg=p.image||Images.getPlaceImage(p,route.region);
      return `<div class="mi-place">
        <div class="mi-place-img-wrap" style="background:${grad}">
          <img class="mi-place-img" src="${_e(placeImg)}" alt="${_e(p.name)}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'korea')+'/400/300';}else{this.style.display='none';}"/>
        </div>
        <div style="flex:1;min-width:0">
          <div class="mi-place-n-wrap"><div class="mi-place-n" style="background:${color}22;color:${color}">${i+1}</div><div class="mi-place-name">${_e(p.name)}</div></div>
          <div class="mi-place-addr">📍 ${_e(p.address||'주소 미제공')}</div>
          <div class="mi-place-desc">${_e(p.desc||'')}</div>
          <div class="mi-place-foot">
            ${p.type?`<span class="mi-place-tag">${_e(p.type)}</span>`:''}
            ${p.url?`<a href="${p.url}" target="_blank" rel="noopener" class="mi-place-link">카카오맵 →</a>`:''}
          </div>
        </div>
      </div>`;
    }).join('');

    const tl=route.places.map((p,i)=>{
      const color=CONFIG.MARKER_COLORS[i]||'#c4a360';
      const isLast=i===route.places.length-1;
      const img=p.image||Images.getPlaceImage(p,route.region);
      return `<div class="tl-item">
        <div class="tl-track"><div class="tl-dot" style="background:${color}">${i+1}</div>${!isLast?'<div class="tl-line"></div>':''}</div>
        <div class="tl-body">
          <div class="tl-name">${_e(p.name)}</div>
          <div class="tl-meta">${p.type?`<span class="tl-type">${_e(p.type)}</span>`:''}${p.address?`<span class="tl-addr">📍 ${_e(p.address)}</span>`:''}</div>
          ${p.desc?`<div class="tl-desc">${_e(p.desc)}</div>`:''}
          <div class="tl-img-wrap" style="background:${grad}"><img src="${_e(img)}" alt="${_e(p.name)}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'korea')+'/400/300';}else{this.style.display='none';}"/></div>
          ${p.url?`<a href="${p.url}" target="_blank" rel="noopener" class="tl-ext">카카오맵 →</a>`:''}
        </div>
      </div>`;
    }).join('');

    $('#infoScroll').html(`
      <div class="mi-cover-wrap" style="background:${grad}">
        <img class="mi-cover-img" src="${_e(coverSrc)}" alt="${_e(route.title)}" loading="lazy" onerror="if(!this.dataset.fb){this.dataset.fb='1';this.src='https://picsum.photos/seed/'+encodeURIComponent(this.alt||'korea')+'/400/300';}else{this.style.display='none';}"/>
        <div class="mi-cover-grad"></div>
        <div class="mi-cover-info">
          <div class="mi-cover-emoji">${route.emoji}</div>
          <div class="mi-title">${_e(route.title)}</div>
        </div>
      </div>
      <div style="padding:20px 24px">
        <div class="mi-chips">
          <span class="mi-chip">📍 ${_e(route.region)}</span>
          <span class="mi-chip">🏷️ ${_e(route.theme)}</span>
          <span class="mi-chip">🗺️ ${route.places.length}개 장소</span>
          ${route.sourceUrl?`<a href="${_e(route.sourceUrl)}" target="_blank" rel="noopener" class="mi-chip" style="color:var(--g400)">🔗 원문</a>`:''}
        </div>
        <div class="vi-toggle">
          <button class="vi-btn active" data-vi="cards">장소 카드</button>
          <button class="vi-btn" data-vi="tl">타임라인</button>
        </div>
        <div class="vi-panel active" id="vi-cards">
          <p class="section-label">여행 장소</p>
          <div class="mi-places">${places}</div>
        </div>
        <div class="vi-panel" id="vi-tl"><div class="tl-wrap">${tl}</div></div>
        <div class="mi-actions">
          <button class="mi-fav-btn ${isFav?'on':''}" data-id="${route.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="${isFav?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
            ${isFav?'즐겨찾기 해제':'즐겨찾기 추가'}
          </button>
          <button class="mi-share-btn" id="miShareBtn">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.59 13.51l6.83 3.98M15.41 6.51L8.59 10.49"/></svg>공유
          </button>
        </div>
      </div>`);

    $('#infoScroll .vi-btn').on('click',function(){
      const v=$(this).data('vi');
      $('#infoScroll .vi-btn').removeClass('active'); $(this).addClass('active');
      $('#infoScroll .vi-panel').removeClass('active'); $(`#vi-${v}`).addClass('active');
    });
    $('#infoScroll .mi-fav-btn').on('click',function(){ App.toggleFav(route,$(this)); });
    $('#miShareBtn').on('click',()=>$('.mt[data-tab="share"]').trigger('click'));
  }

  function closeModal(){
    $('#routeModal').removeClass('open'); $('body').css('overflow','');
    MapModule.clear(); _mapInited=false;
    $(document).off('keydown.lb');
  }

  function showSpinner(id){ $(`#${id}`).show(); }
  function hideSpinner(id){ $(`#${id}`).hide(); }

  function countUp($el,target,dur=1800){
    const start=performance.now(),hasPct=$el.text().includes('%');
    function tick(now){ const p=Math.min((now-start)/dur,1),e=1-Math.pow(1-p,3); $el.text(Math.floor(e*target).toLocaleString()+(hasPct?'%':'')); if(p<1)requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  }

  function initReveal(){
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const el=entry.target, delay=parseInt(el.dataset.delay||'0');
        setTimeout(()=>$(el).addClass('in'),delay);
        $(el).find('[data-count]').each(function(){ setTimeout(()=>countUp($(this),parseInt($(this).data('count'))),delay+200); });
        obs.unobserve(el);
      });
    },{threshold:.12,rootMargin:'0px 0px -40px 0px'});
    $('[data-reveal]').each(function(){obs.observe(this);});
  }

  return Object.freeze({ toast, updateFavBadge, fmtDate, renderRouteGrid, renderFavPage, renderEventGrid, openModal, closeModal, showSpinner, hideSpinner, initReveal });
})();
