# pawajs
# pawajs is a powerful lightweight dom library, it's html-first 

# script
```javascript
    import {pawaStartApp,$state,useInsert} from 'pawajs;

const app = document.getElementById('app')

/// start running your app

/// pawaStartApp(app,a callback to pass state or function to the page)

pawaStartApp(app,() => {
  
  const count=$state(0)
 // add satate or variable into the render
  useInsert({count})
})
```

# script component without jsx
```javascript
    import {$state,RegisterComponent,useInsert} from 'pawajs'
    const Counter=() => {
    const count=$state(0)
    useInsert({count})
    return `
    <div>
        <div>
            <span>
                @{count.value}
            </span>
        </div>
        <button on-click="count.value++">
            increase
        </button>
    </div>
    `
}

RegisterComponent(Counter)
```


# html way to create a counter

```html
   <div id="app">
  <div state-count="0">
    
      <h1>@{count.value}</h1>
   
    <button on-click="count.value++">count ++</button>
  </div>
   
</div>
```

# you can use template element for better ui
# template can also be used to control flow 
```html
    <template>
        <h1>@{count.value}</h1>
    </template> 
```
# pawa js if Attributes

```html
    <div if="user.value">
        welcome @{user.value.name}
    </div>
```
# pawa js else Attributes

```html
    <div if="user.value">
        welcome @{user.value.name}
    </div>
    <div else>
        login
    </div>
```
# pawa js For Attributes

```html
    <div state-array="['name','age','occupation']">
        <div for="value,index in array.value" for-key="{{value}}">
            <span>{{value}}</span>
        </div>
    </div>
```

# for cdn

``` html
<script src="https://cdn.jsdelivr.net/npm/pawajs@1.0.7/cdn/index.js" type="module"></script>
```