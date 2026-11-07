import { Active } from "./src/builtIn/Active.js";
import { Transition } from "./src/builtIn/viewTransition.js";
import { getDev, setDev } from "./src/dev/index.js";
import { Plugin } from "./src/dev/plugin.js";
import { PawaRender } from "./src/graph/index.js";
import {
   forwardProps,
  html,
  runEffect,
  setContext,
  useAsync,
  useContext,
  useInnerContext,
  useInsert,
  useRef,
  useValidateComponent,
} from "./src/hooks/index.js";
import { RegisterComponent, triggerLazyLoad } from "./src/hooks/registerComponent.js";
import { $state, isProxy, schedule, stateWatch, useStorage } from "./src/hooks/state.js";
import { components, hmrComponentsMap, lazyComponentElement, lazyComponents,snapshotInsert,sameInitial,addLazyComponentElement } from "./src/global.js";
import { getComponentGraph, setComponentGraph,createComponent,keepComponentGraph } from "./src/component/index.js";
import { queueEffect,trigger,TransMap,activeEffect,createEffect,deleteEffect,errorControl,listeners,runWithEffect,stopEffect,targetMap,track } from "./src/reactive.js";
import { propsValidator,sanitizeTemplate } from "./src/component/utils.js";
import { getContexters,processNode,safeEval,splitAndAdd } from "./src/utils.js";
import { initialize  as ifInitializer} from "./src/control-flow/if.js";
import { initializer as forInitializer } from "./src/control-flow/for.js";
import { initializer as keyInitializer } from "./src/control-flow/key.js";
import { setChained } from "./src/control-flow/utils.js";
import { Graph } from "./src/graph/graph.js";
import { ElementProperty } from "./src/pawaElement.js";
import { getServerInstance, setServer } from "./src/server/index.js";
import { primaryAttribute } from "./src/store.js";
let RootGraph

export const pawaStartApp = (el, context = {}) => {
  const { render, renderGraph:rootGraph } = PawaRender(null, context);
  RootGraph=rootGraph
  render(el);
};

export const pawaDebug = (enabled = true) => {
  return setDevelopment(enabled)
}
export const setDevelopment = (enabled = true) => {
  const shouldEnable = Boolean(enabled)
  
  if (typeof globalThis !== 'undefined') {
    globalThis.__PAWA_DEBUG__ = shouldEnable
  } 
  if (typeof window !== 'undefined') {
    window.__PAWA_DEBUG__ = shouldEnable
  }

  return setDev(shouldEnable)
}
export const getDevelopment = () => getDev()
export {
  useAsync,
  primaryAttribute,
  getServerInstance,
  setServer,
  ElementProperty,
  Graph,
  ifInitializer,
  keyInitializer,
  setChained,
  forInitializer,
  stateWatch,
  getContexters,
  processNode,
  safeEval,
  trigger,
  activeEffect,
  createEffect,
  errorControl,
  listeners,
  runWithEffect,
  stopEffect,
  propsValidator,
  sanitizeTemplate,
  targetMap,
  track,
  splitAndAdd,
  queueEffect,
  createComponent,
  keepComponentGraph,
  snapshotInsert,
  sameInitial,
  addLazyComponentElement,
  setComponentGraph,
  getComponentGraph,
  triggerLazyLoad,
  Plugin,
   $state,
  isProxy,
   Active,
  Transition,
  useInsert,
  useRef,
  html,
  setContext,
  useContext,
  RegisterComponent,
  useValidateComponent,
  runEffect,
  useInnerContext,
  forwardProps,
  components,
  hmrComponentsMap,
  lazyComponents,
  lazyComponentElement,
  PawaRender,
  setDev,
  schedule,
  useStorage
};
export { RootGraph };
