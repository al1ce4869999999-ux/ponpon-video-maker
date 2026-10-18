/* Ponpon Scene Analyzer v0.4: rule-based, offline, dependency-free.
 * Extracts directly observable evidence. Does not invent character history or intentions.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PonponAnalyzer = api;
})(typeof window !== 'undefined' ? window : undefined, function () {
  'use strict';
  const VERSION = '0.4.0';
  const MAX_INPUT = 18000;
  const MAX_SEGMENTS = 160;
  const KNOWN_CAST = ['ぽんぽん', '椿', '楓', 'もちもちくん', 'のの', '{{user}}'];
  const KINDS = { narration: '地の文', speech: '台詞', thought: '心の声' };
  const ACTIONS = [
    ['fall', /転(?:んだ|が|ぶ|び|ぶ|倒)|ころん|ころころ|ひっくり返|尻もち|尻餅|ずてん|滑って/],
    ['collision', /ぶつか|衝突|ぶつけ|突っ込|激突|叩きつけ/],
    ['blocked', /引っかか|ひっかか|抜けない|動かない|届かない|失敗|うまくいか|できない|止まってしま/],
    ['startle', /びくっ|びっくり|驚い|驚き|ぎくっ|はっと|目を見開|飛び上が/],
    ['move', /歩い|歩き|走っ|走り|駆け|追いかけ|逃げ|跳ん|跳ね|飛び出|後ずさ|近づ|向かった/],
    ['attempt', /持ち上げ|引っ張|引っぱ|つかん|掴ん|握っ|掃い|掃除|運ぼ|運ん|伸ばし|引き抜|押し|頑張|挑戦|もう一度/],
    ['observe', /見つめ|見上げ|見下ろ|じっと|のぞい|覗い|顔を上げ|目を向け|首を傾げ|首をかしげ/],
    ['tail', /しっぽ|尻尾|耳が|耳を/],
    ['pause', /ぴたり|ぴたっと|静かに|しーん|黙っ|固ま|停止|動きを止め|ためら/],
    ['weep', /泣い|涙|うるうる|ぐす|しくしく/],
    ['speak', /言っ|つぶや|呟い|叫ん|声を出し|話し/],
    ['setting', /草むら|茶屋|学校|廊下|縁側|畳|玄関|庭|台所|朝|夜|部屋/],
  ];
  const OBJECTS = [
    ['ほうき', /ほうき|箒/], ['畳', /畳/], ['しっぽ', /しっぽ|尻尾/],
    ['耳', /耳/], ['帽子', /帽子/], ['白菜', /白菜/], ['葉っぱ', /葉っぱ|木の葉/],
    ['どんぐり', /どんぐり|団栗/], ['ドア', /ドア|扉/], ['石', /石ころ|小石/],
    ['机', /机/], ['椅子', /椅子/], ['靴', /靴/], ['手', /手|指/],
  ];
  const ACTION_NAMES = {
    fall:'転倒', collision:'衝突', blocked:'失敗・ひっかかり', startle:'驚き', move:'移動',
    attempt:'試み', observe:'観察', tail:'耳・しっぽ', pause:'静止・間', weep:'涙', speak:'発話',
    setting:'場面情報', dialogue:'台詞', thought:'内心', neutral:'描写'
  };
  const VISUAL_MOTIONS = {
    fall:'bounce',collision:'dramatic',blocked:'still',startle:'dramatic',move:'walk',attempt:'peek',
    observe:'zoom',tail:'sway',pause:'still',weep:'shake',speak:'still',setting:'pan',dialogue:'still',thought:'still',neutral:'still'
  };
  function clean(s) {
    return String(s || '').replace(/\r/g, '').replace(/\s+/g,' ').replace(/^\*+|\*+$/g,'').replace(/^「|」$/g,'').trim();
  }
  function breakLong(s, max=110) {
    if (s.length <= max) return [s];
    const sentences=s.match(/[^。！？!?]+[。！？!?]?/g) || [s];
    const result=[];let group='';
    for(const sentence of sentences) {
      if (group && (group+sentence).length > max) { result.push(group); group=''; }
      if(sentence.length>max) {
        if(group) { result.push(group);group=''; }
        for(let n=0;n<sentence.length;n+=max)result.push(sentence.slice(n,n+max));
      } else group+=sentence;
    }
    if(group)result.push(group);
    return result;
  }
  function splitLine(raw, kind, startOffset, result){
    const lines=raw.split(/\n+/);
    let offset=startOffset;
    for(const line of lines) {
      const trimmed=line.trim();
      if (!trimmed) {offset+=line.length+1;continue;}
      let type=kind;
      if(type==='speech' && /^(?:（.*）|\(.*\))$/.test(trimmed))type='thought';
      const named=trimmed.match(/^([^：:「」\s]{1,12})[：:]\s*(.+)$/) || trimmed.match(/^([^：:「」\s]{1,12})「(.+)」$/);
      const explicitSpeaker=named && (KNOWN_CAST.includes(named[1])||/さん$|ちゃん$|くん$/.test(named[1])) ? named[1] : '';
      const content=explicitSpeaker?named[2]:trimmed;
      const cleanText=clean(content);
      if(!cleanText){offset+=line.length+1;continue;}
      for(const part of breakLong(cleanText)) {
        result.push({text:part,kind:type,offset,explicitSpeaker,raw:trimmed});
        if(result.length>=MAX_SEGMENTS)return;
      }
      offset+=line.length+1;
    }
  }
  function tokenize(input){
    const text=String(input||'').replace(/\r\n?/g,'\n').slice(0,MAX_INPUT);
    const segments=[];
    const marker=/\*([^*\n]+)\*/g;
    let last=0,m;
    while((m=marker.exec(text))&&segments.length<MAX_SEGMENTS){
      if(m.index>last)splitLine(text.slice(last,m.index),'speech',last,segments);
      if(segments.length>=MAX_SEGMENTS)break;
      splitLine(m[1],'narration',m.index+1,segments);
      last=marker.lastIndex;
    }
    if(segments.length<MAX_SEGMENTS && last<text.length)splitLine(text.slice(last),'speech',last,segments);
    return segments;
  }
  function actionFor(segment){
    if(segment.kind==='thought')return 'thought';
    for(const [name,re] of ACTIONS)if(re.test(segment.text))return name;
    return segment.kind==='speech'?'dialogue':'neutral';
  }
  function detectActors(text){
    const result=[];
    for(const name of KNOWN_CAST){
      if(text.includes(name))result.push(name);
    }
    return result;
  }
  function subject(text){
    for(const name of KNOWN_CAST) {
      const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      if(new RegExp(escaped+'(?:は|が|も|の|を)').test(text))return name;
    }
    return '';
  }
  function objectFor(text){
    const found=OBJECTS.filter(([name,regex])=>regex.test(text)).map(([name])=>name);
    return found.slice(0,3);
  }
  function speakerFor(segment, context){
    if(segment.kind!=='speech')return {name:'',confidence:1,reason:'台詞ではない'};
    if(segment.explicitSpeaker)return {name:segment.explicitSpeaker,confidence:1,reason:'話者が明記されている'};
    // Only attribute an unlabeled line to a speaker when the preceding narration explicitly names one actor.
    if(context.lastNarratorActor==='ぽんぽん' && context.lastNarratorDistance<=2 && !context.lastNarratorAmbiguous)
      return {name:'ぽんぽん',confidence:context.lastNarratorDistance===1?.76:.62,reason:'近くの地の文にぽんぽんが明記されている（推定）'};
    return {name:'',confidence:.3,reason:'話者を特定できないため空欄'};
  }
  function annotate(segments){
    const context={lastNarratorActor:'',lastNarratorDistance:10,lastNarratorAmbiguous:false};
    return segments.map((segment,i)=>{
      const subjects=detectActors(segment.text);
      const explicitActor=subject(segment.text);
      if(segment.kind==='narration'){
        context.lastNarratorDistance++;
        if(explicitActor){
          context.lastNarratorActor=explicitActor;
          context.lastNarratorDistance=0;
          context.lastNarratorAmbiguous=subjects.length>1;
        } else if(subjects.some(v=>v!=='ぽんぽん')){
          context.lastNarratorAmbiguous=true;
        }
      } else context.lastNarratorDistance++;
      const speaker=speakerFor(segment,context);
      const action=actionFor(segment);
      const objects=objectFor(segment.text);
      const actor=segment.kind==='speech'?speaker.name:(explicitActor || (subjects.length===1?subjects[0]:''));
      const salience=(['fall','collision','blocked','startle'].includes(action)?5:0)+
         (['attempt','move','observe'].includes(action)?3:0)+
         (segment.kind==='speech'?2:0)+(objects.length?1:0);
      return {...segment,index:i,action,actor,speaker,objects,salience,mentions:subjects};
    });
  }
  function mergeCost(a,b){
    const first=a[a.length-1],last=b[0];
    const differentKind=first.kind!==last.kind;
    let cost=0;
    if(differentKind)cost+=8;
    if(first.kind==='speech'&&last.kind==='speech'&&first.speaker.name!==last.speaker.name)cost+=12;
    if(first.action!==last.action)cost+=3;
    if(['fall','collision','startle','blocked'].includes(first.action)||['fall','collision','startle','blocked'].includes(last.action))cost+=8;
    const size=a.concat(b).reduce((sum,v)=>sum+v.text.length,0);
    cost+=size>100?Math.min(20,(size-100)/12):0;
    if(a.length+b.length>4)cost+=4;
    return cost;
  }
  function cluster(segments,maxCuts){
    if(!segments.length)return [];
    const groups=segments.map(s=>[s]);
    while(groups.length>maxCuts){
      let chosen=0, best=Infinity;
      for(let i=0;i<groups.length-1;i++){
        const cost=mergeCost(groups[i],groups[i+1]);
        if(cost<best){best=cost;chosen=i;}
      }
      groups.splice(chosen,2,groups[chosen].concat(groups[chosen+1]));
    }
    return groups;
  }
  function primaryOf(group){
    // Action-carrying narration takes precedence; otherwise prefer the dialogue line.
    const physical=group.filter(s=>['fall','collision','blocked','startle','attempt','move','observe'].includes(s.action));
    if(physical.length)return physical.reduce((a,b)=>a.salience>=b.salience?a:b);
    const speech=group.find(s=>s.kind==='speech');
    if(speech)return speech;
    return group.reduce((a,b)=>a.salience>=b.salience?a:b);
  }
  function camera(primary,prev,index){
    if(['fall','collision','move','setting'].includes(primary.action))return 'wide';
    if(['startle','observe','weep','pause','thought','dialogue'].includes(primary.action))return 'close';
    if(primary.action==='blocked')return 'close';
    if(prev && prev.frame==='close')return 'mid';
    return 'mid';
  }
  function transition(primary,prev){
    if(!prev)return 'cut';
    if(/翌朝|翌日|そのころ|数時間後|日が暮れ|夜にな/.test(primary.text))return 'fade';
    if(['fall','collision'].includes(primary.action))return 'flash';
    return 'cut';
  }
  function storyboard(group,prev,index,form){
    const primary=primaryOf(group);
    const kind=primary.kind;
    const action=primary.action;
    const frame=camera(primary,prev,index);
    const text=group.map(s=>s.text).join(' ').slice(0,800);
    const src=group.map(s=>s.raw).join(' / ');
    const speaker=kind==='speech'?primary.speaker.name:'';
    let emote='none',comic='none',effect='';
    if(action==='fall'||action==='collision'){comic='impact';effect=action==='fall'?'ころん':'どん';}
    if(action==='startle'){emote='surprise';comic='focus';}
    if(action==='blocked'){effect=/ぴたり|ぴたっと|止ま/.test(text)?'ぴた':'';}
    if(action==='weep')emote='gloom';
    if(action==='move'&&/走|駆け|追/.test(text))comic='speed';
    if(action==='pause'&&/しーん/.test(text))effect='しーん';
    if(action==='tail')comic='none';
    const confidence=kind==='speech'?primary.speaker.confidence:(primary.actor ? .85 : .72);
    const evidence=[`原文：${primary.text.slice(0,65)}`,`動作：${ACTION_NAMES[action]}`];
    if(primary.objects.length)evidence.push(`小道具：${primary.objects.join('、')}`);
    if(speaker)evidence.push(`話者：${primary.speaker.reason}`);
    const warnings=[];
    if(kind==='speech'&&!speaker)warnings.push('話者が未確定です（勝手にぽんぽんと決めません）');
    if(primary.actor && primary.actor!=='ぽんぽん' && primary.actor!==speaker)warnings.push(`${primary.actor}中心のカットです。現在の画像枠はぽんぽん用です`);
    if(group.length>1 && new Set(group.map(s=>s.kind)).size>1)warnings.push('異なる文章種別を1カットにまとめています。字幕を確認してください');
    if(action==='tail')warnings.push('耳・しっぽは独立して動きません。現在は画像全体を動かします');
    const length=action==='pause'?3:['fall','collision'].includes(action)?3:
      (kind==='speech'?Math.max(3,Math.min(6,Math.ceil(text.length/12))):Math.max(3,Math.min(6,Math.ceil(text.length/18))));
    const morph=/人間の姿|人間に化け|変化術で人間/.test(text)?'human':
      /たぬきの姿|元の姿|たぬきに戻/.test(text)?'tanuki':(prev?.form||form);
    const motion=VISUAL_MOTIONS[action]||'still';
    return {text,motion,frame,form:morph,duration:length,image:null,
      captionStyle:kind==='speech'?'speech':kind==='thought'?'thought':'narration',
      transition:transition(primary,prev),comic,emote,effect,
      speaker,speakerSide:'auto',
      analysis:{kind,actor:primary.actor||'',action,object:primary.objects,
        confidence:Number(confidence.toFixed(2)),sourceRange:[group[0].index,group[group.length-1].index],
        evidence,warnings,details:src.slice(0,300)}
    };
  }
  function analyze(text,options={}){
    const maxCuts=Math.max(1,Math.min(24,Number(options.maxCuts)||12));
    const form=options.defaultForm==='human'?'human':'tanuki';
    const warnings=[];
    if(String(text||'').length>MAX_INPUT)warnings.push('入力が長いため先頭18,000文字を解析しました');
    const tokens=tokenize(text);
    if(tokens.length>=MAX_SEGMENTS)warnings.push('解析対象が多いため先頭160ブロックに制限しました');
    const segments=annotate(tokens);
    const groups=cluster(segments,maxCuts);
    const shots=[];
    for(const group of groups)shots.push(storyboard(group,shots[shots.length-1],shots.length,form));
    if(segments.length>maxCuts)warnings.push(`${segments.length}ブロックを${shots.length}カットに圧縮しました。台詞と動作が混在したカットは要確認`);
    const unknown=shots.filter(s=>s.analysis.warnings.some(w=>w.includes('話者が未確定'))).length;
    if(unknown)warnings.push(`話者未確定 ${unknown}カット（自動では決めつけていません）`);
    return {version:VERSION,shots,report:{segments:segments.length,cuts:shots.length,
      speakers:[...new Set(shots.map(s=>s.speaker).filter(Boolean))],
      actions:[...new Set(shots.map(s=>s.analysis.action))],warnings,
      note:'日本語ルール解析（APIなし）。感情・動作・話者は原文にある根拠だけを利用。'},
      segments:segments.map(({text,kind,action,actor,index})=>({text,kind,action,actor,index}))};
  }
  return {VERSION,KINDS,ACTION_NAMES,tokenize,analyze};
});