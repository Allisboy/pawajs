export const splitAndAdd=(string) => {
   const strings=string.split('-')
  let newString=''
  strings.forEach(str=>{
    newString+=str
  })
  return newString.toUpperCase()
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
 pawaWayRemover(comment,endComment)
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


export const propsValidator=(obj={},propsAttri,name)=>{
  let newObj={}
  
  const jsTypes=['Array','String','Number']
  for (const[key,value] of Object.entries(obj)) {
    const propsValue=propsAttri[key]
    if(typeof value === 'object'){
      if(propsAttri[key] || propsAttri[key] === 0){
        const checker=ComponentProps(propsAttri[key],value?.err,name)
        if (value.type) {
        checker[value.type.name]()
        }
      }else{
        if (value.strict) {
          console.warn(`undefined props ${key} at ${name} component props is needed`)
          throw new Error(value.err+ ' the props is needed' || `props undefined ${name}`);
        }else{
          if (value.default || value.default === 0) {
            propsAttri[key]=value.default
          }
        }

      }
    }
  }
  return {...propsAttri}
}
export const sanitizeTemplate = (temp) => {
  if (typeof temp !== 'string') return '';
  return temp.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, '');
};

export const ComponentProps=(some,message,name)=>{

    return({
    Array:()=>{

        if (Array.isArray(some)) {
            return true
        }else{
            throw new Error(message ?message + ' / Not type of an Array ': `${some} must be an array at ${name} component`);

        }
    },
    String:()=>{
        if (typeof some === 'string') {
            return true
        }else{
            throw new Error(message? message + ' / Not type of a String' :`${some} must be a string at ${name} component`);

        }
    },
    Number:()=>{
        if (typeof some === 'number') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Number ': `${some} must be a number at ${name} component`);

        }
    },
    Object:()=>{
        if (typeof some === 'object') {
            return true
        }else{
            throw new Error(message? message+' / Not type of an Object ' :`${some} must be an object at ${name} component`);

        }
    },
    Function:()=>{
        if (typeof some === 'function') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Function ': `${some} must be a function at ${name} component`);
        }
    },
    Boolean:()=>{
        if (typeof some === 'boolean') {
            return true
        }else{
            throw new Error(message? message+' / Not type of a Boolean ' :`${some} must be a Boolean at ${name} component`);

        }
    },
})

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
