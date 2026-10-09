(function(){
  const baseCard=window.card,baseOpenQuote=window.openQuote,baseCalcTotal=window.calcTotal,baseSaveQuote=window.saveQuote;
  const DAY={0:'الأحد',1:'الاثنين',2:'الثلاثاء',3:'الأربعاء',4:'الخميس',5:'الجمعة',6:'السبت'};
  function isRecurring(entry=activeEntry){return entry?.rfq?.engagement_type==='recurring_meals'}
  function ensureFields(){
    if(document.getElementById('qUnit'))return;
    const subtotal=document.getElementById('qSubtotal')?.closest('.field');if(!subtotal)return;
    const box=document.createElement('div');box.className='field';box.id='qUnitWrap';box.innerHTML='<label>السعر / موظف / وجبة (ر.ع) *</label><input id="qUnit" type="number" min="0.01" step=".01" oninput="calcTotal()"><div class="muted" style="font-size:9px;margin-top:4px">تُحسب القيمة الشهرية التقديرية تلقائيًا من عدد الموظفين × أيام الأسبوع × 4.33.</div>';
    subtotal.parentNode.insertBefore(box,subtotal);
  }
  function scheduleText(r){const days=(r.recurring_weekdays||[]).map(x=>DAY[x]).join('، ');return `برنامج متكرر · يبدأ ${GCH.date(r.recurring_start_date)} · ${days} · التسليم ${String(r.recurring_delivery_time||'').slice(0,5)}`}
  if(typeof baseCard==='function')window.card=function(e){const html=baseCard(e);if(e?.rfq?.engagement_type!=='recurring_meals')return html;return html.replace('<div class="meta">',`<div class="meta"><b>${GCH.esc(scheduleText(e.rfq))}</b><br>`)};
  window.openQuote=async function(key){
    const entry=entries.find(x=>x.key===key);if(entry?.rfq?.engagement_type!=='recurring_meals')return baseOpenQuote(key);
    activeEntry=entry;const invite=entry.invite,r=entry.rfq;if(invite&&invite.status==='invited')await GCH.db.from('rfq_provider_invites').update({status:'viewed'}).eq('id',invite.id);const q=quotes.find(x=>x.rfq_id===r.id);
    ensureFields();document.getElementById('qUnitWrap').classList.remove('hidden');document.getElementById('qSubtotal').readOnly=true;document.getElementById('qSubtotal').closest('.field').querySelector('label').textContent='القيمة الشهرية الأساسية المحسوبة';
    document.getElementById('quoteTitle').textContent=q?'تعديل عرض برنامج الوجبات — '+r.title:'عرض برنامج وجبات — '+r.title;document.getElementById('quoteMeta').textContent=`${GCH.number(r.people_count||0)} موظف · ${scheduleText(r)} · ${r.location}`;
    document.getElementById('qUnit').value=q?.unit_price??'';document.getElementById('qSubtotal').value=q?.subtotal??0;document.getElementById('qDelivery').value=q?.delivery_fee??0;document.getElementById('qService').value=q?.service_fee??0;document.getElementById('qVat').value=q?.vat_amount??0;document.getElementById('qDiscount').value=q?.discount??0;document.getElementById('qMenu').value=(Array.isArray(q?.menu)?q.menu:[]).map(x=>typeof x==='string'?x:(x.name||'')).join('\n');document.getElementById('qIncludes').value=q?.inclusions||'';document.getElementById('qExcludes').value=q?.exclusions||'';document.getElementById('qNotes').value=q?.notes||'';
    const vd=q?.valid_until?new Date(q.valid_until):new Date(Math.min(new Date(r.quote_deadline).getTime(),Date.now()+7*86400000));vd.setMinutes(vd.getMinutes()-vd.getTimezoneOffset());document.getElementById('qValid').value=vd.toISOString().slice(0,16);window.calcTotal();GCH.clearMsg('quoteMsg');GCH.openModal('quoteModal');await loadAll();
  };
  window.calcTotal=function(){
    if(!isRecurring()){const wrap=document.getElementById('qUnitWrap');if(wrap)wrap.classList.add('hidden');const sub=document.getElementById('qSubtotal');if(sub){sub.readOnly=false;const l=sub.closest('.field')?.querySelector('label');if(l)l.textContent='قيمة الطعام / الخدمة *'}return baseCalcTotal()}
    ensureFields();const r=activeEntry.rfq,unit=Math.max(0,Number(document.getElementById('qUnit').value||0)),days=Math.max(1,(r.recurring_weekdays||[]).length),people=Math.max(0,Number(r.people_count||0)),subtotal=Math.round(unit*people*days*4.33*1000)/1000,n=id=>Math.max(0,Number(document.getElementById(id).value||0));document.getElementById('qSubtotal').value=subtotal||0;const total=Math.max(0,subtotal+n('qDelivery')+n('qService')+n('qVat')-n('qDiscount'));document.getElementById('qTotal').textContent=`${GCH.money(total,'ar',total%1?1:0)} / شهر تقريبي`;
  };
  window.saveQuote=async function(submit){
    if(!isRecurring())return baseSaveQuote(submit);
    const r=activeEntry.rfq,n=id=>Number(document.getElementById(id).value||0),unit=n('qUnit'),subtotal=n('qSubtotal'),delivery=n('qDelivery'),service=n('qService'),vat=n('qVat'),discount=n('qDiscount'),menu=document.getElementById('qMenu').value.split('\n').map(x=>x.trim()).filter(Boolean),valid=document.getElementById('qValid').value,btn=document.getElementById(submit?'submitBtn':'draftBtn');
    if(unit<=0||subtotal<0||delivery<0||service<0||vat<0||discount<0||discount>subtotal+delivery+service+vat||!menu.length||!valid)return GCH.msg('quoteMsg','أدخل سعر الوجبة والقائمة وتاريخ صلاحية العرض بشكل صحيح.');
    const payload={rfq_id:r.id,provider_id:provider.id,currency:'OMR',pricing_unit:'per_employee_meal',unit_price:unit,subtotal,delivery_fee:delivery,service_fee:service,vat_amount:vat,discount,menu,inclusions:document.getElementById('qIncludes').value.trim(),exclusions:document.getElementById('qExcludes').value.trim(),notes:document.getElementById('qNotes').value.trim(),valid_until:new Date(valid).toISOString(),status:submit?'submitted':'draft'};
    GCH.setBusy(btn,true);try{const old=quotes.find(x=>x.rfq_id===r.id);const res=old?await GCH.db.from('provider_quotes').update(payload).eq('id',old.id):await GCH.db.from('provider_quotes').insert(payload);if(res.error)throw res.error;GCH.msg('quoteMsg',submit?'تم إرسال عرض البرنامج للشركة مع السعر لكل موظف/وجبة والتقدير الشهري.':'تم حفظ المسودة.',true);await loadAll();setTimeout(()=>GCH.closeModal('quoteModal'),800)}catch(e){console.error(e);GCH.msg('quoteMsg',GCH.genericError(e))}finally{GCH.setBusy(btn,false)}
  };
})();
