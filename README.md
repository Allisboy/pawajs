# pawajs
pawajs - power the web (reactivity and html runtime)

# PawaJS

**A lightweight and reactive JavaScript library for building modern web interfaces with a simple, declarative syntax.**

PawaJS (reactive web runtime) is a JavaScript library designed for building dynamic user interfaces. It combines a component-based architecture and progressive enhancement with a powerful reactivity system, no v-dom. Its intuitive, directive-based templating feels familiar and makes it easy to create interactive applications, from simple widgets to complex single-page apps. With built-in support for server-side rendering using pawa-ssr (server rendering runtime) and pawajs-continue (continuity runtime), PawaJS is equipped for performance and scalability.

PawaJS is a **reactive web runtime** for HTML-first UIs: components, directives, and fine-grained `$state` updates with **no virtual DOM**.

On the client it powers widgets through SPAs. With **pawa-ssr** and **pawajs-continue** it uses **selective continue** (SCP): the server sends HTML plus a sparse index of reactive areas; the client continues only those areas. **Static components are stripped** from that index so they are not re-executed on the client.
🌐 **Website:** [pawajs.vercel.app](https://pawajs.vercel.app)



## Features

-   **Declarative Rendering:** Use a clean, HTML-based template syntax with powerful directives (`if`, `for-each`, `await`, `on-event`, etc.) to describe your UI.
-   **Reactive State Management:** Effortlessly create reactive state that automatically updates the DOM when it changes using the `$state` utility.
-   **Component-Based Architecture:** Build encapsulated components with just a JS function that manages its own state, making your code more reusable and maintainable. Components are synchronous by default — no async component mode to reason about.
-   **First-Class Async Handling:** Fetch and await data directly in your templates with the `await` / `as-fallback` / `as-catch` directives — no special component wiring required.
-   **Efficient List Rendering:** Render lists of data with the `for-each` directive, including support for keyed updates for optimal performance.
-   **Lifecycle Hooks:** Tap into a component's lifecycle with `mount` and `unmount` directives, or the `runEffect` hook for more complex side effects.
-   **Context API:** Pass data through the component tree without having to pass props down manually at every level.

- **Selective continue (SSR):** `pawa-ssr` emits HTML + SCP; `pawajs-continue` binds reactive regions only. Static UI stays plain HTML (no client re-execution).
---
-   **Plugin System:** Extend PawaJS's core functionality with custom directives and lifecycle behaviors.

---

## Installation

Install PawaJS into your project using npm:

```bash
npm install pawajs
```
CDN

```html
    <!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PawaJS CDN Demo</title>
</head>
<body>
    <div id="app">
        <counter></counter>
    </div>

    <!-- PawaJS CDN -->
    <script type="module" src="https://cdn.jsdelivr.net/npm/pawajs-cdn@latest/dist/pawajs.iife.min.js"></script>

    <script type="module">
        const { pawaStartApp, $state, RegisterComponent, useInsert, html } = Pawa;

        // 1. Define the component
        const Counter = () => {
            const count = $state(0);
            useInsert({ count });

            return html`
                <div class="p-8 border rounded-lg shadow-md flex flex-col items-center">
                    <h1 class="text-2xl font-bold">Count: @{count.value}</h1>
                    <button
                        on-click="count.value++"
                        class="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Increment
                    </button>
                </div>
            `;
        };

        // 2. Register it as a custom element
        RegisterComponent(Counter);

        // 3. Start the app
        document.addEventListener('DOMContentLoaded', () => {
            const app = document.getElementById('app');
            pawaStartApp(app);
        });
    </script>
</body>
</html>
```

OR

Then, you can import it into your application through npm:

```javascript
import { pawaStartApp, $state, RegisterComponent, html } from 'pawajs';
```

---

## Getting Started: A Simple Counter

Here's a basic example to show you how PawaJS works.

**`index.html`**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>PawaJS Counter</title>
</head>
<body>
    <div id="app">
        <h1 state-name="'PAWAJS'">@{name.value}</h1>
        <!-- The component will be rendered here -->
        <counter-app></counter-app>
    </div>
    <script type="module" src="app.js"></script>
</body>
</html>
```

**`app.js`**
```javascript
import { pawaStartApp, $state, useInsert, RegisterComponent, html } from './pawajs/index.js';

// 1. Define a component
const CounterApp = () => {
    // 2. Create reactive state
    const count = $state(0);

    // 3. Define methods to modify the state
    const increment = () => {
        count.value++;
    };
    const decrement = () => {
        count.value--;
    };

    // 4. Expose state and methods to the template
    useInsert({ count, increment, decrement });

    // 5. Return the component's template
    return html`
        <div>
            <h1>PawaJS Counter</h1>
            <p>Current count: <strong>@{count.value}</strong></p>
            <button on-click="increment()">Increment +</button>
            <button on-click="decrement()">Decrement -</button>
        </div>
    `;
}

// 6. Register the component
// PawaJS converts PascalCase component names to kebab-case for use in HTML.
RegisterComponent(CounterApp);

// 7. Start the PawaJS application
const appElement = document.getElementById('app');
pawaStartApp(appElement);
```

---

## Core Concepts

### State Management with `$state`

The `$state` function is the heart of PawaJS's reactivity. It creates a reactive object whose `value` property can be read and written to. Any changes to `.value` will automatically trigger updates in the parts of your application that depend on it (fine-grained) — no component re-rendering or diffing. `$state` can be global when used outside a component. You can also declare inline state directly in HTML or a template with `state-*="any js value"`.

```html
    <!--- number-->
    <div state-count="0">@{count.value}<div>
    <!--- string-->
    <div state-name="'PAWAJS'">@{name.value}<div>
    <!--- object-->
    <div state-object="{name:'pawajs'}">@{object.value.name}<div>
    <!--- boolean-->
    <div state-login="false">@{login.value? 'Welcome back!':'Please login'}<div>
    <!--- array-->
    <span state-splitname="['P','A','W','A','J','S']" for="item in splitname.value">@{item}<div>
```

```javascript
// Create a simple state
const name = $state('Pawa');
console.log(name.value); // "Pawa"
name.value = 'PawaJS'; // The UI will update automatically

// State can hold any data type
const user = $state({ name: 'Alex', loggedIn: false });
user.value.loggedIn = true; // This is also reactive

// Persist state to localStorage — wrap the $state call in useStorage(),
// The state will be saved under the key 'session' and reloaded on page refresh.
const session = useStorage(() => $state({ id: null }), 'session');

// Compute state - must be used inside a component
// whenever count changes, the state updates
const doubleCount=$state(()=>count.value * 2,[count])

//AutoCompute
// Any function that uses any reactive state for reactive bindings or directives becomes a computed function
const doubleCount=()=>count.value * 2

// Schedule a batch of state updates through the frame-budgeted scheduler
// instead of the default immediate/microtask path — useful for grouping a
// burst of updates so they get spread across animation frames rather than
// forced through synchronously in one go.
schedule(() => {
    count.value++
    name.value = 'Updated'
})
```

### Components

Components are the building blocks of your application. In PawaJS, a component is a **synchronous** JavaScript function that returns an HTML template string, or nothing.

-   **Defining:** Create a function that returns a template or not.
-   **Registering:** Use `RegisterComponent(MyComponent)` to make it available globally. In HTML, you can then use it as `<my-component>`.
-   **`useInsert`:** To make variables, state, and functions from your component's setup available in its template, pass them in an object to `useInsert()`.

Components are always synchronous — there's no separate "async component" mode to learn. If a component needs to fetch or await data, reach for the [`await` directive](#await--as-fallback--as-catch) inside its template instead.

### Templating

PawaJS uses a simple `@{...}` syntax to embed dynamic JavaScript expressions directly into your HTML.

```html
<!-- Bind to text content -->
<p>@{user.name}</p>

<!-- Bind to attributes -->
<div class="user-card @{user.value.isActive ? 'active' : 'inactive'}">
    <input @value="@{user.value.name}" on-input="user.value.name = e.target.value">
</div>
```

### Directives

Directives are special attributes that apply reactive behavior to DOM elements.

#### `state-*`
Create inline state for the element and its children.

```html
    <div state-count="0">
        <button on-click="count.value++">@{count.value}</button>
    </div>

```

#### `if` / `else` / `else-if`
For conditional rendering.

```html
<div if="user.value.loggedIn">
    Welcome back, @{user.name.value}!
</div>
<div else-if="user.value.isGuest">
    You are browsing as a guest.
</div>
<div else>
    Please log in to continue.
</div>
```

#### `key`
Re-renders the element/component when the value it watches changes.

```html
<user-component key="user.value.type"></user-component>

```

#### `for-each`
For rendering lists from an array. Use `for-key` to give each element a unique identity, which helps PawaJS optimize rendering.

```html
<ul>
    <li for-each="todo, i in todos.value" for-key="{{todo.id}}">
        <span>@{i + 1}. @{todo.text}</span>
    </li>
</ul>
```

#### `await` / `as-fallback` / `as-catch`
For handling asynchronous data directly in a template — no async component wiring needed. The `await` attribute must point to a **function that returns a promise**, not an already-invoked call.

The resolved value is exposed in scope under `res` by default (the caught error under `error`), or under whatever name you give with `as`.

```html
<div await="fetchUser">
    <p>Welcome, @{res.name}</p>
</div>
<div as-fallback>
    <p>Loading...</p>
</div>
<div as-catch>
    <p>Failed to load: @{error.message}</p>
</div>
```

Use `as` to bind the resolved (or caught) value under a custom name:

```html
<div await="fetchUser" as="user">
    <p>Welcome, @{user.name}</p>
</div>
<div as-catch as="err">
    <p>Failed to load: @{err.message}</p>
</div>
```

#### `on-<event>..chainModifiers`
modifiers - 'self','prevent','once','capture' etc
For handling DOM events.

```html
<button on-click="addTodo()">Add Todo</button>
<input on-input="newTodoText.value = e.target.value" />
```

#### `out-<event>.chainModifiers`
modifiers - 'self','prevent','once','capture' etc
For handling events fired outside the element.

```html
<button out-click.once="console.log('outside')">Add Todo</button>
```

#### `after-[ms]` / `every-[ms]`
Run a callback once after a delay or repeatedly on an interval. The expression is evaluated with the current render context and the timer is cleaned up when the component unmounts.

```html
<div after-[2000]="console.log('done after 2s')"></div>
<div every-[1000]="count.value++"></div>
```

This is the runtime timer directive path used by the graph scheduler and is cleaned up automatically on unmount.

### Direct element property updates (JSA) - JavaScript Attribute
PawaJS also supports direct property assignment (javascript element attribute)  with the `@` shorthand on an element. This avoids needing to write a full `on-*` event handler when you just want to set a DOM property or style field.

```html
<div @style.color="red" @inner-text="inner text"></div>
```

Nested properties are also supported:

```html
<div @style.background-color="tomato" @dataset.role="admin"></div>
```

The same shorthand works for native properties like `@value`, `@checked`, `@textContent`, and `@innerHTML`.

### Component Props

You can pass data from a parent component to a child component using props. To declare a prop, prefix the attribute with a colon (`:`).

Children are **not** passed as a prop in PawaJS — they're passed as a `<slot>`, the same way native web components handle content projection. For rest props, pass `--` to the element that needs the attributes.

**Parent Component (`app.js`)**
```javascript
// ...
const message = $state('This is a message from the parent!');
useInsert({ message });

return html`
    <todo-list title="My Todo List" :message="message.value" class="to the rest prop">
        <p>Children go in here</p>
    </todo-list>
`;
```

**Child Component (`todo-list.js`)**
```javascript
export const TodoList = ({ title, message }) => {
    // Props are passed as functions that return the reactive value
    useInsert({ title, message });

    return html`
        <div -->
            <h2>@{title()}</h2>
            <p>@{message()}</p>
            <slot></slot>
        </div>
    `;
}

// You can also validate props
useValidateComponent(TodoList, {
    title: {
        type: String,
        strict: true // This prop is required
    },
    message: {
        type: String,
        default: 'Default message'
    }
});
```

### Slots

A component's `<slot>` is where the caller's children land. A plain `<slot></slot>` (or a `<slot name="default">`) catches every child the caller passed that wasn't targeted at a specific named slot — this is what `TodoList` above uses.

You can have **more than one slot**, each with its own `name`, to project different pieces of content into different parts of a component's template. On the caller's side, target a named slot with a `<template slot="name">` wrapper:

**Parent (`app.js`)**
```javascript
return html`
    <card-panel>
        <template slot="header">
            <h2>Project status</h2>
        </template>

        <p>This is the default slot content — the body of the card.</p>

        <template slot="footer">
            <button on-click="dismiss()">Dismiss</button>
        </template>
    </card-panel>
`;
```

**Child (`card-panel.js`)**
```javascript
export const CardPanel = () => {
    return html`
        <div class="card">
            <header>
                <slot name="header"></slot>
            </header>
            <section class="card-body">
                <slot></slot>
            </section>
            <footer>
                <slot name="footer"></slot>
            </footer>
        </div>
    `;
}
```

Anything the caller passes that isn't wrapped in a `<template slot="...">` falls through to the unnamed default slot — so plain, un-templated children and a `<template slot="...">` block can be mixed freely on the same call site, as in the example above.

### Passing a string prop with `<template prop="...">`

Sometimes you want to pass a chunk of raw markup or text to a component as a **prop value** (a string), not as projected content. Use `<template prop="name">` for that — its inner HTML becomes the string value of that prop, available on the child the same way any other prop is.

```javascript
// Parent
return html`
    <alert-box>
        <template prop="message">Something went wrong.</template>
    </alert-box>
`;
```

```javascript
// Child (alert-box.js)
export const AlertBox = ({ message }) => {
    useInsert({ message });
    return html`
        <div class="alert">@{message()}</div>
    `;
}
```

A component's root element can also **become** whatever the caller passed, instead of wrapping it, by marking either the component's own root with `aschild` or letting a top-level `<slot>` take over as the root — useful when a component shouldn't add an extra wrapping element (e.g. a `Button` component that should render as the caller's own `<a>` if one is passed). In that case, the two elements' attributes are merged rather than one replacing the other — `class`/`style` are concatenated, everything else is kept from both (with collisions resolved by prefixing).

---

## Built-in Components

PawaJS ships two built-in components for common structural and animation needs.

### `Active`

Controls whether its content is visible and reactive, toggling `display: none` and pausing/resuming the effects underneath it based on a `show` prop. Useful for tabs, panels, or any content that should stop doing reactive work while it's hidden.

```html
<active :show="isOpen.value">
    <expensive-panel></expensive-panel>
</active>
```

### `Transition`

Wraps its content with enter/exit animation. When the content is added to the DOM, `Transition` plays the `enter` animation; when it's about to be removed (e.g. an `if` flipping false), it plays `exit` first and waits for it to finish before the element is actually taken out — so removal-triggering content never just vanishes mid-animation.

`enter` and `exit` take the same frame arguments as `el.animation()` — either an array of class names or an array of inline style strings — and `duration` controls how long each takes (defaults to `300`ms).

```html
<transition 
    :enter="['opacity-0 scale-95', 'opacity-100 scale-100']"
    :exit="['opacity-100 scale-100', 'opacity-0 scale-95']"
    :duration="250">
    <div if="user.value.loggedIn">Welcome back!</div>
</transition>
```

---

## API Reference

### Core Functions
-   `pawaStartApp(rootElement, initialContext)`: Initializes the PawaJS application on a given root DOM element.
-   `RegisterComponent(...components)`: Registers one or more components to be used in templates.
-   `Graph(parentGraph?)`: Creates a render graph node for a component or section of the DOM tree. This is the low-level runtime model used to track child nodes, lifecycle hooks, and reactive state.
-   `PawaRender(graph, contexts?)`: Creates a render driver and returns `{ render, renderGraph, setContext }`. It walks a DOM subtree, resolves directives, mounts components, and attaches the current context graph to each node.
-   `setComponentGraph(graph)` / `getComponentGraph()`: Set or read the active component graph from the current rendering context.
-   `$state(initialValue, section?)`: Creates a new reactive state object. Used inside or outside a component (module export). `section` is used for compute dependencies (pass an array) or for naming an async batch — not for localStorage persistence.
-   `useStorage(createCall, name)`: Wraps a `$state` creation call so its value is persisted to `localStorage` under `name` and restored on reload.
-   `schedule(callback)`: Runs any state updates made inside `callback` through the frame-budgeted scheduler instead of the default immediate path — useful for batching a burst of updates across animation frames.
-   `Plugin(plugin)`: Registers a plugin to extend PawaJS functionality (e.g., Routers, Global Stores).
-   `html`: A tagged template literal for syntax highlighting and potential future optimizations.

### Component Hooks
-   `useInsert(object)`: Exposes data and functions from a component's setup to its template.
-   `runEffect(callback, dependencies?)`: Runs a side effect after or before the component renders, and re-runs it when its dependencies change. Used inside or outside a component.
-   `useContext(contextObject)` & `setContext()`: A mechanism for providing and consuming data throughout a component tree.
-   `useRef()`: Creates a reference object that can be attached to a DOM element using the `ref` directive.
-   `useValidateComponent(Component, rules)`: Defines validation rules for a component's props.

### Low-level Render Graph
PawaJS keeps internal render metadata in a graph object attached to the DOM node tree. That graph tracks parent/child relationships, mount hooks, enter/exit transitions, storage for context, and the current render state. This is the runtime structure behind directives like `if`, `for-each`, `key`, `await`, and component mounting.

```javascript
import { Graph, PawaRender } from 'pawajs';

const graph = Graph();
const { render, renderGraph } = PawaRender(graph, { user: { name: 'Pawa' } });
render(document.getElementById('app'));
```

The graph is not usually something app code needs to manipulate directly, but it is the internal foundation for the library's reactive rendering pipeline and is exposed for advanced runtime integration and debugging.

---

## Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or pull request on the GitHub repository.

## License

This project is licensed under the MIT License.