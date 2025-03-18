import { component, components, regenerate, state, stateWatch ,render} from "./index.js";
import { createEffect } from "./reactive.js";
import { replaceOperators,elementTrack } from "./utils.js";


export const bind=(el,exp,context)=>{

    const evaluate=() => {
    const resolvePath = (path, obj) => {
   return path.split('.').reduce((acc, key) => acc?.[key], obj);
 };
 
          let template=`{{${exp}}}`
         const newTemp= template.replace(/{{(.*?)}}/g, (_, expression) => {
   try {
     // Extract keys and values from context
     const keys = Object.keys(context);
 
     const values = keys.map((key) => resolvePath(key, context));
   //  console.log(JSON.stringify(values))
         return new Function(...keys, `return ${expression}`)(...values);
      
    // console.log(tem)
 
   } catch {
     return ''; // Return empty string for invalid placeholders
   }
 });
 //console.log(newTemp)
     el.textContent=newTemp
        
     }
     createEffect(()=>{
     evaluate()
     },el)
}

export const model = (el,exp,childContext) => {
  const resolvePath = (path, obj) => {
 return path.split('.').reduce((acc, key) => acc?.[key], obj);
};

   const updateValue=(value) => {
         const keys = Object.keys(childContext)
const values = keys.map((key) => resolvePath(key, childContext));
value = new Function(...keys, `
         return ${exp}=${value}
         `)(...values)
   }
   el.addEventListener('input', (e) => {
 const value = el.type === 'number' ? parseFloat(e.target.value) : e.target.value;
 updateValue(`'${value}'`);
})
   const evaluate = () => {
     let value
        const keys=Object.keys(childContext)
        const values = keys.map((key) => resolvePath(key, childContext));
         value=new Function(...keys,`
         return ${exp}
         `)(...values)
      
      
      el.value=value
   }
   createEffect(()=>{
     evaluate()
     },el)
   // listeners.add(evaluate)
}


export const If=(el,exp,context) =>{
  const comment=document.createComment("it's if")
  let compo;
    if(components.has(el.tagName)){
      el.setAttribute('suspense','true')
      el.removeAttribute('if')
    }
    const commentEsle=document.createComment("it's else")
    const elseSibling=el.nextElementSibling 
    const sibling=elseSibling?.attributes || []
    const findElse=Array.from(sibling).map((a)=>a.name === 'else')
    el.replaceWith(comment)
    
    const evaluate=()=>{
        try {
            // Extract keys and values from childContext
            const keys = Object.keys(context);
            const resolvePath = (path, obj) => {
                return path.split('.').reduce((acc, key) => acc?.[key], obj);
              };
              const values = keys.map((key) => resolvePath(key, context));
              const condition= new Function(...keys, `return ${exp}`)(...values);
              // console.log(condition)
            if(condition){
                
                if (elseSibling && findElse[0]) {
                    elseSibling.replaceWith(commentEsle)
                }
                if(components.has(el.tagName)){
                  // console.log('compo')
               const ele=component(el,context)
                  compo=ele

                  elementTrack(compo).beforeEnter().enter()
                  comment.replaceWith(compo)
                  
                }else{
                  elementTrack(el).beforeEnter().enter()
                  comment.replaceWith(el)
                  
                }

            }else{
                if (elseSibling && findElse[0]) {
                    commentEsle.replaceWith(elseSibling)
                }
                if(components.has(el.tagName)){
                  elementTrack(compo).beforeLeave().leave(()=>compo.replaceWith(comment))
                   
                }else{
                  elementTrack(el).beforeLeave().leave(()=>el.replaceWith(comment))
                  
                }
            }
          } catch {
            return ''; // Return empty string for invalid placeholders
          }
    }
    
    createEffect(()=>{
        evaluate()
    })
  }
  export const transition=(el,exp,context)=>{
    const comment=document.createComment("transition if")
    const enter = el.getAttribute('enter')
      const enterTo = el.getAttribute('enter-to')
      const leave = el.getAttribute('leave')
      const leaveTo = el.getAttribute('leave-to')
      const duration = el.getAttribute('duration') || 300
      el.replaceWith(comment)
      const evaluate=()=>{
        try {
          // Extract keys and values from childContext
            const keys = Object.keys(context);
            const resolvePath = (path, obj) => {
              return path.split('.').reduce((acc, key) => acc?.[key], obj);
              };
              const values = keys.map((key) => resolvePath(key, context));
            const condition= new Function(...keys, `return ${exp}`)(...values);
            if(el.getAttribute('entering') === '0'){
            if (condition) {
              enter?.split(' ').forEach(cl => {
                if(cl === '')return
                el.classList.add(cl)
              })
              // Enter transition
              setTimeout(() => {
                requestAnimationFrame(() => {
                  enter?.split(' ').forEach(cl => {
                    if(cl === '')return
                    el.classList.remove(cl)
                  })
                  
                  enterTo?.split(' ').forEach(cl => {
                    if(cl === '')return
                    el.classList.add(cl) 
                  })
                })
                // console.log(children);
              }, duration);
              comment.replaceWith(el)
            } else {
              enterTo?.split(' ').forEach(cl => {
                if(cl === '')return
                  el.classList.remove(cl) 
                })
              // Leave transition
              leave?.split(' ').forEach(cl => {
                if(cl === '')return
                el.classList.add(cl)
              })
              requestAnimationFrame(() => {
                leaveTo?.split(' ').forEach(cl => {
                  if(cl === '')return
                  el.classList.add(cl)
                })
              })
              
              setTimeout(() => {
                leave?.split(' ').forEach(cl => {
                  if(cl === '')return
                  el.classList.remove(cl)
                })
                leaveTo?.split(' ').forEach(cl => {
                  if(cl === '')return
                  el.classList.remove(cl)
                })
              enter?.split(' ').forEach(cl => {
                if(cl === '')return
              el.classList.add(cl)
            })
            el.replaceWith(comment)
            //
              }, duration)
            }
          }
          if(el.getAttribute('entering') === '1'){
            if(condition){
              comment.replaceWith(el)
              el.setAttribute('entering','0')
            }else{
               el.replaceWith(comment)
              el.setAttribute('entering','0')
            
            }
          }
           
          } catch {
            return ''; // Return empty string for invalid placeholders
          }
    }
    
    createEffect(()=>{
        evaluate()
    })
}
export const click=(el,exp,childContext) => {
        const template=`{{${exp}}}`
       const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  
  template.replace(/{{(.*?)}}/g, (_, expression) => {
    try {
      // Extract keys and values from childContext
      const keys = Object.keys(childContext);
  
      const values = keys.map((key) => resolvePath(key, childContext));
       el.addEventListener('click',(e) => {
            // keys.push('e')
            // values.push({'e':e})
             new Function('e',...keys, ` ${expression}`)(e,...values);
        })
      
  
    } catch {
      return ''; // Return empty string for invalid placeholders
    }
  });
     el.removeAttribute('click') 
  }
export const event=(el,name,value,childContext) => {
     const afterColon = name.split('-')[1]
       const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  
  try {
    // Extract keys and values from childContext
    // console.log(childContext)
    const keys = Object.keys(childContext);
    const values = keys.map((key) => resolvePath(key, childContext));
    el.addEventListener(afterColon,(e) => {
             new Function('e',...keys, `
               try{
               ${value}
               }catch(error){
               
               throw new Error(error + ' at '+ e.target);
               }
               `)(e,...values);
        })
      
  
    } catch {
      return ''; // Return empty string for invalid placeholders
    }

    //  el.removeAttribute('click') 
  }
  
export const states=(el,name,value,context)=>{
    new Function('name','value','context','state',`
       let document=null
       let window=null
       try{
         context.${name}=state(${value})
       }catch{
       console.warn("error from ${value} and state-${name} maybe its in valid javascript or you want to set a string wrap it inside a quote ")
       }
        `)(name,value,context,state)
}
export const variable=(el,name,value,context)=>{
    const evaluate=()=>{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      let obj=null
      new Function('context','el',...keys,`
       
       vars.${name}=${value}
        `)(context,el,...values)
        
        // console.log(context)
    }
    createEffect(()=>{
        evaluate()
    })
}
export const key=(el,exp, context, any, render)=>{
  const fragment=document.createDocumentFragment()
  const comment=document.createComment('key element')
  el.replaceWith(comment)
  el.removeAttribute('set-key')
  fragment.appendChild(el)
  const nodes=new Map()
  let oldKey=null
  let nowNode;
    const evaluate=()=>{

      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      // console.log(context)
    const isKey=new Function('el',...keys,`
        return ${exp}
        `)(el,...values)
        if (nowNode) {
          const newNode=fragment.firstElementChild.cloneNode(true)
          
          newNode.setAttribute('spe-key',isKey)
          elementTrack(newNode).beforeEnter().enter()
          elementTrack(nowNode).beforeLeave()
          nowNode.replaceWith(newNode)
          render(newNode,context)
          nowNode=newNode
        } else {
          const newNode=fragment.firstElementChild.cloneNode(true)
          newNode.setAttribute('spe-key',isKey)
          comment.replaceWith(newNode)
          render(newNode,context)
          nowNode=newNode
        }
        // console.log(context)
    }
    createEffect(()=>{
        evaluate()
    })
}

export const For = (el, exp, context, any, render) => {
  const comment = document.createComment("it's for")
  const fragment = el.cloneNode(true)
  el.removeAttribute('for')
  const contexts=new Map()
  
    el.setAttribute('suspense','true')
  
  
  const splitExp = exp.split(' in ')
  el.replaceWith(comment)
  const parentNode = comment.parentNode
  
  // Track elements by key for efficient updates
  const trackedElements = new Map()
  let previousKeys = []
 
  const evaluate = () => {
    if(splitExp[1] === undefined) return;
    
    const arrayName = splitExp[1].trim()
    const itemExp = splitExp[0].trim()
    let itemName = itemExp
    let indexName = 'index'
    
    // Check if item expression has index variable
    if(itemExp.includes(',')) {
      const [item, index] = itemExp.split(',').map(s => s.trim())
      itemName = item
      indexName = index
    }

    try {
      const keys = Object.keys(context)
      const resolvePath = (path, obj) => {
        return path.split('.').reduce((acc, key) => acc?.[key], obj)
      }
      const values = keys.map(key => resolvePath(key, context))
      const array = new Function(...keys, `return ${arrayName}`)(...values) || []
      
      // Get current keys to track additions/removals
      const currentKeys = array.map((item, index) => item.key || index.toString())
      
      // Find elements to remove (in previous but not in current)
      const keysToRemove = previousKeys.filter(key => !currentKeys.includes(key))
      
      // Remove elements that are no longer in the array
      keysToRemove.forEach(key => {
        const element = trackedElements.get(key)
        if (element) {
          elementTrack(element).beforeLeave().leave(() => {
            console.log('leave')
            element.remove()
            trackedElements.delete(key)
          })
        }
      })
      
      // Process current array items
      let lastElement = comment
      
      array.forEach((item, index) => {
        const key = item.key || index.toString()
        const itemContext = {
          ...context,
          [itemName]: item,
          [indexName]: index
        }
        const processNode=(node)=>{
          if (node.nodeType === 3) {
            const text=node.textContent
            const newText=text.replace(/{{(.+?)}}/g,(match,exp)=>{
              try{
                const keys=Object.keys(itemContext)
                const values =keys.map(key => itemContext[key])
                return new Function(...keys,`return ${exp}`)(...values)
              }catch{
                return match
              }
            })
            node.textContent=newText
          }else if(node.attributes){
            Array.from(node.attributes).forEach( attr=>{
              const newValue=attr.value.replace(/{{(.+?)}}/g,(match,exp)=>{
                // console.log(attr.name,attr.value)
                try{
                  const keys=Object.keys(itemContext)
                  const values =keys.map(key => itemContext[key])
                  const value=new Function(...keys,`return ${exp}`)(...values)
                  if(typeof value === 'object' || Array.isArray(value)){
                    return exp
                  }
                  return value
                }catch{
                  console.warn('breakdown at '+ attr + node)
                  return match
                }
              })
              // console.log(newValue)

              attr.value=newValue
            })
          }
          Array.from(node.childNodes).forEach(processNode)
         }
        if (trackedElements.has(key)) {
          // Update existing element
          const existingElement = trackedElements.get(key)
          // console.log(contexts.get(existingElement))
          // const oldContext=Object.assign(contexts.get(existingElement),itemContext)
          // console.log(oldContext)
          //   render(existingElement, oldContext)  
          // Move element to correct position if needed
          if (existingElement.previousSibling !== lastElement) {
            parentNode.insertBefore(existingElement, lastElement.nextSibling)
          }
          
          lastElement = existingElement
        } else {
          // Create new element
          const element=fragment.cloneNode(true)
          let newElement; 
          processNode(element)
          if(components.has(el.tagName)) {
            element.removeAttribute('for')
          newElement=component(element, itemContext)
        } else{
            newElement=element
          }
          contexts.set(newElement,itemContext)
          newElement.removeAttribute('for')
          newElement.setAttribute('key', key)
          newElement.removeAttribute('suspense')
          elementTrack(newElement).beforeEnter().enter()
          parentNode.insertBefore(newElement, lastElement.nextSibling)
          if(!components.has(el.tagName)) {
            render(newElement, itemContext)
          }
          trackedElements.set(key, newElement)
          lastElement = newElement
        }
      })
      
      // Update previous keys for next render
      previousKeys = currentKeys
      
    } catch (err) {
      console.error('Error in For directive:', err,el, name)
    }
  }

  createEffect(() => {
    evaluate()
  })
}


export const show=(el,exp,context)=>{
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function(...keys, `return ${exp}`)(...values);
      if(condition){
        el.style.display=''
      }else{
        el.style.display='none'
      }
    }catch(error){
      console.error(error + " from " + el )
    }
  }
  createEffect(()=>{
    evaluate()
  })
}
export const parent=(el,exp,context)=>{
  const parent=el.parentElement
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('el','parent',...keys, `${exp}`)(el,parent,...values);
    }catch(error){
      console.error(error + " from " + el )
    }
  
}
export const element=(el,exp,context)=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        // console.log(keys,exp);
        
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('el',...keys, `${exp}`)(el,...values);
    }catch(error){
      console.error(error + " from " + el )
    }
  
}

export const after=(el,name,value,context)=>{
  try{
    const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('name','value',...keys, ` 
        setTimeout(()=>{
          ${value}
          },${name})
        `)(name,value,...values);
  }catch(error){
    console.error(error + " from " + el + " "+ name)
  }
}
export const every=(el,name,value,context)=>{
  try{
    const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('name','value',...keys, ` 
        setInterval(()=>{
          ${value}
          },${name})
        `)(name,value,...values);
  }catch(error){
    console.error(error + " from " + el + " "+ name)
  }
}
export const afterSpe=(el,value,context,name)=>{
  const split=name.split('-')
  const result = split.slice(1).join('-')
  const names=split[0]
  const contents = names.match(/\[(.*?)\]/)[1]
  const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      setTimeout(()=>{
        // console.log(result,value)
        regenerate(el,{name:result,value:value},context)
      },content)
    }catch(error){
  }
}
evaluate()
}

export const elementIf=(el,value,context,name)=>{
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 const contents = names.match(/\[(.*?)\]/)[1]
 const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('el',...keys, `return ${content}`)(el,...values);
      if(condition){
        if(!result){
      const func= new Function('el',...keys, ` ${value}`)(el,...values); 
        }else{
          // console.log(result,value)
          regenerate(el,{name:result,value:value},context)
        }
      }
    }catch(error){
      console.error(error + " from " + el)
  }
}
createEffect(()=>{
  evaluate()
})
}
export const elementElse=(el,value,context,name)=>{
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 const contents = names.match(/\[(.*?)\]/)[1]
 const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const condition= new Function('el',...keys, `return ${content}`)(el,...values);
      if(!condition){
        if(!result){
      const func= new Function('el',...keys, ` ${value}`)(el,...values); 
        }else{
          regenerate(el,{name:result,value:value},context)
        }
      }
    }catch(error){
      console.error(error + " from " + el)
  }
}
createEffect(()=>{
  evaluate()
})
}
export const parentSpe=(el,value,context,name)=>{
  const parent=el.parentElement
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 const contents = names.match(/\[(.*?)\]/)[1]
 const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const evaluatedCondition = new Function('parent','el',...keys, `return ${content}`)(parent,el,...values);
      const array=evaluatedCondition ? Array.from(evaluatedCondition) : ''

      if(array !== ''){
          if(result){
              Array.from(evaluatedCondition).forEach(child =>{
                  regenerate(child,{name:result,value:value},context) 
              })
          }else{
            Array.from(evaluatedCondition).forEach(child =>{
                const func= new Function('child',...keys, ` ${value}`)(child,...values);
            })
          }
      }else{      
      // console.log(content,value)
        const condition= new Function('parent','el',...keys, `${content}=${value}`)(parent,el,...values);
      }
    }catch(error){
      console.error(error + " from " + el)
  }
}
createEffect(()=>{
  evaluate()
},el)
}
export const elementSpe=(el,value,context,name)=>{
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 const contents = names.match(/\[(.*?)\]/)[1]
 const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
      const resolvePath = (path, obj) => {
          return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
      const values = keys.map((key) => resolvePath(key, context));
      const evaluatedCondition = new Function('el',...keys, `return ${content}`)(el,...values);
      const array=Array.from(evaluatedCondition)
      if(typeof Array.from(array).values().next().value !== 'string'){
          if(result){
              Array.from(evaluatedCondition).forEach(child =>{
                  regenerate(child,{name:result,value:value},context) 
              })
          }else{
            Array.from(evaluatedCondition).forEach(child =>{
                const func= new Function('child',...keys, ` ${value}`)(child,...values);
            })
          }
      }else{
        const condition= new Function('el',...keys, `${content}=${value}`)(el,...values);
      }
    }catch(error){
      console.error(error + " from " + el)
  }
}
createEffect(()=>{
  evaluate()
},el)
}
export const parentslash=(el,value,context,name)=>{
  const parent=el.parentElement
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 
 const evaluate=()=>{
  try{
        regenerate(parent,{name:result,value:value},context)
  }catch(error){
    console.error(error + " from " + el)
}
}
createEffect(()=>{
  evaluate()
},el)
}
export const elementslash=(el,value,context,name)=>{
 const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 
 const evaluate=()=>{
  try{
    regenerate(el,{name:result,value:value},context)
  }catch(error){
    console.error(error + " from " + el)
}
}
createEffect(()=>{
  evaluate()
})
}
export const addClass=(el,value,context,name)=>{
  value.split(' ').forEach(c=>{
    el.classList.add(c)
  })
}
export const removeClass=(el,value,context,name)=>{
  value.split(' ').forEach(c=>{
    el.classList.remove(c)
  })
}

export const watcher=(el,value,context,name)=>{
  const split=name.split('-')
 const result = split.slice(1).join('-')
 const names=split[0]
 const contents = names.match(/\[(.*?)\]/)[1]
 const content=replaceOperators(contents)
  const evaluate=()=>{
    try{
      const keys = Object.keys(context);
          const resolvePath = (path, obj) => {
              return path.split('.').reduce((acc, key) => acc?.[key], obj);
            };
          const values = keys.map((key) => resolvePath(key, context));
          const condition= new Function('el',...keys, `return [${content}]`)(el,...values);
      if(result){
        stateWatch(()=>{
        regenerate(el,{name:result,value:value},context)
        },[condition])
        // context[`${name}StopWatcher`]=stopWatcher
      }else{
        stopWatcher= stateWatch(()=>{
          const func= new Function('el',...keys, `
             ${value}
             `)(el,...values);
        },[condition])
      }
      context[`${name}StopWatcher`]=stopWatcher
    }catch(error){
      console.error(error + " from " + el)
  }
}
  evaluate()
}

// in next version planing axios and fetch request