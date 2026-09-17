import { requireOwner,serviceRequest,reportDate,usageEnabled } from './_usage.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  try{
    if(!await requireOwner(req,res))return;
    const day=reportDate(req.query?.date||new Date().toISOString().slice(0,10));
    if(!day||day>new Date().toISOString().slice(0,10))return res.status(400).json({error:'Choose today or an earlier date in YYYY-MM-DD format.'});
    const report=await serviceRequest('rpc/bil_owner_overview',{method:'POST',body:JSON.stringify({p_day:day})});
    return res.status(200).json({...report,collection_enabled:usageEnabled(),generated_at:new Date().toISOString()});
  }catch{return res.status(503).json({error:'Owner reporting is unavailable. Check the reporting migration and server configuration.'});}
}
