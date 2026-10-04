'use strict';
// Check the real camera/terrain renderer and DOM controls together. The soil
// extension must never change physics data or reduce the adventure canvas.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const out = path.resolve(process.argv[2] || 'test-output/release-audit/touch-ground');
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.BUBBLEPAWS_BROWSER, headless: true });
  const errors = [], cases = [];
  try {
    for (const [width, height] of [[320,568],[390,844],[568,320],[640,360],[844,390],[1280,720]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: true });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href + '#play=phoebe&ab=all&hunt=1&demo=rainbow');
      await page.waitForFunction(() => BB.Play.t > 30);
      await page.evaluate(() => {
        BB.Main.update = () => {};
        BB.Play.intro = BB.Play.iris = BB.Play.kinCard = null; BB.Play.zoneCard = 0;
        window.originalTiles = JSON.stringify(Array.from(BB.World.flat));
        document.body.classList.add('has-tricks'); BB.G.resize();
      });
      for (const id of ['hm','g6','m7','l7','k3','t3','k2']) {
        const result = await page.evaluate(id => {
          const P = BB.Play, r = BB.World.byId[id], G = BB.G;
          P.room = r; P.prevRoom = null; P.lastZone = r.zone; P.way = null;
          P.activeBoss = P.bossCard = null; P.zoneCard = 0;
          const solid = (x,y) => BB.Physics.solidSide(BB.World.tile(x,y));
          let spot;
          for (let y = r.h - 1; y > 1 && !spot; y--) for (let x = Math.floor(r.w / 2); x < r.w - 1 && !spot; x++)
            if (solid(r.x+x,r.y+y) && !solid(r.x+x,r.y+y-1) && !solid(r.x+x,r.y+y-2)) spot = {x,y};
          if (!spot) throw new Error('No standing spot in ' + id);
          P.pl.body = BB.Physics.newBody((r.x+spot.x)*32+6,(r.y+spot.y)*32-24);
          P.pl.body.grounded = true; BB.Camera.snap(r,P.pl.body);
          const view = {...G.view}, floorY = view.y + ((r.y+spot.y)*32 - BB.Camera.y)*view.h/G.H;
          const buttons = [...document.querySelectorAll('.tbtn')].filter(b => b.checkVisibility()).map(b => {
            const q = b.getBoundingClientRect(); return { id:b.id,x:q.x,y:q.y,w:q.width,h:q.height };
          });
          const padTop = Math.min(...buttons.map(b=>b.y));
          return {id,view,floorY,padTop,buttons,reserve:G.touchFloorReserve,
            physicsSame: window.originalTiles === JSON.stringify(Array.from(BB.World.flat))};
        },id);
        const name = `${width}x${height}-${id}`;
        await page.waitForTimeout(40); await page.screenshot({ path: path.join(out,name+'.png') });
        const expectedW = Math.floor(Math.min(width,height*960/540));
        const expectedH = Math.floor(Math.min(height,width*540/960));
        assert.equal(result.view.w,expectedW,name+' keeps full canvas width');
        assert.equal(result.view.h,expectedH,name+' keeps full canvas height');
        assert.ok(result.buttons.every(b=>b.w>=52 && b.w<=80),name+' usable smaller targets');
        if (id !== 'k2') assert.ok(result.floorY+8 <= result.padTop,name+' standing floor clears thumb row');
        assert.ok(result.physicsSame,name+' collision tiles preserved');
        cases.push({name,...result});
      }
      const pad = await page.locator('#t-left').boundingBox();
      await page.dispatchEvent('#t-left','pointerdown',{pointerType:'touch',pointerId:20,clientX:pad.x+pad.width/2,clientY:pad.y+pad.height/2});
      assert.equal(await page.evaluate(()=>{BB.Input.poll();return BB.Input.held.left;}),true,'smaller control accepts touch');
      await page.dispatchEvent('#touch','pointerup',{pointerType:'touch',pointerId:20});
      assert.equal(await page.evaluate(()=>{BB.Input.poll();return BB.Input.held.left;}),false,'touch releases');
      if (width === 640) {
        const kingdom = await page.evaluate(() => {
          const cases = [], P = BB.Play, G = BB.G;
          const top = Math.min(...[...document.querySelectorAll('.tbtn')].filter(b=>b.checkVisibility()).map(b=>b.getBoundingClientRect().top));
          const solid = (x,y)=>BB.Physics.landKind(BB.World.tile(x,y),P.save.abilities) === 1;
          for (const r of BB.World.rooms) {
            if (r.def.maze) continue;
            let spot;
            for (let y=r.h-1;y>1 && !spot;y--) for (let x=1;x<r.w-1 && !spot;x++)
              if (solid(r.x+x,r.y+y) && !BB.Physics.solidSide(BB.World.tile(r.x+x,r.y+y-1)) && !BB.Physics.solidSide(BB.World.tile(r.x+x,r.y+y-2))) spot={x,y};
            if (!spot) continue;
            const body = BB.Physics.newBody((r.x+spot.x)*32+6,(r.y+spot.y)*32-24);
            body.grounded=true; BB.Camera.snap(r,body);
            const floorY=G.view.y+((r.y+spot.y)*32-BB.Camera.y)*G.view.h/G.H;
            cases.push({room:r.id,floorY,top,clear:floorY<=top});
          }
          return cases;
        });
        fs.writeFileSync(path.join(out,'kingdom-clearance.json'),JSON.stringify(kingdom,null,2));
        console.log('Standing-level clearance: ' + kingdom.filter(c=>c.clear).length + '/' + kingdom.length);
        assert.deepEqual(kingdom.filter(c=>!c.clear),[],'ground-level character/enemies clear controls across kingdom');
      }
      await context.close();
      console.log(`Checked ${width}x${height}`);
    }
    assert.deepEqual(errors,[],'no renderer exceptions');
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({cases,errors},null,2));
    console.log(`${cases.length} full-size touch ground views passed`);
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
