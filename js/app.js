/* ─── app.js v4 — SPA 컨트롤러 ─── */
'use strict';
const App = (() => {
  let _routes=[], _loading=false;

  function init(){
    _preloader(); _theme(); _cursor(); _header(); _nav(); _search();
    _blogImport(); _routeRegister(); _cardEvents(); _modal(); _favPage();
    _eventsPage(); Meetup.bindEvents(); Community.bindEvents();
    Premium.init(); UI.updateFavBadge(); UI.initReveal(); _loadEvents(); _deepLink();
    $('#manualRegister').show(); // 항상 표시
  }

  /* ── PRELOADER ── */
  function _preloader(){
    let p=0;
    const msgs=['장소 데이터 준비 중...','사진 큐레이션 중...','AI 엔진 초기화 중...','거의 완료됐어요!'];
    let mi=0;
    const iv=setInterval(()=>{ p=Math.min(p+Math.random()*14,92); $('#plFill').css('width',p+'%'); },80);
    const mv=setInterval(()=>{ if(mi<msgs.length)$('#plMsg').text(msgs[mi++]); },700);
    $(window).on('load',()=>{ clearInterval(iv);clearInterval(mv); $('#plFill').css('width','100%'); setTimeout(()=>$('#preloader').addClass('done'),450); });
  }

  function _theme(){
    document.documentElement.setAttribute('data-theme',Storage.Theme.get());
    $('#themeBtn').on('click',()=>{ const n=Storage.Theme.toggle(); document.documentElement.setAttribute('data-theme',n); UI.toast(n==='dark'?'다크 모드':'라이트 모드','info'); });
  }

  function _cursor(){
    if(window.matchMedia('(hover:none)').matches)return;
    const $c=$('#cursor'); let mx=0,my=0,cx=0,cy=0;
    $(document).on('mousemove',e=>{ mx=e.clientX; my=e.clientY; $c.addClass('vis').css({left:mx,top:my}); });
    (function loop(){ cx+=(mx-cx)*.11; cy+=(my-cy)*.11; $c.css({left:cx,top:cy}); requestAnimationFrame(loop); })();
    $(document).on('mouseenter','a,button,[tabindex="0"]',()=>$c.addClass('big'));
    $(document).on('mouseleave','a,button,[tabindex="0"]',()=>$c.removeClass('big'));
    $('body').css('cursor','none');
  }

  function _header(){
    let t=false;
    $(window).on('scroll',()=>{ if(t)return; requestAnimationFrame(()=>{ $('#header').toggleClass('stuck',$(window).scrollTop()>CONFIG.SCROLL_THRESHOLD); t=false; }); t=true; });
    $('#hamburger').on('click',function(){ const o=$(this).hasClass('open'); $(this).toggleClass('open'); $('#mobileNav').toggleClass('open'); $('body').css('overflow',o?'':'hidden'); });
  }

  function _nav(){
    $(document).on('click','[data-page]',function(e){ e.preventDefault(); navigateTo($(this).data('page')); });
    $(window).on('popstate',e=>_activate(e.originalEvent.state?.page||'home'));
  }

  function navigateTo(page){ history.pushState({page},'',`#${page}`); _activate(page); }

  function _activate(page){
    $('[data-page]').removeClass('active'); $(`[data-page="${page}"]`).addClass('active');
    $('.page').removeClass('active'); $(`#page-${page}`).addClass('active');
    $('#hamburger').removeClass('open'); $('#mobileNav').removeClass('open'); $('body').css('overflow','');
    window.scrollTo({top:0,behavior:'smooth'});
    const handlers={
      favorites: ()=>{ UI.renderFavPage(); UI.updateFavBadge(); },
      meetup:    ()=>Meetup.render('all'),
      community: ()=>Community.render('all'),
      events:    ()=>_loadEvents(),
    };
    handlers[page]?.();
  }

  function _deepLink(){
    const hash=location.hash, pageM=hash.match(/^#([a-z]+)/);
    if(pageM) _activate(pageM[1]);
    const ps=hash.includes('?')?hash.split('?')[1]:'';
    if(ps){ const p=new URLSearchParams(ps); const r=p.get('region'),t=p.get('theme'); if(r&&t){ $('#regionSel').val(r); $('#themeSel').val(t); setTimeout(triggerSearch,600); } }
  }

  /* ── SEARCH ── */
  function _search(){
    $('#searchBtn').on('click',triggerSearch);
    $('#regionSel,#themeSel').on('keydown',e=>{ if(e.key==='Enter')triggerSearch(); });
    $(document).on('click','.chip',function(){ $('#regionSel').val($(this).data('r')); $('#themeSel').val($(this).data('t')); triggerSearch(); });
    $('#shareResultsBtn').on('click',()=>{ navigator.clipboard?.writeText(location.href).then(()=>UI.toast('URL 복사됨!','success')); });
    $(document).on('click','.vt',function(){ const v=$(this).data('view'); $('.vt').removeClass('active'); $(this).addClass('active'); $('#routeGrid').attr('data-view',v); });
    _rebuildHistoryChips();
  }

  function _rebuildHistoryChips(){
    const hist=Storage.History.all().slice(0,4);
    $('#swChips .chip-hist').remove();
    hist.forEach(h=>{
      const $c=$(`<button class="chip chip-hist" data-r="${h.region}" data-t="${h.theme}" style="opacity:.7"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:3px"><polyline points="12 8 12 12 14 14"/><circle cx="12" cy="12" r="10"/></svg>${h.region} ${h.theme}</button>`);
      $('#swChips').append($c);
    });
  }

  async function triggerSearch(){
    if(_loading)return;
    const region=$('#regionSel').val(), theme=$('#themeSel').val();
    if(!region||!theme){ UI.toast('지역과 테마를 모두 선택해주세요.','warning'); return; }
    if(!Premium.canSearch()){ Premium.open(); return; }
    _loading=true; Storage.SearchCounter.inc(); Storage.History.add(region,theme); _rebuildHistoryChips();
    const $w=$('#resultsWrap').show();
    $('#routeGrid').empty(); $('#routeEmpty').hide(); $('#premiumCta').hide();
    $('#resultsEye').text(`${region} · ${theme}`); $('#resultsTtl').text('AI가 루트와 사진을 큐레이션하는 중...');
    $('html,body').animate({scrollTop:$w.offset().top-80},500);
    UI.showSpinner('routeSpin');
    try{
      const routes=await API.getRoutes(region,theme);
      _routes=routes??[];
      UI.renderRouteGrid(_routes,'routeGrid');
      $('#resultsTtl').text(`${_routes.length}개의 추천 루트`);
      if(_routes.length) UI.toast(`${region} ${theme} 루트 ${_routes.length}개 완성!`,'success');
      if(!Premium.isPremium()&&Storage.SearchCounter.get()>=2) setTimeout(()=>$('#premiumCta').show(),1500);
    }catch(err){
      $('#routeGrid').html('<div class="empty" style="grid-column:1/-1"><div class="empty-ico">⚠️</div><h3>오류가 발생했어요</h3><p>잠시 후 다시 시도해주세요</p></div>');
      UI.toast('루트를 불러오지 못했습니다.','error');
    }finally{ UI.hideSpinner('routeSpin'); _loading=false; }
  }

  /* ── BLOG IMPORT ── */
  function _blogImport(){
    $('#biBtn').on('click',_handleBlog);
    $('#blogUrl').on('keydown',e=>{ if(e.key==='Enter')_handleBlog(); });
    $('#blogUrl').on('paste',function(){ setTimeout(()=>{ if($(this).val().startsWith('http'))_handleBlog(); },120); });
  }

  async function _handleBlog(){
    if(!Premium.canParse()){ UI.toast('블로그 파싱은 Premium 기능입니다 ✦','warning'); setTimeout(Premium.open,400); return; }
    const url=$('#blogUrl').val().trim();
    if(!url){ UI.toast('URL을 입력해주세요.','warning'); return; }
    $('#biBtnTxt').hide(); $('#biSpin').css('display','inline-block'); $('#biBtn').prop('disabled',true);
    $('#biResult').hide();
    try{
      const route=await Parser.parseUrl(url);
      $('#biResult').html(Parser.buildPreview(route)).addClass('success').removeClass('error').show();
      $('#confirmParsed').on('click',()=>{
        _routes.unshift(route); $('#resultsWrap').show();
        UI.renderRouteGrid(_routes,'routeGrid');
        $('#resultsTtl').text(`${_routes.length}개의 루트`);
        $('#blogUrl').val(''); $('#biResult').hide();
        UI.toast('루트가 추가됐어요! ✦','success');
        $('html,body').animate({scrollTop:$('#resultsWrap').offset().top-80},500);
      });
    }catch(err){
      $('#biResult').html(`<span>⚠️ ${err.message||'URL 파싱 실패'}</span>`).addClass('error').removeClass('success').show();
    }finally{ $('#biBtnTxt').show(); $('#biSpin').hide(); $('#biBtn').prop('disabled',false); }
  }

  /* ── ROUTE REGISTER ── */
  function _routeRegister(){
    $('#registerRouteBtn').on('click',()=>$('#registerModal').addClass('open'));
    $('#registerModalClose').on('click',()=>$('#registerModal').removeClass('open'));
    $('#registerModal').on('click',e=>{ if($(e.target).is('#registerModal'))$('#registerModal').removeClass('open'); });
    $('#mrToggle').on('click',()=>$('#registerModal').addClass('open'));
    $('#regSubmit').on('click',()=>{
      const title=$('#regTitle').val().trim();
      const region=$('#regRegion').val();
      const theme=$('#regTheme').val();
      const coverUrl=$('#regCoverUrl').val().trim();
      const placesRaw=$('#regPlaces').val().trim();
      const desc=$('#regDesc').val().trim();
      if(!title){ UI.toast('루트 제목을 입력해주세요.','warning'); return; }
      if(!placesRaw){ UI.toast('장소를 최소 1개 입력해주세요.','warning'); return; }
      const placeNames=placesRaw.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,8);
      const places=placeNames.map((name,i)=>({
        name, address:`${region} 일원`, desc: i===0?desc:'', type:'장소',
        image: Images.getPlaceImage({name,type:'장소'}, region),
      }));
      const route={
        id:`custom-${Date.now()}`, title, region, theme,
        emoji:CONFIG.THEME_EMOJI[theme]||'📎', places,
        coverImage: coverUrl||Images.REGION_HERO[region]||null,
        source:'custom', createdAt:new Date().toISOString(),
      };
      _routes.unshift(route);
      $('#resultsWrap').show(); UI.renderRouteGrid(_routes,'routeGrid');
      $('#resultsTtl').text(`${_routes.length}개의 루트`);
      $('#registerModal').removeClass('open');
      $('#regTitle,#regCoverUrl,#regPlaces,#regDesc').val('');
      UI.toast('루트가 등록됐어요! ✦','success');
      $('html,body').animate({scrollTop:$('#resultsWrap').offset().top-80},500);
    });
  }

  /* ── CARD EVENTS ── */
  function _cardEvents(){
    $(document).on('click','.route-card',function(e){
      if($(e.target).closest('.rc-fav').length)return;
      const route=_findRoute($(this).data('id')); if(route) UI.openModal(route);
    });
    $(document).on('keydown','.route-card',function(e){ if(e.key==='Enter'||e.key===' '){e.preventDefault();$(this).trigger('click');} });
    $(document).on('click','.rc-fav',function(e){ e.stopPropagation(); const route=_findRoute($(this).data('id')); if(route) toggleFav(route,$(this)); });
  }

  function _findRoute(id){ return _routes.find(r=>r.id===id)||Storage.Fav.all().find(r=>r.id===id); }

  function toggleFav(route,$btn){
    const wasFav=Storage.Fav.has(route.id);
    if(wasFav){
      Storage.Fav.remove(route.id);
      $(`[data-id="${route.id}"].rc-fav`).removeClass('on').find('svg').attr('fill','none');
      $('.mi-fav-btn').removeClass('on').find('svg').attr('fill','none');
      UI.toast('즐겨찾기에서 제거됐어요','info');
    }else{
      Storage.Fav.add(route);
      $(`[data-id="${route.id}"].rc-fav`).addClass('on').find('svg').attr('fill','currentColor');
      $('.mi-fav-btn').addClass('on').find('svg').attr('fill','currentColor');
      UI.toast('즐겨찾기에 추가됐어요! ♥','success');
      $('#favBadge').addClass('pulse'); setTimeout(()=>$('#favBadge').removeClass('pulse'),600);
    }
    UI.updateFavBadge();
  }

  /* ── MODAL ── */
  function _modal(){
    $('#modalClose').on('click',UI.closeModal);
    $('#routeModal,#registerModal').on('click',function(e){ if($(e.target).is(this)){$(this).removeClass('open'); if($(this).is('#routeModal'))UI.closeModal(); else $('body').css('overflow',''); } });
    $(document).on('keydown',e=>{ if(e.key==='Escape'){ if($('#routeModal').hasClass('open'))UI.closeModal(); $('#registerModal').removeClass('open'); } });
  }

  /* ── FAVORITES ── */
  function _favPage(){
    $('#favSearch').on('input',UI.renderFavPage);
    $('#favRegionFilter,#favThemeFilter,#favSortFilter').on('change',UI.renderFavPage);
    $(document).on('click','.fav-tag',function(){
      const tag=$(this).data('tag'), type=$(this).data('type');
      if(type==='region') $('#favRegionFilter').val(tag);
      else $('#favThemeFilter').val(tag);
      UI.renderFavPage();
    });
    $('#clearFavBtn').on('click',()=>{
      if(!Storage.Fav.count()){ UI.toast('저장된 즐겨찾기가 없어요.','info'); return; }
      if(!confirm('모든 즐겨찾기를 삭제할까요?'))return;
      Storage.Fav.clear(); UI.renderFavPage(); UI.updateFavBadge(); UI.toast('전체 삭제됐습니다.','info');
    });
  }

  /* ── EVENTS ── */
  function _eventsPage(){ $('#evFilter').on('click',_loadEvents); }
  async function _loadEvents(){
    UI.showSpinner('evSpin'); $('#eventGrid').empty();
    try{ const evs=await API.getEvents($('#evFrom').val(),$('#evTo').val(),$('#evCat').val()); UI.renderEventGrid(evs); }
    catch(_){ UI.renderEventGrid([]); UI.toast('행사 정보를 불러오지 못했습니다.','error'); }
    finally{ UI.hideSpinner('evSpin'); }
  }

  return Object.freeze({ init, navigateTo, toggleFav, triggerSearch });
})();

$(function(){ App.init(); });
