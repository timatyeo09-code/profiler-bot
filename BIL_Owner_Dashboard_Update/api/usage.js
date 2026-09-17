import { authenticate } from './_auth.js';
import { MODULES, recordUsage, usageEnabled } from './_usage.js';

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST.'});}
  try{
    const access=await authenticate(req);
    if(access.error)return res.status(access.status).json({error:access.error});
    if(access.mode!=='authenticated')return res.status(401).json({error:'Sign in first.'});
    if(!usageEnabled())return res.status(503).json({error:'Usage collection is not enabled.'});
    const {module,id}=req.body||{};
    if(!MODULES.has(module)||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id||''))return res.status(400).json({error:'Invalid usage event.'});
    const ok=await recordUsage(access,'tool_opened',module,'browser',id);
    return res.status(ok?200:503).json({recorded:ok});
  }catch{return res.status(503).json({error:'Usage collection is temporarily unavailable.'});}
}
