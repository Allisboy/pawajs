import { primaryAttribute } from "../store.js";
import { safeEval, splitAndAdd } from "../utils.js";

/**
 * @param {HTMLElement} el
 */
export const initaiteComponent = (el,context) => {
    
    
  try {
    const {slot,stringProp}=getPropsAndSlot(el)
    const {restProps,prop,aschild,passerProps}=getPropFromAttributes(el,context)
    return {
        slot,
        stringProp,
        restProps,
        prop,
        aschild,
        passerProps
    }
  } catch (error) {
    console.log(error);
    
    throw {
      ...error,
      effect: "setting props",
      ref: el,
    };
  }
};

/**
 * @param {HTMLElement} el
 */
const getPropsAndSlot = (el) => {
  const stringProp = {};
  const slot = { default: [] };
  Array.from(el.childNodes).forEach((s) => {
    if (s.tagName === "TEMPLATE" && s.hasAttribute("prop")) {
      const prop = s.getAttribute("prop");
      stringProp[prop] = slot.innerHTML;
    } else if (s.tagName === "TEMPLATE" && s.hasAttribute("slot")) {
      const prop = s.getAttribute("slot");
      slot[prop] = s.content.children;
    } else {
      slot.default.push(s)
    }
  });
  return { stringProp, slot };
};
/**
 * @param {HTMLElement} el
 */
const getPropFromAttributes = (el,context) => {
  const attributes = Array.from(el.attributes);
  const prop = {};
  const restProps = {};
  const passerProps={}// props that shouldn't go into the props e.g on-click event props
  let aschild=false
  for (const attr of attributes) {
    if (splitAndAdd(attr.name).toLowerCase() === 'aschild') {
        aschild=true
        continue
    }
      if (!primaryAttribute.has(attr.name)) {
      if (
        attr.name.startsWith("-") ||
        attr.name.startsWith("@") ||
        attr.name.startsWith("on-")
      ) {

        restProps[attr.name] = attr.value;
        passerProps[attr.name]=attr.value
      } else if (!attr.name.startsWith(':')) {
        restProps[attr.name]=attr.value
        let contexts={...context}
     
        const toProp = () => {
          let value = attr.value;
          if (attr.value.includes("@{")) {
              const regex = /@{([^}]*)}/g;
              value = value.replace(regex, (match, expression) => {
                try {
                 
                  const result = safeEval(expression,{...contexts}, true);
                  return result
                } catch (error) {
                    console.log(`[${attr.name}]:[${attr.value}] at Prop`,error,el);
              throw {
                  msg:error.message,
                  effect:el.TagName,
                  ref:el,
                  exp:`[${attr.name}]:[${attr.value}] at Prop`
              }
                }
              });
              
              return value
            
          }else{
            return value
          }
        };
        let name=attr.name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        if (!prop[name]) {
          if(name === 'class')prop['className']=toProp
          if(name === 'default')prop['defaultValue']=toProp
          if (name !== 'class' && name !== 'default' ) {
              
              prop[name]=toProp
            }
        }
      }else if(attr.name.startsWith(':')){
        const propsName=attr.name.slice(1) 
        
        restProps[attr.name]=attr.value
        if(attr.value === '') attr.value="true";
        try {
            const value=safeEval(`()=>{
                const prop=${attr.value}
                return prop
            }
                `,context,true)
                if (value) {
          let name=propsName
                if(name.includes('-')){
                     name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                }
          prop[name]=value
          
        }
        } catch (error) {
            console.log(`[${attr.name}]:[${attr.value}] at Prop`,error,el);
            throw {
                msg:error.message,
                effect:el.TagName,
                ref:el,
                exp:`[${attr.name}]:[${attr.value}] at Prop`
            }
        }
      }
    }
  }
  return {prop,restProps,aschild:aschild,passerProps}
};

export const ComponentProps=(somes,message,name,key)=>{
let some
  if (typeof somes === 'function') {
    some=somes()
  }else{
    some=somes
  }
  
    return({
    Array:()=>{

        if (Array.isArray(some)) {
            return true
        }else{
            throw new Error(message ?message + ' / Not type of an Array ': `${key} must be an array at ${name} component`);

        }
    },
    String:()=>{
        if (typeof some === 'string') {
            return true
        }else{
            throw new Error(message? message + ' / Not type of a String' :`${key} must be a string at ${name} component`);

        }
    },
    Number:()=>{
        if (typeof some === 'number') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Number ': `${key} must be a number at ${name} component`);

        }
    },
    Object:()=>{
        if (typeof some === 'object') {
            return true
        }else{
            throw new Error(message? message+' / Not type of an Object ' :`${key} must be an object at ${name} component`);

        }
    },
    Function:()=>{
        if (typeof some === 'function') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Function ': `${key} must be a function at ${name} component`);
        }
    },
    Boolean:()=>{
        if (typeof some === 'boolean') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Boolean ' :`${key} must be a Boolean at ${name} component`);

        }
    },
})
}
export const sanitizeTemplate = (temp) => {
  if (typeof temp !== 'string') return '';
  return temp.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '');
};

export const propsValidator=(obj={},propsAttri,name,template,prop)=>{
  let done=true
  for (const[key,value] of Object.entries(obj)) {
    const propsValue=propsAttri[key]
    if(typeof value === 'object'){
      if(propsAttri[key] || propsAttri[key] === 0){
        const checker=ComponentProps(propsAttri[key],value?.err,name,key)
        if (value.type) {
          if (Array.isArray(value.type)) {
            let isValid = false
            for (const type of value.type) {
                try {
                  if (isValid) {
                    break
                  }
                  checker[type.name]()
                  isValid = true
                } catch (error) {
                }
              }
            if (!isValid) {
              const types = value.type.map(t => t.name).join(' or ')
              throw new Error(value?.err ? value.err : `${key} must be type of ${types} at ${name} component`);
            }
          } else {
            try {
              checker[value.type.name]()
            } catch (error) {
              throw new Error(value?.err ? value.err : `${key} must be type of ${value.type.name} at ${name} component`);
            }
          }
        }
      }else{
        if (value.strict) {
          const msg=value.err?`${value.err}. the props is needed `: `props "${key}" is undefined at ${name}`
          console.error(`${name.toUpperCase()} component props "${key}" is needed. ${msg}`)
          
          done=false
          throw new Error(`${msg} error at ${template}`);
        }else{
          if (value?.default !== undefined ) {
            propsAttri[key]=()=>value?.default
            prop[key]=()=>value?.default
          }
        }

      }
    }
  }
  return done
}
  export const isSvgFragment = (str) => /^\s*<(path|circle|rect|line|polyline|polygon|ellipse|g|defs|symbol|use|image|text|animate|mask|pattern|clipPath|linearGradient|radialGradient|filter)/i.test(str);
/**
 * @param {HTMLElement} el
 * @param {HTMLElement} div
 * @param {boolean} aschild
 * @param {Document} doc
 */

export const renderAschild=(div,aschild,child)=>{
    const fromDiv=div.firstElementChild
    fromDiv.remove()
 let  divs =child.filter(c=>c.nodeType === 1 )[0]
 
    const createChild=divs
    let main=aschild?createChild:fromDiv.tagName === 'SLOT'?createChild:fromDiv
    
    if( aschild || fromDiv.tagName === 'SLOT' && main.nodeType === 1){
        Array.from(fromDiv.attributes).forEach(attr => {
         
          const attrName = attr.name.replace(/^-+/, '').trim()
          
          if (!main.hasAttribute(attr.name)) {
            main.setAttribute(attr.name, attr.value)
            return
          }
          if (attrName === 'class') {
            const existing = main.getAttribute(attr.name)
            main.setAttribute(attr.name, `${attr.value} ${existing}`.trim())
            
          } else if (attrName === 'style') {
            const existing = main.getAttribute(attr.name)
            main.setAttribute(attr.name, `${attr.value};${existing}`.replace(/;+/g, ';'))
          } else {
            let name = attr.name
            while (main.hasAttribute(name)) name = `-${name}`
            main.setAttribute(name, attr.value)
          }
        })
        
    }
    
    return {element:main,asChild: aschild || fromDiv.tagName === 'SLOT'}
}
/**
 * @param {HTMLElement} el
 * @param {{[key]:Array<HTMLElement>,default:Array<HTMLElement>}} slot
 */
export const setSlot=(el,slot)=>{
    //find slot by key
    for (const [key,value] of Object.entries(slot)) {
        if(key){
        const seen=el.querySelector(`slot[name="${key}"]`) 
        if (seen) {
            for (const child of Array.from(value)) {
                const parent=seen.parentElement
                parent.insertBefore(child,seen)
            }
            if (value.length === 0 && seen.children.length > 0) {
                for (const child of Array.from(seen.children)) {
                    const parent=seen.parentElement
                    parent.insertBefore(child,seen)
                }
            }
            seen.remove()
        }
        }
    }

    const getAllslot=el.querySelectorAll('slot')
    
    for (const element of Array.from(getAllslot)) {
        if (element.attributes.length > 0 && element.getAttribute('name') !== 'default') {
            for (const child of Array.from(element.children)) {
                    const parent=element.parentElement
                    parent.insertBefore(child,element)
                }
                element.remove()
        }
    }
    
    if (slot.default) {
        const seen=el.querySelector(`slot[name="default"]`) || el.querySelector('slot')   
        if (seen) {
            for (const child of Array.from(slot.default)) {
               const parent=seen.parentElement
                parent.insertBefore(child,seen)
            }
            if (slot.default.length === 0 && seen.children.length > 0) {
                for (const child of Array.from(seen.children)) {
                   const parent=seen.parentElement
                    parent.insertBefore(child,seen)
                }
            }
            seen.remove()
        }
        }
}