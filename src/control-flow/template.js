import { PawaRender } from "../graph/index.js"

export const template=(el,context,graph)=>{
    const original=!el.hasAttribute('p:store') || !el.hasAttribute('p:hydate')
    if(!original)return
    const {render,renderGraph}=PawaRender(graph,context)
    renderGraph.nodeType='template'
    const comment=document.createComment('template')
    el.replaceWith(comment)
    const children=Array.from(el.content.children)
    for (const element of children) {
        comment.parentElement.insertBefore(element, comment)
    }
    for (const element of children) {
        renderGraph.next=true
        render(element)
    }
    if (children.length > 0) {
        comment.remove()
    }else{
        // renderGraph.ref=
    }
    renderGraph.firstTime=false
    
}