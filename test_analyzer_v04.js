const assert=require('node:assert/strict');
const A=require('./analyzer.js');
function run(name,fn){try{fn(); console.log('PASS',name)}catch(e){console.error('FAIL',name);throw e}}
run('physical causal sequence and camera choices',()=>{
 const input='*ぽんぽんは、ほうきを引っ張った。*\n*先端が畳に引っかかった。*\n……あれ？\n*さらに力を入れると、後ろにころんと転がった。*';
 const a=A.analyze(input);
 assert.equal(a.shots.length,4);
 assert.deepEqual(a.shots.map(s=>s.analysis.action),['attempt','blocked','dialogue','fall']);
 assert.equal(a.shots[3].comic,'impact');
 assert.equal(a.shots[3].frame,'wide');
 assert.equal(a.shots[3].motion,'bounce');
 assert.equal(a.shots[2].speaker,'ぽんぽん');
 assert.ok(a.shots.every(s=>s.duration>=2&&s.duration<=8));
});
run('explicit speaker overrides heuristic',()=>{
 const a=A.analyze('*椿は目を上げた。*\n椿：帰ろう。\n*ぽんぽんは頷いた。*\nぽんぽん：いっしょに帰るぽん。');
 assert.equal(a.shots[1].speaker,'椿');
 assert.equal(a.shots[3].speaker,'ぽんぽん');
 assert.equal(a.shots[0].speaker,'');
});
run('unlabeled speech without evidence remains unknown',()=>{
 const a=A.analyze('なんで？');
 assert.equal(a.shots[0].speaker,'');
 assert.ok(a.report.warnings.some(x=>x.includes('話者未確定')));
});
run('narration punctuation and mixed markup',()=>{
 const a=A.analyze('*ぽんぽんが立った。*\nふんっ。\n*しっぽを振った。*');
 assert.deepEqual(a.shots.map(s=>s.captionStyle),['narration','speech','narration']);
});
run('thought not mislabeled as speech',()=>{
 const a=A.analyze('（なんで動かないぽん……）');
 assert.equal(a.shots[0].captionStyle,'thought');
 assert.equal(a.shots[0].speaker,'');
});
run('honor explicit human/tanuki transformation continuity',()=>{
 const a=A.analyze('*ぽんぽんが人間の姿に化けた。*\n*目が合った。*\n*元の姿に戻った。*');
 assert.deepEqual(a.shots.map(s=>s.form),['human','human','tanuki']);
});
run('long text retains ordered source and limits to 12 cuts',()=>{
 const input=Array.from({length:40},(_,i)=>`*ぽんぽんは、${i}番目の小石を見つめた。*`).join('\n');
 const a=A.analyze(input);
 assert.equal(a.shots.length,12);
 assert.ok(a.report.warnings.some(x=>x.includes('圧縮')));
 assert.ok(a.shots.map(x=>x.text).join(' ').includes('39番目'));
});
run('no fake dramatic transition on plain passage',()=>{
 const a=A.analyze('*ぽんぽんは茶屋に入った。*\n*椿が椅子を置いた。*');
 assert.ok(a.shots.every(s=>s.transition==='cut'));
 assert.ok(a.shots.every(s=>s.comic==='none'));
});
run('time jump uses fade and impact uses flash',()=>{
 const a=A.analyze('*ぽんぽんが朝ごはんを食べた。*\n*翌朝、学校へ向かった。*\n*ころんと転がった。*');
 assert.equal(a.shots[1].transition,'fade');
 assert.equal(a.shots[2].transition,'flash');
});
run('escape-like payload is plain scene text, not executable',()=>{
 const input='*ぽんぽんは「<script>alert(1)</script>」を見た。*';
 const a=A.analyze(input);
 assert.ok(a.shots[0].text.includes('<script>'));
});
console.log('Analyzer regression suite finished');