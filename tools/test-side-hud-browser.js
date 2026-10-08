'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const out=path.resolve(process.argv[2]||'test-output/release-audit/side-hud');
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.BUBBLEPAWS_BROWSER});
  const errors=[],cases=[];
  try{
    for(const [width,height] of [[844,390],[896,414],[1024,470],[2560,1080],[640,360],[390,844]]){
      const context=await browser.newContext({viewport:{width,height},hasTouch:true});
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.join(__dirname,'..','index.html')).href+'#play=phoebe&ab=all&demo=rainbow');
      await page.waitForFunction(()=>BB.Play.t>30);
      await page.evaluate(()=>{
        const P=BB.Play;BB.Main.update=()=>{};P.intro=P.iris=P.kinCard=null;P.zoneCard=0;
        const s=P.save;s.sparkles=Object.fromEntries(Array.from({length:1250},(_,i)=>['s'+i,1]));
        s.friends=Object.fromEntries(Array.from({length:37},(_,i)=>['f'+i,1]));s.heartsSpent=17;
        s.family=Object.fromEntries(BB.Home.familyOrder().map(id=>[id,1]));
        s.kin=Object.fromEntries(BB.RAINBOW_KIN.filter(id=>id!=='rbMama').map(id=>[id,1]));
        s.toys=Object.fromEntries(['yarn','feather','bell','mouse','boat','star','shell','bucket','mitten','kite','duck','rocket'].map(id=>[id,1]));
        s.gestures={a:1,b:1,c:1,d:1,e:1};P.mood=2;BB.Settings.setDifficulty('hard');
        document.body.classList.add('has-tricks');BB.G.resize();
      });
      await page.waitForTimeout(100);
      const state=await page.evaluate(()=>{
        const g=BB.G,v=g.view,rail=g.sideHUD;
        const pads=[...document.querySelectorAll('.tbtn,#map-btn,#pause-btn')].filter(b=>b.checkVisibility()).map(b=>{const r=b.getBoundingClientRect();return {id:b.id,x:r.x,y:r.y,w:r.width,h:r.height};});
        return {v,rail,pads,label:document.getElementById('surround').getAttribute('aria-label')};
      });
      const active=width>800&&width/height>2;
      assert.equal(!!state.rail,active,'side layout only uses existing wide gutters');
      assert.equal(state.v.w,Math.floor(Math.min(width,height*960/540)),'game width preserved');
      assert.equal(state.v.h,Math.floor(Math.min(height,width*540/960)),'game height preserved');
      if(active){
        assert.deepEqual({stars:state.rail.stars,hearts:state.rail.hearts,family:state.rail.family,mood:state.rail.mood,tricks:state.rail.tricks,kin:state.rail.kin},{stars:1250,hearts:20,family:12,mood:2,tricks:5,kin:6});
        assert.equal(state.rail.hard,true,'hard-mode health retained');
        assert.equal(state.rail.abilities.length,10);assert.equal(state.rail.toys.length,12);
        const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
        for(const item of state.rail.items){
          assert.ok(item.x>=0&&item.y>=0&&item.x+item.w<=width&&item.y+item.h<=height,'cards fit viewport');
          assert.ok(item.x+item.w<=state.v.x+1||item.x>=state.v.x+state.v.w-1,'cards remain outside game');
          assert.ok(!state.pads.some(b=>overlap(item,b)),item.id+' clear of touch/map/pause');
        }
        assert.match(state.label,/1250 stars, 20 hearts/,'accessible live values');
        await page.evaluate(()=>{BB.Play.save.sparkles.extra=1;BB.Play.save.heartsSpent=18;BB.Play.mood=1;});
        await page.waitForFunction(()=>BB.G.sideHUD.stars===1251&&BB.G.sideHUD.hearts===19&&BB.G.sideHUD.mood===1);
      }
      await page.screenshot({path:path.join(out,`${width}x${height}-full.png`)});
      await page.evaluate(()=>BB.Play.openWardrobe());await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>document.getElementById('surround').checkVisibility()),false,'picture menu hides side HUD');
      await page.evaluate(()=>{BB.Play.closeWardrobe();BB.Main.go('pause');});await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>document.getElementById('surround').checkVisibility()),false,'pause hides side HUD');
      await page.evaluate(()=>{BB.Pause.leave();BB.Main.go('play-resume');});await page.waitForTimeout(50);
      assert.equal(await page.evaluate(()=>!!BB.G.sideHUD),active,'resume restores HUD');
      cases.push({width,height,...state});await context.close();console.log(`Checked ${width}x${height}`);
    }
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({cases,errors},null,2));
    console.log('Side HUD preserves every inventory/health value, updates live, clears menus and fits without covering the game.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
