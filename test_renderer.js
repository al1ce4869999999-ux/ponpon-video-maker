const assert=require('node:assert/strict'),R=require('./rig'),D=require('./renderer');
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const r=R.normalizeRig({id:'r',parts:[{id:'body',x:10,y:20,rotation:90},{id:'head',parentId:'body',x:30,y:0},{id:'eye',parentId:'head',x:5},{id:'tail',parentId:'body',zIndex:-1}]});
const nodes=D.layout(r);assert.deepEqual(nodes.map(n=>n.part.id),['body','tail','head','eye']);near(nodes[2].matrix[4],10);near(nodes[2].matrix[5],50);near(nodes[3].matrix[5],55);
assert.equal(D.layout(r,{body:{visible:false}}).every(n=>!n.visible),true);
const m=D.matrix({x:2,y:3,rotation:37,scaleX:2,scaleY:.5});const p=D.point(m,17,21),q=D.inversePoint(m,p.x,p.y);near(q.x,17);near(q.y,21);
for(const pivot of [0,.5,1]){const rig=R.normalizeRig({id:'r',parts:[{id:'p',image:'data:image/png;base64,AA==',pivotX:pivot,pivotY:pivot}]});let args;const ctx={globalAlpha:1,save(){},restore(){},translate(){},scale(){},transform(){},drawImage(...a){args=a}};D.drawRig(ctx,rig,{}, {getImage:()=>({width:100,height:80})});assert.equal(args[1],-100*pivot);assert.equal(args[2],-80*pivot);}
console.log('PASS hierarchy, sibling ordering, hidden subtree, inverse transforms and 3 pivots');
