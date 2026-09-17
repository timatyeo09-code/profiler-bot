import { validCron,serviceRequest,usageEnabled } from './_usage.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET.'});}
  if(!validCron(req))return res.status(401).json({error:'Unauthorised.'});
  if(!usageEnabled())return res.status(503).json({error:'Usage collection is not enabled.'});
  try{
    const day=new Date(Date.now()-86400000).toISOString().slice(0,10);
    const report=await serviceRequest('rpc/bil_owner_overview',{method:'POST',body:JSON.stringify({p_day:day})});
    // Keep daily organisation totals, not copies of emails, case content or user histories.
    const payload={date:day,timezone:'UTC',totals:report.totals,organisations:report.organisations,modules:report.modules,coverage:report.coverage};
    await serviceRequest('bil_daily_usage_reports?on_conflict=report_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({report_date:day,generated_at:new Date().toISOString(),payload})});
    return res.status(200).json({saved:true,date:day});
  }catch{return res.status(503).json({error:'Daily report could not be saved. Retry the scheduled job.'});}
}
