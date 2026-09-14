import {db} from '../../../../lib/storage';
import {exportCalendar,ensureChannels,tokenHash} from '../../../../lib/channels';
export const dynamic='force-dynamic';
// Bearer link exports availability only. Private Sites' outer access gate still
// applies: external OTA access must be enabled and verified before activation.
export async function GET(_req:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;if(!/^[a-f0-9]{64}$/.test(token))return new Response('Not found',{status:404});
 try{const d=db(),hash=await tokenHash(token);const key=await d.prepare('SELECT workspace,connection FROM pms_feed_keys WHERE hash=?').bind(hash).first<{workspace:string;connection:string}>();if(!key)return new Response('Not found',{status:404});const row=await d.prepare('SELECT data FROM pms_workspace WHERE id=?').bind(key.workspace).first<{data:string}>();if(!row)return new Response('Not found',{status:404});const state=JSON.parse(row.data);const c=ensureChannels(state).connections.find(c=>c.id===key.connection&&c.enabled);if(!c)return new Response('Feed paused',{status:410});return new Response(exportCalendar(state,c.id),{headers:{'Content-Type':'text/calendar; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'}});}catch{return new Response('Calendar temporarily unavailable',{status:503})}
}
