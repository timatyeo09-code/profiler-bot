import test from 'node:test';
import assert from 'node:assert/strict';
import overview from '../api/owner-overview.js';
import usage from '../api/usage.js';
import daily from '../api/owner-daily-report.js';
import {reportDate} from '../api/_usage.js';

const owner='11111111-1111-4111-8111-111111111111';
const member='22222222-2222-4222-8222-222222222222';
function setup(id=owner,status='active'){
 Object.assign(process.env,{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',BIL_OWNER_USER_IDS:owner,BIL_USAGE_ENABLED:'true',CRON_SECRET:'test-secret'});
 const writes=[];
 globalThis.fetch=async(url,options={})=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id,email:'test@example.invalid'});
  if(url.includes('/profiles?'))return Response.json([{id,organisation_id:'server-org',role:'administrator',subscription_tier:'admin',account_status:status}]);
  writes.push({url,...options});
  if(url.includes('/rpc/'))return Response.json({totals:{active_users:1},organisations:[],modules:[],coverage:{},users:[{email:'private@example.invalid'}],recent:[{user_id:id}]});
  return new Response(null,{status:204});
 };
 return writes;
}
function response(){return {code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(x){this.body=x;return this}}}
function req(method='GET',body){return {method,body,headers:{authorization:'Bearer session'},query:{date:'2026-09-16'}}}
test('owner access boundary and fail-closed legacy mode',async()=>{
 for(const [id,status,expected] of [[owner,'active',200],[member,'active',403],[owner,'suspended',403]]){
  const calls=setup(id,status),res=response();await overview(req(),res);assert.equal(res.code,expected);assert.equal(calls.length,expected===200?1:0);
 }
 setup();const noToken=req();noToken.headers={};let res=response();await overview(noToken,res);assert.equal(res.code,401);
 delete process.env.SUPABASE_ANON_KEY;res=response();await overview(req(),res);assert.equal(res.code,403);
});
test('events use authenticated identity and fixed event type',async()=>{
 const calls=setup(member),res=response();await usage(req('POST',{module:'child',id:owner,user_id:owner,organisation_id:'spoofed',event:'analysis_requested',occurred_at:'2000-01-01'}),res);
 assert.equal(res.code,200);const body=JSON.parse(calls[0].body);
 assert.equal(body.user_id,member);assert.equal(body.organisation_id,'server-org');assert.equal(body.event,'tool_opened');assert.equal(body.source,'browser');assert.equal(body.occurred_at,undefined);
 assert.match(calls[0].headers.Prefer,/ignore-duplicates/);
});
test('bad event and disabled collection never write',async()=>{
 let calls=setup(),res=response();await usage(req('POST',{module:'unknown',id:owner}),res);assert.equal(res.code,400);assert.equal(calls.length,0);
 calls=setup();process.env.BIL_USAGE_ENABLED='false';res=response();await usage(req('POST',{module:'child',id:owner}),res);assert.equal(res.code,503);assert.equal(calls.length,0);
});
test('daily job requires scheduler secret and excludes named account data',async()=>{
 const calls=setup();let res=response();await daily(req(),res);assert.equal(res.code,401);assert.equal(calls.length,0);
 res=response();await daily({method:'GET',headers:{authorization:'Bearer test-secret'}},res);assert.equal(res.code,200);
 const saved=JSON.parse(calls[1].body);assert.equal(saved.payload.users,undefined);assert.equal(saved.payload.recent,undefined);assert.match(calls[1].headers.Prefer,/merge-duplicates/);
 delete process.env.CRON_SECRET;res=response();await daily({method:'GET',headers:{authorization:'Bearer test-secret'}},res);assert.equal(res.code,401);
});
test('real dates only; report errors do not leak backend details',async()=>{
 assert.equal(reportDate('2026-02-30'),null);assert.equal(reportDate('2024-02-29'),'2024-02-29');
 setup();let res=response();const bad=req();bad.query.date='2999-01-01';await overview(bad,res);assert.equal(res.code,400);
 setup();globalThis.fetch=async()=>{throw new Error('secret backend detail')};res=response();await overview(req(),res);assert.equal(res.code,503);assert.doesNotMatch(JSON.stringify(res.body),/secret backend detail/);
});
