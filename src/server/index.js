let server=typeof window === "undefined"

export const isServer=()=>server
const serverInstance={
  useInsert:null,
  useInnerContext:null,
  setContext:null,
  useContext:null,
  $state:null,
  runEffect:null,
  forwardProps:null,
  useRef:null,
  isProxy:null,
  getComponentGraph:null,
  setComponentGraph:null,
}
export const getServerInstance=()=>serverInstance
export const setServer=(obj={})=>{
  for (const [key,value] of Object.entries(obj)) {
      serverInstance[key]=value
  }
}
