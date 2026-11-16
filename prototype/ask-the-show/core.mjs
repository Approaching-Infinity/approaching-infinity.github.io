export const CLOUD_REFERENCE={model:'GPT-5.6 Luna',inputPerMillion:0.20,outputPerMillion:1.20,checked:'2026-11-16',url:'https://developers.openai.com/api/docs/models/gpt-5.6-luna',note:'Illustrative standard short-context token pricing, not an activated service. Different tokenizers, reasoning, hosting and other charges can change actual costs.'};
const stop=new Set('a an the is are was were be been being to of and or in on at by with from for as it its i me my we our you your they their them this that those these what which who how why when where can could should would do does did have has had there about into so just really say said tell episode episodes show guest guests please some any more much use using get good need help want know'.split(' '));
const normalize=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9\s]/g,' ');
const stem=s=>s.length>5&&s.endsWith('ing')?s.slice(0,-3):s.length>4&&s.endsWith('s')?s.slice(0,-1):s;
const terms=s=>normalize(s).split(/\s+/).filter(w=>w.length>1&&!stop.has(w)).map(stem);
const families=[['return','performance','outperformance','investment','investing','concentration'],['veteran','military','civilian','transition','career'],['ai','artificial','intelligence','automation','automate','human','judgment'],['strategy','strategic','execution','alignment','plan','priority'],['burnout','overwork','exhausted','recovery','rest','sleep'],['habit','motivation','motivated','inspired','integration','reflection','curiosity'],['startup','idea','business','customer','validation','project']].map(f=>f.map(stem));

export function retrieve(corpus,question,history=[],limit=5) {
  const original=terms(question);
  const query=new Map(original.map(t=>[t,1]));
  for(const f of families) if(f.some(t=>query.has(t))) for(const t of f) if(!query.has(t)) query.set(t,.26);
  if(history.length&&(original.length<5||/\b(it|they|that|their|those|them)\b/i.test(question))) {
    for(const t of terms(history.at(-1).question??'')) if(!query.has(t)) query.set(t,.65);
  }
  const docs=corpus.chunks.map(c=>({c,body:terms(c.text),title:terms(c.title+' '+c.guest)}));
  const documentFrequency=new Map();
  for(const d of docs) for(const t of new Set([...d.body,...d.title])) documentFrequency.set(t,(documentFrequency.get(t)||0)+1);
  const ranked=docs.map(({c,body,title})=>{
    let score=0,hits=0;
    for(const [t,weight] of query) {
      const tf=body.filter(w=>w===t).length,head=title.includes(t);
      if(tf||head) {score+=weight*Math.log(1+(docs.length+1)/(1+(documentFrequency.get(t)||0)))*((tf?1+Math.log(tf):0)+(head?1.8:0));if(original.includes(t))hits++;}
    }
    if(!hits) score=0;
    return {c,score:score/Math.pow(Math.max(50,body.length)/100,.12)};
  }).filter(d=>d.score>0).sort((a,b)=>b.score-a.score);
  const counts=new Map(),selected=[];
  for(const {c} of ranked){if((counts.get(c.episodeId)||0)>=2)continue;selected.push(c);counts.set(c.episodeId,(counts.get(c.episodeId)||0)+1);if(selected.length===limit)break;}
  return selected;
}

export function validateAnswer(draft,allowed) {
  if(!draft||!['answered','insufficient'].includes(draft.status)||!Array.isArray(draft.points)||draft.points.length>4) throw new Error('The model response did not match the answer format.');
  if(draft.status==='insufficient'&&draft.points.length) throw new Error('Insufficient evidence response included unsupported claims.');
  if(draft.status==='answered'&&!draft.points.length) throw new Error('An answer needs a cited point.');
  const used=new Map();
  const points=draft.points.map(p=>{
    if(typeof p.text!=='string'||!p.text.trim()||p.text.length>1800||!Array.isArray(p.sourceIds)||!p.sourceIds.length||p.sourceIds.length>3) throw new Error('Each answer point needs a valid citation.');
    for(const id of p.sourceIds) {const c=allowed.find(c=>c.id===id);if(!c)throw new Error('The model returned an unknown citation.');used.set(id,c);}
    let text=p.text.trim();for(const id of p.sourceIds)text=text.replaceAll(`(${id})`,'').replaceAll(`[${id}]`,'');
    return {text:text.trim(),sourceIds:[...new Set(p.sourceIds)]};
  });
  for(const key of ['application','followUp']) if(draft[key]!=null&&(typeof draft[key]!=='string'||draft[key].length>1000)) throw new Error('The model response included an invalid extra field.');
  if(draft.status==='insufficient'&&draft.application) throw new Error('Insufficient evidence cannot support an application.');
  return {status:draft.status,points,application:draft.application||null,followUp:draft.followUp||null,sources:[...used.values()]};
}

export function projectCost(inputTokens,outputTokens) {
  if(!Number.isFinite(inputTokens)||!Number.isFinite(outputTokens)||inputTokens<0||outputTokens<0)throw new Error('Invalid token count.');
  return Math.round((inputTokens*CLOUD_REFERENCE.inputPerMillion+outputTokens*CLOUD_REFERENCE.outputPerMillion)/1e6*1e9)/1e9;
}

export function resolveEpisodeEvidence(corpus,episodeIds) {
  if(!Array.isArray(episodeIds)||episodeIds.length>3)throw new Error('Invalid episode selection.');
  const result=[];let size=0;
  for(const id of [...new Set(episodeIds)]) {
    const records=corpus.chunks.filter(c=>c.episodeId===id);
    if(!records.length)throw new Error('Unknown episode selected.');
    records.sort((a,b)=>(b.type==='transcript-candidate')-(a.type==='transcript-candidate'));
    let episodeSize=0;
    for(const c of records){if(size+c.text.length>30000||episodeSize+c.text.length>12000)continue;result.push(c);size+=c.text.length;episodeSize+=c.text.length;}
  }
  return result;
}

export const ANSWER_SCHEMA={type:'object',additionalProperties:false,required:['status','points','application','followUp'],properties:{status:{type:'string',enum:['answered','insufficient']},points:{type:'array',maxItems:4,items:{type:'object',additionalProperties:false,required:['text','sourceIds'],properties:{text:{type:'string'},sourceIds:{type:'array',items:{type:'string'}}}}},application:{type:['string','null']},followUp:{type:['string','null']}}};
