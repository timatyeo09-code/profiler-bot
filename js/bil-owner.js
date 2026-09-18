(()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const names={suite:'Suite',child:'Child welfare',adult:'Adult safeguarding',da:'Domestic abuse',cases:'Case workspace',dashboard:'Manager dashboard',profiler:'Behaviour Engine',government:'Government demo',governance:'Governance',guided:'Guided demo',brief:'Product brief',cloud:'Cloud roadmap',admin:'Settings',owner:'Owner dashboard'};
 const actions={access_checked:'Account access checked',tool_opened:'Tool opened',analysis_requested:'AI analysis requested'};
 let data=null,loading=false;
 const stamp=x=>x?new Date(x).toLocaleString('en-GB',{timeZone:'UTC'})+' UTC':'Not recorded';
 const empty=(cols,text)=>`<tr><td colspan="${cols}" class="empty">${esc(text)}</td></tr>`;
 $('date').value=new Date().toISOString().slice(0,10);$('date').max=$('date').value;
 function bars(rows,label,value){const max=Math.max(1,...rows.map(r=>Number(r[value])));return rows.map(r=>`<div class="barrow"><span>${esc(label(r))}</span><div class="bar"><i style="width:${Number(r[value])/max*100}%"></i></div><span>${Number(r[value])}</span></div>`).join('')||'<p>No recorded activity.</p>'}
 function renderPeople(){
  if(!data)return;
  const q=$('search').value.toLowerCase(),org=$('orgFilter').value,status=$('statusFilter').value;
  const rows=data.users.filter(u=>[u.name,u.email,u.id,u.organisation,u.registered_organisation].join(' ').toLowerCase().includes(q)&&(!org||(u.organisation_id||'unassigned')===org)&&(!status||u.status===status));
  $('people').innerHTML=rows.map(u=>`<tr><td>${esc(u.name)}<small>${esc(u.email)}</small><small class="user-id">User ID: ${esc(u.id||'Not available')}</small><small>${u.email_confirmed_at?'Email confirmed':'Email not confirmed'}</small></td><td>${esc(u.organisation||u.registered_organisation||'Not provided')}<small>${u.organisation?(u.registered_organisation&&u.registered_organisation!==u.organisation?'Registered: '+esc(u.registered_organisation):'Assigned organisation'):(u.registered_organisation?'Registered at signup · no organisation access assigned':'No organisation access assigned')}</small></td><td><span class="chip">${esc(u.status)}</span><small>${esc(u.tier)} · ${esc(u.role)}</small><small>Expires: ${u.access_expires_at?esc(stamp(u.access_expires_at)):'No expiry set'}</small></td><td>${esc(stamp(u.last_activity))}</td><td>${Number(u.tool_opens)}</td><td>${Number(u.analysis_requests)}</td></tr>`).join('')||empty(6,'No matching accounts.');
 }
 function download(payload,name){const b=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(b),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
 function render(){
  const t=data.totals;
  $('metrics').innerHTML=[['Registered accounts',t.registered_users,'Current total'],['New accounts',t.new_users,'Selected UTC day'],['Active users',t.active_users,'Distinct recorded users'],['Tool opens',t.tool_opens,'Browser-reported'],['AI requests',t.analysis_requests,'Server-recorded requests']].map(([a,b,c])=>`<div class="metric"><span>${a}</span><strong>${Number(b)}</strong><small>${c}</small></div>`).join('');
  $('coverage').textContent=`Collection ${data.collection_enabled?'enabled':'OFF'} · Reporting installed: ${stamp(data.coverage.installed_at)} · First recorded event: ${stamp(data.coverage.first_event_at)}. Empty counts before collection began do not mean no usage.`;
  $('trend').innerHTML=bars(data.trend,r=>r.day,'active_users');$('modules').innerHTML=bars(data.modules,r=>names[r.module]||r.module,'opens');
  const now=Date.now(),exp=data.users.filter(u=>u.status==='active'&&u.access_expires_at&&new Date(u.access_expires_at).getTime()<=now+7*86400000).length;
  const unassigned=data.users.filter(u=>!u.organisation_id).length;
  $('attention').innerHTML=`<p><span class="warn">${exp}</span> active-status accounts expired or expiring within seven days.</p><p><span class="warn">${unassigned}</span> accounts are not linked to a managed organisation. A name entered at signup does not grant organisation access.</p><p>${data.reports.length?'Latest saved report: '+esc(data.reports[0].report_date):'No daily report has been saved yet. Check scheduler setup after activation.'}</p>`;
  $('organisations').innerHTML=data.organisations.map(o=>`<tr><td>${esc(o.name)}</td><td>${Number(o.registered_users)}</td><td>${Number(o.active_users)}</td><td>${Number(o.tool_opens)}</td><td>${Number(o.analysis_requests)}</td></tr>`).join('')||empty(5,'No organisations.');
  const selected=$('orgFilter').value;
  $('orgFilter').innerHTML='<option value="">All assigned organisations</option>'+data.organisations.map(o=>`<option value="${esc(o.id||'unassigned')}">${esc(o.name)}</option>`).join('');$('orgFilter').value=selected;
  renderPeople();
  const users=new Map(data.users.map(u=>[u.id,u]));
  $('activity').innerHTML=data.recent.map(e=>`<tr><td>${esc(stamp(e.occurred_at))}</td><td>${esc(users.get(e.user_id)?.email||'Deleted or unavailable account')}</td><td>${esc(actions[e.event]||e.event)}</td><td>${esc(names[e.module]||e.module)}</td><td>${e.source==='server'?'Server-recorded':'Browser-reported'}</td></tr>`).join('')||empty(5,'No recorded events for this day.');
  $('reports').replaceChildren();
  if(!data.reports.length)$('reports').textContent='No saved daily reports yet.';
  data.reports.forEach(r=>{const row=document.createElement('div');row.className='reportrow';const label=document.createElement('span');label.textContent=`${r.report_date} · generated ${stamp(r.generated_at)}`;const button=document.createElement('button');button.textContent='Download report';button.onclick=()=>download(r.payload,`BIL-usage-${r.report_date}.json`);row.append(label,button);$('reports').append(row)});
 }
 async function load(){
  if(loading)return;loading=true;$('date').disabled=true;$('refresh').disabled=true;$('export').disabled=true;$('status').className='';$('status').textContent='Loading owner report…';$('content').hidden=true;
  try{
   await BILAuth.init();
   if(!BILAuth.state.isOwner)throw new Error('This page is restricted to the BIL platform owner.');
   const response=await fetch('/api/owner-overview?date='+encodeURIComponent($('date').value),{headers:await BILAuth.authHeaders(),cache:'no-store'});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load report.');
   data=result;render();$('content').hidden=false;$('export').disabled=false;$('status').textContent='Updated '+stamp(result.generated_at)+' · Account and organisation details are current; usage follows the selected date.'+(result.registration_details_available===false?' Registration organisation details could not be loaded. Please refresh.':'');
  }catch(e){data=null;$('status').className='error';$('status').textContent=e.message||'Unable to load reporting.';}
  finally{loading=false;$('date').disabled=false;$('refresh').disabled=false;}
 }
 $('refresh').onclick=load;$('date').onchange=load;$('search').oninput=renderPeople;$('orgFilter').onchange=renderPeople;$('statusFilter').onchange=renderPeople;
 $('export').onclick=()=>{if(data)download({date:data.date,timezone:data.timezone,generated_at:data.generated_at,totals:data.totals,organisations:data.organisations,modules:data.modules,coverage:data.coverage},`BIL-usage-${data.date}.json`)};
 load();
})();
