import { getComponentGraph } from "../component/index.js";
import { forwardProps, html } from "../hooks/index.js";

export const Transition = ({ name, duration, enter, exit, ...props }) => {
  forwardProps(props);
  const graph = getComponentGraph();

  graph.onExit = [];

  graph.onExit.push((el) => {
    return el.animation(exit(), {
      duration: duration?.() || 300,
      fill: "forwards",
    });
  });
  graph.onEnter=[]
  graph.onEnter.push((el) => {

    return el.animation(enter(), {
      duration: duration?.() || 300,
      fill: "forwards",
    });
  });

  return html`<slot -- ></slot>`;
};
Transition.client=true
