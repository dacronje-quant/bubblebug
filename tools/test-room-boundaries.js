'use strict';
const assert = require('node:assert/strict');
const { createCanvas } = require('@napi-rs/canvas');
const { BB: B } = require('./test-neighbourhood').bootGame(createCanvas);
B.World.build();
const before = JSON.stringify(Array.from(B.World.flat));
const cv = createCanvas(960,540), c = cv.getContext('2d');
const counts = { rooms:0, blocked:0, connections:0, drops:0 };
for (const r of B.World.rooms) {
  counts.rooms++;
  const probe = (side,col,row,adjX,adjY) => {
    if (B.Physics.solidSide(r.grid[row][col])) return;
    const tx=r.x+col, ty=r.y+row, ch=B.World.tile(adjX,adjY);
    const cam={x:tx*32-32,y:ty*32-32};
    c.clearRect(0,0,960,540); B.Tiles.drawBounds(c,r,cam);
    const x=side==='left'?36:side==='right'?60:48, y=side==='top'?36:side==='bottom'?60:48;
    const alpha=c.getImageData(x,y,1,1).data[3];
    const blocked=side!=='bottom' && ch===null;
    assert.equal(alpha>0,blocked,`${r.id} ${side} ${col},${row}: visible barrier matches collision`);
    if (blocked) counts.blocked++; else if (side==='bottom' && ch===null) counts.drops++; else counts.connections++;
  };
  for (let col=0;col<r.w;col++) {
    probe('top',col,0,r.x+col,r.y-1);
    probe('bottom',col,r.h-1,r.x+col,r.y+r.h);
  }
  for (let row=0;row<r.h;row++) {
    probe('left',0,row,r.x-1,r.y+row);
    probe('right',r.w-1,row,r.x+r.w,r.y+row);
  }
}
assert.equal(JSON.stringify(Array.from(B.World.flat)),before,'rendering never changes collision tiles');
assert.ok(counts.blocked>100 && counts.connections>100 && counts.drops>20,'barriers, connections and falling exits covered');
console.log(JSON.stringify(counts));
console.log('Room walls/ceilings are visible; real connections and drops remain open.');
