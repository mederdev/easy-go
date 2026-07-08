import { createAnimation } from '@ionic/vue';
import type { Animation, TransitionOptions } from '@ionic/vue';

// 'forward'/'back' are the directional tab slides; 'neutral' is the
// non-directional fade used for detail/secondary navigations that have no
// left-to-right position in the tab bar.
export type SlideDirection = 'forward' | 'back' | 'neutral';

// The direction of the next slide, set synchronously right before we navigate.
// We keep it at module scope (rather than reading `opts.direction`) because tab
// navigation doesn't reliably deliver our per-call builder: on mobile `IonTabs`
// fires its own transition and Ionic falls back to the *cached* builder from the
// view's previous entrance — which would otherwise always be the forward one.
// A single stable `slideAnimation` reference that reads this value means every
// transition, whoever triggers it, animates in the intended direction.
//
// It defaults to 'neutral': only a tab tap (`go()` in TabsLayout) sets a
// direction, and `slideAnimation` consumes it and resets to 'neutral' as it
// builds. So any push into a detail page or a secondary in-tab page that isn't
// in the tab bar gets the neutral fade instead of inheriting the last tab tap's
// left/right slide. (We reset here, not in the router's afterEach, because
// afterEach fires *before* the outlet builds the transition — resetting there
// would wipe the direction before this builder reads it.)
let nextDirection: SlideDirection = 'neutral';

export function setSlideDirection(direction: SlideDirection): void {
  nextDirection = direction;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

// A symmetric, full-width horizontal slide: both the entering and leaving pages
// travel the whole viewport width in lockstep, like a native pager. This reads
// as an unambiguous directional swipe (unlike iOS's subtle parallax, where the
// incoming page barely moves and every switch feels like it comes from the
// right):
//   forward → the strip slides left:  new page enters from the right, old exits left
//   back    → the strip slides right: new page enters from the left,  old exits right
//   neutral → no travel: the new page fades in over a small nudge, no directional slide
// A soft leading-edge shadow on the incoming page adds depth so it feels native;
// pages stay fully opaque so the motion looks like solid panels sliding.
export function slideAnimation(_: HTMLElement, opts: TransitionOptions): Animation {
  const { enteringEl, leavingEl } = opts;

  // Read the intended direction once and immediately reset, so the next
  // navigation is neutral unless a tab tap sets a direction right before it.
  const direction = nextDirection;
  nextDirection = 'neutral';

  // Reduced motion: cross-fade with no transform, near-instant.
  if (prefersReducedMotion()) {
    const root = createAnimation().duration(1).easing('linear');
    root.addAnimation(
      createAnimation().addElement(enteringEl).fromTo('opacity', '0', '1'),
    );
    if (leavingEl) {
      root.addAnimation(
        createAnimation().addElement(leavingEl).fromTo('opacity', '1', '0'),
      );
    }
    return root;
  }

  // Neutral fade for non-directional navigations: the new page fades in over a
  // small rightward nudge; the old page just fades out. `will-change` promotes
  // both pages to their own GPU layer up front so the fade never hitches on a
  // mid-transition layer creation.
  if (direction === 'neutral') {
    const root = createAnimation()
      .duration(220)
      .easing('cubic-bezier(0.65, 0, 0.35, 1)');
    root.addAnimation(
      createAnimation()
        .addElement(enteringEl)
        .beforeStyles({ 'z-index': '2', 'will-change': 'transform, opacity' })
        .afterClearStyles(['z-index', 'will-change'])
        .keyframes([
          { offset: 0, opacity: '0', transform: 'translateX(14px)' },
          { offset: 1, opacity: '1', transform: 'translateX(0)' },
        ]),
    );
    if (leavingEl) {
      root.addAnimation(
        createAnimation()
          .addElement(leavingEl)
          .beforeStyles({ 'z-index': '1', 'will-change': 'opacity' })
          .afterClearStyles(['z-index', 'will-change'])
          .fromTo('opacity', '1', '0'),
      );
    }
    return root;
  }

  const forward = direction === 'forward';
  const enterFrom = forward ? '100%' : '-100%';
  const leaveTo = forward ? '-100%' : '100%';

  // Ease-in-out (symmetric): the slide accelerates gently in and decelerates
  // gently out, so both the start and the end feel smooth — unlike a
  // front-loaded decelerate curve, which snaps into motion abruptly.
  const root = createAnimation()
    .duration(540)
    .easing('cubic-bezier(0.65, 0, 0.35, 1)');

  // `will-change: transform` promotes each page to its own compositor layer
  // *before* the first frame, so the whole slide runs on the GPU with no
  // first-frame layer-creation hitch — that hitch is what read as "rusty".
  // `translateZ(0)` in the from/to keeps the layer alive for the leaving page.
  const enter = createAnimation()
    .addElement(enteringEl)
    .beforeStyles({
      'z-index': '2',
      'will-change': 'transform',
      'box-shadow': '0 0 32px rgba(0, 0, 0, 0.16)',
    })
    .afterClearStyles(['box-shadow', 'z-index', 'will-change'])
    .fromTo('transform', `translateX(${enterFrom}) translateZ(0)`, 'translateX(0) translateZ(0)');
  root.addAnimation(enter);

  if (leavingEl) {
    const leave = createAnimation()
      .addElement(leavingEl)
      .beforeStyles({ 'z-index': '1', 'will-change': 'transform' })
      .afterClearStyles(['z-index', 'will-change'])
      .fromTo('transform', 'translateX(0) translateZ(0)', `translateX(${leaveTo}) translateZ(0)`);
    root.addAnimation(leave);
  }

  return root;
}
