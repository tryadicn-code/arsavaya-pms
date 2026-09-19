import assert from 'node:assert/strict';
import {initial,mutate,today,addDays} from '../lib/pms.ts';
import {runAutomation,ensureAutomation} from '../lib/automation.ts';
import {parseCalendar,mergeCalendar,exportCalendar,externalBlocks,simulateChannels,validateCalendarUrl,pruneCancelledEvents,connectionMutation} from '../lib/channels.ts';
const now=new Date(),t=today();
let s=mutate(initial(),'booking',{unit:'v1',guest:'Test reminder',start:addDays(t,1),end:addDays(t,3),guests:2,channel:'Langsung',total:3000000});
s=runAutomation(s,now);assert.equal(s.automation.notices.length,2);assert.equal(s.tasks.length,1);
assert.ok(!s.tasks[0].title.includes('Test reminder'),'arrival task title must not expose guest name');
assert.ok(s.tasks[0].title.includes('Vila 01'),'arrival task title references the unit');
assert.equal(s.tasks[0].bookingId,s.bookings[0].id,'arrival task keeps booking linkage');
const twice=runAutomation(s,now);assert.equal(twice.automation.notices.length,2);assert.equal(twice.tasks.length,1);
const id=s.bookings[0].id;s=runAutomation(mutate(s,'payment',{id,type:'payment',amount:3000000,method:'Transfer',date:t}),now);
assert.equal(s.automation.notices.find(x=>x.rule==='paymentReminder').status,'resolved');
s=runAutomation(mutate(s,'booking',{...s.bookings[0],unit:'v2'}),now);
assert.equal(s.tasks.find(x=>x.unit==='v1').status,'Dibatalkan');assert.equal(s.tasks.find(x=>x.unit==='v2').status,'Belum dikerjakan');
s=runAutomation(mutate(s,'automation-schedule',{unit:'v3',title:'Servis AC',intervalDays:30,nextDue:addDays(t,-65),assignee:'Tim'}),now);
assert.equal(s.automation.schedules[0].nextDue,addDays(t,25));assert.equal(s.tasks.filter(x=>x.kind==='Maintenance').length,1);
assert.equal(runAutomation(s,now).tasks.filter(x=>x.kind==='Maintenance').length,1);
const paused=initial();ensureAutomation(paused).rules.arrivalPreparation.enabled=false;ensureAutomation(paused).rules.paymentReminder.enabled=false;paused.bookings=structuredClone(s.bookings);assert.equal(runAutomation(paused,now).tasks.length,0);
let channel=simulateChannels(initial(),'v7','create');const source=channel.channels.connections.find(c=>c.ota==='Airbnb');const others=channel.channels.connections.filter(c=>c.id!==source.id);
assert.equal(externalBlocks(channel,'v7').length,1);assert.equal(externalBlocks(channel,'v6').length,0);
for(const c of others){const text=exportCalendar(channel,c.id);assert.ok(text.includes('BEGIN:VEVENT'));assert.ok(!text.includes('Test reminder'));assert.deepEqual(parseCalendar(text),[],'Ignore our exported UIDs to prevent echoes');}
assert.ok(!exportCalendar(channel,source.id).includes('BEGIN:VEVENT'),'Do not echo a source back to itself');
assert.throws(()=>mutate(channel,'booking',{unit:'v7',guest:'Conflict',start:addDays(t,1),end:addDays(t,3),guests:2,channel:'Langsung',total:1}),/diblokir/);
channel=simulateChannels(channel,'v7','move');assert.equal(channel.channels.events.length,1);assert.equal(channel.channels.events[0].start,addDays(t,4));
channel=simulateChannels(channel,'v7','cancel');assert.equal(externalBlocks(channel,'v7').length,0);for(const c of others)assert.ok(!exportCalendar(channel,c.id).includes('BEGIN:VEVENT'));
const raw=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','UID:OTA-123','DTSTART;VALUE=DATE:20261010','DTEND;VALUE=DATE:20261012','SUMMARY:Reserved','END:VEVENT','END:VCALENDAR'].join('\r\n');
const parsed=parseCalendar(raw);assert.equal(parsed[0].start,'2026-10-10');mergeCalendar(channel,source.id,parsed);mergeCalendar(channel,source.id,parsed);assert.equal(channel.channels.events.filter(e=>e.uid==='OTA-123').length,1);
assert.throws(()=>parseCalendar('<html>Error</html>'),/iCal/);assert.throws(()=>parseCalendar(raw.replace('20261010','20260230')),/Tanggal/);assert.throws(()=>parseCalendar(raw.replace('SUMMARY:Reserved','RRULE:FREQ=DAILY')),/berulang/);assert.throws(()=>parseCalendar(raw.replace('END:VCALENDAR','')),/iCal/);
assert.throws(()=>validateCalendarUrl('Airbnb','http://localhost/calendar'),/HTTPS/);assert.throws(()=>validateCalendarUrl('Airbnb','https://airbnb.com.evil.example/calendar'),/HTTPS/);assert.throws(()=>validateCalendarUrl('Agoda','https://www.agoda.com/calendar'),/adapter/);
assert.equal(validateCalendarUrl('Airbnb','https://www.airbnb.com/calendar/ical/test.ics'),'https://www.airbnb.com/calendar/ical/test.ics');
console.log('PASS: automation deduplication, payment resolution, moved preparation, recurring catch-up, paused rules; A-to-B/C/D feeds, source exclusion, no echoes, date changes, cancellation, collision checks, iCal validation and URL restrictions.');
//================ PR-G0-B: channels.events cancelled-event retention (per connection) =========
{
// T3: older cancelled dropped, newer cancelled kept (deterministic distinct timestamps)
{const iso=i=>new Date(1767225600000+i*1000).toISOString();const input=[];
for(let i=0;i<350;i++)input.push({id:'U'+i,connection:'cA',uid:'U'+i,start:'2026-10-01',end:'2026-10-02',summary:'s',status:'cancelled',updated:iso(i)});
const out=pruneCancelledEvents(input);
assert.equal(out.length,300,'T3: 300 retained');
assert.equal(out.some(e=>e.uid==='U0'),false,'T3: oldest dropped');
assert.equal(out.some(e=>e.uid==='U49'),false,'T3: boundary-49 dropped');
assert.equal(out.some(e=>e.uid==='U50'),true,'T3: boundary-50 kept');
assert.equal(out.some(e=>e.uid==='U349'),true,'T3: newest kept');}
// T1+T2: repeated imports cap cancelled at 300/connection while ALL active events survive
{let s=initial();
mergeCalendar(s,'cA',Array.from({length:350},(_,i)=>({uid:'U'+i,start:'2026-10-01',end:'2026-10-02',summary:'s',cancelled:false})));
mergeCalendar(s,'cA',Array.from({length:20},(_,i)=>({uid:'A'+i,start:'2026-10-01',end:'2026-10-02',summary:'s',cancelled:false})));
const evs=s.channels.events;
assert.equal(evs.filter(e=>e.connection==='cA'&&e.status==='cancelled').length,300,'T1: cancelled capped at 300 per connection');
assert.equal(evs.filter(e=>e.status==='active').length,20,'T2: all 20 active events survive alongside 300 cancelled');
assert.equal(evs.filter(e=>e.status==='active').every(e=>e.uid.startsWith('A')),true,'T2: survivors are exactly the imported actives');}
// T6: retention is PER CONNECTION, not a global slice
{let s=initial();const m=uid=>({uid,start:'2026-10-01',end:'2026-10-02',summary:'s',cancelled:false});
mergeCalendar(s,'cA',Array.from({length:350},(_,i)=>m('A'+i)));
mergeCalendar(s,'cB',Array.from({length:350},(_,i)=>m('B'+i)));
mergeCalendar(s,'cA',[m('AX')]);mergeCalendar(s,'cB',[m('BX')]);
const evs=s.channels.events;
assert.equal(evs.filter(e=>e.connection==='cA'&&e.status==='cancelled').length,300,'T6a: conn A capped independently');
assert.equal(evs.filter(e=>e.connection==='cB'&&e.status==='cancelled').length,300,'T6b: conn B capped independently');
assert.equal(evs.filter(e=>e.status==='cancelled').length,600,'T6c: 600 cancelled total => retention is per connection');
assert.equal(evs.filter(e=>e.status==='active').length,2,'T6d: actives AX/BX survive');}
// T4: externalBlocks() output identical before and after pruning
{let s=initial();const unit=s.units[0].id;
connectionMutation(s,'channel-add',{unit,ota:'Airbnb',listing:'L1',mode:'ical',url:'https://www.airbnb.com/calendar/ical/x.ics'});
const conn=s.channels.connections[0];
const three=[['2026-11-01','2026-11-05'],['2026-11-10','2026-11-12'],['2026-12-01','2026-12-03']].map(r=>({uid:'E'+r[0],start:r[0],end:r[1],summary:'s',cancelled:false}));
mergeCalendar(s,conn.id,three);
const before=externalBlocks(s,unit).map(b=>[b.uid,b.start,b.end].join('#')).sort().join('|');
mergeCalendar(s,conn.id,[...three,...Array.from({length:350},(_,i)=>({uid:'F'+i,start:'2026-11-20',end:'2026-11-21',summary:'s',cancelled:false}))]);
mergeCalendar(s,conn.id,three);
const after=externalBlocks(s,unit).map(b=>[b.uid,b.start,b.end].join('#')).sort().join('|');
assert.equal(after,before,'T4: externalBlocks unchanged after pruning');
assert.equal(s.channels.events.filter(e=>e.status==='cancelled').length,300,'T4: pruning actually ran (300 cancelled)');}
// T5: history cap unchanged
{let s=initial();mergeCalendar(s,'cH',[]);for(let i=0;i<400;i++)mergeCalendar(s,'cH',[]);
assert.equal(s.channels.history.length,300,'T5: history cap still 300');}
}
console.log('PASS: PR-G0-B retention - per-connection cap of 300 cancelled, all active events retained, oldest cancelled dropped, externalBlocks stable, history cap unchanged.');