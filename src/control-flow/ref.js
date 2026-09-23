import {  safeEval } from "../utils.js";

export const ref=(el,attr,context,graph)=>{
    
    
    try {
        const setter=safeEval(`()=>{
            try{
        if (typeof ${attr.value} === 'function') {
            const cleanUp=${attr.value}(el)
            if(typeof cleanUp === 'function'){
            graph.unMount.push(cleanUp)
            }
        }else if(Array.isArray(${attr.value}.value)){
        ${attr.value}.value.push(el)
    }else if(typeof ${attr.value} === 'string'){
    return {
    value:el
    }
    }else{
    ${attr.value}.value=el
    }
    }catch(e){
    console.error(e.message,e.stack)
    }
 } `,{el:el,graph,...context},true)
            setter()
            
            el.removeAttribute(attr.name)
    } catch (error) {
        console.log(error);
        
    }
}