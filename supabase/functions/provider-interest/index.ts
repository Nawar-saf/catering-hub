import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const origins=new Set([
  "https://www.gulfcateringhub.com",
  "https://gulfcateringhub.com",
  "https://nawar-saf.github.io",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3000",
]);
function cors(req:Request){const origin=req.headers.get("origin")||"";return{"Access-Control-Allow-Origin":origins.has(origin)?origin:"https://www.gulfcateringhub.com","Vary":"Origin","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS","Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}}
function json(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:cors(req)})}
function clean(v:unknown,max=300){return String(v??"").trim().slice(0,max)}
function esc(v:unknown){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]||m))}
function phoneOk(v:string){const d=v.replace(/\D/g,"");return d.length>=8&&d.length<=15}
function safeUrl(v:unknown){const s=clean(v,300);if(!s)return"";if(/^https?:\/\/[^\s]+$/i.test(s))return s;if(/^www\.[^\s]+$/i.test(s))return`https://${s}`;if(/^@[A-Za-z0-9._]+$/.test(s))return`https://instagram.com/${s.slice(1)}`;if(/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}(\/[^\s]*)?$/.test(s))return`https://${s}`;return""}
async function sha256(s:string){const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
function ip(req:Request){return req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown"}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors(req)});
  if(req.method!=="POST")return json(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin");if(origin&&!origins.has(origin))return json(req,{error:"origin_not_allowed"},403);
  try{
    const url=Deno.env.get("SUPABASE_URL");
    const secretBundle=Deno.env.get("SUPABASE_SECRET_KEYS");
    let secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if(secretBundle){try{secret=JSON.parse(secretBundle)?.default||secret}catch(_){}}
    if(!url||!secret)throw new Error("server_config");
    const admin=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
    const hash=await sha256(ip(req));
    const {data:allowed,error:rateErr}=await admin.rpc("consume_provider_interest_rate_limit",{p_ip_hash:hash});
    if(rateErr)throw rateErr;if(!allowed)return json(req,{error:"rate_limited"},429);

    const body=await req.json();
    if(clean(body.website_trap,80))return json(req,{ok:true},201);
    const company_name=clean(body.company_name,160),contact_name=clean(body.contact_name,160),phone=clean(body.phone,40),email=clean(body.email,254).toLowerCase(),city=clean(body.city,120),website=safeUrl(body.website),source=clean(body.source,80)||"partner_page";
    if(company_name.length<2||contact_name.length<2||!phoneOk(phone))return json(req,{error:"invalid_input"},400);
    if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json(req,{error:"invalid_email"},400);

    let query=admin.from("provider_leads").select("id,status,email,phone");
    if(email)query=query.eq("email_normalized",email);else query=query.eq("phone_normalized",phone.replace(/\D/g,""));
    const {data:existing,error:findErr}=await query.maybeSingle();if(findErr)throw findErr;
    let lead;
    if(existing){
      const {data,error}=await admin.from("provider_leads").update({company_name,contact_name,phone,email:email||null,city:city||null,website:website||null,source,last_interest_at:new Date().toISOString()}).eq("id",existing.id).select("id,status").single();if(error)throw error;lead=data;
    }else{
      const {data,error}=await admin.from("provider_leads").insert({company_name,contact_name,phone,email:email||null,city:city||null,website:website||null,source,status:"new",last_interest_at:new Date().toISOString()}).select("id,status").single();if(error)throw error;lead=data;
    }

    const brevo=Deno.env.get("BREVO_API_KEY");
    if(brevo){
      fetch("https://api.brevo.com/v3/smtp/email",{method:"POST",headers:{accept:"application/json","api-key":brevo,"content-type":"application/json"},body:JSON.stringify({sender:{name:"Gulf Catering Hub",email:"support@gulfcateringhub.com"},to:[{email:"support@gulfcateringhub.com",name:"Gulf Catering Hub"}],subject:`طلب انضمام مزود جديد — ${company_name}`,htmlContent:`<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.8"><h2>اهتمام جديد من مزود</h2><p><b>الشركة:</b> ${esc(company_name)}</p><p><b>التواصل:</b> ${esc(contact_name)}</p><p><b>الهاتف:</b> ${esc(phone)}</p><p><b>البريد:</b> ${esc(email||"—")}</p><p><b>المدينة:</b> ${esc(city||"—")}</p><p><b>الموقع:</b> ${esc(website||"—")}</p><p>الطلب موجود في لوحة نمو السوق.</p></div>`})}).catch(e=>console.error("provider interest notification failed",e));
    }
    return json(req,{ok:true,id:lead.id,status:lead.status},201);
  }catch(e){console.error("provider-interest failed",e);return json(req,{error:"interest_failed"},500)}
});