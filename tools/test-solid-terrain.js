'use strict';
// Render every tile using the real terrain painters, then compare visible
// block faces with the actual collision classifications. Include the whole
// room, not merely the portion visible from a standing camera position.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { createCanvas } = require('@napi-rs/canvas');
const { BB: B } = require('./test-neighbourhood').bootGame(createCanvas);
B.World.build(); B.G.scale = 1; B.Tiles.clear();
const original = JSON.stringify(Array.from(B.World.flat));
const out = path.resolve(process.argv[2] || 'test-output/release-audit/solid-terrain');
fs.mkdirSync(out,{recursive:true});
const cv = createCanvas(960,540);
const counts={rooms:0,zones:0,solidTiles:0,wallFaces:0,ceilings:0,floors:0,oneWay:0,secretTiles:0};
const zones=new Set(), reports=[];
const solid=ch=>['#','I','G','M','X'].includes(ch)||ch===null;
for(const r of B.World.rooms){
  const width=r.pw+64,height=r.ph+64;
  cv.width=width;cv.height=height;const c=cv.getContext('2d');
  B.G.W=width;B.G.H=height;
  const cam={x:r.px-32,y:r.py-32};
  const env={glow:true,rings:true,dig:false,px:r.px,py:r.py};
  B.Tiles.drawBounds(c,r,cam);
  B.Tiles.drawStatic(c,r,cam,0);
  B.Tiles.drawLive(c,r,cam,0,env);
  const pixels=c.getImageData(0,0,width,height).data;
  const rgba=(x,y)=>pixels.slice((y*width+x)*4,(y*width+x)*4+4);
  const alpha=(x,y)=>rgba(x,y)[3];
  let surfaces=0;
  for(let row=0;row<r.h;row++)for(let col=0;col<r.w;col++){
    const ch=r.grid[row][col],x=32+col*32,y=32+row*32,tx=r.x+col,ty=r.y+row;
    const label=`${r.id} ${ch} ${col},${row}`;
    if(['#','I','G','M','X'].includes(ch)){
      assert.ok(alpha(x+16,y+16)>=200,label+' opaque block body');counts.solidTiles++;
      for(const [dx,dy,px,py,type] of [[-1,0,2,16,'wallFaces'],[1,0,30,16,'wallFaces'],[0,-1,16,2,'floors'],[0,1,16,30,'ceilings']]){
        if(solid(B.World.tile(tx+dx,ty+dy)))continue;
        assert.ok(alpha(x+px,y+py)>=180,label+' readable '+type);
        counts[type]++;surfaces++;
      }
    }else if(ch==='-'||ch===':'){
      assert.ok(Array.from({length:10},(_,i)=>alpha(x+16,y+i)).some(a=>a>=180),label+' visible one-way walking surface');counts.oneWay++;
    }else if(ch==='H')counts.secretTiles++;
  }
  counts.rooms++;zones.add(r.zone);reports.push({id:r.id,zone:r.zone,surfaces});
  fs.writeFileSync(path.join(out,r.zone.toString().padStart(2,'0')+'-'+r.id+'.png'),cv.toBuffer('image/png'));
}
// An opened gate and crumbled block must actually look open in the renderer.
for(const [closed,open] of [['G','g'],['X','.']]){
  const r=B.World.rooms.find(r=>r.grid.some(row=>row.includes(closed)));
  let pos;for(let row=0;row<r.h&&!pos;row++)for(let col=0;col<r.w&&!pos;col++)if(r.grid[row][col]===closed)pos={row,col};
  const tx=r.x+pos.col,ty=r.y+pos.row;
  B.World.setTile(tx,ty,open);B.G.W=960;B.G.H=540;cv.width=960;cv.height=540;
  const c=cv.getContext('2d'),cam={x:tx*32-64,y:ty*32-64};
  B.Tiles.drawStatic(c,r,cam,0);B.Tiles.drawLive(c,r,cam,0,{glow:true,rings:true,dig:false});
  assert.equal(c.getImageData(80,80,1,1).data[3],0,closed+' disappears after opening/crumbling');
  B.World.setTile(tx,ty,closed);
}
assert.equal(JSON.stringify(Array.from(B.World.flat)),original,'rendering preserves the complete collision map');
counts.zones=zones.size;
assert.equal(counts.rooms,103);assert.equal(counts.zones,13);assert.ok(counts.solidTiles>15000);
fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({counts,reports},null,2));
console.log(JSON.stringify(counts));
console.log('All room terrain bodies and exposed walls/floors/ceilings match their blocked footprints; opened gates and crumbled blocks look open.');
