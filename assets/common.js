const GCH_URL="https://yyeqzyvveecmgpoppfhz.supabase.co";
const GCH_KEY="sb_publishable__XveGcEJ7grysXEHQ12bgw_-uhgZSHJ";
const GCH_DB=supabase.createClient(GCH_URL,GCH_KEY);
const GCH={
  url:GCH_URL,key:GCH_KEY,db:GCH_DB,
  esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))},
  number(v,dec=0){const n=Number(v||0);return new Intl.NumberFormat("en-OM",{minimumFractionDigits:dec,maximumFractionDigits:dec}).format(n)},
  money(v,lang="ar",dec=0){return lang==="en"?`OMR ${this.number(v,dec)}`:`${this.number(v,dec)} ر.ع`},
  date(v,lang="ar"){if(!v)return"—";try{return new Intl.DateTimeFormat(lang==="en"?"en-OM":"ar-OM",{dateStyle:"medium"}).format(new Date(v))}catch{return"—"}},
  datetime(v,lang="ar"){if(!v)return"—";try{return new Intl.DateTimeFormat(lang==="en"?"en-OM":"ar-OM",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v))}catch{return"—"}},
  normalizePhone(v){v=String(v||"").trim().replace(/[()\s-]/g,"");if(v.startsWith("00"))v="+"+v.slice(2);return v},
  validPhone(v){const d=String(v||"").replace(/\D/g,"");return d.length>=8&&d.length<=15},
  msg(id,text,ok=false){const e=document.getElementById(id);if(!e)return;e.textContent=text;e.className="msg show "+(ok?"ok":"err")},
  clearMsg(id){const e=document.getElementById(id);if(e){e.textContent="";e.className="msg"}},
  async publicRequest(body){
    const r=await fetch(`${GCH_URL}/functions/v1/public-request`,{method:"POST",headers:{"apikey":GCH_KEY,"Content-Type":"application/json"},body:JSON.stringify(body)});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok){const err=new Error(data.error||"request_failed");err.code=data.error;err.status=r.status;throw err}
    return data;
  },
  genericError(err){console.error(err);return"تعذر إتمام العملية حاليًا. يرجى المحاولة مرة أخرى."},
  async forgotPassword(email,redirectTo){return this.db.auth.resetPasswordForEmail(email,{redirectTo})},
  setBusy(btn,busy,busyText="جارٍ التنفيذ..."){if(!btn)return;if(busy){btn.dataset.oldText=btn.textContent;btn.disabled=true;btn.textContent=busyText}else{btn.disabled=false;btn.textContent=btn.dataset.oldText||btn.textContent}},
  minLocalDateTime(hours=0){const d=new Date(Date.now()+hours*3600000);d.setMinutes(d.getMinutes()-d.getTimezoneOffset());return d.toISOString().slice(0,16)},
  minDate(hours=0){return this.minLocalDateTime(hours).slice(0,10)},
  setupModal(id){const modal=document.getElementById(id);if(!modal)return;modal.addEventListener("click",e=>{if(e.target===modal)this.closeModal(id)})},
  openModal(id){const m=document.getElementById(id);if(!m)return;m.dataset.lastFocus=document.activeElement?.id||"";m.classList.add("show");m.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";setTimeout(()=>m.querySelector("input,select,textarea,button")?.focus(),0)},
  closeModal(id){const m=document.getElementById(id);if(!m)return;m.classList.remove("show");m.setAttribute("aria-hidden","true");document.body.style.overflow="";const old=m.dataset.lastFocus&&document.getElementById(m.dataset.lastFocus);old?.focus()},
  setupEscape(){document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll(".modal.show").forEach(m=>this.closeModal(m.id))})},
  setupMobile(){const btn=document.getElementById("mobileToggle"),menu=document.getElementById("mobileMenu");if(!btn||!menu)return;btn.addEventListener("click",()=>{menu.classList.toggle("open");btn.setAttribute("aria-expanded",menu.classList.contains("open")?"true":"false")});menu.querySelectorAll("a,button").forEach(x=>x.addEventListener("click",()=>menu.classList.remove("open")))}
};
window.GCH=GCH;
