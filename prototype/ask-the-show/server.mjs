import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { loadCorpus } from './corpus.mjs';
import { retrieve, validateAnswer, projectCost, CLOUD_REFERENCE } from './core.mjs';
import { generateLocal } from './model.mjs';
import { challenges } from './challenges.mjs';

const HERE=dirname(fileURLToPath(import.meta.url));
const staticFiles=new Map([['/',['index.html','text/html; charset=utf-8']],['/app.js',['app.js','text/javascript']],['/conversation.mjs',['conversation.mjs','text/javascript']],['/style.css',['style.css','text/css']]]);
const cleanSource=c=>Object.fromEntries(['id','episodeId','title','number','date','guest','credit','url','text','type','timestamp','timestampVerified','speaker','clock'].filter(k=>c[k]!==undefined).map(k=>[k,c[k]]));
const initialUsage=()=>({startedAt:new Date().toISOString(),requests:0,completed:0,failed:0,inputTokens:0,outputTokens:0,milliseconds:0,unknownUsageRequests:0,apiSpendUSD:0});

export function createPrototypeServer({corpus,generate=generateLocal,model='qwen3-vl:30b-a3b-instruct',usage:givenUsage,ledgerPath}={}) {
  const usage={...initialUsage(),...givenUsage,apiSpendUSD:0};
  let busy=false,runRequests=0;
  const persist=async()=>{if(!ledgerPath)return;await mkdir(dirname(ledgerPath),{recursive:true});await writeFile(ledgerPath+'.tmp',JSON.stringify(usage,null,2)+'\n',{mode:0o600});await rename(ledgerPath+'.tmp',ledgerPath);};
  return createServer(async(req,res)=>{
    const address=req.socket.localPort;
    const origin=`http://127.0.0.1:${address}`;
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
    res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
    res.setHeader('Content-Security-Policy',"default-src 'self'; connect-src 'self'; img-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    if(req.headers.host!==`127.0.0.1:${address}`)return send(403,{error:'This prototype is available only on this Mac.'});
    try {
      const path=new URL(req.url,origin).pathname;
      if(req.method==='GET'&&path==='/api/status') {
        return send(200,{private:true,provider:'Ollama on this Mac',model,cloudEnabled:false,coverage:corpus.coverage,busy,usage:{...usage,cloudEquivalentUSD:projectCost(usage.inputTokens,usage.outputTokens)},pricing:CLOUD_REFERENCE,limits:{maxQuestionChars:1000,maxRequestsPerRun:100,remaining:Math.max(0,100-runRequests)},privacy:'Questions are processed on this Mac. The application stores aggregate token/time counts, not questions or answers. Local server/model logs may contain operational metadata.'});
      }
      if(req.method==='GET'&&path==='/api/challenges')return send(200,{challenges:challenges.map(c=>({...c,sources:c.sources.map(id=>corpus.chunks.find(s=>s.id===id)).filter(Boolean).map(cleanSource)}))});
      if(req.method==='GET'&&staticFiles.has(path)) {
        const [file,mime]=staticFiles.get(path);const bytes=await readFile(join(HERE,file));res.writeHead(200,{'Content-Type':mime});res.end(bytes);return;
      }
      if(req.method!=='POST'||path!=='/api/ask')return send(404,{error:'Page not found.'});
      if(req.headers.origin!==origin)return send(403,{error:'Open the private prototype to ask a question.'});
      if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']??''))return send(415,{error:'Use the question form.'});
      let size=0,parts=[];
      for await(const part of req){size+=part.length;if(size>12000)return send(413,{error:'The request is too large. Keep your question short.'});parts.push(part);}
      let body;try{body=JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{return send(400,{error:'The question format was not readable.'});}
      if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!['question','history','challengeId'].includes(k))||typeof body.question!=='string'||body.question.trim().length<4||body.question.length>1000)return send(400,{error:'Ask a question using 4–1,000 characters.'});
      const question=body.question.trim(),history=body.history??[];
      if(!Array.isArray(history)||history.length>3||history.some(h=>!h||typeof h.question!=='string'||h.question.length>1000||typeof h.answer!=='string'||h.answer.length>1600))return send(400,{error:'Start a new question; the conversation is too long.'});
      const challenge=body.challengeId?challenges.find(c=>c.id===body.challengeId):null;
      if(body.challengeId&&!challenge)return send(400,{error:'Choose an available decision challenge.'});
      if(busy)return send(429,{error:'One answer is already being prepared. Please wait for it to finish.'});
      if(runRequests>=100)return send(429,{error:'This private run has reached its 100-question limit. Restart it for another review session.'});
      if(/\b(reveal|print|show|give|disclose)\b.{0,80}\b(system prompt|api key|internal instruction|hidden instruction)/i.test(question))return send(200,{status:'scope',points:[],sources:[],application:null,followUp:'I can help you explore ideas from the episodes. What topic would you like to ask about?',generated:false});
      if(/\bshould i\b.{0,90}\b(buy|sell|invest|allocate|borrow)\b|\b(how|where|can i)\b.{0,60}\b(invest|subscribe)\b.{0,40}\b(limitless|fund)\b/i.test(question))return send(200,{status:'scope',points:[],sources:[],application:null,followUp:'I can explain what the episodes discuss and help identify questions to research. I cannot recommend a personal investment or provide access to a fund.',generated:false});
      const searchQuestion=challenge?`${question} ${challenge.title} ${challenge.lesson}`:question;
      let selected=retrieve(corpus,searchQuestion,history);
      if(challenge){const exact=challenge.sources.map(id=>corpus.chunks.find(c=>c.id===id)).filter(Boolean);selected=[...exact,...selected.filter(c=>!exact.some(e=>e.id===c.id))].slice(0,5);}
      busy=true;runRequests++;usage.requests++;
      const started=Date.now(),abort=new AbortController();
      res.on('close',()=>{if(!res.writableEnded)abort.abort();});
      let consumed=false;
      try {
        const result=await generate({question,history,sources:selected,corpus,challenge:challenge?{title:challenge.title,scenario:challenge.scenario,lesson:challenge.lesson}:null,model,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(90000)])});
        const u=result.usage??{};
        const tokens={inputTokens:Math.max(0,Number(u.inputTokens)||0),outputTokens:Math.max(0,Number(u.outputTokens)||0)};
        consumed=result.usageComplete!==false;usage.inputTokens+=tokens.inputTokens;usage.outputTokens+=tokens.outputTokens;
        if(result.error){const error=new Error(result.error);error.name=result.errorName||'Error';throw error;}
        const allowed=result.sourceIds?result.sourceIds.map(id=>corpus.chunks.find(c=>c.id===id)).filter(Boolean):selected;
        const answer=validateAnswer(result.draft,allowed);
        usage.completed++;const elapsed=Date.now()-started;usage.milliseconds+=elapsed;
        await persist();
        send(200,{...answer,sources:answer.sources.map(cleanSource),generated:true,model,usage:{...tokens,milliseconds:elapsed,apiSpendUSD:0,cloudEquivalentUSD:projectCost(tokens.inputTokens,tokens.outputTokens)}});
      } catch(error) {
        usage.failed++;if(!consumed)usage.unknownUsageRequests++;await persist().catch(()=>{});
        const message=error.name==='TimeoutError'||error.name==='AbortError'?'The local model took too long or the request was stopped. Your question is still here; try again.':error.message;
        if(!res.destroyed)send(/citation|format|response|Insufficient|answer needs/i.test(message)?422:503,{error:message});
      } finally {busy=false;}
    } catch {if(!res.headersSent)send(500,{error:'The private prototype could not complete this request. Try again.'});}
  });
}

async function start() {
  const port=Number(process.env.ASK_SHOW_PORT??4360);
  if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('Use a local port between1024 and65535.');
  const model=process.env.ASK_SHOW_MODEL??'qwen3-vl:30b-a3b-instruct';
  if(!['qwen3-vl:30b-a3b-instruct','gemma3:4b'].includes(model))throw new Error('This prototype uses only the two existing local models.');
  const evidencePath=process.env.ASK_SHOW_EVIDENCE_PATH??join(homedir(),'Documents/ChatGPT/Approaching Infinity/reports/ask-the-show-2026-11-16/candidate-evidence.json');
  const corpus=await loadCorpus({evidencePath});
  const ledgerPath=resolve('prototype/.local/usage.json');let usage;try{usage=JSON.parse(await readFile(ledgerPath,'utf8'));}catch{}
  const server=createPrototypeServer({corpus,model,usage,ledgerPath});
  server.on('error',error=>{console.error(`Private prototype could not start: ${error.code}`);process.exit(1);});
  server.listen(port,'127.0.0.1',()=>console.log(`Private Ask the Show: http://127.0.0.1:${port}/ — ${corpus.coverage.episodes} episode notes, ${corpus.coverage.transcriptPassages} candidate transcript passages. On-device model: ${model}. No cloud calls.`));
  for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close());
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await start();
