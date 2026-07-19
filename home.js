'use strict';
(() => {
 const $=id=>document.getElementById(id);
 const menu=$('menuButton'),nav=$('siteNav');
 menu?.addEventListener('click',()=>{const open=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(open));});
 const esc=v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
 const pretty=v=>String(v||'').replaceAll('_',' ').replace(/\b\w/g,l=>l.toUpperCase());
 async function boot(){
  const cfg=window.KUBROW_CONFIG;if(!cfg||!window.supabase)return;
  const client=window.kubrowSupabase||window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);window.kubrowSupabase=client;
  try{
   const [all,verified,market,recent]=await Promise.all([
    client.from('kennel_kubrows').select('id,breed',{count:'exact',head:false}).limit(1000),
    client.from('kennel_kubrows').select('id',{count:'exact',head:true}).eq('verification_source','screenshot'),
    client.from('kennel_kubrows').select('id',{count:'exact',head:true}).eq('is_public',true).in('trade_status',['for_sale','open_to_offers','reserved']),
    client.from('kennel_kubrows').select('id,kdna_id,name,breed,pattern,build_type,primary_colour,secondary_colour,tertiary_colour,screenshot_path,created_at').eq('verification_source','screenshot').order('created_at',{ascending:false}).limit(3)
   ]);
   $('dnaCount').textContent=(all.count??all.data?.length??0).toLocaleString();
   $('verifiedCount').textContent=(verified.count??0).toLocaleString();
   $('marketCount').textContent=(market.count??0).toLocaleString();
   $('breedCount').textContent=new Set((all.data||[]).map(x=>x.breed).filter(Boolean)).size.toLocaleString();
   if(recent.error)throw recent.error; await renderRecent(client,recent.data||[],cfg.storageBucket);
  }catch(e){console.warn('Homepage data unavailable',e);$('recentGrid').hidden=true;$('recentMessage').hidden=false;$('recentMessage').textContent='Community records could not be loaded right now.';}
 }
 async function renderRecent(client,rows,bucket){
  const host=$('recentGrid');if(!rows.length){host.innerHTML='<p class="message">No verified DNA records yet.</p>';return;}
  const images={};await Promise.all(rows.filter(r=>r.screenshot_path).map(async r=>{const {data}=await client.storage.from(bucket).createSignedUrl(r.screenshot_path,1800);if(data?.signedUrl)images[r.id]=data.signedUrl;}));
  host.innerHTML=rows.map(r=>`<a class="dnaCard" href="dna.html?id=${encodeURIComponent(r.kdna_id||r.id)}"><div class="dnaImage">${images[r.id]?`<img src="${esc(images[r.id])}" alt="${esc(r.name||'Kubrow')}" loading="lazy">`:'W'}</div><div class="dnaBody"><small>Palette verified</small><h3>${esc(r.name||'Unnamed Kubrow')}</h3><p>${esc([r.breed,r.pattern,r.build_type].filter(Boolean).map(pretty).join(' · ')||'DNA traits recorded')}</p><div class="colourRow">${[r.primary_colour,r.secondary_colour,r.tertiary_colour].filter(Boolean).map(c=>`<span class="colourTag">${esc(c)}</span>`).join('')}</div></div></a>`).join('');
 }
 boot();
})();
