/**
 * Runtime graph instance used by the render pipeline.
 * Owns lifecycle, effects, and DOM refs for a component or control-flow region.
 * Not a virtual DOM node — structural ownership only.
 */
export interface PawaGraph {
  /** DOM node, comment anchor, or nested graph root this instance controls. */
  ref: any;

  /** Semantic kind of this node (e.g. component, condition, for-each, template). */
  nodeType: string;

  /** Whether this region is tied to async work (e.g. await). */
  async: boolean;

  /** Resolved or reactive props for a component instance. */
  props: Record<string, any>;

  /** Child component instances or slot-related nodes. */
  componentChildren: any[];

  /** Values inserted into template scope at setup (useInsert / initial bindings). */
  initialInsert: Record<string, any>;

  /** Stable identity for list/key regions. */
  key: string;

  /** Current branch or control-flow cursor (e.g. active condition id). */
  current: string;

  /** High-level graph category (e.g. pawa-dom). */
  type: string;

  /** Attributes/props not mapped into the main props object. */
  restProps: Record<string, any>;

  /** Parent graph, or null at the root. */
  parent: PawaGraph | null;

  /** Child ownership graphs (nested components and control flow). */
  children: PawaGraph[];

  /** Control-flow anchor (often a comment) or related control metadata. */
  control: Record<string, any>;

  /** True until the first successful mount/continue pass completes. */
  firstTime: boolean;

  /** Whether enter transitions/hooks should run on the next paint. */
  entrance: boolean;

  /** Mount callbacks scheduled after the instance is attached. */
  mount: Function[];

  /** Enter transition/lifecycle hooks (e.g. Transition onEnter). */
  onEnter: Function[];

  /** Cross-boundary bag (e.g. values carried across component graphs). */
  transport: Record<string, any>;

  /** Previous graph or boundary context when replacing an instance. */
  former: any;

  /** Exit transition/lifecycle hooks; may be async. */
  onExit: Function[];

  /** Cleanup callbacks run on teardown (subscriptions, timers, etc.). */
  unMount: Function[];

  /** Effect disposer functions registered under this graph. */
  effect: Function[];

  /** Server/client prop-recall handlers when props change after continue. */
  reProps: any[];

  /** Template/evaluation context for this instance. */
  context: Record<string, any>;

  /** Debug or component display name. */
  name: string;

  /** Effects that do not write (read-only tracking helpers). */
  readOnlyffect: any[];

  /** List/array-driven effects (e.g. for-each drivers). */
  arrayEffect: any[];

  /** Callbacks run before mount. */
  beforeMount: Function[];

  /** When true, teardown should dispose this node and descendants. */
  kill: boolean;

  /** Inactive (paused) effect or child bookkeeping for Active-style regions. */
  unActive: any[];

  /** Whether this region is active and should apply updates. */
  active: boolean;

  /** Index among parent.children. */
  index: number;

  /** Runs all registered effect disposers. */
  terminate: () => void;

  /**
   * Moves this node's DOM (and nested structure) relative to a comment anchor.
   * Used for list reorder and branch placement.
   */
  move: (comment?: any) => void;

  /**
   * Resolves the underlying DOM element(s) from ref chains.
   * @param all When true, collect multiple roots (e.g. template graphs).
   * @param and Reserved/extension flag for multi-root resolution.
   */
  getElement: (all?: boolean, and?: boolean) => any;

  /** Removes this node from parent.children. */
  fromParent: () => void;

  /** Marks this node and all descendants with kill for teardown. */
  killDown: () => void;

  /** Refreshes ref after DOM swap or continue adopt. */
  updateRef: () => void;

  /**
   * Tears down lifecycle, effects, and DOM for this subtree.
   * @param node When true, prefer node-level removal semantics.
   */
  remove: (node?: boolean) => Promise<any>;

  /**
   * Renders or continues into an element.
   * @param refresh When false, bind the host only (continue / no deep child walk).
   */
  render?: (el: HTMLElement, refresh?: boolean) => void;

  /** Replaces the evaluation context used by nested render. */
  setContext?: (contexts: Record<string, any>) => void;

  /** Extension bag for SSR flags, plugins, and internal metadata. */
  [key: string]: any;
}

/**
 * Runtime dev metadata produced by the Pawa debugging tools.
 * Tracks errors, effect/render counts, and coarse performance samples.
 */
export interface PawaDev {
  /** Whether the debug tool layer is active. */
  tool: boolean;

  /** Collected runtime errors and warnings. */
  errors: any[];

  /** Number of effects registered or run while debugging. */
  totalEffect: number;

  /** Number of render passes observed. */
  renderCount: number;

  /** Timing samples for renders, effects, and components. */
  performance: {
    /** Render durations (ms samples). */
    renderTime: number[];
    /** Effect durations (ms samples). */
    effectTime: number[];
    /** Component setup durations (ms samples). */
    componentTime: number[];
    /** Session or batch start timestamp. */
    start: number;
    /** Session or batch end timestamp. */
    end: number;
  };

  /** Live component set or aggregated component count. */
  components: Set<any> | number;

  /** Subscribers notified on debug events. */
  listeners: Set<Function>;

  /**
   * Subscribes to debug bus events.
   * @returns Unsubscribe function.
   */
  subscribe(cb: (event: { type: string; data: any }) => void): () => void;

  /** Emits a debug event to all subscribers. */
  emit(type: string, data: any): void;

  /**
   * Records a structured error or warning for the dev overlay and logs.
   */
  setError(options?: {
    el?: HTMLElement;
    msg?: string;
    directives?: string;
    stack?: string;
    template?: string;
    warn?: boolean;
    effect?: any;
    ref?: any;
    exp?: string;
  }): any;

  /** Clears the collected error list. */
  clearErrors(): void;

  /** Returns a serializable snapshot of debug counters and errors. */
  getSnapshot(): {
    renderCount: number;
    totalEffect: number;
    performance: any;
    errors: any[];
    componentCount: number;
    [key: string]: any;
  };

  /** Logs a render timing sample. */
  logRender(c: any, t: any): void;

  /** Logs an effect timing sample. */
  logEffect(e: any, t: any): void;

  /** Logs a component setup timing sample. */
  logComponent(n: any, t: any): void;
}

/**
 * HTMLElement augmented with Pawa runtime fields after render/continue.
 */
export interface PawaElement extends HTMLElement {
  /** Active template/evaluation context for this element. */
  context: object;

  /** Owning structure graph for this host, when bound. */
  graph: PawaGraph;

  /**
   * Runs a keyframe-style animation helper when provided by the runtime.
   * @param frames Class or style frame list.
   */
  animation: (frames: string[]) => Promise<void>;

  /** Runtime-added fields (bindings, markers, etc.). */
  [key: string]: any;
}
/**
 * Context handle used by the component context API.
 */
export interface ContextHandle<T = any> {
  id: string;
  setValue: (val?: T) => void;
}

/**
 * Input accepted by the state factory.
 */
export type StateInput<T> = T | (() => T) | (() => Promise<T>);

/**
 * Reactive state container.
 */
export interface State<T> {
  value: T;
  readonly id: string;
  async?: boolean;
  failed?: boolean;
  retry?: () => void;
}

/**
 * Plugin callback signature used by the dev-plugin system.
 */
export interface PluginCallback {
  (el: HTMLElement | PawaElement, attr: { name: string; value: string }, graph?: any, context?: any): void | (() => void);
}

/**
 * Attribute plugin declaration.
 */
export interface AttriPlugin {
  startsWith?: string;
  fullName?: string;
  mode?: null | 'client' | 'server';
  dependency?: string[];
  plugin: PluginCallback;
}



/**
 * Starts the Pawa application and mounts the root graph into the given element.
 * @param el The root application container.
 * @param context Optional render context.
 */
export const pawaStartApp: (el: HTMLElement, context?: Record<string, any>) => void;

/**
 * Enables or disables the developer tooling.
 * @param enabled Toggle the runtime debugger.
 */
export const pawaDebug: (enabled?: boolean) => PawaDev;

/**
 * Sets the development mode flag and creates the debug instance.
 * @param enabled Whether debug mode should be active.
 */
export const setDevelopment: (enabled?: boolean) => PawaDev;

/**
 * Returns the active development flag.
 */
export const getDevelopment: () => boolean;

/**
 * Enables or disables the Pawa debug runtime.
 * @param enabled Debug flag.
 */
export const setDev: (enabled?: boolean) => PawaDev;

/**
 * Registers a custom directive plugin.
 * @param name Plugin name.
 * @param callback Plugin callback.
 */
export const Plugin: (name: string, callback: PluginCallback) => void;

/**
 * Creates a reactive state container.
 * @param initialValue Initial state value or a factory function.
 * @param section Optional storage key or dependency list.
 */
export const $state: <T>(initialValue: StateInput<T>, section?: string | null | Function[] | Object[] | string[]) => State<T>;

/**
 * Detects whether a value is a Pawa proxy.
 * @param value Value to inspect.
 */
export const isProxy: (value: any) => boolean;

/**
 * Conditional visibility helper component.
 */
export const Active: (props: { show: () => boolean; [key: string]: any }) => string;

/**
 * Transition helper for enter/exit animation hooks.
 */
export const Transition: (props: {
  name?: () => string;
  duration?: () => number;
  enter?: () => any;
  exit?: () => any;
  [key: string]: any;
}) => string;

/**
 * Exposes variables into the current component template scope.
 * @param obj Variables to expose.
 */
export const useInsert: (obj?: Record<string, any>) => void;

/**
 * Creates a ref object.
 */
export const useRef: <T = any>() => { value: T | null };

/**
 * Tagged template helper for HTML strings.
 */
export const html: {
  (strings: TemplateStringsArray, ...values: any[]): string;
  (template: string): string;
};

/**
 * Creates a context provider handle.
 */
export const setContext: <T = any>() => ContextHandle<T>;

/**
 * Reads a context value from the currently active component graph.
 * @param context Context handle returned by setContext().
 */
export const useContext: <T = any>(context: ContextHandle<T>) => T | undefined;

/**
 * Validates a component's prop contract.
 * @param component Component constructor.
 * @param object Prop validation map.
 */
export const useValidateComponent: (component: Function, object: Record<string, any>) => void;

/**
 * Registers one or more component constructors into the global registry.
 */
export const RegisterComponent: {
  (...args: Array<string | Function>): void;
  /**
   * Registers lazy components keyed by name.
   */
  lazy: (...args: Array<string | string[] | Function>) => Promise<void>;
};

/**
 * Runs a lifecycle or reactive side effect.
 * @param callback Effect callback.
 * @param deps Dependency set or lifecycle mode.
 */
export const runEffect: (callback: (comment?: any) => void | (() => void), deps?: any[] | object | number | null) => void;

/**
 * Reads the parent component context.
 */
export const useInnerContext: <T = any>() => T | undefined;

/**
 * Forwards props into the current component scope.
 * @param props Props object to forward.
 */
export const forwardProps: (props?: Record<string, any>) => void;

/**
 * Mounts the visual devtools panel.
 * @param options Optional devtools options.
 */
export const mountPawaDevtools: (options?: { open?: boolean }) => () => void;

/**
 * Removes the devtools panel from the page.
 */
export const unmountPawaDevtools: () => void;

/**
 * Exposes the current root graph instance.
 */
export const RootGraph: any;

/**
 * Updates the current component graph.
 */
export const setComponentGraph: (graph: any) => void;

/**
 * Reads the current component graph.
 */
export const getComponentGraph: () => any;

/**
 * Creates a persistent store that mirrors a state value in localStorage.
 * @param createCall Factory that returns the initial state value.
 * @param name Storage key.
 */
export const useStorage: (createCall: () => any, name: string) => any;

/**
 * Schedules a reactive update batch.
 * @param callback Callback to run through the scheduler.
 */
export const schedule: (callback: () => void) => void;

/**
 * Creates a render graph node.
 * @param graph Optional parent graph.
 */
export const Graph: (graph?: any) => PawaGraph;

/**
 * Creates or reuses the render graph used by the runtime.
 */
export const PawaRender: (graph: any, contexts?: Record<string, any>) => {
  render: (el: HTMLElement, refresh?: boolean) => void;
  renderGraph: PawaGraph;
  setContext: (contexts: Record<string, any>) => void;
};

declare global {
  var __pawaDev: PawaDev;
  var __PAWA_DEBUG__: boolean;
}
