import { render, $state, keepContext,restoreContext} from '../index.js';
import { pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';

export const merger_key=(el,attr,stateContext,resume=false,{comment,endComment,children,old})=>{
    let func
    let removePromise=null
    let promised=false
    let firstEnter = false
    const parent = endComment.parentElement
    let latestState
    let oldsate
    let once=false
    if (resume) {
        oldsate=old
    }
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {
            let value=attr.value 
            let keyValue
            if (!func) {
                func=safeEval(el._context,attr.value,el)
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
                comment.data=`key ${latestState}`
                endComment.data=`/ key ${latestState}`
                parent.insertBefore(newElement, endComment)
                render(newElement, el._context)
                stateContext._hasRun = true
            }
            latestState=func(...values) 
            if( resume && !once && latestState === oldsate){
                         if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                      const number={notRender:null,index:null}
                            children.forEach((value, index) => {
                              number.index=index
                              if (number.notRender !== null && index <= number.notRender) return
                              render(value,el._context,number)
                            })
                        stateContext._hasRun=true
                        once=true
                }
                    // if(oldsate === latestState && firstEnter)return 
                    if (comment.nextSibling !== endComment && oldsate !== latestState) {
                        removePromise=pawaWayRemover(comment,endComment)
                    }
                    if (oldsate !== latestState && firstEnter) {
                        Promise.resolve(removePromise).then(()=>{
                            if (comment.nextSibling === endComment && oldsate !== latestState) {
                                const newElement=el.cloneNode(true)
                                 newElement.removeAttribute('key')
                                 oldsate=latestState
                                 setElement(newElement,latestState) 
                            }
                            promised=false
                        })
                        promised=true
                        
                    }
                    if(!firstEnter && !resume){
                        if(oldsate === latestState)return
                        if (comment.nextSibling === endComment && oldsate !== latestState) {
                            const newElement=el.cloneNode(true)
                            newElement.removeAttribute('key')
                            oldsate=latestState
                            setElement(newElement,latestState) 
                          }

                    //         promised=false
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