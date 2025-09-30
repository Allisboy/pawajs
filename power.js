import { createEffect } from './reactive.js';
import { render, $state, keepContext } from './index.js';
import { PawaComment, PawaElement } from './pawaElement.js';
import { processNode, pawaWayRemover, safeEval, getEvalValues, setPawaDevError } from './utils.js';
export const If = (el, attr, stateContext, tree) => {
    if (el._running) {
        return
    }


    tree.running = true
    el._running = true
    el._tree.thisSame = true
    const comment = document.createComment(`if (${el._attr.if})`)

    const endComment = document.createComment(`end if`)
    el._out = true
    const parent = el.parentElement
    const nextSibling = el.nextElementSibling || null

    if (nextSibling !== null) {
        if (nextSibling && nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {

            nextSibling.setAttribute('data-if', el._attr.if)
        }
    }
    el._tree.primaryAttribute = "if"
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    comment._setCoveringElement(el)
    parent.insertBefore(comment, endComment)
    el._underControl = comment
    const context = el._context
    let firstEnter = false
    comment._controlComponent = true
    let func
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {

            if (!func) {
                func = safeEval(el._context, el._attr.if, el)
            }
            const values = getEvalValues(el._context)
            const condition = func(...values)
            if (!firstEnter) {
                for (const fn of el._terminateEffects) {
                    comment._terminateEffects.add(fn)
                }
            }
            if (condition) {
                firstEnter = true
                if (comment.nextSibling !== endComment) {
                    return
                }
                const newElement = el._attrElement('if')
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                parent.insertBefore(newElement, endComment)

                render(newElement, el._context, tree)
                stateContext._hasRun = true
            } else {
                if (firstEnter) {
                    pawaWayRemover(comment, endComment)
                }
            }

        } catch (error) {
            setPawaDevError({
                message: `Error from IF directive ${error.message}`,
                error: error,
                template: el._template
            })
        }



    }
    createEffect(() => {
        evaluate()
    }, el)
}

export const event = (el, attr, stateContext) => {
    if (el._running) {
        return
    }
    //    console.log(stateContext)
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


export const Else = (el, attr, stateContext, tree) => {
    if (el._running) {
        return
    }
    el._running = true
    el._tree.thisSame = true
    const elseValue = el.getAttribute('data-if')
    el.removeAttribute('data-if')
    const comment = document.createComment(`if (${elseValue}) else`)
    const endComment = document.createComment(`end else`)
    el._out = true
    const parent = el.parentElement
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    parent.insertBefore(comment, endComment)
    el._underControl = comment
    const context = el._context
    let firstEnter = false
    let func;
    el._tree.primaryAttribute = "else"
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {
            const keys = Object.keys(context);
            const resolvePath = (path, obj) => {
                return path.split('.').reduce((acc, key) => acc?.[key], obj);
            };
            const values = keys.map((key) => resolvePath(key, context));
            if (!func) {
                func = new Function(...keys, `return ${elseValue}`)
            }
            const condition = func(...values)
            if (condition) {

                if (firstEnter) {
                    pawaWayRemover(comment, endComment)
                }

            } else {
                firstEnter = true
                if (comment.nextSibling !== endComment) {
                    return
                }
                const newElement = el._attrElement('else')

                parent.insertBefore(newElement, endComment)
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                render(newElement, context, tree)
                stateContext._hasRun = true
            }

        } catch (error) {
            setPawaDevError({
                message: `Error from Else directive ${error.message}`,
                error: error,
                template: el._template
            })
        }



    }
    createEffect(() => {
        evaluate()
    })
}

export const ElseIf = (el, attr, stateContext, tree) => {
    if (el._running) {
        return
    }
    el._running = true
    const exp = new WeakMap()
    el._tree.thisSame = true
    const elseIfValue = el.getAttribute('else-if')
    const elsePrimitive = { key: elseIfValue }
    const ifValue = el.getAttribute('data-if')
    const ifPrimitive = { key: ifValue }
    const nextSibling = el.nextElementSibling
    el._tree.primaryAttribute = "else-if"
    if (nextSibling !== null) {
        if (nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {
            nextSibling.setAttribute('data-if', elseIfValue)
        }
    }
    el.removeAttribute('data-if')
    const comment = document.createComment(`else if (${elseIfValue})`)
    const endComment = document.createComment(`end else if`)
    el._out = true
    const parent = el.parentElement
    el.replaceWith(endComment)
    PawaComment.Element(comment)
    parent.insertBefore(comment, endComment)
    el._underControl = comment
    const context = el._context
    let firstEnter = false;
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
    const evaluate = () => {
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
                    pawaWayRemover(comment, endComment)
                }

            } else if (elseCondition) {
                firstEnter = true
                if (comment.nextSibling !== endComment) {
                    return
                }
                const newElement = el._attrElement('else-if')

                parent.insertBefore(newElement, endComment)
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                render(newElement, context, tree)
                stateContext._hasRun = true
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

        } catch (error) {
            setPawaDevError({
                message: `Error from Else-IF directive ${error.message}`,
                error: error,
                template: el._template
            })
        }



    }
    createEffect(() => {
        evaluate()
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

export const For = (el, attr, stateContext, tree) => {
    if (el._running) {
        return
    }
    el._running = true
    const exp = new WeakMap()
    const primitive = { key: attr.value }
    el._tree.thisSame = true
    let firstEnter = true
    const value = attr.value
    const split = value.split(' in ')
    const arrayName = split[1]
    const arrayItems = split[0].split(',')
    const arrayItem = arrayItems[0]
    const indexes = arrayItems[1]
    const comment = document.createComment(`${attr.value}`)
    const endComment = document.createComment(`end for`)
    el.replaceWith(endComment)
    endComment.parentElement.insertBefore(comment, endComment)
    el._underControl = comment
    const unique = crypto.randomUUID()
    const insertIndex = new Map()
    const elementArray = new Set()
    el._tree.primaryAttribute = "for"
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
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
            if (!exp.has(primitive)) {

                const func = new Function(...keys, `
        return ${arrayName}
    `)
                exp.set(primitive, func)
            }
            array = exp.get(primitive)(...values)
            if (!firstEnter) {
                const div = document.createElement('div')
                array.forEach((item, index) => {
                    const context = el._context
                    const itemContext = {
                        [arrayItem]: item,
                        [indexes]: index,
                        ...context
                    }

                    //console.log(itemContext)
                    const newElement = el._attrElement('for')
                    newElement.setAttribute('data-for-index', index)
                    processNode(newElement, itemContext)
                    div.appendChild(newElement)
                })
                const removeElement = []
                elementArray.forEach((keyComment) => {
                    const lookLike = div.querySelector(`[for-key='${keyComment._forKey}']`)
                    if (lookLike !== null) {
                        keyComment._index = lookLike.getAttribute('data-for-index')
                    }
                    if (!lookLike) {
                        const promised = new Promise((resolve) => {
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

                const promise = Promise.all(removeElement).then((res) => {

                    if (res) {

                        if (array.length > elementArray.size) {

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
                                    render(child, itemContext, tree)
                                    stateContext._hasRun = true
                                    elementArray.add(keyComment)

                                }
                            })


                        }
                    }
                })

            }
            if (firstEnter) {
                array.forEach((item, index) => {
                    const context = el._context
                    const itemContext = {
                        [arrayItem]: item,
                        [indexes]: index,
                        ...context
                    }
                    //console.log(itemContext)
                    const newElement = el._attrElement('for')
                    const keyComment = document.createComment(`key=${newElement.getAttribute('for-key') || index}`)
                    const endKeyComment = document.createComment('end key')
                    PawaComment.Element(keyComment)
                    keyComment._endComment = endKeyComment
                    newElement.setAttribute('for-unique', unique)
                    newElement.setAttribute('data-for-index', index)
                    processNode(newElement, itemContext)

                    keyComment._index = index
                    keyComment._setKey(newElement.getAttribute('for-key') || index)
                    // console.log(newElement)
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
                    render(newElement, itemContext, tree)
                    stateContext._hasRun = true
                    elementArray.add(keyComment)
                })

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
    createEffect(() => {
        evaluate()
    })
}

export const ref = (el, attr) => {
    if (el._running) {
        return
    }
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };

        const values = keys.map((key) => resolvePath(key, el._context))
        new Function('el', ...keys, `
    try{
        if(Array.isArray(${attr.value}.value)){
        ${attr.value}.value.push(el)
    }else{
    ${attr.value}.value=el
    }
    }catch(e){
    console.error(e.message,e.error)
    __pawaDev.setError({el:el,msg:e.message,stack:e.stack,directives:'ref'})
    }
    `)(el, ...values)
        el.removeAttribute(attr.name)
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
    if (el._running) {
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

const chunkSet = new Set()
/**
 * @param {PawaElement | HTMLElement} el
 * @param {{name:string,value:string}} attr
 */
export const chunk = (el, attr, stateContext, tree) => {
    if (el._running) {
        return
    }
    tree.running = true
    el._running = true
    el._tree.thisSame = true
    const comment = document.createComment(`<script src='${attr.value}>'`)
    const endComment = document.createComment(`</script>`)
    let func, success, error
    el._out = true
    el._tree.primaryAttribute = "chunk"
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
    el.replaceWith(endComment)
    const parent = endComment.parentElement
    PawaComment.Element(comment)
    comment._setCoveringElement(el)
    parent.insertBefore(comment, endComment)
    el._underControl = comment
    const newElement = el._attrElement('chunk')
    const context = el._context
    comment._controlComponent = true
    try {

        if (el.hasAttribute('chunk-success')) {
            success = safeEval(context, `()=>{
                ${el.getAttribute('chunk-success')}
            }`,el)(...getEvalValues(context))
        }
        if (el.hasAttribute('chunk-error')) {
            error = safeEval(context, `()=>{
                ${el.getAttribute('chunk-error')}
            }`,el)(...getEvalValues(context))
        }
        if (el.hasAttribute('chunk-retry')) {
            error = safeEval({...context,evaluate:evaluate}, `(evaluate)=>{
                ${el.getAttribute('chunk-retry')}
                }`)(...getEvalValues(context))
        }
        // create script
        const script = document.createElement('script')
        script.type = 'module'
        script.src = attr.value
        document.body.appendChild(script)
        const evaluate = () => {
            newElement.removeAttribute('chunk-success')
            newElement.removeAttribute('chunk-error')
            newElement.removeAttribute('chunk-retry')
            const enterElement=()=>{
                parent.insertBefore(newElement, endComment)
                    if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                    render(newElement, context, tree)
                    el._tree.componentName=newElement._tree.componentName
                    el._tree.isComponent=newElement._tree.isComponent
                    stateContext._hasRun = true
            }
            if(chunkSet.has(attr.value)){
                enterElement()
            }
            script.onload = () => {
                Promise.resolve().then(() => {
                    enterElement()
                    if (chunkSet.has(attr.value)) {
                        script.remove()
                    } else {
                        chunkSet.add(attr.value)
                        el._setUnMount(() => {
                            script.remove()
                        })
                    }
                    if (el.hasAttribute('chunk-success') && typeof success === 'function') {
                        try {
                            success()
                        } catch (error) {
                            setPawaDevError({
                                message: `Error from chunk-success directive ${error.message}`,
                                error: error,
                                template: el._template
                            })
                        }
                    }
                })
            }
            script.onerror = () => {
                if (el.hasAttribute('chunk-error') && typeof error === 'function') {
                    try {
                        error()
                    } catch (error) {
                       setPawaDevError({
                                message: `Error from chunk-error directive ${error.message}`,
                                error: error,
                                template: el._template
                            })
                    }
                }
                if (el.hasAttribute('chunk-retry') && typeof retry === 'function') {
                    try {
                        retry(evaluate)
                    } catch (error) {
                        setPawaDevError({
                                message: `Error from chunk-retry directive ${error.message}`,
                                error: error,
                                template: el._template
                            })
                    }
                }
            }
        }

        if (el.hasAttribute('chunk-retry')) {
            createEffect(() => {
                evaluate()
            })
        } else {
            evaluate()
        }
    } catch (error) {
        setPawaDevError({
            message: `Error from chunk directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}