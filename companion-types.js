"use strict";
window.KubrowCompanionOptions={
 breeds:["Chesa","Huras","Raksa","Sahasa","Sunika","Helminth Charger","Hybrid / Glitched"],
 patterns:["Domino","Hound","Lotus","Merle","Patchy","Striped","Helminth","Other / Unknown"],
 bodies:["Bulky","Athletic","Skinny","Helminth","Hybrid: Kubrow body","Hybrid: Charger body"]
};
window.updateCompanionFields=function(prefix=""){
 const get=id=>document.getElementById(prefix+id), type=get("companionType"), breed=get("breed"), body=get("buildType"), role=get("channel4Role"), eye=get("eyes")||get("eyeColour"), accent=get("accentColour"), pattern=get("pattern");
 if(!type||!breed)return;
 const t=type.value;
 const charger=t==="helminth_charger", hybrid=t==="hybrid";
 [...breed.options].forEach(o=>{if(!o.value)return;o.hidden=(charger&&o.value!=="Helminth Charger")||(!charger&&o.value==="Helminth Charger"&&t==="kubrow")});
 if(charger)breed.value="Helminth Charger";
 if(role){role.innerHTML=hybrid?'<option value="eye">Eye colour</option><option value="accent">Accent / fourth body colour</option><option value="energy">Energy colour</option><option value="dual">Eye + fourth colour share channel</option>':charger?'<option value="accent">Accents</option><option value="energy">Energy</option>':'<option value="eye">Eye / inherited energy</option>';}
 const eyeLabel=document.querySelector(`[data-eye-label="${prefix||'main'}"]`);
 if(eyeLabel)eyeLabel.firstChild.textContent=charger?'Energy colour ':hybrid?'Eye / Energy colour ':'Eye colour ';
 const accentWrap=document.querySelector(`[data-accent-wrap="${prefix||'main'}"]`);
 if(accentWrap)accentWrap.hidden=!(charger||hybrid);
 const hybridHelp=document.querySelector(`[data-hybrid-help="${prefix||'main'}"]`);
 if(hybridHelp)hybridHelp.hidden=!hybrid;
};
document.addEventListener('DOMContentLoaded',()=>{
 document.querySelectorAll('[data-companion-controller]').forEach(el=>{el.addEventListener('change',()=>window.updateCompanionFields(el.dataset.prefix||''));window.updateCompanionFields(el.dataset.prefix||'')});
});
