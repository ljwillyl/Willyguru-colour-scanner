'use strict';
const SUPABASE_URL='https://mxboguiriifkmsmcusjt.supabase.co';
const SUPABASE_KEY='sb_publishable_gZwUnRiKV2Ww2wqAXs9mBA_Z8lFw0LV';
const BUCKET='kubrow-screenshots';
const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
const el=id=>document.getElementById(id);
let session=null;

function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function date(v){try{return new Date(v).toLocaleString()}catch{return v||''}}
function bool(v){return v===true?'On':v===false?'Off':'Unknown'}
function setMessage(text,bad=false){el('globalMessage').textContent=text||'';el('globalMessage').style.color=bad?'var(--danger)':'var(--warn)'}

async function checkAdmin(){
  const {data:{session:s}}=await client.auth.getSession();
  session=s;
  if(!session){showLogin();return false}
  const {data,error}=await client.from('admin_users').select('user_id').eq('user_id',session.user.id).maybeSingle();
  if(error||!data){await client.auth.signOut();showLogin();el('loginMessage').textContent='This account is signed in but is not listed as a WillyGuru admin.';return false}
  showApp();return true
}
function showLogin(){el('loginCard').hidden=false;el('app').hidden=true}
function showApp(){el('loginCard').hidden=true;el('app').hidden=false;el('adminEmail').textContent=session.user.email||'Admin';loadSubmissions()}

el('signIn').onclick=async()=>{
  const btn=el('signIn');btn.disabled=true;el('loginMessage').textContent='Signing in…';
  const {data,error}=await client.auth.signInWithPassword({email:el('email').value.trim(),password:el('password').value});
  btn.disabled=false;
  if(error){el('loginMessage').textContent=error.message;return}
  session=data.session;el('loginMessage').textContent='';await checkAdmin();
};
el('signOut').onclick=async()=>{await client.auth.signOut();session=null;showLogin()};
el('refresh').onclick=loadSubmissions;el('statusFilter').onchange=loadSubmissions;

async function signedImage(path){
  if(!path)return null;
  const {data,error}=await client.storage.from(BUCKET).createSignedUrl(path,900);
  if(error)return null;
  return data.signedUrl;
}
async function loadSubmissions(){
  setMessage('Loading submissions…');el('submissions').innerHTML='';
  let q=client.from('kubrow_submissions').select('*').order('created_at',{ascending:false}).limit(100);
  const filter=el('statusFilter').value;if(filter!=='all')q=q.eq('status',filter);
  const {data,error}=await q;
  if(error){setMessage(error.message,true);return}
  el('summary').textContent=`${data.length} ${filter==='all'?'submission(s)':filter+' submission(s)'}`;
  if(!data.length){el('submissions').innerHTML='<div class="card empty">No submissions found.</div>';setMessage('');return}
  const imageUrls=await Promise.all(data.map(x=>signedImage(x.screenshot_url)));
  el('submissions').innerHTML=data.map((x,i)=>card(x,imageUrls[i])).join('');
  document.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>updateStatus(Number(b.dataset.id),b.dataset.action,b));
  setMessage('');
}
function colourBox(slot,predicted,confirmed){return `<div class="colour"><b>${slot}</b><div class="pred">Predicted: ${esc(predicted||'—')}</div><div class="confirmed">Confirmed: ${esc(confirmed||'—')}</div></div>`}
function card(x,url){
  return `<article class="card submission">
    <div class="topline"><div><b>Submission #${x.id}</b><div class="muted">${date(x.created_at)}</div></div><span class="badge ${esc(x.status)}">${esc(x.status)}</span></div>
    <div class="shot">${url?`<a href="${esc(url)}" target="_blank" rel="noopener"><img src="${esc(url)}" alt="Kubrow submission screenshot"></a>`:'<div class="missing">No accessible screenshot.<br>This may be an older v4 submission or the file may be missing.</div>'}</div>
    <div class="details">
      <div class="detail"><span>Tester</span>${esc(x.tester_name||'Anonymous')}</div>
      <div class="detail"><span>Platform</span>${esc(x.platform||'Unknown')}</div>
      <div class="detail"><span>HDR / correction</span>${bool(x.hdr)} / ${bool(x.colour_correction)}</div>
      <div class="detail"><span>Scanner / DB</span>${esc(x.scanner_version||'—')} / ${esc(x.database_version||'—')}</div>
      <div class="detail"><span>Source ID</span>${esc(x.source_id||'—')}</div>
      <div class="detail"><span>Image file</span>${esc(x.screenshot_filename||'—')}</div>
    </div>
    <div class="colours">
      ${colourBox('Primary',x.predicted_primary,x.confirmed_primary)}
      ${colourBox('Secondary',x.predicted_secondary,x.confirmed_secondary)}
      ${colourBox('Tertiary',x.predicted_tertiary,x.confirmed_tertiary)}
    </div>
    ${x.notes?`<div class="notes">${esc(x.notes)}</div>`:''}
    <div class="reviewActions">
      <button class="approve" data-id="${x.id}" data-action="approved">Approve</button>
      <button class="pending" data-id="${x.id}" data-action="pending">Return pending</button>
      <button class="reject" data-id="${x.id}" data-action="rejected">Reject</button>
    </div>
  </article>`
}
async function updateStatus(id,status,button){
  const message=status==='approved'?'Approve this submission and add its three colour samples to the public scanner?':status==='rejected'?'Reject this submission?':'Return this submission to pending review?';
  if(!confirm(message))return;
  const buttons=[...button.parentElement.querySelectorAll('button')];buttons.forEach(x=>x.disabled=true);
  const {error}=await client.from('kubrow_submissions').update({status}).eq('id',id);
  if(error){setMessage(error.message,true);buttons.forEach(x=>x.disabled=false);return}
  setMessage(`Submission #${id} changed to ${status}.`);await loadSubmissions();
}
client.auth.onAuthStateChange(()=>setTimeout(checkAdmin,0));
checkAdmin();
