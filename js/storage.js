/* ─── storage.js v4 — Meetup + Community + Reviews + Favorites ─── */
'use strict';
const Storage = (() => {
  const K = {
    FAV:'tm4_fav', BOARD:'tm4_board', REVIEWS:'tm4_reviews',
    HISTORY:'tm4_history', THEME:'tm4_theme', PREMIUM:'tm4_premium',
    MEETUP:'tm4_meetup', SEARCH_CNT:'tm4_scnt', SEARCH_DATE:'tm4_sdate',
  };
  function _r(k){ try{return JSON.parse(localStorage.getItem(k))??null;}catch{return null;} }
  function _w(k,v){ try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;} }

  const Fav = {
    all()    { return _r(K.FAV)??[]; },
    count()  { return this.all().length; },
    has(id)  { return this.all().some(r=>r.id===id); },
    add(r)   { if(this.has(r.id))return false; const l=this.all(); l.unshift({...r,savedAt:new Date().toISOString()}); return _w(K.FAV,l); },
    remove(id){ return _w(K.FAV,this.all().filter(r=>r.id!==id)); },
    clear()  { return _w(K.FAV,[]); },
  };

  const Board = {
    all(){ return (_r(K.BOARD)??[]).sort((a,b)=>new Date(b.at)-new Date(a.at)); },
    add(d){ const l=_r(K.BOARD)??[]; const p={id:`bp-u-${Date.now()}`,likes:0,...d,at:new Date().toISOString()}; l.push(p); _w(K.BOARD,l); return p; },
    remove(id){ return _w(K.BOARD,(_r(K.BOARD)??[]).filter(p=>p.id!==id)); },
  };

  const Reviews = {
    byRoute(rid){ return ((_r(K.REVIEWS)??{})[rid]??[]).slice().sort((a,b)=>new Date(b.at)-new Date(a.at)); },
    count(rid)  { return this.byRoute(rid).length; },
    avg(rid)    { const rs=this.byRoute(rid); return rs.length?rs.reduce((s,r)=>s+r.rating,0)/rs.length:0; },
    add(rid,d)  { const all=_r(K.REVIEWS)??{}; const list=all[rid]??[]; const rv={id:`rv-${Date.now()}`,rid,...d,at:new Date().toISOString()}; list.unshift(rv); all[rid]=list; _w(K.REVIEWS,all); return rv; },
    remove(rid,id){ const all=_r(K.REVIEWS)??{}; if(!all[rid])return; all[rid]=all[rid].filter(r=>r.id!==id); _w(K.REVIEWS,all); },
  };

  const History = {
    all()  { return _r(K.HISTORY)??[]; },
    add(region,theme){ const l=this.all().filter(h=>!(h.region===region&&h.theme===theme)); l.unshift({region,theme,at:Date.now()}); _w(K.HISTORY,l.slice(0,10)); },
    clear(){ _w(K.HISTORY,[]); },
  };

  const Theme = {
    get()  { return _r(K.THEME)??'dark'; },
    set(t) { _w(K.THEME,t); },
    toggle(){ const n=this.get()==='dark'?'light':'dark'; this.set(n); return n; },
  };

  const Meetup = {
    all()   { return (_r(K.MEETUP)??[]).sort((a,b)=>new Date(b.at)-new Date(a.at)); },
    add(d)  { const l=_r(K.MEETUP)??[]; const m={id:`mu-u-${Date.now()}`,joinCount:0,...d,at:new Date().toISOString()}; l.push(m); _w(K.MEETUP,l); return m; },
    join(id){ const l=_r(K.MEETUP)??[]; const m=l.find(x=>x.id===id); if(m)m.joinCount=(m.joinCount||0)+1; _w(K.MEETUP,l); },
    remove(id){ return _w(K.MEETUP,(_r(K.MEETUP)??[]).filter(m=>m.id!==id)); },
  };

  const SearchCounter = {
    _today(){ return new Date().toISOString().slice(0,10); },
    get(){ const t=this._today(); if(_r(K.SEARCH_DATE)!==t){_w(K.SEARCH_DATE,t);_w(K.SEARCH_CNT,0);} return _r(K.SEARCH_CNT)??0; },
    inc(){ _w(K.SEARCH_CNT,this.get()+1); },
    reset(){ _w(K.SEARCH_CNT,0); },
  };

  return Object.freeze({ Fav, Board, Reviews, History, Theme, Meetup, SearchCounter });
})();
