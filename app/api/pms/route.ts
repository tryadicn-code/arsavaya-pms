import {getChatGPTUser} from '../../chatgpt-auth';
import {db} from '../../../lib/storage';
import {initial,mutate} from '../../../lib/pms';
import {ensureAutomation,runAutomation} from '../../../lib/automation';
import {ensureChannels,fetchCalendar,mergeCalendar,tokenHash} from '../../../lib/channels';
import type {ParsedEvent} from '../../../lib/channels';
export const dynamic='force-dynamic';
const response=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
async function identity(req:Request){const user=await getChatGPTUser();if(!user)return null;return (new URL(req.url).searchParams.get('demo')==='1'?'demo:':'live:')+user.userId;}
export async function GET(req:Request){
 try{const key=await identity(req);if(!key)return response({error:'Silakan masuk untuk membuka data vila.'},401);
 const d=db();await d.prepare('INSERT OR IGNORE INTO pms_workspace (id,version,data) VALUES (?,0,?)').bind(key,JSON.stringify(initial(key.startsWith('demo:')))).run();
 const row=await d.prepare('SELECT version,data FROM pms_workspace WHERE id=?').bind(key).first<{version:number;data:string}>();
 const state=JSON.parse(row!.data);ensureAutomation(state);ensureChannels(state);return response({version:row!.version,state});
 }catch(e){console.error(e);return response({error:'Data belum dapat dimuat. Coba kembali.'},503);}
}
export async function POST(req:Request){
 try{const key=await identity(req);if(!key)return response({error:'Silakan masuk terlebih dahulu.'},401);
 if(req.headers.get('sec-fetch-site')==='cross-site')return response({error:'Permintaan ditolak.'},403);
 const raw=await req.text();if(raw.length>15000)return response({error:'Permintaan terlalu besar.'},413);
 const {action,payload,version}=JSON.parse(raw);if(action==='channel-demo'&&!key.startsWith('demo:'))return response({error:'Simulasi hanya tersedia dalam mode data contoh.'},403);const d=db();
 const pulls:{id:string;url:string;events?:ParsedEvent[];error?:string}[]=[];
 if(action==='channel-sync'||action==='automation-run'){
  const first=await d.prepare('SELECT data FROM pms_workspace WHERE id=?').bind(key).first<{data:string}>();
  if(first){const state=JSON.parse(first.data),channels=ensureChannels(state);
   const requested=action==='channel-sync'&&payload?.id;
   if(requested&&!channels.connections.some(c=>c.id===requested&&c.enabled&&c.mode==='ical'))return response({error:'Listing ini belum memiliki koneksi iCal aktif.'},400);
   const due=channels.connections.filter(c=>c.enabled&&c.mode==='ical'&&(!requested||c.id===requested)&&(requested||!c.lastAttempt||Date.now()-Date.parse(c.lastAttempt)>=300000)).sort((a,b)=>(a.lastAttempt||'').localeCompare(b.lastAttempt||'')).slice(0,4);
   await Promise.all(due.map(async c=>{try{pulls.push({id:c.id,url:c.url,events:await fetchCalendar(c)})}catch{pulls.push({id:c.id,url:c.url,error:'Kalender tidak dapat diambil atau formatnya tidak didukung. Periksa URL ekspor. Blok tanggal sebelumnya tetap dipertahankan.'})}}));
  }
 }
 const automated=action==='automation-run'||action==='channel-sync';
 for(let attempt=0;attempt<3;attempt++){
  const row=await d.prepare('SELECT version,data FROM pms_workspace WHERE id=?').bind(key).first<{version:number;data:string}>();
  if(!row||(!automated&&row.version!==version))return response({error:'Data berubah di sesi lain. Muat ulang sebelum menyimpan.'},409);
  let next;try{next=runAutomation(automated?JSON.parse(row.data):mutate(JSON.parse(row.data),action,payload));}catch(e){return response({error:(e as Error).message},400)}
  const channels=ensureChannels(next);for(const pull of pulls){const conn=channels.connections.find(c=>c.id===pull.id&&c.url===pull.url&&c.enabled);if(!conn)continue;if(pull.events){mergeCalendar(next,conn.id,pull.events)}else{conn.lastAttempt=new Date().toISOString();conn.error=pull.error!;channels.history.unshift({id:crypto.randomUUID(),connection:conn.id,time:conn.lastAttempt,message:pull.error!,ok:false});channels.history=channels.history.slice(0,300);}}
  const update=d.prepare('UPDATE pms_workspace SET data=?,version=version+1 WHERE id=? AND version=?').bind(JSON.stringify(next),key,row.version);
  let changed=false;
  if(action==='channel-add'){
   const conn=channels.connections.at(-1)!;const hash=await tokenHash(conn.token);
   const registry=d.prepare("INSERT OR IGNORE INTO pms_feed_keys (hash,workspace,connection) SELECT ?,id,? FROM pms_workspace WHERE id=? AND version=? AND EXISTS (SELECT 1 FROM json_each(json_extract(data,'$.channels.connections')) c WHERE json_extract(c.value,'$.token')=?)").bind(hash,conn.id,key,row.version+1,conn.token);
   const result=await d.batch([update,registry]);changed=!!result[0].meta.changes;
  }else{const result=await update.run();changed=!!result.meta.changes;}
  if(changed)return response({state:next,version:row.version+1});
  if(!automated)break;
 }
 return response({error:'Data berubah di sesi lain. Muat ulang sebelum menyimpan.'},409);
 }catch(e){console.error(e);return response({error:'Penyimpanan gagal. Data formulir tetap tersedia; muat ulang data sebelum mencoba kembali.'},503);}
}

