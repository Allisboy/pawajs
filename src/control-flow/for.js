import { getComponentGraph, keepComponentGraph } from "../component/index.js";
import { PawaRender } from "../graph/index.js";
import { createEffect } from "../reactive.js";
import { getContexters, safeEval } from "../utils.js";

const emitArrayKeyDebug = (payload) => {
    const dev = typeof globalThis !== 'undefined' ? globalThis.__pawaDev : (typeof window !== 'undefined' ? window.__pawaDev : null)
    if (dev && typeof dev.logArrayKey === 'function') {
        dev.logArrayKey(payload)
    }
}

export const ForEach=(el,attr,context,graph)=>{
    const comment = document.createComment("for-each");
    const {render,renderGraph}=PawaRender(graph,context)
    renderGraph.nodeType='for-each'
    renderGraph.control=comment
    el.removeAttribute(attr.name)
    el.replaceWith(comment)
    const componentGraph=getComponentGraph()
    const value = attr.value
    const split = value.split(' in ')
    const arrayName = split[1]
    const arrayItems = split[0].split(',')
    const arrayItem = arrayItems[0]
    const indexes = arrayItems[1]
    const forKey=el.getAttribute('for-key')
    
    initializer(el,attr,context,comment,renderGraph,componentGraph,arrayName,arrayItem,indexes,forKey)
}

export const initializer=(el, attr, context,comment,renderGraph,componentGraph,arrayName,arrayItem,indexes,forKey,isHydrate)=>{
    let cacher
    let pendingUpdate
    let updatePromise=Promise.resolve()
    let updateScheduled=false
    const keyCaches=new Map()
    const debugKeyLogger=(payload)=>{
        const enabled = typeof window !== 'undefined'
            ? window.__PAWA_DEBUG__ === true
            : (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production')

        if (!enabled) return
        console.debug('[pawa-for-each]', payload)
    }
    const getItemIdentity=(item, index)=>{
        if (item == null) return String(index)
        if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
            return String(item)
        }
        if (typeof item === 'object') {
            if ('id' in item && item.id !== undefined) return String(item.id)
            if ('key' in item && item.key !== undefined) return String(item.key)
            if ('uuid' in item && item.uuid !== undefined) return String(item.uuid)
            try {
                return JSON.stringify(item)
            } catch {
                return Object.prototype.toString.call(item)
            }
        }
        return String(item)
    }
    cacher=safeEval(arrayName,context)
    const {values}=getContexters(context)
    
    const getKey=(item,index)=>{
        const itemIdentity=getItemIdentity(item,index)
    if(!forKey) return index

        const cacheKey=`${forKey}::${itemIdentity}`
        const cachedKey=keyCaches.get(cacheKey)
        if (cachedKey !== undefined) {
            return String(cachedKey)
        }

        let newKey=forKey.replace(/{{(.+?)}}/g, (match, exp) => {
            const {values:val}=getContexters(item)
            const resolved = safeEval(exp, item)
            const result = typeof resolved === 'function' ? resolved(...val) : resolved
            return String(result ?? itemIdentity)
        })

        const finalKey=String(newKey || itemIdentity || index)
        keyCaches.set(cacheKey, finalKey)
        return finalKey
    }
    const createItem = (newElement, item, key, index, anchor) => {
    const itemContext = {
        ...context,
        [arrayItem]: item,
        [indexes]: index
    }
    const {render: rend, renderGraph: newGraph} = PawaRender(renderGraph, itemContext)
    newGraph.nodeType = 'for-key'
    newGraph.key = key
    newElement.removeAttribute('for-key')
    anchor.parentElement.insertBefore(newElement, anchor)   // CHANGED: was `comment.parentElement.insertBefore(newElement, comment)`
    keepComponentGraph(componentGraph)
    rend(newElement)
    return newGraph
}
    let updateGen = 0
    const applyUpdate = async ({array, arrayKey,gen}) => {
    if (!comment.parentElement) {
    const lastChild = renderGraph.children[renderGraph.children.length -1]
    const ref = lastChild?.getElement()
  
    
    if (ref?.parentElement) {
        ref.after(comment)   // AFTER, not insertBefore — comment must sit at the true tail
    }
}

    const oldChildren = renderGraph.children
    const oldKeyToChild = new Map(oldChildren.map(c => [c.key, c]))
    const nextKeys = new Set(arrayKey)

    const removed = oldChildren.filter(child => !nextKeys.has(child.key))
    removed.forEach(child => child.killDown())
    await Promise.all(removed.map(child => child.remove()))
    if (gen !== updateGen) return
    const nextChildren = arrayKey.map(key => oldKeyToChild.get(key) ?? null)

    const oldKeyToOldIndex = new Map(oldChildren.map((c, idx) => [c.key, idx]))
    const survivingOldIndices = []
    const survivingNewIndices = []
    arrayKey.forEach((key, newIndex) => {
        if (oldKeyToOldIndex.has(key)) {
            survivingOldIndices.push(oldKeyToOldIndex.get(key))
            survivingNewIndices.push(newIndex)
        }
    })
    const lisIndices = longestIncreasingSubsequenceIndices(survivingOldIndices)
    const stableNewIndices = new Set(lisIndices.map(i => survivingNewIndices[i]))

    // Walk backward, tracking the correct DOM anchor for "the position right
    // after where we currently are" — NOT a fixed node. This is what actually
    // preserves the single-anchor trick's correctness while skipping no-op moves.
    let anchor = comment
    for (let i = arrayKey.length - 1; i >= 0; i--) {
        const key = arrayKey[i]
        let child = nextChildren[i]
        if (child) {
            if (!stableNewIndices.has(i)) {
                child.move(anchor)   // only real moves touch the DOM
            }
            // stable or just-moved: either way, this item's element is now
            // the correct thing to anchor the NEXT (earlier) item against
            anchor = child.getElement() ?? anchor
            
        } else {
            nextChildren[i] = createItem(el.cloneNode(true), array[i], key, i,anchor)
            anchor = nextChildren[i].getElement() ?? anchor
        }
    }

    renderGraph.children = nextChildren
}
// Standard O(n log n) LIS-by-index helper
function longestIncreasingSubsequenceIndices(seq) {
  const n = seq.length
  const tails = []
  const prev = new Int32Array(n).fill(-1)
  const tailsAt = [] // index into seq

  for (let i = 0; i < n; i++) {
    let lo = 0, hi = tails.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (seq[tailsAt[mid]] < seq[i]) lo = mid + 1
      else hi = mid
    }
    if (lo > 0) prev[i] = tailsAt[lo - 1]
    tailsAt[lo] = i
    if (lo === tails.length) tails.push(seq[i])
    else tails[lo] = seq[i]
  }
  const result = []
  let idx = tailsAt[tailsAt.length - 1]
  while (idx !== undefined && idx >= 0) {
    result.push(idx)
    idx = prev[idx] >= 0 ? prev[idx] : undefined
  }
  return result.reverse()
}
    

const enqueueUpdate = (array, arrayKey) => {
  pendingUpdate = { array, arrayKey, gen: ++updateGen }
  if (updateScheduled) return
  updateScheduled = true
  updatePromise = updatePromise.then(async () => {
    while (pendingUpdate) {
      const update = pendingUpdate
      pendingUpdate = null
      await applyUpdate(update)
      // if a newer pendingUpdate appeared mid-await, loop continues
    }
  }).finally(() => {
    updateScheduled = false
    renderGraph.entrance=true
  })
}
    const evaluate=()=>{
       
        try {
            const result=cacher(...values)
            const array=Array.isArray(result) ? result : []
            const previousKeys = renderGraph.children.map(child => child.key)
            const arrayKey=array.map((element,index) => {
                const itemContext={
                    ...context,
                    [arrayItem]:element,
                    [indexes]:index
                }
                return getKey(itemContext,index)
            })

            const sameArrangement = previousKeys.length === arrayKey.length &&
                previousKeys.every((key, index) => key === arrayKey[index])

            const debugPayload = {
                arrayName,
                previousKeys,
                arrayKey,
                sameArrangement,
                arrayLength: array.length
            }
            emitArrayKeyDebug(debugPayload)
            debugKeyLogger(debugPayload)

             if (renderGraph.firstTime && isHydrate?.enter) {
            renderGraph.firstTime=false
            renderGraph.entrance=true
            return
        }

            if (sameArrangement) {
                renderGraph.firstTime=false
                if (renderGraph.children.length > 0) {
                    renderGraph.ref=renderGraph.children[0]
                }
                return
            }

            if (new Set(arrayKey).size !== arrayKey.length) {
                throw new Error(`Duplicate key in for-each: ${arrayKey}`)
            }
            enqueueUpdate(array,arrayKey)
            if (renderGraph.children.length > 0) {
                renderGraph.ref=renderGraph.children[0]
            }
            renderGraph.firstTime=false
        } catch (error) {
            console.log(error)
            throw {
                ...error,
                ref:el,
                effect:'for-each',
                exp:attr.value
            }
        }
    }

    createEffect(()=>{
        evaluate()
    },renderGraph)
    return {evaluate}
}