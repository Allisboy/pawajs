  export let activeEffect = null;
  export const targetMap = new WeakMap();
  export const listeners = new WeakMap();
  export const disconnectedEffects = new Map();
  export const templateCache = new Map()
  export const componentInstances = new Map()
  export const componentMount=new Map()
 let queue = new Set();
let isFlushing = false;
let deleteEffect = new Set();



const scheduled = new Set();
let rafScheduled = false;
const FRAME_BUDGET = 16; // milliseconds per frame
let scheduleInProgress=false
function scheduleRenderWithTimeBudget() {
  // Avoid scheduling if nothing to run or already scheduled
  if (scheduled.size === 0 || rafScheduled || scheduleInProgress) return;

  rafScheduled = true;
  scheduleInProgress=true
  requestAnimationFrame(() => {
    const start = performance.now();
    const processed = [];

    for (const fn of scheduled) {
      const cleanUp = fn();
      if (typeof cleanUp === 'function') cleanUp();
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
    }
  });
}

export const queueEffect = (effect,depsMap) => {
  if (!queue.has(effect)) queue.add(effect);
  __pawaDev.totalEffect=queue.size
  if (!isFlushing) {
    isFlushing = true;
    Promise.resolve().then(() => {
      const effects = Array.from(queue);
      queue.clear();
      for (const fn of effects) {
        if (!deleteEffect.has(fn._id)) {
          scheduled.add(fn);
        }
      }
      // console.log(scheduleInProgress);
      
      if (!scheduleInProgress) {
        scheduleRenderWithTimeBudget();
      } // Trigger the frame-based scheduler
      isFlushing = false;
    });
  }
};
  
  // Add parent tracking to effects
  export const createEffect = (fn, el) => {
    const effect = () => {
        activeEffect = effect;
        effect.el = el;
        effect.parentEl = el?.parentElement; // Track parent for deeper checks
       let cleanUp= fn();
        activeEffect = null;
        if (typeof cleanUp === 'function') {
          return cleanUp
        }
    };
    effect._id=crypto.randomUUID()
    effect._done=false
    effect._dep=null
    let effectQueue = new Set();
    let isBatching = false;

    function batchEffect() {
        if (isBatching) return;
        isBatching = true;
        
        Promise.resolve().then(() => {
            effectQueue.forEach(eff => eff());
            effectQueue.clear();
            isBatching = false;
        });
    }

    const runEffect = () => {
        effectQueue.add(effect);
        batchEffect();
    };

    // Run effect initially in batch
    runEffect();
if (el) {
  const deletes=() => {
      deleteEffect.add(effect._id)
      // console.log(effect._id,'delete');
      // console.log(el,effect._dep);
  }
  
  el._terminateEffects.add(deletes)
  
}
    return effect;
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
    
  }
};

export const stopEffect = (effect, depsMap) => {
  for (const [key, depSet] of depsMap) {
    depSet.delete(effect);
    if (depSet.size === 0) depsMap.delete(key);
  }
  deleteEffect.add(effect._id);
};


export const trigger = (target, key) => {
  const depsMap = targetMap.get(target);
  if (depsMap) {
    const dep = depsMap.get(key);
    if (dep) {
      // console.log(dep);
      
      dep.forEach(effect =>{
        
        // console.log(effect._id);     
        if (!deleteEffect.has(effect._id)) {
          effect._dep=depsMap
          // console.log(targetMap);
          
          queueEffect(effect,depsMap);
        } 
      })
      
    }
  }
};
