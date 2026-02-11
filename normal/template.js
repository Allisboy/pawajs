import {render} from '../index.js'
export const templates=(el,notRender)=>{
    if (el.hasAttribute('p:store')) {
        return
    }
    const comment=document.createComment('<template>')
    const endComment=document.createComment('</template>')
    el.replaceWith(endComment)
    //kill the template element
    el._isKill=true
    const isResume=el.hasAttribute('pawa-render')
    el._kill=()=>{
        pawaWayRemover(comment,endComment)
        comment.remove(),endComment.remove();
    }
    endComment.parentElement.insertBefore(comment,endComment)
    el._underControl=comment
    let element=[]
         Array.from(el.content.children).forEach((child) => {
             endComment.parentElement.insertBefore(child,endComment)
             element.push(child)  
         })
        
         element.forEach(child=>{
            render(child,el._context,isResume?notRender:{ notRender: null, index: null }) 
        })
}