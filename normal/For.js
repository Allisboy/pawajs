import { createEffect } from '../reactive.js';
import { pawaWayRemover} from '../utils.js';
import { merger_for } from '../merger/for.js';
export const normal_For = (el, attr, stateContext, endComment) => {
    const exp = new WeakMap()
    const value = attr.value
    const split = value.split(' in ')
    const arrayName = split[1]
    const arrayItems = split[0].split(',')
    const arrayItem = arrayItems[0]
    const indexes = arrayItems[1]
    const comment = document.createComment(`${attr.value}`)
    endComment.parentElement.insertBefore(comment, endComment)
    el._underControl = comment
    const unique = crypto.randomUUID()
    const insertIndex = new Map()
    const elementArray = new Set()
    el._deCompositionElement = true
    el._isKill = true
    el._kill = () => {
        pawaWayRemover(comment, endComment)
        comment.remove(), endComment.remove();
    }
    const evaluate = merger_for(el, stateContext, attr, arrayName, arrayItem, indexes, false,
        { comment, endComment, unique, elementArray, insertIndex })
    createEffect(() => {
        evaluate()
    })

}