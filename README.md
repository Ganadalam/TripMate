# TripMate — 여행을 설계하다

> AI 기반 한국 여행 루트 큐레이션 · 장소별 사진 · 모임 · 커뮤니티 플랫폼

![TripMate Preview](assets/images/og/preview.png)

---

## 📌 Overview

TripMate는 카카오 로컬 API와 공공데이터 포털을 연동하여 지역·테마 기반 여행 루트를 자동 생성하고, 장소마다 큐레이션된 사진·날씨 정보·지도·커뮤니티 기능을 제공하는 싱글 페이지 애플리케이션(SPA)입니다.

---

## ✨ Features

| 기능 | 설명 |
|------|------|
| **루트 생성** | 지역 × 테마 조합으로 AI 큐레이션 루트 자동 생성 (카카오 로컬 API + 큐레이션 데이터 폴백) |
| **장소별 사진** | 장소명 기반 Unsplash 큐레이션 이미지 / 타입별 폴백 / 그라디언트 최후 폴백 |
| **갤러리 라이트박스** | 루트 내 모든 장소 사진을 갤러리로 탐색 |
| **카카오 지도** | 루트 장소 마커 + 커스텀 오버레이 + 사이드바 연동 |
| **날씨 정보** | OpenWeatherMap API 연동 + 7일 예보 + 여행 팁 |
| **블로그 파싱** | 네이버/티스토리 블로그 URL → 자동 루트 추출 (CORS 프록시) |
| **직접 등록** | 사용자 커스텀 루트 등록 |
| **행사·축제** | 공공데이터 포털 행사 API + 더미 데이터 폴백 |
| **모임** | 지역별 여행 동행 모임 생성·참여 |
| **커뮤니티** | 여행 후기·팁 게시판 (사진 업로드 지원) |
| **즐겨찾기** | 루트 저장 · 검색 · 지역/테마 필터링 |
| **리뷰** | 별점 + 텍스트 리뷰 (localStorage 저장) |
| **공유** | URL 복사 · 카카오 공유 · QR코드 생성 |
| **프리미엄** | 월간/연간 요금제 게이트 |
| **다크/라이트 모드** | CSS Custom Properties 기반 테마 전환 |
| **반응형** | 모바일 → 태블릿 → 데스크탑 완전 대응 |

---

## 🛠 Tech Stack

```
Frontend
├── HTML5 (Semantic)
├── SCSS (7-1 Architecture → compiled CSS)
│   ├── abstracts/  — variables, mixins
│   ├── base/       — reset, animations
│   ├── themes/     — dark / light tokens
│   ├── layout/     — header, nav, pages
│   └── components/ — all UI components
├── Vanilla JS (ES6+ Modules)
└── jQuery 3.7.1    — Ajax, DOM, animations

APIs
├── 카카오 로컬 API   — 장소 검색
├── 카카오 지도 SDK   — 지도 렌더링
├── OpenWeatherMap   — 날씨
└── 공공데이터 포털   — 행사·축제

Image CDN
└── Unsplash        — 장소별 큐레이션 (API Key 불필요)
```

---

## 📁 Project Structure

```
TripMate/
├── index.html              # 진입점 (SPA)
├── css/
│   └── main.css            # SCSS 컴파일 결과
├── scss/                   # SCSS 소스 (7-1 패턴)
│   ├── main.scss
│   ├── abstracts/
│   │   ├── _variables.scss
│   │   └── _mixins.scss
│   ├── base/
│   │   └── _reset.scss     # reset + @keyframes
│   ├── themes/
│   │   └── _themes.scss    # dark / light tokens
│   ├── layout/
│   │   ├── _layout.scss    # header, nav, cursor, preloader
│   │   └── _pages.scss     # hero, page system, responsive
│   └── components/
│       └── _components.scss
├── js/
│   ├── config.js           # API 키, 엔드포인트, 상수
│   ├── data.js             # 10개 지역 × 전 테마 더미 데이터
│   ├── images.js           # 장소별 Unsplash 이미지 매핑
│   ├── storage.js          # localStorage 추상화 레이어
│   ├── api.js              # jQuery Ajax 기반 API (카카오, 공공데이터)
│   ├── parser.js           # 블로그 URL 파싱
│   ├── map.js              # 카카오 지도 컨트롤러
│   ├── weather.js          # 날씨 패널
│   ├── review.js           # 별점 리뷰 시스템
│   ├── share.js            # URL/카카오/QR 공유
│   ├── meetup.js           # 모임 CRUD
│   ├── community.js        # 커뮤니티 게시판
│   ├── ui.js               # UI 렌더러 (카드, 모달, 갤러리)
│   ├── premium.js          # 프리미엄 게이트
│   └── app.js              # SPA 컨트롤러 (init, 라우팅)
├── assets/
│   └── images/             # OG 이미지, 기타 정적 에셋
├── package.json
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start

### 1. 클론 & 설치
```bash
git clone https://github.com/your-name/tripmate.git
cd tripmate
npm install
```

### 2. SCSS 빌드
```bash
# 개발 (소스맵 포함, 감시 모드)
npm run sass:watch

# 프로덕션 (압축, 소스맵 제거)
npm run build
```

### 3. API 키 설정
`js/config.js`의 플레이스홀더를 실제 키로 교체:
```js
KAKAO_API_KEY:   'your_kakao_rest_api_key',
KAKAO_JS_KEY:    'your_kakao_js_key',
WEATHER_API_KEY: 'your_openweathermap_api_key',
PUBLIC_DATA_KEY: 'your_public_data_service_key',
```
> ⚠️ API 키는 절대 커밋하지 마세요. `js/config.local.js`를 활용하거나 환경변수로 주입하세요.

### 4. 로컬 서버
```bash
# VS Code Live Server, Python, Node 등 어떤 서버든 가능
python3 -m http.server 3000
# → http://localhost:3000
```

---

## 🔑 API Key 발급 가이드

| API | 발급처 | 비고 |
|-----|--------|------|
| 카카오 로컬 / 지도 | [Kakao Developers](https://developers.kakao.com) | REST API 키 + JS 키 |
| OpenWeatherMap | [openweathermap.org](https://openweathermap.org/api) | 무료 플랜 가능 |
| 공공데이터 포털 | [data.go.kr](https://www.data.go.kr) | 한국관광공사 행사정보 API |

> API 키 없이도 **큐레이션 더미 데이터**로 모든 기능을 미리보기할 수 있습니다.

---

## 🎨 Design System

| 토큰 | 값 |
|------|----|
| 디스플레이 폰트 | Cormorant Garamond |
| 바디 폰트 | Outfit |
| 주요 색상 | `#c4a360` (Antique Gold) |
| 배경 (dark) | `#06080c` ~ `#1d2335` |
| 배경 (light) | `#f8f6f2` ~ `#dbd4c8` |
| 컨테이너 최대 폭 | 1280px |

컬러/타이포/스페이싱 토큰은 모두 CSS Custom Properties로 관리되며, `scss/themes/_themes.scss`에서 다크/라이트 모드를 분리 정의합니다.

---

## 📱 Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |
| Mobile Safari | 14+ |
| Samsung Internet | 14+ |

---

## 🗺 Supported Regions & Themes

**지역 (10):** 서울 · 부산 · 제주 · 경주 · 강릉 · 전주 · 여수 · 속초 · 수원 · 인천

**테마 (8):** 먹방 · 카페투어 · 힐링 · 문화 · 야경 · 자연 · 액티비티 · 쇼핑

---

## 📄 License

MIT — 포트폴리오 및 학습 목적 자유 사용 가능.  
상업적 사용 시 사용된 API의 이용약관을 준수하세요.

---

<p align="center">Made with ☕ and 🗺 in Korea</p>
