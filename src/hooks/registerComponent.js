import { components, lazyComponentElement, lazyComponents } from "../global.js";


/**
 * 
 * @param  {...()=>string|null} component 
 * Function registrar for pawajs component
 */
 export const RegisterComponent = (...args) => {
    // Handle new signature from plugin: RegisterComponent('Name1', Func1, 'Name2', Func2, ...)

    if (typeof args[0] === 'string') {
        for (let i = 0; i < args.length; i += 2) {
            const name = args[i];
            const component = args[i + 1];
            if (typeof name === 'string' && typeof component === 'function') {
                // if (components.has(name.toUpperCase())) continue;
                if (typeof window !== 'undefined' && lazyComponents.has(name.toUpperCase())) {
                    lazyComponents.delete(name.toLocaleUpperCase())
                }
                components.set(name.toUpperCase(), component);
            } else {
                console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string, function).');
                break;
            }
        }
        return;
    }
    // Handle old signature for dev mode: RegisterComponent(ComponentFunc1, ComponentFunc2, ...)
    args.forEach((component) => {
        if (typeof component === 'function' && component.name) {
            // if (components.has(component.name.toUpperCase())) return;
            components.set(component.name.toUpperCase(), component);
        } else {
            console.warn('Component registration failed: Component must be a named function. This might happen in production builds without the pawajs Vite plugin.');
        }
    });
}

/**
 * Shared helper to trigger the dynamic import and hydration of a lazy component.
 * @param {string} tagName 
 */
export const triggerLazyLoad = (tagName) => {
    const lazyData = lazyComponents.get(tagName);
    if (!lazyData) return;

    lazyData.component().then(res => {
        const compoFunc = res[lazyData.name];
        if (!compoFunc) return;

        components.set(tagName, compoFunc);
        lazyComponents.delete(tagName);

        const instances = lazyComponentElement.get(tagName) || [];
        while (instances.length > 0) {
            const { element: el, func } = instances.shift();
            if (el) {
                queueMicrotask(() => {
                    if (typeof el !== 'string') {
                        el.style.opacity = "";
                    }
                    func();
                });
            }
        }
        lazyComponentElement.delete(tagName);
    }).catch(err => console.error(`Lazy load failed for ${tagName}:`, err));
};
RegisterComponent.lazy=(...args)=>{
        for (let i = 0; i < args.length; i += 2) {
            const name = args[i];
            const componentFunc = args[i + 1];

            if (typeof componentFunc !== 'function') {
                console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string|string[], function).');
                break;
            }

            const processName =(compName) => {
                if (typeof window === 'undefined') {
                    components.delete(compName.toUpperCase())
                }
                if (components.has(compName.toUpperCase()) || lazyComponents.has(compName.toUpperCase())) return;
                if (typeof compName === 'string') {
                     lazyComponents.set(compName.toUpperCase(), { name: compName, component: componentFunc });
                }
            };

            if (Array.isArray(name)) {
                for (const compName of name) {
                    processName(compName);
                }
            } else if (typeof name === 'string') {
                 processName(name);
            } else {
                console.warn('Mismatched arguments for RegisterComponent. Expected pairs of (string|string[], function).');
                break;
            }
        }   
}
