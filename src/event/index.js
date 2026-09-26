import { customEventMap } from "../global.js";
import { getContexters, safeEval } from "../utils.js";

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
        catch (error) { 
            throw new Error(error,`at ${attrName} from ${el._template}`);
            
        }
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

export const event = (el, attr,context,graph) => {
    const directive = attr.name.substring(3); // 'on-click.prevent' → 'click.prevent'
    const parts = directive.split('.');
    const eventType = parts[0];
    const modifiers = new Set(parts.slice(1));

    el.removeAttribute(attr.name)

    let eventContext = { ...context, e:el };
    
   const caller= safeEval(attr.value,eventContext)
   
   const executeEvent = (e) => {
       try {
           const {values}=getContexters({...context,e})
            caller(...values)
        } catch (error) {
            console.log(error);
            
            // __pawaDev.setError({ el: el, msg: error.message, stack: error.stack, directives: 'on-event' });
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
    
    let target = modifiers.has('window') ? window :null
    target=modifiers.has('out') ? document:null
    target=target ?? el

    // Wrapper to ensure custom events respect standard action modifiers
       const wrappedExecute = (e) => {
        // Apply common modifiers first
        if (!checkCommonModifiers(e, modifiers)) return;
        if (!checkKeyModifiers(e, modifiers, eventType)) return;
        
        // Apply target modifiers
        if (modifiers.has('self') && e.target !== el) return;
        if (modifiers.has('not-self') && e.target === el) return;
        
        // Apply form modifiers (if applicable, though less common for custom events)
        if (modifiers.has('dirty') && e.target && !e.target.value) return;
        if (modifiers.has('pristine') && e.target && e.target.value) return;
        if (modifiers.has('valid') && e.target && !e.target.checkValidity?.()) return;
        if (modifiers.has('invalid') && e.target && e.target.checkValidity?.()) return;

        // Apply action modifiers
        if (modifiers.has('prevent')) e.preventDefault?.();
        if (modifiers.has('stop')) e.stopPropagation?.();
        processEventExecution(el, attr.name, modifiers, () => executeEvent(e), eventType, 'on');
    };

    if (customEventMap.has(eventType)) {
        const custom=customEventMap.get(eventType)
        custom(el, modifiers, options, wrappedExecute)
        return
    }
    
     target.addEventListener(eventType, handler, options)
    graph.unMount.push(() => {
        target.removeEventListener(eventType, handler, options);
    });
}
