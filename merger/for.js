import { createEffect } from '../reactive.js';
import { render, $state, keepContext, restoreContext } from '../index.js';
import { PawaComment, PawaElement } from '../pawaElement.js';
import { processNode, pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';

export const merger_for = (el, stateContext, attr, arrayName, arrayItem, indexes, resume,
    { comment, endComment, unique, elementArray, insertIndex,keyOrders }) => {
    let firstEnter
    let func
    let once=false
    let promised
    const keyOrder= keyOrders || new Map()
    const evaluate = () => {
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
            if (!func) {

                const funcs = new Function(...keys, `
                    return ${arrayName}
                `)
                func = funcs
            }
            let update
            array = func(...values)
            if (!firstEnter) {
                const div = document.createElement('div')
                array.forEach((item, index) => {
                    const context = el._context
                    const itemContext = {
                        [arrayItem]: item,
                        [indexes]: index,
                        ...context
                    }
                    const newElement = el._attrElement('for')
                    newElement.setAttribute('data-for-index', index)
                    processNode(newElement, itemContext)
                    div.appendChild(newElement)
                })
                const removeElement = []
                
                const newElementsMap = new Map()
                Array.from(div.children).forEach(child => {
                    const key = child.getAttribute('for-key')
                    if (key) newElementsMap.set(key, child)
                })

                elementArray.forEach((keyComment) => {
                    let lookLike=null
                    // console.log(keyComment.nextSibling,keyComment.nextSibling._exitAnimation,'next sib');
                    lookLike = newElementsMap.get(keyComment._forKey) || null
                    if (lookLike !== null) {
                        keyComment._index = lookLike.getAttribute('data-for-index')
                    }
                    if (!el.getAttribute('for-key')) {
                        return
                    }
                    if(lookLike) return
                    if (lookLike === null) {
                        elementArray.delete(keyComment) 
                        
                        insertIndex.delete(Number(keyComment._forKey))
                        keyOrder.delete(keyComment._index)
                        const promise = new Promise(async(resolve) => {
                            await pawaWayRemover(keyComment,keyComment._endComment)
                            keyComment._deleteKey()
                            resolve(true)
                        })
                        removeElement.push(promise)
                    }
                })
                //insertIndex.clear()
                //find if update needed
                if (div.children.length > elementArray.size || elementArray.size > div.children.length) {
                    update=true
                }else{
                    let indexKey=0
                    keyOrder.forEach((value,key)=>{
                        if(update)return;
                        if(div.children[indexKey].getAttribute('data-for-index') !== key){
                            update=true
                        }
                    })
                }
                 const next = () => Promise.all(removeElement).then(async (res) => {
                     if (res) {
                        if (update) {
                            const keyMap = new Map()
                            elementArray.forEach(child => {
                                keyMap.set(child._forKey, child)
                            })
                            Array.from(div.children).forEach((child, index) => {
                                const key = child.getAttribute('for-key')
                                const context = el._context
                                const itemContext = {
                                    [arrayItem]: array[index],
                                    [indexes]: index,
                                    ...context
                                }
                                
                                if (keyMap.get(key)) {
                                    let oldElement = keyMap.get(key)
                                    const fragment = oldElement._resetForKeyElement()
                                    
                                    oldElement.remove()

                                    endComment.parentElement.insertBefore(oldElement._endComment, endComment)
                                    endComment.parentElement.insertBefore(oldElement, oldElement._endComment)
                                    Array.from(fragment.childNodes).forEach((com) => {
                                        endComment.parentElement.insertBefore(com, oldElement._endComment)
                                    })
                                } else {
                                    const keyComment = document.createComment(`key=${child.getAttribute('for-key') || index}`)
                                    const endKeyComment = document.createComment('end key')
                                    PawaComment.Element(keyComment)
                                    keyComment._endComment = endKeyComment
                                    keyComment._setKey(child.getAttribute('for-key') || index)
                                    child.setAttribute('for-unique', unique)
                                    child.setAttribute('data-for-index', index)
                                    keyComment._index = index
                                    processNode(child, itemContext)

                                    endComment.parentElement.insertBefore(endKeyComment, endComment)
                                    endKeyComment.parentElement.insertBefore(keyComment, endKeyComment)
                                    endKeyComment.parentElement.insertBefore(child, endKeyComment)
                                    insertIndex.set(index, child.getAttribute('for-key') || 'key')
                                    if (stateContext._hasRun) {
                                        stateContext._hasRun = false
                                        keepContext(stateContext)
                                    }
                                    elementArray.add(keyComment)
                                    render(child, itemContext)
                                    stateContext._hasRun = true
                                }
                            })
                        }
                    }
                })

                if (promised instanceof Promise) {
                    promised = promised.then(()=>{
                       return next()
                    })
                } else {
                    promised = next()
                }

            }
            if (firstEnter && !resume) {
                array.forEach((item, index) => {
                    const context = el._context
                    const itemContext = {
                        [arrayItem]: item,
                        [indexes]: index,
                        ...context
                    }
                    const newElement = el._attrElement('for')
                    const keyComment = document.createComment(`key=${newElement.getAttribute('for-key') || index}`)
                    const endKeyComment = document.createComment('end key')
                    PawaComment.Element(keyComment)
                    keyComment._endComment = endKeyComment
                    newElement.setAttribute('for-unique', unique)
                    newElement.setAttribute('data-for-index', index)
                    processNode(newElement, itemContext)
                    keyOrder.set(index,{comment:keyComment})
                    keyComment._index = index
                    keyComment._setKey(newElement.getAttribute('for-key') || index)
                    endComment.parentElement.insertBefore(endKeyComment, endComment)
                    endKeyComment.parentElement.insertBefore(keyComment, endKeyComment)
                    endKeyComment.parentElement.insertBefore(newElement, endKeyComment)
                    insertIndex.set(index, newElement.getAttribute('for-key') || 'key')
                    // if(newElement.getAttribute('for-key)){
                    //   keyMap
                    // }
                    if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                    render(newElement, itemContext)
                    stateContext._hasRun = true
                    elementArray.add(keyComment)
                })

            } else {
                if(!resume)return
                if(once)return
                elementArray.forEach((keyComment) => {
                    if(keyComment.nextElementSibling === null) return
                    const context = el._context
                    const itemContext = {
                        [arrayItem]: array[keyComment._index],
                        [indexes]: keyComment._index,
                        ...context
                    }
                    render(keyComment.nextElementSibling, itemContext,{notRender:false,index:null})
                
                })
                once=true
            }
            firstEnter = false
        } catch (error) {
            setPawaDevError({
                message: `Error from For directive ${error.message}`,
                error: error,
                template: el._template
            })
        }
    }
    return evaluate
}