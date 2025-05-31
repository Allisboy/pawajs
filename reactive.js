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

export const queueEffect = (effect) => {
  if (!queue.has(effect)) queue.add(effect);
  if (!isFlushing) {
    isFlushing = true;
    Promise.resolve().then(() => {
      while (queue.size) {
        const effects = Array.from(queue);
        queue.clear();
        for (const fn of effects) {
          if (!deleteEffect.has(fn)) fn();
        }
      }
      isFlushing = false;
    });
  }
};

  const trackLatestState = (effect) => {
    if (!effect.el) return;
    
    for (const [target, depsMap] of disconnectedEffects.entries()) {
      for (const [key, depSet] of depsMap.entries()) {
        if (depSet.has(effect)) {
          depSet.delete(effect);
          track(target, key); // Re-track the effect
          queueEffect(effect); // Immediately trigger update
        }
      }
    }
  };
  
  // Add parent tracking to effects
  export const createEffect = (fn, el) => {
    const effect = () => {
        activeEffect = effect;
        effect.el = el;
        effect.parentEl = el?.parentElement; // Track parent for deeper checks
        fn();
        activeEffect = null;
    };

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
      deleteEffect.add(effect)
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

export const stopEffect = (effect,depsMap) => {
    for (const [key, depSet] of depsMap) {
      depSet.delete(effect);
    }
  // 3. Remove from deleteEffect
  deleteEffect.delete(effect);
};

export const trigger = (target, key) => {
  const depsMap = targetMap.get(target);
  if (depsMap) {
    const dep = depsMap.get(key);
    if (dep) {
      
      dep.forEach(effect =>{
        
        if (!deleteEffect.has(effect)) {
          queueEffect(effect);
        } else {
          stopEffect(effect,depsMap)
        }
      })
      
    }
  }
};


