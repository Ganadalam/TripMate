/* ══════════════════════════════════════════════════════════════
   api.js — 실데이터 연결
   - TourAPI: /api/tours (프록시 서버 경유)
   - Google Places: 직접 호출
   - getEvents: /api/festival (프록시 서버 경유)
══════════════════════════════════════════════════════════════ */
"use strict";
const GOOGLE_API_KEY = CONFIG.GOOGLE_API_KEY;
const PROXY = "http://localhost:4000";

const API = (() => {
  async function _fetchJSON(url, timeout = 12000) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      clearTimeout(timer);
      throw e;
    }
  }

  /* ── TourAPI 지역 코드 매핑 ── */
  const AREA_CODES = {
    서울:  { areaCode: "1",  sigunguCode: "" },
    부산:  { areaCode: "6",  sigunguCode: "" },
    제주:  { areaCode: "39", sigunguCode: "" },
    경주:  { areaCode: "35", sigunguCode: "2" },
    강릉:  { areaCode: "32", sigunguCode: "1" },
    전주:  { areaCode: "37", sigunguCode: "13" },
    수원:  { areaCode: "31", sigunguCode: "21" },
    인천:  { areaCode: "2",  sigunguCode: "" },
    여수:  { areaCode: "38", sigunguCode: "13" },
    속초:  { areaCode: "32", sigunguCode: "7" },
  };

  function _shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function _fmtDate(raw) {
    const s = String(raw || "");
    if (s.length !== 8) return s;
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }

  function _addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function _attachImages(routes, region, theme) {
    return routes.map((route) => ({
      ...route,
      coverImage: Images.REGION_HERO[region] || Images.THEME_HERO[theme] || null,
      places: route.places.map((p) => ({
        ...p,
        image: p.image || Images.getPlaceImage(p, region),
      })),
    }));
  }

  function _buildRoutes(places, region, theme, source) {
    const emoji = CONFIG.THEME_EMOJI[theme] || "✦";
    const sz    = CONFIG.PLACES_PER_ROUTE;
    const max   = CONFIG.ROUTES_PER_SEARCH;
    const labels = ["추천 루트", "베스트 코스", "시그니처 루트"];
    const routes = [];
    for (let i = 0; i < max && i * sz < places.length; i++) {
      const slice = places.slice(i * sz, (i + 1) * sz);
      if (slice.length < 2) break;
      routes.push({
        id: `${source}-${region}-${theme}-${Date.now()}-${i}`,
        title: `${region} ${theme} ${labels[i] || `코스${i + 1}`}`,
        region, theme, emoji, places: slice, source,
        createdAt: new Date().toISOString(),
      });
    }
    return routes.length ? routes : null;
  }

  function _dummyRoutes(region, theme) {
    const rd = DATA.PLACES[region];
    let places;
    if (rd?.[theme]) places = [...rd[theme]];
    else if (rd) places = [...Object.values(rd)[0]];
    else places = [
      { name: `${region} 대표 명소`, address: `${region} 중심가`, desc: `${region} 대표 관광지`, type: "명소" },
      { name: `${region} 인기 맛집`, address: `${region} 먹자골목`, desc: "현지인 즐겨찾는 맛집", type: "맛집" },
      { name: `${region} 감성 카페`, address: `${region} 카페거리`, desc: "로컬 인기 카페", type: "카페" },
      { name: `${region} 문화 공간`, address: `${region} 문화센터`, desc: "지역 문화 체험 공간", type: "문화" },
      { name: `${region} 야경 명소`, address: `${region} 전망대`, desc: "야간 뷰포인트", type: "전망대" },
    ];
    return (
      _buildRoutes(places, region, theme, "curated") ||
      _buildRoutes(places.slice(0, 3), region, theme, "curated")
    );
  }

  /* ── ① TourAPI 관광지 (프록시 서버 경유) ── */
  async function _fetchHubTourSpots(region) {
    if (!CONFIG.PUBLIC_DATA_KEY) return [];
    const ac = AREA_CODES[region];
    if (!ac) return [];

    try {
      const params = new URLSearchParams({ areaCode: ac.areaCode, numOfRows: "30" });
      if (ac.sigunguCode) params.set("sigunguCode", ac.sigunguCode);

      const data = await _fetchJSON(`${PROXY}/api/tours?${params}`, 15000);
      const items = data?.response?.body?.items?.item;
      if (!items) return [];

      return (Array.isArray(items) ? items : [items])
        .map((it) => ({
          name:    it.tarnm    || it.tarNm   || "",
          address: it.rdnmadr  || it.lnmadr  || region,
          desc:    it.tarsimplcn || `${region} 중심 관광지`,
          type:    _mapTourType(it.contenttypeid || ""),
          lat:     it.mapy  ? parseFloat(it.mapy) : null,
          lng:     it.mapx  ? parseFloat(it.mapx) : null,
          url:     "",
          image:   it.firstimage || it.firstimage2 || null,
        }))
        .filter((p) => p.name);
    } catch (e) {
      console.warn("[API] TourAPI 실패:", e?.message);
      return [];
    }
  }

  /* ── ② Google Places ── */
  async function _fetchGooglePlaces(region, theme) {
    if (!GOOGLE_API_KEY) return [];

    const themeKeywords = {
      먹방:     ["맛집", "식당"],
      힐링:     ["힐링 공원", "산책"],
      문화:     ["박물관 미술관"],
      액티비티: ["액티비티 레저"],
      카페투어: ["카페 커피"],
      쇼핑:     ["쇼핑몰 시장"],
      야경:     ["전망대 야경"],
      자연:     ["공원 자연"],
    };
    const kws = themeKeywords[theme] || [theme];
    const allPlaces = [];

    for (const kw of kws.slice(0, 2)) {
      try {
        const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_API_KEY,
            "X-Goog-FieldMask":
              "places.displayName,places.formattedAddress,places.location,places.types,places.googleMapsUri,places.rating,places.primaryTypeDisplayName",
          },
          body: JSON.stringify({
            textQuery: `${region} ${kw}`,
            languageCode: "ko",
            regionCode: "KR",
            maxResultCount: 10,
          }),
        });
        if (!resp.ok) continue;
        const data = await resp.json();
        const places = (data.places || [])
          .map((p) => ({
            name:    p.displayName?.text || "",
            address: p.formattedAddress || "",
            desc:    p.primaryTypeDisplayName?.text || "",
            type:    _mapGoogleType(p.types || []),
            url:     p.googleMapsUri || "",
            lat:     p.location?.latitude,
            lng:     p.location?.longitude,
            image:   null,
          }))
          .filter((p) => p.name && p.lat);
        allPlaces.push(...places);
      } catch (e) {
        console.warn("[API] Google Places 실패:", e?.message);
      }
    }

    const seen = new Set();
    return allPlaces.filter((p) => {
      if (seen.has(p.name)) return false;
      seen.add(p.name);
      return true;
    });
  }

  function _mapGoogleType(types) {
    const map = {
      restaurant: "맛집", food: "맛집", cafe: "카페", bakery: "베이커리",
      tourist_attraction: "명소", museum: "박물관", art_gallery: "미술관",
      park: "공원", shopping_mall: "쇼핑몰", amusement_park: "테마파크",
    };
    for (const t of types) { if (map[t]) return map[t]; }
    return "장소";
  }

  function _mapTourType(typeId) {
    const m = { 12: "관광지", 14: "문화시설", 28: "레포츠", 38: "쇼핑", 39: "음식점" };
    return m[String(typeId)] || "관광지";
  }

  function _filterByTheme(places, theme) {
    const typeMap = {
      먹방:     ["맛집", "음식점", "식당"],
      카페투어: ["카페", "커피", "베이커리"],
      문화:     ["박물관", "미술관", "문화"],
      힐링:     ["공원", "숲", "계곡", "힐링"],
      액티비티: ["레포츠", "체험", "스포츠"],
      쇼핑:     ["쇼핑", "시장"],
      야경:     ["전망대", "야경", "타워"],
      자연:     ["공원", "자연", "산", "바다", "해변"],
    };
    const kws = typeMap[theme] || [];
    if (!kws.length) return places;
    return places.filter((p) => kws.some((k) => (p.type + p.name + p.desc).includes(k)));
  }

  /* ── getRoutes 메인 ── */
  function getRoutes(region, theme) {
    const dfd = $.Deferred();

    Promise.all([_fetchHubTourSpots(region), _fetchGooglePlaces(region, theme)])
      .then(([hubPlaces, googlePlaces]) => {
        const hubNames = new Set(hubPlaces.map((p) => p.name));
        const combined = [
          ...hubPlaces,
          ...googlePlaces.filter((p) => !hubNames.has(p.name)),
        ];

        const filtered = _filterByTheme(combined, theme);
        const pool = filtered.length >= CONFIG.PLACES_PER_ROUTE ? filtered : combined;

        if (pool.length >= CONFIG.PLACES_PER_ROUTE) {
          const routes = _buildRoutes(
            _shuffle(pool), region, theme,
            hubPlaces.length ? "tourapi" : "google",
          );
          if (routes) {
            dfd.resolve(_attachImages(routes, region, theme));
            return;
          }
        }

        const fallback = _dummyRoutes(region, theme);
        dfd.resolve(fallback ? _attachImages(fallback, region, theme) : []);
      })
      .catch(() => {
        const fallback = _dummyRoutes(region, theme);
        dfd.resolve(fallback ? _attachImages(fallback, region, theme) : []);
      });

    return dfd.promise();
  }

  /* ── getEvents ── */
  function getEvents(from, to, category) {
    const dfd = $.Deferred();
    const today = new Date().toISOString().slice(0, 10);

    const fallback = () => {
      let ev = DATA.EVENTS.filter((e) => {
        if (from && e.endDate < from) return false;
        if (to   && e.startDate > to)  return false;
        if (category && e.category !== category) return false;
        return true;
      });
      const w = (e) => {
        const [s, end, now] = [e.startDate, e.endDate, today];
        return now >= s && now <= end ? 0 : now < s ? 1 : 2;
      };
      ev.sort((a, b) => w(a) - w(b) || a.startDate.localeCompare(b.startDate));
      dfd.resolve(ev);
    };

    if (!CONFIG.PUBLIC_DATA_KEY) { fallback(); return dfd.promise(); }

    const startDate = (from || today).replace(/-/g, "");
    const endDate   = (to || _addDays(today, 180)).replace(/-/g, "");

    const params = new URLSearchParams({ eventStartDate: startDate, eventEndDate: endDate });
    _fetchJSON(`${PROXY}/api/festival?${params}`, 15000)
      .then((data) => {
        try {
          const items = data?.response?.body?.items?.item;
          if (!items) { fallback(); return; }

          let ev = (Array.isArray(items) ? items : [items]).map((it, i) => ({
            id:        `api-ev-${it.contentid || i}`,
            title:     it.title || "행사명 없음",
            region:    it.addr1 ? it.addr1.split(" ").slice(0, 2).join(" ") : "",
            venue:     it.addr2 || it.addr1 || "",
            startDate: _fmtDate(it.eventstartdate),
            endDate:   _fmtDate(it.eventenddate),
            category:  _mapEventCat(it.cat2 || it.cat1 || ""),
            desc:      it.overview ? it.overview.replace(/<[^>]+>/g, "").slice(0, 150) : "",
            icon:      _catIcon(it.cat2 || ""),
            image:     it.firstimage || it.firstimage2 || null,
          }));
          if (category) ev = ev.filter((e) => e.category === category);
          dfd.resolve(ev.length ? ev : DATA.EVENTS);
        } catch (e) {
          console.warn("[API] 행사 파싱 오류:", e?.message);
          fallback();
        }
      })
      .catch(() => fallback());

    return dfd.promise();
  }

  function _mapEventCat(cat) {
    const m = { A0207: "축제", A0208: "문화", A0209: "음식", A0210: "자연", A0211: "스포츠" };
    return m[cat] || (
      cat.includes("음식") ? "음식" :
      cat.includes("자연") ? "자연" :
      cat.includes("문화") ? "문화" : "축제"
    );
  }

  function _catIcon(cat) {
    if (cat.includes("음식"))  return "🍽️";
    if (cat.includes("자연"))  return "🌿";
    if (cat.includes("문화"))  return "🎭";
    if (cat.includes("스포츠")) return "⚽";
    return "🎪";
  }

  function parseBlogUrl(url) {
    const dfd = $.Deferred();
    fetch(url)
      .then((res) => res.text())
      .then((html) => { console.log("BLOG HTML:", html); dfd.resolve(html); })
      .catch((err) => dfd.reject(err));
    return dfd.promise();
  }

  function abortAll() {}

  return Object.freeze({ getRoutes, getEvents, parseBlogUrl, abortAll });
})();
