import assert from 'node:assert/strict';
import {initial,mutate,today,addDays,paid,ensureGuests,linkGuest,matchGuest,normPhone,guestLabel,linkGuestTransaction} from '../lib/pms.ts';
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
s=mutate(s,'task-status',{id:s.tasks[0].id,status:'Selesai'});assert.equal(s.units[0].clean,'Siap');
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
console.log('PASS: overlap, adjacent stays, date/capacity validation, payments, refund/deposit limits, checkout housekeeping, maintenance block, hold expiry, demo isolation, historical rates, guest management.');
