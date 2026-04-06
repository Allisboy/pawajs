import { createEffect } from './reactive.js';
import { render, $state, keepContext,restoreContext} from './index.js';
import { PawaComment, PawaElement } from './pawaElement.js';
import { processNode, pawaWayRemover,getComment,getEndComment, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence, evaluation } from './utils.js';
import {normal_Switch} from './normal/Switch.js'
import {normal_If} from './normal/If.js'
import {normal_For} from './normal/For.js'
import {resumer} from './resumer.js'
import { normal_key } from './normal/Key.js';

// Shared helper to check common event modifiers
const checkCommonModifiers = (e, modifiers) => {
    // Mouse buttons
    if (modifiers.has('left') && 'button' in e && e.button !== 0) return false;
    if (modifiers.has('middle') && 'button' in e && e.button !== 1) return false;
    if (modifiers.has('right') && 'button' in e && e.button !== 2) return false;
    // System keys
    if (modifiers.has('ctrl') && !e.ctrlKey) return false;
    if (modifiers.has('alt') && !e.altKey) return false;
    if (modifiers.has('shift') && !e.shiftKey) return false;
    if (modifiers.has('meta') && !e.metaKey) return false;
    // Exact modifier
    if (modifiers.has('exact')) {
        if (e.ctrlKey && !modifiers.has('ctrl')) return false;
        if (e.altKey && !modifiers.has('alt')) return false;
        if (e.shiftKey && !modifiers.has('shift')) return false;
        if (e.metaKey && !modifiers.has('meta')) return false;
    }
    // Wheel direction
    if (modifiers.has('wheel-up') && e.deltaY >= 0) return false;
    if (modifiers.has('wheel-down') && e.deltaY <= 0) return false;
    if (modifiers.has('wheel-left') && e.deltaX >= 0) return false;
    if (modifiers.has('wheel-right') && e.deltaX <= 0) return false;
    return true;
};

// Shared helper to check key modifiers
const checkKeyModifiers = (e, modifiers, eventType) => {
    if (!eventType.startsWith('key')) return true;
    
    // Separate system modifiers from actual key modifiers
    const systemMods = ['ctrl', 'alt', 'shift', 'meta'];
    const keyAliases = {
        'enter': 'Enter', 'tab': 'Tab', 'delete': ['Backspace', 'Delete'], 
        'esc': 'Escape', 'space': ' ', 'up': 'ArrowUp', 'down': 'ArrowDown',
        'left': 'ArrowLeft', 'right': 'ArrowRight', 'home': 'Home', 
        'end': 'End', 'pageup': 'PageUp', 'pagedown': 'PageDown'
    };
    
    // Extract key-specific modifiers (the actual key to press)
    let targetKey = null;
    let keyModifiers = [];
    
    for (const mod of modifiers) {
        if (keyAliases[mod]) {
            targetKey = mod;
        } else if (!systemMods.includes(mod) && mod !== 'exact') {
            // For single letters like 's', 'a', etc.
            targetKey = mod;
        } else if (systemMods.includes(mod)) {
            keyModifiers.push(mod);
        }
    }
    
    // Check system modifiers (Ctrl, Alt, etc.)
    if (modifiers.has('ctrl') && !e.ctrlKey) return false;
    if (modifiers.has('alt') && !e.altKey) return false;
    if (modifiers.has('shift') && !e.shiftKey) return false;
    if (modifiers.has('meta') && !e.metaKey) return false;
    
    // Check exact modifier combination
    if (modifiers.has('exact')) {
        if (e.ctrlKey && !modifiers.has('ctrl')) return false;
        if (e.altKey && !modifiers.has('alt')) return false;
        if (e.shiftKey && !modifiers.has('shift')) return false;
        if (e.metaKey && !modifiers.has('meta')) return false;
    }
    
    // If there's a target key to check
    if (targetKey) {
        const expectedKey = keyAliases[targetKey] || 
                           (targetKey.length === 1 ? targetKey : null);
        
        if (expectedKey) {
            if (Array.isArray(expectedKey)) {
                return expectedKey.includes(e.key);
            }
            return e.key === expectedKey;
        }
        // For single letters like 's'
        if (targetKey.length === 1) {
            return e.key.toLowerCase() === targetKey.toLowerCase() || 
                   e.code === `Key${targetKey.toUpperCase()}`;
        }
    }
    
    // If no specific key modifier, return true (system modifiers already checked)
    return true;
};

// Shared helper to execute event with debounce/throttle/error handling
const processEventExecution = (el, attrName, modifiers, callback, eventType, directiveName,context) => {
    const execute = () => {
        try { callback(); } 
        catch (error) { setPawaDevError({ message: `Error from ${directiveName}-${eventType} directive ${error.message}`, error, template: el._template }); }
    };
    if (!el._eventTimers) el._eventTimers = {};
    const delay = parseInt([...modifiers].find(m => /^\d+$/.test(m)) || '300');
    if (modifiers.has('debounce')) {
        const timerKey = `${attrName}_debounce`;
        clearTimeout(el._eventTimers[timerKey]);
        el._eventTimers[timerKey] = setTimeout(execute, delay);
        return;
    }
    if (modifiers.has('throttle')) {
        const timerKey = `${attrName}_throttle_last`;
        const now = Date.now();
        if (!el._eventTimers[timerKey] || now - el._eventTimers[timerKey] >= delay) {
            el._eventTimers[timerKey] = now;
            execute();
        }
        return;
    }
    execute();
};

export const If = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true 
    if(!resume){
        const parent = el.parentElement
                const nextSiblings = el.nextElementSibling || null
               const chained=[{
                                    exp:el.getAttribute('if'),
                                    condition:'if',
                                    element:el
                                }]
               const chainMap=new Map()
               chainMap.set(el.getAttribute('if'),{condition:'if',element:el})
                const getChained=(nextSibling)=>{
                    if (nextSibling !== null) {
                        if (nextSibling && nextSibling.getAttribute('else') === '' || nextSibling.getAttribute('else-if')) {
                            // console.log(true,'it has',nextSibling.getAttribute('else'))
                            if (nextSibling.getAttribute('else-if')) {
                                chained.push({
                                    exp:nextSibling.getAttribute('else-if'),
                                    condition:'else-if',
                                    element:nextSibling
                                })
                                chainMap.set(nextSibling.getAttribute('else-if'),{condition:'else-if',element:nextSibling})
                                getChained(nextSibling.nextElementSibling)
                                nextSibling.remove()
                            }else if (nextSibling.getAttribute('else') === '') {
                                chained.push({
                                    exp:'false',
                                    condition:'else',
                                    element:nextSibling
                                })
                                chainMap.set('else',{condition:'else',element:nextSibling})
                                nextSibling.remove()
                            }
                        }
                    }
                }
                getChained(nextSiblings)
                const endComment=document.createComment('end-if')
                el.replaceWith(endComment)
            normal_If(el,attr,stateContext,endComment,chainMap,chained)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(5)
            const children=[]
            try {
                const setComment=(c)=>comment=c
                const setEndComment=(c)=>endComment=c
                getComment(el,setComment,id)
                getEndComment(comment,setEndComment,id,children)
                const numberIfChildren=notRender.index + children.length - 2
          notRender.notRender=numberIfChildren
                resumer.resume_if?.(el,attr,stateContext,{comment,endComment,id,children})
                
            } catch (error) {
                console.log(error,el ,attr,id);
                                
            }

    }
}
export const Switch = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if(!resume){
        el.removeAttribute('switch')
        const parent = el.parentElement
                const nextSiblings = el.nextElementSibling || null
               const chained=[{
                                    exp:el.getAttribute('case'),
                                    condition:'case',
                                    element:el
                                }] 
               const chainMap=new Map()
               chainMap.set(el.getAttribute('case'),{condition:'case',element:el})
                const getChained=(nextSibling)=>{
                    if (nextSibling !== null) {
                        if (nextSibling && nextSibling.getAttribute('case') || nextSibling.getAttribute('default') === '') {
                            // console.log(true,'it has',nextSibling.getAttribute('else'))
                            if (nextSibling.getAttribute('case')) {
                                chained.push({
                                    exp:nextSibling.getAttribute('case'),
                                    condition:'case',
                                    element:nextSibling
                                })
                                chainMap.set(nextSibling.getAttribute('case'),{condition:'case',element:nextSibling})
                                getChained(nextSibling.nextElementSibling)
                                nextSibling.remove()
                            }else if (nextSibling.getAttribute('default') === '') {
                                chained.push({
                                    exp:'false',
                                    condition:'default',
                                    element:nextSibling
                                })
                                chainMap.set('default',{condition:'default',element:nextSibling})
                                nextSibling.remove()
                            }
                        }
                    }
                }
                getChained(nextSiblings)
                const endComment=document.createComment('end-switch')
                el.replaceWith(endComment)
            normal_Switch(el,attr,stateContext,endComment,chainMap,chained)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(5)
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id)
            getEndComment(comment,setEndComment,id,children)
            const numberIfChildren=notRender.index + children.length - 2
      notRender.notRender=numberIfChildren
            resumer.resume_switch?.(el,attr,stateContext,{comment,endComment,id,children})

    }
}

export const event = (el, attr, stateContext) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext, attr.value)) {
        return
    }
    const context = el._context
    
    const directive = attr.name.substring(3); // 'on-click.prevent' → 'click.prevent'
    const parts = directive.split('.');
    const eventType = parts[0];
    const modifiers = new Set(parts.slice(1));

    el.removeAttribute(attr.name)

    const executeEvent = (e) => {
        try {
            const eventContext = { ...context, e };
            evaluation(eventContext, attr.value);
        } catch (error) {
            __pawaDev.setError({ el: el, msg: error.message, stack: error.stack, directives: 'on-event' });
        }
    };
    
    const handler = (e) => {
        if (!checkCommonModifiers(e, modifiers)) return;
        if (!checkKeyModifiers(e, modifiers, eventType)) return;
        
        // ========== TARGET MODIFIERS ==========
        if (modifiers.has('self') && e.target !== el) return;
        if (modifiers.has('not-self') && e.target === el) return;
        
        // ========== FORM MODIFIERS ==========
        if (modifiers.has('dirty') && !e.target.value) return;
        if (modifiers.has('pristine') && e.target.value) return;
        if (modifiers.has('valid') && !e.target.checkValidity()) return;
        if (modifiers.has('invalid') && e.target.checkValidity()) return;
        
        // ========== ACTION MODIFIERS ==========
        if (modifiers.has('prevent')) e.preventDefault();
        if (modifiers.has('stop')) e.stopPropagation();
        
        // ========== EXECUTION ==========
        processEventExecution(el, attr.name, modifiers, () => executeEvent(e), eventType, 'on');
    };

    const options = {
        capture: modifiers.has('capture'),
        once: modifiers.has('once'),
        passive: modifiers.has('passive')
    };
    
    const target = modifiers.has('window') ? window : el;
    target.addEventListener(eventType, handler, options);
    
    el._MountFunctions.push(() => target.addEventListener(eventType, handler, options));
    el._setUnMount(() => {
        target.removeEventListener(eventType, handler, options);
    });
}

const createBoundCallback = (el, code,context) => {
    const keys = Object.keys(context);
    const resolvePath = (path, obj) => path.split('.').reduce((acc, key) => acc?.[key], obj);
    const values = keys.map((key) => resolvePath(key, context));
    const func = new Function(...keys, code);
    return () => func(...values);
};

export const mountElement = (el, attr) => {
    if (el._running) return;
    try {
        const func = createBoundCallback(el, attr.value,el._context);
        el._MountFunctions.push(func);
        el.removeAttribute(attr.name);
    } catch (error) {
        setPawaDevError({
            message: `Error from Mount directive ${error.message}`,
            error: error,
            template: el._template
        });
    }
};

export const unMountElement = (el, attr) => {
    if (el._running) return;
    try {
        const func = createBoundCallback(el, attr.value,el._context);
        el._unMountFunctions.push(func);
        el.removeAttribute(attr.name);
    } catch (error) {
        setPawaDevError({
            message: `Error from UnMount directive ${error.message}`,
            error: error,
            template: el._template
        });
    }
};

export const For = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if (!resume) {
        const endComment = document.createComment(`end for`)
        el.replaceWith(endComment)
        normal_For(el,attr,stateContext,endComment)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataElement
            let id=attr.value
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id,'forKey')
            getEndComment(comment,setEndComment,id,children,'isFor')
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            dataElement=document.querySelector(`[p\\:store-for="${id}"]`);
            el.removeAttribute(attr.name)
            dataElement.remove()
            resumer.resume_for?.(el,attr,stateContext,{comment,endComment,id,children,dataElement})
    }
    
}


export const ref = (el, attr) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };

        const values = keys.map((key) => resolvePath(key, el._context))
        const returned=new Function('el', ...keys, `
    try{
        if (typeof ${attr.value} === 'function') {
            const cleanUp=${attr.value}(el)
            if(typeof cleanUp === 'function'){
            el._setUnMount(cleanUp)
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
    console.error(e.message,e.error)
    __pawaDev.setError({el:el,msg:e.message,stack:e.stack,directives:'ref'})
    }
    `)(el, ...values)  
        el.removeAttribute(attr.name)
        if (returned?.value) {
            const name=attr.name.replace(/^["']|["']$/g, '')
            el._context[name]=returned
        }
    } catch (error) {
        setPawaDevError({
            message: `Error from Ref directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}


export const States = (el, attr) => {

    if (el._running) {
        return
    }

    const name = attr.name.split('-')[1]
    try {
        const keys = Object.keys(el._context);
        const resolvePath = (path, obj) => {
            return path.split('.').reduce((acc, key) => acc?.[key], obj);
        };
        const values = keys.map((key) => resolvePath(key, el._context));
        const val = new Function('$state', ...keys, `
    try{
    return $state(${attr.value})
    }catch(error){
    console.log(error.message,error.stack)
    }
    `)($state, ...values)
        el._context[name] = null
        el._context[name] = val
      el._checkStatic()
        el.removeAttribute(attr.name)
    } catch (error) {
        setPawaDevError({
            message: `Error from State directive ${error.message}`,
            error: error,
            template: el._template
        })
    }
}


export const documentEvent = (el, attr) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext, attr.value)) {
        return
    }
    
    const directive = attr.name.substring(4); // 'out-click.prevent' → 'click.prevent'
    const parts = directive.split('.');
    const eventType = parts[0];
    const modifiers = new Set(parts.slice(1));

    if (!eventType) return;

    el.removeAttribute(attr.name)

    const executeOutEvent = (e) => {
        try {
            const eventContext = { ...el._context, e, $element: el };
            evaluation(eventContext, attr.value);
        } catch (error) {
            __pawaDev.setError({ msg: error.message, stack: error.stack, directives: 'out-event' });
        }
    };
    
    const handler = (e) => {
        if (!checkCommonModifiers(e, modifiers)) return;
        if (!checkKeyModifiers(e, modifiers, eventType)) return;
        
        // ========== TARGET MODIFIERS ==========
        if (modifiers.has('self') && (e.target === el || el.contains(e.target))) return;
        if (modifiers.has('not-self') && e.target === el) return;
        
        // ========== ACTION MODIFIERS ==========
        if (modifiers.has('prevent')) e.preventDefault();
        if (modifiers.has('stop')) e.stopPropagation();
        
        // ========== EXECUTION ==========
        processEventExecution(el, attr.name, modifiers, () => executeOutEvent(e), eventType, 'out');
    }

    const options = {
        capture: modifiers.has('capture'),
        once: modifiers.has('once'),
        passive: modifiers.has('passive')
    };
    
    const target = modifiers.has('window') ? window : document;
    el._MountFunctions.push(() => target.addEventListener(eventType, handler, options))
    const unMount = () => target.removeEventListener(eventType, handler, options);
    el._setUnMount(unMount)
}
export const exitTransition=(el,attr)=>{
if (el._running) {
    return
}
    el._exitAnimation=()=>{
        return new Promise((resolve)=>{
            requestAnimationFrame(()=>{
                const animations =el.getAnimations({subtree:false})
                if (animations.length === 0) {
                    resolve()
                    return
                }
                
                Promise.all(animations.map(a=>a.finished)).then(resolve).catch(resolve)
            })
        })
     }
     el.removeAttribute(attr.name)
}

const createTimedExecutable = (el, attr, useInterval) => {
    if (el._running) return;
    const getTime = attr.name.match(/\[(.*?)\]/)[1];
    const keys = Object.keys(el._context);
    el.removeAttribute(attr.name);

    const resolvePath = (path, obj) => path.split('.').reduce((acc, key) => acc?.[key], obj);
    const values = keys.map((key) => resolvePath(key, el._context));

    const func = new Function(...keys, `
        try {
            ${attr.value}
        } catch(error) {
            console.error(error.message, error.stack, 'at ${attr.name}');
            __pawaDev({msg: error.message, stack: error.stack, directives: '${attr.name}'});
        }
    `);

    const execute = () => func(...values);

    const timer = useInterval ? setInterval(execute, getTime) : setTimeout(execute, getTime);
    const clear = useInterval ? clearInterval : clearTimeout;

    el._setUnMount(() => clear(timer));
};

export const After = (el, attr) => {
    createTimedExecutable(el, attr, false);
};

export const Every = (el, attr) => {
    createTimedExecutable(el, attr, true);
};

export const Key = (el, attr, stateContext,resume=false,notRender,stopResume) => {
    el._checkStatic() 
    if (el._running || checkKeywordsExistence(el._staticContext,attr.value)) {
        return
    }
    el._running = true
    if(!resume){
        el.removeAttribute('key')
        const parent = el.parentElement
        const endComment=document.createComment('end-key')
        el.replaceWith(endComment)
        normal_key(el,attr,stateContext,endComment)
    }else{
        stopResume.stop=true
            let comment
            let endComment
            let dataComment
            let id=attr.name.slice(6)
            const children=[]
            const setComment=(c)=>comment=c
            const setEndComment=(c)=>endComment=c
            getComment(el,setComment,id)
            getEndComment(comment,setEndComment,id,children)
            const numberIfChildren=notRender.index + children.length - 1
      notRender.notRender=numberIfChildren
            resumer?.resume_key?.(el,attr,stateContext,{comment,endComment,id,children})

    }
}
