(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PonponMotions=api;})(globalThis,()=>{
'use strict';
const NAMES={idle:'idle · 呼吸',blink:'blink · 瞬き',talk:'talk · 口パク',nod:'nod · うなずき',surprise:'surprise · 驚き',cry:'cry · うつむく',tail_wag:'tail_wag · しっぽ',stumble:'stumble · よろめく',fall_back:'fall_back · 後ろへ転倒','idle+blink':'idle + blink','talk+blink':'talk + blink','idle+tail_wag':'idle + tail_wag'};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
function evaluate(rig,motion,t,duration=4,face='neutral'){
 const names=Object.hasOwn(NAMES,motion)?motion.split('+'):['idle'];t=Number.isFinite(t)?Math.max(0,t):0;duration=Number.isFinite(duration)&&duration>0?duration:4;
 const pose=Object.create(null),warnings=[];
 // Base data is immutable: face is an absolute local override, motion is additive/multiplicative.
 const selected=rig.faces.find(f=>f.id===face);for(const [key,value] of Object.entries(selected?.overrides||{}))pose[key]={...value};
 const tagged=(p,tag)=>p.id===tag||p.tags?.includes(tag);
 function offset(tag,patch){for(const p of rig.parts.filter(p=>tagged(p,tag))){const base={...p,...pose[p.id]};pose[p.id]||={};for(const [key,v] of Object.entries(patch))pose[p.id][key]=key==='scaleX'||key==='scaleY'?base[key]*v:base[key]+v;}}
 function switchPair(openTag,closedTag,closed){const opens=rig.parts.filter(p=>tagged(p,openTag)&&p.image),closes=rig.parts.filter(p=>tagged(p,closedTag)&&p.image);if(!opens.length||!closes.length){warnings.push(openTag+' / '+closedTag+' の両素材が必要です');return}for(const p of opens){pose[p.id]||={};pose[p.id].visible=!closed}for(const p of closes){pose[p.id]||={};pose[p.id].visible=closed}}
 for(const name of names){switch(name){
 case 'idle':offset('body',{y:3*Math.sin(t*Math.PI)});offset('head',{rotation:1.5*Math.sin(t*Math.PI-.2)});offset('tail',{rotation:3*Math.sin(t*Math.PI/2)});break;
 case 'blink':{const closed=t%3.2>=2.8&&t%3.2<2.93;switchPair('eyeL','eyeClosedL',closed);switchPair('eyeR','eyeClosedR',closed);switchPair('eyeOpen','eyeClosed',closed);break;}
 case 'talk':switchPair('mouthClosed','mouthOpen',Math.sin(t*Math.PI*8)>0);break;
 case 'nod':offset('head',{rotation:12*(1-Math.cos(t*Math.PI*2))/2});offset('body',{y:1.5*Math.sin(t*Math.PI*2-.3)});break;
 case 'surprise':{const jump=Math.sin(Math.PI*Math.min(1,t/.6));offset('body',{y:-26*jump});offset('head',{rotation:-10*jump});offset('earL',{rotation:-18*jump});offset('earR',{rotation:18*jump});break;}
 case 'cry':offset('head',{y:12*smooth(t/.5),rotation:8*smooth(t/.5)+1.5*Math.sin(t*24)});break;
 case 'tail_wag':offset('tail',{rotation:25*Math.sin(t*Math.PI*3)});break;
 case 'stumble':offset('body',{rotation:12*Math.sin(t*5)});offset('head',{rotation:10*Math.sin(t*5-.8)});offset('tail',{rotation:18*Math.sin(t*5-1.2)});break;
 case 'fall_back':{const q=t/duration;offset('body',{rotation:-65*smooth((q-.08)/.55),y:60*smooth((q-.08)/.7)});offset('head',{rotation:28*smooth((q-.24)/.5)});offset('tail',{rotation:45*smooth((q-.4)/.5)});break;}
 }}
 return {pose,warnings:[...new Set(warnings)]};
}
return {NAMES,evaluate};
});
