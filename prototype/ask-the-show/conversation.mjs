export function historyEntry(question,result) {
  return {question,answer:[...(result.points??[]).map(p=>p.text),result.application?`Our application: ${result.application}`:'',result.followUp?`Follow-up: ${result.followUp}`:''].filter(Boolean).join(' ').slice(0,1500)};
}
export function challengeForQuestion(question,pending) {
  return pending&&question.trim()===pending.question.trim()?pending.id:null;
}
