import { createEffect } from '../reactive.js';
import { render, $state, keepContext,restoreContext} from '../index.js';
import { PawaComment, PawaElement } from '../pawaElement.js';
import { processNode, pawaWayRemover, safeEval, getEvalValues, setPawaDevError, checkKeywordsExistence } from '../utils.js';
import { merger_key } from '../merger/key.js';
export const normal_key=(el, attr, stateContext,endComment,chainMap,chained)=>{
    
        const comment = document.createComment(`condition`)
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
        comment._controlComponent = true
       const evaluate=merger_key(el,attr,stateContext,false,
        {comment,endComment})
        createEffect(() => {
            evaluate()
        }, el)
}