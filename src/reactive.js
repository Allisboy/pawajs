export let activeEffect = null;
export const targetMap = new WeakMap();
export const listeners = new WeakMap();
let queue = new Map();
let isFlushing = false;

export const TransMap = new Map();
export const deleteEffect = new Set();

const getDev = () =>
  typeof globalThis !== 'undefined' ? globalThis.__pawaDev : null;

export const runWithEffect = (effect, fn) => {
  cleanupEffect(fn);
  const prev = activeEffect;
  activeEffect = effect;
  try {
    return fn();
  } finally {
    activeEffect = prev;
  }
};

const scheduled = new Set();
let rafScheduled = false;
const FRAME_BUDGET = 16; // milliseconds per frame
let scheduleInProgress = false;

/**
 * Runs the cleanup returned by the PREVIOUS run of an effect (if any).
 * Called right before a rerun and on teardown, never right after the
 * effect's own run.
 */
function runCleanup(effect, slot = '_cleanup') {
  const c = effect[slot];
  effect[slot] = null;
  if (typeof c === 'function') {
    try {
      c();
    } catch (error) {
      errorControl(error);
    }
  }
}

/**
 * Runs the effect's `update` (side effect) callback. Its returned function
 * is stored, then run before the next run and on teardown, never right away.
 */
function runSideEffect(effect) {
  if (!effect._sideEffect) return;
  runCleanup(effect, '_sideCleanup'); // previous run's cleanup
  const c = effect._sideEffect();
  if (typeof c === 'function') effect._sideCleanup = c; // store, don't call
}

function runEffectNow(fn) {
  try {
    if (fn?._killed) return;
    const graph = fn?.el;
    if (graph && graph.kill) return;
    if (graph && !graph.active && Array.isArray(graph?.unActive)) {
      const i = graph.unActive.indexOf(fn);
      if (i !== -1) graph.unActive.splice(i, 1);
      graph.unActive.push(fn);
      return;
    }
    // The effect stores its own cleanup (see createEffect), so we just run it.
    fn();
    runSideEffect(fn);
  } catch (error) {
    errorControl(error);
  }
}

function scheduleRenderWithTimeBudget() {
  // Avoid scheduling if nothing to run or already scheduled
  if (scheduled.size === 0 || rafScheduled || scheduleInProgress) return;
  rafScheduled = true;
  scheduleInProgress = true;
  performance.mark('update-start');
  requestAnimationFrame((timestamp) => {
    const start = timestamp;
    const processed = [];

    for (const fn of scheduled) {
      runEffectNow(fn);
      processed.push(fn);
      if (performance.now() - start > FRAME_BUDGET) {
        break; // Defer remaining to next frame
      }
    }

    // Cleanup only processed effects
    for (const fn of processed) {
      scheduled.delete(fn);
    }

    rafScheduled = false;
    // If more effects remain, schedule next frame
    if (scheduled.size > 0) {
      scheduleInProgress = false;
      requestAnimationFrame(scheduleRenderWithTimeBudget);
    } else {
      scheduleInProgress = false;
      performance.mark('update-end');
      performance.measure('ScheduleRender', 'update-start', 'update-end');
      const [measure] = performance.getEntriesByName('ScheduleRender');
      const dev = getDev();
      if (dev && dev.tool && measure) {
        if (dev.performance.effectTime.length === 10) {
          dev.performance.effectTime = [];
        }
        dev.performance.effectTime.push(measure.duration.toFixed(2));
      }
      performance.clearMarks();
      performance.clearMeasures();
    }
  });
}

export const queueEffect = (effect, depsMap, schedule = false) => {
  queue.set(effect, schedule || queue.get(effect) === true);
  flushEffectQueue();
};

function flushEffectQueue() {
  if (isFlushing) return;
  isFlushing = true;
  Promise.resolve().then(() => {
    const effects = Array.from(queue.entries());
    queue.clear();
    let hasScheduledEffects = false;
    for (const [fn, schedule] of effects) {
      if (schedule) {
        scheduled.add(fn);
        hasScheduledEffects = true;
      } else {
        runEffectNow(fn);
      }
    }

    if (!scheduleInProgress && hasScheduledEffects) {
      scheduleRenderWithTimeBudget();
    }
    isFlushing = false;
    if (queue.size > 0) flushEffectQueue();
  });
}

export const errorControl = (error, details = {}) => {
  const message = error?.message || error?.msg || 'Unknown reactive error';
  console.error(error, message, error?.graph);

  const dev =
    typeof globalThis !== 'undefined'
      ? globalThis.__pawaDev
      : typeof window !== 'undefined'
        ? window.__pawaDev
        : null;

  if (dev && typeof dev.setError === 'function') {
    const payload = {
      el: details.el || error?.ref || error?.el || null,
      msg: details.msg || message,
      directives: details.directives || error?.effect || null,
      stack: error?.stack || null,
      template: details.template || error?.exp || null,
      warn: error?.warn || null,
      effect: details.effect || error?.effect || null,
      ref: error?.ref || null,
      exp: details.exp || error?.exp || null,
    };
    dev.setError(payload);
    return payload;
  }

  return error;
};

export const createEffect = (fn, el, update = null) => {
  const effect = (id) => {
    cleanupEffect(effect); // unsubscribe from deps
    runCleanup(effect); // run the PREVIOUS run's cleanup first
    const prev = activeEffect;
    activeEffect = effect;
    effect.el = el;
    try {
      const c = fn(id);
      if (typeof c === 'function') {
        effect._cleanup = c; // store it, do NOT call it now
      } else {
        const dev = getDev();
        if (dev && c && typeof c.then === 'function') {
          console.warn(
            '[pawa] Effect function returned a Promise. Async effects cannot ' +
              'return a cleanup, and deps read after the first await are not tracked.'
          );
        }
      }
    } finally {
      activeEffect = prev; // restore parent effect (nested effects) even if fn throws
    }
  };

  effect._sideEffect = update;
  effect._id = crypto.randomUUID();
  effect._done = false;
  effect._killed = false;
  effect._cleanup = null;
  effect._sideCleanup = null;
  let effectQueue = new Set();
  let isBatching = false;

  function batchEffect() {
    if (isBatching) return;
    isBatching = true;
    Promise.resolve().then(() => {
      effectQueue.forEach((eff) => {
        try {
          if (!eff._killed) eff(); // cleanup is stored inside the effect itself
        } catch (error) {
          errorControl(error);
        }
      });
      effectQueue.clear();
      isBatching = false;
    });
  }

  const runEffect = () => {
    effectQueue.add(effect);
    batchEffect();
  };

  runEffect();
  try {
    runSideEffect(effect);
  } catch (error) {
    errorControl(error);
  }

  const deletes = () => {
    cleanupEffect(effect); // unsubscribe from every dep set
    runCleanup(effect); // final cleanup on teardown
    runCleanup(effect, '_sideCleanup');
    effect._killed = true;
  };

  if (el?.effect) {
    el.effect.push(deletes);
  }
  return deletes;
};

export const track = (target, key) => {
  if (activeEffect) {
    let depsMap = targetMap.get(target);
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) {
      depsMap.set(key, (dep = new Set()));
    }
    dep.add(activeEffect);
    // effect remembers every dep-set it's a member of
    if (!activeEffect._deps) activeEffect._deps = new Set();
    activeEffect._deps.add(dep);
  }
};

function cleanupEffect(effect) {
  if (effect._deps) {
    for (const dep of effect._deps) {
      dep.delete(effect);
    }
  }
  effect._deps = new Set();
}

export const stopEffect = (effect) => {
  cleanupEffect(effect);
  runCleanup(effect);
  runCleanup(effect, '_sideCleanup');
  effect._killed = true;
};

export const trigger = (target, key, trans) => {
  const depsMap = targetMap.get(target);
  if (depsMap) {
    const dep = depsMap.get(key);
    if (dep) {
      dep.forEach((effect) => {
        if (!effect._killed) {
          let schedule = false;
          if (trans && trans.type === 'schedule') {
            schedule = true;
          }
          queueEffect(effect, depsMap, schedule);
        }
      });
    }
  }
};