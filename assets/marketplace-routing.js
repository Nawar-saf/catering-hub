(function(){
  const path=location.pathname.replace(/\/+$/,'/');
  const isHome=path==='/'||path.endsWith('/index.html');
  const isCompanyRfq=path.endsWith('/company/rfq.html');

  function goCompanyRfq(extra={}){
    Object.entries(extra).forEach(([k,v])=>v==null?localStorage.removeItem(k):localStorage.setItem(k,String(v)));
    localStorage.setItem('gch_company_next','rfq');
    location.href='./company/?next=rfq';
  }

  if(isHome){
    window.openCustom=function(){
      const note=(document.getElementById('smartText')?.value||'').trim();
      goCompanyRfq({gch_custom_intent:'1',gch_custom_notes:note||null});
    };
    window.openMeals=function(){
      location.href='./company/#employeeMeals';
    };
    window.openPackage=function(id){
      const x=typeof packages!=='undefined'?packages.find(p=>p.id===id):null;
      if(!x)return goCompanyRfq({gch_package_intent:id});
      const people=Number(document.getElementById('heroPeople')?.value||0);
      localStorage.setItem('gch_direct_provider',x.provider_id);
      goCompanyRfq({gch_package_intent:id,gch_package_people:people>0?people:null});
    };
  }

  async function hydrateCompanyIntent(){
    if(!isCompanyRfq||!window.GCH)return;
    const packageId=localStorage.getItem('gch_package_intent');
    const custom=localStorage.getItem('gch_custom_intent')==='1';
    const customNotes=localStorage.getItem('gch_custom_notes')||'';
    let directProvider=localStorage.getItem('gch_direct_provider');
    const marketNotice=document.getElementById('marketSourceNotice');
    if(directProvider&&marketNotice)marketNotice.classList.add('hidden');
    let pkg=null;
    if(packageId){
      const {data,error}=await GCH.db.from('catering_packages').select('id,provider_id,name,category_key,price_per_person,min_people,max_people,lead_time_hours,items,delivery_fee,minimum_spend').eq('id',packageId).eq('active',true).eq('review_status','approved').maybeSingle();
      if(!error)pkg=data;
      if(pkg&&!directProvider){localStorage.setItem('gch_direct_provider',pkg.provider_id);directProvider=pkg.provider_id;if(marketNotice)marketNotice.classList.add('hidden')}
    }
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      const title=document.getElementById('rTitle'),notes=document.getElementById('rNotes'),modal=document.getElementById('createModal');
      if(!title||!notes||!modal||!modal.classList.contains('show')){if(tries>80)clearInterval(timer);return}
      if(pkg){
        title.value=pkg.name||'طلب باقة';
        const typeMap={coffee:'coffee_break',employees:'custom',meeting:'meeting',training:'training',conference:'conference',buffet:'buffet',event:'event',other:'custom'};
        const type=document.getElementById('rType');if(type)type.value=typeMap[pkg.category_key]||'custom';
        const min=Number(pkg.min_people||1),max=Number(pkg.max_people||99999),wanted=Number(localStorage.getItem('gch_package_people')||0),people=Math.max(min,Math.min(max,wanted||min));
        const peopleEl=document.getElementById('rPeople');if(peopleEl)peopleEl.value=people;
        const budget=document.getElementById('rBudget');if(budget)budget.value=Number(pkg.price_per_person||0)||'';
        const unit=document.getElementById('rBudgetUnit');if(unit)unit.value='per_person';
        const items=Array.isArray(pkg.items)?pkg.items:[];
        notes.value=[`الباقة المطلوبة: ${pkg.name}`,items.length?`المحتويات: ${items.join('، ')}`:'',Number(pkg.delivery_fee||0)>0?`رسوم التوصيل المعلنة: ${GCH.money(pkg.delivery_fee,'ar',1)}`:'',Number(pkg.minimum_spend||0)>0?`الحد الأدنى المعلن: ${GCH.money(pkg.minimum_spend,'ar',1)}`:''].filter(Boolean).join('\n');
      }else if(custom){
        title.value=title.value||'طلب ضيافة مخصص';
        if(customNotes)notes.value=customNotes;
      }
      localStorage.removeItem('gch_package_intent');localStorage.removeItem('gch_package_people');localStorage.removeItem('gch_custom_intent');localStorage.removeItem('gch_custom_notes');
      clearInterval(timer);
    },250);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hydrateCompanyIntent);else hydrateCompanyIntent();
})();
