
export const splitAndAdd = str => str.split('-').join('').toUpperCase();

export const findEndComment=(comment)=>{
  
}
export const pawaWayRemover=async (comment,endComment)=>{
  if (!comment?.nextSibling) {
    return
  }
  if (comment.nextSibling === endComment) {
    
    return  
  } else {
    if (comment?.nextSibling?.nodeType === 8) {
      // console.log(comment)
      if(comment.nextSibling?._controlComponent){
        comment.nextSibling._remove()
      }else{
        comment.nextSibling.remove() 
      }
         
    } else if (comment.nextSibling.nodeType === 1) {
      await comment.nextSibling._remove()   
    }
  }
return await pawaWayRemover(comment,endComment)
}
export const processNode = (node, itemContext) => {
  
  if (typeof itemContext === 'number') {
    return
  }
  
  if (node.nodeType === 3) { // Text node
    const text = node.textContent
    const newText = text.replace(/{{(.+?)}}/g, (match, exp) => {
      try {
        const keys = Object.keys(itemContext)
        
        const values = keys.map(key => itemContext[key])
        
        return new Function(...keys, `return ${exp}`)(...values)
      } catch {
        return match
      }
    })
    //console.log(newText)
    node.textContent = newText
  } else if (node.attributes) {
    Array.from(node.attributes).forEach(attr => {
      const newValue = attr.value.replace(/{{(.+?)}}/g, (match, exp) => {
        try {
          const keys = Object.keys(itemContext)
          const values = keys.map(key => itemContext[key])
          return new Function(...keys, `return ${exp}`)(...values)
        } catch {
          return match
        }
      })
      attr.value = newValue
    })
  }
  Array.from(node.childNodes).forEach((n) => {
    processNode(n, itemContext)
  })
}

export const extractContextValues = (context) => {
  const keys = Object.keys(context);
  const values = keys.map((key) => key.split('.').reduce((acc, k) => acc?.[k], context));
  return { keys, values };
};

export const evaluation=(context,exp) => {
    try {
      const keys = Object.keys(context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, context));
return new Function(...keys,`return ${exp}`)(...values)
    } catch (e) {
      throw e
    }
}

export const setPawaDevError=({message,error,template})=>{
  console.error(message,error.message,error.stack)
   __pawaDev.setError({msg:message ,stack:error.stack,el:template})
}

export const propsValidator=(obj={},propsAttri,name,template,el)=>{
  let done=true
  for (const[key,value] of Object.entries(obj)) {
    const propsValue=propsAttri[key]
    if(typeof value === 'object'){
      if(propsAttri[key] || propsAttri[key] === 0){
        // console.log(propsAttri[key])
        const checker=ComponentProps(propsAttri[key],value?.err,name,key)
        if (value.type) {
          if (Array.isArray(value.type)) {
            let isValid = false
            for (const type of value.type) {
              try {
                checker[type.name]()
                isValid = true
                break
              } catch (error) {}
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
          console.warn(`${name.toUpperCase()} component props "${key}" is needed. ${msg}`)
          setPawaDevError({
            message:`${name.toUpperCase()} component props "${key}" is needed. ${msg}`,
            error:{
              message:`This props "${key}" is needed`,
              stack:`at PawaComponent.${name}`
            },
            template:template
          })
          done=false
          throw new Error(`${msg} error at ${template}`);
        }else{
          if (value?.default !== undefined ) {
            propsAttri[key]=()=>value?.default
            el._props[key]=()=>value?.default
          }
        }

      }
    }
  }
  return done
}
export const safeEval=(context,expression,el,resolve=false)=>{
  try{
    const keys = Object.keys(context);
  const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  if(resolve){
    return new Function(...keys,`
      try{
      return ${expression}
      }catch(error){
      console.error(error.message,error.stack)
      __pawaDev.setError({msg:error.message,stack:error.stack})
      }
      `)(...getEvalValues(context))
  }else{
    return new Function(...keys,`
      try{
      return ${expression}
      }catch(error){
      console.error(error.message,error.stack)
      __pawaDev.setError({msg:error.message,stack:error.stack})
      }
      `)
  }
  
  }catch(error){
    setPawaDevError({
          message:`Error : ${error.message} ${error.stack}`,
          error:error,
          template:el._template
        })
  }
}
/**
 * 
 * @param {object} context 
 * @returns {Array}
 */
export const getEvalValues=(context)=>{
  const keys = Object.keys(context);
  const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  const values = keys.map((key) => resolvePath(key, context))
  return values
}
export const sanitizeTemplate = (temp) => {
  if (typeof temp !== 'string') return '';
  return temp.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '');
};

export const ComponentProps=(somes,message,name,key)=>{
let some=somes?.() || somes
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

export const getComment=(node,setComment,value,fors='notKey')=>{
        if(node.previousSibling.nodeType === 8 && node.previousSibling?.data){
                const c=node.previousSibling.data.split('@-$@-$@')
                if (c[1] === value && c[0] !== 'forKey') {
                  setComment(node.previousSibling)
                }else{
                    getComment(node.previousSibling,setComment,value)
                }
    
            }else{
                getComment(node.previousSibling,setComment,value)
            }
        }
     export   const getEndComment=(comment,setEndComment,value,children)=>{
            const isComment=comment.nextSibling
          if (comment.nextSibling.nodeType === 8 ) {
            const data=isComment.data.split('@-$@-$@')
            const check=data[0]
            if(data[1] === value){
              if(check === 'forKey' || check === 'endForKey'){
                getEndComment(isComment,setEndComment,value,children)
                 return
              }
              setEndComment(isComment)
            }else{
              getEndComment(isComment,setEndComment,value,children)
            }
          }else if (isComment.nodeType === 1) {
            children.push(isComment)
            getEndComment(isComment,setEndComment,value,children)
          }
          else{
            getEndComment(isComment,setEndComment,value,children)
          }
        }
export const replaceOperators = (expression) => {
  return expression
    .replace(/#/g, '=')
    .replace(/\^/g, '>')
    .replace(/!\^/g, '<')
    .replace(/@/g, ' ')
    .replace(/::(.)(?=.)/g, (_, char) => char.toUpperCase())
    .replace(/%/g, '"');
};

export const replaceTemplateOperators = (expression) => {
  return expression
    .replace(/\/\*/g, '`')
    .replace(/\*\//g, '`'); // Also replace closing */ with backtick if needed
    // .replace(/&gt;/g,'>')
};

export function stringToUniqueNumber(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * @param {string[]} array 
 * @param {string} str The string to match
 * @returns {boolean}
 */
export function checkKeywordsExistence(array,str){
  if(!Array.isArray(array) || array.length === 0) return
  const pattern = array.join('|')
  const regex=new RegExp(`(?<!\\w)(${pattern})(?!\\w)`,'i')
  return regex.test(str)
}