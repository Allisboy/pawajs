import {components,getPawaAttributes} from './index.js';
import {splitAndAdd} from './utils.js';
import PawaComponent from './pawaComponent.js';
export class PawaElement {
  constructor(element,context) {
    const div=document.createElement('div')
    div.appendChild(element.cloneNode(true))
    this._context=context;
    this._el=element
    this._out=false;
    this._terminateEffects=new Set()
    this._deleteEffects=this.terminateEffects
    this._slots=document.createDocumentFragment()
    this._mainAttribute={}
    this._lazy=element.tagName ==='IMPORT'?true:false
    this._await=element.tagName ==='AWAIT'?true:false
    this._running=false
    this._hasForOrIf=this.hasForOrIf
    this._elementContent=element.textContent
    this._textContent={}
    this._attributes=Array.from(element.attributes);
    this._template=div.innerHTML;
    this._exitAnimation=null;
    this._component=null
    this._unMountFunctions=[];
    this._MountFunctions=[];
    this._elementType=''
    this._getNode=this.getNode
    this._componentOrTemplate=false
    this._props={}
    this._isElementComponent=false
    this._pawaAttribute={}
    this._setUnMount=this.setUnMounts
    this._componentName=''
    this._attrElement=this.getNewElementByRemovingAttr
    this._attr={}
    this._callMount=this.mount
    this._callUnMOunt=this.unMount
    this._remove=this.remove
    this._componentChildren
    this._pawaElementComponent=null
    this._componentTerminate=null
    this._tree=null
    this._pawaElementComponentName=''
    if (this._lazy) {
      
      this._componentOrTemplate=true
    }
    
    this.setProps()
    this.elementType()
    this.setAttri()
    this.findPawaAttribute()
    this.isPawaElementComponent()
  
  }
  
  static Element(element,context){
    const pawa=new PawaElement(element,context)
    Object.assign(element,pawa)
  }
  getChildrenTree(){
    return Array.from(this._el.children)
  }
  findPawaAttribute(){
    Array.from(this._el.attributes).forEach((attr) => {
      const pawaAttribute=getPawaAttributes()
        if (pawaAttribute.has(attr.name)) {
          this._pawaAttribute[attr.name]=attr.value
        } else  {
          pawaAttribute.forEach((value) => {
              if (attr.name.startsWith(value)) {
                this._pawaAttribute[attr.name]=attr.value
              }
          })
        }
    })
    
  }
  setUnMounts(func){
    this._unMountFunctions.push(func)
  }
  runningPawaDirectives(){
    Array.from(this._el.attributes).forEach((attr) => {
        if (attr.name.startsWith('runing-')) {
          console.log(true)
        }
    })
  }
  isPawaElementComponent(){
    const compo=this._el.getAttribute('pawa-component')
    if (compo && components.get(compo)) {
      this._isElementComponent=true
      this._pawaElementComponentName=compo
      this._pawaElementComponent=new PawaComponent(components.get(compo))
    }
  }
  getNode(){
      const nodeDiv=document.createElement('div')
      nodeDiv.innerHTML=this._template
      const node=nodeDiv.firstElementChild
      return node
  }
  terminateEffects(){
    this._terminateEffects.forEach((eff) => {
        eff()
    })
  }
  lazyImport(){
    
  }
  getNewElementByRemovingAttr(attrName){
    const element=this._el.cloneNode(true)
    element.removeAttribute(attrName)
    return element
  }
  
  setAttri(){
    this._attributes.forEach((attr) => {
        this._attr[attr.name]=attr.value
    })
  }
  hasForOrIf(){
    if (this._el.getAttribute('if') || this._el.getAttribute('for') || this._el.getAttribute('else') || this._el.getAttribute('else-if')) {
      return true
    }else{
      return false
    }
  }
  
  async remove(callback){
    if (this._tree) {
      this._tree.remove()
    }
    
    if (typeof this._exitAnimation === 'function') {
      
     try {
      const animate=this._exitAnimation().then(() => {
           this._callUnMOunt()
          this._out = true
          this._el.remove()
          if (callback) {
            callback()
          }
       })
       return animate
     } catch (error) {
      console.error(error);
      
     }
    } else {
      this._callUnMOunt()
          this._out=true
          this._el.remove()
          if (callback) {
            callback()
          }
          return true
    }
  }
  unMount(){
 if (this._component && this._pawaElementComponentName === '') {
   this._componentTerminate()
 } else {
      this._unMountFunctions.forEach(func => {
     func()
   })
   this._deleteEffects()
   Array.from(this._el.childNodes).forEach(child => {
     if (child.nodeType === 1) {
       if (child?._el) {
         child._out = true
         child._deleteEffects()
         child._callUnMOunt()
       }
     } else if (child.nodeType === 8) {
       if (child?._controlComponent) {
         child._remove()
       }
     }
     
   })
 }
  }
  mount(){
    try {
      this._MountFunctions.forEach((func) => {
  func()
})
    } catch (e) {
      throw e
    }
  }
  elementType(){
    const tag = this._el.tagName
    if (components.has(tag)) {
      this._elementType= 'component'
      
      this._componentOrTemplate=true
      this._componentName=this._el.tagName
      this._component=new PawaComponent(components.get(tag))
      Array.from(this._el.children).forEach(slot =>{
        if (slot.tagName === 'PROPS') {
          this._slots.appendChild(slot)
        }
      })
      this._componentChildren=this._el.innerHTML
      
    } else if (components.has(splitAndAdd(tag))) {
      this._elementType='component'
      this._componentOrTemplate=true
      this._componentName=splitAndAdd(tag)
      this._component=components.get(splitAndAdd(tag))
      Array.from(this._el.querySelectorAll('props')).forEach(slot =>{
        if (slot.tagName === 'PROPS') {
          this._slots.appendChild(slot)
        }
      })
      this._componentChildren=this._el.innerHTML
      
    } else if(tag ==='TEMPLATE'){
      this._elementType='template'
      this._componentOrTemplate=true
    } else {
      this._elementType='element'
      this._componentOrTemplate=false
    }
  }
  setProps(){
    if (!this._context) {
      return
    }
    this._attributes.forEach((attr) => {
        if (attr.name.startsWith('props-')) {
          try {
            const propsName=attr.name.split('-')[1]
         const keys = Object.keys(this._context);
const resolvePath = (path, obj) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, this._context));
const value=new Function(...keys,`
  try{
  return ${attr.value}
  }catch(error){
  __pawaDev.setError({el:this._el,msg:'error from component props'})
  }
  `)(...values)
this._props[propsName]=value
          } catch (error) {
            console.error(error)
          }
       }
    })
  }
}

export class PawaComment {
  constructor(element) {
    
    this._index=null;
    this._el=element
    this._setCoveringElement=this.setCoveringElement
    this._data={}
    this._terminateEffects=new Set()
    this._run
    this._coveringElement=null
    this._setData=this.setData
    this._removeSiblings=this.removeSiblings
    this._controlComponent=false
    this._componentTerminate=null
    this._componentElement=null
    this._setComponentOut=this. pp
    this._deleteEffects=this.terminateEffects
    this._remove=this.remove
    this._terminateByComponent=this.terminate
  }
  static Element(element){
    const pawa=new PawaComment(element)
    Object.assign(element,pawa)
    return element
  }
  
  terminateEffects() {
  this._terminateEffects.forEach((eff) => {
    eff()
  })
}
  setCoveringElement(el){
    this._coveringElement=el
  }
  setData(obj){
    Object.assign(this._data,obj)
  }
  terminate(endComment){
    this._remove()
    this._removeSiblings(endComment)
    this._el.remove()
    endComment.remove()
  }
  remove(){
    const comment=this._el
    if (comment._controlComponent) {
      
      comment._componentElement._unMountFunctions.forEach(unMount =>{
        unMount()
      })
      comment._componentElement._deleteEffects()
      comment._deleteEffects()
    } else {
      comment.remove()
    }
    
  }
  removeSiblings(endComment){
    const comment=this._el
    while (comment.nextSibling) {
  if (comment.nextSibling === endComment) {
    return
  } else {
    if (comment.nextSibling.nodeType === 8) {
      comment._remove()
    } else if (comment.nextSibling.nodeType === 1) {
      comment.nextSibling._remove()
    }
  }
}
  }
}
