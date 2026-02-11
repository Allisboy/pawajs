let server=typeof window === "undefined"

export const isServer=()=>server
const serverInstance={
  useInsert:null,
  useInnerContext:null,
  setContext:null,
  useContext:null,
  $state:null,
  accessChild:null,
  useServer:null,
}
export const getServerInstance=()=>serverInstance
export const setServer=(obj={})=>{
  for (const [key,value] of Object.entries(obj)) {
    if (serverInstance[key] === null) {
      serverInstance[key]=value
    }
  }
}
