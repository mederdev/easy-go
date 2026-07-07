import { createAnimation } from '@ionic/vue';
import type { Animation, TransitionOptions } from '@ionic/vue';

export type SlideDirection = 'forward' | 'back';

// The direction of the next slide, set synchronously right before we navigate.
// We keep it at module scope (rather than reading `opts.direction`) because tab
// navigation doesn't reliably deliver our per-call builder: on mobile `IonTabs`
// fires its own transition and Ionic falls back to the *cached* builder from the
// view's previous entrance — which would otherwise always be the forward one.
// A single stable `slideAnimation` reference that reads this value means every
// transition, whoever triggers it, animates in the intended direction.
let nextDirection: SlideDirection = 'forward';

export function setSlideDirection(direction: SlideDirection): void {
  nextDirection = direction;
}

// A symmetric, full-width horizontal slide: both the entering and leaving pages
// travel the whole viewport width in lockstep, like a native pager. This reads
// as an unambiguous directional swipe (unlike iOS's subtle parallax, where the
// incoming page barely moves and every switch feels like it comes from the
// right):
//   forward → the strip slides left:  new page enters from the right, old exits left
//   back    → the strip slides right: new page enters from the left,  old exits right
// A soft leading-edge shadow on the incoming page adds depth so it feels native;
// pages stay fully opaque so the motion looks like solid panels sliding.
export function slideAnimation(_: HTMLElement, opts: TransitionOptions): Animation {
  const { enteringEl, leavingEl } = opts;
  const forward = nextDirection === 'forward';
  const enterFrom = forward ? '100%' : '-100%';
  const leaveTo = forward ? '-100%' : '100%';

  const root = createAnimation()
    .duration(560)
    .easing('cubic-bezier(0.32, 0.72, 0, 1)');

  const enter = createAnimation()
    .addElement(enteringEl)
    .beforeStyles({ 'z-index': '2', 'box-shadow': '0 0 32px rgba(0, 0, 0, 0.16)' })
    .afterClearStyles(['box-shadow', 'z-index'])
    .fromTo('transform', `translateX(${enterFrom})`, 'translateX(0)');
  root.addAnimation(enter);

  if (leavingEl) {
    const leave = createAnimation()
      .addElement(leavingEl)
      .beforeStyles({ 'z-index': '1' })
      .afterClearStyles(['z-index'])
      .fromTo('transform', 'translateX(0)', `translateX(${leaveTo})`);
    root.addAnimation(leave);
  }

  return root;
}
