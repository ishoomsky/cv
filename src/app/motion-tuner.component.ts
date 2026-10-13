import { Component, inject } from '@angular/core';
import { MOTION, MOTION_DEFAULTS } from './motion.config';
import { SpaceService } from './space.service';

const STORE_KEY = 'cv-motion';

/**
 * Dev-only panel (rendered by AppComponent only when isDevMode()) for tuning
 * MOTION live: speed, strength and the first-load intro mode. Values persist in
 * localStorage so "Replay first load" (a reload) uses them; "Copy" puts them on
 * the clipboard for pasting into motion.config.ts — the real source of truth.
 */
@Component({
  selector: 'app-motion-tuner',
  standalone: true,
  template: `
    @if (open) {
      <div class="tuner" role="group" aria-label="Motion tuning">
        <div class="head">
          <strong>Motion</strong>
          <button type="button" class="x" (click)="open = false" aria-label="Close">×</button>
        </div>
        <label>Speed <output>{{ m.speed.toFixed(2) }}×</output>
          <input type="range" min="0.25" max="3" step="0.05" [value]="m.speed" (input)="set('speed', $event)" />
        </label>
        <label>Strength <output>{{ m.strength.toFixed(2) }}</output>
          <input type="range" min="0" max="2" step="0.05" [value]="m.strength" (input)="set('strength', $event)" />
        </label>
        <label>Page enter delay <output>{{ m.pageEnterDelay.toFixed(2) }}s</output>
          <input type="range" min="0" max="1" step="0.05" [value]="m.pageEnterDelay" (input)="set('pageEnterDelay', $event)" />
        </label>
        <div class="row">
          <button type="button" (click)="space.pulseWarp(-1)">← Warp</button>
          <button type="button" (click)="space.pulseWarp(1)">Warp →</button>
        </div>
        <div class="row">
          <button type="button" (click)="replay()">Replay first load</button>
        </div>
        <div class="row">
          <button type="button" (click)="copy()">{{ copied ? 'Copied ✓' : 'Copy values' }}</button>
          <button type="button" (click)="reset()">Reset</button>
        </div>
        <p class="hint">Page transitions pick up the values on the next navigation; Replay shows the first-load intro.</p>
      </div>
    } @else {
      <button type="button" class="fab" (click)="open = true">Motion ⚙</button>
    }
  `,
  styles: [`
    :host { position: fixed; left: 12px; bottom: 12px; z-index: 10000; font: 12px/1.4 'Share Tech Mono', monospace; color: #d0eeff; }
    .fab, button { font: inherit; color: inherit; cursor: pointer; border-radius: 999px; border: 1px solid rgba(0,212,255,.35); background: rgba(2,12,26,.92); padding: 6px 12px; }
    button.on { background: #00d4ff; color: #04121f; border-color: #00d4ff; }
    .tuner { width: 240px; padding: 12px 14px; border-radius: 14px; border: 1px solid rgba(0,212,255,.35); background: rgba(2,12,26,.95); display: grid; gap: 10px; }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .x { padding: 0 9px; }
    label { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; }
    label input { grid-column: 1 / -1; width: 100%; accent-color: #00d4ff; }
    output { color: #00d4ff; }
    .row { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .hint { margin: 0; color: #8ec8e8; font-size: 11px; }
  `],
})
export class MotionTunerComponent {
  readonly m = MOTION;
  readonly space = inject(SpaceService);
  open = false;
  copied = false;

  constructor() {
    // Restore the last tuned values (dev convenience; storage may be blocked).
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY) ?? 'null');
      // Only known keys — older saves may carry knobs that no longer exist.
      if (saved) for (const k of Object.keys(MOTION_DEFAULTS) as (keyof typeof MOTION)[]) {
        if (typeof saved[k] === 'number') MOTION[k] = saved[k];
      }
    } catch {}
  }

  set(key: 'speed' | 'strength' | 'pageEnterDelay', e: Event) {
    MOTION[key] = +(e.target as HTMLInputElement).value;
    this.save();
  }


  replay() {
    this.save();
    location.reload();
  }

  copy() {
    // The exact object literal body, ready to paste into motion.config.ts.
    const text = Object.entries(MOTION).map(([k, v]) => `${k}: ${typeof v === 'string' ? `'${v}'` : v},`).join('\n');
    navigator.clipboard?.writeText(text).then(() => {
      this.copied = true;
      setTimeout(() => (this.copied = false), 1500);
    });
  }

  reset() {
    Object.assign(MOTION, MOTION_DEFAULTS);
    try { localStorage.removeItem(STORE_KEY); } catch {}
  }

  private save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(MOTION)); } catch {}
  }
}
