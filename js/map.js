/* ─── map.js — 카카오맵 + Leaflet 자동 폴백 ─── */
'use strict';

const MapModule = (() => {
  let _loaded = false, _useKakao = false;
  let _map = null, _markers = [], _overlays = [], _poly = null, _iw = null, _cluster = null;
  let _lfMap = null, _lfMarkers = [], _lfPoly = null;
  let _curRoute = null;

  const DUMMY_COORDS = {
    '서울': [{lat:37.5704,lng:126.9920},{lat:37.5665,lng:126.9780},{lat:37.5800,lng:126.9770},{lat:37.5279,lng:126.9877},{lat:37.5510,lng:126.9882}],
    '부산': [{lat:35.1014,lng:129.0261},{lat:35.1585,lng:129.1603},{lat:35.0763,lng:129.0765},{lat:35.1040,lng:129.0325},{lat:35.1412,lng:129.1145}],
    '제주': [{lat:33.5104,lng:126.5220},{lat:33.2540,lng:126.5604},{lat:33.3950,lng:126.2404},{lat:33.4580,lng:126.9392},{lat:33.3610,lng:126.5271}],
    '경주': [{lat:35.8400,lng:129.2094},{lat:35.7942,lng:129.3337},{lat:35.8450,lng:129.2254},{lat:35.8350,lng:129.2250},{lat:35.8370,lng:129.2086}],
    '강릉': [{lat:37.7550,lng:128.8750},{lat:37.7900,lng:128.9172},{lat:37.7508,lng:128.8760},{lat:37.8039,lng:128.9171},{lat:37.7600,lng:128.8800}],
    '전주': [{lat:35.8150,lng:127.1530},{lat:35.8200,lng:127.1480},{lat:35.8100,lng:127.1550},{lat:35.8250,lng:127.1420},{lat:35.8180,lng:127.1600}],
    '여수': [{lat:34.7600,lng:127.6620},{lat:34.7450,lng:127.7610},{lat:34.7380,lng:127.6840},{lat:34.7700,lng:127.6500},{lat:34.7550,lng:127.7100}],
    '속초': [{lat:38.2070,lng:128.5918},{lat:38.2200,lng:128.6000},{lat:38.1950,lng:128.5800},{lat:38.2300,lng:128.5950},{lat:38.2100,lng:128.5700}],
    '수원': [{lat:37.2636,lng:127.0286},{lat:37.2880,lng:127.0160},{lat:37.2580,lng:127.0000},{lat:37.2750,lng:127.0400},{lat:37.2500,lng:127.0150}],
    '인천': [{lat:37.4563,lng:126.7052},{lat:37.4750,lng:126.6180},{lat:37.4680,lng:126.6380},{lat:37.4400,lng:126.6700},{lat:37.4900,lng:126.7200}],
  };

  async function _loadLeaflet() {
    if (window.L) return true;
    return new Promise(res => {
      if (!document.querySelector('link[href*="leaflet"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = () => { _injectLeafletStyles(); res(true); };
      s.onerror = () => res(false);
      document.head.appendChild(s);
    });
  }

  function _injectLeafletStyles() {
    if (document.getElementById('tm-lf-css')) return;
    const style = document.createElement('style');
    style.id = 'tm-lf-css';
    style.textContent = `
      .tm-lf-pin{display:flex;flex-direction:column;align-items:center;cursor:pointer}
      .tm-lf-circle{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#000;font-weight:700;font-size:13px;box-shadow:0 3px 12px rgba(0,0,0,.5);border:2.5px solid rgba(255,255,255,.85);transition:transform .15s}
      .tm-lf-circle:hover{transform:scale(1.2)}
      .tm-lf-label{margin-top:4px;background:rgba(0,0,0,.78);color:#fff;font-size:10px;padding:2px 7px;border-radius:8px;white-space:nowrap;max-width:100px;overflow:hidden;text-overflow:ellipsis;backdrop-filter:blur(4px)}
      .leaflet-popup-content-wrapper{border-radius:10px!important;box-shadow:0 6px 24px rgba(0,0,0,.3)!important}
      .leaflet-popup-content{margin:12px 14px!important;font-family:inherit}
      .lf-popup-title{font-weight:700;font-size:14px;margin-bottom:4px}
      .lf-popup-addr{color:#888;font-size:12px}
      .lf-popup-type{color:#c4a360;font-size:11px;margin-top:4px;display:inline-block}
      .lf-popup-link{display:inline-block;margin-top:6px;color:#c4a360;font-size:12px;text-decoration:none}
      .lf-popup-link:hover{text-decoration:underline}
    `;
    document.head.appendChild(style);
  }

  async function load() {
    if (_loaded) return;
    if (window.kakao?.maps?.load) {
      await new Promise(res => kakao.maps.load(() => { _useKakao = true; _loaded = true; res(); }));
      return;
    }
    if (!CONFIG.KAKAO_JS_KEY || CONFIG.KAKAO_JS_KEY === 'YOUR_KAKAO_JS_KEY') {
      _loaded = true; return;
    }
    await new Promise(res => {
      const timer = setTimeout(() => { _loaded = true; res(); }, 7000);
      const s = document.createElement('script');
      s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${CONFIG.KAKAO_JS_KEY}&libraries=services,clusterer&autoload=false`;
      s.onload = () => { kakao.maps.load(() => { clearTimeout(timer); _useKakao = true; _loaded = true; res(); }); };
      s.onerror = () => { clearTimeout(timer); _loaded = true; res(); };
      document.head.appendChild(s);
    });
  }

  async function init(containerId, region) {
    await load();
    const el = document.getElementById(containerId);
    if (!el) return false;
    if (_useKakao && window.kakao?.maps) return _initKakao(el, region);
    return await _initLeaflet(el, region);
  }

  function _initKakao(el, region) {
    const c = CONFIG.REGION_COORDS[region] || {lat:37.5665,lng:126.9780,zoom:13};
    _map = new kakao.maps.Map(el, { center: new kakao.maps.LatLng(c.lat, c.lng), level: c.zoom || 13 });
    _map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
    _map.addControl(new kakao.maps.MapTypeControl(), kakao.maps.ControlPosition.TOPRIGHT);
    if (kakao.maps.MarkerClusterer) {
      _cluster = new kakao.maps.MarkerClusterer({
        map: _map, averageCenter: true, minLevel: 5,
        styles:[{width:'40px',height:'40px',background:'rgba(196,163,96,0.9)',borderRadius:'50%',color:'#000',textAlign:'center',lineHeight:'40px',fontSize:'12px',fontWeight:'700'}],
      });
    }
    return true;
  }

  async function _initLeaflet(el, region) {
    const ok = await _loadLeaflet();
    if (!ok) { _dummy(el, region); return false; }
    const c = CONFIG.REGION_COORDS[region] || {lat:37.5665,lng:126.9780,zoom:13};
    if (_lfMap) { try { _lfMap.remove(); } catch(e){} _lfMap = null; }
    el.innerHTML = '';
    _lfMap = L.map(el, { zoomControl: true }).setView([c.lat, c.lng], c.zoom || 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(_lfMap);
    return true;
  }

  async function render(route, containerId, sidebarId) {
    _curRoute = route; clear();
    const coords = await _coords(route);
    _sidebar(route, sidebarId, coords);
    if (_useKakao && _map) _renderKakao(route, coords, sidebarId);
    else if (_lfMap) _renderLeaflet(route, coords, sidebarId);
  }

  function _renderKakao(route, coords, sidebarId) {
    const pos = coords.map(c => new kakao.maps.LatLng(c.lat, c.lng));
    pos.forEach((p, i) => {
      const color = CONFIG.MARKER_COLORS[i] || '#c4a360';
      const pl = route.places[i];
      const ov = new kakao.maps.CustomOverlay({
        position: p,
        content: `<div class="tm-pin" data-i="${i}" style="--c:${color}"><div class="tm-pin-circle" style="background:${color}"><span>${i+1}</span></div><div class="tm-pin-label">${_e(pl.name.slice(0,10))}</div></div>`,
        yAnchor: 1.4,
      });
      ov.setMap(_map); _overlays.push(ov);
    });
    $(document).off('click.mappin').on('click.mappin', '.tm-pin', function() {
      const i = parseInt($(this).data('i'));
      if (!pos[i]) return;
      _openKakaoIW(pos[i], route.places[i], i);
      $(`#${sidebarId} .ms-item`).removeClass('active');
      $(`#${sidebarId} .ms-item[data-i="${i}"]`).addClass('active');
    });
    _poly = new kakao.maps.Polyline({ path: pos, strokeWeight: 2.5, strokeColor: '#c4a360', strokeOpacity: .65, strokeStyle: 'dashed' });
    _poly.setMap(_map);
    if (pos.length > 1) { const b = new kakao.maps.LatLngBounds(); pos.forEach(p => b.extend(p)); _map.setBounds(b, 80); }
    else if (pos.length === 1) _map.setCenter(pos[0]);
    if (_cluster) { _markers = pos.map(p => new kakao.maps.Marker({ position: p })); _cluster.addMarkers(_markers); }
  }

  function _renderLeaflet(route, coords, sidebarId) {
    if (!_lfMap) return;
    const latLngs = [];
    coords.forEach((c, i) => {
      const color = CONFIG.MARKER_COLORS[i] || '#c4a360';
      const pl = route.places[i];
      const ll = L.latLng(c.lat, c.lng);
      latLngs.push(ll);
      const icon = L.divIcon({
        html: `<div class="tm-lf-pin"><div class="tm-lf-circle" style="background:${color}">${i+1}</div><div class="tm-lf-label">${_e(pl.name.slice(0,12))}</div></div>`,
        className: '', iconSize:[80,52], iconAnchor:[40,52], popupAnchor:[0,-52],
      });
      const popup = `<div><div class="lf-popup-title">${_e(pl.name)}</div><div class="lf-popup-addr">📍 ${_e(pl.address||route.region)}</div>${pl.type?`<span class="lf-popup-type">• ${_e(pl.type)}</span>`:''}${pl.url?`<a class="lf-popup-link" href="${pl.url}" target="_blank" rel="noopener">카카오맵 →</a>`:''}</div>`;
      const marker = L.marker(ll, { icon }).addTo(_lfMap).bindPopup(popup, { maxWidth: 220 });
      marker.on('click', () => {
        $(`#${sidebarId} .ms-item`).removeClass('active');
        $(`#${sidebarId} .ms-item[data-i="${i}"]`).addClass('active');
      });
      _lfMarkers.push(marker);
    });
    if (latLngs.length > 1) {
      _lfPoly = L.polyline(latLngs, { color:'#c4a360', weight:2.5, opacity:.65, dashArray:'8 6' }).addTo(_lfMap);
      _lfMap.fitBounds(_lfPoly.getBounds(), { padding:[50,50] });
    } else if (latLngs.length === 1) { _lfMap.setView(latLngs[0], 15); }
  }

  async function _coords(route) {
    if (route.places[0]?.lat) return route.places.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
    if (_useKakao && window.kakao?.maps?.services) {
      const gc = new kakao.maps.services.Geocoder();
      return Promise.all(route.places.map(p => _geocodeKakao(gc, p, route.region)));
    }
    return _nominatimCoords(route);
  }

  async function _nominatimCoords(route) {
    const base = DUMMY_COORDS[route.region] || DUMMY_COORDS['서울'];
    const results = await Promise.allSettled(
      route.places.map(async (p, i) => {
        try {
          const q = encodeURIComponent(`${p.name} ${route.region}`);
          const resp = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&countrycodes=kr&format=json&limit=1`, { headers: { 'Accept-Language':'ko', 'User-Agent':'TripMateApp/1.0' } });
          const data = await resp.json();
          if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        } catch {}
        return base[i] || _offset(route.region);
      })
    );
    return results.map((r, i) => r.status === 'fulfilled' ? r.value : (base[i] || _offset(route.region)));
  }

  function _geocodeKakao(gc, pl, region) {
    return new Promise(res => {
      const fb = () => {
        const ps = new kakao.maps.services.Places();
        ps.keywordSearch(`${region} ${pl.name}`, (r, s) => {
          if (s === kakao.maps.services.Status.OK && r[0]) res({ lat: parseFloat(r[0].y), lng: parseFloat(r[0].x) });
          else res(_offset(region));
        });
      };
      if (!pl.address || pl.address.length < 5) { fb(); return; }
      gc.addressSearch(pl.address, (r, s) => {
        if (s === kakao.maps.services.Status.OK && r[0]) res({ lat: parseFloat(r[0].y), lng: parseFloat(r[0].x) });
        else fb();
      });
    });
  }

  function _offset(region) {
    const c = CONFIG.REGION_COORDS[region] || { lat: 37.5665, lng: 126.9780 };
    return { lat: c.lat + (Math.random() - .5) * .04, lng: c.lng + (Math.random() - .5) * .04 };
  }

  function _openKakaoIW(pos, pl, i) {
    if (_iw) _iw.close();
    const color = CONFIG.MARKER_COLORS[i] || '#c4a360';
    _iw = new kakao.maps.InfoWindow({
      content: `<div class="tm-iw"><div class="tm-iw-num" style="background:${color}">${i+1}</div><div><strong>${_e(pl.name)}</strong><span>${_e(pl.address||'')}</span><span style="color:var(--g400)">${_e(pl.type||'')}</span></div></div>`,
      removable: true,
    });
    _iw.open(_map, new kakao.maps.Marker({ position: pos }));
  }

  function _sidebar(route, sid, coords) {
    const $sb = $(`#${sid}`); if (!$sb.length) return;
    const items = route.places.map((p, i) => {
      const color = CONFIG.MARKER_COLORS[i] || '#c4a360';
      return `<div class="ms-item" data-i="${i}" tabindex="0">
        <div class="ms-num" style="background:${color}">${i+1}</div>
        <div class="ms-info"><div class="ms-name">${_e(p.name)}</div><div class="ms-addr">${_e(p.address||p.type||'')}</div></div>
        ${p.url?`<a class="ms-ext" href="${p.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`:''}
      </div>`;
    }).join('');
    $sb.html(`<div class="ms-head"><span class="ms-emoji">${route.emoji}</span><div><div class="ms-title">${_e(route.title)}</div><div class="ms-sub">${route.places.length}개 장소 · ${_e(route.region)}</div></div></div><div class="ms-list">${items}</div>`);
    $sb.find('.ms-item').on('click', function() {
      const i = parseInt($(this).data('i'));
      if (_useKakao && _map && coords[i]) {
        const p = new kakao.maps.LatLng(coords[i].lat, coords[i].lng);
        _map.panTo(p); _map.setLevel(3); _openKakaoIW(p, route.places[i], i);
      } else if (_lfMap && coords[i]) {
        _lfMap.setView([coords[i].lat, coords[i].lng], 16, { animate: true });
        _lfMarkers[i]?.openPopup();
      }
      $sb.find('.ms-item').removeClass('active'); $(this).addClass('active');
    }).on('keydown', function(e) { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); $(this).trigger('click'); } });
  }

  function _dummy(el, region) {
    if (!el) return;
    const c = CONFIG.REGION_COORDS[region] || { lat: 37.5665, lng: 126.9780 };
    el.innerHTML = `<div class="map-dummy"><div class="map-dummy-icon">🗺️</div><p><strong>${_e(region)} 지도</strong></p><p>지도를 불러오지 못했어요</p><code style="font-size:11px;color:var(--tx-3);margin-top:8px;display:block">위도 ${c.lat} / 경도 ${c.lng}</code></div>`;
  }

  function clear() {
    $(document).off('click.mappin');
    _markers.forEach(m => m.setMap?.(null)); _overlays.forEach(o => o.setMap?.(null));
    _markers = []; _overlays = [];
    if (_poly) { _poly.setMap(null); _poly = null; }
    if (_iw) { _iw.close(); _iw = null; }
    if (_cluster) _cluster.clear();
    _lfMarkers.forEach(m => { try { m.remove(); } catch(e){} }); _lfMarkers = [];
    if (_lfPoly) { try { _lfPoly.remove(); } catch(e){} _lfPoly = null; }
  }

  function relayout() {
    _map?.relayout?.();
    if (_lfMap) setTimeout(() => { try { _lfMap.invalidateSize(); } catch(e){} }, 80);
  }

  function _e(s) { return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c])); }

  return Object.freeze({ load, init, render, clear, relayout });
})();
