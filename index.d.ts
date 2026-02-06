export interface PawaElement extends HTMLElement {
    _running: boolean;
    _context: any;
    _staticContext: any[];
    _resetEffects: Set<Function>;
    _avoidPawaRender: boolean;
    _el: HTMLElement;
    _out: boolean;
    _terminateEffects: Set<Function>;
    _deleteEffects: () => void;
    _slots: DocumentFragment;
    _mainAttribute: Record<string, any>;
    _preRenderAvoid: string[];
    _lazy: boolean;
    _await: boolean;
    _hasForOrIf: () => boolean;
    _elementContent: string | null;
    _textContent: Record<string, string>;
    _attributes: ({ name: string; value: string } | Attr)[];
    _template: string;
    _exitAnimation: (() => Promise<void>) | null;
    _component: any;
    _unMountFunctions: Function[];
    _MountFunctions: Function[];
    _elementType: string;
    _getNode: () => Element | null;
    _componentOrTemplate: boolean;
    _props: Record<string, any>;
    _isView: any;
    _isElementComponent: boolean;
    _pawaAttribute: Record<string, string>;
    _setUnMount: (func: Function) => void;
    _componentName: string;
    _attrElement: (attrName: string) => HTMLElement;
    _attr: Record<string, string>;
    _checkStatic: () => void;
    _callMount: () => void;
    _callUnMOunt: () => Promise<void>;
    _remove: (callback?: Function) => Promise<any>;
    _componentChildren: string;
    _pawaElementComponent: any;
    _componentTerminate: Function | null;
    _cacheSetUp: boolean;
    _effectsCache: HTMLElement | null;
    _effectsCarrier: any;
    _pawaElementComponentName: string;
    _reCallEffect: () => void;
    _ElementEffects: Map<any, any>;
    _deCompositionElement: boolean;
    _restProps: Record<string, any>;
    _kill: Function | null;
    _isKill: boolean;
    _scriptFetching: boolean;
    _scriptDone: boolean;
    _underControl: any;
    _reactiveProps: Record<string, any>;
    getChildrenTree(): Element[];
    reCallEffect(): void;
    setPawaAttr(): void;
    findPawaAttribute(): void;
    setUnMounts(func: Function): void;
    isPawaElementComponent(): void;
    getNode(): Element | null;
    terminateEffects(): void;
    getNewElementByRemovingAttr(attrName: string): HTMLElement;
    setAttri(): void;
    hasForOrIf(): boolean;
    cache(): void;
    effectsCache(): HTMLElement | null;
    reCheckStaticContext(): void;
    remove(callback?: Function): Promise<any>;
    unMount(): Promise<void>;
    mount(): void;
    elementType(): void;
    setProps(): void;
}

export interface AttriPlugin {
    startsWith?: string;
    fullName?: string;
    mode?: null | 'client' | 'server';
    dependency?: string[];
    plugin: (el: HTMLElement | PawaElement, attr: { name: string; value: string }, stateContext?: any, notRender?: any, stopResume?: any) => void;
}

export interface PluginObject {
    attribute?: {
        register: AttriPlugin[];
    };
    component?: {
        beforeCall?: (stateContext: any, app: any) => void;
        afterCall?: (stateContext: any, el: HTMLElement) => void;
    };
    renderSystem?: {
        beforePawa?: (el: HTMLElement, context: any) => void;
        afterPawa?: (el: PawaElement) => void;
        beforeChildRender?: (el: PawaElement) => void;
    };
}

export type StateInput<T> = T | (() => T) | (() => Promise<T>);

export interface State<T> {
    value: T;
    readonly id: string;
    async?: boolean;
    failed?: boolean;
    retry?: () => void;
}

export function setErrorCALLER(callback: (message: any) => void): void;

export function pluginsMap(): {
    compoAfterCall: Set<Function>;
    compoBeforeCall: Set<Function>;
    renderAfterPawa: Set<Function>;
    renderBeforePawa: Set<Function>;
    renderBeforeChild: Set<Function>;
    startsWithSet: Set<string>;
    fullNamePlugin: Set<string>;
    externalPlugin: Record<string, Function>;
    externalPluginMap: Map<string, string[]>;
};

export const escapePawaAttribute: Set<string>;
export const dependentPawaAttribute: Set<string>;

/**
 * Removes a plugin by name.
 * @param {...string} pluginName - Names of plugins to remove.
 */
export function removePlugin(...pluginName: string[]): void;

/**
 * Registers plugins to extend PawaJS capabilities.
 * @param {...(() => PluginObject)} func - Functions returning plugin definitions.
 */
export function PluginSystem(...func: (() => PluginObject)[]): void;

export function keepContext(context: any): void;

export const components: Map<string, Function>;

export function getCurrentContext(): any;

export function setPawaAttributes(...attr: string[]): void;

export function getDependentAttribute(): Set<string>;

export function getPawaAttributes(): Set<string>;

export function setError(params: { error: any }): void;

/**
 * Registers components for use in templates.
 * @param {...(string | Function)} args - Component functions or (name, function - done by pawajs-vite-plugin automaticly) pairs.
 */
export function RegisterComponent(...args: (string | Function)[]): void;

/**
 * Runs a side effect or lifecycle hook.
 * @param {() => void | (() => void)} callback - Effect function, optionally returning cleanup.
 * @param {any[] | object | number | null} [deps] - Dependencies or hook type (null=mount).
 */
export function runEffect(callback: () => void | (() => void), deps?: any[] | object | number | null): void;

export interface PropValidation {
    strict?: boolean;
    err?: string;
    default?: any;
    type?: Function | Function[];
}

export function useValidateComponent(component: Function, object: Record<string, PropValidation>): void;

export interface ContextHandle<T = any> {
    id: string;
    setValue: (val?: T) => void;
}

/**
 * Creates a context provider handle.
 * @template T
 * @returns {ContextHandle<T>} Handle to set context values.
 */
export function setContext<T = any>(): ContextHandle<T>;

/**
 * Consumes a context value.
 * @template T
 * @param {ContextHandle<T>} context - The context handle.
 * @returns {T} The context value.
 */
export function useContext<T = any>(context: ContextHandle<T>): T;

export function useInnerContext(): any;

export function accessChild(): any;

export function useServer(): (() => void) | undefined;

export function useAsync(): { $async: <T>(callback: () => Promise<T>) => Promise<T> };

export function isResume(): boolean;

/**
 * Exposes variables to the template scope.
 * @param {Record<string, any>} [obj] - Variables to expose.
 */
export function useInsert(obj?: Record<string, any>): void;

export function setStateContext(context: any): any;

/**
 * Creates a reactive state.
 * @template T
 * @param {StateInput<T>} initialValue - Initial value or generator function.
 * @param {string | null | string[]} [section] - Persistence key or dependency array.
 * @returns {State<T>} Reactive state object.
 */
export function $state<T>(initialValue: StateInput<T>, section?: string | null | string[]): State<T>;

export function restoreContext(state_context: any): void;

/**
 * Creates a reference object.
 * @template T
 * @returns {{ value: T | null }} Ref object.
 */
export function useRef<T = any>(): { value: T | null };

/**
 * Renders a component or element.
 * @param {HTMLElement} el - Target element.
 * @param {object} [contexts] - Context.
 * @param {any} [notRender] - Internal.
 * @param {boolean} [isName] - Internal.
 */
export function render(el: HTMLElement, contexts?: object, notRender?: any, isName?: boolean): void;

/**
 * Initializes and starts the Pawa application.
 * @param {HTMLElement} app - Root element.
 * @param {Record<string, any>} [context] - Initial context.
 */
export function pawaStartApp(app: HTMLElement, context?: Record<string, any>): void;

/**
 * Tagged template literal for HTML strings. Enables syntax highlighting in compatible editors.
 * @param {TemplateStringsArray} strings
 * @param {...any} values
 */
export function html(strings: TemplateStringsArray, ...values: any[]): string;

declare const Pawa: {
    useInsert: typeof useInsert;
    useContext: typeof useContext;
    useValidateComponent: typeof useValidateComponent;
    setPawaAttributes: typeof setPawaAttributes;
    setContext: typeof setContext;
    $state: typeof $state;
    pawaStartApp: typeof pawaStartApp;
    RegisterComponent: typeof RegisterComponent;
    runEffect: typeof runEffect;
    html: typeof html;
};

export default Pawa;