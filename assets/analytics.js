/* Unlinked daily page counts; detailed first-party analytics requires explicit acceptance. */
(() => {
 'use strict';
 const ENDPOINT='https://amirrajabi-site-analytics.amirrgb369.workers.dev';
 const VERSION='2026-10-30.v1',KEY='ar.analytics.choice.v1',VISITOR='ar.analytics.visitor.v1';
 const disabled=navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
 let running=false,visit='',visitor='',started=0,lastTick=0,lastInteraction=0,active=0,visible=0,maxScroll=0,events=[],timer=null,busy=false,cleanup=[],observerList=[],perf={},panel=null,preferences=null;
 const read=(key)=>{try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}};
 const write=(key,v)=>{try{localStorage.setItem(key,JSON.stringify(v));}catch{}};
 const remove=(key)=>{try{localStorage.removeItem(key);}catch{}};
 const uid=()=>crypto.randomUUID();
 const elapsed=()=>Math.max(0,Math.round(performance.now()-started));
 const on=(obj,name,handler,opts)=>{obj.addEventListener(name,handler,opts);cleanup.push(()=>obj.removeEventListener(name,handler,opts));};
 function tick(){
  if(!running)return;
  const now=performance.now(),delta=Math.max(0,Math.min(30000,now-lastTick));lastTick=now;
  if(document.visibilityState==='visible'){visible+=delta;if(document.hasFocus()&&now-lastInteraction<60000)active+=delta;}
  const height=document.documentElement.scrollHeight-innerHeight;
  const depth=height>0?Math.round(100*scrollY/height):100;
  maxScroll=Math.max(maxScroll,Math.min(100,Math.max(0,depth)));
 }
 function event(kind,details={}){
  if(!running)return;
  events.push({event_id:uid(),kind,page_path:'/',client_at:new Date().toISOString(),elapsed_ms:elapsed(),...details});
  if(events.length>100)events.splice(0,events.length-100);
 }
 function metadata(){
  let zone='';try{zone=Intl.DateTimeFormat().resolvedOptions().timeZone||'';}catch{}
  let referrer='';try{referrer=new URL(document.referrer).origin;}catch{}
  return {language:navigator.language||'',timezone:zone,referrer,screen_width:screen.width,screen_height:screen.height,viewport_width:innerWidth,viewport_height:innerHeight};
 }
 function payload(batch){
  tick();return {consent:true,consent_version:VERSION,visit_id:visit,visitor_id:visitor,meta:metadata(),active_ms:Math.round(active),visible_ms:Math.round(visible),elapsed_ms:elapsed(),max_scroll:maxScroll,performance:perf,events:batch};
 }
 async function send(final=false){
  if(!running||(!final&&busy))return;
  const currentVisit=visit,batch=events.splice(0,20),body=JSON.stringify(payload(batch));
  if(final){
   if(navigator.sendBeacon&&navigator.sendBeacon(ENDPOINT+'/v1/collect',new Blob([body],{type:'text/plain;charset=UTF-8'})))return;
  }
  busy=true;
  try{const result=await fetch(ENDPOINT+'/v1/collect',{method:'POST',body,headers:{'Content-Type':'text/plain;charset=UTF-8'},credentials:'omit',keepalive:true,referrerPolicy:'no-referrer'});if(!result.ok&&running&&visit===currentVisit)events.unshift(...batch);}
  catch{if(running&&visit===currentVisit)events.unshift(...batch);}finally{if(visit===currentVisit)busy=false;if(events.length>100)events.length=100;}
 }
 function stop(){
  running=false;clearInterval(timer);timer=null;
  cleanup.forEach(fn=>fn());cleanup=[];observerList.forEach(o=>o.disconnect());observerList=[];
  events=[];busy=false;
 }
 function start(){
  if(running||disabled)return;
  try{
   const saved=read(VISITOR),now=Date.now();
   visitor=saved&&typeof saved.id==='string'&&/^[0-9a-f-]{36}$/i.test(saved.id)?saved.id:uid();
   write(VISITOR,{id:visitor});
   visit=uid();started=performance.now();lastTick=started;lastInteraction=started;active=visible=maxScroll=0;events=[];perf={};running=true;
   on(document,'visibilitychange',()=>{tick();event('visibility');void send(true);});
   on(window,'pagehide',()=>{event('page_exit');void send(true);});
   on(window,'pageshow',e=>{if(e.persisted){lastTick=performance.now();lastInteraction=lastTick;void send();}});
   for(const name of ['pointerdown','keydown','scroll','touchstart'])on(window,name,()=>{lastInteraction=performance.now();},{passive:true});
   on(document,'click',e=>{
    const link=e.target instanceof Element?e.target.closest('a'):null;if(!link)return;
    const href=link.getAttribute('href')||'';
    if(href.startsWith('mailto:'))event('email_click');
    else {try{const u=new URL(href,location.href);
     if(u.origin===location.origin&&u.pathname==='/assets/Amir_Rajabi_Academic_CV.pdf')event('cv_download');
     else if(u.protocol==='https:'&&u.origin!==location.origin)event('outbound_click',{target:u.origin+u.pathname});
    }catch{}}
    void send();
   });
   if('IntersectionObserver'in window){
    const seen=new Set(),io=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting&&!seen.has(entry.target.id)){seen.add(entry.target.id);event('section_view',{section:entry.target.id});}}},{threshold:0.2});
    document.querySelectorAll('main section[id]').forEach(s=>io.observe(s));observerList.push(io);
   }
   try{
    const nav=performance.getEntriesByType('navigation')[0];
    if(nav){perf.ttfb_ms=nav.responseStart;perf.dom_content_loaded_ms=nav.domContentLoadedEventEnd;perf.load_ms=nav.loadEventEnd;perf.navigation_ms=nav.duration;}
    const fcp=performance.getEntriesByName('first-contentful-paint')[0];if(fcp)perf.fcp_ms=fcp.startTime;
    if('PerformanceObserver'in window){
     const lcp=new PerformanceObserver(list=>{const entries=list.getEntries();if(entries.length)perf.lcp_ms=entries[entries.length-1].startTime;});lcp.observe({type:'largest-contentful-paint',buffered:true});observerList.push(lcp);
     let windowStart=0,windowLast=0,windowScore=0,maxCls=0;
     const cls=new PerformanceObserver(list=>{for(const entry of list.getEntries()){if(entry.hadRecentInput)continue;if(entry.startTime-windowLast<1000&&entry.startTime-windowStart<5000){windowScore+=entry.value;}else{windowStart=entry.startTime;windowScore=entry.value;}windowLast=entry.startTime;maxCls=Math.max(maxCls,windowScore);}perf.cls=maxCls;});
     cls.observe({type:'layout-shift',buffered:true});observerList.push(cls);
    }
   }catch{}
   timer=setInterval(()=>{tick();if(running&&performance.now()-started>86400000){stop();return;}void send();},15000);
   event('page_view');void send();
  }catch{stop();}
 }
 function closePreferences(){
  if(preferences){preferences.close();preferences.remove();preferences=null;}
 }
 function choose(accepted,anonymous=accepted){
  const yes=accepted&&!disabled,counts=anonymous&&!disabled;
  write(KEY,{accepted:yes,anonymous:counts,version:VERSION,expires:Date.now()+180*86400000});
  if(yes)start();else{stop();remove(VISITOR);}
  if(panel){panel.remove();panel=null;}
  closePreferences();
 }
 function makeButton(label,handler,dark=false){
  const b=document.createElement('button');b.type='button';b.textContent=label;
  Object.assign(b.style,{font:'inherit',fontWeight:'600',minHeight:'42px',padding:'9px 17px',border:'1px solid '+(dark?'#243246':'#9cabb9'),borderRadius:'5px',background:dark?'#243246':'#fff',color:dark?'#fff':'#243246',cursor:'pointer',display:'inline-flex',gap:'8px',alignItems:'center',justifyContent:'center',whiteSpace:'nowrap'});
  b.addEventListener('click',handler);return b;
 }
 function addSettingsIcon(button){
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
  for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'20',height:'20','aria-hidden':'true',focusable:'false',fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round'}))svg.setAttribute(k,v);
  for(const [y,x] of [[5,6],[12,17],[19,9]]){
   const line=document.createElementNS(ns,'path');line.setAttribute('d','M3 '+y+'H'+(x-3)+' M'+(x+3)+' '+y+'H21');svg.append(line);
   const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r','2.5');svg.append(circle);
  }
  button.prepend(svg);
 }
 function ensurePrivacyStyles(){
  if(document.getElementById('ar-privacy-ui-style'))return;
  const style=document.createElement('style');style.id='ar-privacy-ui-style';
  style.textContent='#ar-cookie-preferences::backdrop{background:rgb(20 32 46 / .38)} .ar-privacy-controls button:focus-visible,#ar-cookie-preferences button:focus-visible{outline:3px solid #367dab;outline-offset:3px} @media(max-width:640px){.ar-privacy-controls{width:100%;display:grid!important;grid-template-columns:1fr 1fr}.ar-privacy-controls button{min-width:0;padding:9px 12px!important;font-size:12px!important;white-space:normal!important;line-height:1.3}.ar-privacy-controls .ar-privacy-accept{grid-column:auto}}';
  document.head.append(style);
 }
 async function forgetVisits(status){
  const identifier=visitor||read(VISITOR)?.id;
  if(!identifier)return;
  const body=JSON.stringify({visit_id:visit||uid(),visitor_id:identifier});stop();
  status.textContent='Deleting recorded visits…';
  try{
   const r=await fetch(ENDPOINT+'/v1/forget',{method:'POST',body,headers:{'Content-Type':'text/plain'},credentials:'omit',referrerPolicy:'no-referrer'});
   if(r.ok){choose(false,false);}else{status.textContent='Deletion could not be confirmed. Please retry or contact arajabi@aut.ac.ir. Optional analytics is stopped.';}
  }catch{status.textContent='Deletion could not be confirmed. Please retry or contact arajabi@aut.ac.ir. Optional analytics is stopped.';}
 }
 function showPreferences(){
  if(preferences){preferences.querySelector('button')?.focus();return;}
  ensurePrivacyStyles();
  preferences=document.createElement('dialog');preferences.id='ar-cookie-preferences';preferences.setAttribute('aria-labelledby','ar-privacy-heading');
  Object.assign(preferences.style,{width:'min(520px, calc(100% - 32px))',maxHeight:'85vh',overflowY:'auto',padding:'24px',border:'1px solid #bdcdd9',borderRadius:'10px',background:'#fff',color:'#243246',boxShadow:'0 12px 50px #15253933',font:'14px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif'});
  const heading=document.createElement('h2');heading.id='ar-privacy-heading';heading.textContent='Cookies & privacy preferences';Object.assign(heading.style,{fontSize:'21px',margin:'0 0 12px'});
  const note=document.createElement('p');note.textContent=disabled?'Your browser privacy signal disables optional analytics.':'Choose what this site may store. The preference itself is saved so you are not asked on every visit.';
  const saved=read(KEY),valid=saved?.version===VERSION&&saved.expires>Date.now();
  const rows=document.createElement('div');
  function option(title,description,checked,locked=false){
   const row=document.createElement('label');Object.assign(row.style,{display:'flex',alignItems:'flex-start',gap:'12px',padding:'14px 0',borderTop:'1px solid #e1e6eb',cursor:locked?'default':'pointer'});
   const input=document.createElement('input');input.type='checkbox';input.checked=checked;input.disabled=locked||disabled;Object.assign(input.style,{marginTop:'5px',width:'18px',height:'18px',flexShrink:'0',accentColor:'#243246'});
   const words=document.createElement('span'),strong=document.createElement('strong'),small=document.createElement('span');strong.textContent=title;small.textContent=description;Object.assign(small.style,{display:'block',fontSize:'12px',color:'#617083',marginTop:'3px'});words.append(strong,small);row.append(input,words);rows.append(row);return input;
  }
  option('Necessary storage','Remembers your privacy choice. Always enabled.',true,true);
  const anonymous=option('Anonymous visit counts','Daily totals only; no visitor ID, IP or device details stored in the counter.',!disabled&&(!valid||saved.anonymous===true||(saved.anonymous===undefined&&saved.accepted===true)));
  const detailed=option('Detailed analytics','IP, approximate location, browser/device details, visit timing and interactions. Kept until deletion.',!disabled&&valid&&saved.accepted===true);
  const status=document.createElement('p');status.setAttribute('role','status');Object.assign(status.style,{fontSize:'12px',margin:'8px 0'});
  const actions=document.createElement('div');Object.assign(actions.style,{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'16px'});
  actions.append(makeButton('Save preferences',()=>choose(detailed.checked,anonymous.checked),true),makeButton('Reject optional analytics',()=>choose(false,false)),makeButton('Close',closePreferences));
  const identifier=visitor||read(VISITOR)?.id;
  if(identifier)actions.append(makeButton('Delete my recorded visits',()=>{void forgetVisits(status);}));
  const more=document.createElement('a');more.href='/privacy.html';more.textContent='Read the privacy notice';Object.assign(more.style,{display:'inline-block',fontSize:'12px',marginTop:'16px',textDecoration:'underline'});
  preferences.append(heading,note,rows,status,actions,more);document.body.append(preferences);preferences.showModal();
  preferences.addEventListener('cancel',e=>{e.preventDefault();closePreferences();});
 }
 function showChoice(focus=false){
  if(panel){if(focus)showPreferences();return;}
  ensurePrivacyStyles();
  panel=document.createElement('aside');panel.setAttribute('role','region');panel.setAttribute('aria-label','Site privacy choices');
  Object.assign(panel.style,{position:'fixed',bottom:'12px',left:'12px',right:'12px',width:'auto',maxWidth:'none',margin:'0',zIndex:'1000',padding:'18px 24px',border:'1px solid #b7c8d6',borderTop:'3px solid #476f90',borderRadius:'8px',background:'#fff',color:'#243246',boxShadow:'0 4px 28px #24324629',font:'13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif',display:'flex',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:'16px'});
  const copy=document.createElement('div');Object.assign(copy.style,{flex:'1 1 350px',minWidth:'0'});
  const title=document.createElement('strong');title.textContent='Your privacy choices';Object.assign(title.style,{display:'block',fontSize:'15px',marginBottom:'4px'});
  const p=document.createElement('p');p.style.margin='0';p.textContent=disabled?'Your browser privacy signal is enabled. Optional analytics is off.':'We record anonymous visit counts. Choose whether to allow detailed analytics. ';
  const more=document.createElement('a');more.href='/privacy.html';more.textContent='Privacy';more.style.textDecoration='underline';p.append(more);copy.append(title,p);
  const buttons=document.createElement('div');buttons.className='ar-privacy-controls';Object.assign(buttons.style,{display:'flex',flexWrap:'wrap',gap:'10px',alignItems:'center'});
  const manage=makeButton('Manage Cookies',showPreferences);addSettingsIcon(manage);buttons.append(manage);
  if(!disabled){const accept=makeButton('Accept',()=>choose(true,true),true);accept.className='ar-privacy-accept';buttons.append(accept);}
  else buttons.append(makeButton('Close',()=>choose(false,false)));
  panel.append(copy,buttons);document.body.append(panel);if(focus)showPreferences();
 }
 const footer=document.querySelector('footer');
 if(footer){const link=document.createElement('a');link.href='/privacy.html';link.textContent='Privacy';link.addEventListener('click',e=>{e.preventDefault();showPreferences();});footer.append(link);}
 const choice=read(KEY);
 if(!disabled&&choice?.version===VERSION&&choice.expires>Date.now()){if(choice.accepted===true)start();}
 else if(!disabled)showChoice();
 // An unlinked daily counter. No browser/visitor metadata or identifier is sent.
 if(!disabled && !(choice?.version===VERSION && choice.expires>Date.now() && (choice.anonymous===false || (choice.anonymous===undefined && choice.accepted===false)))) {
  void fetch(ENDPOINT+'/v1/count',{method:'POST',body:'{}',headers:{'Content-Type':'text/plain;charset=UTF-8'},credentials:'omit',referrerPolicy:'no-referrer',keepalive:true}).catch(()=>{});
 }
})();
