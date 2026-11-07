import { getComponentGraph, keepComponentGraph } from "../component/index.js";
import { PawaRender } from "../graph/index.js";
import { getContexters, safeEval } from "../utils.js";
export const Awaits=(el, attr, context, componentContext, graph)=>{
    const comment = document.createComment("Await");
    const {render,renderGraph}=PawaRender(graph,context)
    renderGraph.nodeType='key'
    renderGraph.control = comment;
    const componentGraph=getComponentGraph()
    const {values}=getContexters(context)
    const cache=safeEval(attr.value,context)
    let awaits=el.cloneNode(true)
    let whileAwait=null
    let awaitError=null
    while (el.nextElementSibling?.hasAttribute('as-fallback') || el.nextElementSibling?.hasAttribute('as-catch')) {
        if (el.nextElementSibling.hasAttribute('as-fallback')) {
            whileAwait=el.nextElementSibling.cloneNode(true)
            el.nextElementSibling.remove()
        }else {
            awaitError=el.nextElementSibling.cloneNode(true)
            el.nextElementSibling.remove()
            awaitError.removeAttribute('catch')
        }
    }
    el.replaceWith(comment)
    const apply=(newElement,type,res)=>{
            const element =renderGraph.getElement()
               if (element) {
                element.replaceWith(comment)
                renderGraph.killDown()
               renderGraph.remove()
               }
               comment.parentElement.insertBefore(newElement, comment)
               const as=newElement.getAttribute('as') ?? type
               newElement.removeAttribute('as')
               const item={
                ...context,
                [as]:res
               }
               const {render:rend,renderGraph:carrier}=PawaRender(renderGraph,item)
               carrier.nodeType='resolved'
               rend(newElement)
    }
    
    const evaluate=()=>{
        try {
            if (whileAwait) {
                whileAwait.removeAttribute('as-fallback')
                comment.parentElement.insertBefore(whileAwait, comment)
                render(whileAwait)
            }
            new Promise(async r =>{
               const promise=typeof cache === 'function' ?await cache(...values)() :await cache
            
            r(promise)
           }).then((res)=>{
                awaits.removeAttribute('await')
                keepComponentGraph(componentGraph)
                apply(awaits,'res',res)
                comment.remove()
            }
            ).catch(err=>{
                awaitError.removeAttribute('as-catch')
                keepComponentGraph(componentGraph)
                apply(awaitError,'error',err)
                comment.remove()
            })
            
        } catch (error) {
            console.error('[Await Error]',error,'the await expression must be a function that returns a promise or a promise itself');
            
            throw {
                msg:error.message,
                ref:el,
                effect:'Awaiting',
                exp:attr.value
            }
        }
    }
    evaluate()
}