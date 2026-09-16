/* Minimal stand-in for the anywidget model, for running a vibe-widget outside
   a notebook. State lives in memory; there is no kernel to sync to. */
export function createModel(initial) {
  const state = { ...initial };
  const listeners = new Map();
  const emit = (event, ...args) => {
    (listeners.get(event) || []).slice().forEach((fn) => {
      try { fn(...args); } catch (err) { console.error(err); }
    });
  };
  const model = {
    get: (key) => state[key],
    set(key, value) {
      if (key && typeof key === "object") {
        Object.entries(key).forEach(([k, v]) => model.set(k, v));
        return;
      }
      const prev = state[key];
      state[key] = value;
      if (prev !== value) {
        emit(`change:${key}`, { changed: { [key]: value }, name: key, old: prev, new: value }, value);
        emit("change", { changed: { [key]: value } });
      }
    },
    save_changes() {},
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(fn);
    },
    off(event, fn) {
      const arr = listeners.get(event);
      if (!arr) return;
      listeners.set(event, fn ? arr.filter((f) => f !== fn) : []);
    },
    once(event, fn) {
      const wrapped = (...args) => { model.off(event, wrapped); fn(...args); };
      model.on(event, wrapped);
    },
    send() {},
    call_remote() { return Promise.reject(new Error("No kernel in standalone mode")); },
  };
  return model;
}
