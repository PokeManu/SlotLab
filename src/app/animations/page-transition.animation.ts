import { AnimationBuilder, createAnimation } from '@ionic/angular';
const PAGE_TRANSITION_DURATION = 210;
const PAGE_TRANSITION_EASING = 'cubic-bezier(0.4, 0, 0.2, 1)';
function getPageElement(element: HTMLElement): HTMLElement {
  if (element.classList.contains('ion-page')) return element;
  return (
    element.querySelector<HTMLElement>(
      ':scope > .ion-page, :scope > ion-nav, :scope > ion-tabs',
    ) ?? element
  );
}
export const slotLabPageTransition: AnimationBuilder = (
  _baseElement,
  options = {},
) => {
  const enteringPage = getPageElement(options.enteringEl);
  const leavingPage = options.leavingEl
    ? getPageElement(options.leavingEl)
    : undefined;
  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transition = createAnimation('slotlab-page-transition')
    .duration(
      prefersReducedMotion || !leavingPage
        ? 0
        : (options.duration ?? PAGE_TRANSITION_DURATION),
    )
    .easing(PAGE_TRANSITION_EASING);
  const enteringAnimation = createAnimation('slotlab-page-enter')
    .addElement(enteringPage)
    .fill('both')
    .beforeRemoveClass('ion-page-invisible')
    .fromTo('opacity', 0.01, 1)
    .fromTo('transform', 'translateY(8px)', 'translateY(0)')
    .afterClearStyles(['opacity', 'transform']);
  transition.addAnimation(enteringAnimation);
  if (leavingPage) {
    transition.addAnimation(
      createAnimation('slotlab-page-leave')
        .addElement(leavingPage)
        .fill('both')
        .fromTo('opacity', 1, 0),
    );
  }
  return transition;
};
