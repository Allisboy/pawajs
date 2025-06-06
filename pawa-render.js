import {PawaElement} from './pawaElement.js';
import Pawa, {setStateContext,render}from './index.js';
import {sanitizeTemplate} from './utils.js';
const scheduled = new Set();
let rafScheduled = false;

function scheduleRender(fn) {
  scheduled.add(fn);
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(() => {
      scheduled.forEach(f => f());
      scheduled.clear();
      rafScheduled = false;
    });
  }
}
export const pawaTree = (el) => {
  PawaElement.Element(el)
  
  let appTree = {
  element: el.tagName,
  serverKey:el.getAttribute('server-key'),
  pawaAttributes: el._pawaAttribute|| {},
  isComponent: el._componentOrTemplate || el._isElementComponent || false,
  elementComponent:el._isElementComponent,
  componentName:el._componentName,
  new:false,
}
el._tree=appTree
//console.log(el)
    return el
}


function isShallowEqual(a, b) {
  
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length){
    console.log(a,b)
    return false;}

  return aKeys.every(key => a[key] === b[key]);
}


export const pawaCompare=(arg1,arg2) => {
  
    if (arg1._tree.element === arg2._tree.element && isShallowEqual(arg1._tree.pawaAttributes,arg2._tree.pawaAttributes) && arg1._tree.isComponent === arg2._tree.isComponent &&  arg1._tree.componentName === arg2._tree.componentName && arg1._pawaElementComponentName === arg2._pawaElementComponentName) {
      return true
    } else {
      //console.log(arg1._tree.pawaAttributes)
      return false
    }
}

export const test=() => {
    const html=document.createElement('div')
   // html.setAttribute('if','open.value')
    const clone=html.cloneNode(true)
    if (pawaCompare(pawaTree(html),pawaTree(clone))) {
      console.log(true)
    } else {
      console.log(false)
    }
}
function hasAtBracesContent(str) {
  return /@\{[^}]+\}/.test(str);
}''
export const pawaRender=(app,app1) => {
    if (!pawaCompare(app,pawaTree(app1))) {
      console.warn(`miss Matched at`,app)
    }
      /// textContent
      if (hasAtBracesContent(app._template) === false) {
        if (!hasAtBracesContent(app1._template)) {
          if (app.textContent !== app1.textContent) {
  app.textContent = app1.textContent
}
        }
        
      }
      //console.log(app1)
      //// Attributes 
      Array.from(app1.attributes).forEach((attr) => {
        
          if (!app._pawaAttribute[attr.name]) {
            app.setAttribute(attr.name,attr.value)
          }
      })
      
     if (app._tree.thisSame) {
       
       app._tree.children.forEach((appTree) => {
           scheduleRender(() => {
               pawaRender(appTree.el,app1)
           })
       })
       app.innerHTML=app1.innerHTML
     } else {
       if (app._componentName && !app._isElementComponent && app._tree.isComponent) {
         const stateContext=app._tree.stateContext
         const children=app1.innerHTML
         const div=document.createElement('div')
         setStateContext(stateContext)
         
         const compo=stateContext.component({...stateContext._prop})
       // console.log(app._tree.children[1])
         div.innerHTML=sanitizeTemplate(compo)
         Array.from(div.children).forEach((child,index) => {
             scheduleRender(() => {
                pawaRender(app._tree.children[index].el,child)
             })
         })
         
       } else {
         const newAppTree=[]
         const removeElement=[]
         const parent=app._tree.children[0]?.parent.el || app 
         const parentTree=app._tree
         Array.from(app1.children).forEach((child,index) => {
           
             newAppTree.push(pawaTree(child))
            //console.log(appTree)
         })
         
         
         // remove child element that doesn't exit with the element children 
         
         Array.from(app._tree.children).forEach((child) =>{
           
           let matched=false
           newAppTree.forEach((newChild) => {
             
             if (matched || newChild._tree.matched) {
               return
             }
               if (pawaCompare(child.el,newChild)) {
                 console.log('yes')
                 newChild._tree.matched=true
                 matched=true
                // later empty it
                 child.matchedNode=newChild
               } 
           })
           if (matched) {
             
             //later make it false
             child.preRender=true
           }
           if (!matched) {
             
             child.el._remove()
           }
         })
         //console.log(app)
         newAppTree.forEach((child) => {
            child._tree.matched=false
         })
         
         if ( app1.children.length > app._tree.children.length ) {
           
           if (app._tree.children.length === 0) {
             Array.from(app1.children).forEach((child) => {
                 parent.appendChild(child)
                 requestAnimationFrame(() => {
                     render(child,parent._context,parent._tree)
                 })
             })
           } else {
             let lastMatched
             let siblings 
             app._tree.children.forEach(child =>{
           let matched=false
           newAppTree.forEach((newChild,index) => {
             
             if (matched) {
               return
             }
               if (pawaCompare(child.el,newChild)) {
                 newAppTree.splice(index,1)
                 matched=true
                 lastMatched=child
               } else {
                 parent.insertBefore(newChild,child.el)
                 newAppTree.splice(index,1)
                 requestAnimationFrame(() => {
                     render(newChild,parent._context,parent._tree)
                 })
               }
           })
           
         })
         if (newAppTree.length > 0) {
           siblings=lastMatched.el.nextElementSibling
           newAppTree.forEach((child) => {
               if (siblings) {
          parent.insertBefore(child,siblings)
          requestAnimationFrame(() => {
              render(child,parent._context,parent._tree)
          })
} else {
  parent.appendChild(child)
  requestAnimationFrame(() => {
      render(child,parent._context,parent._tree)
  })
}
           })
         }
           }
         }
         const preRenderTree=app._tree.children.filter(tree => tree.preRender=== true)
         
       preRenderTree.forEach((child) => {
           scheduleRender(() => {
               pawaRender(child.el,child.matchedNode)
           })
       })
       
       }
     }
      
      
      
    
}

