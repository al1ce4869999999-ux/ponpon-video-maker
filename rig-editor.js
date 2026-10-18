/* Touch and numeric editor; all images remain in this browser's project. */
(function(root){'use strict';
const R=()=>root.PonponRig,D=()=>root.PonponRenderer;
function template(name,form){const r=R().createRig(name,form);const specs=[['body',null,600,750],['tail','body',-180,50],['head','body',0,-270],['eyeL','head',-65,-20],['eyeR','head',65,-20],['eyeClosedL','head',-65,-20],['eyeClosedR','head',65,-20],['mouthClosed','head',0,70],['mouthOpen','head',0,70],['earL','head',-140,-160],['earR','head',140,-160]];r.parts=specs.map(([id,parentId,x,y],i)=>({id,name:id,parentId,x,y,zIndex:i===1?-1:i,image:null,tags:[id],visible:!['eyeClosedL','eyeClosedR','mouthOpen'].includes(id)}));return R().normalizeRig(r);}
function mount(container,{getState,onChange,notify,isLocked=()=>false}){
 let selected=null,face='neutral',sequence=0,drag=null,playing=false,raf=0,started=0;
 const cache=D().createImageCache();let canvas,fields,partSelect,rigSelect,faceSelect,motionSelect,status;
 const rig=()=>getState().rigs.find(r=>r.id===getState().activeRigId);
 const part=()=>rig()?.parts.find(p=>p.id===selected);
 const faceData=()=>rig()?.faces.find(f=>f.id===face);
 const pose=()=>faceData()?.overrides||{};
 const effective=()=>part()?{...part(),...pose()[selected]}:null;
 function el(tag,text,parent=container){const e=document.createElement(tag);if(text!=null)e.textContent=text;parent.append(e);return e;}
 function button(text,fn,parent=container){const b=el('button',text,parent);b.type='button';b.className='btn secondary';b.onclick=()=>{if(isLocked())return;try{fn()}catch(e){notify(e.message)}};return b;}
 function input(label,value,change,parent=fields,type='text'){const l=el('label',label,parent),i=el('input',null,l);i.type=type;i.value=value??'';i.onchange=()=>{try{change(i.value)}catch(e){notify(e.message);i.value=effective()?.[i.dataset.field]??value;}};return i;}
 function select(label,items,value,fn,parent=container){const l=el('label',label,parent),s=el('select',null,l);for(const [v,t] of items)s.add(new Option(t,v));s.value=value||'';s.onchange=()=>{if(!isLocked())fn(s.value)};return s;}
 function commit(){R().normalizeRig(rig());onChange();paint();}
 function updateField(key,value){if(isLocked()||!part())return;const before=structuredClone(rig());try{if(face!=='neutral'&&faceData()){faceData().overrides[selected]||={};faceData().overrides[selected][key]=value;}else part()[key]=value;commit()}catch(e){Object.assign(rig(),before);throw e;}}
 async function paint(t=0){const stamp=++sequence,r=rig();const c=canvas.getContext('2d');if(!r){c.clearRect(0,0,canvas.width,canvas.height);return}await cache.preload(r);if(stamp!==sequence)return;c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#eee5da';c.fillRect(0,0,canvas.width,canvas.height);const scale=Math.min(canvas.width/r.baseWidth,canvas.height/r.baseHeight);const offset={x:(canvas.width-r.baseWidth*scale)/2,y:(canvas.height-r.baseHeight*scale)/2};let p=pose();if(playing&&root.PonponMotions)p=root.PonponMotions.evaluate(r,motionSelect.value,t,4,face).pose;D().drawRig(c,r,p,{...offset,scale,getImage:cache.get});const node=D().layout(r,p).find(n=>n.part.id===selected);if(node){c.save();c.translate(offset.x,offset.y);c.scale(scale,scale);c.transform(...node.matrix);const img=cache.get(node.part.image);c.strokeStyle='#185d9a';c.lineWidth=3/scale;if(img)c.strokeRect(-img.width*node.part.pivotX,-img.height*node.part.pivotY,img.width,img.height);c.beginPath();c.arc(0,0,9/scale,0,Math.PI*2);c.stroke();c.restore();}status.textContent=r.parts.filter(p=>!p.image).length+'パーツが素材未設定。目・口の差分動作には開閉両方の画像が必要です。';}
 function refresh(){cancelAnimationFrame(raf);playing=false;container.replaceChildren();
 el('h3','リグ編集');el('p','分離済みの透過PNG・WebP素材を登録してください。単一画像の自動分解は行いません。');
 const actions=el('div');actions.className='actions';
 for(const [form,name] of [['tanuki','たぬき'],['human','人間']])button('＋ '+name,()=>{const s=getState();if(s.rigs.length>=R().LIMITS.rigs)throw new Error('リグは16個までです');const r=template(name+'リグ',form);s.rigs.push(r);s.activeRigId=r.id;selected='body';face='neutral';onChange();refresh()},actions);
 rigSelect=select('使用リグ',getState().rigs.map(r=>[r.id,r.name]),getState().activeRigId,v=>{getState().activeRigId=v;selected=null;face='neutral';onChange();refresh()});rigSelect.id='rig-select';
 if(!rig()){el('p','リグ未登録です。新規リグを作成すると空のパーツが用意されます。');return;}
 input('リグ名',rig().name,v=>{rig().name=v;commit();rigSelect.selectedOptions[0].textContent=v},container);
 const manage=el('div');manage.className='actions';button('リグ複製',()=>{if(getState().rigs.length>=R().LIMITS.rigs)throw new Error('リグは16個までです');const copy=structuredClone(rig());copy.id=R().id();copy.name+=' 複製';getState().rigs.push(copy);getState().activeRigId=copy.id;onChange();refresh()},manage);
 button('リグ削除',()=>{if(!confirm('このリグを削除しますか？使用カットは従来画像に戻ります。先にJSONバックアップをおすすめします。'))return;const s=getState(),rid=rig().id;s.rigs=s.rigs.filter(r=>r.id!==rid);for(const c of s.cuts)if(c.rigId===rid){c.useRig=false;c.rigId=null;}s.activeRigId=s.rigs[0]?.id||null;notify('リグを削除しました。使用カットは従来画像に戻りました');onChange();refresh()},manage);
 canvas=el('canvas');canvas.id='rig-canvas';canvas.width=600;canvas.height=600;canvas.setAttribute('aria-label','パーツ編集キャンバス。選択パーツをドラッグで移動');
 canvas.onpointerdown=e=>{if(!part()||playing||isLocked())return;const rect=canvas.getBoundingClientRect(),r=rig(),scale=Math.min(canvas.width/r.baseWidth,canvas.height/r.baseHeight),parent=D().layout(r,pose()).find(n=>n.part.id===part().parentId)?.matrix||D().identity();const local=ev=>{const x=((ev.clientX-rect.left)*canvas.width/rect.width-(canvas.width-r.baseWidth*scale)/2)/scale,y=((ev.clientY-rect.top)*canvas.height/rect.height-(canvas.height-r.baseHeight*scale)/2)/scale;return D().inversePoint(parent,x,y)};const start=local(e);if(!start){notify('親の倍率が0のためドラッグできません。数値で位置を編集してください');return}drag={local,start,x:effective().x,y:effective().y};canvas.setPointerCapture(e.pointerId);};
 canvas.onpointermove=e=>{if(!drag)return;const p=drag.local(e);if(!p)return;try{updateField('x',Math.round(drag.x+p.x-drag.start.x));updateField('y',Math.round(drag.y+p.y-drag.start.y));for(const k of ['x','y'])fields.querySelector('[data-field="'+k+'"]').value=effective()[k]}catch(err){notify(err.message)}};
 canvas.onpointerup=canvas.onpointercancel=()=>{drag=null};
 if(!rig().parts.some(p=>p.id===selected))selected=rig().parts[0]?.id||null;
 partSelect=select('選択パーツ',rig().parts.map(p=>[p.id,p.name]),selected,v=>{selected=v;renderFields();paint()});partSelect.id='rig-part';
 const pa=el('div');pa.className='actions';button('パーツ追加',()=>{if(rig().parts.length>=R().LIMITS.parts)throw new Error('パーツは64個までです');const p=R().normalizeRig({id:'temporary',parts:[{id:R().id(),name:'新しいパーツ'}]}).parts[0];rig().parts.push(p);selected=p.id;onChange();refresh()},pa);
 button('パーツ削除',()=>{if(!part()||!confirm('パーツを削除しますか？子パーツはリグ直下へ移します（位置の再調整が必要です）。'))return;const r=rig();r.parts=r.parts.filter(p=>p.id!==selected);r.parts.forEach(p=>{if(p.parentId===selected)p.parentId=null});r.faces.forEach(f=>delete f.overrides[selected]);onChange();refresh()},pa);
 faceSelect=select('表情',rig().faces.map(f=>[f.id,f.name]),face,v=>{face=v;renderFields();paint()});faceSelect.id='rig-face';
 const fa=el('div');fa.className='actions';button('現在の見た目を表情として保存',()=>{if(rig().faces.length>=R().LIMITS.faces)throw new Error('表情は32個までです');const name=prompt('表情名（例：blink / talk_open / surprise / sad）','表情');if(!name)return;const overrides=Object.create(null);for(const p of rig().parts){overrides[p.id]={};const q={...p,...pose()[p.id]};for(const k of R().FIELDS)overrides[p.id][k]=q[k];}const f={id:R().id(),name,overrides};rig().faces.push(f);face=f.id;onChange();refresh()},fa);
 button('表情名変更',()=>{const f=faceData();if(!f)return;const name=prompt('表情名',f.name);if(name){f.name=name;onChange();refresh()}},fa);
 button('表情削除',()=>{if(face==='neutral'){notify('通常表情は削除できません');return}if(confirm('表情を削除しますか？')){rig().faces=rig().faces.filter(f=>f.id!==face);face='neutral';onChange();refresh()}},fa);
 el('p','通常表情では基準姿勢を編集します。他の表情では選択中の表情差分を編集します。表情は基準姿勢→表情の上書き→モーションの順に適用されます。');
 fields=el('div');fields.id='rig-fields';renderFields();
 motionSelect=select('モーション確認',Object.entries(root.PonponMotions?.NAMES||{idle:'idle'}),'idle',()=>{});motionSelect.id='rig-preview-motion';
 button('モーション再生 / 停止',()=>{playing=!playing;cancelAnimationFrame(raf);if(playing){started=performance.now();const tick=()=>{if(!playing)return;paint((performance.now()-started)/1000);raf=requestAnimationFrame(tick)};tick()}else paint()});
 status=el('p');status.setAttribute('role','status');paint();
 }
 function renderFields(){fields.replaceChildren();if(!part())return;const p=effective();input('パーツ名',part().name,v=>{part().name=v;partSelect.selectedOptions[0].textContent=v;commit()});
 const descendants=new Set([selected]);let more=true;while(more){more=false;for(const q of rig().parts)if(descendants.has(q.parentId)&&!descendants.has(q.id)){descendants.add(q.id);more=true;}}
 select('親（親pivotが座標の原点）',[['','リグ直下'],...rig().parts.filter(q=>!descendants.has(q.id)).map(q=>[q.id,q.name])],part().parentId,v=>{part().parentId=v||null;commit()},fields).id='rig-parent';
 const file= input('パーツ画像 PNG / WebP / JPEG',null,()=>{},fields,'file');file.id='rig-image';file.accept='image/png,image/webp,image/jpeg';file.onchange=async()=>{try{if(isLocked())return;const f=file.files[0];if(!f)return;if(!['image/png','image/webp','image/jpeg'].includes(f.type)||f.size>12*1024*1024)throw new Error('PNG・WebP・JPEG、12MB以下を選んでください');const pid=selected,rid=rig().id;const src=await new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=()=>rej(new Error('画像読込失敗'));reader.readAsDataURL(f)});const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error('画像を読み込めません'));i.src=src});if(img.width*img.height>32000000)throw new Error('画像が大きすぎます。3200万画素以下にしてください');const c=document.createElement('canvas'),factor=Math.min(1,1200/img.width,1200/img.height);c.width=Math.max(1,Math.round(img.width*factor));c.height=Math.max(1,Math.round(img.height*factor));c.getContext('2d').drawImage(img,0,0,c.width,c.height);if(rig()?.id!==rid||selected!==pid)return;updateField('image',c.toDataURL('image/png'));notify('画像を端末内に登録しました（最大1200pxに縮小）')}catch(e){notify(e.message)}file.value='';};
 button('この表情の素材を外す',()=>updateField('image',null),fields);
 input('動作タグ（カンマ区切り）',part().tags.join(','),v=>{part().tags=v.split(',').map(s=>s.trim()).filter(Boolean);commit()});
 for(const k of ['x','y','rotation','scaleX','scaleY','pivotX','pivotY','opacity','zIndex']){const row=el('div',null,fields);row.className='rig-number';const i=input(k,k==='zIndex'?part()[k]:p[k],v=>{if(k==='zIndex'){const old=part().zIndex;part().zIndex=Number(v);try{commit()}catch(e){part().zIndex=old;throw e}}else updateField(k,Number(v))},row,'number');i.dataset.field=k;i.step='any';const limits={pivotX:[0,1],pivotY:[0,1],opacity:[0,1],scaleX:[-20,20],scaleY:[-20,20]};if(limits[k]){i.min=limits[k][0];i.max=limits[k][1]}
 for(const n of [-1,1])button(n>0?'+1':'−1',()=>{let value=Number(i.value)+n;if(limits[k])value=Math.max(limits[k][0],Math.min(limits[k][1],value));i.value=value;i.dispatchEvent(new Event('change'))},row);}
 const visible=input('表示',null,()=>{},fields,'checkbox');visible.checked=p.visible;visible.onchange=()=>{try{updateField('visible',visible.checked)}catch(e){notify(e.message)}};
 el('details',null,fields).appendChild(Object.assign(document.createElement('summary'),{textContent:'表情で上書きするフィールド：'+Object.keys(pose()[selected]||{}).join(', ')}));
 }
 refresh();return {refresh,paint,stop(){playing=false;cancelAnimationFrame(raf)}};
}
root.PonponRigEditor={template,mount};
})(globalThis);
