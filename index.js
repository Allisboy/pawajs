import { track, trigger,queueEffect, createEffect,templateCache, } from './reactive.js'
import {PawaElement,PawaComment} from './pawaElement.js';
import {If,event,Else,ElseIf,
  unMountElement,mountElement,For,States,ref
} from './power.js'
import {propsValidator,sanitizeTemplate} from './utils.js';
import {PawaDevTool} from './devTools.js';
window.__pawaDev={
  errors:[],
  totalEffect:0,
  setError:({el,msg,directives}={}) => {
      __pawaDev.errors.push({el,msg,directives})
      console.error(msg)
  }
}

export const keepContext=(context)=>{
  stateContext=context
  formerStateContext=stateContext
  
}
export const components=new Map()
const plugin=new Set()
let stateContext=null
export const getCurrentContext=() =>{ 
  return stateContext
}
let pawaAttributes=new Set()
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

setPawaAttributes('if','else-if','for','else','mount','unmount','forKey','state-','$$-','props-','event-','server-if','server-for','server-else','server-else-if','pawa-component')
export const getPawaAttributes= () => {
    return pawaAttributes
}
export const setPlugin=(...plugins) => {
    plugins.forEach((arg) => {
       if (typeof arg !== 'function') {
         return
       }
       plugin.add(arg)
    })
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
export const RegisterComponent = (...component) => {
  component.forEach((c) => {
    if (!c.name) {
      console.warn('Component registration failed: Component must have a name property');
      return;
    }
    if (components.has(c.name.toUpperCase)) return;
    components.set(c.name.toUpperCase(), c);

  });
};
const pawaElementComponent= (name,callback) => {
    if (!name.startsWith('@')) {
      throw Error("Element component must start with '@'")
    }
    components.set(name,callback)
}
export const pawaComponent=pawaElementComponent
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

export const useValidateProps=(props={}) => {
  if (!stateContext) {
    console.warn('must be used inside of a component')
    return
  }
    
    return propsValidator(props,stateContext._prop,stateContext._name)
}

export const setContext=() => {
  if (stateContext) {
    console.warn('setContext not meant to be in a component but outside')
    return null
  }
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
export const useAsync= (...promise) => {
    if (stateContext._hasRun) {
      const then=()=>true
      return {then}
    }
    if (!stateContext._await) {
      stateContext._await=[]
      stateContext._then=null
    }
    promise.forEach((prom) => {
        stateContext._await.push(prom)
    })
    const then= (callback) => {
        stateContext._then=callback
    }
    return {then}
}

export const useInnerContext=()=>{
  if (!stateContext) {
    console.warn('must be used inside component')
    return
  }
  return stateContext._elementContext
}
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
  let globalActiveEffect = null;
let stateIndex=0
export const setStateContext=(context) => {
  
  stateContext=null
    stateContext=context
    if (stateContext._hasRun) {
      stateIndex=0
      return
    }
    stateContext._transportContext={}
    stateContext._formerContext=formerStateContext
    stateContext._transportContext=formerStateContext?._transportContext
    formerStateContext=stateContext
    stateIndex=0
}

const promiseCallback= (promise,main) => {
    promise.then(res => {
  main.value = res
  main.failed = false
  main.async = false
}).catch(error => {
  main.async = false
  main.failed = true
})
}


  export const $state=(initialValue,localStore=null)=>{
    if (stateContext === null) {
      throw Error('state can not be created outside of a component')
    }
    if (stateContext._hasRun) {
      
      return {value:null,id:'2626262'}
    }
    stateIndex++
    //console.log(stateContext)
    if (stateContext?._stateMap?.get(stateIndex)) {
      const sta=stateContext._stateMap.get(stateIndex)
    
      return sta
    } else {
      const id=crypto.randomUUID()
      const states={
        value:null,
        id:id
    }
    let promise
    if (initialValue instanceof Promise) {
     promise=initialValue
     states.async=true
     states.failed=false
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
    if (target.id === states.id && localStore) {
      if (timeOut) {
        clearTimeout(timeOut)
      }
      timeOut=setTimeout(() => {
          localStorage.setItem(localStore,JSON.stringify(target))
      },50)
    }
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
    if (stateContext._stateMap) {
      stateContext._stateMap.set(stateIndex,main)
      
    } else {
      stateContext._stateMap=new Map()
      stateContext._stateMap.set(stateIndex,main)
    }
    
    if (initialValue instanceof Promise) {
  
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
      promiseCallback(promise,main)
    }
  }
  Object.assign(main,asyncObject)
  return main
} else {
  return main
}
    
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
  
 export const LazyLoading=({imports,children,loading,error})=>{
 const {}= useValidateProps({
    imports:{
      type:Function,
      strict:true,
    },
    loading:{
      type:String,
      default:'<div>Loading...</div>'
    }
  })
    const asyncState=$state({
      loading:false,
      error:false,
    })
    const retry=()=>{
      asyncState.value.loading=true
        imports().then(res =>{

          asyncState.value.loading=false
        }).catch(err=>{
          asyncState.value.loading=false
          asyncState.value.error=true
          
        })
    }
    runEffect(()=>{
      if (typeof imports === 'function') {
        retry()
      }
    },0)
    
    
    useInsert({asyncState,retry})
    return`
    <template>
      <template if='asyncState.value.loading'>
        ${loading}
      </template>
      <template if='asyncState.value.error'>
        ${error}
      </template>
      <template if='!asyncState.value.loading'>
       ${children}
      </template>
    </template>
    `
  }
  RegisterComponent(LazyLoading)
  
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

compo?._hook?.effect.forEach((hook) => {
let result=  stateWatch(hook.effect,hook.deps)
if (typeof result === 'function') {
  el._unMountFunctions.push(result)
}
})

      
  }
  
  const component =(el,appTree) => {
      if (el._running) {
        return
    }
    
    const endComment = document.createComment(`end ${el.tagName}`)
const comment = document.createComment(` ${el.tagName}`)
PawaComment.Element(comment)
el.replaceWith(endComment)
endComment.parentElement.insertBefore(comment,endComment)
comment._componentElement=el
comment._controlComponent=true
    const props={}
    const children=el._componentChildren
    const slot=el._slots
    const  mount=[]
    const  unmount=[]
    const slots={}
    Array.from(slot.children).forEach(prop =>{
      if (prop.getAttribute('prop')) {
        // console.log(prop);
        
        slots[prop.getAttribute('prop')]=prop.innerHTML
      }else{
        console.warn('sloting props must have prop attribute')
      }
    })    
    const app = {
      children,
      ...slots,
      ...el._props
    }
    
    const div = document.createElement('div')
el._componentTerminate=() => {
    comment._terminateByComponent(endComment)
}
const component =el._component

    setStateContext(component)
    // console.log(stateContext);
    stateContext._elementContext={...el._context}
    stateContext._prop={children,...el._props}
    stateContext._name=el._componentName

const compo = sanitizeTemplate(component.component(app))
appTree.stateContext=component
// stateContext._hasRun=true

  if (component?._insert) {
    Object.assign(el._context,component._insert)
  }
      
div.innerHTML = compo
      ;
      
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
      
      createEffect(() => {
        return effect()
      },hook.deps.value)
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

   
    
    
  }
  
  
  const mainAttribute = (el, exp) => {
    const attrMap = new Map();
    // Store original attribute value
    if (exp.name.startsWith('props-')) {
      return
    }else if (exp.name.startsWith('$$-')) {
      return
    }
    attrMap.set(exp.name, exp.value);
    const removeAttribute = new Set()
    removeAttribute.add('disabled')
    el._mainAttribute[attr.name]=exp.value
    const evaluate = () => {
      
      try{
        // Always use original value from map for evaluation
      let value = attrMap.get(exp.name);
      const regex = /@{([^}]*)}/g;
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        
        value = value.replace(regex, (match, expression) => {
          const func = new Function(...keys, `return ${expression}`);
          return func(...values);
        });
        
      if (removeAttribute.has(exp.name)) {
        if (value) {
          el.setAttribute(exp.name, '');
        } else {
          el.removeAttribute(exp.name)
        }
      } else {
        el.setAttribute(exp.name, value);
      }
      
      
      }catch(error){
        console.warn(`failed at attribute ${exp.name}`)
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
        console.warn(`error at ${el} textcontent`)
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
     endComment.parentElement.insertBefore(comment,endComment)
     
     Array.from(el.content.children).forEach((child) => {
         endComment.parentElement.insertBefore(child,endComment)
         
         render(child,el._context,tree)
         
     })
  }
  const directives={
    if:If,
    else:Else,
    for:For,
    'else-if':ElseIf,
    mount:mountElement,
    unmount:unMountElement,
    ref:ref
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
const withFinish = (fn) =>
  new Promise((resolve) => {
    fn();
    setTimeout(() => resolve(true), 0);
  });
 export const render= (el,contexts={},tree) => {
   if (el.tagName === 'SCRIPT') {
     return false
   }
   const context={
        ...contexts
    }
    
    PawaElement.Element(el,context)
    let appTree = {
  element: el.tagName,
  pawaAttributes: el._pawaAttribute,
  parent:tree,
  serverKey:el.getAttribute('server-key'),
  running:false,
  thisSame:tree?.running||false,
  component:[],
  isComponent: el._componentOrTemplate || el._isElementComponent || false,
  stateContext:null,
  children:[],
  matched:false,
  new:false,
  preRenderInto:false,
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
if (tree) {
  tree.children.push(appTree)
} 
el._tree=appTree
    if(Array.from(el.childNodes).some(node => 
      node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
   )) {
     textContentHandler(el)
   }
    el._attributes.forEach(attr=> {
      if (directives[attr.name]) {
        directives[attr.name](el,attr,stateContext,appTree)
      } else if (attr.name.startsWith('on-')) {
        event(el,attr,stateContext)
      } else if (attr.value.includes('@{')) {
        mainAttribute(el,attr)
      } else if (attr.name.startsWith('state-')) {
        States(el,attr,getCurrentContext())
      } else if (attr.name === 'pawa-component') {
        
        elementComponent(el,appTree)
        
      }
      else {
        plugin.forEach((plugins) => {
            plugins(el,attr)
        })
      }
        
    })
    if (el._componentName) {
    component(el,appTree)
      return
    }
    if (el._elementType === 'template') {
      template(el,appTree)
      return true
    }
    
    if (el._out === false || el._running === false || el._componentOrTemplate !== true ) {
      
      if (el._running) {
        return true
      }
      // console.log(stateContext);
      Array.from(el.children).forEach((child) => {
          render(child, context,appTree)
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
 
export const pawaStartApp=(app,callback,devTools=true) => {
  if (typeof callback !=='function') {
    throw Error('must be a component function')
  }
     pawaElementComponent('@pawa-app',callback)
     app?.setAttribute('pawa-component','@pawa-app')
     appRecorder=app
  RegisterComponent(PawaDevTool)
  render(app)
  
 }
 
 const Pawa={
   useAsync,
   useInsert,
   useContext,
   useValidateProps,
   setPlugin,
   setPawaAttributes,
   setContext,
   $state,
   pawaComponent,
   pawaStartApp,
   RegisterComponent,
   runEffect
 }
 
 export default Pawa
