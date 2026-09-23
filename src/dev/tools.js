const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;')

const formatTime = (time) => {
    try { return new Date(time).toLocaleTimeString() } catch { return '' }
}

const styles = `
:host { all: initial; }
* { box-sizing: border-box; }
button { font: inherit; border: 0; border-radius: 6px; padding: 5px 8px; color: #d1d5db; background: #374151; cursor: pointer; }
button:hover { color: white; background: #4b5563; }
.panel { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; width: min(440px, calc(100vw - 32px)); color: #e5e7eb; font: 13px/1.45 ui-monospace, monospace; background: #111827; border: 1px solid #374151; border-radius: 12px; box-shadow: 0 24px 70px #0008; overflow: hidden; }
.panel.minimized .body { display: none; }
.toolbar { display: flex; align-items: center; gap: 10px; padding: 11px 13px; background: #1f2937; border-bottom: 1px solid #374151; }
.brand { color: #f5d77b; font-weight: 700; flex: 1; }
.count { min-width: 22px; padding: 2px 6px; border-radius: 999px; text-align: center; color: #111827; background: #f87171; font-weight: 700; }
.body { max-height: min(540px, 65vh); overflow: auto; }
.empty { padding: 28px 16px; color: #9ca3af; text-align: center; }
.error { padding: 13px; border-bottom: 1px solid #374151; }
.error-head { display: flex; gap: 8px; align-items: center; color: #fca5a5; font-weight: 700; }
.error-time { margin-left: auto; color: #6b7280; font-size: 11px; font-weight: 400; }
.meta { margin-top: 6px; color: #d1d5db; white-space: pre-wrap; overflow-wrap: anywhere; }
details { margin-top: 8px; color: #9ca3af; }
summary { cursor: pointer; }
pre { margin: 7px 0 0; padding: 8px; max-height: 170px; overflow: auto; color: #fca5a5; background: #030712; border-radius: 6px; white-space: pre-wrap; }
`

export const mountPawaDevtools = (options = {}) => {
    if (typeof document === 'undefined') return () => {}
    if (document.querySelector('[data-pawa-devtools]')) return () => {}

    const host = document.createElement('div')
    host.dataset.pawaDevtools = 'true'
    const root = host.attachShadow?.({ mode: 'open' }) || host
    root.innerHTML = `<style>${styles}</style><section class="panel"><div class="toolbar"><span class="brand">Pawa Devtools</span><span class="count">0</span><button data-action="clear" type="button">Clear</button><button data-action="minimize" type="button">_</button></div><div class="body"><div class="empty">No runtime errors</div></div></section>`
    document.body.appendChild(host)

    const panel = root.querySelector('.panel')
    const count = root.querySelector('.count')
    const body = root.querySelector('.body')
    const errors = []
    const dev = globalThis.__pawaDev

    const render = () => {
        count.textContent = String(errors.length)
        if (!errors.length) {
            body.innerHTML = '<div class="empty">No runtime errors</div>'
            return
        }
        body.innerHTML = errors.slice().reverse().map((error) => `
            <article class="error"><div class="error-head"><span>${escapeHtml(error.effect || 'runtime')}</span><span class="error-time">${escapeHtml(formatTime(error.time))}</span></div>
            <div class="meta">${escapeHtml(error.msg || 'Unknown error')}</div>
            ${error.exp ? `<div class="meta">Expression: ${escapeHtml(error.exp)}</div>` : ''}
            ${error.stack || error.template ? `<details><summary>Details</summary>${error.template ? `<pre>${escapeHtml(error.template)}</pre>` : ''}${error.stack ? `<pre>${escapeHtml(error.stack)}</pre>` : ''}</details>` : ''}</article>
        `).join('')
    }

    const unsubscribe = dev?.subscribe?.(({ type, data }) => {
        if (type === 'clear') errors.length = 0
        if (type === 'error' && data) errors.push(data)
        render()
    }) || (() => {})
    errors.push(...(dev?.getSnapshot?.().errors || []))
    render()
    const article=root.querySelector('.panel')
    let into=false
    window.addEventListener('keydown', (e)=>{
        if (e.ctrlKey && e.key === 'q') {
            if(into)
                article.setAttribute('hidden', '')
            else 
                article.removeAttribute('hidden')
            
            into=!into
        }
        
    })
    root.querySelector('[data-action="clear"]').addEventListener('click', () => dev?.clearErrors?.())
    root.querySelector('[data-action="minimize"]').addEventListener('click', () => panel.classList.toggle('minimized'))
    if (options.open === false) panel.classList.add('minimized')

    return () => { unsubscribe(); host.remove() }
}

export const unmountPawaDevtools = () => {
    document.querySelector('[data-pawa-devtools]')?.remove()
}
