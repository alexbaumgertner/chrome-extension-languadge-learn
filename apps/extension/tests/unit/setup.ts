// jsdom has no layout engine, so getClientRects() always returns an empty
// list. The parser uses it as an is-rendered guard, which real browsers
// satisfy naturally (verified by the Playwright suite); stub it here so
// unit tests can exercise the selection logic itself.
Element.prototype.getClientRects = function (): DOMRectList {
  const rect = {
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    top: 0,
    left: 0,
    bottom: 20,
    right: 100,
    toJSON() {
      return this;
    },
  } as DOMRect;
  return {
    length: 1,
    item: () => rect,
    [Symbol.iterator]: function* () {
      yield rect;
    },
    0: rect,
  } as unknown as DOMRectList;
};
