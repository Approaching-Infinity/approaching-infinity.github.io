import evidence from '../../data/ask-show-evidence.json';
import {loadCorpus} from '../../../prototype/ask-the-show/corpus.mjs';
import {challenges} from '../../../prototype/ask-the-show/challenges.mjs';
const keys=['id','episodeId','title','number','date','guest','credit','url','text','type','timestamp','timestampVerified','speaker','clock'];
export async function GET(){
 const corpus=await loadCorpus({evidence});
 return new Response(JSON.stringify({challenges:challenges.map(c=>({...c,sources:c.sources.map(id=>corpus.chunks.find(s=>s.id===id)).filter(Boolean).map(s=>Object.fromEntries(keys.filter(k=>s[k]!==undefined).map(k=>[k,s[k]])))}))}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
}
