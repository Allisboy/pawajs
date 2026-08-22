import { $state, html, useInsert, RegisterComponent, pawaStartApp } from "../index.js"

export const Counter=()=>{
  const count=$state(0)
  const data=$state({data:undefined,user:true})
  useInsert({count,data,increment:[{increase:()=>count.value++,step:1}]})
  return html`
  <div>
    <h1>Counter APPs</h1>
    <h2 --data="through">@{count.value}</h2>
    <span if="count.value > 0">positive</span>
    <span else-if="count.value < 0">negative</span>
    <span else>It zero</span>
    <button on-click=count.value++>Increment</button>
    <button on-click=count.value-->Decrement</button>
  </div>
  `
}
__pawaDev.tool=true
RegisterComponent(Counter)
const app=document.getElementById('app')
pawaStartApp(app)
window.hmr=true