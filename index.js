import { after, bind, click, elementIf,
   every, For, If, states,elementElse, 
   parent,parentSpe,parentslash,element,elementslash, 
   addClass,
   removeClass,
   model,key,
   watcher,variable,afterSpe,event,
   elementSpe,
   transition} from "./power.js";
import { track, trigger,componentsHook, createEffect,componentInstances,templateCache,componentHook, componentMount } from "./reactive.js";
import { createTemplate, templateEngine, unwrap,propsValidator } from "./utils.js";

/**
 * Core module for JSML (JavaScript Markup Language) implementation
 * 
 * Provides functionality for:
 * - Reactive state management through proxies
 * - DOM manipulation and attribute handling
 * - Component lifecycle hooks (before/after)
 * - Custom attribute plugins
 * - Template rendering with expressions
 * 
 * Exports:
 * @function setBefore - Register a before-render hook for components
 * @function setAfter - Register an after-render hook for components
 * @function state - Create a reactive state object
 * @function stateWatch - Watch for state changes with cleanup
 * @function ref - Get element reference by ID
 * @function setPlugin - Register custom attribute plugins
 * @function render - Main rendering function for JSML templates
 * @function regenerate - Re-render specific element attributes
 * 
 * @const power - Built-in attribute handlers
 * @const apply - Global shared state object
 */


const refMap=new Map()
const beforeImp=new Map()
const afterImp=new Map()
const specials=new Map()
export const components = new Map();
const attriPlugin=[]
const plugin=[];
 

 
const elementCallbacks = new WeakMap();
const isConnectedToDOM = (el) => {
  if(!el.parentElement) return false
  // If no element, assume always active
  
  while (el) {
    if (!el.isConnected) return false;
    el = el.parentElement;
  }
  return true;
};

const diff = (oldNode, newNode) => {
  console.log(oldNode,newNode)
  if (!oldNode.isEqualNode(newNode)) {
    // Update attributes
    Array.from(newNode.attributes).forEach(attr => {
      if (oldNode.getAttribute(attr.name) !== attr.value) {
        oldNode.setAttribute(attr.name, attr.value)
      }
    })
    
    // Update text content
    if (oldNode.textContent !== newNode.textContent) {
      oldNode.textContent = newNode.textContent
    }
    
    // Recursively diff children
    const oldChildren = Array.from(oldNode.children)
    const newChildren = Array.from(newNode.children)
    
    for (let i = 0; i < newChildren.length; i++) {
      if (oldChildren[i]) {
        diff(oldChildren[i], newChildren[i])
      } else {
        oldNode.appendChild(newChildren[i].cloneNode(true))
      }
    }
  }
}
const updateComponent = (instanceId) => {
  const instance = componentInstances.get(instanceId)
  const oldTemplate = templateCache.get(instanceId)
  const renderTemplate = (template, props) => {
    const templates=templateEngine(template,props)
    const wrapper = document.createElement('div');
    wrapper.innerHTML =templates;
    return wrapper.firstElementChild;
  }
  // Generate new template
  const newTemplate = instance.component(instance.props, instance.context)
  const newNodeTem=renderTemplate(newTemplate, instance.context)
  // Create temporary container
  const tempContainer = document.createElement('div')
  tempContainer.appendChild(newNodeTem)
  // Use render to properly process the new template with context
  render(tempContainer, instance.context)
  const newNode = tempContainer.firstElementChild
  
  // Now we have a fully processed node to compare with
  diff(instance.element, newNode)
  
  templateCache.set(instanceId, newTemplate)
}

export const RegisterComponent = (...component) => {
  component.forEach((c) => {
    if (!c.name) {
      console.warn('Component registration failed: Component must have a name property');
      return;
    }
    if(components.has(c.name.toUpperCase)) return;
    components.set(c.name.toUpperCase(), c);
  });
};
export const setBefore=(name,callback)=>{
  beforeImp.set(name,callback)
}
export const setAfter=(name,callback)=>{
  afterImp.set(name,callback)
}
const createDeepProxy = (target, callback) => {
  componentsHook()
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

  export const state=(any)=>{
    const states={
        value:any
    }
    return createDeepProxy(states, (target, property) => {
      globalEffectMap.forEach((effect) => {
        if (effect.deps?.has(property)) {
          if (effect.cleanup) {
            effect.cleanup();
          }
          effect.cleanup = effect.callback();
        } else {
          effect.cleanup = effect.callback();
        }
      });
    });
    
  }
  const watchCallbacks = new Map();
  export const stateWatch = (callback, dependencies) => {
    if (!callback) {
      console.warn('stateWatch: Callback function is required');
      return;
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
            if(result === 'break-out'){
              globalEffectMap.delete(callback);
            }
            watchCallbacks.delete(callback);
          });
        }
      },
      deps: new Set(dependencies),
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
  
 export const component=(el,context,up=false)=>{
    // Get component definition and create unique instance ID
    const compo=components.get(el.tagName)
    const instanceId = crypto.randomUUID()
    const attribute=Array.from(el.attributes)
    const propsAttri={}
    const rest=[]
    const children=document.createElement('div')
    const deps = new Set()
    let  mounts=null
    let  unmount=null

    // Lifecycle hooks for mounting and unmounting
    const unMount=(callback)=>{
      if(typeof callback === 'function'){
        unmount=callback
      }
    }
    const hook={
      mount:(callback)=>{
        if(typeof callback === 'function'){
          mounts=callback
        }
      },
      unMount:unMount
    }
    let ready=false

    // Process component attributes - props and rest attributes
    attribute.forEach((c)=>{
      try{
        if(c.name.startsWith('props-')){
          const propsName=c.name.split('-')[1]
          const keys = Object.keys(context);
          const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
          };
          const values = keys.map((key) => resolvePath(key, context));
          propsAttri[propsName]=new Function(...keys,`return ${c.value}`)(...values)
        }else if (c.name.startsWith('$$-')) {
          const restName=c.name.split('$$-')[1]
          rest.push([restName,c.value])
        } 
      }catch(error){
        console.error(error +" at " +c+el)
      }
    })

    // Set up component context and store children
    context.props={...propsAttri}
    while(el.firstChild){
      children.appendChild(el.firstChild)
    }

    // Helper functions for component
    const insert=(obj)=>{
      Object.assign(context,obj)
    }
    const validateProps=(obj={})=>{
     return propsValidator(obj,propsAttri)
    }
    propsAttri.children=children.innerHTML
    const app={
      context,
      insert,
      hook,
      validateProps:validateProps,
      ...propsAttri,
    }
    
    // Initialize component and cache template
    const call=compo(app)
    templateCache.set(instanceId, call)
    globalActiveEffect = null

    // Template rendering function
    const renderTemplate = (template, props) => {
      const SanitizedTemplate=(temp)=>{
        return temp.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
      }
      const templates=SanitizedTemplate(templateEngine(template,props))
      const wrapper = document.createElement('div');
      wrapper.innerHTML =templates;
      // console.log(rest)
      if(rest.length > 0){
        const restEle=wrapper.querySelector('[rest]')
        if(restEle){
          rest.forEach(at =>{
            restEle.setAttribute(at[0],at[1])
          })
        }else{
          console.warn('rest attribute "$$-" not set in the component')
        }
      }
      return wrapper.firstElementChild;
    }

    // Render and replace original element
    const element=renderTemplate(call,propsAttri)
    el.replaceWith(element)    

    // Store component instance
    componentInstances.set(instanceId, {
      element: element,
      context,
      props: propsAttri,
      deps
    })

    // Initialize component rendering and lifecycle hooks
    render(element,context,hook)
    if (typeof mounts === 'function' && up === false) {
      mounts(context)
    }

    // Setup unmount watcher
    if(typeof unmount === 'function' && up === false){
      let once=false
      stateWatch(()=>{
        if(document.body.contains(element) === false && once){
          unmount(context)
          return 'break-out'
        }else{
          if(once === false){
            once=true
          }
        }
      })
    }
    ready=true
    return element
  }  
  const power={
    bind,
    addClass,
    removeClass,
    click,
    if:If,
    for:For,
    model,
    parent,
    transition,
    element,
    var:variable,
    'el-if':elementIf,
    'el-else':elementElse,
    'el-parent':parentSpe,
    'element[':elementSpe,
    'el-parent-slash':parentslash,
    'element-slash':elementslash,
    'watcher-state':watcher,
    'afterSpe':afterSpe,
    event,
    'set-key':key
  }
 specials.set('if[','el-if')
  const mainAttribute = (el, exp, context) => {
    const attrMap = new Map();
    if(exp.name.startsWith('$$-')){
      return
    }
    // Store original attribute value
    attrMap.set(exp.name, exp.value);
    
    const evaluate = () => {
      try{
        // Always use original value from map for evaluation
      let value = attrMap.get(exp.name);
      const regex = /\@\{([^}]*)\}/g
        const keys = Object.keys(context);
        const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, context));
        
        value = value.replace(regex, (match, expression) => {
          // console.log(expression)
          const func = new Function(...keys, `return ${expression}`);
          return func(...values);
        });
      
      
      el.setAttribute(exp.name, value);
      }catch(error){
        console.warn(`failed at attribute ${exp.name} ${el}`)
      }
    };
    // createEffect
  
    createEffect(() => {
      evaluate();
    },el);
  };

  export const ref=(id)=>{
    return refMap.get(id)
  }
  export const apply={}
  const textContentHandler = (el, childContext) => {
    const nodesMap = new Map();
    
    // Get all text nodes and store their original content
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(node => {
      // console.log(node,node.nodeValue)
      nodesMap.set(node, node.nodeValue);
    });
    
    const evaluate = () => {
      try {
        textNodes.forEach(textNode => {
          // Always use original content from map for evaluation
          let value = nodesMap.get(textNode);
          
          const regex = /\@\{([^}]*)\}/g
            const keys = Object.keys(childContext);
            const resolvePath = (path, obj) => {
              return path.split('.').reduce((acc, key) => acc?.[key], obj);
            };
            const values = keys.map((key) => resolvePath(key, childContext));
            
            value = value.replace(regex, (match, expression) => {
              const func = new Function(...keys, `return ${expression}`);
              return String(func(...values));
            });
          
          
          textNode.nodeValue = value;
        });
      } catch (error) {
        console.warn(`failed at attribute ${exp.name} ${el}`)
      }
    };
  
    createEffect(() => {
      evaluate();
    },el);
  };  
  export const setPlugin=(...callback)=>{
   callback.forEach(c =>{
    c(attriPlugin,power)
   })
  }
const vars={}
  export const render=(el,contexts={},hook=undefined)=>{
    // const trackKey = crypto.randomUUID()
    el.setAttribute('entering', '1')
    // const parent=el.parentElement
    // if (parent) {
    //   el.setAttribute('parent-key', parent.getAttribute('track-key'))
    // }
    const mounted =el.isConnected
    

    const statesMap=new Map()
    const context={
      vars:{},
        apply:{...apply},
        ...contexts
    }
    if(Array.from(el.childNodes).some(node => 
      node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
   )) {
     textContentHandler(el,context)
   }
    if(el.getAttribute('before-imp')){
      beforeImp.get(el.getAttribute('before-imp'))(el,context)
    }
    const attri=Array.from(el.attributes)
    
    attri.forEach((k) =>{
        if(k.name.startsWith('state-')){
            const name=k.name.split('-')
            states(el,name[1],k.value,context)
            
        }else if(k.name.startsWith('var-')){
          const name=k.name.split('-')
          power.var(el,name[1],k.value,context)
          
      }else  if(k.value.includes('@{')){
            mainAttribute(el,k,context)
          }
        else{
            if (power[k.name]) {
               power[k.name](el,k.value,context,k.name,render,hook) 
            } else if(k.name.startsWith('after-')){
              const name=k.name.split('-')
              after(el,name[1],k.value,context)
            }else if(k.name.startsWith('if[')){
            power['el-if'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('else[')){
            power['el-else'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('parent[')){
              
            power['el-parent'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('watch[')){
              
            power['watcher-state'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('parent-')){
            power['el-parent-slash'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('after[')){
              power['afterSpe'](el,k.value,context,k.name)
              }
              else if(k.name.startsWith('element-')){
                power['element-slash'](el,k.value,context,k.name)
                }
              else if(k.name.startsWith('on-')){
                power.event(el,k.name,k.value,context)
                }
             else if(k.name.startsWith('every-')){
              const name=k.name.split('-')
              every(el,name[1],k.value,context)
            }else{
              attriPlugin.forEach(p =>{
                p(el,k,context)
                
              })
            }
        }
    })
    if (components.has(el.tagName)) {
      // console.log(el.tagName)
      if(el.getAttribute('suspense') === 'true') return
      component(el,context)
      return
    }
    Array.from(el.children).forEach(child =>{
      if(el.getAttribute('suspense') === 'true') return
        render(child,context)
    })
    attri.forEach((at)=>{
      if(at.name === 'ref'){
        if(!refMap.get(at.value)){
          refMap.set(at.value,[el,context])
        }else{
          return
        }
    }else{
      return
    }
    })
    if(el.getAttribute('after-imp')){
      afterImp.get(el.getAttribute('after-imp'))(el,context)
    }
    if(el.tagName === 'SHARE'){
      unwrap(el)
    }
  }

  export const regenerate=(el,k,context)=>{
    console.log(k)
    if(k.name.startsWith('state-')){
      const name=k.name.split('-')
      states(el,name[1],k.value,context)
  }
  else if (power[k.name]) {
         power[k.name](el,k.value,context,k.name) 
      } else if(k.name.startsWith('after-')){
        const name=k.name.split('-')
        after(el,name[1],k.value,context)
      }else if(k.name.startsWith('if[')){
      power['el-if'](el,k.value,context,k.name)
      }
      else if(k.name.startsWith('else[')){
        power['el-else'](el,k.value,context,k.name)
        }
        else if(k.name.startsWith('parent[')){
        power['el-parent'](el,k.value,context,k.name)
        }
        else if(k.name.startsWith('parent-')){
        power['el-parent-slash'](el,k.value,context,k.name)
        }
        else if(k.name.startsWith('watch[')){      
          power['watcher-state'](el,k.value,context,k.name)
         }
        else if(k.name.startsWith('element[')){
          power['element'](el,k.value,context,k.name)
          }
          else if(k.name.startsWith('after[')){
            power['afterSpe'](el,k.value,context,k.name)
            }
            else if(k.name.startsWith('element-')){
              power['element-slash'](el,k.value,context,k.name)
              }
            else if(k.name.startsWith('on:')){
              power.event(el,k.name,k.value,context)
              }
       else if(k.name.startsWith('every-')){
        const name=k.name.split('-')
        every(el,name[1],k.value,context)
      }else{
        attriPlugin.forEach(p =>{
          p(el,k,context)
          
        })
      }
  }
  const context={}
  export const globalContext=(contexts={})=>{
    Object.assign(context,contexts)
  }
  export const pawa=(id)=>{
    render(id,context)
    const loader=document.querySelector('.pawa-loading')
    if(loader){
      loader.style.display="none"
    }
    id.classList.remove('pawa-loader')
  }