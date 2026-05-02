import { render, $state, keepContext,restoreContext} from '../index.js';
import { pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';

export const merger_switch=(el,attr,stateContext,resume=false,{comment,endComment,children,chained,chainMap,caseValue})=>{
    let func
    let removePromise=null
    let promised=false
    let firstEnter = false
    const parent = endComment.parentElement
    let latestChain
    let oldChain
    let switchFunc
    if (resume) {
        oldChain={id:caseValue.value}
    }
    const context=el._context
    const evaluate = () => {
        if (endComment.parentElement === null) {
            el._deleteEffects()
        }
        try {
            
            if (!func) {
                func =new Map()
                chained.forEach((item)=>{
                    if(item.condition === 'default')return
                    let funcs=safeEval(context,item.exp,item.element)
                    func.set(item.exp,funcs)
                })
                switchFunc=safeEval(context,attr.value,el)
            }
            const values = getEvalValues(context)
            let current
            chained.forEach(element => {
                if (current || element.condition === 'default') return
                current=switchFunc(...values) === func.get(element.exp)(...values)
                if (current) {
                    latestChain={
                        id:element.exp,
                        condition:element.condition
                    }
                }else{
                    latestChain={
                        id:'default',
                        condition:'default'
                    }
                }
            });
            if (!firstEnter) {
                for (const fn of el._terminateEffects) {
                    comment._terminateEffects.add(fn)
                }
            }
            const setElement=(newElement,exp)=>{
                newElement.removeAttribute(exp === 'default'?'s-default':exp)
                if (stateContext._hasRun) {
                    stateContext._hasRun = false
                    keepContext(stateContext)
                }
                comment.data=`condition ${exp}`
                parent.insertBefore(newElement, endComment)
                render(newElement, context)
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
                            if (comment.nextSibling === endComment) {
                                const getRightElement=chainMap.get(latestChain.id)
                                if (getRightElement) {
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
                        
                        if(firstEnter === false && resume && oldChain.id === latestChain.id){
                            el.removeAttribute(attr.name)
                         if (stateContext._hasRun) {
                        stateContext._hasRun = false
                        keepContext(stateContext)
                    }
                      const number={notRender:null,index:null}
                            let isIndex=0
                            children.forEach((value, index) => {
                              number.index = isIndex
                              isIndex++ 
                            if (number.notRender !== null && isIndex <= number.notRender) return
                              render(value,context,number)
                            })
                        stateContext._hasRun=true
                }
            oldChain=latestChain
         firstEnter=true
            } catch (error) {
                console.error(error.message,error.stack,el)
                console.warn(error.message,error.stack,el,'from at switch case check your exprssion')
                 __pawaDev.setError({ 
                    el:el, 
                    msg:`from  {switch/case} ${attr.value}`, 
                    directives:'switch/case', 
                    stack:error.stack, 
                    template:el?._template, 
                 })
            }
        }
        el?._clearContext()
        return evaluate
}