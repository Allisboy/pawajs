import { getComponentGraph } from "../component/index.js";
import { sanitizeTemplate } from "../component/utils.js";
import { trigger, track, createEffect} from "../reactive.js";
import { getServerInstance } from "../server/index.js";

const serverInstance=getServerInstance()
let inProxy=null
const pawaProxies = new WeakSet()
const client = typeof window !== 'undefined'
const promiseCallback = (func, main) => {
    func().then(res => {
        main.value = res
        main.failed = false
        main.async = false
    }).catch(error => {
        main.async = false
        main.failed = true
    })
}

const handlePromise = (promise, main) => {
    promise.then(res => {
        main.value = res
        main.failed = false
        main.async = false
    }).catch(() => {
        main.async = false
        main.failed = true
    })
}
const proxyCache = new WeakMap()

const createDeepProxy = (target, callback) => {
    if (!target || typeof target !== "object") return target

    if (proxyCache.has(target)) {
        return proxyCache.get(target)
    }

    const proxy = new Proxy(target, {
        get(target, property) {
            const value = target[property]
            track(target, property)

            if (value && typeof value === "object") {
                return createDeepProxy(value, callback)
            }

            return value
        },

        set(target, property, value) {
            target[property] = value
            callback(target, property)
            return true
        }
    })

    proxyCache.set(target, proxy)
    pawaProxies.add(proxy)

    return proxy
}

export const isProxy = (value) => {
    if (typeof window === 'undefined') {
        return serverInstance.isProxy?.(value) ?? false
    }
    return pawaProxies.has(value)
}

// Generic stack-safe slot helper: sets a module-level slot for the duration
// of `fn`, then restores whatever the *caller* had — so nested/reentrant
// calls compose instead of clobbering each other with a hardcoded reset.
const withSlot = (setSlot, getSlot, value, fn) => {
    const prev = getSlot();
    setSlot(value);
    try {
        return fn();
    } finally {
        setSlot(prev);
    }
};

// NOTE: InProxyCaller is intentionally NOT built on withSlot — we need to
// read back the value `inProxy` was mutated to *during* callback() (proxy
// get-traps set it to true as a side effect) before restoring the caller's
// previous value. withSlot's generic finally-restore would discard that
// observed value along with the slot.
export const InProxyCaller=(callback,check=false)=>{
    const prev=inProxy
    inProxy=check
    const result=callback()
    const observedInProxy=inProxy
    inProxy=prev
    return {result,inProxy:observedInProxy}
}

let store
let setStores
let transfer
export const setTrans=(send)=>transfer=send

export const useStorage=(createCall,name)=>{
    let timeOut
    const setStore=(newState)=>{
        try {
            if (timeOut) {
                clearTimeout(timeOut)
            }
            timeOut=setTimeout(() => {
                localStorage.setItem(name, JSON.stringify(newState))
            }, 50);
        } catch (error) {
           console.error("[ERROR: Can't store state]",newState,error.message);
        }
    }
    const storeToLocal=(states)=>{
        try {
            if (localStorage.getItem(name)) {
                const stored = JSON.parse(sanitizeTemplate(localStorage.getItem(name)))
                states.value = stored.value
            } else {
                localStorage.setItem(name, JSON.stringify(states))
            }
        } catch (error) {
            console.error("[ERROR: Can't store or set state]",states,error.message);
        }
    }

    return withSlot(
        v => setStores = v,
        () => setStores,
        setStore,
        () => withSlot(
            v => store = v,
            () => store,
            storeToLocal,
            () => createCall()
        )
    )
}

export const schedule=(callback)=>{
    return withSlot(setTrans, () => transfer, {type:'schedule'}, callback)
}

/**
 * @param {FunctionConstructor|number|string|null} initialValue
 * Any Function(can be return Promise or string or number) or string,number, null.
 * @param {string|null}section
 * A string for identifing Promise  or compute value (array)
 * @returns {{value:any,id:string,async?:boolean,failed?:boolean,retry?:()=>void}}
 * notice the async, failed and retry works when Promised is pas into initialValue Function.
 * 
 * id is not meant to be touched its pawajs way of tracking state  
 */
export const $state = (initialValue, section = null) => {
    if (!client) {
        return serverInstance.$state?.(initialValue,section)
    }
    const graph=getComponentGraph()   
    const id = crypto.randomUUID()
    const states = {
        value: null,
        id: id
    }
    let enter
    let promise
    const isFunction = typeof initialValue === "function"
    if (isFunction && initialValue[Symbol.toStringTag] !== 'AsyncFunction') {
        const result = initialValue()
        
        states.value = result
        
    }    
    else if (isFunction && initialValue[Symbol.toStringTag] === 'AsyncFunction') {
       states.value=null
        const id=graph?.id
        
        if (!id) {
            promise=initialValue()
            states.value=null
            states.async = true
            states.failed = false
        
        }   
            
    }
     else {
        states.value = initialValue
    }
    const toStore=store
    const setState=setStores
    if (typeof toStore === 'function') {
        toStore(states)
    }
    enter=true
    const main = createDeepProxy(states, (target, property) => {
        trigger(target, property,transfer);
        if (typeof setState === 'function') {
            setState(states)
        }
    });
    if (Array.isArray(section)) {
        if (graph?.firstTime === false && typeof initialValue === 'function') {
            const cleanup=stateWatch(()=>{
                main.value=initialValue()
            },section)
            graph.unMount.push(cleanup)
        }else{
            console.error('state compute must be inside a component and initialValue must be a function')
        }
    }
    if (isFunction &&  initialValue[Symbol.toStringTag] === 'AsyncFunction') {
        
        if (!graph?.id) {
            handlePromise(promise, main)
        }else{
            
            let result
            const setup=(result)=>{
            if(Array.isArray(result)) {
                let value=result.filter(r=> r.value.name === section)
                value=value[0]
                value=value.value
             if (value?.success) {
                
                main.value=value.success
                main.async=false
                main.failed=false
                
             }else{
                main.failed=true
                main.value=value.error
             }   
                
            }
        }
        const graphId=graph?.id
        if (window.awaits?.[graphId]) {
                // console.log(window.awaits[id]);
             setup(window.awaits[graphId])   
            }else{
            states.value=result
            states.async = true
            states.failed = false
                if(!window.states[graphId])
                {
                    window.states[graphId]=[]
                }
                window.states[graphId].push(setup)
            }
        }

        const asyncObject = {
            retry: () => {
                promiseCallback(initialValue, main)
            }
        }
        Object.assign(main, asyncObject)
        return main
    } else {
        return main
    }
    

}

const watchCallbacks = new Map();
export const stateWatch = (callback, dependencies) => {
    const graph=getComponentGraph()
    if (!callback) {
        console.warn('stateWatch: Callback function is required');
        return;
    }
    const dep = new Set();
      const effects = []

dependencies.forEach(d => {
    if (typeof d === 'function') {
        effects.push(createEffect(d, graph, callback))
    } else if (d && d.id) {
        effects.push(
            createEffect(() => d.value, graph, callback)
        )
    }
})

return () => {
    for (const effect of effects) {
        effect?.()
    }
    watchCallbacks.delete(callback)
}
};