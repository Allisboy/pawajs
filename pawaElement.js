import {components,escapePawaAttribute,getPawaAttributes,getDependentAttribute,getPrimaryDirectives } from './index.js';
import {splitAndAdd,replaceTemplateOperators,setPawaDevError,getEvalValues} from './utils.js';
import PawaComponent from './pawaComponent.js';


export class PawaElement {
  
  #context
  /**
   * 
   * @param {HTMLElement} element 
   * @param {object} context 
   */
  constructor(element,context) {
  this.#context=context
    const div=element.cloneNode(true)
    Object.assign(this, {
      _resetEffects: new Set(), _context: context, _avoidPawaRender: element.hasAttribute('pawa-avoid'),
      _el: element, _out: false, _stateContext: null, _terminateEffects: new Set(), _deleteEffects: this.terminateEffects,
      _slots: document.createDocumentFragment(), _mainAttribute: {}, _preRenderAvoid: [], _running: false,
      _hasForOrIf: this.hasForOrIf, _elementContent: element.textContent, _textContent: {}, _attributes: [],
      _template: div.outerHTML, _exitAnimation: null, _component: null, _unMountFunctions: [], _MountFunctions: [],
      _elementType: '', _getNode: this.getNode, _componentOrTemplate: false, _props: {}, _isView: null,
      _isElementComponent: false, _pawaAttribute: {}, _setUnMount: this.setUnMounts, _componentName: '',
      _attrElement: this.getNewElementByRemovingAttr, _attr: {}, _staticContext: [], _checkStatic: this.reCheckStaticContext,
      _callMount: this.mount, _callUnmount: this.unMount, _remove: this.remove, _componentChildren: undefined,
      _pawaElementComponent: null, _componentTerminate: null, _cacheSetUp: false, _effectsCarrier: null,
      _pawaElementComponentName: '', _reCallEffect: this.reCallEffect, _ElementEffects: new Map(),
      _deCompositionElement: false, _restProps: {}, _kill: null, _isKill: false, _scriptFetching: element.hasAttribute('script'),
      _scriptDone: false, _underControl: null, safeEval: this.safeEval, _reactiveProps: {},
      _clearContext:this.clearContext
    })
    if (this._lazy) this._componentOrTemplate = true
    if(this._avoidPawaRender) {
      element.removeAttribute('pawa-avoid')
      Array.from(element.children).forEach((child) => { if (child.nodeType === 1) child.setAttribute('pawa-avoid','') })
    }
    this.setPawaAttr(); this.elementType(); this.setProps(); this.setAttri(); this.findPawaAttribute()
  }
  
  static Element(element,context){
    const pawa=new PawaElement(element,context)
    Object.assign(element,pawa)
  }
  getChildrenTree(){
    return Array.from(this._el.children)
  }
  
   safeEval(context,expression,directive,resolve=false){
  try{
    const keys = Object.keys(context);
  const resolvePath = (path, obj) => {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };
  if(resolve){
    return new Function(...keys,`
      return ${expression}
      `)(...getEvalValues(context))
  }else{
    return new Function(...keys,`
      return ${expression}    
      `)
  }
  
  }catch(error){
    __pawaDev.setError({ 
      el:this?._el, 
      msg:`from ${expression}`, 
      directives:directive, 
      stack:error.stack, 
      template:this?._template, 
     })
  }
}

  reCallEffect(){
    this._resetEffects.forEach((call)=>{
      call()
    })
  }
  setPawaAttr(){
    const isResume=this._el.hasAttribute('p:c')
    if (this._el.hasAttribute('p-async')) return
    if(isResume){
      const pawaAttr=this._el.getAttribute('p:c')
      const array=pawaAttr.split(';')
      array.forEach(value =>{
        if(!this._el.hasAttribute(value)) return
        this._attributes.push({name:value,value:this._el.getAttribute(value)})
      })
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
    const primary=getPrimaryDirectives()
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
      const animate=this._exitAnimation().then(async () => {
         await this._callUnmount()
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
      this._callUnmount()
          this._out=true
          this._el.remove()
          if (callback) {
            callback()
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
         child._callUnmount()   
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
  clearContext(){
    if (!__pawaDev.tool) {
      this._context={}
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
      const hasPC=this._el.hasAttribute('p:c')
      if (hasPC) {
        Array.from(this._el.attributes).forEach(attr => {
          if (attr.name.startsWith('c-') || attr.name === 'by') return
           this._attributes.push({name:attr.name,value:attr.value})
        });
      } 
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
        if(attr.value === '') attr.value="true";
        const expression=`()=>{
            try{
          const prop= ${replaceTemplateOperators(attr.value)};
          if(prop === '')return prop
          return prop
          }catch(error){
            console.error(error.message,error.stack)
           }
        }`
        const value=this.safeEval(this._context,expression,`prop sdvd :${propsName}`,true)
        if (value) {
          let name=propsName
                if(name.includes('-')){
                     name=name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                }
          this._props[name]=value
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
    this._deletKey=this.deleteKey
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
        // console.log(comment)
        if(comment.nextSibling?._controlComponent){
          comment.nextSibling._remove()
        }else{
          comment.nextSibling.remove() 
        }
           
      } else if (comment.nextSibling.nodeType === 1) {
        if (firstElement) {
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
