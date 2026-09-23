/**
 * @param {HTMLElement} el
 */
export const setChained = (el,chained,condition='if') => {
  
  const chainMap = new Map();
  chainMap.set(el.getAttribute("if"), { condition: "if", element: el });
  const nextSiblings=el.nextElementSibling
  const getChained = (nextSibling) => {
    if (nextSibling !== null) {
      if (
        (nextSibling && nextSibling.getAttribute("else") === "") ||
        nextSibling.getAttribute("else-if")
      ) {
        // console.log(true,'it has',nextSibling.getAttribute('else'))
        if (nextSibling.getAttribute("else-if")) {
          chained.push({
            exp: nextSibling.getAttribute("else-if"),
            condition: "else-if",
            element: nextSibling,
          });
          chainMap.set(nextSibling.getAttribute("else-if"), {
            condition: "else-if",
            element: nextSibling,
          });
          getChained(nextSibling.nextElementSibling);
          nextSibling.remove();
        } else if (nextSibling.getAttribute("else") === "") {
          chained.push({
            exp: "false",
            condition: "else",
            element: nextSibling,
          });
          chainMap.set("else", { condition: "else", element: nextSibling });
          nextSibling.remove();
        }
      }
    }
  };
  getChained(nextSiblings);
  return chainMap
};