import {historyEntry,challengeForQuestion} from '../../prototype/ask-the-show/conversation.mjs';
import {requestSession} from './ask-show-session.mjs';
const $=s=>document.querySelector(s);
const question=$('#question'),status=$('#request-status'),conversation=$('#conversation');
let history=[],controller=null,timer=null,turn=0,pendingChallenge=null,challengeData=[],visitorToken='',remaining=0,available=false,lastAttempt=null;
const api=document.querySelector('[data-api-url]').dataset.apiUrl;
const headers=()=>({'Content-Type':'application/json','X-Ask-Visitor':visitorToken});
try{visitorToken=localStorage.getItem('ask-show-visitor')||'';}catch{}
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;};
const money=n=>Number(n).toLocaleString('en-US',{style:'currency',currency:'USD',minimumFractionDigits:n&&n<.01?5:2,maximumFractionDigits:5});
function mode(name) {
  $('#ask-panel').hidden=name!=='ask';$('#challenge-panel').hidden=name!=='challenge';
  for(const [id,active] of [['ask-tab',name==='ask'],['challenge-tab',name==='challenge']]) {$('#'+id).classList.toggle('active',active);$('#'+id).setAttribute('aria-pressed',String(active));}
}
$('#ask-tab').addEventListener('click',()=>mode('ask'));
$('#challenge-tab').addEventListener('click',()=>mode('challenge'));
function sourceList(sources,prefix) {
  const list=el('div',undefined,'source-list');
  sources.forEach((s,i)=>{
    const detail=el('details',undefined,'source');detail.id=`${prefix}-source-${i+1}`;
    const label=(s.number?`E${s.number}`:'Feature')+' · '+s.title.replace(/^Approaching Infinity(?: S1E\d+)?:?\s*/i,'');
    detail.append(el('summary',`${i+1}. ${label}`));
    const type=s.type==='notes'?'Published episode notes':'Candidate transcript excerpt';
    detail.append(el('p',`${type} · ${s.date}${s.timestamp?` · ${s.clock?.includes('CLIP')?'Clip clock':'Transcript clock'} ${s.timestamp}, not audio-aligned`:''}`,'source-meta'));
    if(s.credit?.startsWith('Justin featured'))detail.append(el('p',s.credit,'source-meta'));
    detail.append(el('p',s.text,'excerpt'));
    const link=el('a','Open the original episode ↗');link.href=s.url;link.target='_blank';link.rel='noopener noreferrer';detail.append(link);list.append(detail);
  });
  return list;
}
function renderAnswer(q,result) {
  turn++;const prefix=`turn-${turn}`,wrapper=el('article');
  const qLine=el('p',undefined,'conversation-question');qLine.append(el('strong','You asked: '),document.createTextNode(q));wrapper.append(qLine);
  const answer=el('div',undefined,'answer');answer.append(el('h2',result.status==='answered'?'From the conversations':result.status==='scope'?'Keep it educational':'A gap in the evidence'));
  for(const p of result.points??[]) {
    const paragraph=el('p',p.text,'answer-point');
    for(const id of p.sourceIds) {
      const i=result.sources.findIndex(s=>s.id===id);if(i<0)continue;
      const cite=el('a',`[${i+1}]`,'citation');cite.href=`#${prefix}-source-${i+1}`;cite.setAttribute('aria-label',`Read source ${i+1}: ${result.sources[i].title}`);
      cite.addEventListener('click',()=>{const d=$(`#${prefix}-source-${i+1}`);if(d)d.open=true;});paragraph.append(cite);
    }
    answer.append(paragraph);
  }
  if(result.application){const box=el('div',undefined,'application');box.append(el('h3','A next step to try · Our application'),el('p',result.application));answer.append(box);}
  if(result.followUp)answer.append(el('p',result.followUp,'follow-up'));
  if(result.sources?.length)answer.append(sourceList(result.sources,prefix));
  const footer=el('div',undefined,'answer-footer');
  footer.append(el('span',result.generated?`AI-generated · ${(result.usage.milliseconds/1000).toFixed(1)}s · Check the sources`:'No model answer generated'));
  const copy=el('button','Copy answer & sources','quiet');copy.type='button';
  copy.addEventListener('click',async()=>{
    const text=[q,...(result.points??[]).map(p=>p.text),result.application?`Our application: ${result.application}`:null,result.followUp,...(result.sources??[]).map(s=>`${s.title}\n${s.type==='notes'?'Published notes':'Transcript candidate; not audio-verified'}\n${s.url}`)].filter(Boolean).join('\n\n');
    try{await navigator.clipboard.writeText(text);copy.textContent='Copied';}catch{copy.textContent='Select the answer text to copy';}
  });footer.append(copy);answer.append(footer);wrapper.append(answer);conversation.append(wrapper);
  $('#empty-state').hidden=true;$('#clear').hidden=false;
  if(result.usage)$('#metric-latency').textContent=(result.usage.milliseconds/1000).toFixed(1)+'s';
  answer.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
}
async function refreshStatus() {
  try {
    const d=await requestSession(api,visitorToken);
    if(d.visitorToken){visitorToken=d.visitorToken;try{localStorage.setItem('ask-show-visitor',visitorToken);}catch{}}
    remaining=d.remaining;available=d.available;
    $('#metric-remaining').textContent=remaining;
    $('#metric-requests').textContent=d.dailyLimit;
    $('#coverage').textContent=`${d.coverage.episodes} episode and appearance notes, plus ${d.coverage.transcriptPassages} selected transcript passages. Full transcripts are not yet available for the whole archive.`;
    $('#allowance-note').textContent=!available?'AI answers are paused while shared pilot capacity is unavailable. Try the free decision challenges.':remaining===0?`Your daily questions are used. Reset: ${new Date(d.resetAt).toLocaleString()}. Decision challenges are still available.`:'Three questions daily on this browser. No signup needed. Shared pilot capacity is limited.';
    $('#submit').disabled=!!controller||!remaining||!available;
  } catch {available=false;$('#submit').disabled=true;$('#coverage').textContent='The AI service is temporarily unavailable. You can still explore the decision challenges and original episodes.';$('#allowance-note').textContent='AI questions are temporarily unavailable. No question was sent automatically.';}
}
function busy(value) {$('#submit').disabled=value||!remaining||!available;$('#stop').hidden=!value;question.setAttribute('aria-busy',String(value));}
$('#ask-form').addEventListener('submit',async event=>{
  event.preventDefault();if(controller||!remaining||!available)return;
  const q=question.value.trim();if(q.length<4){status.textContent='Add a little more detail to your question.';return;}
  controller=new AbortController();busy(true);const start=Date.now();status.textContent='Finding episode evidence and preparing an answer…';
  timer=setInterval(()=>{status.textContent=`Finding evidence and preparing an answer… ${Math.floor((Date.now()-start)/1000)}s`;},1000);
  try {
    const challengeId=challengeForQuestion(q,pendingChallenge);
    const context=JSON.stringify({question:q,history:history.slice(-3),...(challengeId?{challengeId}:{})});
    if(!lastAttempt||lastAttempt.context!==context)lastAttempt={context,requestId:crypto.randomUUID()};
    const response=await fetch(api+'/ask',{method:'POST',headers:headers(),body:JSON.stringify({...JSON.parse(context),requestId:lastAttempt.requestId}),signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'The answer could not be prepared.');
    renderAnswer(q,result);
    if(result.status==='answered')history.push(historyEntry(q,result));
    pendingChallenge=null;lastAttempt=null;question.value='';status.textContent=result.status==='answered'?'Answer ready. Open a numbered source to check the evidence.':'Try a more specific question or explore an episode source.';
  } catch(error){status.textContent=error.name==='AbortError'?'Stopped. Your question is still here. This attempt may count toward your daily allowance.':error.message;$('#clear').hidden=false;}
  finally{clearInterval(timer);timer=null;controller=null;busy(false);await refreshStatus();}
});
$('#stop').addEventListener('click',()=>controller?.abort());
$('#clear').addEventListener('click',()=>{if(controller)controller.abort();history=[];pendingChallenge=null;lastAttempt=null;conversation.replaceChildren();$('#empty-state').hidden=false;$('#clear').hidden=true;status.textContent='';question.value='';question.focus();});
question.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter')$('#ask-form').requestSubmit();});
for(const b of document.querySelectorAll('[data-question]'))b.addEventListener('click',()=>{mode('ask');pendingChallenge=null;question.value=b.dataset.question;question.focus();});

function showChallenge(c) {
  for(const button of $('#challenge-picker').children){const selected=button.dataset.id===c.id;button.classList.toggle('selected',selected);button.setAttribute('aria-pressed',String(selected));}
  const card=el('article',undefined,'challenge-case');card.append(el('p',`${c.theme} · ${c.time} · Fictional situation`,'case-meta'),el('h3',c.title),el('p',c.scenario,'scenario'),el('p',c.question,'challenge-question'));
  const choices=el('div',undefined,'choices'),feedback=el('div',undefined,'feedback');feedback.hidden=true;feedback.setAttribute('role','status');
  for(const choice of c.choices){const b=el('button',choice.text,'choice');b.type='button';b.setAttribute('aria-pressed','false');b.addEventListener('click',()=>{
    for(const other of choices.children){other.classList.toggle('chosen',other===b);other.setAttribute('aria-pressed',String(other===b));}
    feedback.hidden=false;feedback.replaceChildren(el('h4',choice.id===c.preferred?'A useful question to ask':'Another angle to consider'),el('p',choice.feedback));
    feedback.append(el('p',c.lesson));
    if(c.sources.length)feedback.append(sourceList(c.sources,`challenge-${c.id}`));
    const ask=el('button','Explore this with Ask the Show ↗','challenge-ask');ask.type='button';ask.addEventListener('click',()=>{question.value=`In the "${c.title}" challenge, I chose "${choice.text}". Help me understand what I might be missing.`;pendingChallenge={id:c.id,question:question.value};mode('ask');question.focus();});feedback.append(ask);
  });choices.append(b);}
  card.append(choices,feedback);$('#challenge-content').replaceChildren(card);
}
async function loadChallenges(){try{const r=await fetch('/ask-the-show/challenges.json');if(!r.ok)throw new Error();const data=await r.json();challengeData=data.challenges;
  for(const [i,c] of challengeData.entries()){const b=el('button',['Look behind results','Make the goal clear','Carry a lesson forward'][i]);b.type='button';b.dataset.id=c.id;b.addEventListener('click',()=>showChallenge(c));$('#challenge-picker').append(b);}if(challengeData[0])showChallenge(challengeData[0]);
}catch{$('#challenge-content').textContent='Decision challenges could not load. Refresh the page to try again.';}}
if(location.hash==='#challenge-panel')mode('challenge');
await Promise.all([refreshStatus(),loadChallenges()]);
