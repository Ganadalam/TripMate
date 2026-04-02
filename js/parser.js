/* ══════════════════════════════════════════════════════════════
   parser.js — 블로그 URL 자동 파싱 엔진 v3.0
   
   처리 흐름:
   1. allorigins 프록시로 HTML fetch
   2. OG/메타 태그에서 제목·설명·대표이미지 추출
   3. 본문 텍스트에서 장소명 패턴 추출 (정규식 6종)
   4. 이미지 태그에서 사진 URL 수집
   5. 지역·테마 자동 감지
   6. 카카오 API로 장소 지오코딩 보강
   7. Unsplash 이미지로 각 장소 사진 보완
══════════════════════════════════════════════════════════════ */
'use strict';

const Parser = (() => {

  const CORS_PROXY = 'https://api.allorigins.win/get?url=';

  /* 장소명 추출 정규식 패턴들 */
  const PATTERNS = [
    /[✔✅📍📌◆◇▶►•·]\s*([가-힣a-zA-Z0-9\s]{2,18}(?:시장|공원|카페|맛집|식당|레스토랑|뮤지엄|박물관|미술관|사찰|절|전망대|해변|해수욕장|역|거리|골목|마을|호텔|펜션|bar|BAR))/gi,
    /^\s*(?:\d{1,2}[.)]\s*|[①②③④⑤⑥⑦⑧])\s*([가-힣a-zA-Z0-9\s]{3,18})/gim,
    /\[([가-힣a-zA-Z0-9\s]{3,16})\]/g,
    /\*{1,2}([가-힣a-zA-Z0-9\s]{3,16})\*{1,2}/g,
    /(?:첫|두|세|네|다섯|여섯|일곱|여덟)\s*번째\s*[코방는]?\s*[:：\-]?\s*([가-힣a-zA-Z0-9\s]{3,16})/g,
    /([가-힣a-zA-Z]{3,14}(?:카페|식당|맛집|공원|시장|박물관|미술관|사찰|해변))/g,
  ];

  const REGION_KEYS = {
    '서울':['서울','종로','강남','마포','성동','용산','홍대','이태원','명동','성수','을지로','인사동','청담','압구정'],
    '부산':['부산','해운대','광안리','남포동','서면','기장','영도','수영','동래','센텀'],
    '제주':['제주','서귀포','애월','성산','함덕','협재','중문','우도','제주도'],
    '경주':['경주','불국사','첨성대','보문','황리단','안압지','대릉원'],
    '강릉':['강릉','경포','정동진','안목','주문진','초당','강문'],
    '전주':['전주','한옥마을','풍남문','덕진','남부시장','전동'],
    '여수':['여수','돌산','오동도','향일암','소호'],
    '속초':['속초','설악','청초호','영랑','대포항','아바이'],
    '수원':['수원','화성','행궁','팔달','광교'],
    '인천':['인천','차이나타운','개항장','소래','강화','을왕','송도'],
  };

  const THEME_KEYS = {
    '먹방':['먹방','맛집','식당','밥','국밥','냉면','회','갈비','삼겹살','치킨','먹거리','맛','음식'],
    '카페투어':['카페','커피','라떼','브런치','베이커리','디저트','로스터'],
    '힐링':['힐링','산책','공원','쉬는','여유','명상','온천','휴식','치유'],
    '문화':['문화','박물관','미술관','역사','유적','궁','성','전통','전시'],
    '자연':['자연','산','바다','등산','트레킹','폭포','계곡','숲','오름','해변'],
    '야경':['야경','밤','조명','빛','노을','일몰','일출','야간'],
    '액티비티':['액티비티','서핑','자전거','등반','래프팅','카약'],
    '쇼핑':['쇼핑','마트','백화점','시장','아울렛','브랜드'],
  };

  function _e(s) {
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));
  }

  function _extractMeta(html) {
    const get = (re) => re.exec(html)?.[1]?.trim() || '';
    return {
      title:  get(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
           || get(/<title[^>]*>([^<]+)<\/title>/i),
      desc:   get(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
           || get(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i),
      image:  get(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
           || get(/<meta[^>]*name=["']thumbnail["'][^>]*content=["']([^"']+)["']/i),
    };
  }

  /* 본문에서 이미지 URL 수집 */
  function _extractImages(html, limit = 10) {
    const imgs = [];
    // img src 추출
    const reSrc = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let m;
    while ((m = reSrc.exec(html)) !== null && imgs.length < limit) {
      const src = m[1];
      if (_isValidImgUrl(src)) imgs.push(src);
    }
    // data-src (lazy load) 추출
    const reDs = /<img[^>]+data-src=["']([^"']+)["'][^>]*>/gi;
    while ((m = reDs.exec(html)) !== null && imgs.length < limit) {
      const src = m[1];
      if (_isValidImgUrl(src)) imgs.push(src);
    }
    // og:image 메타
    const reOg = /<meta[^>]*(?:property=["']og:image["']|name=["']thumbnail["'])[^>]*content=["']([^"']+)["']/gi;
    while ((m = reOg.exec(html)) !== null && imgs.length < limit) {
      if (_isValidImgUrl(m[1])) imgs.push(m[1]);
    }
    return [...new Set(imgs)];
  }

  function _isValidImgUrl(src) {
    if (!src || typeof src !== 'string') return false;
    if (!src.startsWith('http')) return false;
    const bad = ['blank','pixel','logo','icon','avatar','profile','button','arrow','spinner','loading','1x1','spacer','ad.','ads.','tracking'];
    if (bad.some(b => src.toLowerCase().includes(b))) return false;
    if (src.length < 20) return false;
    // 일반적인 이미지 확장자 또는 이미지 CDN
    return true;
  }

  function _cleanText(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
      .replace(/\s{2,}/g,' ').trim();
  }

  function _detectRegion(text) {
    const scores = {};
    for (const [r, kws] of Object.entries(REGION_KEYS)) {
      scores[r] = kws.reduce((n,k) => n + (text.includes(k)?1:0), 0);
    }
    const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
    return best?.[1] > 0 ? best[0] : '사용자 등록';
  }

  function _detectTheme(text) {
    const scores = {};
    for (const [t, kws] of Object.entries(THEME_KEYS)) {
      scores[t] = kws.reduce((n,k) => n + (text.includes(k)?1:0), 0);
    }
    const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
    return best?.[1] > 0 ? best[0] : '커스텀';
  }

  function _extractPlaceNames(text) {
    const names = [];
    for (const pat of PATTERNS) {
      pat.lastIndex = 0;
      let m;
      while ((m = pat.exec(text)) !== null) {
        const n = m[1]?.trim().replace(/\s+/g,' ');
        if (n && n.length >= 2 && n.length <= 18 && !/^\d+$/.test(n)) {
          names.push(n);
        }
        if (names.length > 40) break;
      }
    }
    // 중복 제거 + 순서 유지
    const seen = new Set();
    return names.filter(n => {
      const k = n.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0, CONFIG.PLACES_PER_ROUTE * 2);
  }

  /* 카카오 장소 검색으로 주소·좌표 보강 */
  async function _enrichPlace(name, region) {
    if (CONFIG.KAKAO_API_KEY === 'YOUR_KAKAO_REST_API_KEY') return null;
    try {
      const res = await $.ajax({
        url: CONFIG.ENDPOINTS.KAKAO_LOCAL, type:'GET', timeout:5000,
        headers:{ Authorization:`KakaoAK ${CONFIG.KAKAO_API_KEY}` },
        data:{ query:`${region} ${name}`, size:1 },
      });
      const d = res?.documents?.[0];
      if (!d) return null;
      return {
        name: d.place_name, address: d.road_address_name || d.address_name,
        desc: d.category_name || name, type: d.category_group_name || '장소',
        url: d.place_url, lat: d.y, lng: d.x,
        image: d.place_url ? null : null, // 카카오는 이미지 미제공
      };
    } catch { return null; }
  }

  function _buildFallbackPlace(name, region, idx, imgs) {
    return {
      name, address:`${region} 일원`,
      desc:'블로그에서 소개된 여행지',
      type: idx===0?'명소':idx<3?'맛집':'카페',
      image: imgs[idx+1] || null, // 블로그에서 추출한 이미지 배치
    };
  }

  /* ══ 메인 파싱 함수 ══ */
  async function parseUrl(url) {
    let parsed;
    try { parsed = new URL(url); }
    catch { throw new Error('올바른 URL 형식이 아닙니다.'); }
    const domain = parsed.hostname.replace('www.','');

    let html = '';
    try {
      const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
      const res = await $.ajax({ url: proxyUrl, type:'GET', timeout:14000, dataType:'json' });
      // allorigins returns { contents: "...", status: { url, content_type, ... } }
      if (typeof res === 'object' && res !== null) {
        html = res.contents || res.html || '';
      } else if (typeof res === 'string') {
        try { const parsed = JSON.parse(res); html = parsed.contents || ''; }
        catch { html = res; }
      }
      // HTML 인코딩 처리
      if (html && html.includes('\\u')) {
        try { html = JSON.parse('"' + html.replace(/"/g,'\\"') + '"'); } catch {}
      }
    } catch(e) {
      // 두 번째 프록시 시도
      try {
        const proxy2 = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const res2 = await $.ajax({ url: proxy2, type:'GET', timeout:10000 });
        html = typeof res2 === 'string' ? res2 : (res2.contents || '');
      } catch {
        return _minimalRoute(url, domain);
      }
    }

    if (!html || html.length < 200) return _minimalRoute(url, domain);

    const meta   = _extractMeta(html);
    const imgs   = _extractImages(html);
    const text   = _cleanText(html);
    const region = _detectRegion(text);
    const theme  = _detectTheme(text);
    const names  = _extractPlaceNames(text);

    if (!names.length) return _minimalRoute(url, domain, { meta, imgs, region, theme });

    const topNames = names.slice(0, CONFIG.PLACES_PER_ROUTE);
    const places = await Promise.all(
      topNames.map(async (name, i) => {
        const enriched = await _enrichPlace(name, region);
        if (enriched) {
          // 블로그 이미지를 장소에 배정
          if (!enriched.image && imgs[i+1]) enriched.image = imgs[i+1];
          return enriched;
        }
        return _buildFallbackPlace(name, region, i, imgs);
      })
    );

    return {
      id:           `parsed-${Date.now()}`,
      title:        meta.title ? `${meta.title.slice(0,28)} 루트` : `${region} ${theme} 루트`,
      region, theme,
      emoji:        CONFIG.THEME_EMOJI[theme] || '📎',
      places,
      coverImage:   meta.image || imgs[0] || null,
      galleryImages: imgs.slice(0, 6),
      sourceMeta:   meta.desc?.slice(0,120) || '',
      sourceUrl:    url, sourceDomain: domain,
      source:       'blog',
      createdAt:    new Date().toISOString(),
    };
  }

  function _minimalRoute(url, domain, ctx={}) {
    const region = ctx.region || '사용자 등록';
    const theme  = ctx.theme  || '커스텀';
    return {
      id:           `parsed-${Date.now()}`,
      title:        ctx.meta?.title ? `${ctx.meta.title.slice(0,24)} 루트` : `${domain} 루트`,
      region, theme,
      emoji:        CONFIG.THEME_EMOJI[theme] || '📎',
      places: [
        { name:`${domain} 장소 1`, address:`${region} 일원`, desc:'블로그 소개 여행지', type:'명소', image:ctx.imgs?.[1]||null },
        { name:`${domain} 장소 2`, address:`${region} 일원`, desc:'블로그 소개 여행지', type:'맛집', image:ctx.imgs?.[2]||null },
        { name:`${domain} 장소 3`, address:`${region} 일원`, desc:'블로그 소개 여행지', type:'카페', image:ctx.imgs?.[3]||null },
      ],
      coverImage:   ctx.meta?.image || ctx.imgs?.[0] || null,
      galleryImages: ctx.imgs?.slice(0,6) || [],
      sourceMeta:   ctx.meta?.desc?.slice(0,120) || '',
      sourceUrl:    url, sourceDomain: domain,
      source:       'blog',
      createdAt:    new Date().toISOString(),
    };
  }

  /* ── 미리보기 HTML ── */
  function buildPreview(route) {
    const coverSrc = route.coverImage || Images.getCardThumb(route);
    const places   = route.places.slice(0,3).map((p,i)=>`<span class="pp-chip">${i+1}. ${_e(p.name)}</span>`).join('');
    const gallHtml = route.galleryImages?.length
      ? route.galleryImages.slice(0,4).map(u=>`<img class="pp-gimg" src="${_e(u)}" alt="" loading="lazy" onerror="this.style.display='none'">`).join('')
      : '';
    return `
      <div class="parse-preview">
        <div class="pp-cover-wrap">
          <img class="pp-cover" src="${_e(coverSrc)}" alt="" onerror="this.style.background='var(--bg-3)'">
        </div>
        <div class="pp-meta">
          <div class="pp-emoji">${route.emoji}</div>
          <div>
            <div class="pp-title">${_e(route.title)}</div>
            <div class="pp-region">${_e(route.region)} · ${_e(route.theme)}</div>
            ${route.sourceMeta?`<div class="pp-desc">${_e(route.sourceMeta)}</div>`:''}
          </div>
        </div>
        <div class="pp-places">${places} <span style="font-size:10px;color:var(--tx-3)">총 ${route.places.length}개</span></div>
        ${gallHtml?`<div class="pp-gallery">${gallHtml}</div>`:''}
        <div class="pp-actions">
          <button class="btn-primary-s" id="confirmParsed">루트로 추가 ✦</button>
          <a href="${_e(route.sourceUrl)}" target="_blank" rel="noopener" class="pp-src">원문 →</a>
        </div>
      </div>`;
  }

  return Object.freeze({ parseUrl, buildPreview });
})();
