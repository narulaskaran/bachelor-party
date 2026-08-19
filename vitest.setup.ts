type JsdomGlobal = typeof globalThis & {
  jsdom?: {
    window: Window;
  };
};

const jsdom = (globalThis as JsdomGlobal).jsdom;
if (jsdom) {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: jsdom.window.localStorage,
  });
}
