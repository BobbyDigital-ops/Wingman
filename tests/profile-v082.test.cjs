/* Wingman v0.8.2: independent profile storage and legacy migration.
   Run with node --test tests/profile-v082.test.cjs */
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../src/ui/profile-slots.js'),'utf8');
function create(data={}){
 const store={...data},session={};
 const storage=data=>({
  getItem:key=>Object.prototype.hasOwnProperty.call(data,key)?data[key]:null,
  setItem:(key,v)=>{data[key]=String(v)},
  removeItem:key=>{delete data[key]}
 });
 let reloads=0;
 const window={localStorage:storage(store),sessionStorage:storage(session),
  location:{reload(){reloads++}}};
 const mod={exports:{}};
 vm.runInNewContext(source,{window,module:mod});
 return {api:window.WingmanProfileSlots,store,session,reloads:()=>reloads};
}
const career=(name,wins=0,rank=1)=>JSON.stringify({profile:{name,rosterId:'ace-01',faction:'Allies'},wins,
  run:{rank,lives:2,condition:100},service:[{mission:'ACE HUNT'}]});
test('migrates an existing pilot into service record one without deleting current saves',()=>{
 const initial=career('Biscuit',9,5),arcade=JSON.stringify({wins:13,unlocks:['ace']});
 const p=create({'wingman-road-to-ace-v1':initial,'wingman-arcade-v1':arcade});
 assert.equal(p.store['wingman-road-to-ace-v1'],initial);
 assert.equal(p.store['wingman-arcade-v1'],arcade);
 assert.equal(p.api.slots()[0].name,'Biscuit');
 assert.equal(p.api.slots()[0].rank,5);
 assert.equal(p.api.slots()[1].hasProfile,false);
});
test('switching slots isolates both campaign and arcade records and reloads in-memory game',()=>{
 const p=create({'wingman-road-to-ace-v1':career('Biscuit',9,4),
  'wingman-arcade-v1':JSON.stringify({wins:20})});
 const next=p.api.select(1);
 assert.equal(next.ok,true);assert.equal(next.reload,true);
 assert.equal(p.session['wingman-menu-arrival-v1'],'pilots');
 assert.equal(p.store['wingman-road-to-ace-v1'],undefined);
 p.store['wingman-road-to-ace-v1']=career('New Pilot',2,2);
 p.store['wingman-arcade-v1']=JSON.stringify({wins:3});
 p.api.select(0);
 assert.equal(JSON.parse(p.store['wingman-road-to-ace-v1']).profile.name,'Biscuit');
 assert.equal(JSON.parse(p.store['wingman-arcade-v1']).wins,20);
 assert.equal(p.session['wingman-menu-arrival-v1'],'home');
 p.api.select(1);
 assert.equal(JSON.parse(p.store['wingman-road-to-ace-v1']).profile.name,'New Pilot');
 assert.equal(JSON.parse(p.store['wingman-arcade-v1']).wins,3);
 assert.equal(p.reloads(),3);
});
test('invalid slot or selecting the active slot cannot erase the current pilot',()=>{
 const initial=career('Biscuit');
 const p=create({'wingman-road-to-ace-v1':initial});
 assert.equal(p.api.select(8).ok,false);
 assert.equal(p.api.select(0).reload,false);
 assert.equal(p.store['wingman-road-to-ace-v1'],initial);
 assert.equal(p.reloads(),0);
});
