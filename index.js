import { track, trigger, createEffect } from './reactive.js'
import { PawaElement, PawaComment } from './pawaElement.js';
import {
    If,
    event,
    unMountElement,
    mountElement,
    For,
    States,
    ref,
    documentEvent,
    Switch,
    exitTransition,
    After,
    Every,
    Key
} from './power.js'
import { propsValidator, sanitizeTemplate, setPawaDevError, splitAndAdd, pawaWayRemover, checkKeywordsExistence } from './utils.js';
import PawaComponent from './pawaComponent.js';
import { getServerInstance, isServer } from './server.js'
import { templates } from './normal/template.js'
import { normal_component } from './normal/component.js';
import { resumer } from './resumer.js';
let ERROR_CALLER
export const setErrorCALLER = (callback) => {
        ERROR_CALLER = callback
    }
    // in progress
const errorCaller = (message) => {

}
const client = isServer() === false
const serverInstance = getServerInstance()
const createPawaDev = () => {
    const dev = {
        tool: false, errors: [], totalEffect: 0, errorState: null, components: new Set(),
        renderCount: 0, performance: {renderTime: [], effectTime: [], componentTime: [], start: 0, end: 0},
        _originalStyles: new Map(), listeners: new Set(),
        highlightElement(el) { if(!(el instanceof HTMLElement))return; /* preserve full logic unchanged */ },
        unhighlightElement(el) { /* preserve full logic unchanged */ },
        subscribe(cb) { dev.listeners.add(cb); return () => dev.listeners.delete(cb); },
        emit(type, data) { dev.listeners.forEach(cb => {try{cb({type,data})}catch(e){console.error("PawaDev listener error:",e)}}); },
        setError({el, msg, directives, stack, template, warn} = {}) { 
            const error = {el, msg, directives, stack, template, warn};
            dev.errors.push(error);
            dev.emit('error', error);
        },
        clearErrors() {
            dev.errors = [];
            dev.emit('clear', null);
        },
        logRender(c, t) { dev.renderCount++; /* preserve logging */ },
        logEffect(e, t) { dev.totalEffect++; /* preserve */ },
        logComponent(n, t) { /* preserve */ }
    };
    return dev;
};

const pawaDevInstance = createPawaDev();

if (typeof globalThis !== 'undefined') {
    globalThis.__pawaDev = pawaDevInstance;
} else if (typeof window !== 'undefined') {
    window.__pawaDev = pawaDevInstance;
} else if (typeof global !== 'undefined') {
    global.__pawaDev = pawaDevInstance;
}

const compoBeforeCall = new Set()
const compoAfterCall = new Set()
const renderBeforePawa = new Set()
const renderAfterPawa = new Set()
const renderBeforeChild = new Set()
const startsWithSet = new Set()
const fullNamePlugin = new Set()
const externalPlugin = {}
const externalPluginMap = new Map()
const allowAsProp= new Set()
let pawaAttributes = new Set()
let primaryDirective = new Set()

const mapsPlugins = {
    compoAfterCall,
    compoBeforeCall,
    renderAfterPawa,
    renderBeforePawa,
    renderBeforeChild,
    startsWithSet,
    fullNamePlugin,
    externalPlugin,
    externalPluginMap,
    primaryDirective,
    pawaAttributes,
    allowAsProp
}
export const pluginsMap = () => mapsPlugins
export const escapePawaAttribute = new Set()
export const dependentPawaAttribute = new Set()

export const removePlugin = (...pluginName) => {
    pluginName.forEach(n => {
        if (pawaAttributes.has(n)) {
            pawaAttributes.delete(n)
            delete externalPlugin[n]
            if (externalPluginMap.has(n)) {
                const extArray = externalPluginMap.get(n)
                extArray.forEach(ex => {
                    dependentPawaAttribute.delete(ex)
                })
            }
        }

    })
}
const applyMode = (mode, callback) => {
        if (mode === null || mode === undefined) {
            callback()
        } else if (mode === 'client' && client) {
            callback()
        } else if (mode === 'server' && !client) {
            callback()
        }
    }
    /**
     * @typedef {{startsWith:string,mode:null |'client'|'server',dependency:Array<string>,
     * allowAsProp:boolean,fullName:string,plugin:(el:HTMLElement | PawaElement,attr:object)=>void}} AttriPlugin
     */
    /**
     * @typedef {{
     * attribute?:{register:Array<AttriPlugin>},
     * component?:{
     * beforeCall?:(stateContext:PawaComponent,app:object)=>void,
     * afterCall?:(stateContext:PawaComponent,el:HTMLElement)=>void
     * },
     * renderSystem?:{
     *  beforePawa?:(el:HTMLElement,context:object)=>void,
     *  afterPawa?:(el:PawaElement)=>void,
     *  beforeChildRender?:(el:PawaElement)=>void
     * }
     * }} PluginObject
     */
    /**
     * @param {Array<()=>PluginObject>} func
     */
export const PluginSystem = (...func) => {


func.forEach(fn => {
    if (typeof fn !== 'function') { console.warn('plugin must be a function that returns the plugin objects'); return }
    const getPlugin = fn()
    if (getPlugin?.attribute) {
        getPlugin.attribute.register.forEach(attrPlugins => {
            if (attrPlugins.fullName && attrPlugins.startsWith) { console.warn('Either Plugins FullName or startsWith. you are not required to use two of does plugin registers at this same entry.'); return }
            const extPluginArray = []
            if (attrPlugins?.dependency?.length) {
                attrPlugins.dependency.forEach(dp => {
                    if (dependentPawaAttribute.has(dp)) __pawaDev.setError({ msg: `${dp} is already used - from pawa plugin it might cause some issues`, warn: true })
                    dependentPawaAttribute.add(dp); extPluginArray.push(dp)
                })
            }

            const name = attrPlugins.fullName || attrPlugins.startsWith, set = attrPlugins.fullName ? fullNamePlugin : startsWithSet
            if (pawaAttributes.has(name)) { console.warn(`attribute plugin already exist ${name}`); return }
            if (attrPlugins?.allowAsProp) {
                allowAsProp.add(name)
            }
            applyMode(attrPlugins?.mode, () => {
                pawaAttributes.add(name); set.add(name); externalPlugin[name] = attrPlugins.plugin
                if (extPluginArray.length) externalPluginMap.set(name, extPluginArray)
            })
        })
    }
    if (getPlugin?.component) {
        if (getPlugin.component?.beforeCall) compoBeforeCall.add(getPlugin.component.beforeCall)
        if (getPlugin.component?.afterCall) compoAfterCall.add(getPlugin.component.afterCall)
    }
})
}

export const keepContext = (context) => {
    if (!client) return
    stateContext = context
    formerStateContext = stateContext

}
export const components = new Map()
export const lazyComponents=new Map()
    /**
     * @type {PawaComponent}
     */
let stateContext = {
    _hasRun: false,
    _formerContext: null,
    _insert: {},
    _resume: false,
    _suspense:'',
    _hook: {
        effect: [],
        isMount: [],
        isUnMount: []
    },
    _stateMap: new Map,
    component: null,
    _transportContext: {},
    _reactiveProps: {},
    _template: '',
    _serializedData:{},
    _static: [],
    _id:"",
    hmr:false
}

export const getCurrentContext = () => {
    return stateContext
}

let formerStateContext = null
let pawaContext = {}

export const setPawaAttributes = (...attr) => {
    attr.forEach((att) => {
        if (pawaAttributes.has(att)) {
            throw Error(`${att} already exits`)
            return
        }
        pawaAttributes.add(att)
    })
}
const setPrimaryAttibute = (...name) => {
    name.forEach(att => {
        primaryDirective.add(att)
    })
}

export const getPrimaryDirectives=()=>primaryDirective

setPrimaryAttibute('if', 'else-if', 'for-each', 'else','switch','case','s-default','key')
setPawaAttributes('if', 'else-if', 'for-each', 'else', 'mount',
    'unmount', 'forKey', 'state-', 'on-', 'out-','key','switch','case','s-default')
export const getDependentAttribute = () => dependentPawaAttribute
export const getPawaAttributes = () => {
    return pawaAttributes
}
let laziler
export const lazyComponentElement=new Map()
export const addLazyComponentElement=(element,func)=>{
    const tagName=splitAndAdd(element.tagName)
    if (lazyComponentElement.has(tagName)) {
        lazyComponentElement.get(tagName).push({element:element,func})
    }else{
        lazyComponentElement.set(tagName, [{element:element,func}])
    }
}
/**
 * 
 * @param  {...()=>string|null} component 
 * Function registrar for pawajs component
 */
export const RegisterComponent = (...args) => {
    // Handle new signature from plugin: RegisterComponent('Name1', Func1, 'Name2', Func2, ...)

    if (typeof args[0] === 'string') {
        for (let i = 0; i < args.length; i += 2) {
            const name = args[i];
            const component = args[i + 1];
            if (typeof name === 'string' && typeof component === 'function') {
                // if (components.has(name.toUpperCase())) continue;
                components.set(name.toUpperCase(), component);
            } else {
                console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string, function).');
                break;
            }
        }
        return;
    }
    // Handle old signature for dev mode: RegisterComponent(ComponentFunc1, ComponentFunc2, ...)
    args.forEach((component) => {
        if (typeof component === 'function' && component.name) {
            // if (components.has(component.name.toUpperCase())) return;
            components.set(component.name.toUpperCase(), component);
        } else {
            console.warn('Component registration failed: Component must be a named function. This might happen in production builds without the pawajs Vite plugin.');
        }
    });
}
export const createIntersectionObserver = (element, observeBy) => {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const tagName = splitAndAdd(element.tagName);
                const lazyData = lazyComponents.get(tagName);
                
                if (!lazyData) return;

                lazyData.component().then(res => {
                    const compoFunc = res[lazyData.name];
                    if (!compoFunc) return;

                    components.set(tagName, compoFunc);
                    lazyComponents.delete(tagName);

                    const instances = lazyComponentElement.get(tagName) || [];
                    while (instances.length > 0) {
                        const { element: el, func } = instances.shift();
                        if (el) {
                            if (el._component){
                              el._component.component = compoFunc;
                              el._component.validPropRule=compoFunc?.validateProps || {}
                            } 
                            
                            keepContext(el._stateContext);
                            el._stateContext._hasRun = false;
                            func(); 
                            el._stateContext._hasRun = true;
                        }
                    }
                    lazyComponentElement.delete(tagName)
                    observer.disconnect();
                }).catch(err => console.error(`Lazy load failed for ${tagName}:`, err));
            }
        });
    }, { rootMargin: '100px' }); 

    observer.observe(observeBy || element);
    return observer;
}
RegisterComponent.lazy=async(...args)=>{
    if (typeof args[0] === 'string') {
        for (let i = 0; i < args.length; i += 2) {
            const name = args[i];
            const component = args[i + 1];
            if (components.has(name.toUpperCase())) return
            if (typeof name === 'string' && typeof component === 'function') {
                if (isServer()) {
                    lazyComponents.set(name.toUpperCase(), {name,component});
                   const compo=await component()
                   if (compo[name]) {
                       components.set(name.toUpperCase(),compo[name]) 
                   }else{
                    console.log(`component name doesn't matched the export ${name}`);
                   }
                }else{
                    lazyComponents.set(name.toUpperCase(), {name,component});
                }
            } else {
                console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string, function).');
                break;
            }
        }
        return;
    }
}

/**
 * 
 * @param {()=>()=>any} callback 
 * A function that runs based on the deps and the returns are for unMounted hook 
 * ( from Array,Number,null deps) while deps(object) are for the main reactive effect
 * @param {Array|null|object|number} deps 
 * Array - for state dependency.
 * 
 * object- for any state used inside of the callback but under the use of element or component. this is read-only state not for state updating
 * 
 * Number - before mount hook.
 * 
 * null- for Mount hook 
 * @returns {void}
 */export const runEffect = (callback, deps) => {
    if (client) {
        if (stateContext._hasRun) {
            return
        }

        // Detect if inside a component
        // stateContext._name is set in setStateContext
        // default stub has no _name
        const insideComponent = !!stateContext._name || 
                                !!stateContext.component

        if (stateContext) {
            if (!stateContext._hook) stateContext._hook = {}
            if (!stateContext._hook.isMount) stateContext._hook.isMount = []
            if (!stateContext._hook.beforeMount) stateContext._hook.beforeMount = []
            if (!stateContext._hook.reactiveEffect) stateContext._hook.reactiveEffect = []
            if (!stateContext._hook.effect) stateContext._hook.effect = []

            if (deps === undefined || deps === null) {
                if (insideComponent) {
                    // Inside component — register for later
                    stateContext._hook.isMount.push(callback)
                } else {
                    // Outside component — execute immediately
                    // after current execution context via microtask
                    Promise.resolve().then(() => {
                        const cleanup = callback()
                        if (typeof cleanup === 'function') {
                            // Register global cleanup on page unload
                            window.addEventListener('beforeunload', cleanup, { once: true })
                        }
                    })
                }
            } else if (typeof deps === 'object' && !Array.isArray(deps)) {
                // readonly reactive effect — needs component context
                // silently ignore outside component
                if (insideComponent) {
                    stateContext._hook.reactiveEffect.push({ deps, effect: callback })
                }else{
                    
                    let terminateEffect=new Set()
                    const mainFunction=callback()
                    createEffect(()=>{
                        const cleanUp=mainFunction?.()
                        if (typeof cleanUp === 'function') {
                            return cleanUp
                        }
                    },{
                        _terminateEffects:terminateEffect
                    },)
                    if (terminateEffect.size > 0) {
                        window.addEventListener('beforeunload',()=>{
                            terminateEffect.forEach(fn =>{
                                fn()
                            })
                        },deps?.update)
                    }
                }
            } else if (Array.isArray(deps)) {
                // watch — needs component context
                // silently ignore outside component
                if (insideComponent) {
                    stateContext._hook.effect.push({ deps, effect: callback })
                }else{
                    //used pawajs stateWatch
                    const cleanUp=stateWatch(callback,deps)
                    window.addEventListener('beforeunload',cleanUp,{once:true})
                }
            } else if (typeof deps === 'number') {
                if (insideComponent) {
                    // Inside component — register for later
                    stateContext._hook.beforeMount.push(callback)
                } else {
                    // Outside component — execute after deps ms
                    setTimeout(() => {
                        const cleanup = callback()
                        if (typeof cleanup === 'function') {
                            window.addEventListener('beforeunload', cleanup, { once: true })
                        }
                    }, deps)
                }
            }
        }
    }
}

/**
 * to validate component for runtime rules
 * @param {object} props 
 * @returns {object}
 */
export const useValidateComponent = (component, object) => {
        if (typeof component === 'function') {
            if (component.name) {
                component.validateProps = object
            }
        }
    }
    /**
     * @returns {{id:string,setValue:()=>void}}
     * + Sets the context
     */
export const setContext = () => {
    if (client) {

        const id = crypto.randomUUID()
        const setValue = (val = {}) => {
            if (stateContext._hasRun) {
                return
            }
            if (!stateContext) {
                console.warn('set Context value must be inside of a component')
                return null
            }
            if (!stateContext._transportContext) {
                stateContext._transportContext = {}
            }
            if (stateContext._transportContext[id]) {
                delete stateContext._transportContext[id]
            }
            stateContext._transportContext[id] = val
        }
        return {
            id,
            setValue
        }
    } else {
        return serverInstance.setContext?.()
    }

}

/**
 * Get parent Context
 * @param {object} context
 * @return {object}
 */
export const useContext = (context) => {
    if (client) {
        if (!stateContext) {
            console.warn('getContext must be called inside of a component')
            return
        }
        if (stateContext?._transportContext[context.id]) {
            const contexts = stateContext._transportContext[context.id]
            return contexts
        } 
    } else {
        return serverInstance.useContext?.(context)
    }
}

/**
 * Get Current component context from the html (the component parent)
 * @returns {object}
 */
export const useInnerContext = () => {
    if (client) {
        if (!stateContext) {
            console.warn('must be used inside component')
            return
        }
        return stateContext._elementContext
    } else {
        return serverInstance.useInnerContext?.()
    }
}
export const accessChild = () => {
        if (client) {
            return
        } else {
            return serverInstance.accessChild?.()
        }
    }
    /**@returns {()=>{getServerData:()=>any,setServerData:(data:object)=>void}} - let's component serialized data on server*/
export const useServer = () => {
    if (client) {
        if (stateContext && stateContext._hasRun === false) {
            const component=stateContext._template
             const data=stateContext._serializedData
             /**
              * Meant to ne used on server rendering
              */
             const setServerData=(data={})=>{
                console.warn( `meant to be used on server-only at ${component}`)
             }
             /**
              * Get serialized data from server during pawajs continuity
              */
             const getServerData=()=>data
             return {setServerData,getServerData}
        }else{
            return {data:null}
        }
    } else {
        return serverInstance.useServer?.()
    }
}
export const useAsync = () => {
    if (client) {
        if (stateContext._hasRun) return { $async: () => {} }
        const storeContext = stateContext
        return {
            $async: (callback) => {
                if (storeContext._hasRun) {
                    storeContext._hasRun = false
                    keepContext(storeContext)
                }
                const res = callback()
                storeContext._hasRun = true
                stateContext = null
                return res
            },
            onSuspense:(html)=>{
                storeContext._suspense=html
            }
        }
    } else {
        //sets server initialization to default
        return serverInstance.useAsync?.()
    }
}
//resume state during after ssr
export const isResume = () => {
        if (client) {
            return stateContext._resume
        } else {
            return false
        }
    }
export const forwardProps=(props={})=>{
    if (client) {
        if (isResume())return
        stateContext._restProps=Object.entries(props).length > 0 ? props : {bPAr:''}
    }else{
        return serverInstance.forwardProps?.(props)
    }
}
    /**
     * Insert into the html context in component
     * @param {object} obj 
     * @returns void
     */
export const useInsert = (obj = {}) => {
    if (client) {
        if (stateContext._hasRun) {
            return
        }
        if (!stateContext._insert) {
            stateContext._insert = {}
        }
        Object.assign(stateContext._insert, obj)
    } else {
        const res = serverInstance.useInsert(obj)
    }
}
const createDeepProxy = (target, callback) => {
    // Skip proxies for DOM objects and native objects that don't work well with proxies
    if (target instanceof FileList) return target
    if (target instanceof File) return target
    if (target instanceof Blob) return target
    if (target instanceof FormData) return target
    if (target instanceof Date) return target
    if (target instanceof RegExp) return target
    
    // Also skip if it's already a proxy
    if (target && target._isPawaProxy) return target
    
    // Also skip if it's a DOM element
    if (target && target.nodeType && typeof target === 'object') return target
    
    return new Proxy(target, {
        get(target, property) {
            const value = target[property];
            track(target, property);
            // Only proxy plain objects/arrays and skip if already a proxy
            if (typeof value === "object" && value !== null && !value._isPawaProxy) {
                return createDeepProxy(value, callback);
            }
            return value;
        },
        set(target, property, value) {
            target[property] = value;
            trigger(target, property);
            callback(target, property);
            return true;
        },
    });
};
const globalEffectMap = new Map();
/**
 * @param {PawaComponent} context
 */
export const setStateContext = (context) => {
    const map = new Map()
        // const formerMap=formerStateContext 
    formerStateContext = stateContext
    stateContext = context
    if (stateContext._hasRun) {
        return
    }
    stateContext._transportContext = {}
    stateContext._static = []
    stateContext._serializedData={}
    stateContext._formerContext = formerStateContext
    stateContext._reactiveProps = {}
    stateContext._restProps={}
    stateContext._template = ''
    stateContext._resume = false
    stateContext._suspense=''
    stateContext._hmr=false
    stateContext._hook={
        beforeMount:[],
        reactiveEffect:[],
        effect:[],
        isMount:[],
        isUnMount:[],
    }
    Object.assign(stateContext._transportContext, formerStateContext._transportContext)
    formerStateContext = stateContext
    return stateContext
}

const promiseCallback = (func, main) => {
    const promise = func()
    promise.then(res => {
        main.value = res
        main.failed = false
        main.async = false
    }).catch(error => {
        main.async = false
        main.failed = true
    })
}

/**
 * @param {FunctionConstructor|number|string|null} initialValue
 * Any Function(can be return Promise or string or number) or string,number, null.
 * @param {string|null}section
 * A string for identifing or creating the localStorage(string) or compute value (array)
 * @returns {{value:any,id:string,async?:boolean,failed?:boolean,retry?:()=>void}}
 * notice the async, failed and retry works when Promised is pas into initialValue Function.
 * 
 * id is not meant to be touched its pawajs way of tracking state  
 */
export const $state = (initialValue, section = null) => {
    if (!client) {
        return serverInstance.$state?.(initialValue)
    }
    
    const id = crypto.randomUUID()
    const states = {
        value: null,
        id: id
    }
    let promise
    if (initialValue instanceof Function) {
        const result = initialValue()
        if (result instanceof Promise) {
            promise = result
            states.async = true
            states.failed = false
        } else {
            states.value = result
        }
    } else {
        states.value = initialValue
    }
    if (typeof section === 'string') {

        try {
            if (localStorage.getItem(section)) {
                const stored = JSON.parse(sanitizeTemplate(localStorage.getItem(section)))
                states.value = stored.value

            } else {
                localStorage.setItem(section, JSON.stringify(states))
            }
        } catch (e) {
            console.warn('error while trying to use localStorage')
        }
    }
    let timeOut
    const main = createDeepProxy(states, (target, property) => {
        if (typeof section === 'string') {
            if (timeOut) {
                clearTimeout(timeOut)
            }
            timeOut = setTimeout(() => {
                localStorage.setItem(section, JSON.stringify(states))
            }, 50)
        }
        globalEffectMap.forEach((effect) => {

            if (effect.deps?.has(target.id)) {
                if (effect.cleanup) {
                    effect.cleanup();
                }
                effect.cleanup = effect.callback();
            } else if (effect.deps.size === 0) {
                effect.cleanup = effect.callback();
            }
        });
    });
    if (Array.isArray(section)) {
        if (stateContext._hasRun === false && typeof initialValue === 'function') {
            const cleanup=stateWatch(()=>{
                main.value=initialValue()
            },section)
            stateContext._hook.isUnMount.push(cleanup)
        }else{
            console.error('state compute must be inside a component and initialValue must be a function')
        }
    }
    if (promise instanceof Promise) {

        promise.then(res => {
            main.value = res
            main.failed = false
            main.async = false
        }).catch(error => {
            main.async = false
            main.failed = true
        })

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
const stateWatch = (callback, dependencies) => {
    if (!callback) {
        console.warn('stateWatch: Callback function is required');
        return;
    }
    const dep = new Set()
    if (dependencies) {
        dependencies.forEach(d => {
            dep.add(d.id)
        })
    }
    const effect = {
        callback: () => {
            if (!watchCallbacks.has(callback)) {
                watchCallbacks.set(callback, true);
                Promise.resolve().then(() => {
                    if (effect.cleanup) {
                        effect.cleanup();
                    }
                    const result = callback();
                    // Handle cleanup function returned from callback
                    if (typeof result === 'function') {
                        effect.cleanup = result;
                    }
                    watchCallbacks.delete(callback);
                });
            }
        },
        deps: dep,
        cleanup: null,
    };

    // Initial run with cleanup handling
    const result = callback();
    if (typeof result === 'function') {
        effect.cleanup = result;
    }

    globalEffectMap.set(callback, effect);

    return () => {
        if (effect.cleanup) {
            effect.cleanup();
        }
        globalEffectMap.delete(callback);
        watchCallbacks.delete(callback);
    };
};

export const restoreContext = (state_context) => {
        stateContext = state_context._formerContext
    }
export const HmrComponentMap=new Map()
const renderedComponentsRusumed=new Set()
    /**
     * 
     * @param {PawaElement|HTMLElement} el 
     * @returns null
     */
const component = (el, resume = false, attr, notRender, stopResume) => {
    if (el._running || (resume && renderedComponentsRusumed.has(attr.value))) {
        return
    }
    el._running = true
    
    if (!resume) {
        if (el._lazy) {
            // pas the normal component to lazy handler
            el.style.opacity=0
            addLazyComponentElement(el,()=>normal_component(el, stateContext, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch))
            return
        }else{
            normal_component(el, stateContext, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch)
        }
    } else {
        stopResume.stop = true
        let name=''
        let comment
        let endComment
        const children = []
        let serialized
        let id
        const getComment = (node) => {
            if (node.previousSibling.nodeType === 8) {
                const c = node.previousSibling.data.split('+')
                if (c[1] === attr.value) {
                    comment = node.previousSibling
                    name = c[2]
                    serialized = c[3]
                    id = c[1]
                } else {
                    getComment(node.previousSibling)
                }

            } else {
                getComment(node.previousSibling)
            }
        }
        const getEndComment = (comment) => {
            if(endComment) return;
            const isComment = comment.nextSibling
            if (comment.nextSibling.nodeType === 8) {
                if (isComment.data.split('+')[1] === id) {
                    endComment = isComment
                    return
                } else {
                    getEndComment(isComment)
                }
            } else if (isComment.nodeType === 1) {
                if( !isComment.hasAttribute('p:store')){
                    isComment.setAttribute('by',id)
                    children.push(isComment)
                }
                getEndComment(isComment)
            } else {
                getEndComment(isComment)
            }
        }
        try {
            getComment(el)
            getEndComment(comment)
        } catch (error) {
            // el has no previous Sibling
        }
        el.removeAttribute(attr.name)
        let numberComponentChildren 
        if(notRender.index === 0){
            numberComponentChildren =children.length 
        }else{
            numberComponentChildren = notRender.index + children.length -1
        }
        notRender.notRender = numberComponentChildren
        renderedComponentsRusumed.add(attr.value)
        
        if (lazyComponents.has(name.toUpperCase())) {   
            const trackElement=document.createElement(name)
            trackElement._stateContext=el._stateContext 
            addLazyComponentElement(trackElement,()=>resumer.resume_component?.(el, attr, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch, { comment, endComment, name, serialized, id, children }))     
              if (lazyComponentElement.has(name.toUpperCase())) {
                createIntersectionObserver(trackElement,el)
              }
            }else{
                resumer.resume_component?.(el, attr, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch, { comment, endComment, name, serialized, id, children })
            }
    }
}

/**
 * @param {PawaElement | HTMLElement} el
 */
const mainAttribute = (el, exp) => {
    const attrMap = new Map();
    if (el._running) return
        // Store original attribute value
    if (el._hasForOrIf()) {
        return
    }
    if (el._componentName) {
        return
    }
    attrMap.set(exp.name, exp.value);
    el._preRenderAvoid.push(exp.name)
    const booleanAttributes = new Set(['checked', 'selected', 'disabled', 'readonly', 'required', 'multiple']);
    el._mainAttribute[exp.name] = exp.value
    el._checkStatic()
    let enter=false
    const context=el._context
    const evaluate = () => {

        try {
            // Always use original value from map for evaluation
            let value = attrMap.get(exp.name);
            let isBoolean
            const regex = /@{([^}]*)}/g;

            const hasExpression = regex.test(value);
            regex.lastIndex = 0;

            value = value.replace(regex, (match, expression) => {
                if (checkKeywordsExistence(el._staticContext, expression)) {
                    return ''
                } else {
                    const result = el.safeEval(context, expression, `error at attribute ${exp.name}`, true)
                    isBoolean = result
                    if (typeof result !== 'boolean') {
                        return result ?? ''
                    }else{
                        return ''
                    }
                }
            });

            if (booleanAttributes.has(exp.name)) {
                const boolValue = hasExpression ? !!isBoolean : value.toLowerCase() !== 'false';
                const propName = exp.name === 'readonly' ? 'readOnly' : exp.name;

                if (propName in el) {
                    el[propName] = boolValue;
                }

                if (boolValue) {
                    el.setAttribute(exp.name, '');
                } else {
                    el.removeAttribute(exp.name);
                }
            } else if (exp.name === 'value' && 'value' in el) {
                el.value = value;
                el.setAttribute(exp.name, value);
            } else {
                if ((exp.name === 'class' || exp.name === 'style') && enter) {
                    console.log('entered',enter);
                    
                    requestAnimationFrame(()=>{
                    el.setAttribute(exp.name, value);
                    })
                    enter=true
                }else{
                    el.setAttribute(exp.name, value);
                }
            }
        } catch (error) {
            console.warn(`failed at attribute ${exp.name}`, el)
            __pawaDev.setError({ 
                    el:el, 
                    msg:`from  ${exp.name} ${exp.value}`, 
                    directives:exp.name, 
                    stack:error.stack, 
                    template:el?._template, 
                 })
        }
    };
    createEffect(() => {
        evaluate();
    });
};

const textContentHandler = (el, isName) => {
    if (el._hasForOrIf() || el._componentName) {
        return
    }
    if (el._running) {
        return
    }
    const nodesMap = new Map();

    // Get all text nodes and store their original content
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(node => {
        nodesMap.set(node, node.nodeValue);
    });
    el._checkStatic()
    const context=el._context
    const evaluate = () => {
        
        try {
            textNodes.forEach(textNode => {
                // Always use original content from map for evaluation
                let value = nodesMap.get(textNode);
                const regex = /@{([^}]*)}/g;

                value = value.replace(regex, (match, expression) => {
                    if (checkKeywordsExistence(el._staticContext, expression)) {
                        return ''
                    } else {
                        if(expression === '')return value
                        el._textContent[expression] = value
                        const res = el.safeEval(context, expression, 'textContent', true)
                        return String(res ?? '');
                    }
                });
                if(el.tagName === 'TEXTAREA'){
                    el.value=value
                }else{
                    textNode.nodeValue = value;
                }

            });
        } catch (error) {
            // console.warn(`error at ${el} textcontent`)
            setPawaDevError({
                message: `error at TextContent ${error.message}`,
                error: error,
                template: el._template
            })
        }
    };

    createEffect(() => {
        evaluate();
    }, el);
};

const template = (el,notRender, attr) => {
    if (el._running) {
        return
    }
    el._running = true
    templates(el,notRender)
}

const directives = {
    if: If,
    'for-each': For,
    else:(el)=>{el._running =true},
    case:(el)=>{el._running =true},
    "s-default":(el)=>{el._running =true},
    'else-if':(el)=>{el._running =true},
    mount: mountElement,
    unmount: unMountElement,
    ref: ref,
    switch:Switch,
    key:Key,
    'is-exit':exitTransition,
}
export const useRef = () => {
    return { value: null }
}
export const render = (el, contexts = {}, notRender, isName) => {
    const stopResume = { stop: false }
    if (el.tagName === 'SCRIPT') {
        return false
    }
     if (el.tagName === 'TITLE') {
        document.title = (el.textContent || '').trim()
        el.remove()
    return
  }
    const context = {
        ...contexts
    }

    for (const fn of renderBeforePawa) {
        try {
            fn(el, context)
        } catch (error) {
            __pawaDev.setError({ el: el, msg: error.message })
            console.error(error.message)
        }
    }
    PawaElement.Element(el, context)
    el._staticContext = stateContext?._static
    el._stateContext=stateContext
    for (const fn of renderAfterPawa) {
        try {
            fn(el)
        } catch (error) {
            __pawaDev.setError({ el: el, msg: error.message })
            console.error(error.message)
        }
    }

    
    let startAttribute = false
    const startObject = {}
        //get startsWith plugin
    if (!el._avoidPawaRender) {

        startsWithSet.forEach(starts => {

            el._attributes.forEach(attr => {
                if (attr.name.startsWith(starts)) {
                    startAttribute = true
                    startObject[attr.name] = starts
                }
            })
        })
        const number = { notRender: null }
        const isAcomponent=el._componentName?true:false
        
        el._attributes.forEach(attr => {

            if (stopResume.stop || el._hasRun) return
            if (directives[attr.name]) {
                directives[attr.name](el, attr, stateContext)
            } else if (attr.name.startsWith('on-') && !isAcomponent) {
                event(el, attr, stateContext)
            } else if (attr.value.includes('@{') && !attr.name.startsWith('c-at-')) {
                mainAttribute(el, attr, isName)
            } else if (attr.name.startsWith('state-')) {
                States(el, attr, getCurrentContext())
            } else if (attr.name.startsWith('out-') && !isAcomponent) {
                documentEvent(el, attr)
            } else if (attr.name.startsWith('after-[') && attr.name.endsWith(']') && !isAcomponent) {
                After(el, attr)
            } 
             else if (attr.name.startsWith('every-[') && attr.name.endsWith(']') && !isAcomponent) {
                Every(el, attr)
            } 
            else if (attr.name.startsWith('c-c-')) {
                stopResume.stop = true
            
                
                component(el, true, attr, notRender, stopResume)// component continuity
            } else if (attr.name.startsWith('c-at-')) {
                resumer.resume_attribute?.(el, attr, notRender) //attribute continuity
            } else if (attr.name.startsWith('c-$-')) {
                resumer.resume_state?.(el, attr, notRender) //state continuity
            } else if (attr.name.startsWith('c-t')) {//text continuity
                resumer.resume_text(el, attr, isName)
            } else if (attr.name.startsWith('c-if-')) {
                directives['if'](el, attr, stateContext, true, notRender, stopResume) 
            } else if (attr.name === 'c-for') {
                directives['for-each'](el, attr, stateContext, true, notRender, stopResume)
            }else if (attr.name.startsWith('c-key-')) {
                directives['key'](el, attr, stateContext, true, notRender, stopResume)
            }  
            else if (attr.name.startsWith('c-sw-')) {
                directives['switch'](el, attr, stateContext, true, notRender, stopResume)// switch continuity
            } else if (fullNamePlugin.has(attr.name)) {
                if (externalPlugin[attr.name]) {
                    const plugin = externalPlugin[attr.name]
                    try {
                        if (typeof plugin !== 'function') {
                            console.warn(`${attr.name} plugin must be a function`)
                            return
                        }
                        plugin(el, attr, stateContext, notRender, stopResume)
                    } catch (error) {
                        console.warn(error.message, error.stack)
                    }
                }
            } else if (startAttribute) {
                const name = startObject[attr.name]
                if (externalPlugin[name]) {
                    const plugin = externalPlugin[name]
                    try {
                        if (typeof plugin !== 'function') {
                            console.warn(`${name} plugin must be a function`)
                            return
                        }
                        plugin(el, attr, stateContext, notRender, stopResume)
                    } catch (error) {
                        console.warn(error.message, error.stack)
                    }
                }
            }


        })
    }

    if (stopResume.stop) return
    if (Array.from(el.childNodes).some(node =>
            node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
        ) && !el._avoidPawaRender) {
        textContentHandler(el, isName)
    }
    if (el._componentName && !el._avoidPawaRender) {
        component(el)
        return
    }
    if (el._elementType === 'template' && !el._avoidPawaRender) {
        template(el,notRender)
        return
    }

    if (el._out === false || el._running === false || el._componentOrTemplate !== true) {

        if (el._running) {
            return true
        }
        for (const fn of renderBeforeChild) {
            try {
                fn(el)
            } catch (error) {
                __pawaDev.setError({ el: el, msg: error.message })
                console.error(error.message)
            }
        }
        const number = { notRender: null, index: null }
        let isIndex=0
        Array.from(el.children).forEach((child, index) => {
             if (child.hasAttribute('p:store')) {
            return
          }
            number.index = isIndex
            isIndex++
            if (number.notRender !== null && isIndex <= number.notRender) return
            if (child.hasAttribute('by'))return
            render(child, context, number, isName)
        })
        el._callMount()
        if (el.hasAttribute('p:c') && !el.hasAttribute('p-async')) {
           el._clearContext()
        el.removeAttribute('p:c')
       }
}
}
// added streaming awareness
if (typeof window !== 'undefined') {
        window.__pawaStream=(element,context,statecontext)=>{
            let appContext
            if(!window?.__pawaHasStarted){
                if(window?.__startClient === null )return
                window?.__startClient()
                
                window.__startClient=null
                window.__pawaHasStarted=true
                return
            }
            if(statecontext === undefined){
                appContext=stateContext
            }else{
                appContext=statecontext
            }
            keepContext(appContext)
            appContext._hasRun=false
            render(element,context,{index:0,notRender:null})
            appContext._hasRun=true
        }
    
}
export const pawaStartApp = (app, context = {}) => {
    render(app, context)
}

/**
 * Tagged template function for syntax highlighting and future tooling support.
 * Usage: return html`<div>...</div>`
 */
export const html = (strings, ...values) => {
    if (strings.length === 1) return strings[0];
    let result = "";
    for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < values.length) {
            result += values[i];
        }
    }
    return result;
}

const Pawa = {
    useInsert,
    useContext,
    useValidateComponent,
    setPawaAttributes,
    setContext,
    $state,
    pawaStartApp,
    useAsync,
    useInnerContext,
    RegisterComponent,
    runEffect,
    html
}

export default Pawa