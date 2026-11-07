export const findContext = (componentGraph, contextId) => {
  while (componentGraph) {
    const transport = componentGraph.transport;
    if (Object.prototype.hasOwnProperty.call(transport ?? {}, contextId)) {
      return transport[contextId];
    }
    componentGraph = componentGraph.former;
  }
};