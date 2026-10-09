import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const origins = new Set([
  "https://www.gulfcateringhub.com",
  "https://gulfcateringhub.com",
  "https://nawar-saf.github.io",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3000",
]);
function headers(req: Request){
  const origin=req.headers.get("origin")||"";
  return {
    "Access-Control-Allow-Origin": origins.has(origin)?origin:"https://www.gulfcateringhub.com",
    "Vary":"Origin",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Content-Type":"application/json; charset=utf-8",
    "Cache-Control":"no-store",
  };
}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(req)})}
function clean(v:unknown,max=250){return String(v??"").trim().slice(0,max)}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:headers(req)});
  if(req.method!=="POST") return json(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin");
  if(origin&&!origins.has(origin)) return json(req,{error:"origin_not_allowed"},403);
  try{
    const auth=req.headers.get("authorization")||"";
    if(!auth.startsWith("Bearer ")) return json(req,{error:"unauthorized"},401);
    const url=Deno.env.get("SUPABASE_URL");
    const anon=Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const brevo=Deno.env.get("BREVO_API_KEY");
    if(!url||!anon) throw new Error("server_config");
    const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userErr}=await client.auth.getUser();
    if(userErr||!user) return json(req,{error:"unauthorized"},401);
    const {data:profile,error:profileErr}=await client.from("user_profiles").select("role").eq("id",user.id).maybeSingle();
    if(profileErr||profile?.role!=="admin") return json(req,{error:"forbidden"},403);

    const body=await req.json();
    const email=clean(body.email,254).toLowerCase();
    const company_name=clean(body.company_name,160);
    const contact_name=clean(body.contact_name,160);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!company_name) return json(req,{error:"invalid_input"},400);
    if(!brevo) return json(req,{error:"email_not_configured"},503);

    const inviteUrl="https://www.gulfcateringhub.com/provider/?next=rfq";
    const profileUrl="https://www.gulfcateringhub.com/catering-opportunities-oman.html";
    const recipient=contact_name||company_name;
    const response=await fetch("https://api.brevo.com/v3/smtp/email",{
      method:"POST",
      headers:{accept:"application/json","api-key":brevo,"content-type":"application/json"},
      body:JSON.stringify({
        sender:{name:"Gulf Catering Hub",email:"support@gulfcateringhub.com"},
        to:[{email,name:recipient}],
        subject:"فرص كيترنغ للشركات عبر Gulf Catering Hub",
        htmlContent:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9;color:#171717;max-width:620px;margin:auto"><h2>دعوة للانضمام إلى Gulf Catering Hub</h2><p>${contact_name?`مرحبًا ${contact_name}،`:"مرحبًا،"}</p><p>ندعو <strong>${company_name}</strong> للانضمام كمزود كيترنغ في Gulf Catering Hub، سوق رقمي يربط الشركات بمزودي الكيترنغ عبر طلبات عروض أسعار منظمة.</p><p><strong>التسجيل ومشاهدة الفرص وتقديم عروض الأسعار مجاني.</strong> في صفقات السوق المفتوح فقط، تُطبق عمولة نجاح حالية بنسبة 5% إذا تم اختيار عرضكم واكتمل الطلب بنجاح.</p><ul><li>طلبات شركات وفعاليات وبرامج وجبات موظفين</li><li>فرص تُطابق منطقة الخدمة والسعة ومهلة التجهيز</li><li>ملف مزود عام قابل للمشاركة</li><li>إدارة Quotes والطلبات والفواتير من مكان واحد</li></ul><p><a href="${inviteUrl}" style="display:inline-block;background:#b7924b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">تسجيل شركتي كمزود</a></p><p style="font-size:13px;color:#666">للتفاصيل: <a href="${profileUrl}">كيف تعمل فرص المزودين</a></p><p style="font-size:12px;color:#777">إذا لم تكن هذه الدعوة مناسبة لكم، يمكن تجاهل الرسالة.</p></div>`
      })
    });
    if(!response.ok){console.error("Brevo provider invite failed",await response.text());return json(req,{error:"email_send_failed"},502)}
    return json(req,{ok:true,email_sent:true,company_name,email},201);
  }catch(error){console.error("provider-invite failed",error);return json(req,{error:"invite_failed"},500)}
});