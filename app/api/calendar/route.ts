import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../../lib/storage';
import {exportCalendar} from '../../../lib/channels';
export const dynamic='force-dynamic';
export async function GET(req:Request){const user=await getChatGPTUser();if(!user)return new Response('Unauthorized',{status:401});const url=new URL(req.url);const key=(url.searchParams.get('demo')==='1'?'demo:':'live:')+user.userId;try{const row=await db().prepare('SELECT data FROM pms_workspace WHERE id=?').bind(key).first<{data:string}>();if(!row)return new Response('Not found',{status:404});return new Response(exportCalendar(JSON.parse(row.data),url.searchParams.get('connection')||''),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="vila-calendar.ics"','Cache-Control':'no-store'}})}catch{return new Response('Calendar unavailable',{status:400})}}
