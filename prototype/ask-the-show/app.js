import {historyEntry,challengeForQuestion} from './conversation.mjs';
const $=s=>document.querySelector(s);
const question=$('#question'),status=$('#request-status'),conversation=$('#conversation');
let history=[],controller=null,timer=null,turn=0,pendingChallenge=null,challengeData=[];
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
  footer.append(el('span',result.generated?`Generated on this Mac · ${(result.usage.milliseconds/1000).toFixed(1)}s · $0 API charges`:'No model answer generated'));
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
    const r=await fetch('/api/status');if(!r.ok)throw new Error();const d=await r.json();
    $('#metric-requests').textContent=d.usage.requests;
    $('#coverage').textContent=`${d.coverage.episodes} episode and appearance notes, plus ${d.coverage.transcriptPassages} selected transcript passages. Full transcripts are not yet available for the whole archive.`;
    const box=$('#cost-details');box.replaceChildren();
    box.append(el('p',`Model: ${d.model}. Cloud calls disabled.`),el('p',`${d.usage.inputTokens.toLocaleString()} input tokens · ${d.usage.outputTokens.toLocaleString()} output tokens. ${d.usage.completed} completed · ${d.usage.failed} failed.`));
    if(d.usage.unknownUsageRequests)box.append(el('p',`${d.usage.unknownUsageRequests} stopped/unavailable request(s) have no complete token count.`));
    box.append(el('p',`The same recorded token counts at ${d.pricing.model} reference rates would be ${d.usage.unknownUsageRequests?'at least':'approximately'} ${money(d.usage.cloudEquivalentUSD)}. This is an estimate, not a charge or a cloud-model benchmark.`));
    if(d.usage.requests&&!d.usage.unknownUsageRequests)box.append(el('p',`Public pilot sketch: 100 visitors a day using two free AI questions each would mean 6,000 requests in 30 days. At this recorded request mix, token charges would be about ${money(d.usage.cloudEquivalentUSD/d.usage.requests*6000)}, before hosting and other costs. Public allowances and spending caps are not activated in this private prototype.`));
    if(d.usage.unknownUsageRequests)box.append(el('p','A monthly projection is withheld because some requests have incomplete token usage.'));
    box.append(el('p',`Rates checked ${d.pricing.checked}: ${money(d.pricing.inputPerMillion)}/million input and ${money(d.pricing.outputPerMillion)}/million output tokens. Different tokenizers, reasoning and hosting add uncertainty.`));
    const link=el('a','Official model pricing ↗');link.href=d.pricing.url;link.target='_blank';link.rel='noopener noreferrer';box.append(link,el('p','Local hardware, electricity and operator time have not been measured. Usage totals are stored locally; questions and answers are not.'));
  } catch {$('#coverage').textContent='The local server is unavailable. Restart it with npm run ask:show.';}
}
function busy(value) {$('#submit').disabled=value;$('#stop').hidden=!value;question.setAttribute('aria-busy',String(value));}
$('#ask-form').addEventListener('submit',async event=>{
  event.preventDefault();if(controller)return;
  const q=question.value.trim();if(q.length<4){status.textContent='Add a little more detail to your question.';return;}
  controller=new AbortController();busy(true);const start=Date.now();status.textContent='Finding episode evidence and preparing an answer…';
  timer=setInterval(()=>{status.textContent=`Finding evidence and preparing an answer… ${Math.floor((Date.now()-start)/1000)}s`;},1000);
  try {
    const challengeId=challengeForQuestion(q,pendingChallenge);
    const response=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q,history:history.slice(-3),...(challengeId?{challengeId}:{})}),signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error??'The answer could not be prepared.');
    renderAnswer(q,result);
    if(result.status==='answered')history.push(historyEntry(q,result));
    pendingChallenge=null;question.value='';status.textContent=result.status==='answered'?'Answer ready. Open a numbered source to check the evidence.':'Try a more specific question or explore an episode source.';
  } catch(error){status.textContent=error.name==='AbortError'?'Stopped. Your question is still here.':error.message;}
  finally{clearInterval(timer);timer=null;controller=null;busy(false);await refreshStatus();}
});
$('#stop').addEventListener('click',()=>controller?.abort());
$('#clear').addEventListener('click',()=>{if(controller)controller.abort();history=[];pendingChallenge=null;conversation.replaceChildren();$('#empty-state').hidden=false;$('#clear').hidden=true;status.textContent='';question.value='';question.focus();});
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
async function loadChallenges(){try{const r=await fetch('/api/challenges');if(!r.ok)throw new Error();const data=await r.json();challengeData=data.challenges;
  for(const [i,c] of challengeData.entries()){const b=el('button',['Look behind results','Make the goal clear','Carry a lesson forward'][i]);b.type='button';b.dataset.id=c.id;b.addEventListener('click',()=>showChallenge(c));$('#challenge-picker').append(b);}if(challengeData[0])showChallenge(challengeData[0]);
}catch{$('#challenge-content').textContent='Decision challenges could not load. Check the local server and try again.';}}
await Promise.all([refreshStatus(),loadChallenges()]);
