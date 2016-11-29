import {
    Abstract, Disposing, DisposingMixin,
    $isFunction, $decorate, getPropertyDescriptors
} from "miruken-core";

import {
    Context, ContextualHelper, ContextualMixin
} from "miruken-context";

import { ComponentPolicy } from "./policy";

/**
 * Manages the creation and destruction of components.
 * @class Lifestyle
 * @extends Base
 * @uses ComponentPolicy
 * @uses DisposingMixin
 * @uses Disposing
 */
export const Lifestyle = Abstract.extend(ComponentPolicy, Disposing, DisposingMixin, {
    /**
     * Obtains the component instance.
     * @method resolve
     * @returns {Object} component instance.
     */
    resolve(factory) {
        return factory();
    },
    /**
     * Tracks the component instance for disposal.
     * @method trackInstance
     * @param {Object} instance  -  component instance.
     * @returns {Object} tracked instance.
     */        
    trackInstance(instance) {
        if (instance && $isFunction(instance.dispose)) {
            const lifestyle = this;
            return $decorate(instance, {
                dispose(disposing) {
                    if (disposing || lifestyle.disposeInstance(this, true)) {
                        this.base();
                        Reflect.deleteProperty(this, "dispose");
                    }
                }
            });
        }
        return instance;
    },
    /**
     * Disposes the component instance.
     * @method disposeInstance
     * @param {Object}  instance   -  component instance.
     * @param {boolean} disposing  -  true if being disposed.  
     */                
    disposeInstance(instance, disposing) {
        if (!disposing && instance && $isFunction(instance.dispose)) {
            instance.dispose(true);
        }
        return !disposing;
    },
    applyPolicy(componentModel) {
        componentModel.lifestyle = new this.constructor();
    }
});

/**
 * Creates untracked component instances.
 * @class TransientLifestyle
 * @extends Lifestyle
 */
export const TransientLifestyle = Lifestyle.extend({
    constructor() {},
    applyPolicy(componentModel) {
        componentModel.lifestyle = this;  // stateless
    }
});

/**
 * Manages a single instance of a component.
 * @class SingletonLifestyle
 * @constructor
 * @param {Object} [instance]  -  existing component instance
 * @extends Lifestyle
 */
export const SingletonLifestyle = Lifestyle.extend({
    constructor(instance) {
        this.extend({
            resolve(factory) {
                if (instance == null) {
                    return factory(object => {
                        if (!instance && object) {
                            instance = this.trackInstance(object);
                            return instance;
                        }
                    });
                }
                instance = this.trackInstance(instance);
                return instance;
            },
            disposeInstance(object, disposing) {
                // Singletons cannot be disposed directly
                if (!disposing && (object === instance)) {
                    if (this.base(object, disposing)) {
                        instance = undefined;
                        return true;
                    }
                }
                return false;
            },
            _dispose() {
                this.disposeInstance(instance);
            }
        });
    }
});

/**
 * Manages instances scoped to a {{#crossLink "Context"}}{{/crossLink}}.
 * @class ContextualLifestyle
 * @constructor
 * @extends Lifestyle
 */
export const ContextualLifestyle = Lifestyle.extend({
    constructor() {
        let _cache = {};
        this.extend({
            resolve(factory, composer) {
                const context = composer.resolve(Context);
                if (context) {
                    const id = context.id;
                    let   instance = _cache[id];
                    return instance ? instance : factory(object => {
                        if (object && !_cache[id]) {
                            instance = this.trackInstance(object);
                            instance = this.setContext(object, instance, context);
                            _cache[id] = instance;
                            context.onEnded(() => instance.context = null);
                        }
                        return instance;
                    });
                }
            },
            setContext(object, instance, context) {
                const lifestyle = this,
                      property  = getPropertyDescriptors(instance, "context");
                if (!(property && property.set)) {
                    instance = object === instance
                             ? $decorate(object, ContextualMixin)
                             : instance.extend(ContextualMixin);
                }
                ContextualHelper.bindContext(instance, context, true);
                return instance.extend({
                    set context(value) {
                        if (value == context) { return; }
                        if (value == null) {
                            this.base(value);
                            lifestyle.disposeInstance(instance);
                            return;
                        }
                        throw new Error("Container managed instances cannot change context");
                    }
                });
            },
            disposeInstance(instance, disposing) {
                if (!disposing) {  // Cannot be disposed directly
                    for (let contextId in _cache) {
                        if (_cache[contextId] === instance) {
                            this.base(instance, disposing);
                            Reflect.deleteProperty(_cache, contextId);                            
                            Reflect.deleteProperty(instance, "context");
                            return true;
                        } 
                    }
                }
                return false;
            },
            _dispose() {
                for (let contextId in _cache) {
                    this.disposeInstance(_cache[contextId]);
                }
                _cache = {};
            }
        });
    }
});
