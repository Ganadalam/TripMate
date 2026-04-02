/* ══════════════════════════════════════════════════════════════
   api.js v5 — jQuery Ajax 기반 API 레이어
   - $.ajax Deferred 패턴
   - 요청 취소 (abort) 지원
   - 재시도 로직 (retry once on network failure)
   - 통합 에러 핸들링
══════════════════════════════════════════════════════════════ */

'use strict';

const API = (() => {

  /* ── 현재 진행 중인 Ajax 요청 트래킹 ── */
  const _pendingXHR = new Map();

  /* ── 기본 Ajax 래퍼 (jQuery Deferred 반환) ── */
  function _ajax(opts, retries = 1) {
    const key = opts._key || opts.url;
    // 동일 키 중복 요청 취소
    if (key && _pendingXHR.has(key)) {
      _pendingXHR.get(key).abort();
    }

    const dfd = $.Deferred();
    const xhr = $.ajax({
      timeout: 8000,
      ...opts,
    })
    .done(data => {
      _pendingXHR.delete(key);
      dfd.resolve(data);
    })
    .fail((jqXHR, status, err) => {
      _pendingXHR.delete(key);
      if (status !== 'abort' && retries > 0) {
        // 1회 자동 재시도
        setTimeout(() => {
          _ajax(opts, retries - 1)
            .done(dfd.resolve)
            .fail(dfd.reject);
        }, 600);
      } else {
        dfd.reject(new Error(`[API] ${status}: ${err || 'network error'}`));
      }
    });

    if (key) _pendingXHR.set(key, xhr);
    return dfd.promise();
  }

  /* ── 유틸리티 ── */
  function _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _dateStr(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }

  function _fmtDate(raw) {
    if (!raw || raw.length !== 8) return raw;
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  function _shortType(categoryGroupName) {
    return ({
      '음식점': '맛집',
      '카페':   '카페',
      '관광명소': '명소',
      '문화시설': '문화',
      '숙박': '숙박',
    })[categoryGroupName] || categoryGroupName || '장소';
  }

  /* ── 이미지 첨부 ── */
  function _attachImages(routes, region, theme) {
    return routes.map(route => ({
      ...route,
      coverImage: Images.REGION_HERO[region] || Images.THEME_HERO[theme] || null,
      places: route.places.map(p => ({
        ...p,
        image: p.image || Images.getPlaceImage(p, region),
      })),
    }));
  }

  /* ── 루트 빌더 ── */
  function _buildRoutes(places, region, theme, source) {
    const emoji   = CONFIG.THEME_EMOJI[theme] || '✦';
    const sz      = CONFIG.PLACES_PER_ROUTE;
    const max     = CONFIG.ROUTES_PER_SEARCH;
    const labels  = ['추천 루트', '베스트 코스', '시그니처 루트'];
    const routes  = [];

    for (let i = 0; i < max && i * sz < places.length; i++) {
      const slice = places.slice(i * sz, (i + 1) * sz);
      if (slice.length < 2) break;
      routes.push({
        id:        `${source}-${region}-${theme}-${Date.now()}-${i}`,
        title:     `${region} ${theme} ${labels[i] || `코스${i + 1}`}`,
        region, theme, emoji,
        places:    slice,
        source,
        createdAt: new Date().toISOString(),
      });
    }
    return routes.length ? routes : null;
  }

  /* ── 큐레이션 더미 루트 ── */
  function _dummyRoutes(region, theme) {
    const rd = DATA.PLACES[region];
    let places;

    if (rd?.[theme]) {
      places = [...rd[theme]];
    } else if (rd) {
      places = [...Object.values(rd)[0]];
    } else {
      places = [
        { name: `${region} 대표 명소`, address: `${region} 중심가`, desc: `${region}을 대표하는 인기 관광지`, type: '명소' },
        { name: `${region} 인기 맛집`, address: `${region} 먹자골목`, desc: '현지인이 즐겨 찾는 지역 맛집', type: '맛집' },
        { name: `${region} 감성 카페`, address: `${region} 카페거리`, desc: '인테리어와 커피 모두 완벽한 로컬 카페', type: '카페' },
        { name: `${region} 문화 공간`, address: `${region} 문화센터`, desc: '지역 문화를 체험할 수 있는 공간', type: '문화' },
        { name: `${region} 야경 명소`, address: `${region} 전망대`, desc: '해질 무렵 가장 아름다운 뷰포인트', type: '전망대' },
      ];
    }

    return (
      _buildRoutes(places, region, theme, 'curated') ||
      _buildRoutes(places.slice(0, 3), region, theme, 'curated')
    );
  }

  /* ── 카카오 로컬 API + 폴백 ── */
  function getRoutes(region, theme) {
    const codes = CONFIG.CATEGORY_MAP[theme] || ['AT4'];
    const dfd   = $.Deferred();

    if (CONFIG.KAKAO_API_KEY === 'YOUR_KAKAO_REST_API_KEY') {
      // API 키 없을 때 즉시 큐레이션 루트 반환
      const routes = _dummyRoutes(region, theme);
      const result = routes ? _attachImages(routes, region, theme) : [];
      dfd.resolve(result);
      return dfd.promise();
    }

    const requests = codes.map(c => _ajax({
      url:     CONFIG.ENDPOINTS.KAKAO_LOCAL,
      type:    'GET',
      _key:    `kakao-${region}-${theme}-${c}`,
      headers: { Authorization: `KakaoAK ${CONFIG.KAKAO_API_KEY}` },
      data:    { query: `${region} ${theme}`, category_group_code: c, size: 15 },
    }));

    
    $.when(...requests)
      .done((...resps) => {
        // $.when이 단일/다중 모두 처리 (배열 or 직접 값)
        const raw = (requests.length === 1 ? [resps[0]] : resps)
          .flatMap(r => (Array.isArray(r) ? r[0] : r)?.documents || []);

        if (raw.length >= CONFIG.PLACES_PER_ROUTE) {
          const places = _shuffle(raw.map(d => ({
            name:    d.place_name,
            address: d.road_address_name || d.address_name,
            desc:    d.category_name || '장소',
            type:    _shortType(d.category_group_name),
            url:     d.place_url,
            lat:     d.y,
            lng:     d.x,
            image:   null,
          })));

          const routes = _buildRoutes(places, region, theme, 'kakao');
          if (routes) {
            dfd.resolve(_attachImages(routes, region, theme));
            return;
          }
        }
        // 카카오 결과 부족 → 큐레이션 폴백
        const fallback = _dummyRoutes(region, theme);
        dfd.resolve(fallback ? _attachImages(fallback, region, theme) : []);
      })
      .fail(() => {
        const fallback = _dummyRoutes(region, theme);
        dfd.resolve(fallback ? _attachImages(fallback, region, theme) : []);
      });

    return dfd.promise();
  }

  /* ── 행사 API (공공데이터 → 폴백) ── */
  function getEvents(from, to, category) {
    const dfd = $.Deferred();
    const today = new Date().toISOString().slice(0, 10);

    const fallback = () => {
      let ev = DATA.EVENTS.filter(e => {
        // 날짜 필터: 사용자가 from/to 지정 시 적용
        if (from && e.endDate < from) return false;
        if (to && e.startDate > to) return false;
        // 카테고리 필터
        if (category && e.category !== category) return false;
        return true;
      });
      // 기본 정렬: 진행중 → 예정 → 종료
      const statusWeight = e => {
        const now = today, s = e.startDate, end = e.endDate;
        if (now >= s && now <= end) return 0;
        if (now < s) return 1;
        return 2;
      };
      ev.sort((a, b) => statusWeight(a) - statusWeight(b) || a.startDate.localeCompare(b.startDate));
      dfd.resolve(ev);
    };

    // 공공데이터 키가 없으면 즉시 폴백
    if (!CONFIG.PUBLIC_DATA_KEY || CONFIG.PUBLIC_DATA_KEY === 'YOUR_PUBLIC_DATA_KEY') {
      fallback();
      return dfd.promise();
    }

    // 공공데이터 API 호출 (JSON 모드)
    const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(
      `${CONFIG.ENDPOINTS.PUBLIC_EVENT}?serviceKey=${encodeURIComponent(CONFIG.PUBLIC_DATA_KEY)}&numOfRows=30&pageNo=1&MobileOS=ETC&MobileApp=TripMate&_type=json&eventStartDate=${from?.replace(/-/g,'')||_dateStr()}&eventEndDate=${to?.replace(/-/g,'')||_dateStr(180)}`
    );

    _ajax({ url: proxyUrl, type: 'GET', _key: 'public-events', dataType: 'json' })
    .done(res => {
      try {
        const raw = typeof res === 'object' ? res : JSON.parse(res?.contents || res);
        const body = raw?.response?.body || raw?.contents && JSON.parse(raw.contents)?.response?.body;
        const items = body?.items?.item;
        if (items && (Array.isArray(items) ? items.length : true)) {
          let ev = (Array.isArray(items) ? items : [items]).map((it, i) => ({
            id:        `api-ev-${it.contentid || i}`,
            title:     it.title || '행사명 없음',
            region:    it.addr1 || '',
            venue:     it.addr2 || it.addr1 || '',
            startDate: _fmtDate(String(it.eventstartdate || '')),
            endDate:   _fmtDate(String(it.eventenddate || '')),
            category:  _mapCategory(it.cat2 || it.cat1 || ''),
            desc:      it.overview ? it.overview.slice(0, 150) : '',
            icon:      _categoryIcon(it.cat2 || ''),
            image:     it.firstimage || it.firstimage2 || null,
          }));
          if (category) ev = ev.filter(e => e.category === category);
          dfd.resolve(ev);
          return;
        }
      } catch {}
      fallback();
    })
    .fail(fallback);

    return dfd.promise();
  }

  function _mapCategory(cat) {
    const m = { 'A0207':'축제', 'A0208':'문화', 'A0209':'음식', 'A0210':'자연', 'A0211':'스포츠' };
    return m[cat] || (cat.includes('음식')?'음식':cat.includes('자연')?'자연':cat.includes('문화')?'문화':'축제');
  }

  function _categoryIcon(cat) {
    if (cat.includes('음식')) return '🍽️';
    if (cat.includes('자연')) return '🌿';
    if (cat.includes('문화')) return '🎭';
    if (cat.includes('스포츠')) return '⚽';
    return '🎪';
  }

  /* ── 블로그 파싱 (CORS 프록시) ── */
  function parseBlogUrl(url) {
    const dfd = $.Deferred();
    const proxyUrl = CONFIG.CORS_PROXY + encodeURIComponent(url);

    _ajax({
      url:      proxyUrl,
      type:     'GET',
      _key:     `blog-${url}`,
      dataType: 'json',
    })
    .done(res => {
      const html = res?.contents;
      if (!html) { dfd.reject(new Error('빈 응답')); return; }
      dfd.resolve(html);
    })
    .fail(err => dfd.reject(err));

    return dfd.promise();
  }

  /* ── 진행 중 요청 전체 취소 ── */
  function abortAll() {
    _pendingXHR.forEach(xhr => xhr.abort?.());
    _pendingXHR.clear();
  }

  return Object.freeze({ getRoutes, getEvents, parseBlogUrl, abortAll });
})();
