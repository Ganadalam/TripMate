/* ─── premium.js v4 ─── */
'use strict';
const Premium = (() => {
  let _on=false;
  function _load(){ try{ const d=JSON.parse(localStorage.getItem(CONFIG.PREMIUM_KEY)); if(!d){_on=false;return;} if(d.exp&&new Date(d.exp)<new Date()){localStorage.removeItem(CONFIG.PREMIUM_KEY);_on=false;return;} _on=!!d.active; }catch{_on=false;} }
  function _save(plan){ const exp=new Date(Date.now()+(plan==='yearly'?365:30)*864e5).toISOString(); localStorage.setItem(CONFIG.PREMIUM_KEY,JSON.stringify({active:true,plan,exp})); _on=true; }
  function isPremium(){ return _on; }
  function canSearch(){ return _on||Storage.SearchCounter.get()<CONFIG.FREE_ROUTE_LIMIT; }
  function canParse(){  return _on; }
  function open(){  $('#premiumGate').addClass('open'); $('body').css('overflow','hidden'); }
  function close(){ $('#premiumGate').removeClass('open'); $('body').css('overflow',''); }
  function activate(plan){ _save(plan); close(); Storage.SearchCounter.reset(); UI.toast('🎉 프리미엄이 활성화됐어요!','success'); _updateUI(); }
  function _updateUI(){
    if(_on){ $('.premium-pill').html('✦ Premium ✓').css('opacity','.7'); $('#biPremiumTag').hide(); }
    else { $('#biPremiumTag').show(); }
  }
  function init(){
    _load(); _updateUI();
    let sel='yearly'; $('.gate-plan--featured,.gate-plan.featured').addClass('selected');
    $(document).on('click','.gate-plan',function(){ sel=$(this).data('plan'); $('.gate-plan').removeClass('selected'); $(this).addClass('selected'); });
    $('#premiumBtn,#mnPremium').on('click',open);
    $('#gateClose').on('click',close);
    $('#premiumGate').on('click',e=>{ if($(e.target).is('#premiumGate'))close(); });
    $('#gateActivate').on('click',()=>activate(sel));
    $('#pcbBtn').on('click',open);
    $(document).on('click','#biPremiumTag',open);
    $(document).on('keydown',e=>{ if(e.key==='Escape'&&$('#premiumGate').hasClass('open'))close(); });
  }
  return Object.freeze({ init, isPremium, canSearch, canParse, open, close });
})();
