import { getDev } from "../dev/index.js"
import { components, hmrComponentsMap, restorePawaStateFromContext, snapshotInsert } from "../global.js"
import { PawaRender } from "../graph/index.js"
import { stateWatch } from "../hooks/state.js"
import { createEffect, errorControl } from "../reactive.js"
import { getServerInstance } from "../server/index.js"
import { splitAndAdd } from "../utils.js"
import { initaiteComponent, isSvgFragment, propsValidator, renderAschild, sanitizeTemplate, setSlot } from "./utils.js"

let componentGraph={transport:{},onExit:()=>{},initialInsert:{},componentChildren:[],mount:[],unMount:[],effect:[],onEnter:()=>{},name:'ROOT',context:{},props:{},reProps:[]}

export const keepComponentGraph=(graph)=>{
    componentGraph=graph
}
export const getComponentGraph=()=>{
  if (typeof window !== 'undefined') {
   return componentGraph
  }else{
   return getServerInstance()?.getComponentGraph?.()
  }
}
export const setComponentGraph=(graph)=>{
  if (typeof window !== 'undefined') {
    componentGraph=graph
  }else{
   return getServerInstance()?.setComponentGraph?.(graph)
  }
}
export const createComponent=(el,context,graph,compareGraph)=>{
    const {prop,restProps,slot,stringProp,aschild,passerProps}=initaiteComponent(el,context)
    const mainProp={}
    const {render,renderGraph,setContext}=PawaRender(graph,context)
    const comment=document.createComment(el.tagName)
    const template=el.cloneNode(true)
    const former=componentGraph
    renderGraph.former=former
    componentGraph=renderGraph
    renderGraph.context={...context}
    renderGraph.nodeType='component'
    renderGraph.rest={}
    
    Object.assign(renderGraph.transport, former?.transport || {})
    el.replaceWith(comment)
    for (const [key,value] of Object.entries({...prop,...stringProp})) {
        mainProp[key]=(c)=>{
            if(typeof c === 'function') {
                renderGraph.reProps.push({key:key,call:c})
            }
            return value()
        }
        
    }
    const component=components.get(splitAndAdd(el.tagName))
    if (typeof component !== 'function') {
        throw new Error('Must be A functional Component')
    }
    if (component?.validateProps) {
        const validate=component.validateProps
        try {
            propsValidator(validate,{...prop,stringProp},el.tagName,el.outerHTML,mainProp)
        } catch (error) {
          errorControl(error, {
            effect: 'props-validation',
            el,
            template: el.outerHTML,
          })
        }
      }
    try {
        const temp=sanitizeTemplate(component(mainProp))
        if (getDev() && compareGraph) {
          restorePawaStateFromContext(compareGraph.context,renderGraph.context,compareGraph.initialInsert)
        }
        for (const effect of renderGraph.beforeMount) {
            const result=effect()
            if(typeof result === 'function')renderGraph.unMount.push(result)
        }
        if(temp === '')return
         let  div = isSvgFragment(temp) 
        ? document.createElementNS('http://www.w3.org/2000/svg', 'svg') 
        : document.createElement('div');
        div.innerHTML=temp
        // console.log(el);
        const {element,asChild}=renderAschild(div,aschild,slot.default,document)
        if (!asChild) {
            setSlot(element,slot)
        }
        
        const findElement= element.hasAttribute('--')?element:element?.querySelector('[--]') || null 
        if(element.nodeType !== 3 || element.nodeType !== 8){
         if (findElement) {
            
        findElement.removeAttribute('--')
        }
        }
        
        const rest={...passerProps}
    if (Object.entries(renderGraph.rest).length > 0) {
      const props=restProps
      if (renderGraph.rest['className'] && props['class']) {
        rest['class']={...props['class']}
      }
      if (renderGraph.rest['defaultValue'] && props['default']) {
        rest['default']={...props['default']}
      }

      for (const key in props) {
        let name=key
        name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());        
        if (renderGraph.rest[name]) {
          rest[key]=props[key]
        }
      }
    }else{
      Object.assign(rest,restProps)
    }
    
    if(Object.entries(rest).length > 0){
        
      if (findElement) {
        for (const key in rest) {

          let name=key
          while (findElement.hasAttribute(name)) {
            name=`-${name}`
          }
          findElement.setAttribute(name,rest[key])
          
          }
        }
      }
     const componentName=splitAndAdd(el.tagName)
      if (getDev()) {
            const id=Date.now() + Math.random()
            const removeFromHmrMap = () => {
      const array = hmrComponentsMap.get(componentName)
      if (!array) return
            
      const index = array.findIndex((item) => item.id === id)
      if (index !== -1) {
        array.splice(index, 1)
      }
    
      if (array.length === 0) {
        hmrComponentsMap.delete(splitAndAdd(el.tagName))
      }
    }
    renderGraph.initialInsert=snapshotInsert(renderGraph.context) ?? {}
      if (hmrComponentsMap.has(splitAndAdd(el.tagName))) {
        hmrComponentsMap.get(splitAndAdd(el.tagName)).push({id:id,element:template,former:former,remove:()=>{
          removeFromHmrMap()
          renderGraph.hmr=true
          renderGraph.remove()
          renderGraph.fromParent()
        },render:render,graph:renderGraph,hrmInitial:snapshotInsert(renderGraph.context),context})
      }else{
        hmrComponentsMap.set(splitAndAdd(el.tagName),[{id:id,element:template,former:former,remove:()=>{
          removeFromHmrMap()
          renderGraph.hmr=true
          renderGraph.remove()
          renderGraph.fromParent()
        },render:render,graph:renderGraph,hrmInitial:snapshotInsert(renderGraph.context),context}])
      }
    }
  
      comment.replaceWith(element)
        setContext({...context,...renderGraph.context})
        render(element)
       
      componentGraph=former
      renderGraph.context={}
      renderGraph.firstTime=false
      Promise.resolve().then(()=>{
         for (const effect of renderGraph.arrayEffect) {
           const result= stateWatch(effect.effect,effect.deps)
           if(typeof result === 'function')renderGraph.unMount.push(result)
        }
        for (const effect of renderGraph.readOnlyffect) {
            const result=createEffect(effect.effect,renderGraph,effect?.update)
            if(typeof result === 'function')renderGraph.unMount.push(result)
        }
        for (const effect of renderGraph.mount) {
            const result=effect()
            if(typeof result === 'function')renderGraph.unMount.push(result)
        }
      })
    } catch (error) {
      errorControl(error, {
        effect: 'component',
        el,
        template: el?.outerHTML,
      })
    }
}