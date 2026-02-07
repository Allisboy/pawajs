import {components,escapePawaAttribute,getPawaAttributes,getDependentAttribute,} from './index.js';
import {splitAndAdd,replaceTemplateOperators,setPawaDevError,getEvalValues,safeEval} from './utils.js';
import PawaComponent from './pawaComponent.js';
import { getPrimaryDirective } from './index.js';


export class PawaElement {
  
  /**
   * 
   * @param {HTMLElement} element 
   * @param {object} context 
   */
  constructor(element,context) {
    /**
       * @type{PawaElement|HTMLElement}
       */
    const div=document.createElement('div')
    div.appendChild(element.cloneNode(true))
    this._resetEffects=new Set()
    this._context=context;
    this._avoidPawaRender=element.hasAttribute('pawa-avoid');
    this._el=element 
    this._out=false;
    this._terminateEffects=new Set()
    this._deleteEffects=this.terminateEffects
    /**
     * @type{HTMLAllCollection}
     */
    this._slots=document.createDocumentFragment()
    this._mainAttribute={}
    this._preRenderAvoid=[]
    this._lazy=element.tagName ==='IMPORT'?true:false
    this._await=element.tagName ==='AWAIT'?true:false
    this._running=false
    this._hasForOrIf=this.hasForOrIf
    this._elementContent=element.textContent
    this._textContent={}
    this._attributes=[]
    this._template=div.innerHTML;
    this._exitAnimation=null;
    this._component=null
    this._unMountFunctions=[];
    this._MountFunctions=[];
    this._elementType=''
    this._getNode=this.getNode
    this._componentOrTemplate=false
    this._props={}
    this._isView=null
    this._isElementComponent=false
    this._pawaAttribute={}
    this._setUnMount=this.setUnMounts
    this._componentName=''
    this._attrElement=this.getNewElementByRemovingAttr
    this._attr={}
    this._staticContext=[],
    this._checkStatic=this.reCheckStaticContext
    this._callMount=this.mount
    this._callUnMOunt=this.unMount
    this._remove=this.remove
    this._componentChildren
    this._pawaElementComponent=null
    this._componentTerminate=null
    this._cacheSetUp=false
    this._effectsCache=element.getAttribute('render-inview')?this.effectsCache():null
    this._effectsCarrier=null
    this._pawaElementComponentName=''
    this._reCallEffect=this.reCallEffect
    this._ElementEffects=new Map()
    this._deCompositionElement=false
    this._restProps={}
    this._kill=null
    this._isKill=false
    this._scriptFetching=element.hasAttribute('script')
    this._scriptDone=false
    this._underControl=null
    /**
     * @type{object}
     */
    this._reactiveProps={}
    if (this._lazy) {
      
      this._componentOrTemplate=true
    }
    
    if(this._avoidPawaRender){
      element.removeAttribute('pawa-avoid')
      Array.from(element.children).forEach((child) => {
        if (child.nodeType === 1) {
          child.setAttribute('pawa-avoid','')
        }
      })
    }
    this.setPawaAttr()
    this.elementType()
    this.setProps()
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
  reCallEffect(){
    this._resetEffects.forEach((call)=>{
      call()
    })
  }
  setPawaAttr(){
    const isResume=this._el.hasAttribute('pawa-resume')
    if(isResume){
      const pawaAttr=this._el.getAttribute('pawa-resume')
      const array=pawaAttr.split(';')
      array.forEach(value =>{
        if(!this._el.hasAttribute(value)) return
        this._attributes.push({name:value,value:this._el.getAttribute(value)})
      })
      this._el.removeAttribute('pawa-resume')
    }else{
      this._attributes=Array.from(this._el.attributes)
    }
  }
  findPawaAttribute(){
    Array.from(this._el.attributes).forEach((attr) => {
      const pawaAttribute=getPawaAttributes()
      const dependentAttribute=getDependentAttribute()
        if (pawaAttribute.has(attr.name) && !dependentAttribute.has(attr.name)) {
          if (!escapePawaAttribute.has(attr.name)) {
            this._pawaAttribute[attr.name]=attr.value
          }
        } else  {
          pawaAttribute.forEach((value) => {
              if (attr.name.startsWith(value) && !dependentAttribute.has(value)) {
                this._pawaAttribute[attr.name]=attr.value
              }
          })
        }
    })
    
  }
  setUnMounts(func){
    this._unMountFunctions.push(func)
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
    const primary=getPrimaryDirective()
    let truth=false
    primary.forEach((att)=>{
      if(truth) return
      if(this._attributes.includes(att)){
        truth=true
        return
      }
      truth=false
    })
  }
  cache(){
    if (this._el.parentElement && this._el.parentElement?._cacheSetUp) {
      this._effectsCache=this._el.parentElement._effectsCache()
    }
  }
  effectsCache(){
    return this._el
  } 
  reCheckStaticContext(){ 
    const context=this._context
    if (this._staticContext.length > 0) {
      for (const [key,value] of Object.entries(context)) {
        if (this._staticContext.includes(key)) {
          this._staticContext=this._staticContext.filter(value =>value !== key)
        }
      }
    }
  }
  async remove(callback){
    if (typeof this._kill === 'function' && this._isKill && this._deCompositionElement) {
      this._kill()
      return
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
            console.log(callback)
            callback?.()
          }
          return true
    }
  }
 async unMount(){
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
        //  console.log(child);
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
    if (this._avoidPawaRender) {
      return
    }
    const tag = this._el.tagName
   try {
      if (components.has(splitAndAdd(tag))) {
      this._elementType='component'
      this._componentOrTemplate=true
      this._deCompositionElement=true
      this._componentName=splitAndAdd(tag)
      this._component=new PawaComponent(components.get(splitAndAdd(tag)))
      Array.from(this._el.children).forEach(slot =>{
        if (slot.tagName === 'TEMPLATE' && slot.getAttribute('prop') && !slot.hasAttribute('js')) {
          this._slots.appendChild(slot)
        }
      })
      this._componentChildren=this._el.innerHTML
      
    } else if(tag ==='TEMPLATE'){
      this._elementType='template'
      this._deCompositionElement=true
      this._componentOrTemplate=true
    } else {
      this._elementType='element'
      this._componentOrTemplate=false
    }
   } catch (error) {
    console.warn('from element tag identitfier be sure if its the right component',error)
    throw new Error(error);
    
   }
  }
  setProps(){
    if (this._avoidPawaRender) {
      return
    }
    if (!this._context) {
      return
    }
    if (this._componentName) {
      const pawaAttribute=getPawaAttributes()
      const dependAttribute=getDependentAttribute()
      this._attributes.forEach((attr) => {
        if (!attr.name.startsWith(':') && !pawaAttribute.has(attr.name) && !dependAttribute.has(attr.name)) {
          let name=''
                if (attr.name.startsWith('-')) {
                  name=attr.name.slice(1)
                } else {
                  name=attr.name
                }
                this._restProps[name]={name:name,value:attr.value}    
       }else if(!pawaAttribute.has(attr.name) && attr.name.startsWith(':')){
        
        const propsName=attr.name.slice(1) 
        try {
       const keys = Object.keys(this._context);
const resolvePath = (path, obj) => {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
};
const values = keys.map((key) => resolvePath(key, this._context));
if(attr.value === '') attr.value=true;
const value=new Function(...keys,`
  return ()=>{
    try{
  const prop= ${replaceTemplateOperators(attr.value)};
  if(prop === '')return prop
  return prop
  }catch(error){
    console.error(error.message,error.stack)
   }
}
`)(...values)
this._props[propsName]=value
        } catch (error) {
          setPawaDevError({
              message:`error from ${this._componentName} prop :${propsName} ${error.message}`,
              error:error,
              template:this._template
            })
        }
       }
    })
    }
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
    this._forKey=null
    this._forIndex=null
    this._setKey=this.setForKey
    this._endComment=null
    this._keyRemover=this.keyRemoveElement
    this._resetForKeyElement=this.forKeyResetElement
    this._deleteKey=this.deleteKey
  }
  static Element(element){
    const pawa=new PawaComment(element)
    Object.assign(element,pawa)
    return element
  }
  forKeyResetElement(){
    const fragment=document.createDocumentFragment()
    while (this._el.nextSibling !== this._endComment) {
      fragment.appendChild(this._el.nextSibling)
    }
    this._endComment.remove()
    
    return fragment
  }
 async keyRemoveElement(callback,firstElement=true){
 const comment=this._el
    if (!comment?.nextSibling) {
      return
    }
    if (comment.nextSibling === this._endComment) {
      
      return  
    } else {
      if (comment?.nextSibling?.nodeType === 8) {
        if(comment.nextSibling?._controlComponent){
          comment.nextSibling._remove()
                  }else{
          comment.nextSibling.remove() 
        }
           
      } else if (comment.nextSibling.nodeType === 1) {
        if (firstElement) {
          console.log(callback)
          await comment.nextSibling._remove(callback)
        }  else{
          await comment.nextSibling._remove()
        }
        firstElement=false
      }
    }
  await this._el._keyRemover(comment,firstElement)
  }
  deleteKey(){
    this._el.remove()
    this._endComment.remove()
  }
  setForKey(arg=String){
    this._forKey=arg
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
      
      comment?._componentElement?._unMountFunctions.forEach(unMount =>{
        unMount()
      })
      comment?._componentElement?._deleteEffects()
      // console.log('delete');
      
      comment._deleteEffects()
      comment.remove()
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
