import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,readdir,writeFile,chmod,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const relay=await import('../prototype/ask-the-show/relay.mjs').catch(()=>({}));
const question='How can a team make its goal clear?';
const operationId='ask-test-operation-1';
const chunks=[{id:'notes-1',episodeId:'e31',title:'Team alignment',type:'notes',text:'The episode notes describe explicit direction and shared success measures.'}];
const corpus={episodes:[{episodeId:'e31',title:'Team alignment',angle:'How do teams align?'}],chunks};
const providerReply=(value,{model='gpt-4o-mini-2024-07-18',usage={prompt_tokens:30,completion_tokens:10},finish='stop'}={})=>Response.json({model,choices:[{finish_reason:finish,message:{content:JSON.stringify({result:value})}}],usage});
const answered={status:'answered',points:[{text:'The episode notes describe shared success measures.',sourceIds:['S1']}],application:null,followUp:null};

async function fixture(run){
 const dir=await mkdtemp(join(tmpdir(),'ask-relay-'));
 try{
  const tokenPath=join(dir,'app-token');await writeFile(tokenPath,'F'.repeat(43),{mode:0o600});
  assert.equal(typeof relay.FileAttemptJournal,'function');
  const journal=new relay.FileAttemptJournal(join(dir,'attempts'));
  const options={journal,readToken:()=>relay.readProtectedToken(tokenPath)};
  await run({dir,tokenPath,journal,options});
 }finally{await rm(dir,{recursive:true,force:true});}
}

test('Relay selection and answer share one operation, separate stable requests and exact sources',async()=>{
 await fixture(async({dir,options})=>{
  const seen=[];
  const generate=relay.createRelayGenerator({...options,fetchImpl:async(url,request)=>{
   seen.push({url,request});
   const journalFiles=await readdir(join(dir,'attempts'));assert.ok(journalFiles.length>=seen.length);
   const payload=JSON.parse(request.body);
   assert.equal(payload.model,'gpt-4o-mini');assert.equal(payload.stream,false);
   assert.equal(payload.response_format.json_schema.strict,true);
   assert.equal(payload.response_format.json_schema.schema.type,'object');
   assert.equal(request.redirect,'error');
   assert.equal(url,'http://127.0.0.1:8768/v3/native/openai/v1/chat/completions');
   assert.equal(request.headers['X-Relay-Operation-Id'],operationId);
   assert.equal(request.headers.Authorization,'Bearer '+'F'.repeat(43));
   return providerReply(seen.length===1?{episodeKeys:['EP1']}:answered);
  }});
  const result=await generate({operationId,question,corpus,sources:[]});
  assert.equal(seen.length,2);
  assert.deepEqual(seen.map(x=>x.request.headers['X-Relay-Feature']),['episode_selection','archive_answer']);
  assert.deepEqual(seen.map(x=>x.request.headers['X-Relay-Request-Id']),[operationId+'-selection',operationId+'-answer']);
  assert.equal(result.draft.points[0].sourceIds[0],'notes-1');
  assert.equal(result.usage.inputTokens,60);assert.equal(result.usage.outputTokens,20);
  assert.equal(result.usageComplete,true);
  const journalText=(await Promise.all((await readdir(join(dir,'attempts'))).map(f=>readFile(join(dir,'attempts',f),'utf8')))).join('\n');
  assert.ok(!journalText.includes(question));assert.ok(!journalText.includes('F'.repeat(43)));assert.ok(!journalText.includes(chunks[0].text));
 });
});

test('Relay pending, refusal and failure never trigger another provider or local-model fallback',async()=>{
 for(const status of [202,400,401,403,409,429,500,503])await fixture(async({options})=>{
  let calls=0;
  const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>{calls++;return Response.json({error:{code:'relay_budget_exceeded',message:'DO NOT ECHO secret-token'}},{status});}});
  const result=await generate({operationId,question,corpus,sources:[]});
  assert.equal(calls,1);assert.equal(result.draft,null);assert.match(result.error,/Relay/i);assert.ok(!result.error.includes('secret-token'));
 });
});

test('lost acknowledgement and process restart cannot dispatch a consumed request again',async()=>{
 await fixture(async({options,dir})=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;throw new TypeError('connection lost after POST');};
  await relay.createRelayGenerator({...options,fetchImpl})({operationId,question,corpus,sources:[]});
  const afterRestart=relay.createRelayGenerator({...options,journal:new relay.FileAttemptJournal(join(dir,'attempts')),fetchImpl});
  const same=await afterRestart({operationId,question,corpus,sources:[]});
  assert.equal(calls,1);assert.equal(same.draft,null);assert.match(same.error,/already|uncertain|unavailable/i);
  const changed=await afterRestart({operationId,question:question+' Changed.',corpus,sources:[]});
  assert.equal(calls,1);assert.match(changed.error,/conflict/i);
 });
});

test('invalid native usage/model, truncated output and oversized replies stop before answer generation',async()=>{
 for(const changes of [{usage:undefined,missingUsage:true},{usage:{prompt_tokens:-1,completion_tokens:2}},{model:'unapproved-model'},{finish:'length'}])await fixture(async({options})=>{
  let calls=0;
  const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>{calls++;const r=providerReply({episodeKeys:['EP1']},changes);if(!changes.missingUsage)return r;const b=await r.json();delete b.usage;return Response.json(b);}});
  const result=await generate({operationId,question,corpus,sources:[]});
  assert.equal(calls,1);assert.equal(result.draft,null);
 });
 await fixture(async({options})=>{
  let calls=0;const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>{calls++;return new Response('x'.repeat(70_000));}});
  const result=await generate({operationId,question,corpus,sources:[]});assert.equal(calls,1);assert.equal(result.draft,null);
 });
});

test('protected credential reader rejects public permissions and symlinks without leaking content',async()=>{
 await fixture(async({tokenPath,dir})=>{
  assert.equal(await relay.readProtectedToken(tokenPath),'F'.repeat(43));
  await chmod(tokenPath,0o644);await assert.rejects(relay.readProtectedToken(tokenPath),/credential/i);
  await chmod(tokenPath,0o600);const link=join(dir,'link');await symlink(tokenPath,link);await assert.rejects(relay.readProtectedToken(link),/credential/i);
 });
});

test('missing operation identity, unsupported model and unsafe address fail before dispatch',async()=>{
 await fixture(async({options})=>{
  assert.throws(()=>relay.createRelayGenerator({...options,baseURL:'https://api.openai.com'}),/private Relay/i);
  assert.throws(()=>relay.createRelayGenerator({...options,model:'other'}),/model/i);
  let calls=0;const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>{calls++;throw new Error();}});
  await assert.rejects(generate({question,corpus,sources:[]}),/operation/i);assert.equal(calls,0);
 });
});

test('invalid episode selection stops before the answer round',async()=>{
 for(const invalid of [{episodeKeys:['EP999']},{episodeKeys:['EP1'],unexpected:true}])await fixture(async({options})=>{
  let calls=0;const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>{calls++;return providerReply(invalid);}});
  const result=await generate({operationId,question,corpus,sources:[]});assert.equal(calls,1);assert.equal(result.draft,null);assert.match(result.error,/selection|selected/i);
 });
});
test('invalid answer citation or schema never becomes a successful draft',async()=>{
 for(const invalid of [{...answered,points:[{text:'Unknown source',sourceIds:['S999']}]},{...answered,unexpected:true},{...answered,points:[]}])await fixture(async({options})=>{
  let calls=0;const generate=relay.createRelayGenerator({...options,fetchImpl:async()=>providerReply(++calls===1?{episodeKeys:['EP1']}:invalid)});
  const result=await generate({operationId,question,corpus,sources:[]});assert.equal(result.draft,null);assert.equal(result.usageComplete,true);assert.match(result.error,/citation|format|cited point/i);
 });
});

test('caller cancellation is combined with the mandatory Relay deadline',async t=>{
 await fixture(async({options})=>{
  const caller=new AbortController(),deadline=new AbortController();let deadlines=0;const signals=[];
  t.mock.method(AbortSignal,'timeout',ms=>{assert.equal(ms,90000);deadlines++;return deadline.signal;});
  let calls=0;const generate=relay.createRelayGenerator({...options,fetchImpl:async(_url,request)=>{signals.push(request.signal);return providerReply(++calls===1?{episodeKeys:['EP1']}:answered);}});
  await generate({operationId,question,corpus,sources:[],signal:caller.signal});
  assert.equal(deadlines,2);assert.ok(signals.every(s=>s!==caller.signal));
  deadline.abort();assert.ok(signals.every(s=>s.aborted));assert.equal(caller.signal.aborted,false);
 });
});

test('proposed per-request caps cover native framing reservation without creating another pool',async()=>{
 const policy=await readFile(new URL('../prototype/ask-the-show/relay-policy.example.toml',import.meta.url),'utf8');
 const caps=[...policy.matchAll(/^request_ceiling_usd = ([.\d]+)/gm)].map(x=>Number(x[1]));
 const operations=[...policy.matchAll(/^operation_ceiling_usd = ([.\d]+)/gm)].map(x=>Number(x[1]));
 // Actual Relay parser reserves one token per canonical nonimage byte plus 32,768 framing tokens.
 const largestReservation=(60000+32768)*0.15/1e6+850*0.6/1e6;
 assert.equal(caps.length,2);assert.ok(caps.every(cap=>cap>=largestReservation));
 assert.ok(operations.every(cap=>cap>=caps.reduce((a,b)=>a+b,0)));
 assert.ok(!/^pool_month_limit_usd\s*=/m.test(policy));
 await fixture(async({options})=>{
  const generate=relay.createRelayGenerator({...options,fetchImpl:async(_url,request)=>{assert.ok(/^[\x00-\x7f]*$/.test(request.body));return providerReply({episodeKeys:[]});}});
  const result=await generate({operationId,question:'How do people say “épargne” or 日本語?',corpus,sources:[]});
  assert.equal(result.draft?.status,'insufficient');
 });
});
