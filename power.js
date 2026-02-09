import { createEffect } from './reactive.js';
import { render, $state, keepContext,restoreContext} from './index.js';
import { PawaComment, PawaElement } from './pawaElement.js';
import { processNode, pawaWayRemover,getComment,getEndComment, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from './utils.js';
import {normal_Switch} from './normal/Switch.js'
import {normal_If} from './normal/If.js'
import {normal_For} from './normal/For.js'
import {resumer} from './resumer.js'
import { normal_key } from './normal/Key.js';
export const If = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true 
    if(!resume){
        const parent = el.parentElement
                const nextSiblings = el.nextElementSibling || null
               const chained=[{
                                    exp:el.getAttribute('if'),
                                    condition:'if',
                                    element:el
                                }]
               const chainMap=new Map()
               chainMap.set(el.getAttribute('if'),{condition:'if',element:el})
                const getChained=(nextSibling)=>{
                    if (nextSibling !== null) {
                        if (nextSibling && nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {
                            // console.log(true,'it has',nextSibling.getAttribute('else'))
                            if (nextSibling.getAttribute('else-if')) {
                                chained.push({
                                    exp:nextSibling.getAttribute('else-if'),
                                    condition:'else-if',
                                    element:nextSibling
                                })
                                chainMap.set(nextSibling.getAttribute('else-if'),{condition:'else-if',element:nextSibling})
                                getChained(nextSibling.nextElementSibling)
                                nextSibling.remove()
                            }else if (nextSibling.getAttribute('else') === '') {
                                chained.push({
                                    exp:'false',
                                    condition:'else',
                                    element:nextSibling
                                })
                                chainMap.set('else',{condition:'else',element:nextSibling})
                                nextSibling.remove()
                            }
                        }
                    }
                }
                getChained(nextSiblings)
                const endComment=document.createComment('end-if')
                el.replaceWith(endComment)
            normal_If(el,attr,stateContext,endComment,chainMap,chained)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(5)
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id)
            getEndComment(comment,setEndComment,id,children)
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            resumer.resume_if?.(el,attr,stateContext,{comment,endComment,id,children})

    }
}
export const Switch = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if(!resume){
        el.removeAttribute('switch')
        const parent = el.parentElement
                const nextSiblings = el.nextElementSibling || null
               const chained=[{
                                    exp:el.getAttribute('case'),
                                    condition:'case',
                                    element:el
                                }] 
               const chainMap=new Map()
               chainMap.set(el.getAttribute('case'),{condition:'case',element:el})
                const getChained=(nextSibling)=>{
                    if (nextSibling !== null) {
                        if (nextSibling && nextSibling.getAttribute('case') || nextSibling.getAttribute('default') === '') {
                            // console.log(true,'it has',nextSibling.getAttribute('else'))
                            if (nextSibling.getAttribute('case')) {
                                chained.push({
                                    exp:nextSibling.getAttribute('case'),
                                    condition:'case',
                                    element:nextSibling
                                })
                                chainMap.set(nextSibling.getAttribute('case'),{condition:'case',element:nextSibling})
                                getChained(nextSibling.nextElementSibling)
                                nextSibling.remove()
                            }else if (nextSibling.getAttribute('default') === '') {
                                chained.push({
                                    exp:'false',
                                    condition:'default',
                                    element:nextSibling
                                })
                                chainMap.set('default',{condition:'default',element:nextSibling})
                                nextSibling.remove()
                            }
                        }
                    }
                }
                getChained(nextSiblings)
                const endComment=document.createComment('end-switch')
                el.replaceWith(endComment)
            normal_Switch(el,attr,stateContext,endComment,chainMap,chained)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(5)
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id)
            getEndComment(comment,setEndComment,id,children)
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            resumer.resume_switch?.(el,attr,stateContext,{comment,endComment,id,children})

    }
}

export const event = (el, attr, stateContext) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    const splitName = attr.name.split('-')
    const eventType = splitName[1]
    el.removeAttribute(attr.name)
    const context = el._context
    const keys = Object.keys(context);
    const resolvePath = (path, obj) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };
    const values = keys.map((key) => resolvePath(key, context));
    const func = new Function('e', ...keys, ` 
    try{
    ${attr.value}
    }catch(error){
    console.error(error.message,error.stack)
    __pawaDev.setError({el:e.target,msg:error.message,stack:error.stack,directives:'on-event'})
    }
    `)
    el.addEventListener(eventType, (e) => {
        try {
            func(e, ...values)
        } catch (error) {
            setPawaDevError({
                message: `Error from on-${eventType} directive ${error.message}`,
                error: error,
                template: el._template
            })
        }
    })

}

export const mountElement = (el, attr) => {
    if (el._running) {
        return
    }
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        const newFunc = new Function(...keys, `${attr.value}`)
        const func = () => {
            newFunc(...values)
        }

        el._MountFunctions.push(func)
        el.removeAttribute(attr.name)
    } catch (error) {
        setPawaDevError({
            message: `Error from Mount directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}



export const unMountElement = (el, attr) => {
    if (el._running) {
        return
    }
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        const func = () => {
            new Function(...keys, `${attr.value}`)(...values)
        }
        el._unMountFunctions.push(func)
        el.removeAttribute(attr.name)
    } catch (error) {
        setPawaDevError({
            message: `Error from UnMount directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}

export const For = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if (!resume) {
        const endComment = document.createComment(`end for`)
        el.replaceWith(endComment)
        normal_For(el,attr,stateContext,endComment)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.value
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id,'forKey')
            getEndComment(comment,setEndComment,id,children,'isFor')
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            dataComment=comment.nextSibling
            el.removeAttribute(attr.name)
            dataComment.remove()
            resumer.resume_for?.(el,attr,stateContext,{comment,endComment,id,children,dataComment})
    }
    
}

export const ref = (el, attr) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };

        const values = keys.map((key) => resolvePath(key, el._context))
        const returned=new Function('el', ...keys, `
    try{
        if(Array.isArray(${attr.value}.value)){
        ${attr.value}.value.push(el)
    }else if(typeof ${attr.value} === 'string'){
    return {
    value:el
    }
    }else{
    ${attr.value}.value=el
    }
    }catch(e){
    console.error(e.message,e.error)
    __pawaDev.setError({el:el,msg:e.message,stack:e.stack,directives:'ref'})
    }
    `)(el, ...values)  
        el.removeAttribute(attr.name)
        if (returned?.value) {
            const name=attr.name.replace(/^["']|["']$/g, '')
            el._context[name]=returned
        }
    } catch (error) {
        setPawaDevError({
            message: `Error from Ref directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}


export const States = (el, attr) => {

    if (el._running) {
        return
    }

    const name = attr.name.split('-')[1]
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        const val = new Function('$state', ...keys, `
    try{
    return $state(${attr.value})
    }catch(error){
    console.log(error.message,error.stack)
    }
    `)($state, ...values)
        el._context[name] = null
        el._context[name] = val
      el._checkStatic()
        el.removeAttribute(attr.name)
    } catch (error) {
        setPawaDevError({
            message: `Error from State directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}


export const documentEvent = (el, attr) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    if (attr.name.split('-')[2]) {
        return
    }
    const eventName = attr.name.split('-')[1]
    const keys = Object.keys(el._context);
    const resolvePath = (path, obj) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };              
    const func = new Function('e', ...keys, `
    try{
    ${attr.value}
    }catch(error){
    console.error(error.message,error.stack)
    __pawaDev({msg:error.message,stack:error.stack,directives:'out-event'})
    }`)
    const values = keys.map((key) => resolvePath(key, el._context));
    const functions = (e) => {
        try {

            func(e, ...values)
        } catch (error) {
            setPawaDevError({
                message: `Error from out-${eventName} directive ${error.message}`,
                error: error,
                template: el._template
            })
        }
    }
    el.removeAttribute(attr.name)
    setTimeout(() => {
        document.addEventListener(eventName, functions)
    }, 1000)

    const unMount = () => document.removeEventListener(eventName, functions);
    el._setUnMount(unMount)

}

export const exitTransition=(el,attr)=>{
if (el._running) {
    return
}
    el._exitAnimation=()=>{
        return new Promise((resolve)=>{
            requestAnimationFrame(()=>{
                const animations =el.getAnimations({subtree:false})
                if (animations.length === 0) {
                    resolve()
                    return
                }
                
                Promise.all(animations.map(a=>a.finished)).then(resolve).catch(resolve)
            })
        })
     }
     el.removeAttribute(attr.name)
}
export const After=(el,attr)=>{
    if (el._running) return
    const getTime=attr.name.match(/\[(.*?)\]/)[1]
    const keys = Object.keys(el._context);
    el.removeAttribute(attr.name)
    const resolvePath = (path, obj) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };              
    const func = new Function( ...keys, `
    try{
    ${attr.value}
    }catch(error){
    console.error(error.message,error.stack,'at ${attr.name}')
    __pawaDev({msg:error.message,stack:error.stack,directives:'${attr.name}'})
    }`)
    const values = keys.map((key) => resolvePath(key, el._context));
    const timeout=setTimeout(() => {
        func(...values)
    }, getTime);
    el._setUnMount(()=>{
        clearTimeout(timeout)
    })
}
export const Every=(el,attr)=>{
    if (el._running) return
    const getTime=attr.name.match(/\[(.*?)\]/)[1]
    el.removeAttribute(attr.name)
    const keys = Object.keys(el._context);
    const resolvePath = (path, obj) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj);
    };              
    const func = new Function( ...keys, `
    try{
    ${attr.value}
    }catch(error){
    console.error(error.message,error.stack,'at ${attr.name}')
    __pawaDev({msg:error.message,stack:error.stack,directives:'${attr.name}'})
    }`)
    const values = keys.map((key) => resolvePath(key, el._context));
    const timeout=setInterval(() => {
        func(...values)
    }, getTime);
    el._setUnMount(()=>{
        clearInterval(timeout)
    })
}
export const Key = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if(!resume){
        el.removeAttribute('key')
        const parent = el.parentElement
        const endComment=document.createComment('end-key')
        el.replaceWith(endComment)
        normal_key(el,attr,stateContext,endComment)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(10)
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id)
            getEndComment(comment,setEndComment,id,children)
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            resumer?.resume_key?.(el,attr,stateContext,{comment,endComment,id,children})

    }
}
