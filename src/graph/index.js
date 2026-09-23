import { createComponent } from "../component/index.js"
import { attribute } from "../control-flow/attribute.js"
import { Awaits } from "../control-flow/await.js"
import { ForEach } from "../control-flow/for.js"
import { condition } from "../control-flow/if.js"
import { Key } from "../control-flow/key.js"
import { ref } from "../control-flow/ref.js"
import { state } from "../control-flow/state.js"
import { template } from "../control-flow/template.js"
import { text } from "../control-flow/text.js"
import { after, every } from "../control-flow/timers.js"
import { addLazyComponentElement, components, lazyComponentElement, lazyComponents } from "../global.js"
import { triggerLazyLoad } from "../hooks/registerComponent.js"
import { ElementProperty, PawaElement } from "../pawaElement.js"
import { splitAndAdd } from "../utils.js"
import { Graph } from "./graph.js"
import { createManifest, generateManifest, setManifest } from "./setup.js"
import { errorControl } from "../reactive.js"


const PawaAttribute={

}
export const PawaRender=(graph,contexts)=>{
    let context={...contexts}
    const renderGraph=Graph(graph)
    const server=typeof window === 'undefined'
    const render=(el,refresh=true)=>{
        if (el.hasAttribute('pawa-avoid')) {
            return
        }
            try {
        const manifest=createManifest(el)
        let control={
            stop:false
        }
        
        for (const element of manifest) {
            if(control.stop)return
            const attr={name:element,value:el.getAttribute(element)}
            if (element.startsWith('state-')) {
                state(el,{name:element,value:el.getAttribute(element)},context)
            }else if (element === 'if' || element === 'else' || element === 'else-if') {
                control.stop=true
                if(element !== 'if')return
                condition(el,attr,context,renderGraph)
            }else if(element === 'for-each'){
                control.stop=true
                ForEach(el,attr,context,renderGraph)
            }else if(element === 'key'){
                control.stop=true
                Key(el,attr,context,renderGraph)
            }else if(element === 'await' || element === 'as-fallback' || element === 'as-catch'){
                control.stop=true
                if(element !== 'await') return
                Awaits(el,attr,context,renderGraph)
            }

        }
        if(control.stop)return
        if (el.tagName === 'TEMPLATE') {
            control.stop=true
            template(el,context,renderGraph)
        }
        if(control.stop)return
        if(components.has(splitAndAdd(el.tagName))){
            control.stop=true
            createComponent(el,context,renderGraph)
        }
        if(control.stop)return
        if (lazyComponents.has(splitAndAdd(el.tagName))) {
            control.stop=true
            addLazyComponentElement(el,()=>createComponent(el,context,renderGraph)) 
            triggerLazyLoad(splitAndAdd(el.tagName))
            
        }
        if(control.stop)return
        if (Array.from(el.childNodes).some(node =>
            node.nodeType === Node.TEXT_NODE && node.nodeValue.includes('@{')
        ) && refresh) {
            text(el,context,renderGraph)
        }
        if(control.stop)return
        if (!renderGraph.ref) renderGraph.ref=el
        PawaElement(el,context)
        
        for (const attr of el.attr()) {
            let name=attr.name

            if (name.startsWith('#') || name.startsWith('-')) {
                el.removeAttribute(name)
              name=name.slice(1)
            }
            const attrs={
                name:name,value:attr.value
            }
            if (name.startsWith('on-')) {
                el.on(el,attr,context,renderGraph)
            }else if (name === 'ref'){
                ref(el,{name:name,value:attr.value},context,renderGraph)
            }
            else if(name.startsWith('@') && !attr.value.includes('@{')){
                el.removeAttribute(name)
                const newName=name.slice(1).replace(/-([a-z])/g, (g) => g[1].toUpperCase());
                ElementProperty(el,newName,attr.value,renderGraph,context)
            }else if(attr.value.includes('@{')){
                attribute(el,{name:name,value:attr.value},context,renderGraph)
            }else if (name.startsWith('after-[')) {
                after(el,attrs,context,renderGraph)
            }else if (name.startsWith('every-[')) {
                every(el,attrs,context,renderGraph)
            }
        }
        el.graph=renderGraph
        el.context=context
        const entrance=renderGraph.onEnter
        const exit=renderGraph.onExit
        if (renderGraph.nodeType === 'template' && refresh && renderGraph?.next) {
            renderGraph.children.push(el)
            renderGraph.next=false
            
        }
        if (renderGraph.entrance) {
           for (const enter of renderGraph.onEnter) {
            enter(el)
           }
        }
        renderGraph.onEnter=[]
        renderGraph.onExit=[]
        if(!refresh)return
        const children = Array.from(el.children)
        for (const element of children) {
            render(element)
            
        }
        renderGraph.onEnter=entrance
        renderGraph.onExit=exit
            } catch (error) {
                errorControl(error, {
                    effect: 'control-flow',
                    el,
                    template: el?.outerHTML,
                })
            }
    }
    const setContext=(contexts)=>{
        context=contexts
    }
    renderGraph.render=render
    renderGraph.context=context
    renderGraph.setContext=setContext
    return {render,renderGraph,setContext}
}