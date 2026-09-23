import { InProxyCaller } from "../hooks/state.js";
import { createEffect } from "../reactive.js";
import { getContexters, safeEval } from "../utils.js";

export const text=(el,context,graph)=>{
    const {values}=getContexters(context)
        const nodesMap = new Map();

     // Get all text nodes and store their original content
    const textNodes = Array.from(el.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    textNodes.forEach(node => {
        nodesMap.set(node, node.nodeValue);
    });
    const getValue=(proxy=false)=>{
        //check if its reactive
           const{inProxy}= InProxyCaller(()=>{
                textNodes.forEach(textNode => {
                // Always use original content from map for evaluation
                let value = nodesMap.get(textNode);
                const regex = /@{([^}]*)}/g;
                value = value.replace(regex, (match, expression) => {
                    const res = safeEval(expression,context,true)
                        return String(res ?? '');
                })
                if(el.tagName === 'TEXTAREA'){
                    el.value=value
                }else{
                    textNode.nodeValue = value;
                }
            })
            },proxy)
            return {inProxy}
    }
    let enter=true
    const evaluate=()=>{
        try {
            
            const {inProxy}=getValue(enter)
            enter=false
            if (!inProxy) {
                for (const effect of graph.effect) {
                    effect()
                }
            }
        } catch (error) {
            throw  {
          ...error,
          effect:'Text',
          ref:el,
          exp:attr.value
        }
        }
    }
    createEffect(()=>{
        evaluate()
    },graph)
    
}