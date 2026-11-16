import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const core = await import('../prototype/ask-the-show/core.mjs').catch(() => ({}));
const source = await import('../prototype/ask-the-show/corpus.mjs').catch(() => ({}));
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

test('an answer resolves citations from allowed evidence, never from invented model URLs', () => {
  assert.equal(typeof core.validateAnswer,'function');
  const answer=core.validateAnswer({status:'answered',points:[{text:'Look at the process behind the results.',sourceIds:['finance']}],application:'Ask what drove the results.',followUp:null},chunks);
  assert.equal(answer.sources[0].url,chunks[0].url);
  assert.equal(answer.sources[0].text,chunks[0].text);
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
