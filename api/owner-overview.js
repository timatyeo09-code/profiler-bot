import { requireOwner,serviceRequest,reportDate,usageEnabled } from './_usage.js';
// Only call after requireOwner. Never return raw Auth admin records to the browser.
export async function registrationOrganisations(users){
  const wanted=new Set(users.map(u=>u.id).filter(id=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id)));
  const organisations=new Map();
  if(!wanted.size)return organisations;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!key||!process.env.SUPABASE_URL)throw new Error('Registration lookup unavailable.');
  for(let page=1;wanted.size;page++){
    const response=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/auth/v1/admin/users?page=${page}&per_page=1000`,{
      headers:{apikey:key,Authorization:`Bearer ${key}`},signal:AbortSignal.timeout(5000)
    });
    if(!response.ok)throw new Error('Registration lookup failed.');
    const payload=await response.json();
    if(!Array.isArray(payload.users))throw new Error('Invalid registration response.');
    for(const user of payload.users){
      if(!wanted.has(user.id))continue;
      const value=user.user_metadata?.organisation_name;
      organisations.set(user.id,typeof value==='string'?value.trim().slice(0,200):'');
      wanted.delete(user.id);
    }
    if(payload.users.length<1000)break;
  }
  return organisations;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  try{
    if(!await requireOwner(req,res))return;
    const day=reportDate(req.query?.date||new Date().toISOString().slice(0,10));
    if(!day||day>new Date().toISOString().slice(0,10))return res.status(400).json({error:'Choose today or an earlier date in YYYY-MM-DD format.'});
    const report=await serviceRequest('rpc/bil_owner_overview',{method:'POST',body:JSON.stringify({p_day:day})});
    let organisations=new Map(),registrationDetailsAvailable=true;
    try{organisations=await registrationOrganisations(report.users||[]);}
    catch{registrationDetailsAvailable=false;}
    const users=(report.users||[]).map(user=>({...user,registered_organisation:organisations.get(user.id)||null}));
    return res.status(200).json({...report,users,registration_details_available:registrationDetailsAvailable,collection_enabled:usageEnabled(),generated_at:new Date().toISOString()});
  }catch{return res.status(503).json({error:'Owner reporting is unavailable. Check the reporting migration and server configuration.'});}
}
