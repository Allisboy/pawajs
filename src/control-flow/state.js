import { $state } from "../hooks/state.js";
export const state=(el,attr,context)=>{
    const name = attr.name.split('-')[1]
    try {
        const keys = Object.keys(context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        
        const values = keys.map((key) => resolvePath(key, context));
        const val = new Function('$state', ...keys, `
    try{
    return $state(${attr.value})
    }catch(error){
    console.log(error.message,error.stack)
    }
    `)($state, ...values)
        context[name] = null
        context[name] = val
      
        el.removeAttribute(attr.name)
    } catch (error) {
        console.log(error);
        
    }
}