import { getContexters, safeEval } from "../utils.js";

export const after=(el,attr,context,graph)=>{
    createTimedExecutable(el,attr,context,graph,false)
}
export const every=(el,attr,context,graph)=>{
    createTimedExecutable(el,attr,context,graph,true)
}
const createTimedExecutable = (el, attr,context,graph,useInterval) => {
    const values=getContexters()
    const func = safeEval( `
        try {
            ${attr.value}
        } catch(error) {
            console.error(error.message, error.stack, 'at ${attr.name}');
            
        }
    `,context);

    const execute = () => func(...values);

    const timer = useInterval ? setInterval(execute, getTime) : setTimeout(execute, getTime);
    const clear = useInterval ? clearInterval : clearTimeout;

    graph.unMount.push(() => clear(timer));
};
