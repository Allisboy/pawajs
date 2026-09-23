export const Graph=(graph)=>{
    const newGraph={
        ref:null,
        nodeType:'',
        async:false,
        props:{},
        componentChildren:[],
        initialInsert:{},
        key:'',
        current:'',
        type:'pawa-dom',
        restProps:{},
        parent:graph ?? null,
        children:[],
        control:{},
        firstTime:true,
        entrance:graph?.entrance || false,
        mount:[],
        onEnter:graph?.onEnter ?[...graph?.onEnter] : [],
        transport:{},
        former:null,
        onExit:graph?.onExit ?[...graph?.onExit] : [],
        unMount:[],
        effect:[],
        reProps:[],
        context:{},
        name:'',
        readOnlyffect:[],
        arrayEffect:[],
        beforeMount:[],
        kill:false,
        unActive:[],
        active:graph?graph.active === false?false:true:true,
        index:graph?.children?.length ?? 0,
        terminate:()=>{
          for (const element of newGraph.effect) {
                element()
            }  
        },
        move:(comment)=>{
            if (newGraph.nodeType === 'template') {
                for (const element of newGraph.children) {
                    
                if (element.nodeType === 8) {
                    comment.parentElement.insertBefore(element,comment)
                }else if (element.nodeType === 1) {
                    comment.parentElement.insertBefore(element,comment)
                }else{
                    element.move(comment)
                }
            }
            }else{
                if (newGraph.ref.nodeType === 8 || newGraph.ref.nodeType === 1) {
                    comment.parentElement.insertBefore(newGraph.ref,comment)
                }else{
                    newGraph.ref.move(comment)
                }
            }
        },
                getElement:(all=false,and=false)=>{
            let Element=all?[]:null
            const push=(r,extra)=>{
                if(all){
                    Element.push({el:r,ref:extra})
                }else{
                    Element=r
                }
            }
            const find=(ref,by)=>{
                if (ref.nodeType === 8) {
                    push(ref,by)
                }else if (ref.nodeType === 1) {
                    push(ref,by)
                }else if (ref.nodeType === 'template' && all) {
                    ref.children.forEach(c=>{
                        if (c?.ref) {
                            find(c.ref,c)
                        }else{
                            push(c,by)
                        }
                    })
                }
                else{
                    if(!ref?.ref)return
                    
                    find(ref.ref,ref)
                }
                
            }
            if (newGraph.ref) {
                find(newGraph.ref,newGraph)
            }
            return Element
        },
        fromParent:()=>{
            const i = graph.children.indexOf(newGraph)
            if (i !== -1) graph.children.splice(i, 1)
        },
        killDown:()=>{
            for (const element of newGraph.children) {
                element.kill=true
                element?.killDown?.()
            }
        },
        updateRef:()=>{
            if (newGraph.children.length > 0) {
                newGraph.ref=newGraph.children[0]
            }
        },
        remove:async(node=true)=>{
            const elements=newGraph.getElement(true)
            let promise
            if (node) {
                promise=Promise.all(elements.map(async ({el,ref})=>{
                    if (el.nodeType === 8) {
                        return
                    }
                    if (newGraph?.hmr) {
                     el.remove()
                     return   
                    }
                    for (const exit of ref.onExit) {
                        await exit(el)
                    }
                    el.remove()
                    
                }))
            }else{
                promise=Promise.resolve()
            }
            if(newGraph?.kill)newGraph.terminate();
            for (const element of newGraph.unMount) {
                element()
            }
             
             if(newGraph.ref.nodeType === 8 && newGraph.kill)newGraph.ref.remove(false)
                const children=Array.from(newGraph.children)
                for (const element of children) {
                    element.kill=true
                    element?.fromParent?.()
                    if (element?.ref) {
                        await element.remove(false)
                }
            }
            newGraph.ref=null   
           
            return promise
        }
    }
    if (graph && !graph?.ref) {
        graph.ref=newGraph
    }
    graph?.children?.push(newGraph)
    
    return newGraph
}