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
        insertAfter: (node) => {
    if (newGraph.nodeType === 'template') {
         for (const element of newGraph.children) {
                    
                if (element.nodeType === 8) {
                    comment.parentElement.after(node)
                }else if (element.nodeType === 1) {
                    comment.parentElement.after(node)
                }else{
                    element.insertAfter(node)
                }
            }
    } else {
        if (newGraph.ref.nodeType === 8 || newGraph.ref.nodeType === 1) {
            node.after(newGraph.ref)
        } else {
            newGraph.ref.insertAfter(node)
        }
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
               getElement: (all = false) => {
    const result = []
    const seen = new Set()
    const isDom = (n) => n && (n.nodeType === 1 || n.nodeType === 8)

    // returns true when we've found what we need (first-element mode)
    const walk = (node, owner) => {
        if (!node || seen.has(node)) return false
        seen.add(node)

        // raw DOM node sitting directly in a template's children
        if (isDom(node)) {
            result.push({ el: node, ref: owner })
            return !all
        }

        // graph that owns a real element/comment: this is the nearest output
        if (node.nodeType !== 'template' && isDom(node.ref)) {
            result.push({ el: node.ref, ref: node })
            return !all
        }

        // no DOM output of its own (null ref, graph ref, or template):
        // look through its ref (if it's a graph) and then its children in order
        const next = node.ref && !isDom(node.ref)
            ? [node.ref, ...node.children]
            : node.children

        for (const child of next) {
            if (walk(child, node)) return true
        }
        return false
    }

    walk(newGraph, newGraph)

    return all ? result : (result[0]?.el ?? null)
},
findNextEl : (g) => {
    while (g?.parent) {
        const sibs = g.parent.children
        for (let i = sibs.indexOf(g) + 1; i < sibs.length; i++) {
            const el = sibs[i].getElement?.()
            if (el) return el
        }
        g = g.parent
    }
    return null
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
            if (!node) {
                newGraph.active=false
            }
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
            
            if(newGraph.ref?.nodeType === 8 && newGraph.kill)newGraph.ref.remove(false)
                const children=Array.from(newGraph.children)
                for (const element of children) {
                    element.kill=true
                    element?.fromParent?.()
                    if (element?.type === 'pawa-dom') {
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