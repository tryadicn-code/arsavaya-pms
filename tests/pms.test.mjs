import assert from 'node:assert/strict';
import {initial,mutate,today,addDays,paid,active,ensureGuests,linkGuest,matchGuest,normPhone,guestLabel,linkGuestTransaction} from '../lib/pms.ts';
import {blocksAvailability,transitionBooking,operatorTransitions,canTransitionBookingStatus,BOOKING_STATUS_HISTORY_LIMIT} from '../lib/booking-status.ts';
import {runAutomation} from '../lib/automation.ts';
import {exportCalendar} from '../lib/channels.ts';
const t=today();const booking={unit:'v1',guest:'Test Guest',start:t,end:addDays(t,2),guests:2,channel:'Langsung',total:3000000};
let s=mutate(initial(),'booking',booking);const id=s.bookings[0].id;
assert.throws(()=>mutate(s,'booking',booking),/sudah dipesan/);
assert.throws(()=>mutate(s,'booking',{...booking,unit:'v2',end:t}),/Check-out/);
assert.throws(()=>mutate(s,'booking',{...booking,unit:'v2',guests:99}),/kapasitas/);
assert.throws(()=>mutate(s,'booking',{...booking,unit:'v2',start:'2026-02-30'}),/Tanggal/);
assert.equal(mutate(s,'booking',{...booking,start:addDays(t,2),end:addDays(t,3)}).bookings.length,2);
s=mutate(s,'payment',{id,type:'payment',amount:1000000,method:'Transfer',date:t});
assert.equal(paid(s,id),1000000);
assert.throws(()=>mutate(s,'payment',{id,type:'refund',amount:1000001,method:'Transfer',date:t}),/Refund/);
s=mutate(s,'payment',{id,type:'deposit',amount:500000,method:'Transfer',date:t});
assert.equal(paid(s,id),1000000);
assert.throws(()=>mutate(s,'payment',{id,type:'deposit-return',amount:500001,method:'Transfer',date:t}),/deposit/);
s=mutate(s,'status',{id,status:'Checked-in'});
s=mutate(s,'status',{id,status:'Checked-out'});
assert.equal(s.units[0].clean,'Perlu dibersihkan');assert.equal(s.tasks.length,1);
assert.throws(()=>mutate(s,'task-status',{id:s.tasks[0].id,status:'Selesai'}),/pemeriksaan/,'housekeeping must pass inspection before completion');
 s=mutate(s,'task-status',{id:s.tasks[0].id,status:'Dikerjakan'});
 s=mutate(s,'task-status',{id:s.tasks[0].id,status:'Menunggu pemeriksaan'});
 assert.equal(s.units[0].clean,'Perlu dibersihkan','waiting for inspection keeps unit not ready');
 s=mutate(s,'task-inspect',{id:s.tasks[0].id,result:'pass'});
 assert.equal(s.tasks[0].status,'Selesai');assert.equal(s.tasks[0].completedAt.length>0,true);assert.equal(s.units[0].clean,'Siap');
const blocked=mutate(initial(),'block',{unit:'v1',start:t,end:addDays(t,3),reason:'Perbaikan'});
assert.throws(()=>mutate(blocked,'booking',booking),/diblokir/);
const held=mutate(initial(),'booking',{...booking,hold:true});held.bookings[0].holdUntil='2000-01-01T00:00:00Z';
assert.equal(mutate(held,'booking',booking).bookings.length,2);
assert.equal(initial().bookings.length,0);assert.ok(initial(true).bookings.length>0);
assert.equal(mutate(s,'unit',{id:'v1',name:'Vila Baru',rate:5000000,capacity:4}).bookings[0].total,3000000);
// ---- PMS-1 guest management ----
const legacy={units:initial().units,bookings:[{id:'OLD-1',unit:'v1',guest:'Legacy Guest',phone:'',start:addDays(t,-4),end:addDays(t,-2),guests:2,channel:'Langsung',status:'Checked-out',total:1000000,note:'',created:addDays(t,-5)}],payments:[],tasks:[],blocks:[],expenses:[],audit:[],settings:initial().settings};
assert.equal(ensureGuests(legacy).length,0,'legacy workspace stays valid without guests');
assert.equal(legacy.bookings[0].guestId,undefined,'legacy booking keeps working without guestId');
let g1=mutate(initial(),'guest',{name:'Made Arya',phone:'081111111',email:'made@arsavaya.com',nationality:'Indonesia',notes:'VIP'});
assert.equal(g1.guests.length,1,'guest created');const gid=g1.guests[0].id;
assert.equal(g1.guests[0].email,'made@arsavaya.com','email stored');assert.equal(g1.guests[0].phone,'081111111','phone stored');
const g1e=mutate(g1,'guest',{id:gid,name:'Made Arya Wijaya',phone:'081111111'});assert.equal(g1e.guests[0].name,'Made Arya Wijaya','guest edited');assert.equal(g1e.guests[0].createdAt,g1.guests[0].createdAt,'createdAt unchanged on edit');
assert.equal(g1e.audit.some(a=>a.action.includes('made@arsavaya.com')||a.action.includes('081111111')),false,'audit must not contain PII');
// edit guest must not change historical booking snapshot
const snap=mutate(g1,'booking',{unit:'v2',guest:'Made Arya',phone:'081111111',start:addDays(t,1),end:addDays(t,3),guests:2,channel:'Langsung',total:2000000});
assert.equal(snap.bookings[0].guest,'Made Arya','booking snapshot name kept');assert.ok(snap.bookings[0].guestId,'booking auto-linked');
const snap2=mutate(snap,'guest',{id:snap.bookings[0].guestId,name:'Renamed Tamu'});
assert.equal(snap2.bookings[0].guest,'Made Arya','edit guest does not rewrite historical snapshot');
// explicit guestId link
const ex=mutate(g1,'booking',{unit:'v1',guest:'Made Arya',guestId:gid,start:addDays(t,1),end:addDays(t,2),guests:2,channel:'Langsung',total:1000000});
assert.equal(ex.bookings[0].guestId,gid,'explicit guestId linked');
// contact exact match -> existing guest
const m1=mutate(initial(),'guest',{name:'Made Arya',phone:'081111111',email:'made@arsavaya.com'});
const m2=mutate(m1,'booking',{unit:'v3',guest:'Made Arya',phone:'081111111',start:addDays(t,5),end:addDays(t,7),guests:2,channel:'Langsung',total:1000000});
assert.equal(m2.guests.length,1,'contact exact match reuses guest');assert.equal(m2.bookings[0].guestId,m1.guests[0].id);
// name only -> new guest, no merge
const n1=mutate(m1,'booking',{unit:'v4',guest:'Made Arya',start:addDays(t,9),end:addDays(t,11),guests:2,channel:'Langsung',total:1000000});
assert.equal(n1.guests.length,2,'name-only booking creates new guest');
// same name, different contact -> NOT merged
const d1=mutate(initial(),'guest',{name:'I Made Arya',phone:'081111111'});
const d2=mutate(d1,'guest',{name:'I Made Arya',phone:'082222222'});
assert.equal(d2.guests.length,2,'same name different contact must not merge');
assert.equal(matchGuest(d2.guests,'I Made Arya','082222222').id,d2.guests[1].id,'phone match picks right guest');assert.equal(matchGuest(d2.guests,'I Made Arya','089999999'),undefined,'different phone = no match');
// normalized matching
assert.equal(normPhone('+62 8123 4567 890'),'081234567890','id phone 62 normalized to 0');assert.equal(normPhone('0811 111'),'0811111','local phone preserved');assert.equal(normPhone('+62 811-11-11'),'628111111','short 62-prefixed number not mangled');
// guestLabel disambiguates duplicate names for datalist selection safety
assert.equal(guestLabel({name:'I Made Arya',phone:'081111111'}),'I Made Arya — 081111111','label includes phone');
assert.equal(guestLabel({name:'I Made Arya',phone:'082222222'}),'I Made Arya — 082222222','label includes phone');
assert.notEqual(guestLabel({name:'I Made Arya',phone:'081111111'}),guestLabel({name:'I Made Arya',phone:'082222222'}),'duplicate names with different contact must render distinct labels');
assert.equal(guestLabel({name:'No Contact'}),'No Contact','guest without contact falls back to name only');
assert.equal(guestLabel({name:'Email Only',email:'a@b.com'}),'Email Only — a@b.com','email used when phone absent');
// matching precedence: explicit guestId > email+name > phone+name
const mp=[{id:'G1',name:'Made',email:'old@example.com',phone:'0812345678',createdAt:'',updatedAt:''}];
assert.equal(matchGuest(mp,'Made','0812345678','new@example.com').id,'G1','phone+name fallback wins even when incoming email does not match');
assert.equal(matchGuest(mp,'Made','0812345678','old@example.com').id,'G1','exact email+name matches');
assert.equal(matchGuest(mp,'Made',undefined,'new@example.com'),undefined,'email mismatch with no phone fallback must not merge');
assert.equal(matchGuest(mp,'Made','99999999','new@example.com'),undefined,'both email and phone differ must not merge');
assert.equal(matchGuest(mp,'Made',undefined,undefined),undefined,'name alone never auto-merges');
const mg=mutate(initial(),'guest',{name:'Made',email:'old@example.com',phone:'0812345678'});
assert.equal(linkGuest(mg,'Lain','0','x@y.com',mg.guests[0].id),mg.guests[0].id,'explicit valid guestId wins over all other signals');
// guestLabel uniqueness: guest.id is the final disambiguator
const gdA={id:'GST-A12F',name:'I Made Arya',phone:'081111111',createdAt:'',updatedAt:''};
const gdB={id:'GST-B34C',name:'I Made Arya',phone:'081111111',createdAt:'',updatedAt:''};
assert.equal(guestLabel(gdA,[gdA,gdB]),'I Made Arya — 081111111 · GST-A12F','duplicate exact-contact guests get id suffix');
assert.equal(guestLabel(gdB,[gdA,gdB]),'I Made Arya — 081111111 · GST-B34C','duplicate exact-contact guests get distinct suffix');
assert.notEqual(guestLabel(gdA,[gdA,gdB]),guestLabel(gdB,[gdA,gdB]),'duplicate exact-contact must render two different labels');
const gnA={id:'GST-C1',name:'I Made Arya',createdAt:'',updatedAt:''};
const gnB={id:'GST-D2',name:'I Made Arya',createdAt:'',updatedAt:''};
assert.notEqual(guestLabel(gnA,[gnA,gnB]),guestLabel(gnB,[gnA,gnB]),'duplicate no-contact guests must render two different labels');
assert.ok(guestLabel(gnA,[gnA,gnB]).includes('GST-C1')&&!guestLabel(gnA,[gnA,gnB]).includes('GST-D2'),'no-contact duplicate carries only its own id');
assert.equal(guestLabel({id:'GST-Z9',name:'I Made Arya',phone:'081111111',createdAt:'',updatedAt:''},[]),'I Made Arya — 081111111','unique guest keeps a clean label without suffix');
// selection resolves 1:1 to the right guestId
const dlist=[gdA,gdB];
assert.equal(dlist.find((g)=>guestLabel(g,dlist)===guestLabel(gdB,dlist)).id,'GST-B34C','selecting the second duplicate label resolves GST-B34C');
assert.equal(dlist.find((g)=>guestLabel(g,dlist)===guestLabel(gdA,dlist)).id,'GST-A12F','selecting the first duplicate label resolves GST-A12F');
// Booking.guest stays a plain name snapshot even when guestId is used
const bg=mutate(initial(),'guest',{name:'I Made Arya',phone:'081111111'});
const bgid=bg.guests[0].id;
const bb=mutate(bg,'booking',{unit:'v1',guest:'I Made Arya',phone:'081111111',start:addDays(t,1),end:addDays(t,3),guests:2,channel:'Langsung',total:1000000,guestId:bgid});
assert.equal(bb.bookings[0].guestId,bgid,'explicit guestId honored');
assert.equal(bb.bookings[0].guest,'I Made Arya','Booking.guest stays plain name');
assert.ok(!bb.bookings[0].guest.includes('GST')&&!bb.bookings[0].guest.includes('·'),'Booking.guest never contains id suffix or separator');
// linkGuestTransaction: atomic, a failed attempt never mutates the guest collection
const ts=[{id:'G1',name:'Made',phone:'0812345678',email:'old@x.com',createdAt:'',updatedAt:''}];
const tstate={units:[],bookings:[],payments:[],tasks:[],blocks:[],expenses:[],audit:[],settings:{name:'',checkin:'',checkout:''},guests:ts};
const origRef=tstate.guests;const origJson=JSON.stringify(ts);
const urand=crypto.randomUUID;let calls=0;
Object.defineProperty(crypto,'randomUUID',{value:()=>{calls+=1;if(calls>=1)throw Error('boom mid-linking')},configurable:true,writable:true});
try{
  const r=linkGuestTransaction(tstate,'New Guest','089');
  assert.equal(r,undefined,'failed linking returns undefined guestId');
  assert.equal(tstate.guests,origRef,'guest collection reference untouched after failed attempt');
  assert.equal(JSON.stringify(tstate.guests),origJson,'guest collection content untouched after failed attempt');
}finally{Object.defineProperty(crypto,'randomUUID',{value:urand,configurable:true,writable:true})}
// success path adopts the linked guest
const newId=linkGuestTransaction(tstate,'Another','088');assert.ok(newId&&newId.startsWith('GST-'),'success returns a GST guestId');assert.equal(tstate.guests[1].id,newId,'adopted guest carries the returned id');
assert.equal(tstate.guests.length,2,'guest adopted into collection on success');
assert.equal(linkGuestTransaction(tstate,'Made','0812345678'),'G1','existing guest matched and adopted on success');


const e1=mutate(initial(),'guest',{name:'Sofia Tan',email:'SOFIA@ARSAVAYA.com'});
const e2=mutate(e1,'booking',{unit:'v1',guest:'sofia tan',email:'sofia@arsavaya.com',start:addDays(t,2),end:addDays(t,4),guests:2,channel:'Langsung',total:1000000});
assert.equal(e2.guests.length,1,'normalized email+name match reuses guest');
// linkGuest defensive on legacy state
const lg=linkGuest(legacy,'New Person','0855000');assert.ok(lg,'linkGuest works on legacy state');

// ---- PMS-2: reservation status foundation ----
function addBooking(s,over){const st=structuredClone(s);const b={id:'P2-'+Math.random().toString(36).slice(2,8).toUpperCase(),unit:'v1',guest:'Status Tamu',phone:'',start:t,end:addDays(t,2),guests:2,channel:'Langsung',status:'Confirmed',total:1000000,note:'',created:new Date().toISOString()};Object.assign(b,over||{});st.bookings.push(b);return st}
function setStatus(s,id,status){return mutate(s,'status',{id,status})}
const pending=addBooking(initial(),{id:'P2-PEND',status:'Pending'});
// Pending -> Confirmed / Cancelled are the only outgoing operator transitions
assert.equal(setStatus(pending,'P2-PEND','Confirmed').bookings[0].status,'Confirmed');
assert.equal(setStatus(pending,'P2-PEND','Cancelled').bookings[0].status,'Cancelled');
assert.throws(()=>setStatus(pending,'P2-PEND','Checked-in'),/tidak diperbolehkan/);
// Pending does not block availability: an overlapping booking on the same unit still succeeds
assert.equal(mutate(pending,'booking',{unit:'v1',guest:'Tamu Lain',start:t,end:addDays(t,2),guests:2,channel:'Langsung',total:500000}).bookings.length,2,'Pending booking does not block its unit');
// Pending is never exported as unavailable to iCal
let conn=mutate(initial(),'channel-add',{unit:'v1',ota:'Airbnb',listing:'P2-ICAL',mode:'api'});
const onlyPending=addBooking(conn,{id:'P2-PEND2',status:'Pending',unit:'v1'});
const ical=exportCalendar(onlyPending,conn.channels.connections[0].id);
assert.ok(ical.includes('BEGIN:VCALENDAR'),'calendar export stays well-formed');
assert.ok(!ical.includes('booking-'),'Pending booking is not exported as iCal busy');
// availability blocking semantics (single domain helper)
assert.equal(blocksAvailability({status:'Pending'}),false);
assert.equal(blocksAvailability({status:'Confirmed'}),true);
assert.equal(blocksAvailability({status:'Checked-in'}),true);
assert.equal(blocksAvailability({status:'Checked-out'}),false);
assert.equal(blocksAvailability({status:'Cancelled'}),false);
assert.equal(blocksAvailability({status:'No-show'}),false);
assert.equal(blocksAvailability({status:'Expired'}),false);
assert.equal(blocksAvailability({status:'Hold',holdUntil:'2020-01-01T00:00:00Z'}),false,'expired Hold does not block');
assert.equal(blocksAvailability({status:'Hold',holdUntil:'2099-01-01T00:00:00Z'}),true,'unexpired Hold blocks');
assert.equal(blocksAvailability({status:'Hold'}),false,'Hold without holdUntil does not block');
// Pending has no automatic expiry
assert.equal(runAutomation(pending).bookings[0].status,'Pending','Pending never auto-expires');
// Confirmed -> Checked-in; duplicate check-in is rejected and changes nothing
const cin=setStatus(addBooking(initial(),{id:'P2-CIN'}),'P2-CIN','Checked-in');
assert.equal(cin.bookings[0].status,'Checked-in');
assert.throws(()=>setStatus(cin,'P2-CIN','Checked-in'),/tidak diperbolehkan/);
assert.equal(cin.bookings[0].status,'Checked-in','duplicate check-in left state untouched');
// Checked-in -> Checked-out creates exactly one housekeeping task
const cout=setStatus(cin,'P2-CIN','Checked-out');
assert.equal(cout.bookings[0].status,'Checked-out');
assert.equal(cout.tasks.filter(x=>x.sourceKey==='checkout:P2-CIN').length,1);
assert.throws(()=>setStatus(cout,'P2-CIN','Checked-out'),/tidak diperbolehkan/);
assert.equal(cout.tasks.filter(x=>x.sourceKey==='checkout:P2-CIN').length,1,'duplicate checkout creates no extra task');
// No-show allowed on/after arrival, rejected before arrival
assert.equal(setStatus(addBooking(initial(),{id:'P2-NS',start:t}),'P2-NS','No-show').bookings[0].status,'No-show');
assert.throws(()=>setStatus(addBooking(initial(),{id:'P2-NSF',start:addDays(t,5)}),'P2-NSF','No-show'),/kedatangan/);
// statusHistory: operator transitions, newest first
const ns=setStatus(addBooking(initial(),{id:'P2-NSH',start:t}),'P2-NSH','No-show');
assert.equal(ns.bookings[0].statusHistory[0].source,'operator');
assert.equal(ns.bookings[0].statusHistory[0].from,'Confirmed');
assert.equal(ns.bookings[0].statusHistory[0].to,'No-show');
// statusHistory: automation Hold -> Expired
const expired=runAutomation(addBooking(initial(),{id:'P2-HOLD',status:'Hold',holdUntil:'2020-01-01T00:00:00Z'}));
assert.equal(expired.bookings[0].status,'Expired');
assert.equal(expired.bookings[0].statusHistory[0].source,'automation');
assert.equal(expired.bookings[0].statusHistory[0].to,'Expired');
// statusHistory capped at 50 entries, newest first
const cap={status:'Hold',start:t};
for(let i=0;i<60;i++){cap.status='Hold';assert.ok(transitionBooking(cap,'Expired','automation'));}
assert.equal(cap.statusHistory.length,BOOKING_STATUS_HISTORY_LIMIT,'history capped at 50');
assert.equal(cap.statusHistory[0].to,'Expired','newest entry first');
assert.equal(cap.statusHistory[cap.statusHistory.length-1].to,'Expired');
// status history never carries guest PII
const pii2=setStatus(addBooking(initial(),{id:'P2-PII',guest:'NamaRahasia'}),'P2-PII','Checked-in');
assert.ok(!JSON.stringify(pii2.bookings[0].statusHistory).includes('NamaRahasia'),'history holds no guest PII');
// legacy booking without statusHistory still transitions and gains history on first transition
const legacyB=addBooking(initial(),{id:'P2-LEG',status:'Confirmed'});
delete legacyB.bookings[0].statusHistory;
assert.ok(!('statusHistory' in legacyB.bookings[0]));
const leg2=setStatus(legacyB,'P2-LEG','Cancelled');
assert.equal(leg2.bookings[0].status,'Cancelled');
assert.equal(leg2.bookings[0].statusHistory.length,1);
// operator actions derive from the same domain table; Expired is automation-only
assert.deepEqual(operatorTransitions('Pending'),['Confirmed','Cancelled']);
assert.deepEqual(operatorTransitions('Confirmed'),['Checked-in','Cancelled','No-show']);
assert.deepEqual(operatorTransitions('Checked-in'),['Checked-out']);
assert.ok(!operatorTransitions('Hold').includes('Expired'),'UI never offers automation-only Expired');
assert.equal(operatorTransitions('Checked-out').length,0);
assert.equal(canTransitionBookingStatus('Bogus','Confirmed'),false);
assert.equal(canTransitionBookingStatus('Confirmed','Bogus'),false);

// occupancy / revenue helpers: Pending and No-show never count as confirmed business
const nsStay=addBooking(initial(),{id:'P2-NS2',start:t,status:'No-show'});
assert.equal(active(nsStay.bookings[0]),false,'No-show is not in-house / does not occupy');
assert.equal(active(addBooking(initial(),{id:'P2-PEND3',status:'Pending'}).bookings[0]),false,'Pending does not occupy');
assert.equal(active(addBooking(initial(),{id:'P2-HOLD2',status:'Hold',holdUntil:'2099-01-01T00:00:00Z'}).bookings[0]),true,'unexpired Hold still occupies');
assert.equal(active(addBooking(initial(),{id:'P2-EXP2',status:'Expired'}).bookings[0]),false,'Expired does not occupy');

console.log('PASS: overlap, adjacent stays, date/capacity validation, payments, refund/deposit limits, checkout housekeeping, maintenance block, hold expiry, demo isolation, historical rates, guest management.');
