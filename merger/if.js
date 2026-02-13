import { render, $state, keepContext,restoreContext} from '../index.js';
import { pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';

export const merger_if=(el,attr,stateContext,resume=false,{comment,endComment,children,chained,chainMap})=>{
    let func
    let removePromise=null
    let promised=false
    let firstEnter = false
    const parent = endComment.parentElement
    let latestChain
    let oldChain
    if (resume) {
        oldChain={id:attr.value}
    }
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {
            
            if (!func) {
                func =new Map()
                chained.forEach((item)=>{
                    if(item.condition === 'else')return
                    let funcs=safeEval(el._context,item.exp,item.element)
                    func.set(item.exp,funcs)
                })
            }
            const values = getEvalValues(el._context)
            let current
            chained.forEach(element => {
                if (current || element.condition === 'else') return
                current=func.get(element.exp)(...values)
                if (current) {
                    latestChain={
                        id:element.exp,
                        condition:element.condition
                    }
                }else{
                    latestChain={
                        id:'else',
                        condition:'else'
                    }
                }
            });
            if (!firstEnter) {
                for (const fn of el._terminateEffects) {
                    comment._terminateEffects.add(fn)
                }
            }
            const setElement=(newElement,exp)=>{
                newElement.removeAttribute(exp)
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                comment.data=`condition ${exp}`
                parent.insertBefore(newElement, endComment)
                render(newElement, el._context)
                stateContext._hasRun = true
            }
                if (comment.nextSibling !== endComment && oldChain.id !== latestChain.id) {
                    removePromise=pawaWayRemover(comment,endComment)
                }
                    if (comment.nextSibling === endComment) {

                        Promise.resolve(removePromise).then(()=>{
                            if (comment.nextSibling === endComment) {
                                const getRightElement=chainMap.get(latestChain.id)
                                if (getRightElement) {
                                    const ele=getRightElement.element.cloneNode(true)
                                    setElement(ele,latestChain.condition) 
                                }
                            }
                            promised=false
                        })
                        promised=true
                        
                    }
                    if(firstEnter){
                        if(oldChain.id === latestChain.id)return
                        const getRightElement=chainMap.get(latestChain.id)
                        if (getRightElement) {
                            Promise.resolve(removePromise).then(()=>{
                                if (comment.nextSibling === endComment && oldChain.id === latestChain.id) {
                                const getRightElements=chainMap.get(latestChain.id)
                                if (getRightElements) {
                                    const ele=getRightElement.element.cloneNode(true)
                                    setElement(ele,latestChain.condition) 
                                }
                            }
                            promised=false
                        })
                            }else{
                                removePromise=pawaWayRemover(comment,endComment)
                            }
                        }
                        
                        if(firstEnter === false && resume && current){
                            el.removeAttribute(attr.name)
                         if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                       
                              const number = { notRender: null, index: null }
                            children.forEach((value, index) => {
                              number.index = index
                            if (number.notRender !== null && index <= number.notRender) return
                              render(value,el._context,number)
                            })
                        stateContext._hasRun=true
                }
            oldChain=latestChain
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