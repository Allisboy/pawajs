import { getComponentGraph, keepComponentGraph } from "../component/index.js";
import { PawaRender } from "../graph/index.js";
import { createEffect } from "../reactive.js";
import { getContexters, safeEval } from "../utils.js";
import { setChained } from "./utils.js";

export const condition=(el,attr,context,graph)=>{
  const comment = document.createComment("condition");
  const chained=[{
      exp:el.getAttribute('if'),
      condition:'if',
      element:el
    }]
    const chainMap = setChained(el,chained);
  const {
    renderGraph,
    render,
  } = PawaRender(graph, context);
  renderGraph.nodeType = "condition";
  const componentGraph=getComponentGraph()
  renderGraph.control = comment;
  el.replaceWith(comment);
  initialize(el,context,chained,chainMap,comment,render,renderGraph,componentGraph)
}
 export const initialize = (el,context,chained,chainMap,comment,render,renderGraph,componentGraph,isHydrate) => {
  
  let func;
  let latestChain
  let oldChain
  let removePromise = Promise.resolve()
  let removalPending = false
  let transitionId = 0
  const {values}=getContexters(context)
  if (!func) {
    func = new Map();
    chained.forEach((item) => {
      if (item.condition === "else") return;
      let funcs = safeEval(item.exp,context);
      func.set(item.exp, funcs);
    });
  }
  const evaluate = () => {
    
    let current
    chained.forEach((element) => {
      if (current || element.condition === "else") return;
      try {
        current = func.get(element.exp)(...values);
        if (current) {
          latestChain = {
            id: element.exp,
            condition: element.condition,
          };
        } else {
          latestChain = {
            id: "else",
            condition: "else",
          };
        }
      } catch (error) {
        
        throw {
          ...error,
          effect:element.condition,
          ref:element.element,
          exp:element.exp
        }
      }
    });
    if (renderGraph.firstTime && isHydrate?.enter) {
      renderGraph.firstTime=false
       renderGraph.entrance=true
      oldChain={id:isHydrate.id}
      return
    }
    const setElement=(newElement,exp)=>{
        if (!newElement ) {
            renderGraph.ref=comment
            return
        }
        
        newElement.removeAttribute(exp)
        comment.replaceWith(newElement)
        keepComponentGraph(componentGraph)
        render(newElement)
        
    }
    if (oldChain?.id !== latestChain?.id) {
      
      const nextChain = latestChain
      const currentTransition = ++transitionId

      if (!renderGraph.firstTime && !removalPending) {
        const element = renderGraph.getElement()

        if (element) {
          if (!comment?.parentElement) {
            element.parentElement.insertBefore(comment, element)
          }
          renderGraph.killDown()
          removalPending = true
          removePromise = renderGraph.remove().finally((res) => {
            removalPending = false
          })
          
        }
      }
      
      removePromise.then(() => {
        if (currentTransition !== transitionId) return
        const newElement = chainMap.get(nextChain.id)?.element?.cloneNode?.(true) ?? null
        setElement(newElement, chainMap.get(nextChain.id)?.condition)
        renderGraph.entrance=true
      })
    }else{
      if(renderGraph.ref)return
      renderGraph.ref=comment
    }
    
    renderGraph.firstTime=false
    oldChain=latestChain
  };
  createEffect(()=>{
    evaluate()
  },renderGraph)
  return {evaluate}
};
