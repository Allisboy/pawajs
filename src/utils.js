export const splitAndAdd = (str) => str.split("-").join("").toUpperCase();
export const getContexters = (contexts = {}) => {
  const keys = Object.keys(contexts);
  const resolvePath = (path, obj) => {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  };
  const values = keys.map((key) => resolvePath(key, contexts));
  return { keys, values };
};
const expressionCache = new Map();
export const safeEval = (expression, context, resolve = false) => {
  try {
    const { keys, values } = getContexters(context);

    const cacheKey = expression + "|||" + keys.join(",");

    let func = expressionCache.get(cacheKey);
    if (!func) {
      func = new Function(
        ...keys,
        `
      const require=null
      return ${expression}
      `,
      );
      
    }
      expressionCache.set(cacheKey, func);
    
    if (resolve) {
      return func(...values);
    } else {
      return func;
    }
  } catch (error) {
    console.log(error);
  }
};

export const processNode = (node, itemContext) => {
  if (typeof itemContext === "number") {
    return;
  }

  if (node.attributes) {
    Array.from(node.attributes).forEach((attr) => {
      if (attr.name !== "for-key") return;
      const newValue = attr.value.replace(/{{(.+?)}}/g, (match, exp) => {
        // The pawaEl is the element holding the for-each directive.
        const result = safeEval(exp, itemContext, true);
        return result ?? match;
      });
      attr.value = newValue;
    });
  }
};
