import { getComponentGraph } from "../component/index.js";
import { forwardProps, useInsert, useValidateComponent,useRef,runEffect } from "../hooks/index.js";
import { queueEffect } from "../reactive.js";

export const Active = ({ show, ...props }) => {
    forwardProps(props)
  const graph = getComponentGraph();
  graph.active = show();
  const ref = useRef()

  const activate = (g) => {
      g.active = true
    for (const child of g.children) {
      activate(child)
    }
    if (!g.timers) g.timers = []   // CHANGED: timers live on the graph itself, not Active's closure
    for (const fn of g.unActive) {
      const t = setTimeout(() => {
        queueEffect(fn)
        g.timers = g.timers.filter(id => id !== t)
      }, 100);
      g.timers.push(t)
    }

    g.unActive = []
  };

  const deactivate = (g) => {
    if (g.timers?.length) {
        for (const t of g.timers) {
            clearTimeout(t)
        }
        g.timers = []
    }
    g.active = false
    for (const child of g.children) {
      deactivate(child)   // CHANGED: recursion clears each child's own timers, not a shared set
    }
  }

  runEffect(() => {
    const div = ref.value
    if (show()) {
        if (div) {
           div.style.display = ''
        }
        activate(graph)
    } else {
        if (div) {
           div.style.display = 'none'
        }
        deactivate(graph)
    }
    return () => deactivate(graph)   // CHANGED: reuse deactivate for cleanup — same recursive clear
  }, [() => show()]);

  useInsert({ ref })
  return `<slot ref="ref" --></slot>`
};
Active.client = true;
useValidateComponent(Active, {
  show: {
    type: Boolean,
    strict: true,
    err: "[show] is Required Prop and reactive prop :[boolean]",
  },
});
