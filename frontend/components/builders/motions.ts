import { gsap } from "gsap";

/* tiny helpers so SceneBuilder configs stay readable */
export const motions = {
  fadeIn: (targets: gsap.TweenTarget, dur = 0.5) =>
    gsap.fromTo(
      targets,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: dur, ease: "power2.out" }
    ),

  slideFrom: (
    targets: gsap.TweenTarget,
    { x = 0, y = 50 } = {},
    dur = 0.6
  ) =>
    gsap.fromTo(
      targets,
      { xPercent: x, yPercent: y, autoAlpha: 0 },
      { xPercent: 0, yPercent: 0, autoAlpha: 1, duration: dur, ease: "power2.out" }
    ),
};
