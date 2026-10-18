/* Build-free rig data contract. Coordinates and rotations are local, in pixels/degrees. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.PonponRig=api;})(globalThis,()=>{
'use strict';
const LIMITS={rigs:16,parts:64,faces:32,image:8*1024*1024,total:56*1024*1024};
const FIELDS=['x','y','rotation','scaleX','scaleY','pivotX','pivotY','opacity','visible','image'];
const id=()=>globalThis.crypto?.randomUUID?.()||'r'+Date.now().toString(36)+Math.random().toString(36).slice(2);
const fail=m=>{throw new Error(m)};
const finite=(v,d,min=-100000,max=100000)=>{if(v===undefined)return d;if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)fail('リグの数値が範囲外です');return v;};
function image(v){if(v==null)return null;if(typeof v!=='string'||v.length>LIMITS.image||!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v))fail('パーツ画像は8MB以下のPNG・WebP・JPEGで登録してください');return v;}
function identifier(v){if(typeof v!=='string'||!v.length||v.length>100||['__proto__','constructor','prototype'].includes(v))fail('リグIDが不正です');return v;}
function transform(p){return {x:finite(p.x,0),y:finite(p.y,0),rotation:finite(p.rotation,0,-36000,36000),scaleX:finite(p.scaleX,1,-20,20),scaleY:finite(p.scaleY,1,-20,20),pivotX:finite(p.pivotX,.5,0,1),pivotY:finite(p.pivotY,.5,0,1),opacity:finite(p.opacity,1,0,1),visible:p.visible!==false};}
function normalizeRig(raw){
 if(!raw||typeof raw!=='object')fail('リグ形式が不正です');
 const r={...raw,id:identifier(raw.id||id()),name:String(raw.name||'新しいリグ').slice(0,80),baseWidth:finite(raw.baseWidth,1200,1,4096),baseHeight:finite(raw.baseHeight,1200,1,4096),meta:{form:raw.meta?.form==='human'?'human':'tanuki'}};
 if(!Array.isArray(raw.parts)||raw.parts.length>LIMITS.parts)fail('パーツは64個までです');
 r.parts=raw.parts.map(p=>({...p,id:identifier(p.id),name:String(p.name||p.id).slice(0,80),parentId:p.parentId==null?null:identifier(p.parentId),zIndex:finite(p.zIndex,0),...transform(p),image:image(p.image),tags:Array.isArray(p.tags)?p.tags.filter(t=>typeof t==='string').slice(0,16):[]}));
 const by=new Map(r.parts.map(p=>[p.id,p]));if(by.size!==r.parts.length)fail('パーツIDが重複しています');
 for(const p of r.parts){const seen=new Set([p.id]);let parent=p.parentId;while(parent!==null){if(seen.has(parent))fail('親子関係が循環しています');seen.add(parent);const q=by.get(parent);if(!q)fail('親パーツが存在しません');parent=q.parentId;}}
 const faces=raw.faces===undefined?[{id:'neutral',name:'通常',overrides:{}}]:raw.faces;
 if(!Array.isArray(faces)||faces.length>LIMITS.faces)fail('表情は32個までです');
 const ids=new Set();r.faces=faces.map(f=>{identifier(f.id);if(ids.has(f.id))fail('表情IDが重複しています');ids.add(f.id);const overrides=Object.create(null);for(const [pid,patch] of Object.entries(f.overrides||{})){if(!by.has(pid))fail('表情のパーツが存在しません');const picked={};for(const k of FIELDS)if(Object.hasOwn(patch,k))picked[k]=patch[k];const checked=transform({...by.get(pid),...picked});overrides[pid]={};for(const k of Object.keys(picked))overrides[pid][k]=k==='image'?image(picked[k]):checked[k];}return{id:f.id,name:String(f.name||f.id).slice(0,80),overrides};});
 return r;
}
function validateRig(r){try{normalizeRig(r);return {valid:true,errors:[]};}catch(e){return {valid:false,errors:[e.message]};}}
function createRig(name='新しいリグ',form='tanuki'){return normalizeRig({id:id(),name,meta:{form},parts:[]});}
function normalizeCutRig(c,rigs=[]){const exists=rigs.some(r=>r.id===c.rigId);return {...c,useRig:c.useRig===true&&exists,rigId:exists?c.rigId:null,rigFace:typeof c.rigFace==='string'?c.rigFace:'neutral',rigMotion:typeof c.rigMotion==='string'?c.rigMotion:'idle',rigFlipX:c.rigFlipX===true};}
function migrateProjectToV5(p){if(!p||typeof p!=='object'||!Array.isArray(p.cuts))fail('作品形式が不正です');if(p.version>5)fail('新しいバージョンの作品です。対応版で開いてください');if(JSON.stringify(p).length>LIMITS.total)fail('作品が大きすぎます（56MBまで）');if(p.rigs!==undefined&&!Array.isArray(p.rigs))fail('リグ一覧が不正です');const rigs=(p.rigs||[]).map(normalizeRig);if(rigs.length>LIMITS.rigs||new Set(rigs.map(r=>r.id)).size!==rigs.length)fail('リグ数またはIDが不正です');return {...p,version:5,rigs,activeRigId:rigs.some(r=>r.id===p.activeRigId)?p.activeRigId:null,cuts:p.cuts.map(c=>normalizeCutRig(c,rigs))};}
return {LIMITS,FIELDS,id,transform,createRig,normalizeRig,validateRig,normalizeCutRig,migrateProjectToV5};
});
