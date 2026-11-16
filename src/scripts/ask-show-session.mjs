export async function requestSession(api,token,fetchImpl=fetch){
 const response=await fetchImpl(api+'/session',{headers:token?{'X-Ask-Visitor':token}:{},signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new Error('Session unavailable');
 return response.json();
}
