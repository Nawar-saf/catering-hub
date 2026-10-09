(function(){
  function setCopy(){
    const section=document.getElementById('recBtn')?.closest('.section');
    if(!section)return;
    const h=section.querySelector('h2');if(h)h.textContent='برنامج وجبات الموظفين — اطلب عروضًا';
    const budgetLabel=document.getElementById('recPP')?.closest('.field')?.querySelector('label');if(budgetLabel)budgetLabel.textContent='ميزانية مستهدفة / موظف / وجبة *';
    const btn=document.getElementById('recBtn');if(btn)btn.textContent='نشر الطلب واستقبال عروض';
    const note=document.createElement('div');note.className='notice';note.style.cssText='font-size:10px;line-height:1.8;margin-bottom:10px';note.innerHTML='<b>سوق مفتوح:</b> لن يتم تعيين مزود يدويًا. ينشر البرنامج للمزودين الموثقين المطابقين، وتختار شركتك العرض المناسب. بعد الاختيار يُنشأ البرنامج الفعلي وجدول التسليم تلقائيًا.';section.insertBefore(note,section.querySelector('.field'));
    const listTitle=document.getElementById('recList')?.closest('.section')?.querySelector('h2');if(listTitle)listTitle.textContent='برامج الوجبات الفعالة';
  }

  window.createRecurring=async function(){
    const employees=Number(document.getElementById('recEmployees').value),target=Number(document.getElementById('recPP').value),weekdays=selectedWeekdays(),start=document.getElementById('recStart').value,time=document.getElementById('recTime').value,branch=document.getElementById('recBranch').value,notes=document.getElementById('recNotes').value.trim(),btn=document.getElementById('recBtn');
    if(!branch||!Number.isInteger(employees)||employees<1||!target||target<=0||!weekdays.length||!start||!time)return GCH.msg('recMsg','أكمل بيانات البرنامج المطلوبة.');
    const firstDelivery=new Date(`${start}T${time}`);if(!Number.isFinite(firstDelivery.getTime())||firstDelivery.getTime()<=Date.now()+48*3600000)return GCH.msg('recMsg','موعد بداية البرنامج يجب أن يكون بعد 48 ساعة على الأقل حتى يستقبل المزودون عروضهم.');
    const deadline=new Date(Math.min(firstDelivery.getTime()-24*3600000,Date.now()+72*3600000));
    if(deadline<=new Date())return GCH.msg('recMsg','اختر تاريخ بداية أبعد قليلًا لإتاحة وقت كافٍ للعروض.');
    const branchRow=branches.find(x=>x.id===branch),locationText=[branchRow?.city,branchRow?.address].filter(Boolean).join(' - ')||company.city||'مسقط';
    GCH.setBusy(btn,true,'جارٍ نشر الطلب...');
    try{
      const {error}=await GCH.db.from('rfqs').insert({
        company_id:company.id,branch_id:branch,title:`برنامج وجبات موظفين — ${employees} موظف`,request_type:'employees',engagement_type:'recurring_meals',event_date:firstDelivery.toISOString(),people_count:employees,location:locationText,budget:target,budget_unit:'per_person',quote_deadline:deadline.toISOString(),sourcing_mode:'marketplace',recurring_start_date:start,recurring_weekdays:weekdays,recurring_delivery_time:time,requirements:{notes,target_price_per_employee_meal:target}
      });
      if(error)throw error;
      GCH.msg('recMsg','تم نشر برنامج الوجبات في السوق. ستظهر عروض المزودين في صفحة عروض الأسعار.',true);
      setTimeout(()=>location.href='./rfq.html',900);
    }catch(e){console.error(e);GCH.msg('recMsg',GCH.genericError(e))}finally{GCH.setBusy(btn,false)}
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setCopy);else setCopy();
})();
