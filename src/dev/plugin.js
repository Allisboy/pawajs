import { createEffect } from "../reactive"

export const pluginMap=new Map()
/**
 * * Used with '@'[pluginName]
 * @param {string} name
 * @param {(el:HTMLElement,attr:{value:string,name:string},graph:{},context={})=>Function | undefined} callback
 */
export const Plugin=(name,callback)=>{
    if (pluginMap.has(name)) {
        
    }
    pluginMap.set(name, callback)
}

export const initializePlugin=(name,el,graph,attr,context)=>{
    if (pluginMap.has(name)) {
        const plugin=pluginMap.get(name)
        const evaluate=plugin(el,attr,graph,context)
        if (typeof evaluate === 'function') {
            createEffect(()=>evaluate(),graph)
        }
    }
}