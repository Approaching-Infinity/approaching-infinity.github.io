import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const api=await import('../prototype/ask-the-show/public-server.mjs').catch(()=>({}));
import {requestSession} from '../src/scripts/ask-show-session.mjs';
const origin='https://approaching-infinity.github.io';
const corpus={episodes:[],coverage:{episodes:1,transcriptPassages:0},chunks:[{id:'note',episodeId:'one',title:'A team goal',url:origin+'/episodes/one/',type:'notes',date:'2026-01-01',text:'The notes describe defining a shared outcome and a clear measure of success.'}]};
const good=()=>({draft:{status:'answered',points:[{text:'The notes describe defining a shared outcome.',sourceIds:['note']}],application:null,followUp:null},sourceIds:['note'],usage:{inputTokens:100,outputTokens:20},usageComplete:true});
async function fixture(run,{generate=async()=>good(),now=()=>Date.now()}={}){
 const dir=await mkdtemp(join(tmpdir(),'ask-public-'));
 try{
  assert.equal(typeof api.QuotaStore,'function');const store=new api.QuotaStore(join(dir,'quota.sqlite'),{now});
  const server=api.createPublicServer({store,corpus,generate,signingKey:'S'.repeat(43),live:true});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  const request=(path,{token,body,headers={}}={})=>fetch(base+path,{method:body?'POST':'GET',headers:{Origin:origin,...(token?{'X-Ask-Visitor':token}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},...(body?{body:JSON.stringify(body)}:{})});
  const visitor=async()=>{const r=await request('/session');assert.equal(r.status,200);return(await r.json()).visitorToken;};
  try{await run({store,dir,server,base,request,visitor});}finally{await new Promise(r=>server.close(r));store.close();}
 }finally{await rm(dir,{recursive:true,force:true});}
}
test('three visitor attempts/day survive reopening and reset next UTC day',async()=>{
 let now=Date.parse('2026-11-16T15:00:00Z'),calls=0;
 await fixture(async({store,request,visitor,dir})=>{
  const token=await visitor();
  for(let n=0;n<3;n++){const r=await request('/ask',{token,body:{requestId:`request-${n}`,question:'How can a team define its goal?'}});assert.equal(r.status,200);assert.equal((await r.json()).remaining,2-n);}
  assert.equal((await request('/ask',{token,body:{requestId:'fourth',question:'How can a team define its goal?'}})).status,429);assert.equal(calls,3);
  const reopened=new api.QuotaStore(join(dir,'quota.sqlite'),{now:()=>now});assert.equal(reopened.remaining(api.visitorId(token,'S'.repeat(43))),0);reopened.close();
  now+=86400000;assert.equal((await request('/ask',{token,body:{requestId:'tomorrow',question:'How can a team define its goal?'}})).status,200);assert.equal(calls,4);
 },{now:()=>now,generate:async()=>{calls++;return good();}});
});
test('replayed or conflicting request ID never dispatches twice or leaks stored text',async()=>{
 let calls=0;await fixture(async({request,visitor,dir})=>{
  const token=await visitor(),body={requestId:'stable-request',question:'A private-ish test string about team alignment'};
  assert.equal((await request('/ask',{token,body})).status,200);
  assert.equal((await request('/ask',{token,body})).status,409);
  assert.equal((await request('/ask',{token,body:{...body,question:'A changed question about team alignment'}})).status,409);assert.equal(calls,1);
  for(const file of await readdir(dir)){const bytes=await readFile(join(dir,file));assert.ok(!bytes.includes(body.question));assert.ok(!bytes.includes('S'.repeat(43)));}
 },{generate:async()=>{calls++;return good();}});
});
test('unknown charges retain reservations and stop at the application sublimit',async()=>{
 let calls=0;await fixture(async({request,visitor})=>{
  for(let n=0;n<8;n++){const token=await visitor();assert.equal((await request('/ask',{token,body:{requestId:`unknown-${n}`,question:'How can a team define its goal?'}})).status,503);}
  const token=await visitor();assert.equal((await request('/ask',{token,body:{requestId:'over-cap',question:'How can a team define its goal?'}})).status,429);assert.equal(calls,8);
 },{generate:async()=>{calls++;return{draft:null,error:'Relay unavailable',usageComplete:false};}});
});
test('bad origins, visitor signatures and oversized questions stop before inference; status is private',async()=>{
 await fixture(async({request,visitor,base})=>{
  assert.equal((await request('/session',{headers:{Origin:'https://evil.example'}})).status,403);
  assert.equal((await request('/ask',{body:{requestId:'one',question:'What do the episodes discuss?'}})).status,403);
  const token=await visitor();assert.equal((await request('/ask',{token:token.slice(0,-1)+'x',body:{requestId:'one',question:'What do the episodes discuss?'}})).status,403);
  assert.equal((await request('/ask',{token,body:{requestId:'one',question:'x'.repeat(1001)}})).status,400);
  const s=await(await request('/status',{token})).json();assert.equal(s.remaining,3);assert.ok(!JSON.stringify(s).includes('spent'));assert.ok(!JSON.stringify(s).includes('token_service'));
  assert.equal((await fetch(base+'/../../package.json')).status,403);
 },{generate:async()=>{throw Error('must not generate');}});
});
test('invalid citations fail closed and completed usage remains charged',async()=>{
 await fixture(async({request,visitor,store})=>{
  const token=await visitor();const response=await request('/ask',{token,body:{requestId:'invalid',question:'What do the episodes discuss?'}});assert.equal(response.status,422);assert.equal(store.summary().uncertain,0);assert.ok(store.summary().liabilityMicro>0);
 },{generate:async()=>({...good(),draft:{...good().draft,points:[{text:'Unverified content',sourceIds:['invented']}]}})});
});
test('parallel visitors cannot start a second model call and educational scope refuses without a charge',async()=>{
 let finish,calls=0;await fixture(async({request,visitor})=>{
  const token=await visitor();const scope=await request('/ask',{token,body:{requestId:'scope',question:'Should I invest in this fund?'}});assert.equal((await scope.json()).generated,false);
  const first=request('/ask',{token,body:{requestId:'first',question:'How can a team define its goal?'}});while(!finish)await new Promise(r=>setTimeout(r,1));
  assert.equal((await request('/ask',{token,body:{requestId:'second',question:'How can a team define its goal?'}})).status,429);assert.equal(calls,1);finish(good());assert.equal((await first).status,200);
 },{generate:()=>{calls++;return new Promise(r=>{finish=r;});}});
});
test('browser session recovery replaces invalid credentials while preserving a valid daily allowance',async()=>{
 await fixture(async({base,request})=>{
  const fetchWithOrigin=(url,options)=>fetch(url,{...options,headers:{...options.headers,Origin:origin}});
  const restored=await requestSession(base,'expired-signature',fetchWithOrigin);
  assert.equal(restored.remaining,3);assert.ok(restored.visitorToken);
  await request('/ask',{token:restored.visitorToken,body:{requestId:'session-first',question:'How can a team define its goal?'}});
  const valid=await requestSession(base,restored.visitorToken,fetchWithOrigin);
  assert.equal(valid.visitorToken,restored.visitorToken);assert.equal(valid.remaining,2);
 });
});
