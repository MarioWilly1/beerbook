// Guards usados por NativeSwipeTabs.jsx (swipe interactivo, sigue el dedo en
// vivo) — evitan robarle el gesto horizontal a un control con su propio
// arrastre (el slider de alcohol de BeerFilters, un <select>) o a algo con
// scroll horizontal propio (la fila de historias, StoryBar.jsx).
export function isFormControl(el) {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(el?.tagName);
}

// Mismo criterio que findScrollParent en NativePullToRefresh.jsx, pero para
// scroll HORIZONTAL.
export function hasHorizontalScrollAncestor(el) {
  let node = el;
  while (node && node !== document.body) {
    if (node.scrollWidth > node.clientWidth + 1) {
      const overflowX = getComputedStyle(node).overflowX;
      if (overflowX === "auto" || overflowX === "scroll") return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function shouldIgnoreSwipeTarget(el) {
  return isFormControl(el) || hasHorizontalScrollAncestor(el);
}
