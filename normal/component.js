import {propsValidator, setPawaDevError, pawaWayRemover, checkKeywordsExistence, sanitizeTemplate, splitAndAdd } from '../utils.js';
import {PawaElement,PawaComment} from '../pawaElement.js';
import {keepContext,render, HmrComponentMap } from '../index.js'
import {createEffect} from '../reactive.js'
export const normal_component=(el,stateContext,setStateContext,mapsPlugin,formerStateContext,pawaContext,stateWatch)=>{
    const compoBeforeCall=mapsPlugin.compoBeforeCall
    const compoAfterCall=mapsPlugin.compoAfterCall
    const endComment = document.createComment(`end ${el.tagName}`)
    const comment = document.createComment(` ${el.tagName}`)
    PawaComment.Element(comment)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    el._underControl=comment
    comment._endComment=endComment
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
        let div =el._compoToSvg?document.createElementNS('http://www.w3.org/2000/svg', 'svg'): document.createElement('div')
    el._componentTerminate=() => {
        comment._terminateByComponent(endComment)
    }
    const component =el._component
    const stateContexts=setStateContext(component)
    stateContexts._prop={children,...el._props,...slots}
        stateContexts._elementContext={...el._context}
        stateContexts._name=el._componentName
        stateContexts._reactiveProps=reactiveProps
        stateContexts._template=el._template
        stateContexts._recallEffect=()=>{
          
        }
    const storeContext=stateContexts
    let compo 
    let awaits=false
    let suspense=''
  
    if (__pawaDev.tool) {
      const id= crypto.randomUUID()
      if (HmrComponentMap.has(stateContexts.component._filePath) && stateContexts.component._filePath) {
        HmrComponentMap.get(stateContexts.component._filePath).push({id:id,template:el._template,el:el,stateContext:stateContexts})
      }else{
        HmrComponentMap.set(stateContexts.component._filePath,[{id:id,template:el._template,el:el,stateContext:stateContexts}])
      }
      el._setUnMount(()=>{
        const array=HmrComponentMap.get(stateContexts.component._filePath)
        if(array){
          const index=array.findIndex(item => item.id === id)
          if(index !== -1) array.splice(index,1)
        }
      })
    }
      try {
        if(done){
        const compoCall=component.component(app)
        if( compoCall instanceof Promise){
          suspense=stateContexts._suspense || ''
          
          awaits=true 
          compoCall.then((res)=>{
            div.innerHTML=res
            let promise
            if (comment.nextSibling !== endComment) {
              promise= pawaWayRemover(comment,endComment)
            }
            propsSetter()
            Promise.all([promise]).then(()=>{
              if (storeContext._hasRun) {
                  storeContext._hasRun = false
                  keepContext(storeContext)
               }if (storeContext?._insert) {
        Object.assign(el._context,storeContext._insert)
      }
              childInsert(false)
              Promise.resolve().then(()=>{
                lifecycle()
                
              }).finally(()=>{
                el._clearContext()
              })
              storeContext._hasRun=true
              stateContext=null
            })
            })
        }else if (compoCall !== undefined){
          compo= sanitizeTemplate(compoCall)
        }
      }else{
          compo=""
        }
        if (awaits && suspense) {
          
          compo= sanitizeTemplate(suspense)
        }
        
      } catch (error) {
        setPawaDevError({
          message:`error from ${el._componentName} component  ${error.message}`,
          error:error,
          template:el._template
        })
      }
    
    // stateContext._hasRun=true
    div.innerHTML = compo;
    if (component?._insert) {
      Object.assign(el._context,component._insert)
    }
    const restProps={}
    if (Object.entries(stateContexts._restProps).length > 0) {
      const props=el._restProps
      if (stateContexts._restProps['className'] && props['class']) {
        restProps['class']={...props['class']}
      }
      if (stateContexts._restProps['defaultValue'] && props['default']) {
        restProps['default']={...props['default']}
      }

      for (const key in props) {
        let name=key
        name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());        
        if (stateContexts._restProps[name]) {
          restProps[key]={...props[key]}
        }
      }
    }else{
      Object.assign(restProps,el._restProps)
    } 
    const context=el._context
    const getAsChild=()=>{
      const asChild=div.firstElementChild
      if (splitAndAdd(asChild?.tagName|| '') === 'ASCHILD') {
        const getChildren=asChild.firstElementChild
        Array.from(asChild.attributes).forEach(attr=>{
          if (getChildren.hasAttribute(attr.name)) {
            let attrName=getChildren.getAttribute(attr.name)
            attrName=attr.value +' '+attrName
            getChildren.setAttribute(attr.name, attrName)
          }else{
            getChildren.setAttribute(attr.name, attr.value)
          }
        })
        asChild.remove()
        div.appendChild(getChildren)        
      }
    }
       const propsSetter=()=>{  
        getAsChild() 
         const findElement=div.querySelector('[--]') || div.querySelector('[rest]')
         if (findElement) {
        findElement.removeAttribute('--')
        findElement.removeAttribute('rest')
        }
    if(Object.entries(restProps).length > 0){
      if (findElement) {
        for (const [key,value] of Object.entries(restProps)) {
            findElement.setAttribute(value.name,value.value)
          }
        }
      }
    }
    propsSetter()
      for (const fn of compoAfterCall) {
        try {
          fn(stateContexts,div?.firstElementChild,el)
        } catch (error) {
          __pawaDev.setError({el:el,msg:error.message})
          console.error(error.message)
        }
      }
      
      const childInsert=(awaiting)=>{
        // console.log(stateContexts._insert)
        if (awaiting === false) {
          el._component?._hook?.beforeMount?.forEach((bfm) => {
            bfm._sent=true
     const result= bfm(comment)
     if (typeof result === 'function') {
       el._beforeUnMountFunctions.push(result)
     }
    })
    
    el._component?._hook?.isMount.forEach((hook) => {
      hook._sent=true
      el._MountFunctions.push(hook)
    })
    el._component?._hook?.isUnMount.forEach((hook) => {
      hook._sent=true
      el._unMountFunctions.push(hook)
    })
  }
  const child=div.children[0]
  
  if (child !== null ) {
    if (child) {
      endComment.parentElement?.insertBefore(child, endComment)
    
    stateContexts?._error?.forEach((error) => {
      throw Error(error)
    })
    render(child, context) 
      } 
    }
    }
    childInsert(!!awaits);
    const lifecycle=()=>{
      Promise.resolve().then(()=>{
      el._component?._hook?.effect.forEach((hook) => {
        
        if(hook?.done) return
        hook.done=true
        const result=stateWatch(hook.effect,hook.deps)
        if (typeof result === 'function') {
          el._unMountFunctions.push(result)
        }
      })
        
      if (el._component?._hook?.reactiveEffect) {
        el._component?._hook?.reactiveEffect.forEach((hook) => {
          if(hook?.done) return
          hook.done=true
          const effect=hook.effect(comment)
          if (hook.deps?.component) {
            createEffect(() => {
              return effect()
            },el,hook.deps?.update) 
          } else {
            createEffect(() => {
              return effect()
            },hook.deps.value)
          }
        })
      }
      el._MountFunctions.forEach((func) => {
        func.done=true
        const result=func(comment)
        if (typeof result === 'function') {
          el._unMountFunctions.push(result)
        }
      })
      
    })
    }
    if(awaits === false){
      lifecycle()
      el._clearContext()
    }
    stateContexts._hasRun=true
    keepContext(stateContexts._formerContext)
    if (stateContexts._transportContext) {
      let contextId = stateContexts._transportContext
      delete pawaContext[contextId]
    }
     stateContext=formerStateContext  
    __pawaDev.totalComponent++
      
}