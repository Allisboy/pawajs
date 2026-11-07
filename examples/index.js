import { pawaStartApp,$state, RegisterComponent, useValidateComponent, runEffect, useInnerContext, useInsert, forwardProps, Transition, Active } from "../index.js";
import { schedule, useStorage } from "../src/hooks/state.js";
const user=useStorage(()=>$state(false),'user')
const set=()=>{
    schedule(()=>user.value=!user.value)
}
const AsyncCompo=async()=>{
    await Promise.resolve(true)
    return `
    <div>
        <h1>This is an Async component</h1>
    </div>
    `
}
const items=$state([
    {name:'james',id:938449},{name:'joy',id:736497},{name:'josh',id:997287}
])
const remove=(key)=>{
    items.value=items.value.filter(n => n.id !== key)
}
const Counter=({...props})=>{
    
    useInsert({data:'users'})
    return  `
     <slot></slot>`
}

const promise=()=>new Promise((r)=>{
    setTimeout(() => {
        r({
            user:'Allwell',
            age:24
        })
    }, 6000);
})
RegisterComponent(Counter,Transition,Active,AsyncCompo)
RegisterComponent.lazy('Text',()=>import('./Text.js'))
pawaStartApp(document.getElementById('app'),{user,set,items,remove,promise})

