(function(){
  'use strict';
  const current=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const primary=[
    ['index.html','Home','⌂'],['scanner.html','Scanner','⌁'],['dna.html','DNA','◎'],['marketplace.html','Market','◇'],['kennel.html','Kennel','♢']
  ];
  const desktop=[...primary,['stats.html','Stats',''],['companion-guide.html','Guide','']];
  function link([href,label]){const a=document.createElement('a');a.href=href;a.textContent=label;if(current===href)a.setAttribute('aria-current','page');return a}
  const shell=document.createElement('header');shell.className='kc-shell';
  const inner=document.createElement('div');inner.className='kc-shell-inner';
  const brand=document.createElement('a');brand.className='kc-brand';brand.href='index.html';brand.setAttribute('aria-label','Kubrow Companion home');brand.innerHTML='<span class="kc-brand-mark">K</span><span class="kc-brand-copy"><strong>Kubrow Companion</strong><small>Warframe breeder toolkit</small></span>';
  const nav=document.createElement('nav');nav.className='kc-nav';nav.setAttribute('aria-label','Primary navigation');desktop.forEach(x=>nav.appendChild(link(x)));
  const creator=document.createElement('span');creator.className='kc-creator';creator.innerHTML='Created by <b>lJWILLYl</b>';
  inner.append(brand,nav,creator);shell.appendChild(inner);document.body.prepend(shell);
  const bottom=document.createElement('nav');bottom.className='kc-bottom-nav';bottom.setAttribute('aria-label','Mobile navigation');
  primary.forEach(([href,label,icon])=>{const a=link([href,label]);a.innerHTML='<span aria-hidden="true">'+icon+'</span>'+label;bottom.appendChild(a)});
  document.body.appendChild(bottom);
})();
