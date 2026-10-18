const assert = require('node:assert/strict');
const Rig = require('./rig.js');
const Renderer = require('./renderer.js');
const Motions = require('./motion-presets.js');
let passed = 0;
function check(label, callback) { callback(); passed++; console.log('PASS', label); }
const r = Rig.normalizeRig({
  id:'ponpon', parts:[
    {id:'body',x:100,y:50,tags:['body']},
    {id:'head',parentId:'body',x:10,y:-20,tags:['head']},
    {id:'eyeOpen',parentId:'head',image:'data:image/png;base64,AAAA',tags:['eyeOpen']},
    {id:'eyeClosed',parentId:'head',image:'data:image/png;base64,AAAA',visible:false,tags:['eyeClosed']},
    {id:'tail',parentId:'body',x:-10,tags:['tail']}
  ],
  faces:[{id:'neutral',overrides:{}},{id:'sleepy',overrides:{head:{rotation:5}}}]
});
check('nested head inherits body translation',()=>{
 const list=Renderer.layout(r);
 const head=list.find(p=>p.part.id==='head');
 assert.deepEqual(Renderer.point(head.matrix,0,0),{x:110,y:30});
});
check('face override is used without mutation',()=>{
 const before=JSON.stringify(r);
 const result=Motions.evaluate(r,'nod',0.2,4,'sleepy');
 assert.ok(result.pose.head.rotation>5);
 assert.equal(JSON.stringify(r),before);
});
check('blink toggles both eye states',()=>{
 const result=Motions.evaluate(r,'blink',2.85);
 assert.equal(result.pose.eyeOpen.visible,false);
 assert.equal(result.pose.eyeClosed.visible,true);
});
check('tail wag affects tail, not body',()=>{
 const result=Motions.evaluate(r,'tail_wag',0.2);
 assert.ok(Math.abs(result.pose.tail.rotation)>0);
 assert.equal(result.pose.body,undefined);
});
check('motion fallback is idle',()=>{
 const a=Motions.evaluate(r,'not-a-motion',.2);
 const b=Motions.evaluate(r,'idle',.2);
 assert.deepEqual(a.pose,b.pose);
});
check('invalid cycle rejected',()=>{
 assert.throws(()=>Rig.normalizeRig({id:'bad',parts:[{id:'a',parentId:'b'},{id:'b',parentId:'a'}]}));
});
check('legacy cuts do not mutate originals',()=>{
 const old={version:4,cuts:[{id:'1',text:'ころん',image:null}]};
 const copy=structuredClone(old);
 const updated=Rig.migrateProjectToV5(old);
 assert.deepEqual(old,copy);assert.equal(updated.cuts[0].useRig,false);
});
console.log(passed+' additional rig regression tests passed');
