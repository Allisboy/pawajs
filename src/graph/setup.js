import { components } from "../global.js"
import { primaryAttribute } from "../store.js"
import { splitAndAdd } from "../utils.js"

export const createManifest=(el)=>{
    const attr=Array.from(el.attributes).map(attri=>{
        if (attri?.name.startsWith('state-')) {
            return attri?.name
        }else if(primaryAttribute.has(attri.name)){
            return attri?.name
        }else if(attri.name.startsWith('@') || attri.value.includes('@{')){
            return attri?.name
        }
        return ''
    })
    return attr
}
export const generateManifest=(el)=>{
     Array.from(el.getAttribute('manifest')?.split(',') || [])
    
}
export const setManifest=(el,manifest,server=false)=>{
    if (server) {
        el.setAttribute('manifest',manifest.join(','))
    }else{
        el.manifest=mainifest
    }
}