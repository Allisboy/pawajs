import { track, trigger,queueEffect, createEffect,templateCache, } from './reactive.js'
import {PawaElement,PawaComment} from './pawaElement.js';
import {If,event,Else,ElseIf,
  unMountElement,mountElement,For,States
} from './power.js'
import {propsValidator,sanitizeTemplate} from './utils.js';


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
      if (!stateContext._hook.isUnMount) {
        stateContext._hook.isUnMount=[]
      }
      if (!stateContext._hook.effect) {
        stateContext._hook.effect=[]
      }
      if (deps === undefined || deps === null) {
        stateContext._hook.isMount.push(callback)
      } else if (typeof deps === 'string') {
        stateContext._hook.isUnMount.push(callback)
      } else if (Array.isArray(deps)) {
        
        stateContext._hook.effect.push({
          deps:deps,
          effect:callback
        })
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
if (stateContext._transportContext[context.id]) {
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
  
  
  
  const awaitElement=(el) => {
      if (el._running) {
  return
}
    const clone=el.cloneNode(true)
    const loadDiv=document.createElement('div')
    const errorDiv=document.createElement('div')
    const endComment=document.createComment(`end ${el.tagName}`)
      const comment=document.createComment(` ${el.tagName}`)
      PawaComment.Element(endComment)
      PawaComment.Element(comment)
      el.replaceWith(endComment)
      endComment.parentElement.insertBefore(comment,endComment)
      const loader=el.querySelector('[loader]')
      const error =el.querySelector('[error]')
      if (loader) {
        loadDiv.appendChild(loader)
      }
      if (error) {
        errorDiv.appendChild(error)
      }
         const removeLoader=() => {
          loader._remove()
      }
      const old=stateContext
      console.log(old)
      let oldState=stateContext?._formerContext
      
      const reset = () => {
        
        stateContext=old
        formerStateContext=oldState
          comment._removeSiblings(endComment)
          comment.remove()
          
          endComment.replaceWith(clone)
          
          render(clone,el._context)
          
      }
      const setError=() => {
          loader._remove()
          if (error) {
            endComment.parentElement.insertBefore(error,endComment)
            el._context.tryBack=reset
            render(error,el._context)
          }
      }
      endComment._setData({
        loader:loader?removeLoader:null,
        error:error?setError:null
      })
      
      if (loader) {
        endComment.parentElement.insertBefore(loader,endComment)
        render(loader,el._context)
      }
      Array.from(el.children).forEach((child) => {
          endComment.parentElement.insertBefore(child,endComment)
          render(child,el._context)
      })
   
      
  }
  
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
  
  const component =async(el,appTree) => {
      if (el._running) {
        return
    }
    
    const endComment = document.createComment(`end ${el.tagName}`)
const comment = document.createComment(` ${el.tagName}`)
el.replaceWith(endComment)
    const props={}
    const children=el._componentChildren
    const  mount=[]
    const  unmount=[]
    
    const app = {
      children,
      ...el._props
    }
    
    const div = document.createElement('div')

const component =el._component

    setStateContext(component)
    stateContext._prop={children,...el._props}
    stateContext._name=el._componentName
          
          

const compo = sanitizeTemplate(component.component(app))
appTree.stateContext=component
stateContext._hasRun=true

  if (component?._insert) {
    Object.assign(el._context,component._insert)
  }
  
    if (stateContext?._await &&  stateContext?._await.length > 0) {
      
     const getEndComment=endComment.nextSibling
      Promise.all(stateContext._await).then((res)=>{
        
        if (stateContext?._then) {
          stateContext._then(res)
        }
        
        div.innerHTML = compo
      
Array.from(div.children).forEach((child) => {
  
  endComment.parentElement.insertBefore(child, endComment)
  if (getEndComment?._data?.loader) {
    getEndComment._data.loader()
  }
  //console.log(child)
  render(child, el._context,appTree)
})
formerStateContext=stateContext._formerContext
stateContext._hasRun=true
if (stateContext._transportContext) {
  let contextId=stateContext._transportContext
  delete pawaContext[contextId]
}
    stateContext=formerStateContext

el._component?._hook?.isMount.forEach((hook) => {
    el._MountFunctions.push(hook)
})


el._unMountFunctions.forEach((func) => {
  newElement._unMountFunctions.push(func)
})
setTimeout(() => {
    el._MountFunctions.forEach((func) => {
  let result=func()
  if (typeof result === 'function') {
    el._unMountFunctions.push(result)
  }
})
el._component?._hook?.effect.forEach((hook) => {
  let result=stateWatch(hook.effect,hook.deps)
  
})
},50)
      }).catch(error =>{
        if (typeof getEndComment._data?.error === 'function') {
          getEndComment._data.error()
        }
      
      })
    } else {
      
div.innerHTML = compo
el._component?._hook?.isMount.forEach((hook) => {
    el._MountFunctions.push(hook)
})
el._component?._hook?.isUnMount.forEach((hook) => {
    el._unMountFunctions.push(hook)
})

Array.from(div.children).forEach((child) => {
  endComment.parentElement.insertBefore(child,endComment)
  render(child, el._context,appTree)
})
formerStateContext=stateContext._formerContext
stateContext._hasRun=true
if (stateContext._transportContext) {
  let contextId = stateContext._transportContext
  delete pawaContext[contextId]
}
    stateContext=formerStateContext
el._component?._hook?.effect.forEach((hook) => {
  stateWatch(hook.effect,hook.deps)
})
el._MountFunctions.forEach((func) => {
  func()
})
el._unMountFunctions.forEach((func) => {
  newElement._unMountFunctions.push(func)
})
    }
    
    
  }
  
  const lazyLoading=(el) => {
    if (el._running) {
      return
    }
    const loadDiv=document.createElement('div')
    const errorDiv=document.createElement('div')
    const name= el.getAttribute('name')
    const importFunc = el.getAttribute('import')
    const endComment=document.createComment('end Import')
    const comment=PawaComment.Element(document.createComment('import'))
    el.replaceWith(endComment)
    
    endComment.parentElement.insertBefore(comment,endComment)
    const error = el.querySelector('[error-import]')
      const loadingElement=el.querySelector('[while-fetching]')
      if (error) {
        errorDiv.appendChild(error)
      }
      if (loadingElement) {
        loadDiv.appendChild(loadingElement)
        
        endComment.parentElement.insertBefore(loadingElement,endComment)
      
        render(loadingElement,el._context)
      }
    try {
      const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, el._context));
const func= new Function(...keys,`return ${importFunc}`)(...values)
let value=func()
if (typeof value.then === 'function') {
      value.then(res => {
  if (res[name]) {
    comment._removeSiblings(endComment)
    components.set(name.toUpperCase(),res[name])
    
    const element=el.firstElementChild
    endComment.parentElement.insertBefore(element,endComment)
    delete el._context[name]
    render(element,el._context)
    
  }
})
    }
    if (typeof value.catch === 'function') {
      value.catch((e) => {
          comment._removeSiblings(endComment)


if (error) {
  
  const first = error.firstElementChild
  endComment.parentElement.insertBefore(first, endComment)
  render(first, el._context)
} else {
  throw e
}
      })
    }
    } catch (e) {
      throw e
    }
    
  }
  
  const mainAttribute = (el, exp) => {
    const attrMap = new Map();
    // Store original attribute value
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
  
  const template=(el) => {
    if (el._running) {
        return
    }
     const comment=document.createComment('<template>')
     const endComment=document.createComment('</template>')
     el.replaceWith(endComment)
     endComment.parentElement.insertBefore(comment,endComment)
     Array.from(el.content.children).forEach((child) => {
         endComment.parentElement.insertBefore(child,endComment)
         render(child,el._context)
     })
  }
  const directives={
    if:If,
    else:Else,
    for:For,
    'else-if':ElseIf,
    mount:mountElement,
    unmount:unMountElement,
    
  }
  export const ref=() => {
    return{value:null}
  }
  let appRecorder
  
  
 export const render= (el,contexts={},tree) => {
   if (el.tagName === 'SCRIPT') {
     return 
   }
   const context={
        ...contexts
    }
    
    PawaElement.Element(el,context)
    let appTree = {
  element: el.tagName,
  pawaAttributes: el._pawaAttribute,
  
  running:false,
  thisSame:tree?.running||false,
  component:[],
  isComponent: el._componentOrTemplate || el._isElementComponent || false,
  stateContext:null,
  children:[],
  componentName:el._componentName,
  originalChildren:[],
  context:el._context,
  id:crypto.randomUUID(),
  el:el,
  remove(){
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
        States(el,attr,stateContext)
      } else if (attr.name === 'pawa-component') {
        
        elementComponent(el,appTree)
        
      }
      else {
        plugin.forEach((plugins) => {
            plugins(el,attr)
        })
      }
        
    })
    if (el._elementType === 'template') {
      template(el)
      return
    }
    if (el._lazy) {
      lazyLoading(el)
      return
    }
    if (el._await) {
      awaitElement(el)
    }
    if (el._componentName) {
      component(el,appTree)
      return
    }
    
    if (el._out === false || el._running === false || el._componentOrTemplate !== true ) {
      if (el._await) {
        return
      }
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
   useAsync,
   useInsert,
   useContext,
   useValidateProps,
   setPlugin,
   setPawaAttributes,
   setContext,
   $state,
   pawaComponent,
   pawaStartApp
 }
 
 export default Pawa