import { getComponentGraph, keepComponentGraph } from "../component/index.js";
import { PawaRender } from "../graph/index.js";
import { createEffect } from "../reactive.js";
import { getContexters, safeEval } from "../utils.js";

export const Key=(el, attr, context, graph,componentContext)=>{
    const comment = document.createComment("key");
    const {render,renderGraph}=PawaRender(graph,context)
    renderGraph.nodeType='key'
    renderGraph.control = comment;
    const componentGraph=getComponentGraph()
    el.removeAttribute(attr.name)
    el.replaceWith(comment)
    initializer(el,attr,context,renderGraph,render,componentGraph,comment)
}
 export const initializer=(el, attr, context, renderGraph,render,componentGraph,comment,isHydrate)=>{
    let oldKey
    let removePromise = Promise.resolve()
    let removalPending = false
    let transitionId = 0
    const {values}=getContexters(context)
    const cache=safeEval(attr.value,context)
    const evaluate=()=>{
        
        try {
            const newKey=cache(...values) 
            if (renderGraph.firstTime && isHydrate?.enter) {
            renderGraph.firstTime=false
            renderGraph.entrance=true
            oldKey=isHydrate.key
            return
        }
            if (typeof newKey === 'undefined') {
                if (oldKey !== newKey) {
                    transitionId++
                    renderGraph.kill=true
                    if (!removalPending) {
                        const element=renderGraph.getElement()
                        if (element) {
                            element.parentElement.insertBefore(comment,element)
                            renderGraph.killDown()
                            removalPending=true
                            removePromise=renderGraph.remove().finally(() => {
                                removalPending=false
                            })
                        }
                    }
                }
            }else if (oldKey !== newKey) {
                const currentTransition=++transitionId
                if (!removalPending) {
                    const element=renderGraph.getElement()
                    if (element) {
                        element.parentElement.insertBefore(comment,element)
                        renderGraph.killDown()
                        removalPending=true
                        removePromise=renderGraph.remove().finally(() => {
                            removalPending=false
                        })
                    }
                }
                removePromise.then(() =>{
                    if (currentTransition !== transitionId) return
                    const newElement=el.cloneNode(true)
                    newElement.removeAttribute(attr.name)
                    comment.replaceWith(newElement)
                    keepComponentGraph(componentGraph)
                    render(newElement)
                    renderGraph.entrance=true
                })
            }
            oldKey=newKey
            
        } catch (error) {
          throw  {
          msg:error.message,
          stack:error.stack,
          effect:'key',
          ref:el,
          exp:attr.value
        }
        }
    }
    createEffect(()=>{
        evaluate()
    },renderGraph)
}