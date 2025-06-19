import {createEffect} from './reactive.js';
import {render,$state,keepContext,getCurrentContext} from './index.js';
import {PawaComment} from './pawaElement.js';
import {processNode,pawaWayRemover} from './utils.js';
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
const condition=new Function(...keys,`return ${el._attr.if}`)(...values)
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
        elementArray.forEach((ele) => {
            const lookLike=div.querySelector(`[for-key='${ele.getAttribute('for-key')}']`)
            //console.log(lookLike?.getAttribute('for-key'))
            if (!lookLike) {
               const promised=ele._remove(() => {
                insertIndex.delete(Number(ele.getAttribute('data-for-index')))
        elementArray.delete(ele)
    const findIndex = ele.getAttribute('data-for-index')
               })
               if (typeof promised=== 'function') {
                   removeElement.push(promised)
               }
               
            } else {
                
                const elements=div.querySelector(`[for-key='${ele.getAttribute('for-key')}']`)
                ele.setAttribute('data-for-index',elements.getAttribute('data-for-index'))
            }
        })
        //insertIndex.clear()
        
    const promise= Promise.all(removeElement).then((res) => {
        
    if (res) {
        
    if (array.length > elementArray.size ) {
        
        const carrier=document.createElement('div')
        elementArray.forEach(child=>{
            carrier.appendChild(child)
        })
        Array.from(div.children).forEach((child,index) => {
            const key=child.getAttribute('for-key')
            const context=el._context
          const itemContext = {
          [arrayItem]: array[index],
          [indexes]: index,
          ...context
        }
        if (carrier.querySelector(`[for-key='${key}']`)) {
            
            
            let oldElement=carrier.querySelector(`[for-key='${key}']`)
            endComment.parentElement.insertBefore(oldElement,endComment)
        } else {

child.setAttribute('for-unique', unique)
//processNode(newElement, itemContext)
//console.log(newElement)
endComment.parentElement.insertBefore(child, endComment)

insertIndex.set(index, child.getAttribute('for-key') || 'key')
render(child, itemContext,tree)
elementArray.add(child)

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
        newElement.setAttribute('for-unique',unique)
        newElement.setAttribute('data-for-index',index)
        processNode(newElement,itemContext)
        //console.log(newElement)
        endComment.parentElement.insertBefore(newElement,endComment)
        
        insertIndex.set(index,newElement.getAttribute('for-key') || 'key')
        render(newElement,itemContext,tree)
        elementArray.add(newElement)
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
      throw e
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
