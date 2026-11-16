import {createServer} from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHmac,randomUUID,timingSafeEqual,createHash} from 'node:crypto';
import {validateAnswer,retrieve} from './core.mjs';
import {challenges} from './challenges.mjs';
import {createRelayGenerator,FileAttemptJournal,readProtectedToken} from './relay.mjs';

export const LIMITS=Object.freeze({dailyVisitor:3,dailyNetwork:12,dailySite:30,monthlySiteMicro:250000,reservationMicro:30000,maxQuestionChars:1000});
const WEBSITE='https://approaching-infinity.github.io';
const digest=s=>createHash('sha256').update(s).digest('hex');
const mac=(s,key)=>createHmac('sha256',key).update(s).digest('base64url');
const source=c=>Object.fromEntries(['id','episodeId','title','number','date','guest','credit','url','text','type','timestamp','timestampVerified','speaker','clock'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));
class Stop extends Error{constructor(code,status=429){super(code);this.code=code;this.status=status;}}
export function visitorId(token,key){
 if(typeof token!=='string'||token.length>150)return null;
 const parts=token.split('.');if(parts.length!==3||parts[0]!=='v1'||!/^[a-f0-9-]{36}$/.test(parts[1])||!/^[A-Za-z0-9_-]{43}$/.test(parts[2]))return null;
 return timingSafeEqual(Buffer.from(parts[2]),Buffer.from(mac('visitor:'+parts[1],key)))?parts[1]:null;
}
const issueVisitor=key=>{const id=randomUUID();return `v1.${id}.${mac('visitor:'+id,key)}`;};

export class QuotaStore{
 constructor(path,{now=()=>Date.now()}={}){
  mkdirSync(dirname(path),{recursive:true,mode:0o700});this.now=now;this.db=new DatabaseSync(path);chmodSync(path,0o600);
  this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=1000; CREATE TABLE IF NOT EXISTS requests (id TEXT PRIMARY KEY, visitor TEXT NOT NULL, network TEXT NOT NULL, day TEXT NOT NULL, month TEXT NOT NULL, fingerprint TEXT NOT NULL, state TEXT NOT NULL, cost INTEGER, started INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS request_day ON requests(day,visitor);');
 }
 day(){return new Date(this.now()).toISOString().slice(0,10);}
 remaining(visitor){return Math.max(0,LIMITS.dailyVisitor-this.db.prepare('SELECT count(*) AS n FROM requests WHERE visitor=? AND day=?').get(digest(visitor),this.day()).n);}
 summary(){const r=this.db.prepare('SELECT coalesce(sum(coalesce(cost,?)),0) AS liabilityMicro, count(*) AS attempts, sum(CASE WHEN cost IS NULL THEN 1 ELSE 0 END) AS uncertain FROM requests WHERE month=?').get(LIMITS.reservationMicro,this.day().slice(0,7));return{...r,uncertain:r.uncertain??0};}
 available(){return this.summary().liabilityMicro+LIMITS.reservationMicro<=LIMITS.monthlySiteMicro;}
 recoverInterrupted(){this.db.prepare("UPDATE requests SET state='uncertain' WHERE state='running'").run();}
 reserve({id,visitor,network,fingerprint}){
  const day=this.day(),month=day.slice(0,7);this.db.exec('BEGIN IMMEDIATE');
  try{
   const prior=this.db.prepare('SELECT fingerprint FROM requests WHERE id=?').get(id);
   if(prior)throw new Stop(prior.fingerprint===fingerprint?'already_attempted':'identity_conflict',409);
   if(this.remaining(visitor)===0)throw new Stop('daily_limit');
   if(this.db.prepare('SELECT count(*) AS n FROM requests WHERE day=? AND network=?').get(day,network).n>=LIMITS.dailyNetwork)throw new Stop('network_limit');
   if(this.db.prepare('SELECT count(*) AS n FROM requests WHERE day=?').get(day).n>=LIMITS.dailySite)throw new Stop('pilot_capacity');
   if(!this.available())throw new Stop('pilot_capacity');
   if(this.db.prepare("SELECT count(*) AS n FROM requests WHERE state='running'").get().n>0)throw new Stop('busy');
   this.db.prepare("INSERT INTO requests VALUES(?,?,?,?,?,?,'running',NULL,?)").run(id,digest(visitor),network,day,month,fingerprint,this.now());this.db.exec('COMMIT');
  }catch(e){this.db.exec('ROLLBACK');throw e;}
 }
 finish(id,result){
  const u=result?.usage;
  const known=result?.usageComplete===true&&Number.isSafeInteger(u?.inputTokens)&&Number.isSafeInteger(u?.outputTokens)&&u.inputTokens>=0&&u.outputTokens>=0;
  // Current Relay native gpt-4o-mini rate; no cached-input discount. Estimates, not invoices.
  const cost=known?Math.ceil(u.inputTokens*.15+u.outputTokens*.6):null;
  this.db.prepare('UPDATE requests SET state=?,cost=? WHERE id=?').run(known?'finished':'uncertain',cost,id);
 }
 close(){this.db.close();}
}

export function createPublicServer({store,corpus,generate,signingKey,live=false,trustedProxy=false}={}){
 if(!store||!corpus||typeof generate!=='function'||!/^[A-Za-z0-9_-]{43}$/.test(signingKey??''))throw Error('Public service configuration is incomplete.');
 let busy=false;
 const server=createServer(async(req,res)=>{
  const send=(status,value)=>{if(res.destroyed)return;res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(value));};
  res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Vary','Origin');
  const path=req.url?.split('?')[0];
  if(req.method==='GET'&&path==='/healthz')return send(200,{status:'ok',live,service:'approaching-infinity-ask'});
  if(req.headers.origin!==WEBSITE)return send(403,{error:'Open Ask the Show on the Approaching Infinity website.'});
  res.setHeader('Access-Control-Allow-Origin',WEBSITE);res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type, X-Ask-Visitor');res.setHeader('Access-Control-Max-Age','600');
  if(req.method==='OPTIONS'){res.writeHead(204);res.end();return;}
  try{
   let token=req.headers['x-ask-visitor'],visitor=visitorId(token,signingKey);
   const status=()=>({remaining:visitor?store.remaining(visitor):0,dailyLimit:3,resetAt:new Date(Date.parse(store.day()+'T00:00:00Z')+86400000).toISOString(),available:live&&store.available(),coverage:corpus.coverage});
   if(req.method==='GET'&&path==='/session'){
    if(!visitor){token=issueVisitor(signingKey);visitor=visitorId(token,signingKey);}
    return send(200,{visitorToken:token,...status()});
   }
   if(!visitor)return send(403,{error:'Refresh Ask the Show to start your free session.'});
   if(req.method==='GET'&&path==='/status')return send(200,status());
   if(req.method!=='POST'||path!=='/ask')return send(404,{error:'Page not found.'});
   if(!live)throw new Stop('pilot_capacity');
   if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'Use the question form.'});
   let size=0,parts=[];for await(const part of req){size+=part.length;if(size>12000)return send(413,{error:'Keep your question and conversation brief.'});parts.push(part);}
   let b;try{b=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return send(400,{error:'The question format was not readable.'});}
   if(!b||Array.isArray(b)||Object.keys(b).some(k=>!['question','history','requestId','challengeId'].includes(k))||typeof b.question!=='string'||b.question.trim().length<4||b.question.length>1000||typeof b.requestId!=='string'||!/^[A-Za-z0-9_.-]{1,80}$/.test(b.requestId))return send(400,{error:'Ask a question using4–1,000characters.'});
   const question=b.question.trim(),history=b.history??[];
   if(!Array.isArray(history)||history.length>3||history.some(h=>!h||typeof h.question!=='string'||h.question.length>1000||typeof h.answer!=='string'||h.answer.length>1600))return send(400,{error:'Start a new conversation; the history is too long.'});
   const challenge=b.challengeId?challenges.find(c=>c.id===b.challengeId):null;if(b.challengeId&&!challenge)return send(400,{error:'Choose an available challenge.'});
   const personal=/\bshould i\b.{0,90}\b(buy|sell|invest|allocate|borrow)\b|\b(how|where|can i)\b.{0,60}\b(invest|subscribe)\b.{0,40}\b(limitless|fund)\b/i.test(question);
   const internal=/\b(reveal|print|show|give|disclose)\b.{0,80}\b(system prompt|api key|internal instruction|hidden instruction)/i.test(question);
   if(personal||internal)return send(200,{status:'scope',points:[],sources:[],application:null,followUp:personal?'I can explain ideas discussed in the episodes. I cannot recommend a personal investment or provide access to a fund.':'I can help explore ideas from the episodes. Which topic interests you?',generated:false,remaining:store.remaining(visitor)});
   if(busy)throw new Stop('busy');
   const id=digest(visitor+'\0'+b.requestId),fingerprint=digest(JSON.stringify({question,history,challengeId:b.challengeId??null}));
   const remote=trustedProxy&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)?req.headers['x-real-ip']??req.socket.remoteAddress:req.socket.remoteAddress;
   store.reserve({id,visitor,network:mac('network:'+remote,signingKey),fingerprint});busy=true;
   const abort=new AbortController(),started=Date.now();res.on('close',()=>{if(!res.writableEnded)abort.abort();});
   let result;
   try{
    let selected=retrieve(corpus,question,history);
    if(challenge)selected=challenge.sources.map(id=>corpus.chunks.find(c=>c.id===id)).filter(Boolean);
    result=await generate({operationId:'ask-'+id,question,history,sources:selected,corpus,challenge:challenge?{title:challenge.title,scenario:challenge.scenario,lesson:challenge.lesson}:null,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(90000)])});
    store.finish(id,result);
    if(result.error)return send(503,{error:'An answer could not be completed. No automatic retry was made. Your question is still here.',remaining:store.remaining(visitor)});
    let answer;try{answer=validateAnswer(result.draft,(result.sourceIds??selected.map(c=>c.id)).map(id=>corpus.chunks.find(c=>c.id===id)).filter(Boolean));}
    catch{return send(422,{error:'The answer did not pass its evidence checks. Please explore an episode or a decision challenge instead.',remaining:store.remaining(visitor)});}
    return send(200,{...answer,sources:answer.sources.map(source),generated:true,usage:{milliseconds:Date.now()-started},remaining:store.remaining(visitor)});
   }catch{store.finish(id,result??{usageComplete:false});return send(503,{error:'The pilot is temporarily unavailable. No automatic retry was made.',remaining:store.remaining(visitor)});}
   finally{busy=false;}
  }catch(error){
   const messages={daily_limit:'You have used your three free questions today. Come back after the daily reset, or try a decision challenge.',network_limit:'This network has reached the pilot allowance today. Decision challenges are still available.',pilot_capacity:'Free AI questions are paused while pilot capacity is unavailable. Decision challenges are still available.',busy:'Another answer is being prepared. Please try again shortly.',already_attempted:'This question was already attempted. It will not be sent again; edit it or start a new conversation.',identity_conflict:'That request identity has already been used. Start a new conversation.'};
   return send(error instanceof Stop?error.status:503,{error:messages[error.code]??'The pilot is temporarily unavailable.',code:error instanceof Stop?error.code:'unavailable'});
  }
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.timeout=100000;server.keepAliveTimeout=5000;
 return server;
}

async function start(){
 process.umask(0o077);
 const state=process.env.ASK_SHOW_STATE_DIR;if(!state)throw Error('A persistent state directory is required.');
 const corpus=JSON.parse(await readFile(process.env.ASK_SHOW_CORPUS_PATH,'utf8'));
 const store=new QuotaStore(join(state,'quota.sqlite'));
 const generate=createRelayGenerator({journal:new FileAttemptJournal(join(state,'attempts')),readToken:()=>readProtectedToken(process.env.ASK_SHOW_TOKEN_PATH)});
 const signingKey=await readProtectedToken(process.env.ASK_SHOW_SESSION_KEY_PATH);
 const server=createPublicServer({store,corpus,generate,signingKey,live:process.env.ASK_SHOW_LIVE==='1',trustedProxy:true});
 server.listen(4372,'127.0.0.1',()=>{store.recoverInterrupted();console.log('Approaching Infinity Ask service ready on loopback4372.');});
 for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{store.close();process.exit(0);}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))start().catch(()=>{console.error('Ask service configuration unavailable.');process.exit(1);});
