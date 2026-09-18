import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import handler from '../api/me.js';

process.env.SUPABASE_URL='https://example.invalid';
process.env.SUPABASE_ANON_KEY='test-only';
const user={id:'a975e3b1-21bd-4db5-a3e8-c4fd746283a9',email:'example@example.invalid',user_metadata:{full_name:'Example User',organisation_name:'<img src=x onerror=alert(1)>',role:'administrator',id:'forged-id'}};
const profile={id:user.id,full_name:'Example User',organisation_id:null,role:'practitioner',subscription_tier:'demo',account_status:'active'};
let calls=0;
globalThis.fetch=async(url)=>{
  calls++;
  return {ok:true,json:async()=>url.includes('/auth/v1/user')?user:[profile]};
};
function response(){return {headers:{},setHeader(k,v){this.headers[k]=v},status(code){this.code=code;return this},json(body){this.body=body;return this}}}
let res=response();
await handler({method:'GET',headers:{authorization:'Bearer test-token'}},res);
assert.equal(res.code,200);
assert.equal(res.headers['Cache-Control'],'no-store');
assert.equal(res.body.user.id,user.id);
assert.equal(res.body.user.organisation_name,user.user_metadata.organisation_name);
assert.equal(res.body.user.role,undefined);
assert.equal(res.body.profile.role,'practitioner');
assert.equal(res.body.profile.organisation_id,null);
const account=res.body;
res=response();await handler({method:'GET',headers:{}},res);assert.equal(res.code,401);assert.equal(calls,2);
res=response();await handler({method:'POST',headers:{}},res);assert.equal(res.code,405);
delete user.user_metadata;
res=response();await handler({method:'GET',headers:{authorization:'Bearer test-token'}},res);
assert.equal(res.body.user.organisation_name,'');
assert.equal(res.body.user.full_name,'');

const html=fs.readFileSync(new URL('../account.html',import.meta.url),'utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('showAccount'));
const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(m=>[m[1],{hidden:true,textContent:''}]));
vm.runInNewContext(script,{BILAuth:{init:async()=>account},document:{getElementById:id=>els[id]}});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(els.accountId.textContent,user.id);
assert.equal(els.accountOrganisation.textContent,'<img src=x onerror=alert(1)>');
assert.equal(els.details.hidden,false);
assert.equal(els.accountOrganisation.innerHTML,undefined);
console.log('PASS: authenticated account details, stable server ID, metadata cannot grant access, old accounts, method/auth guards and safe text rendering.');
