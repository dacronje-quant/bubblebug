'use strict';
// Use real CSS env() overrides, plus native-provided WebView variables.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const out=path.resolve(process.argv[2]||'test-output/release-audit/safe-area');
const zero={left:0,right:0,top:0,bottom:0};
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1;
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:process.env.BUBBLEPAWS_BROWSER});
  const errors=[],cases=[];
  try{
    const context=await browser.newContext({viewport:{width:1194,height:450},hasTouch:true});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    const cdp=await context.newCDPSession(page);
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
    async function check(name,width,height,values,active,native=false){
      const safe={...zero,...values};
      await page.setViewportSize({width,height});
      await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:native?zero:safe});
      await page.evaluate(({safe,native})=>{
        for(const edge of ['left','right','top','bottom']){
          const key='--safe-area-inset-'+edge;
          if(native)document.documentElement.style.setProperty(key,safe[edge]+'px');
          else document.documentElement.style.removeProperty(key);
        }
      },{safe,native});
      // Deliberately do not call G.resize: inset updates must work by themselves.
      await page.waitForFunction(({safe,active})=>Object.keys(safe).every(k=>BB.G.safeArea[k]===safe[k])&&!!BB.G.sideHUD===active,{safe,active});
      const state=await page.evaluate(()=>{
        const g=BB.G;
        const pads=[...document.querySelectorAll('.tbtn,#map-btn,#pause-btn')].filter(b=>b.checkVisibility()).map(b=>{const r=b.getBoundingClientRect();return {id:b.id,x:r.x,y:r.y,w:r.width,h:r.height};});
        const density=g.scale/(g.view.w/g.W);
        const pixel=g.sideHUD?Array.from(g.surround.getContext('2d').getImageData(Math.floor(2*density),Math.floor(100*density),1,1).data):null;
        return {v:g.view,rail:g.sideHUD,compact:g.compactHUD,pads,padTop:g.touchPadTop,pixel,background:getComputedStyle(document.body).backgroundColor};
      });
      assert.equal(state.v.w,Math.floor(Math.min(width,height*960/540)),name+' retains full game width');
      assert.equal(state.v.h,Math.floor(Math.min(height,width*540/960)),name+' retains full game height');
      const inside=r=>r.x>=safe.left-0.1&&r.y>=safe.top-0.1&&r.x+r.w<=width-safe.right+0.1&&r.y+r.h<=height-safe.bottom+0.1;
      assert.ok(state.pads.every(inside),name+' controls avoid cutouts/system bars');
      const pairs=state.pads.flatMap((a,i)=>state.pads.slice(i+1).filter(b=>overlap(a,b)));
      assert.equal(pairs.length,0,name+' controls remain separate');
      assert.ok(Math.abs(state.padTop-state.pads.find(b=>b.id==='t-left').y)<1,name+' live thumb clearance updates');
      if(active){
        assert.deepEqual(state.pixel,[0,0,0,255],name+' gutter is pure black');
        const left=state.rail.items.find(i=>i.id==='health'),right=state.rail.items.find(i=>i.id==='abilities');
        assert.ok(Math.abs(left.w-right.w)<0.1,name+' equal HUD rail widths');
        assert.ok(Math.abs(left.x-(width-right.x-right.w))<1,name+' mirrored cutout spacing');
        assert.ok(left.x>=Math.max(safe.left,safe.right)&&right.x+right.w<=width-Math.max(safe.left,safe.right),name+' reserves the same cutout space on both sides');
        assert.equal(state.rail.stars,1250);assert.equal(state.rail.hearts,20);assert.equal(state.rail.family,12);
        assert.equal(state.rail.abilities.length,10);assert.equal(state.rail.toys.length,12);assert.equal(state.rail.kin,6);
        for(const item of state.rail.items){
          assert.ok(inside(item),name+' '+item.id+' inside safe area');
          assert.ok(!state.pads.some(p=>overlap(item,p)),name+' '+item.id+' clear of controls');
          assert.ok(item.x+item.w<=state.v.x+1||item.x>=state.v.x+state.v.w-1,name+' HUD outside game');
        }
      }else{
        assert.equal(state.background,'rgb(0, 0, 0)',name+' letterbox stays black');
        assert.ok(state.compact&&inside(state.compact),name+' compact fallback inside safe area');
        assert.ok(!state.pads.filter(p=>!p.id.startsWith('t-')).some(p=>overlap(state.compact,p)),name+' compact HUD clear of map/pause');
      }
      // A black mask makes the emulated cutout visible in the review capture.
      await page.evaluate(({safe,width,height})=>{
        document.getElementById('cutout-preview')?.remove();
        const masks=document.createElement('div');masks.id='cutout-preview';masks.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:100';
        const add=style=>{const d=document.createElement('div');d.style.cssText='position:absolute;background:black;'+style;masks.appendChild(d);};
        if(safe.left)add(`left:0;top:${height/2-65}px;width:${safe.left}px;height:130px;border-radius:0 22px 22px 0`);
        if(safe.right)add(`right:0;top:${height/2-65}px;width:${safe.right}px;height:130px;border-radius:22px 0 0 22px`);
        if(safe.top)add(`top:0;left:${width/2-70}px;width:140px;height:${safe.top}px;border-radius:0 0 18px 18px`);
        if(safe.bottom)add(`bottom:0;left:${width/2-45}px;width:90px;height:5px;border-radius:5px;transform:translateY(-${safe.bottom/2}px)`);
        document.body.appendChild(masks);
      },{safe,width,height});
      await page.screenshot({path:path.join(out,name+'.png')});
      cases.push({name,width,height,safe,native,...state});console.log('Checked '+name);
    }
    await check('wide-left-notch',1194,450,{left:48},true);
    await check('wide-right-notch',1194,450,{right:48},true);
    await check('both-edges-and-gesture-bar',1194,450,{left:48,right:24,bottom:24},true);
    await check('top-cutout',1194,500,{top:44,bottom:24},true);
    await check('small-left-cutout',1024,470,{left:24},true);
    await check('balanced-narrow-rails',1024,470,{left:20},true);
    await check('gutter-consumed-left',896,414,{left:44,bottom:24},false);
    await check('gutter-consumed-right',844,390,{right:44},false);
    await check('short-landscape-both',568,320,{left:44,right:44,bottom:24},false);
    await check('portrait-notch',390,844,{top:44,bottom:34},false);
    await check('native-insets-left',1194,450,{left:48,bottom:24},true,true);
    await check('native-insets-right',1194,450,{right:48,bottom:24},true,true);
    await check('restored-no-cutout',844,390,{},true);
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({cases,errors},null,2));
    await context.close();console.log('Safe-area HUD and controls pass cutouts, rotation, live insets and compact fallback without reducing the game.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
