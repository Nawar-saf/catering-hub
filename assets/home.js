let lang=localStorage.getItem("gch_lang")==="en"?"en":"ar",selectedNeed="meeting",activeFilter="all",packages=[],providers=new Map(),packageLoadFailed=false,smartDraft="";

const needs=[
  ["meeting","💼","اجتماع","Meeting"],
  ["employees","🍱","وجبات موظفين","Employee meals"],
  ["training","🎓","تدريب","Training"],
  ["conference","🎤","مؤتمر","Conference"],
  ["buffet","🍽️","بوفيه","Buffet"],
  ["coffee","☕","Coffee Break","Coffee Break"]
];

const T={
  ar:{people:"عدد الأشخاص",budgetAny:"أي ميزانية",all:"الكل",meeting:"اجتماعات",employees:"وجبات موظفين",training:"تدريب",conference:"مؤتمرات",buffet:"بوفيه",coffee:"Coffee Break",other:"أخرى",request:"اطلب هذه الباقة",per:"ر.ع / شخص",min:"الحد الأدنى",lead:"مهلة التجهيز",hours:"ساعة",empty:"لا توجد باقات منشورة تطابق بحثك حاليًا.",loadError:"تعذر تحميل الباقات حاليًا. يمكنك تقديم طلب عرض سعر مخصص.",smartEmpty:"اكتب تفاصيل طلبك أولًا.",smartReady:"تم ترتيب النقاط الأساسية. راجعها ثم تابع إلى طلب عرض السعر.",placeholderSmart:"مثال: مؤتمر لـ 120 شخص في مسقط، Coffee Break وغداء، خيارات نباتية، والميزانية 8 ر.ع للشخص."},
  en:{people:"Guests",budgetAny:"Any budget",all:"All",meeting:"Meetings",employees:"Employee meals",training:"Training",conference:"Conferences",buffet:"Buffet",coffee:"Coffee Break",other:"Other",request:"Request this package",per:"OMR / person",min:"Minimum",lead:"Lead time",hours:"hours",empty:"No published packages match your search right now.",loadError:"Packages are temporarily unavailable. You can request custom quotes instead.",smartEmpty:"Describe your requirement first.",smartReady:"The key points are structured. Review them, then continue to the quote request.",placeholderSmart:"Example: Conference for 120 people in Muscat, coffee break and lunch, vegetarian options, budget OMR 8 per person."}
};

function t(k){return T[lang][k]||k}

function applyLanguage(){
  document.documentElement.lang=lang;
  document.documentElement.dir=lang==="ar"?"rtl":"ltr";
  document.body.classList.toggle("en",lang==="en");
  document.querySelectorAll("[data-ar]").forEach(e=>e.innerHTML=e.dataset[lang]);
  const langBtn=document.getElementById("langBtn");if(langBtn)langBtn.textContent=lang==="ar"?"EN":"عربي";
  const people=document.getElementById("heroPeople");if(people)people.placeholder=t("people");
  const budget=document.getElementById("heroBudget");if(budget)budget.innerHTML=`<option value="">${t("budgetAny")}</option><option value="3">${lang==="ar"?"حتى 3 ر.ع":"Up to OMR 3"}</option><option value="5">${lang==="ar"?"حتى 5 ر.ع":"Up to OMR 5"}</option><option value="10">${lang==="ar"?"حتى 10 ر.ع":"Up to OMR 10"}</option><option value="999">${lang==="ar"?"مفتوحة":"Open"}</option>`;
  const smart=document.getElementById("smartText");if(smart)smart.placeholder=t("placeholderSmart");
  const summary=document.getElementById("smartSummary");if(summary&&!smartDraft)summary.textContent=t("smartReady");
  renderNeeds();renderFilters();renderPackages();
}

function switchLang(){lang=lang==="ar"?"en":"ar";localStorage.setItem("gch_lang",lang);applyLanguage()}

function categoryType(v=""){
  v=String(v).toLowerCase();
  if(v.includes("coffee"))return"coffee";
  if(v.includes("employee")||v.includes("office")||v.includes("lunch"))return"employees";
  if(v.includes("train"))return"training";
  if(v.includes("conference"))return"conference";
  if(v.includes("buffet"))return"buffet";
  if(v.includes("meeting"))return"meeting";
  return"other";
}
function arr(v){return Array.isArray(v)?v:[]}

async function loadPackages(){
  try{
    const [pp,pk]=await Promise.all([
      GCH.db.from("public_provider_profiles").select("provider_id,name,service_areas,cuisines"),
      GCH.db.from("catering_packages").select("id,provider_id,name,name_en,category,category_key,price_per_person,min_people,max_people,lead_time_hours,items,items_en,delivery_fee,minimum_spend,vat_included,dietary_tags,service_areas").eq("active",true).eq("review_status","approved").order("created_at",{ascending:false})
    ]);
    if(pp.error)throw pp.error;if(pk.error)throw pk.error;
    providers=new Map((pp.data||[]).map(x=>[x.provider_id,x]));
    packages=(pk.data||[]).filter(x=>providers.has(x.provider_id)).map(x=>({...x,type:x.category_key||categoryType(x.category),provider:providers.get(x.provider_id)}));
    packageLoadFailed=false;
  }catch(e){console.error(e);packages=[];packageLoadFailed=true}
  renderPackages();
}

function renderNeeds(){
  const el=document.getElementById("heroChoices");if(!el)return;
  el.innerHTML=needs.map(n=>`<button class="choice ${selectedNeed===n[0]?"active":""}" onclick="selectedNeed='${n[0]}';renderNeeds()">${n[1]} ${lang==="ar"?n[2]:n[3]}</button>`).join("");
}

function renderFilters(){
  const el=document.getElementById("filters");if(!el)return;
  const xs=[["all",t("all")],...needs.map(n=>[n[0],lang==="ar"?n[2]:n[3]])];
  el.innerHTML=xs.map(x=>`<button class="filter ${activeFilter===x[0]?"active":""}" onclick="activeFilter='${x[0]}';renderFilters();renderPackages()">${x[1]}</button>`).join("");
}

function renderPackages(){
  const grid=document.getElementById("packageGrid");if(!grid)return;
  const ppl=Number(document.getElementById("heroPeople")?.value||0),bud=Number(document.getElementById("heroBudget")?.value||0);
  const list=packages.filter(x=>(activeFilter==="all"||x.type===activeFilter||(activeFilter==="meeting"&&x.type==="coffee"))&&(!ppl||(ppl>=Number(x.min_people||1)&&ppl<=Number(x.max_people||99999)))&&(!bud||Number(x.price_per_person)<=bud));
  if(!list.length){grid.innerHTML=`<div class="empty">${packageLoadFailed?t("loadError"):t("empty")}</div>`;return}
  grid.innerHTML=list.map(x=>{
    const items=lang==="en"&&arr(x.items_en).length?arr(x.items_en):arr(x.items),name=lang==="en"?(x.name_en||x.name):x.name;
    return `<article class="package"><div class="pkg-head"><div class="vendor">${GCH.esc(x.provider.name)}</div><div class="pkg-type">${t(x.type)}</div><h3>${GCH.esc(name)}</h3><div class="price">${GCH.number(x.price_per_person,1)} <small>${t("per")}</small></div></div><div class="pkg-body"><ul>${items.map(i=>`<li>${GCH.esc(i)}</li>`).join("")||`<li>${lang==="ar"?"التفاصيل تظهر عند فتح الطلب":"Details shown when requesting"}</li>`}</ul><div class="pkg-meta"><span>${t("min")}: ${GCH.number(x.min_people)}</span><span>${t("lead")}: ${GCH.number(x.lead_time_hours)} ${t("hours")}</span></div><button class="primary" onclick="openPackage('${x.id}')">${t("request")}</button></div></article>`;
  }).join("");
}

function findPackages(){activeFilter=selectedNeed;renderFilters();renderPackages();document.getElementById("packageGrid")?.scrollIntoView({behavior:"smooth",block:"start"})}

function extractSmart(text){
  text=String(text||"").replace(/[٠-٩]/g,d=>String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const p=text.match(/(\d+)\s*(?:شخص|موظف|ضيف|people|guests|employees)/i),b=text.match(/(?:ميزاني(?:ة|تي)|budget)[^\d]*(\d+(?:[.,]\d+)?)/i);
  return{people:p?Number(p[1]):"",budget:b?Number(b[1].replace(",",".")):""};
}

function smartAnalyze(){
  const input=document.getElementById("smartText"),summary=document.getElementById("smartSummary"),chipsEl=document.getElementById("smartChips");
  smartDraft=(input?.value||"").trim();
  if(!smartDraft){if(summary)summary.textContent=t("smartEmpty");if(chipsEl)chipsEl.innerHTML="";return}
  const p=extractSmart(smartDraft),chips=[];
  if(p.people)chips.push(lang==="ar"?`${GCH.number(p.people)} شخص`:`${GCH.number(p.people)} people`);
  if(p.budget)chips.push(GCH.money(p.budget,lang,p.budget%1?1:0));
  if(/coffee|قهوة|كوفي/i.test(smartDraft))chips.push("Coffee Break");
  if(/مؤتمر|conference/i.test(smartDraft))chips.push(lang==="ar"?"مؤتمر":"Conference");
  if(/تدريب|training/i.test(smartDraft))chips.push(lang==="ar"?"تدريب":"Training");
  if(chipsEl)chipsEl.innerHTML=(chips.length?chips:[lang==="ar"?"طلب مخصص":"Custom request"]).map(x=>`<span class="chip">${GCH.esc(x)}</span>`).join("");
  if(summary)summary.textContent=t("smartReady");
}

GCH.setupMobile();
GCH.setupModal("requestModal");
GCH.setupEscape();
applyLanguage();
loadPackages();