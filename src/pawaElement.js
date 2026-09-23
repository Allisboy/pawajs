import { initializePlugin, pluginMap } from "./dev/plugin.js"
import { event } from "./event/index.js"
import { errorControl } from "./reactive.js"

const styleFrame=(frame)=>{
    return Object.fromEntries(frame.split(';').map(rule=>{
        const separator=rule.indexOf(':')
        if(separator < 1)return []
        return [rule.slice(0,separator).trim(),rule.slice(separator + 1).trim()]
    }).filter(rule=>rule.length > 0))
}

const attachAnimation=(el,nativeAnimate,frames,options)=>{
    if(!Array.isArray(frames) || !frames.every(frame=>typeof frame === 'string')){
        return nativeAnimate?.(frames,options)
    }

    const hasStyles=frames.some(frame=>frame.includes(':'))
    if(hasStyles){
        if(frames.some(frame=>!frame.includes(':'))){
            throw new TypeError('Animation frames must contain only styles or only class names')
        }
        return nativeAnimate?.(frames.map(styleFrame),options)
    }

    const classNames=frames.flatMap(frame=>frame.trim().split(/\s+/)).filter(Boolean)
    el.classList.add(...classNames)
    return el
}

const timeInMilliseconds=(value)=>{
    const time=value.trim()
    if(time.endsWith('ms'))return Number.parseFloat(time)
    if(time.endsWith('s'))return Number.parseFloat(time)*1000
    return 0
}

const classAnimationDuration=(el)=>{
    const style=getComputedStyle(el)
    const durations=[style.animationDuration,style.transitionDuration]
    const delays=[style.animationDelay,style.transitionDelay]
    return Math.max(...durations.flatMap((value,index)=>value.split(',').map((duration,position)=>
        timeInMilliseconds(duration)+timeInMilliseconds(delays[index].split(',')[position] ?? '0ms')
    )))
}

const waitForClassAnimation=(el,options)=>{
    const duration=typeof options?.duration === 'number'
        ? options.duration
        : classAnimationDuration(el)

    return new Promise(resolve=>{
        if(duration <= 0){
            requestAnimationFrame(resolve)
            return
        }
        setTimeout(resolve,duration)
    })
}

const classTokens=(frame)=>frame.trim().split(/\s+/).filter(Boolean)

const classFrameAnimation=(el,frames,options)=>{
    const frameTokens=frames.map(classTokens)
    const allTokens=[...new Set(frameTokens.flat())]
    el.classList.remove(...allTokens)
    el.classList.add(...frameTokens[0])

    return new Promise(resolve=>{
        if(frameTokens.length < 2){
            waitForClassAnimation(el,options).then(resolve)
            return
        }

        requestAnimationFrame(()=>{
            el.classList.remove(...allTokens)
            el.classList.add(...frameTokens[1])
            waitForClassAnimation(el,options).then(resolve)
        })
    })
}

const promiseAnimation=(el,nativeAnimate,frames,options)=>{
    const result=attachAnimation(el,nativeAnimate,frames,options)
    if(result?.finished)return result.finished.then(()=>undefined)
    if(Array.isArray(frames) && frames.every(frame=>typeof frame === 'string')){
        return classFrameAnimation(el,frames,options)
    }
    return Promise.resolve()
}

/**
 * @param {HTMLElement} el
 * @param {{}} context
 */
export const PawaElement=(el,context)=>{
    const nativeAnimate=typeof el.animate === 'function' ? el.animate.bind(el) : null
    const attach={
        on:event,
        animation:(frames,options)=>promiseAnimation(el,nativeAnimate,frames,options),
        attr:()=>{
            const attribute=Array.from(el.attributes)
            return attribute
        }
    }
        
    Object.assign(el, attach)
}
const propertyAliases={
    innerHtml:'innerHTML',
    text:'textContent'
}

const toPropertyValue=(current,value)=>{
    if(typeof current === 'boolean'){
        if(value === '' || value === true)return true
        if(value === false || value === null || value === undefined)return false
        return !['false','0','no','off'].includes(String(value).toLowerCase())
    }
    if(typeof current === 'number' && value !== ''){
        const number=Number(value)
        return Number.isNaN(number) ? value : number
    }
    return value
}

const setToProperties=(el,name,value)=>{
    const properties=name.split('.')
    const last=properties.pop()
    const target=properties.reduce((current,property)=>current?.[property],el)
    if(target === null || target === undefined || typeof target === 'function')return false
    target[last]=toPropertyValue(target[last],value)
    return true
}

export const ElementProperty=(el,name,value,graph,context)=>{
    try {
        const propertyName=propertyAliases[name] ?? name

        if(propertyName.includes('.')){
            return setToProperties(el,propertyName,value)
        }else if(pluginMap.has(name)){
            initializePlugin(name,el,graph,{name,value},context)
            return true
        }
        if(!(propertyName in el))return false

        el[propertyName]=toPropertyValue(el[propertyName],value)
        return true
    } catch (error) {
        errorControl(error, {
            effect: 'property-setter',
            el,
            exp: `${name}=${String(value)}`,
            template: el?.outerHTML,
        })
        return false
    }
}