import {getApplicationContext} from '../../../lib/auth';
import {demoWorkspaceId} from '../../../lib/auth/workspace';
import {db} from '../../../lib/storage';
import {exportCalendar} from '../../../lib/channels';
export const dynamic='force-dynamic';
export async function GET(req:Request){
 const ctx=await getApplicationContext();
 if(!ctx)return new Response('Unauthorized',{status:401});
 const url=new URL(req.url);
 const demo=url.searchParams.get('demo')==='1';
 let key:string;
 if(demo){const k=demoWorkspaceId(ctx.environment,ctx.user);if(k===null)return new Response('Demo mode is disabled in production',{status:403});key=k;}
 else key=ctx.workspaceId;try{const row=await db().prepare('SELECT data FROM pms_workspace WHERE id=?').bind(key).first<{data:string}>();if(!row)return new Response('Not found',{status:404});return new Response(exportCalendar(JSON.parse(row.data),url.searchParams.get('connection')||''),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="vila-calendar.ics"','Cache-Control':'no-store'}})}catch{return new Response('Calendar unavailable',{status:400})}}
