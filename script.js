import {render,keepContext,RegisterComponent,$state} from './index.js'
import {createEffect} from './reactive.js'
import { safeEval,getEvalValues } from './utils.js'

// const resumes=$state({
//     failed:[],
//     retry:false,
// })
const schedule=new Set()
let isRendering=false
const renderSchedule=()=>{
   
    schedule.forEach(func=>{
        func() 
        schedule.delete(func)
    })
}
const addIntoSchedule=(fn)=>{
    schedule.add(fn)
    if(isRendering){
        return
    }

    isRendering=true
    renderSchedule()
    isRendering=false
}
export const resume=(el,attr,stateContext)=>{
    // console.log(attr.value)
    const $resume$=$state({
        failed:false,
        success:false,
        loading:false,
    })
    el._context.$resume$=$resume$
    el._scriptDone=false
    $resume$.value.loading=true
    const src=attr.value
    const script=document.createElement('script')
    script.type="module"
    script.async = true; // Add async attribute to prevent blocking
    script.src=src
    document.body.appendChild(script)
    try{

        const cloned=el.cloneNode(true)
        let func
        let success
        let retry
        if(el.hasAttribute('script-error')){
            func=safeEval(el._context, `()=>{${el.getAttribute('script-error')}}`,el)(...getEvalValues(el._context))
        }
        if(el.hasAttribute('script-success')){
            success=safeEval(el._context, `()=>{ ${el.getAttribute('script-success')}}`,el)(...getEvalValues(el._context))
        }
        
        const evaluate=()=>{

            script.onload=()=>{
                // Use a promise to ensure the script is fully loaded before proceeding
                 Promise.resolve().then(() => {
                    addIntoSchedule(()=>{
                        el.innerHTML=cloned.innerHTML
                        if (stateContext._hasRun) {
                            stateContext._hasRun = false;
                            keepContext(stateContext);
                        }
                        // el._context.$resume$=$resume$
                        Array.from(el.children).forEach(child => {
                            render(child,el._context,el._tree)
                        })
                        stateContext._hasRun=true
                        $resume$.value.loading = false;
                        if(typeof success === 'function'){
                            try{
                                success()
                            }catch(error){
                                __pawaDev.setError({el:el,directive:'script-success',msg:error.message,stack:error.stack})
                            }
                        }
                        el.removeAttribute('script')
                        el.removeAttribute('script-error')
                        el.removeAttribute('script-success')
                    })
                })
                el._setUnMount(()=>{
                    script.remove()
                })
            }
            script.onerror=()=>{
                if (func && typeof func === 'function') {
                    try{
                        func()
                    }catch(error){
                        __pawaDev.setError({el:el,directives:'script-error',msg:error.message,stack:error.stack})
                    }
                }
                if (func && typeof retry === 'function') {
                    try{
                        retry(evaluate)
                    }catch(error){
                        __pawaDev.setError({el:el,directives:'script-retry',msg:error.message,stack:error.stack})
                    }
                }
             $resume$.value.loading = false;
             $resume$.value.failed = true;
             console.error(`Failed to load script: ${src}`);
            } 
        }
        if(el.hasAttribute('script-retry')){
            retry=safeEval({...el._context,evaluate:evaluate}, `(evaluate)=>{${el.getAttribute('script-retry')}}`,el)(...getEvalValues(el._context))
        }
        if(!retry){
            evaluate()
        }else{
            createEffect(()=>{
                evaluate()
            },el)
        }
    }catch(error){
        __pawaDev.setError({el:el,msg:error.message,stack:error.stack,directives:'resume'})
        console.log('error',error)
    }
}