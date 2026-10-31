const SITE = 'https://amirrgb.github.io';
const VERSION = '2026-10-30.v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SECTIONS = new Set(['about','research','education','teaching','experience','skills','contact']);
const KINDS = new Set(['page_view','section_view','outbound_click','cv_download','email_click','visibility','page_exit','performance']);
const OUTBOUND = new Set(['aut.ac.ir','ut.ac.ir','github.com','www.linkedin.com','scholar.google.com','www.seagull.dev']);
const text = (v,n=120) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g,'').slice(0,n) : '';
const number = (v,max) => Number.isFinite(v) ? Math.max(0,Math.min(max,Math.round(v))) : 0;
function originOnly(v) { try { const u=new URL(v); return ['https:','http:'].includes(u.protocol) ? u.origin : ''; } catch {return '';} }
function agentInfo(ua) {
 const browser = /Edg\//.test(ua)?'Edge':/OPR\//.test(ua)?'Opera':/Firefox\//.test(ua)?'Firefox':/Chrome\//.test(ua)?'Chrome':/Safari\//.test(ua)?'Safari':'Other';
 const os = /Android/.test(ua)?'Android':/iPhone|iPad/.test(ua)?'iOS':/Windows/.test(ua)?'Windows':/Macintosh/.test(ua)?'macOS':/Linux/.test(ua)?'Linux':'Other';
 return {browser,os,device:/iPad|Tablet/.test(ua)?'tablet':/Mobi|iPhone|Android/.test(ua)?'mobile':'desktop'};
}
function response(status,allowed=false) {
 const headers = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'"};
 if (allowed) Object.assign(headers,{'Access-Control-Allow-Origin':SITE,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Access-Control-Max-Age':'600'});
 return new Response(null,{status,headers});
}
async function boundedJson(request) {
 const reader=request.body?.getReader(); if(!reader) throw new Error('body');
 let length=0; const chunks=[];
 try { while(true) { const {done,value}=await reader.read(); if(done)break; length+=value.byteLength; if(length>16384){await reader.cancel();throw new Error('size');} chunks.push(value); } }
 finally {reader.releaseLock();}
 const bytes=new Uint8Array(length); let offset=0; for(const c of chunks){bytes.set(c,offset);offset+=c.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
function performanceData(v) {
 const out={}; if(!v || typeof v!=='object')return '{}';
 for(const k of ['ttfb_ms','dom_content_loaded_ms','load_ms','lcp_ms','fcp_ms','navigation_ms']) if(Number.isFinite(v[k]))out[k]=number(v[k],120000);
 if(Number.isFinite(v.cls))out.cls=Math.max(0,Math.min(10,v.cls));
 return JSON.stringify(out);
}
function safeTarget(event) {
 if(event.kind==='cv_download')return '/assets/Amir_Rajabi_Academic_CV.pdf';
 if(event.kind==='email_click')return 'contact_email';
 if(event.kind==='outbound_click') {try{const u=new URL(event.target);if(u.protocol==='https:'&&OUTBOUND.has(u.hostname))return u.origin+u.pathname.slice(0,250);}catch{}}
 return '';
}
export default {
 async fetch(request,env) {
  const url=new URL(request.url), allowed=request.headers.get('Origin')===SITE;
  if(url.pathname==='/health'&&request.method==='GET')return response(204);
  if(url.pathname!=='/v1/collect'&&url.pathname!=='/v1/forget'&&url.pathname!=='/v1/count')return response(404,allowed);
  if(!allowed)return response(403);
  if(request.method==='OPTIONS')return response(204,true);
  if(request.method!=='POST')return response(405,true);
  if(request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return response(204,true);
  if(!/^(application\/json|text\/plain)(;|$)/i.test(request.headers.get('Content-Type')||''))return response(415,true);
  try {
   const ip=text(request.headers.get('CF-Connecting-IP'),64);
   if(!(await env.RATE.limit({key:ip||'unknown'})).success)return response(429,true);
   let data; try{data=await boundedJson(request);}catch{return response(400,true);}
   if(url.pathname==='/v1/count') {
    if(!data || typeof data!=='object' || Array.isArray(data) || Object.keys(data).length!==0)return response(400,true);
    await env.DB.prepare('INSERT INTO page_counts(day,page_views) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET page_views=page_views+1').bind(new Date().toISOString().slice(0,10)).run();
    return response(204,true);
   }
   if(!data||!UUID.test(data.visit_id)||!UUID.test(data.visitor_id))return response(400,true);
   if(url.pathname==='/v1/forget') {
    await env.DB.batch([
     env.DB.prepare('DELETE FROM events WHERE visit_id IN (SELECT visit_id FROM visits WHERE visitor_id=?)').bind(data.visitor_id),
     env.DB.prepare('DELETE FROM visits WHERE visitor_id=?').bind(data.visitor_id)
    ]);
    return response(204,true);
   }
   if(data.consent!==true||data.consent_version!==VERSION)return response(400,true);
   if(!Array.isArray(data.events)||data.events.length>20)return response(400,true);
   const meta=data.meta && typeof data.meta==='object'?data.meta:{};
   const cf=request.cf||{}, now=new Date().toISOString(), ua=text(request.headers.get('User-Agent'),350), agent=agentInfo(ua);
   const active=number(data.active_ms,21600000),visible=number(data.visible_ms,86400000),elapsed=number(data.elapsed_ms,86400000);
   if(active>visible||visible>elapsed)return response(400,true);
   const previous=await env.DB.prepare('SELECT visitor_id FROM visits WHERE visit_id=?').bind(data.visit_id).first();
   if(previous&&previous.visitor_id!==data.visitor_id)return response(409,true);
   const fields=['visit_id','visitor_id','first_seen','last_seen','consent_version','ip','country','region','city','network_asn','user_agent','browser','os','device','language','timezone','referrer_origin','screen_width','screen_height','viewport_width','viewport_height','active_ms','visible_ms','elapsed_ms','max_scroll','performance_json'];
   const values=[data.visit_id,data.visitor_id,now,now,VERSION,ip||null,text(cf.country,5),text(cf.region,100),text(cf.city,100),number(cf.asn,4294967295),ua,agent.browser,agent.os,agent.device,text(meta.language,35),text(meta.timezone,80),originOnly(meta.referrer),number(meta.screen_width,20000),number(meta.screen_height,20000),number(meta.viewport_width,20000),number(meta.viewport_height,20000),active,visible,elapsed,number(data.max_scroll,100),performanceData(data.performance)];
   const updates='last_seen=excluded.last_seen,active_ms=max(visits.active_ms,excluded.active_ms),visible_ms=max(visits.visible_ms,excluded.visible_ms),elapsed_ms=max(visits.elapsed_ms,excluded.elapsed_ms),max_scroll=max(visits.max_scroll,excluded.max_scroll),viewport_width=excluded.viewport_width,viewport_height=excluded.viewport_height,performance_json=CASE WHEN excluded.performance_json<>\'{}\' THEN excluded.performance_json ELSE visits.performance_json END';
   const statements=[env.DB.prepare('INSERT INTO visits ('+fields.join(',')+') VALUES ('+fields.map(()=>'?').join(',')+') ON CONFLICT(visit_id) DO UPDATE SET '+updates).bind(...values)];
   for(const e of data.events) {
    if(!e||!UUID.test(e.event_id)||!KINDS.has(e.kind)||e.page_path!=='/')continue;
    const section=SECTIONS.has(e.section)?e.section:'';
    const target=safeTarget(e);
    if(e.kind==='section_view'&&!section)continue;
    if(['cv_download','outbound_click','email_click'].includes(e.kind)&&!target)continue;
    let clientAt='';if(typeof e.client_at==='string'){const t=Date.parse(e.client_at);if(Number.isFinite(t)&&Math.abs(Date.now()-t)<86400000)clientAt=new Date(t).toISOString();}
    statements.push(env.DB.prepare('INSERT OR IGNORE INTO events(event_id,visit_id,received_at,client_at,kind,page_path,section,target,elapsed_ms) VALUES(?,?,?,?,?,?,?,?,?)').bind(e.event_id,data.visit_id,now,clientAt,e.kind,'/',section,target,number(e.elapsed_ms,86400000)));
   }
   await env.DB.batch(statements);
   return response(204,true);
  } catch {console.error(JSON.stringify({component:'analytics',error:'request_failed'}));return response(503,true);}
 }
};
