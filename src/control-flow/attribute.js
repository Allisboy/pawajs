import { InProxyCaller } from "../hooks/state.js";
import { ElementProperty } from "../pawaElement.js";
import { createEffect, errorControl } from "../reactive.js";
import { getContexters, safeEval } from "../utils.js";
export const attribute=(el,exp,context,graph)=>{
    const {values}=getContexters(context)
    const attrMap = new Map();
    let enter=false
        // Check if attribute starts with @ (shorthand for reactive attributes)
    const isAtAttr = exp.name.startsWith('@');
    const targetName = isAtAttr ? exp.name.slice(1) : exp.name;
    if (isAtAttr) {
        el.removeAttribute(exp.name);
    }
        attrMap.set(exp.name, exp.value);
        const booleanAttributes = new Set(['checked', 'selected', 'disabled', 'readonly', 'required', 'multiple']);
    const evaluate=()=>{
        try {
            
            let attrName=targetName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        let value = attrMap.get(exp.name);
            let isBoolean
            const regex = /@{([^}]*)}/g;

            const hasExpression = regex.test(value);
            value = value.replace(regex, (match, expression) => {
                    const result = safeEval(expression,context,true)
                    isBoolean = result
                    
                    if (typeof result !== 'boolean') {
                        return result ?? ''
                    }else{
                        return result ? 'true' : 'false'
                    }     
            });
            if (booleanAttributes.has(attrName)) {
                const boolValue = hasExpression ? !!isBoolean : value.toLowerCase() !== 'false';
                const propName = attrName === 'readonly' ? 'readOnly' : attrName;

                if (propName in el) {
                    el[propName] = boolValue;
                }

                if (boolValue) {
                    el.setAttribute(targetName, value);
                }
                else{
                    el.removeAttribute(targetName);
                }
            } else if (attrName === 'value' && 'value' in el) {
                el.value = value;
                el.setAttribute(targetName, value);
            } else if(exp.name.includes('.') || exp.name.includes('-')){
                    if(el.hasAttribute(exp.name))el.removeAttribute(exp.name)
                    ElementProperty(el,attrName,value)
                } 
            else {
                if ((targetName === 'class' || targetName === 'style') && enter) {
                    requestAnimationFrame(()=>{
                        el.setAttribute(targetName, value);
                    })
                    enter=true
                }else{
                    el.setAttribute(targetName, value);
                    // Toggle enter to true after initial set so subsequent reactive updates use requestAnimationFrame
                    if (targetName === 'class' || targetName === 'style') enter = true;
                }
            }    
        } catch (error) {
            errorControl(error, {
                effect:'attribute',
                el,
                exp:exp.value,
                template:el?.outerHTML,
            })
            return
        }
        
    }
    createEffect(()=>{
        evaluate()
    },graph)
}