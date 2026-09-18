const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync(__dirname+'/../login.html','utf8');
const script=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('safeNext'));
function setup(response={data:{session:null}},search='?next=%2Fcases.html'){
 const els={},calls=[],redirects=[];
 const node=()=>({value:'',hidden:false,disabled:false,textContent:'',className:'',validityMessage:'',setAttribute(){},removeAttribute(){},focus(){},setCustomValidity(x){this.validityMessage=x},reportValidity(){return !this.validityMessage},querySelector(){return node()}});
 for(const id of [...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]))els[id]=node();
 const client={auth:{signUp:async payload=>{calls.push(payload);if(response instanceof Error)throw response;return response}}};
 const context={URL,URLSearchParams,location:{origin:'https://example.test',search,replace:p=>redirects.push(p)},document:{getElementById:id=>els[id],querySelectorAll:()=>[els.createAccount,els.cancelSignup,els.signIn,els.magicLink,els.redeem,els.showSignup]},BILAuth:{init:async()=>({mode:'anonymous'}),state:{session:null,client}},setTimeout:fn=>fn()};
 vm.createContext(context);vm.runInContext(script,context);
 return {els,calls,redirects,context};
}
async function submit(t){t.els.signupName.value='  Example User  ';t.els.signupOrganisation.value='  Example Organisation  ';t.els.signupEmail.value='new@example.test';t.els.signupPassword.value='Example-only-123';t.els.signupConfirm.value='Example-only-123';await t.els.signupForm.onsubmit({preventDefault(){}})}
(async()=>{
 let t=setup();await submit(t);assert.equal(t.calls.length,1);assert.equal(t.calls[0].options.data.full_name,'Example User');assert.equal(t.calls[0].options.data.organisation_name,'Example Organisation');assert.equal(t.calls[0].options.data.id,undefined);assert.equal(t.calls[0].options.data.organisation_id,undefined);assert.equal(t.calls[0].options.data.role,undefined);assert.equal(t.calls[0].options.emailRedirectTo,'https://example.test/login.html?next=%2Fcases.html');assert.equal(t.redirects.length,0);assert.match(t.els.status.textContent,/Check your email/);assert.equal(t.els.signupPassword.value,'');assert.equal(t.els.createAccount.disabled,false);
 t=setup({data:{session:{access_token:'mock'}}});await submit(t);assert.equal(t.redirects[0],'/cases.html');
 t=setup({error:{message:'Signups are disabled'}});await submit(t);assert.equal(t.els.status.textContent,'Signups are disabled');assert.equal(t.redirects.length,0);assert.equal(t.els.createAccount.disabled,false);
 t=setup();t.els.signupPassword.value='first-password';t.els.signupConfirm.value='different-password';await t.els.signupForm.onsubmit({preventDefault(){}});assert.equal(t.calls.length,0);assert.match(t.els.signupConfirm.validityMessage,/do not match/);
 t=setup(new Error('Network unavailable'));await submit(t);assert.equal(t.els.status.textContent,'Network unavailable');assert.equal(t.els.createAccount.disabled,false);
 for(const value of ['https://other.test','//other.test','javascript:alert(1)','/login.html']){t=setup();assert.equal(vm.runInContext('safeNext('+JSON.stringify(value)+')',t.context),'/')}
 t=setup();t.els.showSignup.onclick();assert.equal(t.els.loginFields.hidden,true);assert.equal(t.els.signupForm.hidden,false);t.els.cancelSignup.onclick();assert.equal(t.els.loginFields.hidden,false);assert.equal(t.els.signupForm.hidden,true);
 t=setup();t.els.signupName.value='   ';t.els.signupOrganisation.value='   ';t.els.signupForm.reportValidity=()=>!t.els.signupName.validityMessage&&!t.els.signupOrganisation.validityMessage;await t.els.signupForm.onsubmit({preventDefault(){}});assert.equal(t.calls.length,0);assert.match(t.els.signupName.validityMessage,/complete/);t.els.signupName.oninput();assert.equal(t.els.signupName.validityMessage,'');
 t=setup();let release;t.context.BILAuth.state.client.auth.signUp=()=>new Promise(r=>release=r);const first=submit(t);await new Promise(r=>setImmediate(r));await t.els.signupForm.onsubmit({preventDefault(){}});assert.equal(t.els.createAccount.disabled,true);release({data:{session:null}});await first;
 console.log('PASS: confirmation and immediate-session flows; rejected and network requests; password mismatch; safe redirects; form switching; pending submission protection. No live accounts created or emails sent.');
})().catch(e=>{console.error(e);process.exit(1)});
