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

    const body=await req.json();
    const company_id=clean(body.company_id,50), email=clean(body.email,254).toLowerCase(), full_name=clean(body.full_name,160);
    const role=clean(body.role,30), limit=body.approval_limit==null||body.approval_limit===""?null:Number(body.approval_limit);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!["requester","approver","finance","admin"].includes(role)||!company_id|| (limit!==null&&(!Number.isFinite(limit)||limit<0))) return json(req,{error:"invalid_input"},400);

    const {data:existing,error:findErr}=await client.from("company_members").select("id,status").eq("company_id",company_id).ilike("email",email).maybeSingle();
    if(findErr) throw findErr;
    let member;
    if(existing?.status==="active") return json(req,{error:"already_active"},409);
    if(existing?.status==="disabled"){
      const {error:delErr}=await client.from("company_members").delete().eq("id",existing.id); if(delErr) throw delErr;
    }
    if(existing?.status==="invited"){
      const {data,error}=await client.from("company_members").update({full_name,role,approval_limit:role==="approver"?limit:null}).eq("id",existing.id).select("id,email,full_name,role,status").single();
      if(error) throw error; member=data;
    }else{
      const {data,error}=await client.from("company_members").insert({company_id,email,full_name,role,approval_limit:role==="approver"?limit:null}).select("id,email,full_name,role,status").single();
      if(error) throw error; member=data;
    }

    let email_sent=false;
    if(brevo){
      const roleLabel={requester:"مقدم طلبات",approver:"معتمد طلبات",finance:"المالية",admin:"مسؤول الشركة"}[role]||role;
      const inviteUrl=`https://www.gulfcateringhub.com/company/?invite_email=${encodeURIComponent(email)}`;
      const response=await fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":brevo,"content-type":"application/json"},body:JSON.stringify({sender:{name:"Gulf Catering Hub",email:"support@gulfcateringhub.com"},to:[{email,name:full_name||undefined}],subject:"دعوة للانضمام إلى حساب الشركة — Gulf Catering Hub",htmlContent:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.9;color:#171717"><h2>دعوة إلى Gulf Catering Hub</h2><p>${full_name?`مرحبًا ${full_name}،`:"مرحبًا،"}</p><p>تمت دعوتك للانضمام إلى حساب شركتك بصلاحية <strong>${roleLabel}</strong>.</p><p>استخدم نفس البريد <strong>${email}</strong> عند التسجيل أو تسجيل الدخول، وسيتم ربط حسابك بالشركة تلقائيًا.</p><p><a href="${inviteUrl}" style="display:inline-block;background:#b7924b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px">فتح حساب الشركة</a></p><p style="color:#666;font-size:13px">إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة.</p></div>`})});
      email_sent=response.ok;
      if(!response.ok) console.error("Brevo invite failed",await response.text());
    }
    return json(req,{ok:true,member,email_sent},201);
  }catch(error){console.error("company-invite failed",error);return json(req,{error:"invite_failed"},500)}
});