const assert=require('node:assert/strict'),R=require('./rig.js');
let count=0;function test(name,fn){fn();count++;console.log('PASS',name)}
for(let v=1;v<=4;v++)test('v'+v+' non-destructive roundtrip',()=>{const old={version:v,assets:{human:null},text:'物語',analysisReport:{a:1},cuts:[{text:'字幕',speaker:'椿',evidence:['根拠'],effect:'どん',transition:'wipe',image:null}]};const p=R.migrateProjectToV5(old),q=R.migrateProjectToV5(JSON.parse(JSON.stringify(p)));assert.deepEqual(q,p);for(const k of Object.keys(old.cuts[0]))assert.deepEqual(q.cuts[0][k],old.cuts[0][k]);assert.equal(q.cuts[0].useRig,false);assert.equal(old.version,v)});
const rig=R.createRig();rig.parts=[{id:'body',image:null},{id:'head',parentId:'body',pivotX:0}];
test('rig defaults and stable IDs',()=>{const r=R.normalizeRig(rig);assert.deepEqual(R.normalizeRig(r),r);assert.equal(r.parts[1].pivotX,0)});
for(const parts of [[{id:'a',parentId:'a'}],[{id:'a',parentId:'b'},{id:'b',parentId:'a'}],[{id:'a',parentId:'missing'}],[{id:'a'},{id:'a'}],[{id:'a',x:NaN}],[{id:'a',scaleX:Infinity}],[{id:'a',image:'data:image/png;base64,'+'A'.repeat(9*1024*1024)}]])test('reject invalid rig '+count,()=>assert.throws(()=>R.normalizeRig({...rig,parts})));
test('invalid reference falls back',()=>assert.equal(R.migrateProjectToV5({cuts:[{useRig:true,rigId:'bad'}]}).cuts[0].useRig,false));
console.log(count+' data checks passed');
