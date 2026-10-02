// Short, once-per-adventure help, valid only while its action still matters.
(function (BB) {
  'use strict';
  Object.assign(BB.Play, {
    cancelGuidance() {
      for (const id of Object.keys(this.guidance.jobs)) BB.Voice.cancel(id);
      this.guidance.jobs = {};
    },
    drawGuidance(c, cam) {
      const id = BB.Voice.currentId;
      const action = ['tutorial_jump', 'tutorial_double_jump'].includes(id) ? 'jump' :
        ['tutorial_sad_animal', 'tutorial_sleepy_buds', 'tutorial_goose'].includes(id) ? 'bubble' : null;
      if (!action || BB.Audio.muted) return;
      const b = this.pl.body;
      BB.HUD.buttonIcon(c, action, b.x + b.w / 2 - cam.x, b.y - cam.y - 45, 1.1, 0.65 + Math.sin(this.t * .12) * .35);
    },
    sayGuidance(id, condition, delay = 0) {
      const heard = this.save.voiceStory = this.save.voiceStory || {};
      if (heard[id] || this.guidance.jobs[id] || BB.Audio.muted) return false;
      const room = this.room, save = this.save;
      const valid = () => this.save === save && this.room === room && BB.Main.name === 'play' && condition();
      if (!valid()) return false;
      this.guidance.jobs[id] = valid;
      const accepted = BB.Voice.play(id, delay, { valid, onStart: () => {
        heard[id] = 1; this.guidance.next = this.t + 180; BB.Save.write();
      } });
      if (accepted) this.guidance.next = this.t + 180;
      else delete this.guidance.jobs[id];
      return accepted;
    },
    updateGuidance() {
      const V = BB.Voice, g = this.guidance, b = this.pl.body, e = this.ents[this.room.id];
      for (const [id, valid] of Object.entries(g.jobs)) {
        if (!valid()) V.cancel(id);
        if (V.currentId !== id && !V.queuedIds.includes(id)) delete g.jobs[id];
      }
      if (this.pl.state !== 'play' || this.intro || this.gift || this.party || this.maze ||
          this.wardrobe || this.portalChoice || this.gardenChoice || this.traveling ||
          V.currentId || V.queuedIds.length || this.t < g.next) return;
      const near = (th, radius = 150) => Math.abs(b.x + b.w / 2 - th.x) < radius && Math.abs(b.y + b.h / 2 - th.y) < 120;
      const goose = e.bosses.find(bs => bs.kind === 'goose' && bs.state === 'sniffle' && near(bs, 300));
      if (goose && this.sayGuidance('tutorial_goose', () => goose.state === 'sniffle' && near(goose, 300))) return;
      const buds = e.things.filter(th => th.type === 'bud' && !this.save.buds[th.key]);
      if (buds.some(th => near(th)) && this.sayGuidance('tutorial_sleepy_buds', () => buds.some(th => !this.save.buds[th.key] && near(th)))) return;
      const pads = e.things.filter(th => th.type === 'pad');
      if (this.room.id === 'g1' && pads.some(th => near(th)) &&
          this.sayGuidance('tutorial_paw_pads', () => pads.some(th => !this.save.pads[th.key]) && pads.some(th => near(th)))) return;
      const bug = e.bugs.find(th => th.state === 'gloomy' && near(th, 200));
      if (this.room.zone === 0 && bug && this.sayGuidance('tutorial_sad_animal', () => bug.state === 'gloomy' && near(bug, 200))) return;
      // The first mandatory hop is the gap in Sunrise Lawn. Help only after
      // three seconds of hesitation; successful earlier jumps suppress it.
      if (this.room.id === 'g1' && b.grounded && this.pl.idleT > 180 &&
          b.x > 6 * 32 && b.x < 19 * 32) {
        this.sayGuidance('tutorial_jump', () => !this.guidance.jumped &&
          this.pl.state === 'play' && b.grounded && b.x > 6 * 32 && b.x < 19 * 32);
      }
    },
  });
})(window.BB);
