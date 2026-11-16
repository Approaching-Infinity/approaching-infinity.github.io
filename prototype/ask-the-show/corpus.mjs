import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const publicBase = 'https://approaching-infinity.github.io/episodes/';
export async function loadCorpus({episodeDir='src/content/episodes',evidencePath}={}) {
  const episodes=[],chunks=[];
  for(const file of (await readdir(episodeDir)).filter(f=>f.endsWith('.md')).sort()) {
    const raw=await readFile(join(episodeDir,file),'utf8');
    const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    if(!match) continue;
    const field=key=>{const value=match[1].match(new RegExp(`^${key}:\\s*(.+)$`,'m'))?.[1];try{return JSON.parse(value);}catch{return value;}};
    const episodeId=file.slice(0,-3),appearance=field('guestAppearance');
    const episode={episodeId,title:field('title'),number:Number(field('episodeNumber')),date:field('pubDate'),guest:field('guest')||'',url:publicBase+episodeId+'/',credit:appearance?`Justin featured on ${appearance.show} · hosted by ${appearance.host}`:'Approaching Infinity conversation',sha256:createHash('sha256').update(raw).digest('hex')};
    episodes.push(episode);
    const body=match[2].split(/\n(?:\*\*)?(?:Support and Connect|Follow Approaching Infinity|Watch and listen|Hosted by Justin|Disclaimer)/i)[0];
    let n=0;
    for(const paragraph of body.trim().split(/\n\s*\n/).filter(p=>p.trim().length>45)) {
      chunks.push({...episode,id:`${episodeId}:notes:${++n}`,type:'notes',text:paragraph.trim().slice(0,2400),timestamp:null,timestampVerified:false});
    }
  }
  if(evidencePath) {
    const evidence=JSON.parse(await readFile(evidencePath,'utf8'));
    for(const passage of evidence.excerpts??[]) {
      const episode=episodes.find(e=>e.episodeId===passage.episodeId);
      if(!episode||typeof passage.text!=='string'||!passage.id) continue;
      chunks.push({...episode,id:passage.id,type:'transcript-candidate',text:passage.text.slice(0,2400),speaker:passage.speaker,clock:passage.clock,timestamp:passage.timestamp,timestampVerified:false});
    }
  }
  return {episodes,chunks,coverage:{episodes:episodes.length,notePassages:chunks.filter(c=>c.type==='notes').length,transcriptPassages:chunks.filter(c=>c.type==='transcript-candidate').length,transcriptEpisodes:new Set(chunks.filter(c=>c.type==='transcript-candidate').map(c=>c.episodeId)).size,fullTranscriptsAudioVerified:0}};
}
