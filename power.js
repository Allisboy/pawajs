import {createEffect} from './reactive.js';
import {render,$state,keepContext,getCurrentContext} from './index.js';
import {PawaComment} from './pawaElement.js';
import {processNode,pawaWayRemover, safeEval} from './utils.js';
export const If = (el,attr,stateContext,tree) => {
    if (el._running) {
    return
}


tree.running=true
    el._running=true
    el._tree.thisSame=true
    const comment=document.createComment(`if (${el._attr.if})`)
    
    const endComment=document.createComment(`end if`)
    el._out=true
    const parent=el.parentElement
    const nextSibling=el.nextElementSibling || null
    
    if (nextSibling !== null) {
        if (nextSibling && nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {
    
    nextSibling.setAttribute('data-if', el._attr.if)
}
    }
    
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    comment._setCoveringElement(el)
    parent.insertBefore(comment,endComment)
    const context=el._context
    let firstEnter=false
    comment._controlComponent=true
    let func
    const evaluate=() => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {
      
if (!func) {
    func=safeEval(el._context,el._attr.if)
}
const condition=func(...values)
if(!firstEnter){
    for (const fn of el._terminateEffects) {
        comment._terminateEffects.add(fn)
    }
}
        if (condition) {
            firstEnter=true
            if (comment.nextSibling !== endComment) {
                return
            }
            const newElement=el._attrElement('if')       
            if (stateContext._hasRun) {
                stateContext._hasRun=false
                keepContext(stateContext)
            }
            parent.insertBefore(newElement,endComment)
            
        render(newElement,el._context,tree)
        newElement._tree.pawaAttributes['if']=attr.value
        } else {
            if (firstEnter) {
                pawaWayRemover(comment,endComment)
            }
        }
        
        } catch (e) {
            throw e
        }
        
        
    
    }
    createEffect(() => {
        evaluate()
    },el)
}

export const event=(el,attr,stateContext) => {
    if (el._running) {
        return
    }
//    console.log(stateContext)
    const splitName=attr.name.split('-')
    const eventType=splitName[1]
    el.removeAttribute(attr.name)
    const context=el._context
    
    el.addEventListener(eventType,(e) => {
        try {
      const keys = Object.keys(context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, context));
    new Function('e',...keys,` ${attr.value}`)(e,...values)
        } catch (e) {
            __pawaDev.setError({msg:error.message,stack:error.stack,directives:'event',el:el})
            console.warn(e)
        }
    })
    
}


export const Else = (el,attr,stateContext,tree) => {
    if (el._running) {
    return
}
    el._running=true
    el._tree.thisSame=true
    const elseValue=el.getAttribute('data-if')
    el.removeAttribute('data-if')
    const comment=document.createComment(`if (${elseValue}) else`)
    const endComment=document.createComment(`end else`)
    el._out=true
    const parent=el.parentElement
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    parent.insertBefore(comment,endComment)
    const context=el._context
    let firstEnter=false
    const evaluate=() => {
        if (endComment.parentElement === null) {
    el._deleteEffects()
}
        try {
      const keys = Object.keys(context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, context));
const condition=new Function(...keys,`return ${elseValue}`)(...values)
        if (condition) {
            
            if (firstEnter) {
                pawaWayRemover(comment,endComment)
}
        
        } else {
            firstEnter = true
if (comment.nextSibling !== endComment) {
    return
}
const newElement = el._attrElement('else')

parent.insertBefore(newElement, endComment)
if (stateContext._hasRun) {
    stateContext._hasRun=false
    keepContext(stateContext)
}
render(newElement, context,tree)
        }
        
        } catch (e) {
            throw e
        }
        
        
    
    }
    createEffect(() => {
        evaluate()
    })
}

export const ElseIf = (el,attr,stateContext,tree) => {
    if (el._running) {
        return
    }
    el._running=true
    const exp = new WeakMap()
    const elsePrimitive = {key:elseIfValue}
    const ifPrimitive={key:ifValue}
    el._tree.thisSame=true
    const elseIfValue=el.getAttribute('else-if')
    const ifValue=el.getAttribute('data-if')
    const nextSibling=el.nextElementSibling
    if(nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')){
        nextSibling.setAttribute('data-if',elseIfValue)
    }
    el.removeAttribute('data-if')
    const comment=document.createComment(`else if (${elseIfValue})`)
    const endComment=document.createComment(`end else if`)
    el._out=true
    const parent=el.parentElement
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    parent.insertBefore(comment,endComment)
    const context=el._context
    let firstEnter=false
    const evaluate=() => {
        if (endComment.parentElement === null) {
    el._deleteEffects()
}
        try {
      const keys = Object.keys(context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, context));

if (!exp.has(elsePrimitive) && !exp.has(ifPrimitive)) {
     exp.set(ifPrimitive, new Function(...keys, `return ${ifValue}`))
    exp.set(elsePrimitive, new Function(...keys, `return ${elseIfValue}`))
}
const condition = exp.get(ifPrimitive)(...values)
const elseCondition = exp.get(elsePrimitive)(...values)
        if (condition) {
            
            if (firstEnter) {
                pawaWayRemover(comment,endComment)
}
        
        } else if(elseCondition) {
            firstEnter = true
if (comment.nextSibling !== endComment) {
    return
}
const newElement = el._attrElement('else-if')

parent.insertBefore(newElement, endComment)
if (stateContext._hasRun) {
    stateContext._hasRun=false
    keepContext(stateContext)
}
render(newElement, context,tree)
        } else {
            if (firstEnter) {
    while (comment.nextSibling) {
        if (comment.nextSibling === endComment) {
            return
        } else {
            if (comment.nextSibling.nodeType === 8) {
                comment.nextSibling.remove()
            } else if (comment.nextSibling.nodeType === 1) {
                comment.nextSibling._remove()
            }
        }
    }
}
        }
        
        } catch (e) {
            throw e
        }
        
        
    
    }
    createEffect(() => {
        evaluate()
    })
}




export const mountElement=(el,attr) => {
    if (el._running) {
        return
    }
    try {
        const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, el._context));
const newFunc=new Function(...keys,`${attr.value}`)
const func=() => {
    newFunc(...values)
}

el._MountFunctions.push(func)
el.removeAttribute(attr.name)
    } catch (e) {
        throw e
    }
}



export const unMountElement=(el,attr) => {
    if (el._running) {
        return
    }
    try {
        const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, el._context));
const func=() => {
    new Function(...keys,`${attr.value}`)(...values)
}
el._unMountFunctions.push(func)
el.removeAttribute(attr.name)
    } catch (e) {
        throw e
    }
}

export const For=(el,attr,stateContext,tree)=>{
    if (el._running) {
        return
    }
    el._running=true
    const exp = new WeakMap()
    const primitive ={key:attr.value}
    el._tree.thisSame=true
    let firstEnter=true
    const value=attr.value
    const split=value.split(' in ')
    const arrayName=split[1]
    const arrayItems=split[0].split(',')
    const arrayItem=arrayItems[0]
    const indexes=arrayItems[1]
    const comment=document.createComment(`${attr.value}`)
    const endComment=document.createComment(`end for`)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    let arrayLength;
    const unique=crypto.randomUUID()
    const insertIndex=new Map()
    const elementArray=new Set()
    const evaluate=() => {
        if (endComment.parentElement === null) {
    el._deleteEffects()
}
       try {
           const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, el._context));

    let array
    if (!exp.has(primitive)) {
    
    const func = new Function(...keys, `
        return ${arrayName}
    `)
    exp.set(primitive,func)
    }
    array=exp.get(primitive)(...values)
    if (!firstEnter) {
        const div=document.createElement('div')
        array.forEach((item,index)=>{
            const context=el._context
          const itemContext = {
          [arrayItem]: item,
          [indexes]: index,
          ...context
        }
        
        //console.log(itemContext)
        const newElement=el._attrElement('for')
        newElement.setAttribute('data-for-index',index)
        processNode(newElement,itemContext)
        div.appendChild(newElement)
        })
        const removeElement=[]
        elementArray.forEach((keyComment) => {
            const lookLike=div.querySelector(`[for-key='${keyComment._forKey}']`)
            //console.log(lookLike?.getAttribute('for-key'))
            console.log(keyComment._forKey,lookLike);
            if (lookLike !== null) {
                keyComment._index=lookLike.getAttribute('data-for-index')
            }
            if (!lookLike) {
                console.log(lookLike)
               const promised=new Promise((resolve)=>{
                keyComment._keyRemover(() => {
                    insertIndex.delete(Number(keyComment._forKey))
            elementArray.delete(keyComment)
            resolve(true)
        const findIndex = keyComment._forKey
                   })
               })
                   removeElement.push(promised)
            } 
        })
        //insertIndex.clear()
        
    const promise= Promise.all(removeElement).then((res) => {
        
    if (res) {
        
    if (array.length > elementArray.size ) {
        
        const keyMap=new Map()
        
        elementArray.forEach(child=>{
            keyMap.set(child._index,child)
        })
            Array.from(div.children).forEach((child,index) => {
                const key=child.getAttribute('for-key')
                const context=el._context
              const itemContext = {
              [arrayItem]: array[index],
              [indexes]: index,
              ...context
            }
            if (keyMap.get(key)) {      
                let oldElement=keyMap.get(key)
                const fragment=oldElement._resetForKeyElement()
                oldElement.remove()

                endComment.parentElement.insertBefore(oldElement._endComment,endComment)
                endComment.parentElement.insertBefore(oldElement,oldElement._endComment)
                Array.from(fragment.childNodes).forEach((com)=>{
                endComment.parentElement.insertBefore(com,oldElement._endComment)
                })
            } else {
                const keyComment=document.createComment(`key=${child.getAttribute('for-key') || index}`)
                const endKeyComment=document.createComment('end key')
                PawaComment.Element(keyComment)
                keyComment._endComment=endKeyComment
                keyComment._setKey(child.getAttribute('for-key') || index)
                child.setAttribute('for-unique',unique)
                child.setAttribute('data-for-index',index)
                keyComment._index=index
                processNode(newElement,itemContext)
                
                endComment.parentElement.insertBefore(endKeyComment,endComment)
                endKeyComment.parentElement.insertBefore(keyComment,endKeyComment)
                endKeyComment.parentElement.insertBefore(child,endKeyComment)
                insertIndex.set(index,newElement.getAttribute('for-key') || 'key')
                if (stateContext._hasRun) {
                    stateContext._hasRun=false
                    keepContext(stateContext)
                }
                render(child,itemContext,tree)
                
                elementArray.add(keyComment)
    
            }
            })

      
            }
         }
    })
       
    }
    if (firstEnter) {
        arrayLength=array.length
        
        array.forEach((item,index) => {
            const context=el._context
          const itemContext = {
          [arrayItem]: item,
          [indexes]: index,
          ...context
        }
        //console.log(itemContext)
        const newElement=el._attrElement('for')
        const keyComment=document.createComment(`key=${newElement.getAttribute('for-key') || index}`)
        const endKeyComment=document.createComment('end key')
        PawaComment.Element(keyComment)
        keyComment._endComment=endKeyComment
        newElement.setAttribute('for-unique',unique)
        newElement.setAttribute('data-for-index',index)
        processNode(newElement,itemContext)
        
        keyComment._index=index
        keyComment._setKey(newElement.getAttribute('for-key') || index)
        // console.log(newElement)
        endComment.parentElement.insertBefore(endKeyComment,endComment)
        endKeyComment.parentElement.insertBefore(keyComment,endKeyComment)
        endKeyComment.parentElement.insertBefore(newElement,endKeyComment)
        insertIndex.set(index,newElement.getAttribute('for-key') || 'key')
        if (stateContext._hasRun) {
            stateContext._hasRun=false
            keepContext(stateContext)
        }
        render(newElement,itemContext,tree)
        
        elementArray.add(keyComment)
        })
    
    }
    firstEnter=false
       } catch (e) {
           throw e
       }
    }
    createEffect(() => {
       evaluate()
    })
}

export const ref=(el,attr) => {
    if (el._running) {
      return
    }
    try {
      const keys = Object.keys(el._context);
  const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  
  const values = keys.map((key) => resolvePath(key, el._context))
  new Function('el',...keys,`${attr.value}.value=el`)(el,...values)
  el.removeAttribute(attr.name)
    } catch (e) {
      console.error(e)
      __pawaDev.setError({msg:e.message,stack:e.stack,el:el,directives:'ref'})
    }
  }
  

export const States=(el,attr,stateContext) => {
    
    if (el._running) {
        return
    }
    
    const name=attr.name.split('-')[1]
    try {
        const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, el._context));
const val=new Function(...keys,`return ${attr.value}`)(...values)

el._context[name]=$state(val)

if (stateContext._innerState) {
    if (stateContext._innerState.has(el)) {
        stateContext._innerState.get(el).push(el._context[name])
    } else {
        
        stateContext._innerState.set(el._template,[[
            name,
            el._context[name]]])
            // console.log(stateContext)
       // console.log(stateContext._innerState.get(el._template),el._template)
    }
}
el.removeAttribute(attr.name)
    } catch (e) {
        throw e
    }
}

export const Key=(el,attr,stateContext,tree)=>{
    if (el._running) {
        return
    }
    el._running=true
    let key=''
    let newKey=''
    let func
    let firstEnter=true
    const comment=document.createComment('key')
    const endComment=document.createComment('end key')
    PawaComment.Element(comment)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment,endComment)
    const evaluate=()=>{
        
        try {
            const keys = Object.keys(el._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
   const values = keys.map((key) => resolvePath(key, el._context));
   if (func === undefined ) {
    func=new Function(...keys,`return ${attr.value}`)
   }
   if (firstEnter) {
       firstEnter=false
       const keyEnter=func(...values)
       key=keyEnter.value
       const newElement=el._attrElement('key')
       comment.parentElement.insertBefore(newElement,endComment)
       if (stateContext._hasRun) {
        stateContext._hasRun=false
        keepContext(stateContext)
    }
       render(newElement,el._context,tree)
    }else{
       const newKeyEnter=func(...values)    
        newKey=newKeyEnter.value
 if (key !== newKey ) {
        key=newKey
        pawaWayRemover(comment,endComment)
        const newElement=el._attrElement('key')
        Promise.resolve().then(res =>{
        comment.parentElement.insertBefore(newElement,endComment)
        render(newElement,el._context,tree)
        })
    }
   }

        } catch (error) {
            __pawaDev.setError({el:el,msg:error})
            console.error(error)
        }
    }
    createEffect(()=>{ 
        evaluate()
    })
}
