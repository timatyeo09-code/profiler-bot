import crypto from 'node:crypto';
import { authenticate } from './_auth.js';

export const MODULES = new Set(['suite','child','adult','da','cases','dashboard','profiler','government','governance','guided','brief','cloud','admin','owner']);
export function isOwner(id) {
  return Boolean(id) && String(process.env.BIL_OWNER_USER_IDS || '').split(',').map(s=>s.trim()).filter(Boolean).includes(id);
}
export function usageEnabled() { return process.env.BIL_USAGE_ENABLED === 'true'; }
export async function serviceRequest(path, options={}) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Owner reporting is not configured.');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r=await fetch(`${process.env.SUPABASE_URL.replace(/\/$/,'')}/rest/v1/${path}`, {
    ...options, signal:AbortSignal.timeout(5000),
    headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...options.headers}
  });
  if(!r.ok)throw new Error('Reporting database request failed. Check the owner migration and server configuration.');
  return r.status===204 ? null : r.json();
}
export async function requireOwner(req,res) {
  const access=await authenticate(req);
  if(access.error){res.status(access.status).json({error:access.error});return null;}
  if(access.mode!=='authenticated'||!isOwner(access.user.id)){
    res.status(403).json({error:'This dashboard is restricted to the BIL platform owner.'});return null;
  }
  return access;
}
export async function recordUsage(access,event,module,source='server',id=crypto.randomUUID()) {
  if(!usageEnabled()||access.mode!=='authenticated')return false;
  try{
    await serviceRequest('bil_usage_events?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=ignore-duplicates,return=minimal'},body:JSON.stringify({
      id,user_id:access.user.id,organisation_id:access.profile.organisation_id||null,event,module,source
    })});
    return true;
  }catch{console.warn('BIL_USAGE_WRITE_FAILED');return false;}
}
export function reportDate(value) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
  const d=new Date(value+'T00:00:00Z');
  return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value ? value : null;
}
export function validCron(req){
  const secret=process.env.CRON_SECRET;
  if(!secret)return false;
  const a=crypto.createHash('sha256').update(String(req.headers?.authorization||'')).digest();
  const b=crypto.createHash('sha256').update(`Bearer ${secret}`).digest();
  return crypto.timingSafeEqual(a,b);
}
