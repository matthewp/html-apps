import customAttributes from 'https://unpkg.com/custom-attributes@1.1.3/index.js';

function setValue(el, value) {
  if(el.tagName === 'INPUT') {
    el.value = value;
  } else {
    el.textContent = value;
  }
}

class Source {
  constructor(el, value) {
    this.el = el;
    this.value = value;
  }

  change(newValue) {
    if(this.value !== newValue) {
      this.value = newValue;
      setValue(this.el, newValue);
    }
  }
}

const SOURCE = Symbol('data.source');

function changeEvent(el) {
  if(el.tagName === 'INPUT') {
    return 'keyup';
  }
}

class DataStore {
  constructor(el) {
    this.el = el;
    this.store = new Map();
    this.bindings = new Map();
    this.elements = new WeakMap();
    this.listeners = new WeakMap();
    el.addEventListener('store:bind', this);
  }

  disconnect() {
    this.el.removeEventListener('store:bind', this);
  }

  handleEvent(ev) {
    switch(ev.type) {
      case 'store:bind':
        this.connectToStore(ev.target, ev.detail);
        break;
      default:
        this.dispatchChange(ev);
        break;
    }
  }

  connectToStore(el, name) {
    if(this.elements.has(el)) {
      let key = this.elements.get(el);
      let deps = this.store.get(key);
      if(deps) {
        deps.delete(el);
      }
    }
    this.elements.set(el, name);
    let bindings = this.bindings.get(name);
    if(!bindings) {
      bindings = new Set();
      this.bindings.set(name, bindings);
    }
    bindings.add(el);

    let eventName = changeEvent(el);
    el.addEventListener(eventName, this);
    this.listeners.set(el, eventName);

    if(!el[SOURCE]) {
      el[SOURCE] = new Source(el, this.store.get(name));
    }
  }

  dispatchChange(ev) {
    let key = ev.target.dataset.bind;
    let newValue = ev.detail || ev.target.value;
    this.store.set(key, newValue);

    let bindings = this.bindings.get(key);
    if(bindings) {
      for(let el of bindings) {
        el[SOURCE].change(newValue);
      }
    }
  }

  get(key) {
    return this.store.get(key);
  }
}

const STORE = Symbol('data-store');

customElements.define('data-store', class DataStoreElement extends HTMLElement {
  connectedCallback() {
    this[STORE] = new DataStore(this);
  }

  disconnectedCallback() {
    this[STORE].disconnect();
  }

  get(key) {
    return this[STORE].get(key);
  }
});

class DataBind {
  connectedCallback() {
    this.notify();
  }

  notify() {
    let ev = new CustomEvent('store:bind', {
      bubbles: true,
      detail: this.value
    });
    this.ownerElement.dispatchEvent(ev);
  }
}

customAttributes.define('data-bind', DataBind);
