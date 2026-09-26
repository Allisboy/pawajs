import { Active } from "./src/builtIn/Active.js";
import { Transition } from "./src/builtIn/viewTransition.js";
import { getDev, setDev } from "./src/dev/index.js";
import { Plugin } from "./src/dev/plugin.js";
import { Graph } from "./src/graph/graph.js";
import { PawaRender } from "./src/graph/index.js";
import {
   forwardProps,
  html,
  runEffect,
  setContext,
  useContext,
  useInnerContext,
  useInsert,
  useRef,
  useValidateComponent,
} from "./src/hooks/index.js";
import { RegisterComponent } from "./src/hooks/registerComponent.js";
import { $state, isProxy, schedule, useStorage } from "./src/hooks/state.js";
import { getComponentGraph, setComponentGraph } from "./src/component/index.js";
import { components, hmrComponentsMap, lazyComponents } from "./src/global.js";
import { safeEval } from "./src/utils.js";

let RootGraph;
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
  safeEval,
  lazyComponentElement,
  lazyComponents,
  hmrComponentsMap,
  components,
  PawaRender,
  setComponentGraph,
  useStorage,
  schedule,
  Graph,
  PawaRender,
  getComponentGraph,
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
  setDev
};

export { RootGraph };
