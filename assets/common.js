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

async function GCHRouteMarketplaceIntent(){
  const path=location.pathname.replace(/\/+$/,"/");
  const params=new URLSearchParams(location.search);
  const companyRoot=path.endsWith("/company/")||path.endsWith("/company/index.html");
  const providerRoot=path.endsWith("/provider/")||path.endsWith("/provider/index.html");
  if(companyRoot&&params.get("next")==="rfq")localStorage.setItem("gch_company_next","rfq");
  if(providerRoot&&params.get("next")==="rfq")localStorage.setItem("gch_provider_next","rfq");
  const companyIntent=companyRoot&&localStorage.getItem("gch_company_next")==="rfq";
  const providerIntent=providerRoot&&localStorage.getItem("gch_provider_next")==="rfq";
  if(!companyIntent&&!providerIntent)return;
  let checking=false,polls=0;
  const route=async()=>{
    if(checking)return;checking=true;
    try{
      const {data:{session}}=await GCH_DB.auth.getSession();
      if(!session)return;
      const uid=session.user.id;
      const {data:profile}=await GCH_DB.from("user_profiles").select("role").eq("id",uid).maybeSingle();
      if(companyIntent&&profile?.role==="company"){
        const {data:c}=await GCH_DB.from("companies").select("id").eq("owner_user_id",uid).maybeSingle();
        if(c){localStorage.removeItem("gch_company_next");location.replace("./rfq.html?create=1");return}
      }
      if(providerIntent&&profile?.role==="provider"){
        const {data:p}=await GCH_DB.from("catering_providers").select("id,status").eq("owner_user_id",uid).maybeSingle();
        if(p?.status==="approved"){localStorage.removeItem("gch_provider_next");location.replace("./rfq.html");return}
      }
    }catch(e){console.warn("route intent",e)}finally{checking=false}
  };
  await route();
  GCH_DB.auth.onAuthStateChange((event,session)=>{if(session)queueMicrotask(route)});
  if(companyIntent){
    const timer=setInterval(async()=>{polls++;await route();if(polls>=600||!localStorage.getItem("gch_company_next"))clearInterval(timer)},1500)
  }
}

async function GCHAddProviderPublicProfileLink(){
  const path=location.pathname.replace(/\/+$/,"/");
  const providerPage=path.includes("/provider/");
  if(!providerPage)return;
  try{
    const {data:{session}}=await GCH_DB.auth.getSession();if(!session)return;
    const {data:p}=await GCH_DB.from("catering_providers").select("id,status").eq("owner_user_id",session.user.id).maybeSingle();
    if(!p||p.status!=="approved")return;
    const nav=document.querySelector(".topbar .nav-actions");
    if(nav&&!document.getElementById("publicProviderProfileLink")){
      const a=document.createElement("a");
      a.id="publicProviderProfileLink";a.className="ghost";a.target="_blank";a.rel="noopener";
      a.href=`../provider.html?id=${encodeURIComponent(p.id)}`;a.textContent="ملفي العام";
      nav.prepend(a)
    }
  }catch(e){console.warn("provider public profile link",e)}
}

document.addEventListener("DOMContentLoaded",()=>{
  const path=location.pathname.replace(/\/+$/,"/");
  const isHome=path==="/"||path.endsWith("/index.html");
  if(isHome){
    const nav=document.querySelector(".nav-links");
    if(nav&&!nav.querySelector('[href="./marketplace.html"]')){
      const a=document.createElement("a");a.href="./marketplace.html";a.textContent="السوق";a.dataset.ar="السوق";a.dataset.en="Marketplace";nav.prepend(a)
    }
    if(nav&&!nav.querySelector('[href="./providers.html"]')){
      const a=document.createElement("a");a.href="./providers.html";a.textContent="المزودون";a.dataset.ar="المزودون";a.dataset.en="Providers";nav.appendChild(a)
    }
    const hero=document.querySelector(".hero-cta");
    if(hero&&!hero.querySelector('[href="./marketplace.html"]')){
      const a=document.createElement("a");a.href="./marketplace.html";a.className="ghost";a.textContent="استقبل عروض مزودين";a.dataset.ar="استقبل عروض مزودين";a.dataset.en="Get competing quotes";hero.appendChild(a)
    }
    const mobile=document.getElementById("mobileMenu");
    if(mobile&&!mobile.querySelector('[href="./marketplace.html"]')){
      const a=document.createElement("a");a.href="./marketplace.html";a.className="ghost";a.textContent="السوق";a.dataset.ar="السوق";a.dataset.en="Marketplace";mobile.prepend(a)
    }
    if(mobile&&!mobile.querySelector('[href="./providers.html"]')){
      const a=document.createElement("a");a.href="./providers.html";a.className="ghost";a.textContent="المزودون";a.dataset.ar="المزودون";a.dataset.en="Providers";mobile.prepend(a)
    }
  }
  GCHRouteMarketplaceIntent();
  GCHAddProviderPublicProfileLink();
});
