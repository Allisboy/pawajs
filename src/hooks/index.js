import { getComponentGraph } from "../component/index.js"
import { customEventMap } from "../global.js"
import { getServerInstance } from "../server/index.js"
import { stateWatch } from "./state.js"

const serverInstance=getServerInstance()
/**
 * to validate component for runtime rules
 * @param {Function} component
 * @param {{[any]:{type?:Function|String|Object|Number|Array},defaut?:number|string|Array|object,err?:string,strict?:boolean}} object
 * 
 */
export const useValidateComponent = (component, object) => {
        if (typeof component === 'function') {
            if (component.name) {
                component.validateProps = object
            }
        }
    }

    /**
     * @returns {{id:string,setValue:(items:{[any]:value:any})=>void}}
     * + Sets the context
     */
export const setContext = () => {
        const id = crypto.randomUUID()
        const setValue = (val = {}) => {
            const componentGraph=getComponentGraph()
            if (!componentGraph.firstTime) {
                return
            }
            if (!componentGraph) {
                console.warn('set Context value must be inside of a component')
                return null
            }
            if (!componentGraph.transport) {
                componentGraph.transport = {}
            }
            if (componentGraph.transport[id]) {
                delete componentGraph.transport[id]
            }
            componentGraph.transport[id] = val
        }
        return {
            id,
            setValue
        }
    

}

export const PawaCustomEvent=(eventName,handler)=>{
    if(typeof window === 'undefined')return
    if (customEventMap.has(eventName))return
    customEventMap.set(eventName, handler)
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
export const useRef=()=>{
    if (typeof window === 'undefined') {
      const cxt=getComponentGraph()
      cxt.useRef=true
      
    }
    return {value:null}
}
/**
 * Get parent Context
 * @param {object} context
 * @return {object}
 */
export const useContext = (context) => {
    
        const componentGraph=getComponentGraph()
        if (!componentGraph) {
            console.warn('getContext must be called inside of a component')
            return
        }
        if (componentGraph?.transport[context.id]) {
            const contexts = componentGraph.transport[context.id]
            return contexts
        } 
    
}

/**
 * Get Current component context from the html (the component parent)
 * @returns {object}
 */
export const useInnerContext = () => {
        const componentGraph=getComponentGraph()
        if (!componentGraph) {
            console.warn('must be used inside component')
            return
        }
        return componentGraph.context
    
}

export const forwardProps=(props={})=>{
        const componentGraph=getComponentGraph()
        componentGraph.rest=Object.entries(props).length > 0 ? props : {bPAr:''}
   
}
    /**
     * Insert into the html context in component
     * @param {object} obj 
     * @returns void
     */
export const useInsert = (obj = {}) => {
        const componentGraph=getComponentGraph()
        if (!componentGraph.firstTime) {
            return
        }
Object.assign(componentGraph.context, obj)
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
    if (typeof window !== 'undefined') {
        const renderGraph=getComponentGraph()
        
        if (!renderGraph.firstTime) {
            return
        }
        const outsideComponent = renderGraph.name === 'ROOT'

        if (renderGraph) {
            if (deps === undefined || deps === null) {
                
                if (!outsideComponent) {
                    // Inside component — register for later
                    renderGraph.mount.push(callback)
                } else {
                    // Outside component — execute immediately
                        const cleanup=callback()
                        if (typeof cleanup === 'function') {
                            // Register global cleanup on page unload
                            window.addEventListener('beforeunload', cleanup, { once: true })
                        }
                    
                }
            } else if (typeof deps === 'object' && !Array.isArray(deps)) {
                // readonly reactive effect — needs component context
                // silently ignore outside component
                if (!outsideComponent) {
                    renderGraph.readOnlyffect.push({ deps, effect: callback })
                }else{
                    
                    let terminateEffect=new Set()
                    const mainFunction=callback()
                   const eff= createEffect(()=>{
                        const cleanUp=mainFunction?.()
                        if (typeof cleanUp === 'function') {
                            return cleanUp
                        }
                    },renderGraph)
                    if (eff) {
                        window.addEventListener('beforeunload',()=>{
                            eff()
                        },deps?.update)
                    }
                }
            } else if (Array.isArray(deps)) {
                // watch — needs component context
                // silently ignore outside component
                if (!outsideComponent) {
                    renderGraph.arrayEffect.push({ deps, effect: callback })
                }else{
                    //used pawajs stateWatch
                    const cleanUp=stateWatch(callback,deps)
                    window.addEventListener('beforeunload',cleanUp,{once:true})
                }
            } else if (typeof deps === 'number') {
                if (!outsideComponent) {
                    // Inside component — register for later
                    renderGraph.beforeMount.push(callback)
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
    }else{
        const componentGraph=getComponentGraph()
        componentGraph.runEffect=true
    }
}
