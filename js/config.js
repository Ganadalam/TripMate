/* ─── config.js ─── */
"use strict";

const BASE_CONFIG = {
  // 🔐 API 키
  GOOGLE_API_KEY: "", // Google Maps & Places API
  KAKAO_API_KEY: "", // 레거시 (미사용)
  KAKAO_JS_KEY: "", // 레거시 (미사용)
  WEATHER_API_KEY: "",
  PUBLIC_DATA_KEY: "", // 한국관광공사 TourAPI (선택)

  // 🌐 CORS 프록시
  CORS_PROXY: "https://api.allorigins.win/get?url=",

  // 🔗 API 엔드포인트
  ENDPOINTS: Object.freeze({
    KAKAO_LOCAL: "https://dapi.kakao.com/v2/local/search/keyword.json",
    PUBLIC_EVENT: "http://175.125.91.94/openapi/feed/rss/theme",
    WEATHER: "https://api.openweathermap.org/data/2.5/weather",
    WEATHER_ICON: "https://openweathermap.org/img/wn",
  }),

  // 📍 지역 좌표
  REGION_COORDS: Object.freeze({
    서울: { lat: 37.5665, lng: 126.978, zoom: 13 },
    부산: { lat: 35.1796, lng: 129.0756, zoom: 13 },
    제주: { lat: 33.4996, lng: 126.5312, zoom: 12 },
    경주: { lat: 35.8562, lng: 129.2247, zoom: 13 },
    강릉: { lat: 37.7519, lng: 128.8761, zoom: 13 },
    전주: { lat: 35.8242, lng: 127.148, zoom: 13 },
    수원: { lat: 37.2636, lng: 127.0286, zoom: 13 },
    인천: { lat: 37.4563, lng: 126.7052, zoom: 12 },
    여수: { lat: 34.7604, lng: 127.6622, zoom: 13 },
    속초: { lat: 38.207, lng: 128.5918, zoom: 13 },
    "사용자 등록": { lat: 37.5665, lng: 126.978, zoom: 12 },
  }),

  // 🎯 카테고리 매핑
  CATEGORY_MAP: Object.freeze({
    먹방: ["FD6", "CE7"],
    힐링: ["AT4", "CT1"],
    문화: ["CT1", "AT4"],
    액티비티: ["AT4", "SW8"],
    카페투어: ["CE7", "FD6"],
    쇼핑: ["MT1", "CS2"],
    야경: ["AT4", "CT1"],
    자연: ["AT4", "PO3"],
  }),

  // 🌍 지역 영어명 (날씨 API용)
  REGION_EN: Object.freeze({
    서울: "Seoul,KR",
    부산: "Busan,KR",
    제주: "Jeju,KR",
    경주: "Gyeongju,KR",
    강릉: "Gangneung,KR",
    전주: "Jeonju,KR",
    수원: "Suwon,KR",
    인천: "Incheon,KR",
    여수: "Yeosu,KR",
    속초: "Sokcho,KR",
  }),

  // 🎨 UI 요소
  THEME_EMOJI: Object.freeze({
    먹방: "🍜",
    힐링: "🌿",
    문화: "🏛️",
    액티비티: "🏄",
    카페투어: "☕",
    쇼핑: "🛍️",
    야경: "🌙",
    자연: "🏔️",
    커스텀: "📎",
  }),

  MARKER_COLORS: ["#c4a360", "#d4b472", "#e8ca90", "#a07840", "#7a5c30"],

  RATING_LABELS: Object.freeze({
    1: "별로예요",
    2: "아쉬워요",
    3: "괜찮아요",
    4: "좋아요",
    5: "최고예요!",
  }),

  // ⚙️ 앱 설정
  FREE_ROUTE_LIMIT: 1,
  PREMIUM_KEY: "tm_premium_v1",
  TOAST_MS: 2800,
  SCROLL_THRESHOLD: 50,
  PLACES_PER_ROUTE: 5,
  ROUTES_PER_SEARCH: 4,
  WEATHER_CACHE_MS: 5 * 60 * 1000,
};

// 🔥 핵심: local 설정 덮어쓰기
window.CONFIG = Object.freeze({
  ...BASE_CONFIG,
  ...(window.CONFIG_LOCAL || {}),
});
