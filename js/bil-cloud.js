(function(){
  const cfg=window.BIL_CONFIG||{};
  const state={client:null,user:null,ready:false};
  const hasConfig=()=>Boolean(cfg.supabaseUrl&&cfg.supabaseAnonKey);
  async function init(){
    if(!hasConfig()) return {mode:'local',message:'Cloud connection is not configured.'};
    if(!window.supabase) throw new Error('Supabase library failed to load.');
    state.client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true}});
    const {data,error}=await state.client.auth.getSession();
    if(error) throw error;
    state.user=data.session?.user||null;state.ready=true;
    state.client.auth.onAuthStateChange((_event,session)=>{state.user=session?.user||null;window.dispatchEvent(new CustomEvent('bil-auth-change',{detail:{user:state.user}}));});
    return {mode:'cloud',user:state.user};
  }
  async function signIn(email,password){if(!state.client) await init();const {data,error}=await state.client.auth.signInWithPassword({email,password});if(error) throw error;state.user=data.user;return data;}
  async function signUp(email,password,fullName){if(!state.client) await init();const {data,error}=await state.client.auth.signUp({email,password,options:{data:{full_name:fullName||''}}});if(error) throw error;return data;}
  async function signOut(){if(!state.client)return;const {error}=await state.client.auth.signOut();if(error)throw error;state.user=null;}
  function localCases(){try{return JSON.parse(localStorage.getItem(cfg.localStorageKey||'bil-cases-v2')||'[]')}catch{return[]}}
  function setLocalCases(cases){localStorage.setItem(cfg.localStorageKey||'bil-cases-v2',JSON.stringify(cases||[]));}
  async function pushCases(){if(!state.client||!state.user)throw new Error('Sign in before syncing.');const cases=localCases();const rows=cases.map(c=>({external_id:c.id||c.ref,reference:c.ref||'',case_type:c.type||'',subject_reference:c.initials||'',status:c.status||'Open',risk_level:c.risk||'Not assessed',assigned_practitioner:c.practitioner||'',review_date:c.review||null,payload:c,updated_at:new Date(c.updated||Date.now()).toISOString()}));if(!rows.length)return {count:0};const {error}=await state.client.from('cases').upsert(rows,{onConflict:'external_id'});if(error)throw error;await logAudit('sync_push',{count:rows.length});return {count:rows.length};}
  async function pullCases(){if(!state.client||!state.user)throw new Error('Sign in before syncing.');const {data,error}=await state.client.from('cases').select('payload,updated_at').order('updated_at',{ascending:false});if(error)throw error;const remote=(data||[]).map(r=>r.payload).filter(Boolean);setLocalCases(remote);await logAudit('sync_pull',{count:remote.length});return {count:remote.length};}
  async function logAudit(action,details){if(!state.client||!state.user)return;await state.client.from('audit_log').insert({action,details:details||{},user_id:state.user.id});}
  window.BILCloud={init,signIn,signUp,signOut,pushCases,pullCases,localCases,setLocalCases,hasConfig,state};
})();
