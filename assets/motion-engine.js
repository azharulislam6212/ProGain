 import { getLenis, animationsEnabled } from "@theme/utilities";

let initialized = false;
let gsap = null;
let ScrollTrigger = null;
let SplitText = null;
let TextPlugin = null;
let observer = null;
let lenisSynced = false;

const active = new Set();
const queue = new Map();
const completed = new Set();

const config = {
  maxActive: 10,
  maxZoom: 4,
  maxPerSection: 4,

  threshold: 0.05,
  rootMargin: "0px 0px -10% 0px",

  defaults: {
    duration: 1,
    ease: "power3.out",
  },
};

export async function initMotionEngine(scope = document) {
  if (!animationsEnabled()) return;

  if (initialized && scope === document) {
    refresh(scope);
    return;
  }

  if (!gsap) {
    const [
      gsapModule,
      scrollModule,
      splitModule,
      textModule,
    ] = await Promise.all([
      import("@theme/gsap"),
      import("@theme/ScrollTrigger"),
      import("@theme/SplitText"),
      import("@theme/TextPlugin"),
    ]);

    gsap = gsapModule.default || gsapModule.gsap || gsapModule;

    ScrollTrigger =
      scrollModule.default?.ScrollTrigger ||
      scrollModule.ScrollTrigger ||
      scrollModule.default ||
      scrollModule;

    const SplitRaw =
      splitModule.default?.SplitText ||
      splitModule.SplitText ||
      splitModule.default ||
      splitModule;

    SplitText =
      typeof SplitRaw === "function"
        ? SplitRaw
        : SplitRaw?.SplitText;

    TextPlugin =
      textModule.default?.TextPlugin ||
      textModule.TextPlugin ||
      textModule.default ||
      textModule;

    gsap.registerPlugin(
      ...[
        ScrollTrigger,
        SplitText,
        TextPlugin,
      ].filter(Boolean)
    );

    syncLenis();
  }

  if (!observer) {
    observer = new IntersectionObserver(handleIntersections, {
      threshold: config.threshold,
      rootMargin: config.rootMargin,
    });
  }

  refresh(scope);

  initialized = true;
}


function syncLenis() {
  if (lenisSynced) return;
  const lenis = getLenis();
  if (!lenis || !gsap || !ScrollTrigger) return;
  lenisSynced = true;
  lenis.on("scroll", () => {
    ScrollTrigger.update();
  });

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}


export function refresh(scope = document) {
  if (!animationsEnabled()) return;

  scope
    .querySelectorAll("motion-effect")
    .forEach(register);
}


export function register(element) {
  if (
    !animationsEnabled() ||
    !element ||
    completed.has(element) ||
    queue.has(element)
  ) {
    return;
  }

  queue.set(element, {
    type: element.dataset.motion || "fade-up",
    delay: Number(element.dataset.motionDelay || 0) /  1000,
    duration: Number(
      element.dataset.motionDuration ||
        config.defaults.duration
    ),

    ease:
      element.dataset.motionEase ||
      config.defaults.ease,
  });

  observer?.observe(element);
}


export function unregister(element) {
  observer?.unobserve(element);

  queue.delete(element);
  active.delete(element);
}


function handleIntersections(entries) {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;

    const element = entry.target;
    const data = queue.get(element);
    if (!data) return;
    if (!canRun(element, data.type)) return;

    run(element, data);
  });
}


function canRun(element, type) {
  if (active.size >= config.maxActive) {
    return false;
  }


  if (type.includes("zoom")) {
    const count = [...active].filter((el) =>
      queue.get(el)?.type?.includes("zoom")
    ).length;

    if (count >= config.maxZoom) {
      return false;
    }
  }


  const section = element.closest(
    "section,[class*='section']"
  );


  if (section) {
    const count = [...active].filter((el) =>
      section.contains(el)
    ).length;

    if (count >= config.maxPerSection) {
      return false;
    }
  }


  return true;
}


async function run(element, data) {
  if (!animationsEnabled()) return;

  active.add(element);

  observer?.unobserve(element);

  try {
    await animate(element, data);

    element.setAttribute(
      "data-motion-initialized",
      "true"
    );
  } catch (error) {
    console.error("[MotionEngine]", error);
  } finally {
    active.delete(element);
    queue.delete(element);
    completed.add(element);
  }
}


function animate(
  element,
  { type, delay, duration, ease }
) {
  const imageEffects = [
    "fade",
    "zoom-in",
    "zoom-out",
    "blur",
    "reveal",
  ];


  const target = imageEffects.includes(type)
    ? element.querySelector(".media__image") ||
      element
    : element;


  const base = {
    delay,
    duration,
    ease,
    overwrite: "auto",
  };


  switch (type) {
    case "fade-up":
      return gsap.fromTo(
        target,
        {
          autoAlpha: 0,
          y: 40,
        },
        {
          autoAlpha: 1,
          y: 0,
          ...base,
        }
      );


    case "fade-in":
      return gsap.fromTo(
        target,
        { opacity: 0 },
        {
          opacity: 1,
          ...base,
        }
      );


    case "slide-left":
      return gsap.fromTo(
        target,
        {
          opacity: 0,
          x: -50,
        },
        {
          opacity: 1,
          x: 0,
          ...base,
        }
      );


    case "slide-right":
      return gsap.fromTo(
        target,
        {
          opacity: 0,
          x: 50,
        },
        {
          opacity: 1,
          x: 0,
          ...base,
        }
      );


    case "zoom-in":
      return gsap.fromTo(
        target,
        {
          opacity: 0,
          scale: 1.12,
        },
        {
          opacity: 1,
          scale: 1,
          ...base,
        }
      );


    case "zoom-out":
      return gsap.fromTo(
        target,
        {
          opacity: 0,
          scale: 0.92,
        },
        {
          opacity: 1,
          scale: 1,
          ...base,
        }
      );


    case "blur":
      return gsap.fromTo(
        target,
        {
          opacity: 0,
          filter: "blur(12px)",
        },
        {
          opacity: 1,
          filter: "blur(0)",
          ...base,
        }
      );


    case "reveal":
      return gsap.fromTo(
        target,
        {
          clipPath: "inset(0 0 100% 0)",
        },
        {
          clipPath: "inset(0 0 0% 0)",
          ...base,
        }
      );


    case "split-text":
      if (!SplitText) return;

      return new Promise((resolve) => {
        const split = new SplitText(target, {
          type: "chars,words",
        });

        gsap.from(split.chars, {
          opacity: 0,
          yPercent: 80,
          stagger: 0.025,

          ...base,

          onComplete() {
            split.revert();
            resolve();
          },
        });
      });


    case "text":
      if (!TextPlugin) return;

      const textTarget =
        element.querySelector("[data-text]") ||
        element;

      return gsap.to(textTarget, {
        text:
          textTarget.dataset.text ||
          textTarget.textContent,

        duration,
        delay,
        ease,
      });


    default:
      return gsap.to(target, {
        opacity: 1,
        ...base,
      });
  }
}


export function replay(element) {
  if (!element) return;

  completed.delete(element);
  register(element);
}


export function clearCompleted(element) {
  completed.delete(element);
}


export function destroyMotionEngine() {
  observer?.disconnect();

  observer = null;

  active.clear();
  queue.clear();
  completed.clear();

  initialized = false;
}


export function getMotionStats() {
  return {
    initialized,

    queued: queue.size,
    active: active.size,
    completed: completed.size,

    observer: observer
      ? "initialized"
      : "not initialized",

    config,
  };
}


if (typeof window !== "undefined") {
  window.__THEME__ = window.__THEME__ || {};
  window.__THEME__.motionEngine = {
    init: initMotionEngine,
    refresh,
    replay,
    destroy: destroyMotionEngine,
    stats: getMotionStats,
  };
}

// function addUniqueItem(array, item) {
//     array.indexOf(item) === -1 && array.push(item);
// }
// const clamp = (min, max, v) => Math.min(Math.max(v, min), max),
//     defaults = { duration: 0.3, delay: 0, endDelay: 0, repeat: 0, easing: "ease" },
//     isNumber = (value) => typeof value == "number",
//     isEasingList = (easing) => Array.isArray(easing) && !isNumber(easing[0]),
//     wrap = (min, max, v) => {
//         const rangeSize = max - min;
//         return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
//     };
// function getEasingForSegment(easing, i) {
//     return isEasingList(easing) ? easing[wrap(0, easing.length, i)] : easing;
// }
// const mix = (min, max, progress2) => -progress2 * min + progress2 * max + min,
//     noop = () => {},
//     noopReturn = (v) => v,
//     progress = (min, max, value) => (max - min === 0 ? 1 : (value - min) / (max - min));
// function fillOffset(offset, remaining) {
//     const min = offset[offset.length - 1];
//     for (let i = 1; i <= remaining; i++) {
//         const offsetProgress = progress(0, remaining, i);
//         offset.push(mix(min, 1, offsetProgress));
//     }
// }
// function defaultOffset$1(length) {
//     const offset = [0];
//     return fillOffset(offset, length - 1), offset;
// }
// function interpolate(output, input = defaultOffset$1(output.length), easing = noopReturn) {
//     const length = output.length,
//         remainder = length - input.length;
//     return (
//         remainder > 0 && fillOffset(input, remainder),
//         (t) => {
//             let i = 0;
//             for (; i < length - 2 && !(t < input[i + 1]); i++);
//             let progressInRange = clamp(0, 1, progress(input[i], input[i + 1], t));
//             return (
//                 (progressInRange = getEasingForSegment(easing, i)(progressInRange)),
//                 mix(output[i], output[i + 1], progressInRange)
//             );
//         }
//     );
// }
// const isCubicBezier = (easing) => Array.isArray(easing) && isNumber(easing[0]),
//     isEasingGenerator = (easing) => typeof easing == "object" && !!easing.createAnimation,
//     isFunction = (value) => typeof value == "function",
//     isString = (value) => typeof value == "string",
//     time = { ms: (seconds) => seconds * 1e3, s: (milliseconds) => milliseconds / 1e3 };
// function velocityPerSecond(velocity, frameDuration) {
//     return frameDuration ? velocity * (1e3 / frameDuration) : 0;
// }
// const calcBezier = (t, a1, a2) => (((1 - 3 * a2 + 3 * a1) * t + (3 * a2 - 6 * a1)) * t + 3 * a1) * t,
//     subdivisionPrecision = 1e-7,
//     subdivisionMaxIterations = 12;
// function binarySubdivide(x, lowerBound, upperBound, mX1, mX2) {
//     let currentX,
//         currentT,
//         i = 0;
//     do
//         (currentT = lowerBound + (upperBound - lowerBound) / 2),
//             (currentX = calcBezier(currentT, mX1, mX2) - x),
//             currentX > 0 ? (upperBound = currentT) : (lowerBound = currentT);
//     while (Math.abs(currentX) > subdivisionPrecision && ++i < subdivisionMaxIterations);
//     return currentT;
// }
// function cubicBezier(mX1, mY1, mX2, mY2) {
//     if (mX1 === mY1 && mX2 === mY2) return noopReturn;
//     const getTForX = (aX) => binarySubdivide(aX, 0, 1, mX1, mX2);
//     return (t) => (t === 0 || t === 1 ? t : calcBezier(getTForX(t), mY1, mY2));
// }
// const steps =
//         (steps2, direction = "end") =>
//         (progress2) => {
//             progress2 = direction === "end" ? Math.min(progress2, 0.999) : Math.max(progress2, 0.001);
//             const expanded = progress2 * steps2,
//                 rounded = direction === "end" ? Math.floor(expanded) : Math.ceil(expanded);
//             return clamp(0, 1, rounded / steps2);
//         },
//     namedEasings = {
//         ease: cubicBezier(0.25, 0.1, 0.25, 1),
//         "ease-in": cubicBezier(0.42, 0, 1, 1),
//         "ease-in-out": cubicBezier(0.42, 0, 0.58, 1),
//         "ease-out": cubicBezier(0, 0, 0.58, 1),
//     },
//     functionArgsRegex = /\((.*?)\)/;
// function getEasingFunction(definition) {
//     if (isFunction(definition)) return definition;
//     if (isCubicBezier(definition)) return cubicBezier(...definition);
//     const namedEasing = namedEasings[definition];
//     if (namedEasing) return namedEasing;
//     if (definition.startsWith("steps")) {
//         const args = functionArgsRegex.exec(definition);
//         if (args) {
//             const argsArray = args[1].split(",");
//             return steps(parseFloat(argsArray[0]), argsArray[1].trim());
//         }
//     }
//     return noopReturn;
// }
// class Animation {
//     constructor(
//         output,
//         keyframes = [0, 1],
//         {
//             easing,
//             duration: initialDuration = defaults.duration,
//             delay = defaults.delay,
//             endDelay = defaults.endDelay,
//             repeat = defaults.repeat,
//             offset,
//             direction = "normal",
//             autoplay = !0,
//         } = {}
//     ) {
//         if (
//             ((this.startTime = null),
//             (this.rate = 1),
//             (this.t = 0),
//             (this.cancelTimestamp = null),
//             (this.easing = noopReturn),
//             (this.duration = 0),
//             (this.totalDuration = 0),
//             (this.repeat = 0),
//             (this.playState = "idle"),
//             (this.finished = new Promise((resolve, reject) => {
//                 (this.resolve = resolve), (this.reject = reject);
//             })),
//             (easing = easing || defaults.easing),
//             isEasingGenerator(easing))
//         ) {
//             const custom = easing.createAnimation(keyframes);
//             (easing = custom.easing),
//                 (keyframes = custom.keyframes || keyframes),
//                 (initialDuration = custom.duration || initialDuration);
//         }
//         (this.repeat = repeat),
//             (this.easing = isEasingList(easing) ? noopReturn : getEasingFunction(easing)),
//             this.updateDuration(initialDuration);
//         const interpolate$1 = interpolate(
//             keyframes,
//             offset,
//             isEasingList(easing) ? easing.map(getEasingFunction) : noopReturn
//         );
//         (this.tick = (timestamp) => {
//             var _a;
//             delay = delay;
//             let t = 0;
//             this.pauseTime !== void 0 ? (t = this.pauseTime) : (t = (timestamp - this.startTime) * this.rate),
//                 (this.t = t),
//                 (t /= 1e3),
//                 (t = Math.max(t - delay, 0)),
//                 this.playState === "finished" && this.pauseTime === void 0 && (t = this.totalDuration);
//             const progress2 = t / this.duration;
//             let currentIteration = Math.floor(progress2),
//                 iterationProgress = progress2 % 1;
//             !iterationProgress && progress2 >= 1 && (iterationProgress = 1),
//                 iterationProgress === 1 && currentIteration--;
//             const iterationIsOdd = currentIteration % 2;
//             (direction === "reverse" ||
//                 (direction === "alternate" && iterationIsOdd) ||
//                 (direction === "alternate-reverse" && !iterationIsOdd)) &&
//                 (iterationProgress = 1 - iterationProgress);
//             const p = t >= this.totalDuration ? 1 : Math.min(iterationProgress, 1),
//                 latest = interpolate$1(this.easing(p));
//             output(latest),
//                 this.pauseTime === void 0 && (this.playState === "finished" || t >= this.totalDuration + endDelay)
//                     ? ((this.playState = "finished"),
//                       (_a = this.resolve) === null || _a === void 0 || _a.call(this, latest))
//                     : this.playState !== "idle" && (this.frameRequestId = requestAnimationFrame(this.tick));
//         }),
//             autoplay && this.play();
//     }
//     play() {
//         const now = performance.now();
//         (this.playState = "running"),
//             this.pauseTime !== void 0
//                 ? (this.startTime = now - this.pauseTime)
//                 : this.startTime || (this.startTime = now),
//             (this.cancelTimestamp = this.startTime),
//             (this.pauseTime = void 0),
//             (this.frameRequestId = requestAnimationFrame(this.tick));
//     }
//     pause() {
//         (this.playState = "paused"), (this.pauseTime = this.t);
//     }
//     finish() {
//         (this.playState = "finished"), this.tick(0);
//     }
//     stop() {
//         var _a;
//         (this.playState = "idle"),
//             this.frameRequestId !== void 0 && cancelAnimationFrame(this.frameRequestId),
//             (_a = this.reject) === null || _a === void 0 || _a.call(this, !1);
//     }
//     cancel() {
//         this.stop(), this.tick(this.cancelTimestamp);
//     }
//     reverse() {
//         this.rate *= -1;
//     }
//     commitStyles() {}
//     updateDuration(duration) {
//         (this.duration = duration), (this.totalDuration = duration * (this.repeat + 1));
//     }
//     get currentTime() {
//         return this.t;
//     }
//     set currentTime(t) {
//         this.pauseTime !== void 0 || this.rate === 0
//             ? (this.pauseTime = t)
//             : (this.startTime = performance.now() - t / this.rate);
//     }
//     get playbackRate() {
//         return this.rate;
//     }
//     set playbackRate(rate) {
//         this.rate = rate;
//     }
// }
// class MotionValue {
//     setAnimation(animation) {
//         (this.animation = animation), animation?.finished.then(() => this.clearAnimation()).catch(() => {});
//     }
//     clearAnimation() {
//         this.animation = this.generator = void 0;
//     }
// }
// const data = new WeakMap();
// function getAnimationData(element) {
//     return data.has(element) || data.set(element, { transforms: [], values: new Map() }), data.get(element);
// }
// function getMotionValue(motionValues, name) {
//     return motionValues.has(name) || motionValues.set(name, new MotionValue()), motionValues.get(name);
// }
// const axes = ["", "X", "Y", "Z"],
//     order = ["translate", "scale", "rotate", "skew"],
//     transformAlias = { x: "translateX", y: "translateY", z: "translateZ" },
//     rotation = { syntax: "<angle>", initialValue: "0deg", toDefaultUnit: (v) => v + "deg" },
//     baseTransformProperties = {
//         translate: { syntax: "<length-percentage>", initialValue: "0px", toDefaultUnit: (v) => v + "px" },
//         rotate: rotation,
//         scale: { syntax: "<number>", initialValue: 1, toDefaultUnit: noopReturn },
//         skew: rotation,
//     },
//     transformDefinitions = new Map(),
//     asTransformCssVar = (name) => `--motion-${name}`,
//     transforms = ["x", "y", "z"];
// order.forEach((name) => {
//     axes.forEach((axis) => {
//         transforms.push(name + axis),
//             transformDefinitions.set(asTransformCssVar(name + axis), baseTransformProperties[name]);
//     });
// });
// const compareTransformOrder = (a, b) => transforms.indexOf(a) - transforms.indexOf(b),
//     transformLookup = new Set(transforms),
//     isTransform = (name) => transformLookup.has(name),
//     addTransformToElement = (element, name) => {
//         transformAlias[name] && (name = transformAlias[name]);
//         const { transforms: transforms2 } = getAnimationData(element);
//         addUniqueItem(transforms2, name), (element.style.transform = buildTransformTemplate(transforms2));
//     },
//     buildTransformTemplate = (transforms2) =>
//         transforms2.sort(compareTransformOrder).reduce(transformListToString, "").trim(),
//     transformListToString = (template, name) => `${template} ${name}(var(${asTransformCssVar(name)}))`,
//     isCssVar = (name) => name.startsWith("--"),
//     registeredProperties = new Set();
// function registerCssVariable(name) {
//     if (!registeredProperties.has(name)) {
//         registeredProperties.add(name);
//         try {
//             const { syntax, initialValue } = transformDefinitions.has(name) ? transformDefinitions.get(name) : {};
//             CSS.registerProperty({ name, inherits: !1, syntax, initialValue });
//         } catch {}
//     }
// }
// const testAnimation = (keyframes, options) => document.createElement("div").animate(keyframes, options),
//     featureTests = {
//         cssRegisterProperty: () => typeof CSS < "u" && Object.hasOwnProperty.call(CSS, "registerProperty"),
//         waapi: () => Object.hasOwnProperty.call(Element.prototype, "animate"),
//         partialKeyframes: () => {
//             try {
//                 testAnimation({ opacity: [1] });
//             } catch {
//                 return !1;
//             }
//             return !0;
//         },
//         finished: () => !!testAnimation({ opacity: [0, 1] }, { duration: 0.001 }).finished,
//         linearEasing: () => {
//             try {
//                 testAnimation({ opacity: 0 }, { easing: "linear(0, 1)" });
//             } catch {
//                 return !1;
//             }
//             return !0;
//         },
//     },
//     results = {},
//     supports = {};
// for (const key in featureTests)
//     supports[key] = () => (results[key] === void 0 && (results[key] = featureTests[key]()), results[key]);
// const resolution = 0.015,
//     generateLinearEasingPoints = (easing, duration) => {
//         let points = "";
//         const numPoints = Math.round(duration / resolution);
//         for (let i = 0; i < numPoints; i++) points += easing(progress(0, numPoints - 1, i)) + ", ";
//         return points.substring(0, points.length - 2);
//     },
//     convertEasing = (easing, duration) =>
//         isFunction(easing)
//             ? supports.linearEasing()
//                 ? `linear(${generateLinearEasingPoints(easing, duration)})`
//                 : defaults.easing
//             : isCubicBezier(easing)
//               ? cubicBezierAsString(easing)
//               : easing,
//     cubicBezierAsString = ([a, b, c, d]) => `cubic-bezier(${a}, ${b}, ${c}, ${d})`;
// function hydrateKeyframes(keyframes, readInitialValue) {
//     for (let i = 0; i < keyframes.length; i++)
//         keyframes[i] === null && (keyframes[i] = i ? keyframes[i - 1] : readInitialValue());
//     return keyframes;
// }
// const keyframesList = (keyframes) => (Array.isArray(keyframes) ? keyframes : [keyframes]);
// function getStyleName(key) {
//     return transformAlias[key] && (key = transformAlias[key]), isTransform(key) ? asTransformCssVar(key) : key;
// }
// const style = {
//     get: (element, name) => {
//         name = getStyleName(name);
//         let value = isCssVar(name) ? element.style.getPropertyValue(name) : getComputedStyle(element)[name];
//         if (!value && value !== 0) {
//             const definition = transformDefinitions.get(name);
//             definition && (value = definition.initialValue);
//         }
//         return value;
//     },
//     set: (element, name, value) => {
//         (name = getStyleName(name)),
//             isCssVar(name) ? element.style.setProperty(name, value) : (element.style[name] = value);
//     },
// };
// function stopAnimation(animation, needsCommit = !0) {
//     if (!(!animation || animation.playState === "finished"))
//         try {
//             animation.stop ? animation.stop() : (needsCommit && animation.commitStyles(), animation.cancel());
//         } catch {}
// }
// function getUnitConverter(keyframes, definition) {
//     var _a;
//     let toUnit = definition?.toDefaultUnit || noopReturn;
//     const finalKeyframe = keyframes[keyframes.length - 1];
//     if (isString(finalKeyframe)) {
//         const unit =
//             ((_a = finalKeyframe.match(/(-?[\d.]+)([a-z%]*)/)) === null || _a === void 0 ? void 0 : _a[2]) || "";
//         unit && (toUnit = (value) => value + unit);
//     }
//     return toUnit;
// }
// function getDevToolsRecord() {
//     return window.__MOTION_DEV_TOOLS_RECORD;
// }
// function animateStyle(element, key, keyframesDefinition, options = {}, AnimationPolyfill) {
//     const record = getDevToolsRecord(),
//         isRecording = options.record !== !1 && record;
//     let animation,
//         {
//             duration = defaults.duration,
//             delay = defaults.delay,
//             endDelay = defaults.endDelay,
//             repeat = defaults.repeat,
//             easing = defaults.easing,
//             persist = !1,
//             direction,
//             offset,
//             allowWebkitAcceleration = !1,
//             autoplay = !0,
//         } = options;
//     const data2 = getAnimationData(element),
//         valueIsTransform = isTransform(key);
//     let canAnimateNatively = supports.waapi();
//     valueIsTransform && addTransformToElement(element, key);
//     const name = getStyleName(key),
//         motionValue = getMotionValue(data2.values, name),
//         definition = transformDefinitions.get(name);
//     return (
//         stopAnimation(
//             motionValue.animation,
//             !(isEasingGenerator(easing) && motionValue.generator) && options.record !== !1
//         ),
//         () => {
//             const readInitialValue = () => {
//                 var _a, _b;
//                 return (_b =
//                     (_a = style.get(element, name)) !== null && _a !== void 0 ? _a : definition?.initialValue) !==
//                     null && _b !== void 0
//                     ? _b
//                     : 0;
//             };
//             let keyframes = hydrateKeyframes(keyframesList(keyframesDefinition), readInitialValue);
//             const toUnit = getUnitConverter(keyframes, definition);
//             if (isEasingGenerator(easing)) {
//                 const custom = easing.createAnimation(
//                     keyframes,
//                     key !== "opacity",
//                     readInitialValue,
//                     name,
//                     motionValue
//                 );
//                 (easing = custom.easing),
//                     (keyframes = custom.keyframes || keyframes),
//                     (duration = custom.duration || duration);
//             }
//             if (
//                 (isCssVar(name) &&
//                     (supports.cssRegisterProperty() ? registerCssVariable(name) : (canAnimateNatively = !1)),
//                 valueIsTransform &&
//                     !supports.linearEasing() &&
//                     (isFunction(easing) || (isEasingList(easing) && easing.some(isFunction))) &&
//                     (canAnimateNatively = !1),
//                 canAnimateNatively)
//             ) {
//                 definition &&
//                     (keyframes = keyframes.map((value) => (isNumber(value) ? definition.toDefaultUnit(value) : value))),
//                     keyframes.length === 1 &&
//                         (!supports.partialKeyframes() || isRecording) &&
//                         keyframes.unshift(readInitialValue());
//                 const animationOptions = {
//                     delay: time.ms(delay),
//                     duration: time.ms(duration),
//                     endDelay: time.ms(endDelay),
//                     easing: isEasingList(easing) ? void 0 : convertEasing(easing, duration),
//                     direction,
//                     iterations: repeat + 1,
//                     fill: "both",
//                 };
//                 (animation = element.animate(
//                     {
//                         [name]: keyframes,
//                         offset,
//                         easing: isEasingList(easing)
//                             ? easing.map((thisEasing) => convertEasing(thisEasing, duration))
//                             : void 0,
//                     },
//                     animationOptions
//                 )),
//                     animation.finished ||
//                         (animation.finished = new Promise((resolve, reject) => {
//                             (animation.onfinish = resolve), (animation.oncancel = reject);
//                         }));
//                 const target = keyframes[keyframes.length - 1];
//                 animation.finished
//                     .then(() => {
//                         persist || (style.set(element, name, target), animation.cancel());
//                     })
//                     .catch(noop),
//                     allowWebkitAcceleration || (animation.playbackRate = 1.000001);
//             } else if (AnimationPolyfill && valueIsTransform)
//                 (keyframes = keyframes.map((value) => (typeof value == "string" ? parseFloat(value) : value))),
//                     keyframes.length === 1 && keyframes.unshift(parseFloat(readInitialValue())),
//                     (animation = new AnimationPolyfill(
//                         (latest) => {
//                             style.set(element, name, toUnit ? toUnit(latest) : latest);
//                         },
//                         keyframes,
//                         Object.assign(Object.assign({}, options), { duration, easing })
//                     ));
//             else {
//                 const target = keyframes[keyframes.length - 1];
//                 style.set(element, name, definition && isNumber(target) ? definition.toDefaultUnit(target) : target);
//             }
//             return (
//                 isRecording &&
//                     record(element, key, keyframes, { duration, delay, easing, repeat, offset }, "motion-one"),
//                 motionValue.setAnimation(animation),
//                 animation && !autoplay && animation.pause(),
//                 animation
//             );
//         }
//     );
// }
// const getOptions = (options, key) =>
//     options[key] ? Object.assign(Object.assign({}, options), options[key]) : Object.assign({}, options);
// function resolveElements(elements, selectorCache) {
//     return (
//         typeof elements == "string"
//             ? (elements = document.querySelectorAll(elements))
//             : elements instanceof Element && (elements = [elements]),
//         Array.from(elements || [])
//     );
// }
// const createAnimation = (factory) => factory(),
//     withControls = (animationFactory, options, duration = defaults.duration) =>
//         new Proxy({ animations: animationFactory.map(createAnimation).filter(Boolean), duration, options }, controls),
//     getActiveAnimation = (state) => state.animations[0],
//     controls = {
//         get: (target, key) => {
//             const activeAnimation = getActiveAnimation(target);
//             switch (key) {
//                 case "duration":
//                     return target.duration;
//                 case "currentTime":
//                     return time.s(activeAnimation?.[key] || 0);
//                 case "playbackRate":
//                 case "playState":
//                     return activeAnimation?.[key];
//                 case "finished":
//                     return (
//                         target.finished ||
//                             (target.finished = Promise.all(target.animations.map(selectFinished)).catch(noop)),
//                         target.finished
//                     );
//                 case "stop":
//                     return () => {
//                         target.animations.forEach((animation) => stopAnimation(animation));
//                     };
//                 case "forEachNative":
//                     return (callback) => {
//                         target.animations.forEach((animation) => callback(animation, target));
//                     };
//                 default:
//                     return typeof activeAnimation?.[key] > "u"
//                         ? void 0
//                         : () => target.animations.forEach((animation) => animation[key]());
//             }
//         },
//         set: (target, key, value) => {
//             switch (key) {
//                 case "currentTime":
//                     value = time.ms(value);
//                 case "playbackRate":
//                     for (let i = 0; i < target.animations.length; i++) target.animations[i][key] = value;
//                     return !0;
//             }
//             return !1;
//         },
//     },
//     selectFinished = (animation) => animation.finished;
// function stagger(duration = 0.1, { start = 0, from = 0, easing } = {}) {
//     return (i, total) => {
//         const fromIndex = isNumber(from) ? from : getFromIndex(from, total),
//             distance = Math.abs(fromIndex - i);
//         let delay = duration * distance;
//         if (easing) {
//             const maxDelay = total * duration;
//             delay = getEasingFunction(easing)(delay / maxDelay) * maxDelay;
//         }
//         return start + delay;
//     };
// }
// function getFromIndex(from, total) {
//     if (from === "first") return 0;
//     {
//         const lastIndex = total - 1;
//         return from === "last" ? lastIndex : lastIndex / 2;
//     }
// }
// function resolveOption(option, i, total) {
//     return isFunction(option) ? option(i, total) : option;
// }
// function createAnimate(AnimatePolyfill) {
//     return function (elements, keyframes, options = {}) {
//         elements = resolveElements(elements);
//         const numElements = elements.length,
//             animationFactories = [];
//         for (let i = 0; i < numElements; i++) {
//             const element = elements[i];
//             for (const key in keyframes) {
//                 const valueOptions = getOptions(options, key);
//                 valueOptions.delay = resolveOption(valueOptions.delay, i, numElements);
//                 const animation = animateStyle(element, key, keyframes[key], valueOptions, AnimatePolyfill);
//                 animationFactories.push(animation);
//             }
//         }
//         return withControls(animationFactories, options, options.duration);
//     };
// }
// const animate$1 = createAnimate(Animation);
// function __rest(s, e) {
//     var t = {};
//     for (var p in s) Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0 && (t[p] = s[p]);
//     if (s != null && typeof Object.getOwnPropertySymbols == "function")
//         for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++)
//             e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]) && (t[p[i]] = s[p[i]]);
//     return t;
// }
// typeof SuppressedError == "function" && SuppressedError;
// const thresholds = { any: 0, all: 1 };
// function inView(elementOrSelector, onStart, { root, margin: rootMargin, amount = "any" } = {}) {
//     if (typeof IntersectionObserver > "u") return () => {};
//     const elements = resolveElements(elementOrSelector),
//         activeIntersections = new WeakMap(),
//         onIntersectionChange = (entries) => {
//             entries.forEach((entry) => {
//                 const onEnd = activeIntersections.get(entry.target);
//                 if (entry.isIntersecting !== !!onEnd)
//                     if (entry.isIntersecting) {
//                         const newOnEnd = onStart(entry);
//                         isFunction(newOnEnd)
//                             ? activeIntersections.set(entry.target, newOnEnd)
//                             : observer2.unobserve(entry.target);
//                     } else onEnd && (onEnd(entry), activeIntersections.delete(entry.target));
//             });
//         },
//         observer2 = new IntersectionObserver(onIntersectionChange, {
//             root,
//             rootMargin,
//             threshold: typeof amount == "number" ? amount : thresholds[amount],
//         });
//     return elements.forEach((element) => observer2.observe(element)), () => observer2.disconnect();
// }
// const resizeHandlers = new WeakMap();
// let observer;
// function getElementSize(target, borderBoxSize) {
//     if (borderBoxSize) {
//         const { inlineSize, blockSize } = borderBoxSize[0];
//         return { width: inlineSize, height: blockSize };
//     } else
//         return target instanceof SVGElement && "getBBox" in target
//             ? target.getBBox()
//             : { width: target.offsetWidth, height: target.offsetHeight };
// }
// function notifyTarget({ target, contentRect, borderBoxSize }) {
//     var _a;
//     (_a = resizeHandlers.get(target)) === null ||
//         _a === void 0 ||
//         _a.forEach((handler) => {
//             handler({
//                 target,
//                 contentSize: contentRect,
//                 get size() {
//                     return getElementSize(target, borderBoxSize);
//                 },
//             });
//         });
// }
// function notifyAll(entries) {
//     entries.forEach(notifyTarget);
// }
// function createResizeObserver() {
//     typeof ResizeObserver > "u" || (observer = new ResizeObserver(notifyAll));
// }
// function resizeElement(target, handler) {
//     observer || createResizeObserver();
//     const elements = resolveElements(target);
//     return (
//         elements.forEach((element) => {
//             let elementHandlers = resizeHandlers.get(element);
//             elementHandlers || ((elementHandlers = new Set()), resizeHandlers.set(element, elementHandlers)),
//                 elementHandlers.add(handler),
//                 observer?.observe(element);
//         }),
//         () => {
//             elements.forEach((element) => {
//                 const elementHandlers = resizeHandlers.get(element);
//                 elementHandlers?.delete(handler), elementHandlers?.size || observer?.unobserve(element);
//             });
//         }
//     );
// }
// const windowCallbacks = new Set();
// let windowResizeHandler;
// function createWindowResizeHandler() {
//     (windowResizeHandler = () => {
//         const size = { width: window.innerWidth, height: window.innerHeight },
//             info = { target: window, size, contentSize: size };
//         windowCallbacks.forEach((callback) => callback(info));
//     }),
//         window.addEventListener("resize", windowResizeHandler);
// }
// function resizeWindow(callback) {
//     return (
//         windowCallbacks.add(callback),
//         windowResizeHandler || createWindowResizeHandler(),
//         () => {
//             windowCallbacks.delete(callback),
//                 !windowCallbacks.size && windowResizeHandler && (windowResizeHandler = void 0);
//         }
//     );
// }
// function resize(a, b) {
//     return isFunction(a) ? resizeWindow(a) : resizeElement(a, b);
// }
// const maxElapsed = 50,
//     createAxisInfo = () => ({
//         current: 0,
//         offset: [],
//         progress: 0,
//         scrollLength: 0,
//         targetOffset: 0,
//         targetLength: 0,
//         containerLength: 0,
//         velocity: 0,
//     }),
//     createScrollInfo = () => ({ time: 0, x: createAxisInfo(), y: createAxisInfo() }),
//     keys = { x: { length: "Width", position: "Left" }, y: { length: "Height", position: "Top" } };
// function updateAxisInfo(element, axisName, info, time2) {
//     const axis = info[axisName],
//         { length, position } = keys[axisName],
//         prev = axis.current,
//         prevTime = info.time;
//     (axis.current = element[`scroll${position}`]),
//         (axis.scrollLength = element[`scroll${length}`] - element[`client${length}`]),
//         (axis.offset.length = 0),
//         (axis.offset[0] = 0),
//         (axis.offset[1] = axis.scrollLength),
//         (axis.progress = progress(0, axis.scrollLength, axis.current));
//     const elapsed = time2 - prevTime;
//     axis.velocity = elapsed > maxElapsed ? 0 : velocityPerSecond(axis.current - prev, elapsed);
// }
// function updateScrollInfo(element, info, time2) {
//     updateAxisInfo(element, "x", info, time2), updateAxisInfo(element, "y", info, time2), (info.time = time2);
// }
// function calcInset(element, container) {
//     let inset = { x: 0, y: 0 },
//         current = element;
//     for (; current && current !== container; )
//         if (current instanceof HTMLElement)
//             (inset.x += current.offsetLeft), (inset.y += current.offsetTop), (current = current.offsetParent);
//         else if (current instanceof SVGGraphicsElement && "getBBox" in current) {
//             const { top, left } = current.getBBox();
//             for (inset.x += left, inset.y += top; current && current.tagName !== "svg"; ) current = current.parentNode;
//         }
//     return inset;
// }
// const ScrollOffset = {
//         All: [
//             [0, 0],
//             [1, 1],
//         ],
//     },
//     namedEdges = { start: 0, center: 0.5, end: 1 };
// function resolveEdge(edge, length, inset = 0) {
//     let delta = 0;
//     if ((namedEdges[edge] !== void 0 && (edge = namedEdges[edge]), isString(edge))) {
//         const asNumber = parseFloat(edge);
//         edge.endsWith("px")
//             ? (delta = asNumber)
//             : edge.endsWith("%")
//               ? (edge = asNumber / 100)
//               : edge.endsWith("vw")
//                 ? (delta = (asNumber / 100) * document.documentElement.clientWidth)
//                 : edge.endsWith("vh")
//                   ? (delta = (asNumber / 100) * document.documentElement.clientHeight)
//                   : (edge = asNumber);
//     }
//     return isNumber(edge) && (delta = length * edge), inset + delta;
// }
// const defaultOffset = [0, 0];
// function resolveOffset(offset, containerLength, targetLength, targetInset) {
//     let offsetDefinition = Array.isArray(offset) ? offset : defaultOffset,
//         targetPoint = 0,
//         containerPoint = 0;
//     return (
//         isNumber(offset)
//             ? (offsetDefinition = [offset, offset])
//             : isString(offset) &&
//               ((offset = offset.trim()),
//               offset.includes(" ")
//                   ? (offsetDefinition = offset.split(" "))
//                   : (offsetDefinition = [offset, namedEdges[offset] ? offset : "0"])),
//         (targetPoint = resolveEdge(offsetDefinition[0], targetLength, targetInset)),
//         (containerPoint = resolveEdge(offsetDefinition[1], containerLength)),
//         targetPoint - containerPoint
//     );
// }
// const point = { x: 0, y: 0 };
// function resolveOffsets(container, info, options) {
//     let { offset: offsetDefinition = ScrollOffset.All } = options;
//     const { target = container, axis = "y" } = options,
//         lengthLabel = axis === "y" ? "height" : "width",
//         inset = target !== container ? calcInset(target, container) : point,
//         targetSize =
//             target === container
//                 ? { width: container.scrollWidth, height: container.scrollHeight }
//                 : { width: target.clientWidth, height: target.clientHeight },
//         containerSize = { width: container.clientWidth, height: container.clientHeight };
//     info[axis].offset.length = 0;
//     let hasChanged = !info[axis].interpolate;
//     const numOffsets = offsetDefinition.length;
//     for (let i = 0; i < numOffsets; i++) {
//         const offset = resolveOffset(
//             offsetDefinition[i],
//             containerSize[lengthLabel],
//             targetSize[lengthLabel],
//             inset[axis]
//         );
//         !hasChanged && offset !== info[axis].interpolatorOffsets[i] && (hasChanged = !0),
//             (info[axis].offset[i] = offset);
//     }
//     hasChanged &&
//         ((info[axis].interpolate = interpolate(defaultOffset$1(numOffsets), info[axis].offset)),
//         (info[axis].interpolatorOffsets = [...info[axis].offset])),
//         (info[axis].progress = info[axis].interpolate(info[axis].current));
// }
// function measure(container, target = container, info) {
//     if (((info.x.targetOffset = 0), (info.y.targetOffset = 0), target !== container)) {
//         let node = target;
//         for (; node && node != container; )
//             (info.x.targetOffset += node.offsetLeft),
//                 (info.y.targetOffset += node.offsetTop),
//                 (node = node.offsetParent);
//     }
//     (info.x.targetLength = target === container ? target.scrollWidth : target.clientWidth),
//         (info.y.targetLength = target === container ? target.scrollHeight : target.clientHeight),
//         (info.x.containerLength = container.clientWidth),
//         (info.y.containerLength = container.clientHeight);
// }
// function createOnScrollHandler(element, onScroll, info, options = {}) {
//     const axis = options.axis || "y";
//     return {
//         measure: () => measure(element, options.target, info),
//         update: (time2) => {
//             updateScrollInfo(element, info, time2),
//                 (options.offset || options.target) && resolveOffsets(element, info, options);
//         },
//         notify: isFunction(onScroll) ? () => onScroll(info) : scrubAnimation(onScroll, info[axis]),
//     };
// }
// function scrubAnimation(controls2, axisInfo) {
//     return (
//         controls2.pause(),
//         controls2.forEachNative((animation, { easing }) => {
//             var _a, _b;
//             if (animation.updateDuration) easing || (animation.easing = noopReturn), animation.updateDuration(1);
//             else {
//                 const timingOptions = { duration: 1e3 };
//                 easing || (timingOptions.easing = "linear"),
//                     (_b = (_a = animation.effect) === null || _a === void 0 ? void 0 : _a.updateTiming) === null ||
//                         _b === void 0 ||
//                         _b.call(_a, timingOptions);
//             }
//         }),
//         () => {
//             controls2.currentTime = axisInfo.progress;
//         }
//     );
// }
// const scrollListeners = new WeakMap(),
//     resizeListeners = new WeakMap(),
//     onScrollHandlers = new WeakMap(),
//     getEventTarget = (element) => (element === document.documentElement ? window : element);
// function scroll(onScroll, _a = {}) {
//     var { container = document.documentElement } = _a,
//         options = __rest(_a, ["container"]);
//     let containerHandlers = onScrollHandlers.get(container);
//     containerHandlers || ((containerHandlers = new Set()), onScrollHandlers.set(container, containerHandlers));
//     const info = createScrollInfo(),
//         containerHandler = createOnScrollHandler(container, onScroll, info, options);
//     if ((containerHandlers.add(containerHandler), !scrollListeners.has(container))) {
//         const listener2 = () => {
//             const time2 = performance.now();
//             for (const handler of containerHandlers) handler.measure();
//             for (const handler of containerHandlers) handler.update(time2);
//             for (const handler of containerHandlers) handler.notify();
//         };
//         scrollListeners.set(container, listener2);
//         const target = getEventTarget(container);
//         window.addEventListener("resize", listener2, { passive: !0 }),
//             container !== document.documentElement && resizeListeners.set(container, resize(container, listener2)),
//             target.addEventListener("scroll", listener2, { passive: !0 });
//     }
//     const listener = scrollListeners.get(container),
//         onLoadProcesss = requestAnimationFrame(listener);
//     return () => {
//         var _a2;
//         typeof onScroll != "function" && onScroll.stop(), cancelAnimationFrame(onLoadProcesss);
//         const containerHandlers2 = onScrollHandlers.get(container);
//         if (!containerHandlers2 || (containerHandlers2.delete(containerHandler), containerHandlers2.size)) return;
//         const listener2 = scrollListeners.get(container);
//         scrollListeners.delete(container),
//             listener2 &&
//                 (getEventTarget(container).removeEventListener("scroll", listener2),
//                 (_a2 = resizeListeners.get(container)) === null || _a2 === void 0 || _a2(),
//                 window.removeEventListener("resize", listener2));
//     };
// }
// function animateProgress(target, options = {}) {
//     return withControls(
//         [
//             () => {
//                 const animation = new Animation(target, [0, 1], options);
//                 return animation.finished.catch(() => {}), animation;
//             },
//         ],
//         options,
//         options.duration
//     );
// }
// function animate(target, keyframesOrOptions, options) {
//     return (isFunction(target) ? animateProgress : animate$1)(target, keyframesOrOptions, options);
// }
// export { animate, inView, scroll, stagger }; 