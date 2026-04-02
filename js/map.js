/* ─── map.js — Google Maps API (AdvancedMarkerElement + async loading) ─── */
'use strict';

const MapModule = (() => {
  const GOOGLE_API_KEY = 'AIzaSyDYVXjaS6HNuJFXjkoXX5oZKAmlN29nucE';

  let _map = null, _markers = [], _poly = null, _infoWindow = null;
  let _loaded = false, _loadPromise = null;

  /* ── Google Maps SDK 비동기 로드 (권장 방식) ── */
  function _loadGoogleMaps() {
    if (_loadPromise) return _loadPromise;
    _loadPromise = new Promise((resolve, reject) => {
      if (window.google?.maps?.marker?.AdvancedMarkerElement) { resolve(); return; }

      // 이미 로드 중인 경우 콜백 대기
      if (window.google?.maps) {
        // core는 있지만 marker 라이브러리가 없을 수 있음 → importLibrary 사용
        window.google.maps.importLibrary('marker')
          .then(() => resolve())
          .catch(reject);
        return;
      }

      const callbackName = '__gmInit_' + Date.now();
      window[callbackName] = async () => {
        delete window[callbackName];
        try {
          await window.google.maps.importLibrary('marker');
          resolve();
        } catch (e) { reject(e); }
      };

      const s = document.createElement('script');
      // loading=async 추가 → 권장 로딩 패턴
      s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places,geometry,marker&callback=${callbackName}&loading=async&language=ko`;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error('Google Maps 스크립트 로드 실패'));
      document.head.appendChild(s);
    });
    return _loadPromise;
  }

  async function load() {
    if (_loaded) return;
    try {
      await _loadGoogleMaps();
      _loaded = true;
    } catch (e) {
      console.error('[MapModule] Google Maps 로드 실패:', e);
      _loaded = true;
    }
  }

  async function init(containerId, region) {
    await load();
    const el = document.getElementById(containerId);
    if (!el) return false;
    if (!window.google?.maps) { _dummy(el, region); return false; }

    clear();
    el.innerHTML = '';

    const c = CONFIG.REGION_COORDS[region] || { lat: 37.5665, lng: 126.9780, zoom: 13 };

    // mapId 필수 (AdvancedMarkerElement 사용 조건)
    _map = new google.maps.Map(el, {
      center: { lat: c.lat, lng: c.lng },
      zoom: c.zoom || 13,
      mapId: 'TRIPMATE_DARK_MAP',
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        position: google.maps.ControlPosition.TOP_RIGHT,
      },
      zoomControl: true,
      zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_CENTER },
      streetViewControl: false,
      fullscreenControl: true,
      styles: _darkStyle(),
    });

    _infoWindow = new google.maps.InfoWindow();
    return true;
  }

  async function render(route, containerId, sidebarId) {
    clear();
    if (!_map) {
      const ok = await init(containerId, route.region);
      if (!ok) return;
    }
    const coords = await _resolveCoords(route);
    _renderSidebar(route, sidebarId, coords);
    _renderMarkers(route, coords, sidebarId);
    _renderPolyline(coords);
    _fitBounds(coords);
  }

  /* ── 좌표 확보 ── */
  async function _resolveCoords(route) {
    if (route.places[0]?.lat) {
      return route.places.map(p => ({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }));
    }
    if (!window.google?.maps) return _fallbackCoords(route);
    return Promise.all(route.places.map((p, i) => _geocodePlace(p, route.region, i)));
  }

  function _geocodePlace(place, region, index) {
    return new Promise(resolve => {
      if (!window.google?.maps?.Geocoder) { resolve(_offsetCoord(region, index)); return; }
      const geocoder = new google.maps.Geocoder();
      const query = place.address?.length > 5 ? place.address : `${place.name} ${region}`;
      geocoder.geocode({ address: query, region: 'KR' }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const loc = results[0].geometry.location;
          resolve({ lat: loc.lat(), lng: loc.lng() });
        } else {
          _placesSearch(place, region, index).then(resolve);
        }
      });
    });
  }

  function _placesSearch(place, region, index) {
    return new Promise(resolve => {
      if (!window.google?.maps?.places?.PlacesService) { resolve(_offsetCoord(region, index)); return; }
      const svc = new google.maps.places.PlacesService(document.createElement('div'));
      svc.findPlaceFromQuery(
        { query: `${place.name} ${region}`, fields: ['geometry'] },
        (results, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(_offsetCoord(region, index));
          }
        }
      );
    });
  }

  function _offsetCoord(region, index) {
    const c = CONFIG.REGION_COORDS[region] || { lat: 37.5665, lng: 126.9780 };
    const angle = (index / 5) * 2 * Math.PI;
    return { lat: c.lat + Math.cos(angle) * 0.012, lng: c.lng + Math.sin(angle) * 0.012 };
  }

  function _fallbackCoords(route) {
    return route.places.map((_, i) => _offsetCoord(route.region, i));
  }

  /* ── AdvancedMarkerElement 마커 렌더링 ── */
  function _renderMarkers(route, coords, sidebarId) {
    const AdvancedMarkerElement = google.maps.marker?.AdvancedMarkerElement;

    coords.forEach((coord, i) => {
      const place = route.places[i];
      const color = CONFIG.MARKER_COLORS[i] || '#c4a360';

      let marker;

      if (AdvancedMarkerElement) {
        // ✅ 신규 권장 방식
        const pin = document.createElement('div');
        pin.className = 'gm-adv-pin';
        pin.style.cssText = `
          width:34px; height:34px; border-radius:50%;
          background:${color}; border:2.5px solid rgba(255,255,255,.85);
          display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:13px; color:#000;
          box-shadow:0 3px 12px rgba(0,0,0,.5);
          cursor:pointer; user-select:none;
        `;
        pin.textContent = String(i + 1);

        marker = new AdvancedMarkerElement({
          position: coord,
          map: _map,
          title: place.name,
          content: pin,
          zIndex: 100 + i,
        });

        marker.addListener('click', () => {
          _openInfoWindow(coord, place, i);
          _highlightSidebarItem(sidebarId, i);
        });
      } else {
        // 폴백: 기존 Marker (구버전 브라우저)
        marker = new google.maps.Marker({
          position: coord, map: _map, title: place.name,
          label: { text: String(i+1), color:'#000', fontWeight:'bold', fontSize:'13px' },
          icon: { path: google.maps.SymbolPath.CIRCLE, scale:16, fillColor:color, fillOpacity:1, strokeColor:'rgba(255,255,255,.85)', strokeWeight:2.5 },
          zIndex: 100 + i,
        });
        marker.addListener('click', () => {
          _openInfoWindow(coord, place, i, marker);
          _highlightSidebarItem(sidebarId, i);
        });
      }

      _markers.push({ marker, coord, place, index: i });
    });
  }

  function _openInfoWindow(coord, place, index, anchorOverride) {
    const color = CONFIG.MARKER_COLORS[index] || '#c4a360';
    const content = `
      <div style="font-family:inherit;min-width:180px;padding:4px 2px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="width:26px;height:26px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0;color:#000">${index+1}</div>
          <strong style="font-size:14px;color:#111">${_e(place.name)}</strong>
        </div>
        ${place.address ? `<div style="color:#666;font-size:12px;margin-bottom:4px">📍 ${_e(place.address)}</div>` : ''}
        ${place.type ? `<span style="color:${color};font-size:11px;background:${color}22;padding:2px 8px;border-radius:10px">${_e(place.type)}</span>` : ''}
        ${place.url ? `<a href="${place.url}" target="_blank" rel="noopener" style="display:block;margin-top:8px;color:${color};font-size:12px;text-decoration:none">지도에서 보기 →</a>` : ''}
      </div>`;
    _infoWindow.setContent(content);
    if (anchorOverride) {
      _infoWindow.open(_map, anchorOverride);
    } else {
      _infoWindow.setPosition(coord);
      _infoWindow.open(_map);
    }
  }

  function _highlightSidebarItem(sidebarId, index) {
    const $sb = $(`#${sidebarId}`);
    $sb.find('.ms-item').removeClass('active');
    $sb.find(`.ms-item[data-i="${index}"]`).addClass('active');
  }

  function _renderPolyline(coords) {
    if (coords.length < 2) return;
    _poly = new google.maps.Polyline({
      path: coords, geodesic: true,
      strokeColor: '#c4a360', strokeOpacity: 0.65, strokeWeight: 2.5,
      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 3 }, offset: '0', repeat: '16px' }],
    });
    _poly.setMap(_map);
  }

  function _fitBounds(coords) {
    if (!_map || !coords.length) return;
    if (coords.length === 1) { _map.setCenter(coords[0]); _map.setZoom(15); return; }
    const bounds = new google.maps.LatLngBounds();
    coords.forEach(c => bounds.extend(c));
    _map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
  }

  /* ── 사이드바 ── */
  function _renderSidebar(route, sid, coords) {
    const $sb = $(`#${sid}`);
    if (!$sb.length) return;
    const items = route.places.map((p, i) => {
      const color = CONFIG.MARKER_COLORS[i] || '#c4a360';
      return `<div class="ms-item" data-i="${i}" tabindex="0">
        <div class="ms-num" style="background:${color}">${i+1}</div>
        <div class="ms-info"><div class="ms-name">${_e(p.name)}</div><div class="ms-addr">${_e(p.address||p.type||'')}</div></div>
        ${p.url?`<a class="ms-ext" href="${p.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></a>`:''}
      </div>`;
    }).join('');
    $sb.html(`<div class="ms-head"><span class="ms-emoji">${route.emoji}</span><div><div class="ms-title">${_e(route.title)}</div><div class="ms-sub">${route.places.length}개 장소 · ${_e(route.region)}</div></div></div><div class="ms-list">${items}</div>`);
    $sb.find('.ms-item').on('click', function () {
      const i = parseInt($(this).data('i'));
      if (_map && coords[i]) {
        _map.panTo(coords[i]);
        _map.setZoom(16);
        _openInfoWindow(coords[i], route.places[i], i, _markers[i]?.marker);
      }
      $sb.find('.ms-item').removeClass('active');
      $(this).addClass('active');
    }).on('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $(this).trigger('click'); }
    });
  }

  function clear() {
    _markers.forEach(({ marker }) => {
      if (marker.map !== undefined) marker.map = null;  // AdvancedMarker
      else marker.setMap?.(null);                        // 구형 Marker
    });
    _markers = [];
    if (_poly) { _poly.setMap(null); _poly = null; }
    if (_infoWindow) _infoWindow.close();
  }

  function relayout() {
    if (_map) setTimeout(() => google.maps.event.trigger(_map, 'resize'), 80);
  }

  function _darkStyle() {
    return [
      { elementType:'geometry', stylers:[{color:'#1a1a2e'}] },
      { elementType:'labels.text.fill', stylers:[{color:'#a0a0b0'}] },
      { elementType:'labels.text.stroke', stylers:[{color:'#1a1a2e'}] },
      { featureType:'road', elementType:'geometry', stylers:[{color:'#2d2d44'}] },
      { featureType:'road.highway', elementType:'geometry', stylers:[{color:'#3d3d5c'}] },
      { featureType:'water', elementType:'geometry', stylers:[{color:'#0d1b2a'}] },
      { featureType:'poi', elementType:'geometry', stylers:[{color:'#22223a'}] },
      { featureType:'poi.park', elementType:'geometry', stylers:[{color:'#1a2a1a'}] },
      { featureType:'transit', elementType:'geometry', stylers:[{color:'#2f3048'}] },
      { featureType:'administrative', elementType:'geometry.stroke', stylers:[{color:'#4a4a6a'}] },
    ];
  }

  function _dummy(el, region) {
    const c = CONFIG.REGION_COORDS[region] || { lat:37.5665, lng:126.9780 };
    el.innerHTML = `<div class="map-dummy"><div class="map-dummy-icon">🗺️</div><p><strong>${_e(region)} 지도</strong></p><p>지도를 불러오지 못했어요</p></div>`;
  }

  function _e(s) {
    return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#x27;'}[c]));
  }

  return Object.freeze({ load, init, render, clear, relayout });
})();
