import {$state,useInsert,runEffect, RegisterComponent} from './index.js';


const renderFor=(array,callback)=>{
  return array.map(callback).join('')
}
const DevTabs=({tabs,activeKey})=>{
    
    const title=renderFor(tabs(),(item,index)=>`
        <span 
        style="padding:10px; @{activekey.value === ${index} ? 'background-color:white; color:blue;' : 'background-color:#1e1e2f; color:white;'}" 
        on-click="activekey.value=${index}">${item.title}</span>
    `)
    
    useInsert({tabs:tabs()})
    return`
        <div state-activekey='0' style="margin:10px;" >
            <div style="display:flex; flex-direction:column; gap:3px;">
            <div style="margin:10px;">
              ${title}
            </div>
            </div>
            <div key="activekey">
              <div>
                  @html(tabs[activekey.value].element)
               </div>
            </div>
        </div>
    `
}
const DevError=()=>{
  return /*html */`
    <div 
    style="
     overflow:scroll; 
    padding:4px; width:80vw; max-width:700px;
    height:60vh; max-height:500px;">
      <h1>Error</h1>
      <ul>
      <li 
      for="devError, i in errors.value" 
      for-key="devError.timestamp" style="color:white; margin:10px;">
        <span>ERROR :@{i === 0 ? 1 : i + 1}</span>
        <div>@{devError?.msg}</div>
        <div style="background-color:white; padding:2px; margin:5px; color:red;">
          <p>@{devError?.stack}</p>
        </div>
        <div style="background-color:white; padding:12px; color:red;">
          <h2>Element:</h2>
          <p style="font-size:30px;">@{devError?.el ? devError.el:''}</p>
        </div>
        <div>
          <span>@{devError?.directive ? devError.directive:''}</span>
        </div>
      </li>
      </ul>
    </div>
  `
}
const tab=`[
  {
      key:'home',
      title:'Error',
      element:'<dev-error></dev-error>'
  },
  {
      key:'about',
      title:'About',
      element:'<h1>About</h1>'
  }
]`
export const PawaDevTool = () => {
  RegisterComponent(DevTabs,DevError)
  const open = $state(false)
  const errors=$state([])
  const tool=$state({
    component:{
      total:0
    }
  })
  const totalEffect=$state(0)
  const toggleOpen = () => {
    open.value = !open.value
  }
    const setDevTools=()=>{
      errors.value=__pawaDev.errors
        totalEffect.value=__pawaDev.totalEffect
        tool.value.component.total=__pawaDev.totalComponent
      }
  runEffect(() => {
      setDevTools()
  },0)

  useInsert({ open, toggleOpen,errors,totalEffect,setDevTools,tool })

  return `
  <template>
    <!-- Floating Dev Button -->
    <div 
      on-click='toggleOpen()'
      style='
        position:fixed;
        bottom:30px;
        right:30px;
        width:60px;
        height:60px;
        background:linear-gradient(135deg,#667eea,#764ba2);
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 4px 20px rgba(0,0,0,0.2);
        cursor:pointer;
        z-index:1000;
      '>
      <span style='color:white;font-weight:bold;font-size:14px;'>Dev</span>
      <span style='color:white; background-color:red; margin-left:2px; border-radius:50%;'>@{errors?.value?.length}</span>
    </div>

    <!-- Dev Tool Overlay -->
    <div 
      if='open.value' 
      style='
        position:fixed;
        top:0;
        left:0;
        width:100vw;
        height:100vh;
        background:r;
        backdrop-filter:blur(4px);
        z-index:999;
        padding:20px;
      ' >
      
      <div 
        style='
          background:#1e1e2f;
          border-radius:16px;
          padding:24px;
          width:90vw;
          height:90vh;
          color:white;
          box-shadow:0 8px 24px rgba(0,0,0,0.3);
          position:relative;
        '>
        
        <!-- Close Button -->
        <button 
          on-click="toggleOpen()"
          style='
            position:absolute;
            top:12px;
            right:12px;
            background:none;
            border:none;
            color:white;
            font-size:20px;
            cursor:pointer;
          '>&times;</button>

        <h2 style='margin:0 0 12px;font-size:16px;'>🛠️ Dev Tool Panel</h2>
        <p style='opacity:0.8;'>inspect Panel.</p>
        
        <div style='margin-top:20px;'>
          <label style='display:block;margin-bottom:8px;'>Live State Debugging (Coming Soon)</label>
          <div>
            <span>numbers of errors: @{errors.value.length}</span>
            <span>active effects : @{totalEffect.value}</span>
            <span>total component : @{tool.value.component.total}</span>
          </div>
          <dev-tabs tabs="${tab}"></dev-tabs>
        </div>
      </div>
    </div>
  </template>
  `
}
