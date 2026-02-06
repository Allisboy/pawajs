import { render, $state, keepContext,restoreContext} from '../index.js';
import { pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';

export const merger_key=(el,attr,stateContext,resume=false,{comment,endComment,children,chained,chainMap})=>{
    let func
    let removePromise=null
    let promised=false
    let firstEnter = false
    const parent = endComment.parentElement
    let latestChain
    let oldChain
    
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        const regex = /@{([^}]*)}/g;
        try {
            let value=attr.value 
            let keyValue
            if (!func) {
                value = value.replace(regex, (match, exp) => {
                    func=safeEval(el._context,exp,el)
                    return '';
            });
            }
            const values = getEvalValues(el._context)
            let current
            
            if (!firstEnter) {
                for (const fn of el._terminateEffects) {
                    comment._terminateEffects.add(fn)
                }
            }
            const setElement=(newElement,exp)=>{
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                comment.data=`key ${exp}`
                parent.insertBefore(newElement, endComment)
                render(newElement, el._context)
                stateContext._hasRun = true
            }
                    latestChain=func(...values) 
                    if(oldChain === latestChain && firstEnter)return 
                    if (comment.nextSibling !== endComment && oldChain !== latestChain) {
                        removePromise=pawaWayRemover(comment,endComment)
                    }
                    if (oldChain !== latestChain && firstEnter) {
                        Promise.resolve(removePromise).then(()=>{
                            if (comment.nextSibling === endComment && oldChain !== latestChain) {
                                const newElement=el.cloneNode(true)
                                 newElement.removeAttribute('id')
                                 oldChain=latestChain
                                 setElement(newElement,latestChain) 
                            }
                            promised=false
                        })
                        promised=true
                        
                    }
                    if(!firstEnter && !resume){
                        if(oldChain === latestChain)return
                        if (comment.nextSibling === endComment && oldChain !== latestChain) {
                            const newElement=el.cloneNode(true)
                            newElement.removeAttribute('id')
                            oldChain=latestChain
                            setElement(newElement,latestChain) 
                          }

                    //         promised=false
                       }
                        
                        if(firstEnter === false && resume && current){
                            el.removeAttribute(attr.name)
                         if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                      const number={notRender:null,index:null}
                            children.forEach((value, index) => {
                              number.index=index
                              if(number.notRender && index >= number.notRender) return
                              render(value,el._context,number)
                            })
                        stateContext._hasRun=true
                }
            
         firstEnter=true
            } catch (error) {
                console.log(error.message,error.stack)
                setPawaDevError({
                    message: `Error from IF directive ${error.message}`,
                    error: error,
                    template: el._template
                })
            }
        }
        return evaluate
}