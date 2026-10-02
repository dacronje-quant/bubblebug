// Portable review: audio stays embedded; no API key or server is required.
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)), root=path.dirname(dir);
const ctx=vm.createContext({window:{BB:{}}});
vm.runInContext(await fs.readFile(path.join(root,'js/core/voice-clips.js'),'utf8'),ctx);
const active=ctx.window.BB.VOICE_CLIPS;
const game=JSON.parse(await fs.readFile(path.join(dir,'gemini-pack.json'),'utf8'));
const tutorial=JSON.parse(await fs.readFile(path.join(dir,'tutorial-pack.json'),'utf8'));
const names={
 mamaMallow:"Marshmallow's Mama",papaBirman:"Marshmallow's Papa",grannyLilac:"Marshmallow's Granny",
 bigSisterCocoa:'Cocoa — big sister',babySnowflake:'Snowflake — baby brother',grandpaSeal:"Marshmallow's Grandpa",
 mamaTortie:"Phoebe's Mama",papaGinger:"Phoebe's Papa",grannyGrey:"Phoebe's Granny",
 bigBrotherTiger:'Tiger — big brother',babyPatches:'Patches — baby sister',grandpaStripes:"Phoebe's Grandpa",
 story_welcome:'Welcome',story_big_friend:'Big friend rescued',story_homecoming:'Homecoming',
 story_family_complete:'Whole family together',story_rainbow_call:'Rainbow asks for help',
 story_rainbow_rescue:'Rainbow rescued',story_replay_choice:'Play again choice',story_replay_start:'Replay opening',
 tutorial_welcome:'New welcome',tutorial_jump:'First jump',tutorial_paw_pads:'Paw pads',
 tutorial_sad_bug:'Sad bug',tutorial_sleepy_buds:'Sleepy flowers',tutorial_googly_glasses:'Googly-eye glasses',
 tutorial_first_family:'First family cat found',tutorial_goose:'Glowing goose',tutorial_double_jump:'Double jump'
};
function normalize(original){
 const bytes=Buffer.from(original);let fmt,data;
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Invalid WAV');
 for(let pos=12;pos+8<=bytes.length;){
  const type=bytes.toString('ascii',pos,pos+4),len=bytes.readUInt32LE(pos+4),start=pos+8;
  if(start+len>bytes.length)throw Error('Truncated WAV');
  if(type==='fmt ')fmt=[bytes.readUInt16LE(start),bytes.readUInt16LE(start+2),bytes.readUInt32LE(start+4),bytes.readUInt16LE(start+14)];
  if(type==='data')data={start,len};pos=start+len+len%2;
 }
 if(String(fmt)!=='1,1,24000,16'||!data||data.len%2||data.len/48000<1||data.len/48000>25)throw Error('Invalid PCM or duration');
 let peak=0,sum=0,count=0;
 for(let p=data.start;p<data.start+data.len;p+=2){const v=bytes.readInt16LE(p)/32768;peak=Math.max(peak,Math.abs(v));if(Math.abs(v)>.008){sum+=v*v;count++}}
 if(!count||peak<.01)throw Error('No speech');
 const gain=Math.min(4,.12/Math.sqrt(sum/count),.891/peak);
 for(let p=data.start;p<data.start+data.len;p+=2)bytes.writeInt16LE(Math.round(bytes.readInt16LE(p)*gain),p);
 return bytes;
}
const recordings=[],pending=[];
for(const spec of game.clips){
 const clip=active[spec.id],bytes=await fs.readFile(path.join(root,clip.file));
 recordings.push({id:spec.id,group:spec.id.startsWith('cat_')?'family':spec.id.startsWith('tutorial_')?'tutorial':'story',name:names[spec.speaker]||names[spec.id],text:clip.text,
 version:clip.source===game.model?'Current · Gemini 3.8':'Current · previous voice',mime:clip.file.endsWith('.mp3')?'audio/mpeg':'audio/wav',data:bytes.toString('base64')});
}
for(const [plan,cache,group] of [[game,'gemini-pack','story'],[tutorial,'tutorial-pack','tutorial']]){
 for(const spec of plan.clips){
  if(active[spec.id]?.source===plan.model || (spec.id==='tutorial_welcome'&&active.story_welcome.text===spec.text))continue;
  const base=path.join(dir,'samples',cache,spec.id);let bytes;
  try{bytes=await fs.readFile(base+'.wav')}catch(e){if(e.code!=='ENOENT')throw e;pending.push(names[spec.id]);continue}
  const meta=JSON.parse(await fs.readFile(base+'.json','utf8'));
  if(meta.model!==plan.model||meta.text!==spec.text||meta.style!==spec.style||meta.speaker!==spec.speaker)throw Error('Plan mismatch: '+spec.id);
  recordings.push({id:spec.id+'_new',group,name:names[spec.id],text:spec.text,version:'New · Gemini 3.8 · for review',trigger:spec.trigger,mime:'audio/wav',data:normalize(bytes).toString('base64')});
 }
}
const payload=JSON.stringify({recordings,pending}).replace(/</g,'\\u003c');
const html=String.raw`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bubble Paws · Voice review</title>
<style>
:root{font:17px system-ui,sans-serif;color:#352942;background:#f7f3fb}*{box-sizing:border-box}body{margin:0}main{max-width:1120px;margin:auto;padding:24px}
h1{font-size:clamp(1.8rem,5vw,2.8rem);margin:10px 0}h2{margin:35px 0 16px}p{line-height:1.5}.intro{max-width:750px;color:#61516c}
.nav{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}a,button{color:#624187}.nav a,.download,button{display:inline-block;border:1px solid #d3c2e4;border-radius:12px;padding:11px 15px;background:#fff;text-decoration:none;font:inherit}
button{cursor:pointer}button:hover,a:hover{background:#efe6f8}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:16px}
.card{background:white;border:1px solid #e0d6e9;border-radius:20px;padding:20px;box-shadow:0 3px 14px #49355e08}.card h3{margin:0 0 8px;font-size:1.1rem}
.tag{font-size:.78rem;color:#6d527f}.dialogue{min-height:4.7em;margin:14px 0}audio{display:block;width:100%;height:45px;margin:12px 0}.download{font-size:.85rem;padding:7px 12px}
.choice{display:flex;align-items:center;gap:10px;margin:20px 0 10px;font-weight:600}input[type=checkbox]{width:23px;height:23px;accent-color:#8158ad;flex:none}
textarea{font:inherit;border:1px solid #d6c9e2;border-radius:10px;padding:12px;width:100%;resize:vertical;min-height:80px;background:#fcfaff}
.note-label{display:block;font-size:.85rem;margin:12px 0 7px}.trigger,.muted{font-size:.85rem;color:#75667f}.summary{background:#eee5f6;padding:22px;border-radius:20px}
.summary textarea{min-height:170px;margin:14px 0}.pending{background:#fff6df;border-radius:12px;padding:14px;margin:16px 0}
@media(max-width:500px){main{padding:16px}.card{padding:18px}.dialogue{min-height:0}.nav a{padding:10px 12px}}
</style>
<main><div class="tag">BUBBLE PAWS · LISTEN & CHOOSE</div><h1>Which voices feel right?</h1>
<p class="intro">Play each cat, tick the voices you want changed, and add a note about what you’d prefer. Only one recording plays at a time. This file contains the audio and works offline.</p>
<nav class="nav"><a href="#family">Family cats</a><a href="#story">Story voices</a><a href="#tutorial">New guidance</a><a href="#feedback">Your choices</a><button id="stop" type="button">Stop audio</button></nav>
<p id="counts" class="muted"></p>
<section id="family"><h2>Family cats</h2><div class="grid"></div></section>
<section id="story"><h2>Story voices</h2><p class="muted">New takes are shown alongside the current recordings for comparison.</p><div class="grid"></div></section>
<section id="tutorial"><h2>New guidance</h2><p class="muted">Short first-time guidance used in the game.</p><div class="grid"></div><div id="pending"></div></section>
<section id="feedback"><h2>Your choices</h2><div class="summary"><p>Copy these notes back into our chat when you’re ready.</p>
<textarea id="summary" readonly aria-label="Voice review notes"></textarea><button id="copy" type="button">Copy notes</button> <button id="save" type="button">Download notes</button> <span id="status" role="status" class="muted"></span></div></section></main>
<script id="recordings" type="application/json">__PAYLOAD__</script>
<script>
'use strict';
const pack=JSON.parse(document.getElementById('recordings').textContent),choices={};
try{Object.assign(choices,JSON.parse(localStorage.getItem('bubble-paws-voice-review')||'{}'))}catch{}
const audios=[];
function el(tag,text,cls){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n}
function stop(except){for(const a of audios)if(a!==except)a.pause()}
document.getElementById('stop').onclick=()=>stop();
function feedback(){
 const cats=pack.recordings.filter(r=>r.group==='family'),changed=cats.filter(r=>choices[r.id]?.change);
 const lines=['Bubble Paws voice review','','Change these cat voices:'];
 if(!changed.length)lines.push('None selected yet.');
 for(const r of changed)lines.push('- '+r.name+': '+(choices[r.id]?.note?.trim()||'Please update this voice.'));
 const other=cats.filter(r=>!choices[r.id]?.change&&choices[r.id]?.note?.trim());
 if(other.length){lines.push('','Other notes:');for(const r of other)lines.push('- '+r.name+': '+choices[r.id].note.trim())}
 document.getElementById('summary').value=lines.join('\n');
 try{localStorage.setItem('bubble-paws-voice-review',JSON.stringify(choices))}catch{}
}
for(const r of pack.recordings){
 const card=el('article',undefined,'card');card.dataset.recording=r.id;card.append(el('h3',r.name),el('div',r.version,'tag'),el('p',r.text,'dialogue'));
 const a=el('audio');a.controls=true;a.preload='metadata';a.src='data:'+r.mime+';base64,'+r.data;a.addEventListener('play',()=>stop(a));audios.push(a);card.append(a);
 const d=el('a','Download recording','download');d.href=a.src;d.download=r.id+(r.mime==='audio/mpeg'?'.mp3':'.wav');card.append(d);
 if(r.group==='family'){
  const c=el('input');c.type='checkbox';c.checked=!!choices[r.id]?.change;const label=el('label',undefined,'choice');label.append(c,el('span','Change this voice'));card.append(label);
  const noteLabel=el('label','What would you like changed?','note-label');noteLabel.htmlFor='note-'+r.id;
  const note=el('textarea');note.id=noteLabel.htmlFor;note.placeholder='For example: softer, more playful, younger, clearer words…';note.value=choices[r.id]?.note||'';
  const update=()=>{choices[r.id]={change:c.checked,note:note.value};feedback()};c.onchange=update;note.oninput=update;card.append(noteLabel,note);
 }
 if(r.trigger)card.append(el('p',r.trigger,'trigger'));document.querySelector('#'+r.group+' .grid').append(card);
}
document.getElementById('counts').textContent=pack.recordings.length+' playable recordings · '+pack.recordings.filter(r=>r.group==='family').length+' family cats';
if(pack.pending.length)document.getElementById('pending').append(el('p','Still awaiting generation: '+pack.pending.join(', ')+'.','pending'));
feedback();
document.getElementById('copy').onclick=async()=>{const box=document.getElementById('summary');try{await navigator.clipboard.writeText(box.value);document.getElementById('status').textContent='Copied.'}catch{box.focus();box.select();document.getElementById('status').textContent='Select and copy the notes above.'}};
document.getElementById('save').onclick=()=>{const url=URL.createObjectURL(new Blob([document.getElementById('summary').value],{type:'text/plain'})),a=el('a');a.href=url;a.download='bubble-paws-voice-notes.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
window.addEventListener('pagehide',()=>stop());document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
</script></html>`;
const out=path.join(dir,'voice-review.html');await fs.writeFile(out,html.replace('__PAYLOAD__',payload));
console.log(JSON.stringify({file:out,recordings:recordings.length,family:recordings.filter(r=>r.group==='family').length,pending,bytes:(await fs.stat(out)).size}));
