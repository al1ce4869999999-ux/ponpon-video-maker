/* Synchronous paint after preload. Parent-local origin is the parent's pivot. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PonponRenderer=api;})(globalThis,()=>{
'use strict';
const identity=()=>[1,0,0,1,0,0];
function multiply(a,b){return[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}
function matrix(p){const r=p.rotation*Math.PI/180,c=Math.cos(r),s=Math.sin(r);return[c*p.scaleX,s*p.scaleX,-s*p.scaleY,c*p.scaleY,p.x,p.y];}
function point(m,x,y){return{x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]};}
function inversePoint(m,x,y){const d=m[0]*m[3]-m[1]*m[2];if(Math.abs(d)<1e-10)return null;return{x:(m[3]*(x-m[4])-m[2]*(y-m[5]))/d,y:(-m[1]*(x-m[4])+m[0]*(y-m[5]))/d};}
function layout(rig,pose={}){
 const order=[];const indexed=rig.parts.map((p,i)=>({p,i}));
 function visit(parent,world,alpha,visible){const children=indexed.filter(x=>x.p.parentId===parent).sort((a,b)=>a.p.zIndex-b.p.zIndex||a.i-b.i);for(const {p} of children){const q={...p,...pose[p.id]},m=multiply(world,matrix(q));const node={part:q,matrix:m,alpha:alpha*q.opacity,visible:visible&&q.visible};order.push(node);visit(p.id,m,node.alpha,node.visible);}}
 visit(null,identity(),1,true);return order;
}
function createImageCache(){const cache=new Map();return {cache,async preload(rig){const sources=new Set(rig.parts.map(p=>p.image));for(const f of rig.faces)for(const p of Object.values(f.overrides))if(p.image)sources.add(p.image);await Promise.all([...sources].filter(Boolean).map(src=>{if(cache.has(src))return cache.get(src).ready;const entry={image:null};entry.ready=new Promise(resolve=>{const img=new Image();img.onload=()=>{if(img.width<=4096&&img.height<=4096)entry.image=img;resolve()};img.onerror=()=>resolve();img.src=src});cache.set(src,entry);return entry.ready;}));},get:src=>cache.get(src)?.image||null};}
function drawRig(ctx,rig,pose={},options={}){
 const {x=0,y=0,scale=1,flipX=false,alpha=1,getImage=()=>null}=options;
 ctx.save();ctx.translate(x,y);ctx.scale(flipX?-scale:scale,scale);let drawn=0;
 for(const node of layout(rig,pose)){const p=node.part,img=getImage(p.image);if(!node.visible||!node.alpha||!img)continue;ctx.save();ctx.transform(...node.matrix);ctx.globalAlpha*=alpha*node.alpha;ctx.drawImage(img,-img.width*p.pivotX,-img.height*p.pivotY);ctx.restore();drawn++;}
 ctx.restore();return drawn;
}
return {identity,multiply,matrix,point,inversePoint,layout,createImageCache,drawRig};
});
