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
function headers(req: Request){const origin=req.headers.get("origin")||"";return{"Access-Control-Allow-Origin":origins.has(origin)?origin:"https://www.gulfcateringhub.com","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(req)})}
function clean(v:unknown,max=250){return String(v??"").trim().slice(0,max)}
function uuid(v:string){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)}

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:headers(req)});
  if(req.method!=="POST") return json(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin");if(origin&&!origins.has(origin)) return json(req,{error:"origin_not_allowed"},403);
  try{
    const auth=req.headers.get("authorization")||"";if(!auth.startsWith("Bearer ")) return json(req,{error:"unauthorized"},401);
    const url=Deno.env.get("SUPABASE_URL"),anon=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),brevo=Deno.env.get("BREVO_API_KEY");
    if(!url||!anon) throw new Error("server_config");
    const client=createClient(url,anon,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user},error:userErr}=await client.auth.getUser();if(userErr||!user)return json(req,{error:"unauthorized"},401);
    const {data:profile,error:profileErr}=await client.from("user_profiles").select("role").eq("id",user.id).maybeSingle();if(profileErr||profile?.role!=="admin")return json(req,{error:"forbidden"},403);

    const body=await req.json(),email=clean(body.email,254).toLowerCase(),company_name=clean(body.company_name,160),contact_name=clean(body.contact_name,160),lead_id=clean(body.lead_id,50);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!company_name)return json(req,{error:"invalid_input"},400);
    if(lead_id&&!uuid(lead_id))return json(req,{error:"invalid_lead_id"},400);
    if(!brevo)return json(req,{error:"email_not_configured"},503);

    const inviteUrl="https://www.gulfcateringhub.com/provider/?next=rfq";
    const partnerUrl="https://www.gulfcateringhub.com/partner.html";
    const recipient=contact_name||company_name;
    const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":brevo,"content-type":"application/json"},body:JSON.stringify({sender:{name:"Gulf Catering Hub",email:"support@gulfcateringhub.com"},to:[{email,name:recipient}],subject:"دعوة لشركتك للانضمام إلى Gulf Catering Hub",htmlContent:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9;color:#171717;max-width:620px;margin:auto"><h2>دعوة للانضمام إلى Gulf Catering Hub</h2><p>${contact_name?`مرحبًا ${contact_name}،`:"مرحبًا،"}</p><p>ندعو <strong>${company_name}</strong> للانضمام كمزود كيترنغ في Gulf Catering Hub، سوق رقمي لطلبات ضيافة الشركات ووجبات الموظفين والفعاليات.</p><p><strong>التسجيل ومشاهدة الفرص وتقديم عروض الأسعار مجاني.</strong> في صفقات السوق المفتوح فقط، عمولة النجاح الحالية 5% عندما يتم اختيار العرض ويكتمل الطلب.</p><ul><li>فرص تُطابق منطقة الخدمة والسعة ومهلة التجهيز</li><li>طلبات عروض أسعار منظمة بدل التنسيق المتفرق</li><li>ملف مزود عام وباقات بعد الاعتماد</li><li>إدارة الطلبات والتنفيذ والفواتير من مكان واحد</li></ul><p><a href="${inviteUrl}" style="display:inline-block;background:#b7924b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">ابدأ طلب الاعتماد</a></p><p style="font-size:13px"><a href="${partnerUrl}">اعرف كيف يعمل برنامج الشركاء والمتطلبات</a></p><p style="font-size:12px;color:#777">إنشاء الحساب لا يعني التفعيل التلقائي؛ حساب المزود يمر بمراجعة بيانات ومستندات قبل فتح فرص السوق.</p></div>`})});
    if(!response.ok){console.error("Brevo provider invite failed",await response.text());return json(req,{error:"email_send_failed"},502)}
    if(lead_id){const {error}=await client.from("provider_leads").update({status:"invited",invited_at:new Date().toISOString(),last_contacted_at:new Date().toISOString()}).eq("id",lead_id);if(error)console.error("lead status update failed",error)}
    return json(req,{ok:true,email_sent:true,company_name,email,lead_id:lead_id||null},201);
  }catch(error){console.error("provider-invite failed",error);return json(req,{error:"invite_failed"},500)}
});