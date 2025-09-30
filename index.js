import { track, trigger,queueEffect, createEffect,templateCache, } from './reactive.js'
import {PawaElement,PawaComment} from './pawaElement.js';
import {If,event,Else,ElseIf,
  unMountElement,mountElement,For,States,ref,documentEvent,chunk
} from './power.js'
import {propsValidator,sanitizeTemplate, setPawaDevError, splitAndAdd, pawaWayRemover,stringToUniqueNumber } from './utils.js';
import {PawaDevTool} from './devtools.js';
import PawaComponent from './pawaComponent.js';
import {resume} from './script.js'
/**
 * @type{object}
 * @property {Array<{el?:HTMLElement,msg?:string,directives?:string}} errors
 */

window.__pawaDev = {
  tool:false,
  errors: [],
  totalEffect: 0,
  errorState: null,
  components: new Set(),
  renderCount: 0,
  reactiveUpdates: 0,
  totalComponent:0,
  performance: {
    renderTime: [],
    effectTime: [],
    componentTime: [],
    start:0,
    end:0
  },
  setError: ({el, msg, directives, stack,template,warn} = {}) => {
    if(__pawaDev.tool !== true) return
    if(__pawaDev.errorState) {
      __pawaDev.errorState.value = true
    }
    __pawaDev.errors.push({
      el,
      msg, 
      directives,
      stack,
      timestamp: Date.now(),
      template:template?template:''
    })
    if(warn){
      console.warn(msg,stack,template)
    }
    console.error(msg,stack)
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
const compoBeforeCall = new Set()
const compoAfterCall=new Set()
const renderBeforePawa=new Set()
const renderAfterPawa=new Set()
const renderBeforeChild=new Set()
const startsWithSet=new Set()
const fullNamePlugin=new Set()
const externalPlugin={}
const externalPluginMap=new Map()
let pawaAttributes=new Set()
export const escapePawaAttribute=new Set()
export const dependentPawaAttribute=new Set()

export const removePlugin=(...pluginName)=>{
  pluginName.forEach(n=>{
    if(pawaAttributes.has(n)){
      pawaAttributes.delete(n)
      delete externalPlugin[n]
      if(externalPluginMap.has(n)){
        const extArrar=externalPluginMap.get(n)
        extArrar.forEach(ex=>{
          dependentPawaAttribute.delete(ex)
        })
      }
    }

  })
}

/**
 * @typedef {{startsWith:string,escape:boolean,dependency:Array<string>,fullName:string,plugin:(el:HTMLElement | PawaElement,attr:object)=>void}} AttriPlugin
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
export const PluginSystem=(...func)=>{
  func.forEach(fn=>{
    /**
     * @type {PluginObject}
     */
    if (typeof fn !== 'function') {
      console.warn('plugin must be a function that returns the plugin objects')
      return
    }
    const getPlugin=fn()
    // attributes plugin or extension
    
    if (getPlugin?.attribute) {
      getPlugin.attribute.register.forEach(attrPlugins =>{
        if (attrPlugins.fullName && attrPlugins.startsWith) {
          console.warn('Either Plugins FullName or startsWith. you are not required to use to of does plugin registers at this same entry.')
          return
        }
        const extPluginArray=[]
        if (attrPlugins?.dependency && attrPlugins?.dependency.length > 0) {
          attr.Plugin.dependency.forEach(dp =>{
            if(dependentPawaAttribute.has(dp)){
              __pawaDev.setError({msg:`${dp} is already used - from pawa plugin it might cause some issues`,warn:true})
            }
            dependentPawaAttribute.add(dp)
            extPluginArray.push(dp)
          })
        }
        if (attrPlugins?.fullName) {
          if (pawaAttributes.has(attrPlugins.fullName) ) {
            console.warn(`attribute plugin already exist ${attrPlugins.fullName}`)
            return
          }
          if (attrPlugins?.escape) {
              escapePawaAttribute.add(attrPlugins.fullName)
          }
          pawaAttributes.add(attrPlugins.fullName)
        fullNamePlugin.add(attrPlugins.fullName)
        externalPlugin[attrPlugins.fullName]=attrPlugins?.plugin
        if(extPluginArray > 0) externalPluginMap.set(attrPlugins.fullName,extPluginArray)
        }else if (attrPlugins?.startsWith) {
          if (pawaAttributes.has(attrPlugins.startsWith) ) {
          console.warn(`attribute plugin already exist ${attrPlugins.startsWith}`)
          return
        }
        if (attrPlugins?.escape) {
            escapePawaAttribute.add(attrPlugins.startsWith)
          }
        pawaAttributes.add(attrPlugins.startsWith)
        startsWithSet.add(attrPlugins.startsWith)
        externalPlugin[attrPlugins.startsWith]=attrPlugins?.plugin
        if(extPluginArray > 0) externalPluginMap.set(attrPlugins.startsWith,extPluginArray)
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
export const keepContext=(context)=>{
  stateContext=context
  formerStateContext=stateContext
  
}
export const components=new Map()
const attrPlugin=new Set()
/**
 * @type {PawaComponent}
 */
let stateContext=null
export const getCurrentContext=() =>{ 
  return stateContext
}

let formerStateContext=null
let pawaContext={}

export const setPawaAttributes=(...attr) => {
  attr.forEach((att) => {
      if (pawaAttributes.has(att)) {
        throw Error(`${att} already exits`)
        return
      }
      pawaAttributes.add(att)
  })
}
const setDependentAttibute=(...name)=>{
  name.forEach(att=>{
    dependentPawaAttribute.add(att)
  })
}
setPawaAttributes('if','else-if','for','else','mount',
  'unmount','forKey','state-','$$-','props-','on-','out-',
  's-if','s-for','s-else','s-else-if','s-data-','script','script-error',
  'script-success','script-retry','pawa-component','chunk')
  setDependentAttibute('chunk-success','chunk-retry','chunk-error')
  
export const getPawaAttributes= () => {
    return pawaAttributes
}
export const setError = ({error}) => {
    if (!stateContext) {
    console.warn('must be used inside of a component')
    return
  }
  if (!stateContext._hasRun) {
    if (!stateContext?._error) {
      stateContext._error=[]
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
        if (components.has(name.toUpperCase())) continue;
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
      if (components.has(component.name.toUpperCase())) return;
      components.set(component.name.toUpperCase(), component);
    } else {
       console.warn('Component registration failed: Component must be a named function. This might happen in production builds without the pawajs Vite plugin.');
    }
  });
};

const pawaElementComponent= (name,callback) => {
    if (!name.startsWith('@')) {
      throw Error("Element component must start with '@'")
    }
    components.set(name,callback)
}
/**
 * PawaJs element component function for HTMLELEMENT not the main component system
 * @param {string} name
 * The name parameter must start with @ symbol sign 
 * @param {()=>void} callback 
 * The Element Component function
 */
export const pawaComponent=pawaElementComponent
/**
 * 
 * @param {()=>()=>any} callback 
 * A function that runs based on the deps and the returns are for unMounted hook 
 * ( from Array,Number,null deps) while deps(object) are for the main reactive effect
 * @param {Array|null|object|number} deps 
 * Array - for state dependency.
 * 
 * object- for any state used inside of the callback but under the use of element or component.
 * 
 * Number - before mount hook.
 * 
 * null- for Mount hook 
 * @returns {void}
 */
export const runEffect=(callback,deps) => {
  if (stateContext._hasRun) {
    return
  }
    if (stateContext) {
      if (!stateContext._hook) {
        stateContext._hook={}
      }
      if (!stateContext._hook.isMount) {
        stateContext._hook.isMount=[]
      }
      if (!stateContext._hook.beforeMount) {
        stateContext._hook.beforeMount=[]
      }
      if (!stateContext._hook.reactiveEffect) {
        stateContext._hook.reactiveEffect=[]
      }
      if (!stateContext._hook.effect) {
        stateContext._hook.effect=[]
      }
      if (deps === undefined || deps === null) {
        stateContext._hook.isMount.push(callback)
      } else if (typeof deps === 'object' && !Array.isArray(deps)) {
        stateContext._hook.reactiveEffect.push({deps:deps,effect:callback})
      } else if (Array.isArray(deps)) {     
        stateContext._hook.effect.push({
          deps:deps,
          effect:callback
        })
      } else if (typeof deps === 'number') {
        stateContext._hook.beforeMount.push(callback)
      }
    }
}

/**
 * 
 * @param {object} props 
 * @returns {object}
 */
export const useValidateComponent=(component,object)=>{
  if (typeof component === 'function' ) {
    if(component.name){
      component.validateProps=object
    }
  }
}
/**
 * @returns {{id:string,setValue:()=>void}}
 */
export const setContext=() => {
    const id = crypto.randomUUID()
    const setValue= (val={}) => {
      if (stateContext._hasRun) {
        return
      }
      if (!stateContext) {
        console.warn('set Context value must be inside of a component')
  return null
}
if (!stateContext._transportContext) {
  stateContext._transportContext={}
}
      stateContext._transportContext[id]=val
    }
    return {
      id,
      setValue
    }
    
}

/**
 * Get parent Context
 * @param {object} context
 * @return {object}
 */
export const useContext=(context) => {
    if (!stateContext) {
       console.warn('getContext must be called inside of a component')
  return
}
if (stateContext?._transportContext[context.id]) {
  return stateContext._transportContext[context.id]
} else {
  console.warn('this component not in the context tree')
}
}

/**
 * Get Current component context from the html
 * @returns {object}
 */
export const useInnerContext=()=>{
  if (!stateContext) {
    console.warn('must be used inside component')
    return
  }
  return stateContext._elementContext
}

/**
 * Insert into the html context in component
 * @param {object} obj 
 * @returns void
 */
export const useInsert = (obj={}) => {
    if (stateContext._hasRun) {
      return
    }
    if (!stateContext._insert) {
      stateContext._insert={}
    }
    Object.assign(stateContext._insert,obj)
    
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
export const setStateContext=(context) => {
  
  stateContext=null
    stateContext=context
    if (stateContext._hasRun) {
      return
    }
    stateContext._transportContext={}
    stateContext._formerContext=formerStateContext
    stateContext._reactiveProps={}
    stateContext._template=''
    stateContext._transportContext=formerStateContext?._transportContext
    formerStateContext=stateContext
}

const promiseCallback= (func,main) => {
  const promise=func()
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
 * @param {string|null}localStore
 * A string for identifing or creating the localStorage item (null by defualt)
 * @returns {{value:any,id:string,async?:boolean,failed?:boolean,retry?:()=>void}}
 * notice the async, failed and retry works when Promised is pas into initialValue Function.
 * 
 * id is not meant to be touched its pawajs way of tracking state  
 */
  export const $state=(initialValue,localStore=null,global=false)=>{
    if (stateContext?._hasRun && global === false) { 
      return {value:null,id:'2626262'}
    }   
    const id=crypto.randomUUID()
    const states={
      value:null,
      id:id
    }
    let promise
    if (initialValue instanceof Function) {
     const result=initialValue()
     if (result instanceof Promise) {
      promise=result
     states.async=true
     states.failed=false
     } else {
      states.value=result
     }
    } else {
      states.value=initialValue
    }
    if (localStore) {
      
      try {
        if (localStorage.getItem(localStore)) {
  const stored = JSON.parse(sanitizeTemplate(localStorage.getItem(localStore)))
  states.value = stored.value
  
} else {
  localStorage.setItem(localStore, JSON.stringify(states))
}
      } catch (e) {
        console.warn('error while trying to use localStorage')
      }
    }
    let timeOut
    const main= createDeepProxy(states, (target, property) => {
    if (localStore) {
      if (timeOut) {
        clearTimeout(timeOut)
      }
      timeOut=setTimeout(() => {
          localStorage.setItem(localStore,JSON.stringify(states))
      },50)
    }
    // console.log(target);
      globalEffectMap.forEach((effect) => {
        
        if (effect.deps?.has(target.id)) {
          if (effect.cleanup) {
            effect.cleanup();
          }
          effect.cleanup = effect.callback();
        } else if(effect.deps.size === 0){
          effect.cleanup = effect.callback();
        }
      });
    });  
    if (promise instanceof Promise) {
  
  promise.then(res => {
    main.value=res
    main.failed=false
    main.async=false
  }).catch(error =>{
    main.async=false
    main.failed=true
  })
  
  const asyncObject={
    retry:() => {
      promiseCallback(initialValue,main)
    }
  }
  Object.assign(main,asyncObject)
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
  
 export const LazyLoading=({imports,children,name,loading,error})=>{
     const asyncState=$state({
       loading:false,
       error:false,
     })
     const imp=imports()
     const componentName=name()
     const loaderSlot=loading()
     const errorSlot=error()
     const retry=()=>{
       asyncState.value.loading = true;
       imports().then(res => {
         // The component is expected to be the default export from the module.
         // We also check for a named export matching `name` for development convenience.
         const componentToRegister = res.default || res[componentName];
 
         if (componentToRegister) {
           // RegisterComponent expects ('Name', function), which is what we provide.
           RegisterComponent(componentName, componentToRegister);
           asyncState.value.loading = false;
         } else {
           console.error(`Lazy-loaded component for tag <${name}> not found in module. Make sure it's the default export or a named export matching the 'name' prop.`);
           __pawaDev.setError({ msg: `Lazy-loaded component for tag <${name}> not found. Make sure it's the default export.` });
           asyncState.value.loading = false;
           asyncState.value.error = true;
         }
       }).catch(err => {
         console.error(`Error loading component for tag <${name}>:`, err);
         __pawaDev.setError({ msg: `Error loading component for tag <${name}>: ${err.message}`, stack: err.stack });
         asyncState.value.loading = false;
         asyncState.value.error = true;
       });
     }
     runEffect(()=>{
       if (typeof imp === 'function') {
         retry()
       }
     },0)
      
     useInsert({asyncState,retry})
     return`
     <template>
       <template if='asyncState.value.loading'>
         ${loaderSlot}
       </template>
       <template if='asyncState.value.error'>
         ${errorSlot?errorSlot:''}
       </template>
       <template if='!asyncState.value.loading'>
        ${children}
       </template>
     </template>
     `
   }
   useValidateComponent({
     imports:{
       type:Function,
       strict:true,
       err:'import props is required and must be a Function.'
     },
     loading:{
       type:String,
       default:'<div>Loading...</div>'
     },
     name:{
       type:String,
       strict:true
     }
   })
  const elementComponent= (el,appTree) => {
      if (el._running) {
        return
      }
      if (el._pawaElementComponentName === '') {
        return
      }
      const compo=el._pawaElementComponent
      setStateContext(compo)
      compo.component({...el._props})
      appTree.stateContext=compo
      if (compo?._insert) {
    Object.assign(el._context,compo._insert)
  }
  compo?._hook?.isMount.forEach((hook) => {
    el._MountFunctions.push(hook)
})
el._MountFunctions.forEach((func) => {
      let result = func()
      if (typeof result === 'function') {
        el._unMountFunctions.push(result)
      }
})
el._MountFunctions=[]
compo?._hook?.effect.forEach((hook) => {
let result=  stateWatch(hook.effect,hook.deps)
if (typeof result === 'function') {
  el._unMountFunctions.push(result)
}
})   
  }  
  /**
   * 
   * @param {PawaElement|HTMLElement} el 
   * @param {object} appTree 
   * @returns null
   */
  const component =(el,appTree) => {
      if (el._running) {
        return
    }
    
    const endComment = document.createComment(`end ${el.tagName}`)
const comment = document.createComment(` ${el.tagName}`)
PawaComment.Element(comment)
el.replaceWith(endComment)
endComment.parentElement.insertBefore(comment,endComment)
el._underControl=comment
comment._componentElement=el
comment._controlComponent=true
    const props={}
    const children=el._componentChildren
    /**
     * @type {DocumentFragment}
     */
    const slot=el._slots
    const  mount=[]
    const  unmount=[]
    const slots={}
    const reactiveProps={}
    Array.from(slot.children).forEach(prop =>{
      if (prop.hasAttribute('prop')) {
        slots[prop.getAttribute('prop')]=()=>prop.innerHTML
      }else{
        console.warn('sloting props must have prop attribute')
      }
    })    
    //kill the template element
     el._isKill=true
    el._kill=()=>{
       pawaWayRemover(comment,endComment)
      comment.remove(),endComment.remove();
     }
    const insert=(arg={})=>{
      Object.assign(stateContext.context,arg)
}
    if (el._reactiveProps) {
      for (const [key,value] of Object.entries(el._reactiveProps)) {
        el._props[key]=value()
        reactiveProps[key]=value
      }
    }
    const validprops=el._component.validPropRule
    let done=true
    if(validprops && Object.entries(validprops).length > 0){
      done= propsValidator(validprops,{...el._props,...slots},el._componentName,el._template,el)
    }
    const app = {
      children,
      app:{insert},
      ...slots,
      ...el._props
    }
    for (const fn of compoBeforeCall) {
      try {
          fn(stateContext,app)
      } catch (error) {
        __pawaDev.setError({el:el,msg:error.message})
        console.error(error.message)
      }
    } 
    const div = document.createElement('div')
el._componentTerminate=() => {
    comment._terminateByComponent(endComment)
}
const component =el._component
setStateContext(component)
stateContext._prop={children,...el._props,...slots}
    stateContext._elementContext={...el._context}
    stateContext._name=el._componentName
    stateContext._reactiveProps=reactiveProps
    stateContext._template=el._template
    stateContext._recallEffect=()=>{
      
    }

let compo 
  try {
    if(done){
    compo= sanitizeTemplate(component.component(app))
    }else{
      compo=""
    }
  } catch (error) {
    setPawaDevError({
      message:`error from ${el._componentName} component  ${error.message}`,
      error:error,
      template:el._template
    })
  }
appTree.stateContext=component
// stateContext._hasRun=true
div.innerHTML = compo;
if (component?._insert) {
  Object.assign(el._context,component._insert)
}
      
if(Object.entries(el._restProps).length > 0){
  const findElement=div.querySelector('[--]') || div.querySelector('[rest]')
  if (findElement) {
    for (const [key,value] of Object.entries(el._restProps)) {
        findElement.setAttribute(value.name,value.value)
        findElement.removeAttribute('--')
        findElement.removeAttribute('rest')
      }
    }
  }
  for (const fn of compoAfterCall) {
    try {
      fn(stateContext,div?.firstElementChild,el)
    } catch (error) {
      __pawaDev.setError({el:el,msg:error.message})
      console.error(error.message)
    }
  }
if (el._component?._hook?.beforeMount) {
  el._component?._hook?.beforeMount.forEach((bfm) => {
 const result= bfm()
 if (typeof result === 'function') {
   result()
 }
})
}
el._component?._hook?.isMount.forEach((hook) => {
    el._MountFunctions.push(hook)
})
el._component?._hook?.isUnMount.forEach((hook) => {
    el._unMountFunctions.push(hook)
})
const child=div.children[0]

if (child !== null ) {
  if (child) {
endComment.parentElement.insertBefore(child, endComment)

stateContext?._error?.forEach((error) => {
  throw Error(error)
})
render(child, el._context, appTree) 
  } 
}
Promise.resolve().then(()=>{
  el._component?._hook?.effect.forEach((hook) => {
    const result=stateWatch(hook.effect,hook.deps)
    if (typeof result === 'function') {
      el._unMountFunctions.push(result)
    }
  })
    
  if (el._component?._hook?.reactiveEffect) {
    el._component?._hook?.reactiveEffect.forEach((hook) => {
      const effect=hook.effect()
      
      if (hook.deps?.component) {
        createEffect(() => {
          return effect()
        },el) 
      } else {
        createEffect(() => {
          return effect()
        },hook.deps.value)
      }
    })
  }
  el._MountFunctions.forEach((func) => {
    const result=func()
    if (typeof result === 'function') {
      el._unMountFunctions.push(result)
    }
  })
  
})
stateContext._hasRun=true
formerStateContext=stateContext._formerContext

if (stateContext._transportContext) {
  let contextId = stateContext._transportContext
  delete pawaContext[contextId]
}
 stateContext=formerStateContext  
__pawaDev.totalComponent++
   
    
    
  }
  
  /**
   * @param {PawaElement | HTMLElement} el
   */
  const mainAttribute = (el, exp) => {
    const attrMap = new Map();
    if(el._running) return
    // Store original attribute value
    if (el._hasForOrIf()) {
      return
    }
    if (el._componentName) {
      return
    }
    attrMap.set(exp.name, exp.value);
    el._preRenderAvoid.push(exp.name)
    const removeAttribute = new Set()
    removeAttribute.add('disabled')
    el._mainAttribute[exp.name]=exp.value
    const evaluate = () => {
      
      try{
        // Always use original value from map for evaluation
      let value = attrMap.get(exp.name);
      let isBoolean
      const regex = /@{([^}]*)}/g;
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        
        value = value.replace(regex, (match, expression) => {
          const func = new Function(...keys, `return ${expression}`);
          isBoolean=func(...values)
          return func(...values);
        });
        
      if (removeAttribute.has(exp.name)) {
        if (isBoolean) {
          el.setAttribute(exp.name, '');
        } else {
          el.removeAttribute(exp.name)
        }
      } else {
        el.setAttribute(exp.name, value);
      }
      
      
      }catch(error){
        console.warn(`failed at attribute ${exp.name}`,el)
        setPawaDevError({
          message:`error at attribute ${error.message}`,
          error:error,
          template:el._template
        })
      }
    };
    // createEffect
  
    createEffect(() => {
      evaluate();
    });
  };
  
  const textContentHandler = (el) => {
    if (el._hasForOrIf()) {
      return
    }
    if (el._running) {
      return
    }
    el._tree.textContextAvoid=true
    const nodesMap = new Map();
    
    // Get all text nodes and store their original content
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(node => {
      nodesMap.set(node, node.nodeValue);
    });
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
              el._textContent[expression]=value
              const func = new Function(...keys, `return ${expression}`);
              return String(func(...values));
            });
          
          
          textNode.nodeValue = value;
          
        });
      } catch (error) {
        // console.warn(`error at ${el} textcontent`)
        setPawaDevError({
          message:`error at TextContent ${error.message}`,
          error:error,
          template:el._template
        })
      }
    };
  
    createEffect(() => {
      evaluate();
    },el);
  };
  
  const template=(el,tree) => {
    if (el._running) {
        return
    }
    // console.log(stateContext,el.content.children);
    
     const comment=document.createComment('<template>')
     const endComment=document.createComment('</template>')
     el.replaceWith(endComment)
     //kill the template element
     el._isKill=true
    el._kill=()=>{
       pawaWayRemover(comment,endComment)
      comment.remove(),endComment.remove();
     }
     endComment.parentElement.insertBefore(comment,endComment)
     el._underControl=comment
     let element=[]
     Array.from(el.content.children).forEach((child) => {
         endComment.parentElement.insertBefore(child,endComment)
         element.push(child)
        //  render(child,el._context,tree)   
     })
     element.forEach(child=>{
        render(child,el._context,tree) 
    })
  }
  /**
   * @param {HTMLElement} el
   */
  const innerHtml = (el,context) => {
    const nodesMap = new Map();
    if (el.getAttribute('if') || el.getAttribute('else')|| el.getAttribute('for') || el.getAttribute('else-if')) {
      return
    }
    if (components.has(splitAndAdd(el.tagName))) {
      return
    }
    el.setAttribute('inner-html','true')
    // Get all text nodes and store original value
    const textNodes = Array.from(el.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE
    );
  
    textNodes.forEach((node) => {
      nodesMap.set(node, node.nodeValue);
    });
  
    const evaluate = () => {
      try {
        
        textNodes.forEach((textNode) => {
          const originalValue = nodesMap.get(textNode);
          const regex = /@html\((.*?)\)/g;
          let match;
          let hasHtml = false;
          const fragments = [];
  
          let lastIndex = 0;
  
          while ((match = regex.exec(originalValue))) {
            const before = originalValue.slice(lastIndex, match.index);
            if (before) fragments.push(document.createTextNode(before));
  
            let expression = match[1];
            let htmlString = '';
            
            
            try {
              // Use `Function` constructor for safe evaluation
              const keys = Object.keys(context || {});
              const values = keys.map((k) => resolvePath(k, context));    
              const func = new Function(...keys, `return ${expression}`);
              htmlString = func(...values);
            } catch (e) {
              htmlString = `<span style="color:red;">[Invalid Expression]</span>`;
            }
  
            const temp = document.createElement('div');
            temp.innerHTML = sanitizeTemplate(htmlString);
            fragments.push(...temp.childNodes);
            hasHtml = true;
  
            lastIndex = regex.lastIndex;
          }
  
          const after = originalValue.slice(lastIndex);
          if (after) fragments.push(document.createTextNode(after));
  
          if (hasHtml) {
            const parent = textNode.parentNode;
            parent.insertBefore(document.createDocumentFragment(), textNode);
            fragments.forEach((frag) => parent.insertBefore(frag, textNode));
            parent.removeChild(textNode);
          }
        });
      } catch (error) {
        console.warn(`Error while evaluating innerHTML for`, el, error);
        setPawaDevError({
          message:`Error while evaluating innerHTML ${error.message}`,
          error:error,
          template:el._template
        })
      }
    };
  
    // Helper to resolve nested properties
    const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };
  
    evaluate();
  };
  
  const directives={
    if:If,
    else:Else,
    for:For,
    'else-if':ElseIf,
    mount:mountElement,
    unmount:unMountElement,
    ref:ref,
    script:resume,
    chunk:chunk
  }
  export const useRef=() => {
    return{value:null}
  }
export let appRecorder
  const afterInitialRender = (cb) => {
  requestAnimationFrame(() => {
    requestAnimationFrame(cb);
  });
};

 export const render= (el,contexts={},tree) => {
   if (el.tagName === 'SCRIPT') {
     return false
   }
   const context={
        ...contexts
    }

    if(Array.from(el.childNodes).some(node => 
      node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@html(')
   ) && !el.hasAttribute('pawa-avoid') ) {
    if(el._scriptFetching)return
     innerHtml(el,context)
   } 
  for (const fn of renderBeforePawa) {
  try {
    fn(el,context)
  } catch (error) {
    __pawaDev.setError({el:el,msg:error.message})
    console.error(error.message)
  }
}
    PawaElement.Element(el,context)
    let appTree = {
  element: el.tagName,
  pawaAttributes: el._pawaAttribute,
  parent:el.getAttribute('inner-html')?{}:tree,
  serverKey:el.getAttribute('s-key'),
  running:false,
  thisSame:false,
  component:[],
  isComponent: el._componentOrTemplate || el._isElementComponent || false,
  stateContext:stateContext||null,
  children:[],
  matched:false,
  new:false,
  textContextAvoid:false,
  primaryAttribute:"",
  preRenderInto:false,
  alreadyMatched:false,
  matchedNode:null,
  componentName:el._componentName,
  originalChildren:[],
  context:el._context,
  id:crypto.randomUUID(),
  el:el,
  remove:()=>{
      const index=tree.children.findIndex(item => item.id === appTree.id)
      if (index !== -1) {
        tree.children.splice(index,1)
      }
  }
}
for (const fn of renderAfterPawa) {
  try {
    fn(el)
  } catch (error) {
    __pawaDev.setError({el:el,msg:error.message})
    console.error(error.message)
  }
}
if (tree && !el.getAttribute('inner-html')) {
  tree.children.push(appTree)
} 
el._tree=appTree
    if(Array.from(el.childNodes).some(node => 
      node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
   ) && !el._avoidPawaRender) {
     textContentHandler(el)
   } 
   let startAttribute=false
      const startObject={}
      //get startsWith plugin
      if(!el._avoidPawaRender){

        startsWithSet.forEach( starts=>{
         
         el._attributes.forEach(attr =>{
           if(attr.name.startsWith('on:')){
             startAttribute=true
             startObject[attr.name]=starts
           }
         })
        })
      el._attributes.forEach(attr=> {
        if (directives[attr.name]) {
          directives[attr.name](el,attr,stateContext,appTree)
        } else if (attr.name.startsWith('on-')) {
          event(el,attr,stateContext)
        } else if (attr.value.includes('@{')) {
          mainAttribute(el,attr)
        } else if (attr.name.startsWith('state-')) {
          States(el,attr,getCurrentContext())
        } else if (attr.name.startsWith('out-')) {
          documentEvent(el,attr)
        }
        else if (attr.name === 'pawa-component') {
          if(el._scriptFetching) return
          elementComponent(el,appTree)
          
        }else if(fullNamePlugin.has(attr.name)) {
          if(externalPlugin[attr.name]){
            const plugin= externalPlugin[attr.name]
            try{
              if (typeof plugin !== 'function') {
                console.warn(`${attr.name} plugin must be a function`)
                return
              }
              plugin(el,attr)
            }catch(error){
              console.warn(error.message,error.stack)
            }
          }
        }else if(startAttribute){
          const name=startObject[attr.name]
          if(externalPlugin[name]){
            const plugin= externalPlugin[name]
            try{
              if (typeof plugin !== 'function') {
                console.warn(`${name} plugin must be a function`)
                return
              }
              plugin(el,attr)
            }catch(error){
              console.warn(error.message,error.stack)
            }
          }
        }
        
          
      })
      }
    if (el._componentName && !el._avoidPawaRender) {
      if(el._scriptFetching) return
    component(el,appTree)
      return
    }
    if (el._elementType === 'template' && !el._avoidPawaRender) {
      if(el._scriptFetching)return
      template(el,appTree)
      return true
    }
    
    if (el._out === false || el._running === false || el._componentOrTemplate !== true ) {
      
      if (el._running || el._scriptFetching) {
        return true
      }
      for (const fn of renderBeforeChild) {
  try {
    fn(el)
  } catch (error) {
    __pawaDev.setError({el:el,msg:error.message})
    console.error(error.message)
  }
}
      // console.log(stateContext);
      Array.from(el.children).forEach((child) => {
          render(child, context,appTree)
          if (child) {
            
          }
      })
el._callMount()

      

if (el._pawaElementComponentName) {
  formerStateContext = stateContext._formerContext
  stateContext._hasRun=true
  if (stateContext._transportContext) {
  let contextId = stateContext._transportContext
  delete pawaContext[contextId]
}
stateContext = formerStateContext
}
  }
    
 }
 /**
  * 
  * @param {{devTools:boolean,minifier:boolean}} tools 
  */
export const pawaTools=(tools={devTools:true})=>{
  __pawaDev.tool=devTools
}
export const pawaStartApp=(app,callback) => {
  if (typeof callback !=='function') {
    throw Error('must be a component function')
  }
     pawaElementComponent('@pawa-app',callback)
     app?.setAttribute('pawa-component','@pawa-app')
     appRecorder=app
  render(app)
  
 }
 
 const Pawa={
   useInsert,
   pawaTools,
   useContext,
   useValidateComponent,
   setPawaAttributes,
   setContext,
   $state,
   pawaComponent,
   pawaStartApp,
   RegisterComponent,
   runEffect
 }
 
 export default Pawa
