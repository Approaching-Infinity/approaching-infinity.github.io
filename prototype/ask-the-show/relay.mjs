// Server-only private Relay client. No provider key, direct endpoint, retries or fallback.
import {constants} from 'node:fs';
import {mkdir,open,readFile,rename} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {generateGrounded} from './model.mjs';

const MODEL='gpt-4o-mini';
const RETURNED_MODELS=new Set([MODEL,'gpt-4o-mini-2024-07-18']);
const hash=value=>createHash('sha256').update(value).digest('hex');
const identifier=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(value);
const privateError=message=>new Error(`Relay: ${message}`);

async function syncDirectory(path){const d=await open(path,constants.O_RDONLY|constants.O_DIRECTORY);try{await d.sync();}finally{await d.close();}}

export async function readProtectedToken(path){
 let file;
 try{
  file=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
  const s=await file.stat();
  if(!s.isFile()||s.nlink!==1||![process.getuid(),0].includes(s.uid)||(s.mode&0o177)!==0||s.size>128)throw new Error();
  const token=(await file.readFile('utf8')).trim();
  if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error();
  return token;
 }catch{throw privateError('the dedicated app credential is unavailable.');}
 finally{await file?.close();}
}

export class FileAttemptJournal{
 constructor(directory){this.directory=resolve(directory);}
 async claim({operationId,requestId,fingerprint,feature}){
  const path=join(this.directory,hash(requestId)+'.json');
  await mkdir(this.directory,{recursive:true,mode:0o700});
  let file;
  try{file=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);}
  catch(error){
   if(error.code!=='EEXIST')throw privateError('the attempt journal is unavailable; no request was sent.');
   let prior;try{prior=JSON.parse(await readFile(path,'utf8'));}catch{throw privateError('a prior request is uncertain; no request was sent.');}
   if(prior.fingerprint!==fingerprint)throw privateError('request identity conflict; no request was sent.');
   throw privateError('this request was already attempted; its result is unavailable or uncertain. It will not be sent again.');
  }
  const record={operationId,requestId,fingerprint,feature,status:'attempted',at:new Date().toISOString()};
  try{await file.writeFile(JSON.stringify(record)+'\n');await file.sync();await syncDirectory(this.directory);}
  catch{throw privateError('the attempt journal could not be saved; no request was sent.');}
  finally{await file.close();}
  return {path,record};
 }
 async finish(attempt,status){
  const temp=attempt.path+'.'+randomUUID()+'.tmp';
  const file=await open(temp,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
  try{await file.writeFile(JSON.stringify({...attempt.record,status,finishedAt:new Date().toISOString()})+'\n');await file.sync();}finally{await file.close();}
  await rename(temp,attempt.path);await syncDirectory(dirname(attempt.path));
 }
}

async function boundedJSON(response){
 const reader=response.body?.getReader();if(!reader)throw privateError('the response was unavailable.');
 let size=0;const parts=[];
 try{
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){await reader.cancel();throw privateError('the response exceeded its bound.');}parts.push(value);}
 }finally{reader.releaseLock();}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}catch{throw privateError('the response format was invalid.');}
}

export function createRelayGenerator({journal,readToken,fetchImpl=fetch,baseURL='http://127.0.0.1:8768',model=MODEL}={}){
 if(baseURL!=='http://127.0.0.1:8768')throw privateError('only the fixed private Relay address is allowed.');
 if(model!==MODEL)throw privateError('the model is not approved for this integration.');
 if(typeof readToken!=='function'||typeof journal?.claim!=='function'||typeof journal?.finish!=='function')throw privateError('a protected credential reader and durable journal are required.');
 return async function generate({operationId,signal,...args}){
  if(!identifier(operationId)||operationId.length>85)throw privateError('a stable operation identity is required.');
  let round=0;
  return generateGrounded({...args,callJSON:async({messages,schema,maxTokens})=>{
   const feature=round++===0&&!args.challenge&&args.corpus?.episodes?.length?'episode_selection':'archive_answer';
   const requestId=operationId+(feature==='episode_selection'?'-selection':'-answer');
   const payload={model,stream:false,temperature:0,max_tokens:maxTokens,
    messages:[...messages,{role:'system',content:'Wrap the required JSON object in a single result property, as required by the response schema.'}],
    response_format:{type:'json_schema',json_schema:{name:'ask_show_response',strict:true,schema:{type:'object',required:['result'],additionalProperties:false,properties:{result:schema}}}}};
   // Match Relay's ASCII canonical byte bound, including non-ASCII user input.
   const body=JSON.stringify(payload).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
   if(Buffer.byteLength(body)>60000||maxTokens>1024)throw privateError('the request exceeds its approved bounds.');
   const token=await readToken();
   if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))throw privateError('the dedicated app credential is unavailable.');
   const attempt=await journal.claim({operationId,requestId,feature,fingerprint:hash(body)});
   const started=Date.now();let result;
   try{
    const response=await fetchImpl(baseURL+'/v3/native/openai/v1/chat/completions',{
     method:'POST',redirect:'error',signal:AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(90000)]),
     headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Relay-Feature':feature,'X-Relay-Request-Id':requestId,'X-Relay-Operation-Id':operationId},body
    });
    if(response.status!==200){await response.body?.cancel();throw privateError(response.status===202?'the request is pending; it will not be retried.':response.status===429?'the shared budget or rate limit stopped this request.':'the request was refused or unavailable; it will not be retried.');}
    const data=await boundedJSON(response);
    const u=data.usage;
    if(!u||!Number.isSafeInteger(u.prompt_tokens)||!Number.isSafeInteger(u.completion_tokens)||u.prompt_tokens<1||u.completion_tokens<0||!RETURNED_MODELS.has(data.model))throw privateError('model or usage validation failed; accounting remains uncertain.');
    const usage={inputTokens:u.prompt_tokens,outputTokens:u.completion_tokens,modelMilliseconds:Date.now()-started};
    if(data.choices?.length!==1||data.choices[0].finish_reason!=='stop')result={usage,error:'Relay: the answer was incomplete. No automatic retry was made.'};
    else{
     try{const parsed=JSON.parse(data.choices[0].message.content);if(!parsed||Object.keys(parsed).length!==1||!parsed.result||typeof parsed.result!=='object')throw new Error();result={usage,value:parsed.result};}
     catch{result={usage,error:'Relay: the answer format was invalid. No automatic retry was made.'};}
    }
    await journal.finish(attempt,'completed');
    return result;
   }catch(error){
    await journal.finish(attempt,'uncertain').catch(()=>{});
    if(error.name==='AbortError'||error.name==='TimeoutError')throw privateError('the request stopped or timed out; it will not be retried automatically.');
    if(error.message?.startsWith('Relay:'))throw error;
    throw privateError('the connection was interrupted; no retry or provider fallback was made.');
   }
  }});
 };
}
