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
if (client) {
    window.__pawaDev = {
        tool: false,
        errors: [],
        totalEffect: 0,
        errorState: null,
        components: new Set(),
        renderCount: 0,
        reactiveUpdates: 0,
        totalComponent: 0,
        performance: {
            renderTime: [],
            effectTime: [],
            componentTime: [],
            start: 0,
            end: 0
        },
        setError: ({ el, msg, directives, stack, template, warn } = {}) => {
            if (__pawaDev.tool !== true) return
            if (__pawaDev.errorState) {
                __pawaDev.errorState.value = true
            }
            __pawaDev.errors.push({
                el,
                msg,
                directives,
                stack,
                timestamp: Date.now(),
                template: template ? template : ''
            })
            if (warn) {
                console.warn(msg, stack, template)
            }
            console.error(msg, stack)
        },
        logRender: (component, time) => {
            __pawaDev.renderCount++
                __pawaDev.performance.renderTime.push({
                    component,
                    time,
                    timestamp: Date.now()
                })
        },
        logEffect: (effect, time) => {
            __pawaDev.totalEffect++
                __pawaDev.performance.effectTime.push({
                    effect,
                    time,
                    timestamp: Date.now()
                })
        },
        logComponent: (name, time) => {
            __pawaDev.components.add(name)
            __pawaDev.performance.componentTime.push({
                name,
                time,
                timestamp: Date.now()
            })
        }
    }
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
    primaryDirective
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
     * @typedef {{startsWith:string,mode:null |'client'|'server',dependency:Array<string>,fullName:string,plugin:(el:HTMLElement | PawaElement,attr:object)=>void}} AttriPlugin
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
        /**
         * @type {PluginObject}
         */
        if (typeof fn !== 'function') {
            console.warn('plugin must be a function that returns the plugin objects')
            return
        }
        const getPlugin = fn()
            // attributes plugin or extension

        if (getPlugin?.attribute) {
            getPlugin.attribute.register.forEach(attrPlugins => {
                if (attrPlugins.fullName && attrPlugins.startsWith) {
                    console.warn('Either Plugins FullName or startsWith. you are not required to use two of does plugin registers at this same entry.')
                    return
                }
                const extPluginArray = []
                if (attrPlugins?.dependency && attrPlugins?.dependency.length > 0) {
                    attrPlugins.dependency.forEach(dp => {
                        if (dependentPawaAttribute.has(dp)) {
                            __pawaDev.setError({ msg: `${dp} is already used - from pawa plugin it might cause some issues`, warn: true })
                        }
                        dependentPawaAttribute.add(dp)
                        extPluginArray.push(dp)
                    })
                }
                if (attrPlugins?.fullName) {
                    if (pawaAttributes.has(attrPlugins.fullName)) {
                        console.warn(`attribute plugin already exist ${attrPlugins.fullName}`)
                        return
                    }
                    
                    applyMode(attrPlugins?.mode, () => {
                        pawaAttributes.add(attrPlugins.fullName)
                        fullNamePlugin.add(attrPlugins.fullName)
                        externalPlugin[attrPlugins.fullName] = attrPlugins?.plugin
                        if (extPluginArray.length > 0) externalPluginMap.set(attrPlugins.fullName, extPluginArray)
                    })
                } else if (attrPlugins?.startsWith) {
                    if (pawaAttributes.has(attrPlugins.startsWith)) {
                        console.warn(`attribute plugin already exist ${attrPlugins.startsWith}`)
                        return
                    }
                    applyMode(attrPlugins?.mode, () => {
                        pawaAttributes.add(attrPlugins.startsWith)
                        startsWithSet.add(attrPlugins.startsWith)
                        externalPlugin[attrPlugins.startsWith] = attrPlugins?.plugin
                        if (extPluginArray.length > 0) externalPluginMap.set(attrPlugins.startsWith, extPluginArray)
                    })
                }
            })



        }
        if (getPlugin?.component) {
            if (getPlugin.component?.beforeCall && typeof getPlugin.component?.beforeCall === 'function') {
                compoBeforeCall.add(getPlugin.component.beforeCall)
            }
            if (getPlugin.component?.afterCall && typeof getPlugin.component?.afterCall === 'function') {
                compoAfterCall.add(getPlugin.component.afterCall)
            }
        }
        if (getPlugin?.renderSystem) {
            if (getPlugin.renderSystem?.beforePawa && typeof getPlugin.renderSystem?.beforePawa === 'function') {
                renderBeforePawa.add(getPlugin.renderSystem?.beforePawa)
            }
            if (getPlugin.renderSystem?.afterPawa && typeof getPlugin.renderSystem?.afterPawa === 'function') {
                renderAfterPawa.add(getPlugin.renderSystem?.afterPawa)
            }
            if (getPlugin.renderSystem?.beforeChildRender && typeof getPlugin.renderSystem?.beforeChildRender === 'function') {
                renderBeforePawa.add(getPlugin.renderSystem?.beforeChildRender)
            }
        }
    })

}
export const keepContext = (context) => {
    if (!client) return
    stateContext = context
    formerStateContext = stateContext

}
export const components = new Map()
    /**
     * @type {PawaComponent}
     */
let stateContext = {
    _hasRun: false,
    _formerContext: null,
    _insert: {},
    _resume: false,
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

setPrimaryAttibute('if', 'else-if', 'for-each', 'else','switch','case','default','case','key')
setPawaAttributes('if', 'else-if', 'for-each', 'else', 'mount',
    'unmount', 'forKey', 'state-', 'on-', 'out-','key','switch','case','default')
export const getDependentAttribute = () => dependentPawaAttribute
export const getPawaAttributes = () => {
    return pawaAttributes
}
export const setError = ({ error }) => {
    if (!client) return
    if (!stateContext) {
        console.warn('must be used inside of a component')
        return
    }
    if (!stateContext._hasRun) {
        if (!stateContext?._error) {
            stateContext._error = []
        }
        stateContext?._error.push(error)
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
 */
export const runEffect = (callback, deps) => {
    if (client) {
        if (stateContext._hasRun) {
            return
        }
        if (stateContext) {
            if (!stateContext._hook) {
                stateContext._hook = {}
            }
            if (!stateContext._hook.isMount) {
                stateContext._hook.isMount = []
            }
            if (!stateContext._hook.beforeMount) {
                stateContext._hook.beforeMount = []
            }
            if (!stateContext._hook.reactiveEffect) {
                stateContext._hook.reactiveEffect = []
            }
            if (!stateContext._hook.effect) {
                stateContext._hook.effect = []
            }
            if (deps === undefined || deps === null) {
                stateContext._hook.isMount.push(callback)
            } else if (typeof deps === 'object' && !Array.isArray(deps)) {
                stateContext._hook.reactiveEffect.push({ deps: deps, effect: callback })
            } else if (Array.isArray(deps)) {
                stateContext._hook.effect.push({
                    deps: deps,
                    effect: callback
                })
            } else if (typeof deps === 'number') {
                stateContext._hook.beforeMount.push(callback)
            }
        }
    }
}

/**
 * 
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
        } else {
            console.warn('this component not in the context tree')
        }

    } else {
        return serverInstance.useContext?.(context)
    }
}

/**
 * Get Current component context from the html
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
            }
        }
    } else {
        return {
            $async: (callback) => {
                return callback()
            }
        }
    }
}
export const isResume = () => {
        if (client) {
            return stateContext._resume
        } else {
            return false
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
    return new Proxy(target, {
        get(target, property) {
            const value = target[property];
            track(target, property);
            if (typeof value === "object" && value !== null) {
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
    stateContext._template = ''
    stateContext._resume = false
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
    /**
     * 
     * @param {PawaElement|HTMLElement} el 
     * @returns null
     */
const component = (el, resume = false, attr, notRender, stopResume) => {
    if (el._running) {
        return
    }
    el._running = true

    if (!resume) {
        normal_component(el, stateContext, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch)
    } else {
        stopResume.stop = true
        let name
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
            const isComment = comment.nextSibling
            if (comment.nextSibling.nodeType === 8) {
                if (isComment.data.split('+')[1] === id) {
                    endComment = isComment
                } else {
                    getEndComment(isComment)
                }
            } else if (isComment.nodeType === 1) {
                children.push(isComment)
                getEndComment(isComment)
            } else {
                getEndComment(isComment)
            }
        }
        getComment(el)
        getEndComment(comment)
        el.removeAttribute(attr.name)
        const numberComponentChildren = notRender.index + children.length - 2
        notRender.notRender = numberComponentChildren
        resumer.resume_component?.(el, attr, setStateContext, mapsPlugins, formerStateContext, pawaContext, stateWatch, { comment, endComment, name, serialized, id, children })
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
    const evaluate = () => {

        try {
            // Always use original value from map for evaluation
            let value = attrMap.get(exp.name);
            let isBoolean
            const regex = /@{([^}]*)}/g;
            const keys = Object.keys(el._context);
            const resolvePath = (path, obj) => {
                return path.split('.').reduce((acc, key) => acc?.[key], obj);
            };
            const values = keys.map((key) => resolvePath(key, el._context));

            const hasExpression = regex.test(value);
            regex.lastIndex = 0;

            value = value.replace(regex, (match, expression) => {
                if (checkKeywordsExistence(el._staticContext, expression)) {
                    return ''
                } else {
                    const func = new Function(...keys, `return ${expression}`);
                    const result = func(...values)
                    isBoolean = result
                    if (typeof result !== 'boolean') {
                        return result
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
                if (exp.name === 'class' && !enter) {
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
            setPawaDevError({
                message: `error at attribute ${error.message}`,
                error: error,
                template: el._template
            })
        }
    };
    createEffect(() => {
        evaluate();
    });
};

const textContentHandler = (el, isName) => {
    if (el._hasForOrIf()) {
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
    const evaluate = () => {
        try {
            textNodes.forEach(textNode => {
                // Always use original content from map for evaluation
                let value = nodesMap.get(textNode);
                const regex = /@{([^}]*)}/g;

                const keys = Object.keys(el._context);
                const resolvePath = (path, obj) => {
                    return path.split('.').reduce((acc, key) => acc?.[key], obj);
                };
                const values = keys.map((key) => resolvePath(key, el._context));

                value = value.replace(regex, (match, expression) => {
                    if (checkKeywordsExistence(el._staticContext, expression)) {
                        return ''
                    } else {

                        el._textContent[expression] = value
                        const func = new Function(...keys, `return ${expression}`);
                        return String(func(...values));
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
    default:(el)=>{el._running =true},
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
        document.title=el.textContent
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
    el._staticContext = stateContext._static
    for (const fn of renderAfterPawa) {
        try {
            fn(el)
        } catch (error) {
            __pawaDev.setError({ el: el, msg: error.message })
            console.error(error.message)
        }
    }

    if (Array.from(el.childNodes).some(node =>
            node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
        ) && !el._avoidPawaRender) {
        textContentHandler(el, isName)
    }
    let startAttribute = false
    const startObject = {}
        //get startsWith plugin
    if (!el._avoidPawaRender) {

        startsWithSet.forEach(starts => {

            el._attributes.forEach(attr => {
                if (attr.name.startsWith('on:')) {
                    startAttribute = true
                    startObject[attr.name] = starts
                }
            })
        })
        const number = { notRender: null }
        el._attributes.forEach(attr => {

            if (stopResume.stop || el._hasRun) return
            if (directives[attr.name]) {
                directives[attr.name](el, attr, stateContext)
            } else if (attr.name.startsWith('on-')) {
                event(el, attr, stateContext)
            } else if (attr.value.includes('@{') && !attr.name.startsWith('c-at-')) {
                mainAttribute(el, attr, isName)
            } else if (attr.name.startsWith('state-')) {
                States(el, attr, getCurrentContext())
            } else if (attr.name.startsWith('out-')) {
                documentEvent(el, attr)
            } else if (attr.name.startsWith('after-[') && attr.name.endsWith(']')) {
                After(el, attr)
            } 
             else if (attr.name.startsWith('every-[') && attr.name.endsWith(']')) {
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
                directives['if'](el, attr, stateContext, true, notRender, stopResume) // condition continuity
            } else if (attr.name === 'c-for') {
                directives['for-each'](el, attr, stateContext, true, notRender, stopResume) // for-each continuity
            }else if (attr.name.startsWith('c-key-')) {
                directives['key'](el, attr, stateContext, true, notRender, stopResume)// key continuity
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
        Array.from(el.children).forEach((child, index) => {
            number.index = index
            if (number.notRender !== null && index <= number.notRender) return
            render(child, context, number, isName)
        })
        el._callMount()
       if (el.hasAttribute('p:c')) {
        el.removeAttribute('p:c')
       }
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
    RegisterComponent,
    runEffect,
    html
}

export default Pawa