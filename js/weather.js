/* ─── weather.js — 날씨 위젯 ─── */
'use strict';

const Weather = (() => {
  const _cache = {};

  const DUMMY = {
    '서울': {temp:18,feels:16,desc:'맑음',icon:'01d',humidity:45,wind:2.3,city:'서울'},
    '부산': {temp:21,feels:20,desc:'구름조금',icon:'02d',humidity:60,wind:3.1,city:'부산'},
    '제주': {temp:23,feels:22,desc:'맑음',icon:'01d',humidity:65,wind:4.5,city:'제주'},
    '경주': {temp:17,feels:15,desc:'흐림',icon:'03d',humidity:55,wind:1.8,city:'경주'},
    '강릉': {temp:16,feels:14,desc:'맑음',icon:'01d',humidity:50,wind:2.7,city:'강릉'},
    '전주': {temp:19,feels:18,desc:'구름많음',icon:'04d',humidity:58,wind:2.0,city:'전주'},
    '여수': {temp:22,feels:21,desc:'맑음',icon:'01d',humidity:62,wind:3.8,city:'여수'},
    '속초': {temp:15,feels:13,desc:'구름조금',icon:'02d',humidity:52,wind:4.0,city:'속초'},
    '수원': {temp:17,feels:15,desc:'맑음',icon:'01d',humidity:48,wind:2.2,city:'수원'},
    '인천': {temp:16,feels:14,desc:'연무',icon:'50d',humidity:70,wind:3.5,city:'인천'},
  };

  const DUMMY_7DAY = ['월','화','수','목','금','토','일'].map((d,i)=>({
    day: d,
    icon: ['01d','02d','10d','01d','03d','01d','02d'][i],
    high: 18+Math.round(Math.random()*6),
    low:  10+Math.round(Math.random()*4),
  }));

  function _tip(d) {
    if (d.icon?.startsWith('09')||d.icon?.startsWith('10')||d.icon?.startsWith('11'))
      return '오늘은 우산이 필수예요! 실내 관광지 위주로 일정을 짜보세요.';
    if (d.icon?.startsWith('13')) return '눈이 내려요. 이동 시 안전에 유의하세요.';
    if (d.temp>=30) return '무더운 날씨예요. 충분한 수분 섭취와 그늘을 찾아 이동하세요.';
    if (d.temp<=5)  return '쌀쌀해요! 따뜻하게 입고 실내 명소를 활용해보세요.';
    if (d.icon?.startsWith('01')&&d.temp>=15&&d.temp<=26) return '야외 활동하기 완벽한 날씨예요! ☀️';
    return '';
  }

  function _iconEmoji(icon) {
    if (!icon) return '🌤️';
    const m = {'01':'☀️','02':'🌤️','03':'☁️','04':'☁️','09':'🌧️','10':'🌧️','11':'⛈️','13':'❄️','50':'🌫️'};
    return m[icon.slice(0,2)]||'🌤️';
  }

  async function fetch(region) {
    const cached=_cache[region];
    if (cached&&Date.now()-cached.ts<CONFIG.WEATHER_CACHE_MS) return cached.data;
    if (CONFIG.WEATHER_API_KEY==='YOUR_OPENWEATHERMAP_KEY') {
      const data=DUMMY[region]||{temp:18,feels:16,desc:'맑음',icon:'01d',humidity:50,wind:2.0,city:region};
      _cache[region]={data,ts:Date.now()}; return data;
    }
    try {
      const res=await $.ajax({
        url:CONFIG.ENDPOINTS.WEATHER, type:'GET', timeout:6000,
        data:{q:CONFIG.REGION_EN[region]||`${region},KR`, appid:CONFIG.WEATHER_API_KEY, units:'metric', lang:'kr'},
      });
      const data={
        temp:Math.round(res.main.temp), feels:Math.round(res.main.feels_like),
        desc:res.weather[0]?.description||'', icon:res.weather[0]?.icon||'01d',
        humidity:res.main.humidity, wind:res.wind?.speed||0, city:res.name,
      };
      _cache[region]={data,ts:Date.now()}; return data;
    } catch(_) {
      return DUMMY[region]||{temp:18,feels:16,desc:'맑음',icon:'01d',humidity:50,wind:2.0,city:region};
    }
  }

  function buildHTML(data, region) {
    const iconUrl=`${CONFIG.ENDPOINTS.WEATHER_ICON}/${data.icon}@2x.png`;
    const wind=(data.wind*3.6).toFixed(1);
    const tip=_tip(data);
    const days7=DUMMY_7DAY.map(d=>`
      <div class="wp-day">
        <span class="wp-day-name">${d.day}</span>
        <span class="wp-day-icon">${_iconEmoji(d.icon)}</span>
        <span class="wp-day-range"><span class="wp-day-high">${d.high}°</span><span class="wp-day-low">${d.low}°</span></span>
      </div>`).join('');
    return `
      <div class="weather-panel-inner">
        <div class="wp-city">${data.city||region} 날씨</div>
        <div class="wp-main">
          <img class="wp-icon" src="${iconUrl}" alt="${data.desc}"
               onerror="this.style.display='none';this.nextSibling.style.display='block'">
          <span style="display:none;font-size:48px">${_iconEmoji(data.icon)}</span>
          <div>
            <div class="wp-temp">${data.temp}°</div>
            <div class="wp-feels">체감 ${data.feels}°</div>
            <div class="wp-desc">${data.desc}</div>
          </div>
        </div>
        <div class="wp-details">
          <div class="wp-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a7 7 0 017 7c0 5.25-7 13-7 13S5 14.25 5 9a7 7 0 017-7z"/></svg>
            습도 ${data.humidity}%
          </div>
          <div class="wp-detail">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>
            바람 ${wind}km/h
          </div>
        </div>
        ${tip?`<div class="wp-tip"><span class="wp-tip-icon">💡</span><span>${tip}</span></div>`:''}
        <div class="wp-7day">
          <div class="wp-7day-title">7일 예보</div>
          <div class="wp-7day-list">${days7}</div>
        </div>
      </div>`;
  }

  async function renderInto(containerId, region) {
    const $el=$(`#${containerId}`); if (!$el.length) return;
    $el.html('<div style="display:flex;align-items:center;justify-content:center;padding:40px"><div class="spinner-ring" style="width:28px;height:28px"></div></div>');
    try {
      const data=await fetch(region);
      $el.html(buildHTML(data, region));
    } catch(_) {
      $el.html('<p style="color:var(--tx-3);font-size:13px;padding:20px">날씨 정보를 불러올 수 없어요</p>');
    }
  }

  return Object.freeze({ fetch, renderInto });
})();
