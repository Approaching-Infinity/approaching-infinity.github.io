import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get as httpGet } from 'node:http';

const core = await import('../prototype/ask-the-show/core.mjs').catch(() => ({}));
const source = await import('../prototype/ask-the-show/corpus.mjs').catch(() => ({}));
const service = await import('../prototype/ask-the-show/server.mjs').catch(() => ({}));
const modelModule = await import('../prototype/ask-the-show/model.mjs').catch(()=>({}));
const chunks = [
  {id:'finance',episodeId:'finance',title:'Learning from investment results',guest:'A researcher',type:'notes',text:'When investment performance is unusually strong, examine concentration and the process behind returns.',url:'https://approaching-infinity.github.io/episodes/finance/'},
  {id:'vets',episodeId:'vets',title:'Veterans moving into new careers',guest:'A veteran',type:'notes',text:'Military service members can seek career guidance and mentorship for the transition to civilian work.',url:'https://approaching-infinity.github.io/episodes/vets/'},
  {id:'ai',episodeId:'ai',title:'Using artificial intelligence responsibly',guest:'A technologist',type:'notes',text:'AI helps automate a workflow while people retain judgment and review decisions.',url:'https://approaching-infinity.github.io/episodes/ai/'},
];

test('archive retrieval finds relevant finance, veterans and technology passages', () => {
  assert.equal(typeof core.retrieve,'function');
  for(const [q,id] of [['Why can excellent returns hide risk?','finance'],['How can veterans transition to civilian careers?','vets'],['How can AI automate work without losing human judgment?','ai']]) {
    assert.equal(core.retrieve({chunks},q,[])[0]?.id,id,q);
  }
  assert.deepEqual(core.retrieve({chunks},'What is the recipe for sourdough bread?',[]),[]);
});

async function localServer(generate,run) {
  assert.equal(typeof service.createPrototypeServer,'function');
  const server=service.createPrototypeServer({corpus:{chunks,episodes:[],coverage:{episodes:3}},generate,model:'test-local'});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const post=(value,extra={})=>fetch(origin+'/api/ask',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...extra},body:typeof value==='string'?value:JSON.stringify(value)});
  try {await run({origin,post,server});} finally {await new Promise(resolve=>server.close(resolve));}
}

test('private HTTP server rejects cross-origin calls, oversized input and filesystem routes',async()=>{
  await localServer(async()=>{throw new Error('must not call model');},async({origin,post})=>{
    assert.equal((await post({question:'Why do results matter?'},{Origin:'https://example.com'})).status,403);
    assert.equal((await post({question:'a'.repeat(1001)})).status,400);
    assert.equal((await post(' '.repeat(13000))).status,413);
    assert.equal((await fetch(origin+'/../../package.json')).status,404);
    const wrongHostStatus=await new Promise((resolve,reject)=>httpGet(origin+'/api/status',{headers:{Host:'attacker.example'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject));
    assert.equal(wrongHostStatus,403);
  });
});

test('invalid generated citations fail closed while consumed usage is counted without storing the question',async()=>{
  await localServer(async()=>({draft:{status:'answered',points:[{text:'Invented answer',sourceIds:['fake']}],application:null,followUp:null},usage:{inputTokens:100,outputTokens:20}}),async({origin,post})=>{
    const result=await post({question:'Why can excellent returns hide risk?'});
    assert.equal(result.status,422);
    assert.match((await result.json()).error,/citation/i);
    const status=await (await fetch(origin+'/api/status')).json();
    assert.equal(status.usage.inputTokens,100);
    assert.equal(status.usage.failed,1);
    assert.equal(status.usage.apiSpendUSD,0);
    assert.ok(!JSON.stringify(status).includes('excellent returns'));
  });
});

test('model concurrency is bounded and the completed response carries real citations and usage',async()=>{
  let resolveGeneration;
  await localServer(()=>new Promise(resolve=>{resolveGeneration=resolve;}),async({post})=>{
    const first=post({question:'Why can excellent returns hide risk?'});
    while(!resolveGeneration) await new Promise(resolve=>setTimeout(resolve,1));
    assert.equal((await post({question:'How can AI automate work?'})).status,429);
    resolveGeneration({draft:{status:'answered',points:[{text:'Examine the process behind returns.',sourceIds:['finance']}],application:null,followUp:null},usage:{inputTokens:100,outputTokens:30}});
    const result=await first;
    assert.equal(result.status,200);
    const answer=await result.json();
    assert.equal(answer.sources[0].id,'finance');
    assert.equal(answer.usage.outputTokens,30);
    assert.equal(answer.generated,true);
  });
});

test('an answer resolves citations from allowed evidence, never from invented model URLs', () => {
  assert.equal(typeof core.validateAnswer,'function');
  const answer=core.validateAnswer({status:'answered',points:[{text:'Look at the process behind the results.',sourceIds:['finance']}],application:'Ask what drove the results.',followUp:null},chunks);
  assert.equal(answer.sources[0].url,chunks[0].url);
  assert.equal(answer.sources[0].text,chunks[0].text);
  const clean=core.validateAnswer({status:'answered',points:[{text:'Look at the process. (finance)',sourceIds:['finance']}],application:null,followUp:null},chunks);
  assert.equal(clean.points[0].text,'Look at the process.');
  assert.throws(()=>core.validateAnswer({status:'answered',points:[{text:'A claim.',sourceIds:['invented']}],application:null,followUp:null},chunks),/citation/i);
  assert.throws(()=>core.validateAnswer({status:'answered',points:[{text:'A claim.',sourceIds:[]}],application:null,followUp:null},chunks),/citation/i);
});

test('insufficient evidence does not pass through unsupported generated claims', () => {
  assert.equal(typeof core.validateAnswer,'function');
  const answer=core.validateAnswer({status:'insufficient',points:[],application:null,followUp:'Which episode or topic do you mean?'},chunks);
  assert.equal(answer.status,'insufficient');
  assert.deepEqual(answer.sources,[]);
  assert.throws(()=>core.validateAnswer({status:'insufficient',points:[{text:'An unsupported answer',sourceIds:[]}],application:null,followUp:null},chunks),/insufficient/i);
});

test('cloud projection is transparent arithmetic and does not masquerade as local spend', () => {
  assert.equal(typeof core.projectCost,'function');
  assert.equal(core.projectCost(1_000_000,1_000_000),1.4);
  assert.equal(core.projectCost(0,0),0);
  assert.throws(()=>core.projectCost(-1,10),/token/i);
});

test('semantic episode routing resolves only corpus-owned passages and includes candidate transcripts',()=>{
  assert.equal(typeof core.resolveEpisodeEvidence,'function');
  const corpus={chunks:[...chunks,{...chunks[0],id:'finance-transcript',type:'transcript-candidate',text:'The exact transcript passage.'}]};
  const evidence=core.resolveEpisodeEvidence(corpus,['finance']);
  assert.ok(evidence.some(c=>c.id==='finance-transcript'));
  assert.ok(evidence.every(c=>c.episodeId==='finance'));
  assert.throws(()=>core.resolveEpisodeEvidence(corpus,['made-up-episode']),/episode/i);
});

test('model uses short enumerated source keys and maps them back to exact corpus citations',async()=>{
  let n=0;
  const result=await modelModule.generateLocal({question:'Why can results hide risk?',sources:[],corpus:{episodes:[{episodeId:'finance',title:'Investment process',angle:'Why can results hide risk?'}],chunks},fetchImpl:async(_url,request)=>{
    const body=JSON.parse(request.body);n++;
    if(n===1){assert.deepEqual(body.format.properties.episodeKeys.items.enum,['EP1']);return Response.json({message:{content:JSON.stringify({episodeKeys:['EP1']})},prompt_eval_count:10,eval_count:5});}
    assert.deepEqual(body.format.anyOf[0].properties.points.items.properties.sourceIds.items.enum,['S1']);
    assert.equal(body.format.anyOf[0].properties.points.minItems,1);
    assert.equal(body.format.anyOf[1].properties.points.maxItems,0);
    return Response.json({message:{content:JSON.stringify({status:'answered',points:[{text:'The researcher examines the process. (S1)',sourceIds:['S1']}],application:null,followUp:null})},prompt_eval_count:20,eval_count:8});
  }});
  assert.equal(result.draft.points[0].sourceIds[0],'finance');
  assert.equal(result.draft.points[0].text,'The researcher examines the process.');
  assert.equal(result.usage.inputTokens,30);
});

test('corpus loader excludes boilerplate, keeps feature credit and labels transcript candidates', async () => {
  assert.equal(typeof source.loadCorpus,'function');
  const dir=await mkdtemp(join(tmpdir(),'ask-corpus-'));
  try {
    await writeFile(join(dir,'feature.md'),'---\ntitle: "A featured conversation"\nepisodeNumber: 0\nbonus: true\nguestAppearance: {"show":"Original Show","host":"Original Host","url":"https://example.com/original"}\npubDate: 2026-01-01\n---\nUseful teaching about process and evidence.\n\n**Follow Approaching Infinity**\n\nA boilerplate link.\n');
    const evidence=join(dir,'evidence.json');
    await writeFile(evidence,JSON.stringify({excerpts:[{id:'clip',episodeId:'feature',speaker:'The guest',clock:'CLIP ONLY, full episode offset unknown',timestamp:'00:45',text:'The actual source passage.'}]}));
    const corpus=await source.loadCorpus({episodeDir:dir,evidencePath:evidence});
    assert.equal(corpus.coverage.episodes,1);
    assert.equal(corpus.episodes[0].credit,'Justin featured on Original Show · hosted by Original Host');
    assert.ok(corpus.chunks.every(c=>!c.text.includes('boilerplate')));
    const clip=corpus.chunks.find(c=>c.id==='clip');
    assert.equal(clip.type,'transcript-candidate');
    assert.match(clip.clock,/CLIP ONLY/);
    assert.equal(clip.timestampVerified,false);
    assert.ok(!JSON.stringify(corpus).includes('drive.google.com'));
  } finally {await rm(dir,{recursive:true,force:true});}
});
