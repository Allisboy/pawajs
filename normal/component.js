import {propsValidator, setPawaDevError, pawaWayRemover, checkKeywordsExistence, sanitizeTemplate } from '../utils.js';
import {PawaElement,PawaComment} from '../pawaElement.js';
import {keepContext,render} from '../index.js'
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
        const div = document.createElement('div')
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
      try {
        if(done){
        const compoCall=component.component(app)
        if( compoCall instanceof Promise){
          compoCall.then((res)=>{
            div.innerHTML=res
            propsSetter()
            if (storeContext._hasRun) {
                storeContext._hasRun = false
                keepContext(storeContext)
             }if (storeContext?._insert) {
      Object.assign(el._context,storeContext._insert)
    }
            childInsert()
            lifeCircle()
            storeContext._hasRun=true
            stateContext=null
          })
        }else if (compoCall !== undefined){
          compo= sanitizeTemplate(compoCall)
        }
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
    
    // stateContext._hasRun=true
    div.innerHTML = compo;
    if (component?._insert) {
      Object.assign(el._context,component._insert)
    }
       const propsSetter=()=>{   
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
      const childInsert=()=>{
      el._component?._hook?.beforeMount?.forEach((bfm) => {
     const result= bfm(comment)
     if (typeof result === 'function') {
       el._unMountFunctions.push(result)
     }
    })
    
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
    
    stateContexts?._error?.forEach((error) => {
      throw Error(error)
    })
    render(child, el._context) 
      } 
    }
    }
    childInsert()
    const lifeCircle=()=>{
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
            },el) 
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
    lifeCircle()
    stateContexts._hasRun=true
    keepContext(stateContexts._formerContext)
    if (stateContexts._transportContext) {
      let contextId = stateContexts._transportContext
      delete pawaContext[contextId]
    }
     stateContext=formerStateContext  
    __pawaDev.totalComponent++
       
}