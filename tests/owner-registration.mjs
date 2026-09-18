import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import overview,{registrationOrganisations} from '../api/owner-overview.js';
const owner='11111111-1111-4111-8111-111111111111',member='22222222-2222-4222-8222-222222222222';
const env=()=>Object.assign(process.env,{SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service',BIL_OWNER_USER_IDS:owner});
const res=()=>({setHeader(){},status(n){this.code=n;return this},json(x){this.body=x;return this}});
test('registration lookup paginates and only keeps matching organisation text',async()=>{
 env();let pages=0;
 globalThis.fetch=async(url,options)=>{pages++;assert.equal(options.headers.Authorization,'Bearer service');return Response.json({users:pages===1?Array.from({length:1000},(_,i)=>({id:'other-'+i})): [{id:member,user_metadata:{organisation_name:'  Example School  ',role:'admin'},secret:'private'}]})};
 const result=await registrationOrganisations([{id:member}]);assert.equal(pages,2);assert.deepEqual([...result],[[member,'Example School']]);
});
test('owner endpoint enriches display without granting membership or leaking admin fields',async()=>{
 env();let adminCalls=0,identity=owner,failed=false;
 globalThis.fetch=async(url)=>{
  if(url.endsWith('/auth/v1/user'))return Response.json({id:identity});
  if(url.includes('/profiles?'))return Response.json([{id:identity,account_status:'active',subscription_tier:'demo'}]);
  if(url.includes('/rpc/'))return Response.json({users:[{id:member,name:'Example',organisation:null,organisation_id:null}]});
  if(url.includes('/auth/v1/admin/users')){adminCalls++;return failed?new Response('',{status:500}):Response.json({users:[{id:member,user_metadata:{organisation_name:'Example School',role:'admin'},private:'secret'}]})}
  throw Error('Unexpected request');
 };
 const req={method:'GET',headers:{authorization:'Bearer session'},query:{date:'2026-09-16'}};
 let r=res();await overview(req,r);assert.equal(r.code,200);assert.equal(r.body.users[0].registered_organisation,'Example School');assert.equal(r.body.users[0].organisation_id,null);assert.equal(r.body.users[0].id,member);assert.doesNotMatch(JSON.stringify(r.body),/secret|user_metadata/);
 identity=member;r=res();await overview(req,r);assert.equal(r.code,403);assert.equal(adminCalls,1);
 identity=owner;failed=true;r=res();await overview(req,r);assert.equal(r.code,200);assert.equal(r.body.registration_details_available,false);assert.equal(r.body.users[0].registered_organisation,null);
});
test('directory displays escaped registration organisation and ID; search finds both',async()=>{
 const ids=['date','refresh','export','status','content','search','orgFilter','statusFilter','people','metrics','coverage','trend','modules','attention','organisations','activity','reports'];
 const els=Object.fromEntries(ids.map(id=>[id,{value:'',innerHTML:'',textContent:'',replaceChildren(){},append(){}}]));
 const payload={users:[{id:member,name:'Example',email:'example@test.invalid',registered_organisation:'<School>',organisation:null,organisation_id:null,status:'active',tool_opens:0,analysis_requests:0}],totals:{},coverage:{},trend:[],modules:[],reports:[],organisations:[],recent:[]};
 vm.runInNewContext(fs.readFileSync(new URL('../js/bil-owner.js',import.meta.url),'utf8'),{document:{getElementById:id=>els[id]},BILAuth:{init:async()=>{},state:{isOwner:true},authHeaders:async()=>({})},fetch:async()=>({ok:true,json:async()=>payload})});
 await new Promise(r=>setImmediate(r));
 assert.match(els.people.innerHTML,/&lt;School&gt;/);assert.ok(els.people.innerHTML.includes(member));assert.doesNotMatch(els.people.innerHTML,/<School>/);
 els.search.value=member;els.search.oninput();assert.ok(els.people.innerHTML.includes(member));
 els.search.value='school';els.search.oninput();assert.ok(els.people.innerHTML.includes(member));
 els.search.value='missing';els.search.oninput();assert.match(els.people.innerHTML,/No matching accounts/);
});
