import { createEffect } from "../reactive.js";


const watchCallbacks = new Map();
export const stateWatch = (callback, dependencies) => {
    if (!callback) {
        console.warn('stateWatch: Callback function is required');
        return;
    }
    const dep = new Set();
    let effect=null
    if (dependencies) {
        dependencies.forEach(d => {
            if (typeof d === 'function') {
               effect= createEffect(d,null,callback)
            } else if (d && d.id) {
                dep.add(d.id);
                effect=createEffect(() => d.value,null,callback);
            }
        });
        
    }else{
       
      effect= callback()
    }


    return () => {
        if (effect) {
            effect();
        }
        watchCallbacks.delete(callback);
        deleteEffect.add(runner._id);
    };
};
