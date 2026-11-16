export async function requestSession(api,token,fetchImpl=fetch){
 const response=await fetchImpl(api+'/session',{headers:{'Content-Type':'application/json','X-Ask-Visitor':token||''}});
 if(!response.ok)throw new Error('Session unavailable');
 return response.json();
}
