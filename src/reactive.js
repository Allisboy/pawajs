export let activeEffect = null;
export const targetMap = new WeakMap();
export const listeners = new WeakMap();
let queue = new Set();
let isFlushing = false;

export const TransMap=new Map()
export const deleteEffect = new Set();

export const runWithEffect = (effect, fn) => {
  cleanupEffect(fn)
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
let scheduleInProgress=false

function runEffectNow(fn) {
  try {
    if (fn?._killed) return;      // NEW
    const graph = fn?.el;
    if (graph && graph.kill) return;
    if (graph && !graph.active && Array.isArray(graph?.unActive)) {
      const i = graph.unActive.indexOf(fn)
      if (i !== -1) graph.unActive.splice(i, 1)
        graph.unActive.push(fn)
      return
    }
    const cleanUp = fn();
    if (fn?._sideEffect) {
      const cleared = fn._sideEffect?.();
      if (typeof cleared === 'function') cleared();
    }
    if (typeof cleanUp === 'function') cleanUp();
  } catch (error) {
    errorControl(error);
  }
}

function scheduleRenderWithTimeBudget() {
  // Avoid scheduling if nothing to run or already scheduled
  if (scheduled.size === 0 || rafScheduled || scheduleInProgress) return;
  rafScheduled = true;
  scheduleInProgress=true
  performance.mark('update-start')
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
      scheduleInProgress=false
      requestAnimationFrame(scheduleRenderWithTimeBudget)

    }else{
      scheduleInProgress=false
            performance.mark('update-end')
            performance.measure('ScheduleRender','update-start','update-end')
            const [measure]=performance.getEntriesByName('ScheduleRender')
            if(__pawaDev && __pawaDev?.tool)
              if (__pawaDev.performance.effectTime.length === 10) {
                __pawaDev.performance.effectTime=[]
              }
              __pawaDev.performance.effectTime.push(measure.duration.toFixed(2))
            performance.clearMarks()
            performance.clearMeasures()
    }
  });
}

export const queueEffect = (effect,depsMap,schedule=false) => {

  if (!queue.has(effect)) queue.add(effect);
  // __pawaDev.totalEffect=queue.size
  if (!isFlushing) {
    isFlushing = true;
    Promise.resolve().then(() => {
      const effects = Array.from(queue);
      queue.clear();
      for (const fn of effects) {
        if (schedule) {
          scheduled.add(fn);
        }else{
          runEffectNow(fn)
        }
      }

      if (!scheduleInProgress && schedule) {
        scheduleRenderWithTimeBudget();
      } // Trigger the frame-based scheduler
      isFlushing = false;
    });
  }
};

export const errorControl=(error, details = {})=>{
  const message = error?.message || error?.msg || 'Unknown reactive error'
  console.error(error);

  const dev = typeof globalThis !== 'undefined'
    ? globalThis.__pawaDev
    : (typeof window !== 'undefined' ? window.__pawaDev : null)

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
    }
    dev.setError(payload)
    return payload
  }

  return error
}
  
  export const createEffect = (fn, el, update = null) => {
    const effect = (id) => {
        cleanupEffect(effect);
        activeEffect = effect;
        effect.el = el;
        effect.parentEl = el?.parentElement;
        let cleanUp = fn(id);
        activeEffect = null;
        if (typeof cleanUp === 'function') return cleanUp;
    };

    effect._sideEffect = update;
    effect._id = crypto.randomUUID();
    effect._done = false;
    effect._killed = false;      // NEW — replaces the old `_dep=null` line
    let effectQueue = new Set();
    let isBatching = false;

    function batchEffect() {
        if (isBatching) return;
        isBatching = true;
        Promise.resolve().then(() => {
            effectQueue.forEach(eff => {
                try {
                    if (!eff._killed) eff();   // NEW — guard here too, in case a kill happens mid-batch
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
        const clear = update?.();
        if (typeof clear === 'function') clear();
    } catch (error) {
        errorControl(error);
    }

    const deletes = () => {
        cleanupEffect(effect);       // unsubscribe from every dep set
        effect._killed = true;       // NEW — mark dead instead of Set.add
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
    // NEW: effect remembers every dep-set it's a member of
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
    effect._killed = true;
};


export const trigger = (target, key, trans) => {
    const depsMap = targetMap.get(target);
    if (depsMap) {
        const dep = depsMap.get(key);
        if (dep) {
            dep.forEach(effect => {
                if (!effect._killed) {           // NEW — was: !deleteEffect.has(effect._id)
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
