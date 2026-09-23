import { splitAndAdd } from "./utils.js"

export const components=new Map()
export const hmrComponentsMap=new Map()
export const lazyComponents=new Map()
export const customEventMap=new Map()
export const lazyComponentElement=new Map()

export const addLazyComponentElement=(element,func)=>{
    const tagName=typeof element === 'string'?splitAndAdd(element.toLocaleUpperCase()):splitAndAdd(element.tagName)
    if (lazyComponentElement.has(tagName)) {
        lazyComponentElement.get(tagName).push({element:element,func})
    }else{
        lazyComponentElement.set(tagName, [{element:element,func}])
    }
}
function isPawaState(obj) {
  if(typeof obj !== 'object')return false
  return (
    obj !== null &&
    typeof obj === 'object' &&
    Object.prototype.hasOwnProperty.call(obj, 'value') &&
    typeof obj.id === 'string'
  )
}

export function snapshotInsert(ctx) {
  const snapshot = {}

  for (const key of Object.keys(ctx)) {
    const val = ctx[key]
    const raw = isPawaState(val) ? val.value : val

    if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') {
      snapshot[key] = raw
      continue
    }
    if (raw === null || raw === undefined) {
      snapshot[key] = raw
      continue
    }
    if (typeof raw !== 'object') {
      // function, symbol, bigint
      snapshot[key] = undefined
      continue
    }

    let lossy = false
    try {
      const json = JSON.stringify(raw, (_k, v) => {
        if (typeof v === 'function' || typeof v === 'symbol') {
          lossy = true
        }
        return v
      })
      snapshot[key] = lossy ? undefined : json
    } catch (error) {
      snapshot[key] = undefined
    }
  }
// console.log(snapshot);

  return snapshot
}

export function sameInitial(a, b) {
  if (a === undefined || b === undefined) return false 
  try {
    return a === b
  } catch {
    return false
  }
}

export function restorePawaStateFromContext(oldCtx, newCtx,hmrinitial ) {
  if (!oldCtx || !newCtx) return

  const prevInitials = hmrinitial 
  const freshInitials = snapshotInsert(newCtx)
  for (const key of Object.keys(newCtx)) {
    const oldVal = oldCtx[key]
    const newVal = newCtx[key]

    const initializerChanged =
      prevInitials !== undefined &&
      Object.prototype.hasOwnProperty.call(prevInitials, key) &&
      !sameInitial(prevInitials[key], freshInitials[key])

    if (isPawaState(newVal) && isPawaState(oldVal) && typeof newVal.value === typeof oldVal.value ) {
      newVal.value = oldVal.value
    }
  }
}
