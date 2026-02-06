import { createEffect } from '../reactive.js';
import { render, $state, keepContext,restoreContext} from '../index.js';
import { PawaComment, PawaElement } from '../pawaElement.js';
import { processNode, pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';
import { merger_switch } from '../merger/switch.js';
export const normal_Switch=(el, attr, stateContext,endComment,chainMap,chained)=>{
    
        const comment = document.createComment(`switch`)
        el._out = true
        const parent = endComment.parentElement
        el._deCompositionElement = true
        el._isKill = true
        el._kill = () => {
            pawaWayRemover(comment, endComment)
            comment.remove(), endComment.remove();
        }
        PawaComment.Element(comment)
        comment._setCoveringElement(el)
        parent.insertBefore(comment, endComment)
        el._underControl = comment
        const context = el._context
        let firstEnter = false
        comment._controlComponent = true
       const evaluate=merger_switch(el,attr,stateContext,false,
        {comment,endComment,chained,chainMap})
        createEffect(() => {
            evaluate()
        }, el)
}