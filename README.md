# pawajs
pawajs - power the web (reactivity and html runtime)

# PawaJS

**A lightweight and reactive JavaScript library for building modern web interfaces with a simple, declarative syntax.**

PawaJS is a JavaScript library designed for building dynamic user interfaces. It combines a component-based architecture with a powerful reactivity system. Its intuitive, directive-based templating feels familiar and makes it easy to create interactive applications, from simple widgets to complex single-page apps. With built-in support for server-side rendering and hydration, PawaJS is equipped for performance and scalability.

---

## Features

-   **Declarative Rendering:** Use a clean, HTML-based template syntax with powerful directives (`if`, `for`, `on-event`, etc.) to describe your UI.
-   **Reactive State Management:** Effortlessly create reactive state that automatically updates the DOM when it changes using the `$state` utility.
-   **Component-Based Architecture:** Build encapsulated components that manage their own state, making your code more reusable and maintainable.
-   **Async Components:** First-class support for asynchronous components, allowing you to fetch data directly within your component definition.
-   **Efficient List Rendering:** Render lists of data with the `for` directive, including support for keyed updates for optimal performance.
-   **Lifecycle Hooks:** Tap into a component's lifecycle with `mount` and `unmount` directives, or the `runEffect` hook for more complex side effects.
-   **Context API:** Pass data through the component tree without having to pass props down manually at every level.
-   **Server-Side Rendering (SSR) & Hydration:** PawaJS is built with SSR in mind, featuring a "resuming" mechanism to efficiently hydrate server-rendered HTML on the client.
-   **Plugin System:** Extend PawaJS's core functionality with custom directives and lifecycle behaviors.

---

## Installation

Install PawaJS into your project using npm:

```bash
npm install pawajs
```

Then, you can import it into your application:

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

The `$state` function is the heart of PawaJS's reactivity. It creates a reactive object whose `value` property can be read and written to. Any changes to `.value` will automatically trigger updates in the parts of your application that depend on it. `$state` can be global when used outside a component

```javascript
// Create a simple state
const name = $state('Pawa');
console.log(name.value); // "Pawa"
name.value = 'PawaJS'; // The UI will update automatically

// State can hold any data type
const user = $state({ name: 'Alex', loggedIn: false });
user.value.loggedIn = true; // This is also reactive

// Persist state to localStorage
// The state will be saved under the key 'session' and reloaded on page refresh.
const session = $state({ id: null }, 'session');
```

### Components

Components are the building blocks of your application. In PawaJS, a component is a JavaScript function that returns an HTML template string.

-   **Defining:** Create a function that returns a template.
-   **Registering:** Use `RegisterComponent(MyComponent)` to make it available globally. In HTML, you can then use it as `<my-component>`.
-   **`useInsert`:** To make variables, state, and functions from your component's setup available in its template, pass them in an object to `useInsert()`.

### Asynchronous Components

PawaJS supports async components (useAsync hook) out of the box. You can define a component as an `async` function, allowing you to perform asynchronous operations (like fetching data) before the component renders.
wrap any pawajs hook with $async after any await call

```javascript
const UserProfile = async () => {
    // The component will wait for this promise to resolve before rendering
    const {$async}=useAsync()
    const data = await fetch('/api/user').then(res => res.json());
    const user = $async(()=>$state(data);)
    $async(()=>useInsert({user}))

    return html`
        <div class="profile">
            <h1>@{user.value.name}</h1>
        </div>
    `;
}
```

### Templating

PawaJS uses a simple `@{...}` syntax to embed dynamic JavaScript expressions directly into your HTML.

```html
<!-- Bind to text content -->
<p>@{user.name}</p>

<!-- Bind to attributes -->
<div class="user-card @{user.value.isActive ? 'active' : 'inactive'}">
    <input value="@{user.value.name}" on-input="user.value.name = e.target.value">
</div>
```

### Directives

Directives are special attributes that apply reactive behavior to DOM elements.

#### `state-*`
create inline state for the element and children 

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
#### `switch` / `case` / `default`
switch conditional rendering.

```html
<div switch="user.value.type" case="'admin'">
    Welcome back, @{user.name.value}!
</div>
<div case="'guest">
    You are browsing as a guest.
</div>
<div default>
    Please log in to continue.
</div>
```
#### `id`
re-renders the element/component when the reactivity changes 

```html
<user-component id="@{user.value.type}"></user-component>

```

#### `is-exit`
makes pawajs engine to wait before removing the element until the animation is done.

```html
<div if="user.value.loggedIn" class="user-card @{user.value.isActive ? 'active' : 'inactive'}" is-exit>
    <input value="@{user.value.name}" on-input="user.value.value = e.target.value">
</div>
```
#### `for`
For rendering lists from an array. Use `for-key` to give each element a unique identity, which helps PawaJS optimize rendering.

```html
<ul>
    <li for="todo, i in todos.value" for-key="{{todo.id}}">
        <span>@{i + 1}. @{todo.text}</span>
    </li>
</ul>
```

#### `on-<event>`
For handling DOM events.

```html
<button on-click="addTodo()">Add Todo</button>
<input on-input="newTodoText.value = e.target.value" />
```

### Component Props

You can pass data from a parent component to a child component using props. To declare a prop, prefix the attribute with a colon (`:`).
children are passed by default in pawajs, they are not functional prop
**Parent Component (`app.js`)**
```javascript
// ...
const message = $state('This is a message from the parent!');
useInsert({ message });

return html`
    <todo-list :title="'My Todo List'" :message="message.value">Children in here</todo-list>
`;
```

**Child Component (`todo-list.js`)**
```javascript
export const TodoList = ({ title, message,children }) => {
    // Props are passed as functions that return the reactive value
    useInsert({ title, message });

    return html`
        <div>
            <h2>@{title()}</h2>
            <p>@{message()}</p>
            ${children}
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

---

## API Reference

### Core Functions
-   `pawaStartApp(rootElement, initialContext)`: Initializes the PawaJS application on a given root DOM element.
-   `RegisterComponent(...components)`: Registers one or more components to be used in templates.
-   `$state(initialValue, localStorageKey?)`: Creates a new reactive state object.
-   `html`: A tagged template literal for syntax highlighting and potential future optimizations.

### Component Hooks
-   `useInsert(object)`: Exposes data and functions from a component's setup to its template.
-   `runEffect(callback, dependencies?)`: Runs a side effect after the component renders, and re-runs it when its dependencies change.
-   `useContext(contextObject)` & `setContext()`: A mechanism for providing and consuming data throughout a component tree.
-   `useRef()`: Creates a reference object that can be attached to a DOM element using the `ref` directive.
-   `useValidateComponent(Component, rules)`: Defines validation rules for a component's props.

---

## Contributing

Contributions are welcome! If you have a feature request, bug report, or want to contribute to the code, please feel free to open an issue or pull request on the GitHub repository.

## License

This project is licensed under the MIT License.