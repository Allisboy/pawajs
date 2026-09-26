import { components } from "../global.js";
let devTool=false
export const setDev=(devs=false)=>{
    devTool = Boolean(devs)
    const pawaDevInstance = createPawaDev();

if (typeof globalThis !== 'undefined') {
    globalThis.__pawaDev = pawaDevInstance;
} else if (typeof window !== 'undefined') {
    window.__pawaDev = pawaDevInstance;
} else if (typeof global !== 'undefined') {
    global.__pawaDev = pawaDevInstance;
}
    return pawaDevInstance;
}

export const getDev = () => devTool
const createPawaDev = () => {
    const dev = {tool:devTool,errors: [], totalEffect: 0, errorState: null, components:()=>devTool? components: components.size,
        renderCount: 0, performance: {renderTime: [], effectTime: [], componentTime: [], start: 0, end: 0},
        _originalStyles: new Map(), listeners: new Set(),
        arrayKeys: [],
        lastError: null,
        subscribe(cb) { dev.listeners.add(cb); return () => dev.listeners.delete(cb); },
        emit(type, data) { dev.listeners.forEach(cb => {try{cb({type,data})}catch(e){console.error("PawaDev listener error:",e)}}); },
        setError({el, msg, directives, stack, template, warn, effect, ref, exp} = {}) { 
            const error = {el, msg, directives, stack, template, warn, effect, ref, exp, time: Date.now()};
            dev.lastError = error;
            dev.errors.push(error);
            if (dev.errors.length > 50) dev.errors = dev.errors.slice(-50);
            dev.emit('error', error);
            return error;
        },
        clearErrors() {
            dev.errors = [];
            dev.lastError = null;
            dev.emit('clear', null);
        },
        logArrayKey(data) {
            dev.arrayKeys.push({
                ...data,
                time: Date.now()
            });
            if (dev.arrayKeys.length > 50) dev.arrayKeys = dev.arrayKeys.slice(-50);
            console.debug('[pawa-dev] arrayKey', data);
            dev.emit('arrayKey', data);
        },
        getSnapshot() {
            return {
                renderCount: dev.renderCount,
                totalEffect: dev.totalEffect,
                performance: dev.performance,
                errors: dev.errors,
                lastError: dev.lastError,
                componentCount: components.size,
                arrayKeys: dev.arrayKeys
            };
        }
    };
    return dev;
};