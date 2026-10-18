const assert=require('node:assert/strict'),R=require('./rig'),M=require('./motion-presets');
const r=R.normalizeRig({id:'r',parts:['body','head','tail','earL','earR','eyeL','eyeClosedL','eyeR','eyeClosedR','mouthClosed','mouthOpen'].map(id=>({id,image:'data:image/png;base64,AA=='}))});const original=JSON.stringify(r);
for(const name of Object.keys(M.NAMES)){for(const t of [0,1.3,4])assert.deepEqual(M.evaluate(r,name,t),M.evaluate(r,name,t));assert.notDeepEqual(M.evaluate(r,name,.15).pose,M.evaluate(r,name,2.85).pose,name)}
assert.deepEqual(Object.keys(M.evaluate(r,'tail_wag',.2).pose),['tail']);
assert.deepEqual(Object.keys(M.evaluate(r,'talk',.2).pose).sort(),['mouthClosed','mouthOpen']);assert.equal(M.evaluate(r,'talk',.1).pose.mouthOpen.visible,true);
assert.equal(M.evaluate(r,'blink',2.85).pose.eyeL.visible,false);assert.equal(M.evaluate(r,'blink',3).pose.eyeL.visible,true);
const fall=M.evaluate(r,'fall_back',2).pose;assert.notEqual(fall.body.rotation,fall.head.rotation);assert.notEqual(fall.tail.rotation,fall.head.rotation);
assert.equal(JSON.stringify(r),original);assert.doesNotThrow(()=>M.evaluate(R.createRig(),'blink',1));assert.ok(M.evaluate(R.createRig(),'blink',1).warnings.length);assert.deepEqual(M.evaluate(r,'unknown',1),M.evaluate(r,'idle',1));console.log('PASS 9 presets, 3 combinations, deterministic time sampling, isolated tail/eyes/mouth, delayed fall and immutable base');
