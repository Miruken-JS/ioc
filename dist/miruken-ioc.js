import {Protocol,StrictProtocol,Invoking,Disposing,Flags,Base,ArrayManager,Modifier,$createModifier,$use,$lazy,$every,$eval,$child,$optional,$promise,$eq,Abstract,DisposingMixin,$isFunction,Facet,ProxyBuilder,$isSomething,$isProtocol,$isClass,$flatten,$isNothing,$meta,inject,$isPromise,$instant} from 'miruken-core';
import {Resolution,CallbackHandler,$provide,$composer,$NOT_HANDLED} from 'miruken-callback';
import {Context,ContextualHelper} from 'miruken-context';
import {validateThat,Validator} from 'miruken-validate';

/**
 * Protocol for defining policies for components.
 * @class ComponentPolicy
 * @extends Protocol
 */                
export const ComponentPolicy = Protocol.extend({
    /**
     * Applies the policy to the component model.
     * @method applyPolicy
     * @param  {ComponentModel} componentModel  -  component model
     * @param  {Array}          [...policies]   -  all known policies
     */
    applyPolicy(componentModel, policies) {},
    /**
     * Notifies the creation of a component.
     * @method componentCreated
     * @param  {Object} component          -  component instance
     * @param  {Object} dependencies       -  resolved dependencies
     * @param  {CallbackHandler} composer  -  composition handler
     */        
    componentCreated(component, dependencies, composer) {}
});

/**
 * Protocol for registering components in a {{#crossLink "Container"}}{{/crossLink}}.
 * @class Registration
 * @extends Protocol
 */                
export const Registration = Protocol.extend({
    /**
     * Encapsulates the regisration of components in a container.
     * @method register
     * @param  {Container}       container  -  container
     * @param  {CallbackHandler} composer   -  composition handler
     * @return {Function} function to unregister components.
     */
    register(container, composer) {}
});

/**
 * Protocol for exposing container capabilities.
 * @class Container
 * @extends StrictProtocol
 * @uses Invoking
 * @uses Disposing
 */            
export const Container = StrictProtocol.extend(Invoking, Disposing, {
    /**
     * Registers components in the container.
     * @method register
     * @param   {Arguments}  [...registrations]  -  registrations
     * @return {Function} function to unregister components.
     */
    register(registrations) {},
    /**
     * Adds a configured component to the container.
     * @method addComponent
     * @param   {ComponentModel} componentModel  -  component model
     * @param   {Array}          [...policies]   -  component policies
     * @return  {Function} function to remove component.
     */
    addComponent(componentModel, policies) {},
    /**
     * Adds container-wide policies for all components.
     * @method addPolicies
     * @param   {Array}  [...policies]  -  container-wide policies
     */        
    addPolicies(policies) {},
    /**
     * Resolves the first component satisfying the key.
     * @method resolve
     * @param   {Any}  key  -  key used to identify the component
     * @returns {Object | Promise} first component satisfying the key.
     * @async
     */
    resolve(key) {},
    /**
     * Resolves all the components satisfying the key.
     * @method resolveAll
     * @param   {Any}  key  -  key used to identify the component
     * @returns {Array | Promise} all components satisfying the key.
     * @async
     */
    resolveAll(key) {}
});

/**
 * Symbol for injecting composer dependency.<br/>
 * See {{#crossLink "CallbackHandler"}}{{/crossLink}}
 * @property {Object} $$composer
 */    
export const $$composer = Symbol();

/**
 * Modifier to request container dependency.<br/>
 * See {{#crossLink "Container"}}{{/crossLink}}
 * @class $container
 * @extend Modifier
 */            
export const $container = $createModifier();

/**
 * DependencyModifier flags
 * @class DependencyModifier
 * @extends Enum
 */    
export const DependencyModifier = Flags({
    /**
     * No dependency modifiers.
     * @property {number} None
     */
    None: 0,
    /**
     * See {{#crossLink "Modifier/$use:attribute"}}{{/crossLink}}
     * @property {number} Use
     */
    Use: 1 << 0,
    /**
     * See {{#crossLink "Modifier/$lazy:attribute"}}{{/crossLink}}
     * @property {number} Lazy
     */
    Lazy: 1 << 1,
    /**
     * See {{#crossLink "Modifier/$every:attribute"}}{{/crossLink}}
     * @property {number} Every
     */
    Every: 1 << 2,
    /**
     * See {{#crossLink "Modifier/$eval:attribute"}}{{/crossLink}}
     * @property {number} Dynamic
     */
    Dynamic: 1 << 3,
    /**
     * See {{#crossLink "Modifier/$optional:attribute"}}{{/crossLink}}
     * @property {number} Optional
     */
    Optional: 1 << 4,
    /**
     * See {{#crossLink "Modifier/$promise:attribute"}}{{/crossLink}}
     * @property {number} Promise
     */
    Promise: 1 << 5,
    /**
     * See {{#crossLink "Modifier/$eq:attribute"}}{{/crossLink}}
     * @property {number} Invariant
     */
    Invariant: 1 << 6,
    /**
     * See {{#crossLink "$container"}}{{/crossLink}}
     * @property {number} Container
     */
    Container: 1 << 7,
    /**
     * See {{#crossLink "Modifier/$child:attribute"}}{{/crossLink}}
     * @property {number} Child
     */        
    Child: 1 << 8
});

DependencyModifier.Use.modifier       = $use;
DependencyModifier.Lazy.modifier      = $lazy;
DependencyModifier.Every.modifier     = $every;
DependencyModifier.Dynamic.modifier   = $eval;
DependencyModifier.Child.modifier     = $child;
DependencyModifier.Optional.modifier  = $optional;
DependencyModifier.Promise.modifier   = $promise;
DependencyModifier.Container.modifier = $container;
DependencyModifier.Invariant.modifier = $eq;

/**
 * Describes a component dependency.
 * @class DependencyModel
 * @constructor
 * @param {Any}                dependency  -  annotated dependency
 * @param {DependencyModifier} modifiers   -  dependency annotations
 * @extends Base
 */
export const DependencyModel = Base.extend({
    constructor(dependency, modifiers) {
        modifiers = DependencyModifier.None.addFlag(modifiers);
        if (dependency instanceof Modifier) {
            DependencyModifier.items.forEach(flag => {
                const modifier = flag.modifier;
                if (modifier && modifier.test(dependency)) {
                    modifiers = modifiers.addFlag(flag);
                }
            });
            dependency = Modifier.unwrap(dependency);
        }
        this.extend({
            /**
             * Gets the dependency.
             * @property {Any} dependency
             * @readOnly
             */                            
            get dependency() { return dependency; },
            /**
             * Gets the dependency flags.
             * @property {DependencyModifier} modifiers
             * @readOnly
             */                        
            get modifiers() { return modifiers; }
        });
    },
    /**
     * Tests if the receiving dependency is annotated with the modifier.
     * @method test
     * @param   {DependencyModifier}  modifier  -  modifier flags
     * @returns {boolean} true if the dependency is annotated with modifier(s).
     */        
    test(modifier) {
        return this.modifiers.hasFlag(modifier);
    }
}, {
    coerce(object) {
        return (object === undefined) ? undefined : new DependencyModel(object);
    }
});

/**
 * Manages an array of dependencies.
 * @class DependencyManager
 * @constructor
 * @param {Array} dependencies  -  dependencies
 * @extends ArrayManager
 */
export const DependencyManager = ArrayManager.extend({
    constructor(dependencies) {
        this.base(dependencies);
    },
    mapItem(item) {
        return !(item !== undefined && item instanceof DependencyModel) 
            ? DependencyModel(item) 
            : item;
    }                         
});

/**
 * Specialized {{#crossLink "Resolution"}}{{/crossLink}}
 * that maintains a parent relationship for representing resolution chains.
 * @class DependencyResolution
 * @constructor
 * @param   {string}                 key     -  resolution key
 * @param   {DependencyResolution}   parent  -  parent resolution
 * @param   {boolean}                many    -  resolution cardinality
 * @extends Resolution
 */
export const DependencyResolution = Resolution.extend({
    constructor(key, parent, many) {
        let _type, _handler;
        this.base(key, many);
        this.extend({
            /**
             * Marks the handler as claiming the dependency.
             * @method claim
             * @param   {Function}  handler  -  dependency handler
             * @param   {Function}  type     -  dependency type
             * @returns {boolean} true if claimed, false otherwise.
             */                            
            claim(handler, type) { 
                if (this.isResolvingDependency(handler)) {
                    return false;
                }
                _handler = handler;
                _type    = type;
                return true;
            },
            /**
             * Gets the parent dependency
             * @property {DependencyResolution} parent
             */
            get parent() { return parent; },            
            /**
             * Gets the component requesting the dependency.
             * @property {Object} component
             */
            get type() { return _type; },
            /**
             * Determines if the handler is in the process of resolving a dependency.
             * @method isResolvingDependency
             * @param   {Function}  handler  -  dependency handler
             * @returns {boolean} true if resolving a dependency, false otherwise.
             */                
            isResolvingDependency(handler) {
                return (handler === _handler)
                    || (parent && parent.isResolvingDependency(handler))
            },
            /**
             * Formats the dependency resolution chain for display.
             * @method formattedDependencyChain
             * @returns {string} formatted dependency resolution chain.
             */                
            formattedDependencyChain() {
                const invariant  = $eq.test(key),
                      rawKey     = Modifier.unwrap(key),
                      keyDisplay = invariant ? `\`${rawKey}\`` : rawKey,
                      display    = _type ? `(${keyDisplay} <- ${_type})` : keyDisplay;
                return parent 
                     ? `${display} <= ${parent.formattedDependencyChain()}`
                     : display;
            }
        });
    }
});

/**
 * Records a dependency resolution failure.
 * @class DependencyResolutionError
 * @constructor
 * @param {DependencyResolution} dependency  -  failing dependency
 * @param {string}               message     -  error message
 * @extends Error
 */
export function DependencyResolutionError(dependency, message) {
    /**
     * Gets the error message.
     * @property {string} message
     */
    this.message = message ||
        `Dependency ${dependency.formattedDependencyChain()} could not be resolved.`;

    /**
     * Gets the failing dependency resolution.
     * @property {DependencyResolution} dependency
     */
    this.dependency = dependency;
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        Error.call(this);
    }
}
DependencyResolutionError.prototype             = new Error;
DependencyResolutionError.prototype.constructor = DependencyResolutionError;

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
     */        
    trackInstance(instance) {
        if (instance && $isFunction(instance.dispose)) {
            const lifestyle = this;
            instance.extend({
                dispose(disposing) {
                    if (disposing || lifestyle.disposeInstance(instance, true)) {
                        this.base();
                        this.dispose = this.base;
                    }
                }
            });
        }
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
                return instance ? instance : factory(object => {
                    if (!instance && object) {
                        instance = object;
                        this.trackInstance(instance);
                    }
                });
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
 * Manages instances scoped to a {{#crossLink "context.Context"}}{{/crossLink}}.
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
                            _cache[id] = instance = object;
                            this.trackInstance(instance);
                            ContextualHelper.bindContext(instance, context);
                            context.onEnded(() => {
                                instance.context = null;
                                this.disposeInstance(instance);
                                delete _cache[id];
                            });
                        }
                    });
                }
            },
            disposeInstance(instance, disposing) {
                if (!disposing) {  // Cannot be disposed directly
                    for (let contextId in _cache) {
                        if (_cache[contextId] === instance) {
                            this.base(instance, disposing);
                            delete _cache[contextId];
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

/**
 * Shared proxy builder
 * @property {ProxyBuilder} proxyBuilder
 */            
const proxyBuilder = new ProxyBuilder();

/**
 * Describes a component to be managed by a {{#crossLink "Container"}}{{/crossLink}}.
 * @class ComponentModel
 * @constructor
 * @extends Base
 */
export const ComponentModel = Base.extend({
    constructor() {
        let _key, _impl, _lifestyle, _factory,
            _invariant = false, _burden = {};
        this.extend({
            /**
             * Gets/sets the component key.
             * @property {Any} key
             */
            get key() { return _key || _impl },
            set key(value) { _key = value; },
            /**
             * Gets/sets the component class.
             * @property {Functon} implementation
             */
            get implementation() {
                let impl = _impl;
                if (!impl && $isClass(_key)) {
                    impl = _key;
                }
                return impl;
            },
            set implementation(value) {
                if ($isSomething(value) && !$isClass(value)) {
                    throw new TypeError(`${value} is not a class.`);
                }
                _impl = value;
            },
            /**
             * Gets/sets if component is invariant.
             * @property {boolean} invariant
             */                                                
            get invariant () { return _invariant; },
            set invariant(value) { _invariant = !!value; },
            /**
             * Gets/sets the component lifestyle.
             * @property {Lifestyle} lifestyle
             */
            get lifestyle() { return _lifestyle; },
            set lifestyle(value) {
                if (!$isSomething(value) && !(value instanceof Lifestyle)) {
                    throw new TypeError(`${value} is not a Lifestyle.`);
                }
                _lifestyle = value; 
            },
            /**
             * Gets/sets the component factory.
             * @property {Function} factory
             */
            get factory() {
                const factory = _factory,
                      clazz   = this.implementation;
                if (!factory) {
                    const interceptors = _burden[Facet.Interceptors];
                    if (interceptors && interceptors.length > 0) {
                        const types = [];
                        if (clazz) {
                            types.push(clazz);
                        }
                        if ($isProtocol(_key)) {
                            types.push(_key);
                        }
                        return _makeProxyFactory(types);
                    } else if (clazz) {
                        return _makeClassFactory(clazz);
                    }
                }
                return factory;
            },
            set factory(value) {
                if ($isSomething(value) && !$isFunction(value)) {
                    throw new TypeError(`${value} is not a function.`);
                }
                _factory = value;
            },
            /**
             * Gets the component dependency group.
             * @method getDependencies
             * @param   {string} [key=Facet.Parameters]  -  dependency group  
             * @returns {Array}  group dependencies.
             */                
            getDependencies(key) { 
                return _burden[key || Facet.Parameters];
            },
            /**
             * Sets the component dependency group.
             * @method setDependencies
             * @param {string} [key=Facet.Parameters]  -  dependency group  
             * @param {Array}  value                   -  group dependenies.
             */                
            setDependencies(key, value) {
                if (arguments.length === 1) {
                    value = key, key = Facet.Parameters;
                }
                if ($isSomething(value) && !Array.isArray(value)) {
                    throw new TypeError(`${value} is not an array.`);
                }
                _burden[key] = value.map(DependencyModel);
            },
            /**
             * Determines if the component dependency group is complete.
             * @method allDependenciesDefined
             * @param  {string}  [key=Facet.Parameters]  -  dependency group
             * @return {boolean} true if all dependencies defined.
             */                            
            allDependenciesDefined(key) {
                const deps = _burden[key || Facet.Parameters];
                if (!deps) return false;
                for (let i = 0; i < deps.length; ++i) {
                    if (deps[i] === undefined) {
                        return false;
                    }
                }
                return true;
            },
            /**
             * Manages the component dependency group.
             * @method manageDependencies
             * @param  {string}    [key=Facet.Parameters]  -  dependency group  
             * @param  {Function}  actions                 -  function accepting DependencyManager
             * @return {Array} dependency group.
             */                                
            manageDependencies(key, actions) {
                if (arguments.length === 1) {
                    actions = key, key = Facet.Parameters;
                }

                let   dependencies = _burden[key];
                const manager      = new DependencyManager(dependencies);
                if ($isFunction(actions)) {                
                    actions(manager);
                }
                dependencies = manager.getItems();
                if (dependencies.length > 0) {
                    _burden[key] = dependencies;
                }
                return dependencies;
            },
            /**
             * Gets the component dependency burden.
             * @property {Object} burden
             * @readOnly
             */                                
            get burden() { return _burden; }
        });
    },
    @validateThat
    keyCanBeDetermined(validation) {
        if (!this.key) {
            validation.results.addKey("key").addError("required", { 
                message: "Key could not be determined for component." 
            });
        }
    },
    @validateThat
    factoryCanBeDetermined(validation) {
        if (!this.factory) {
            validation.results.addKey("factory").addError("required", { 
                message: "Factory could not be determined for component." 
            });
        }
    }
});

const NO_ARGS = Object.freeze([]);

function _makeClassFactory(clazz) {
    return burden => Reflect.construct(clazz, burden[Facet.Parameters] || NO_ARGS);
}

function _makeProxyFactory(types) {
    const proxy = proxyBuilder.buildProxy(types);
    return burden => Reflect.construct(proxy, [burden]);
}

/**
 * Builds {{#crossLink "ComponentModel"}}{{/crossLink}} using fluent api.
 * @class ComponentBuilder
 * @constructor
 * @extends Base
 * @uses Registration
 */
export const ComponentBuilder = Base.extend(Registration, {
    constructor(key) {
        let _componentModel = new ComponentModel(),
            _newInContext, _newInChildContext, _policies;
        _componentModel.key = key;
        this.extend({
            /**
             * Marks the component as invariant.
             * @method invariant
             * @return {ComponentBuilder} builder
             * @chainable
             */
            invarian() {
                _componentModel.setInvariant();
                return this;
            },
            /**
             * Specifies the component class.
             * @method boundTo
             * @param {Function} value  - component class
             * @return {ComponentBuilder} builder
             * @chainable
             */                
            boundTo(clazz) {
                _componentModel.implementation = clazz;
                return this;
            },
            /**
             * Specifies component dependencies.
             * @method dependsOn
             * @param  {Argument} arguments  -  dependencies
             * @return {ComponentBuilder} builder
             * @chainable
             */                                
            dependsOn(...dependencies) {
                dependencies = $flatten(dependencies);
                _componentModel.setDependencies(dependencies);
                return this;
            },
            /**
             * Specifies the component factory.
             * @method usingFactory
             * @param {Function} value  - component factory
             * @return {ComponentBuilder} builder
             * @chainable
             */                                
            usingFactory(factory) {
                _componentModel.factory = factory;
                return this;
            },
            /**
             * Uses the supplied component instance.
             * @method instance
             * @param {Object} instance  - component instance
             * @return {ComponentBuilder} builder
             * @chainable
             */                                                
            instance(instance) {
                _componentModel.lifestyle = new SingletonLifestyle(instance);
                return this;
            },
            /**
             * Chooses the {{#crossLink "SingletonLifestyle"}}{{/crossLink}}.
             * @method singleon
             * @return {ComponentBuilder} builder
             * @chainable
             */
            singleton() {
                _componentModel.lifestyle = new SingletonLifestyle();
                return this;
            },
            /**
             * Chooses the {{#crossLink "TransientLifestyle"}}{{/crossLink}}.
             * @method transient
             * @return {ComponentBuilder} builder
             * @chainable
             */                
            transient() {
                _componentModel.lifestyle = new TransientLifestyle();
                return this;
            },
            /**
             * Chooses the {{#crossLink "ContextualLifestyle"}}{{/crossLink}}.
             * @method contextual
             * @return {ComponentBuilder} builder
             * @chainable
             */                                
            contextual() {
                _componentModel.lifestyle = new ContextualLifestyle();
                return this;
            },
            /**
             * Binds the component to the current 
             * {{#crossLink "Context"}}{{/crossLink}}.
             * @method newInContext
             * @return {ComponentBuilder} builder
             * @chainable
             */                                                
            newInContext() {
                _newInContext = true;
                return this;
            },
            /**
             * Binds the component to a child of the current 
             * {{#crossLink "Context"}}{{/crossLink}}.
             * @method newInContext
             * @return {ComponentBuilder} builder
             * @chainable
             */                                                                
            newInChildContext() {
                _newInChildContext = true;
                return this;
            },
            /**
             * Attaches component interceptors.
             * @method interceptors
             * @param  {Interceptor}  ...interceptors  -  interceptors
             * @return {ComponentBuilder} builder
             * @chainable
             */                                                
            interceptors(...interceptors) {
                interceptors = $flatten(interceptors, true);
                return new InterceptorBuilder(this, _componentModel, interceptors);
            },
            /**
             * Attaches {{#crossLink "ComponentPolicy"}}{{/crossLink}}'s.
             * @method policies
             * @param   {ComponentPolicy}  ...policies  -  policies
             */            
            policies(...policies) {
                policies = $flatten(policies, true);
                if (policies.length > 0) {
                    _policies = (_policies || []).concat(policies);
                }
                return this;
            },
            register(container) {
                if ( _newInContext || _newInChildContext) {
                    const factory = _componentModel.factory;
                    _componentModel.factory = function (dependencies) {
                        const object  = factory(dependencies),
                              context = this.resolve(Context);
                        if (_newInContext) {
                            ContextualHelper.bindContext(object, context);
                        } else {
                            ContextualHelper.bindChildContext(context, object);
                        }
                        return object;
                    };
                }
                return container.addComponent(_componentModel, _policies);
            }
        });
    }
});

/**
 * Builds {{#crossLink "ComponentModel"}}{{/crossLink}} interceptors using fluent api.
 * @class InterceptorBuilder
 * @constructor
 * @param {ComponentBuilder}  component       -  component builder
 * @param {ComponentModel}    componentModel  -  component model
 * @param {Array}             interceptors    -  component interceptors
 * @extends Base
 * @uses Registration
 */
export const InterceptorBuilder = Base.extend(Registration, {
    constructor(component, componentModel, interceptors) {
        this.extend({
            selectWith(selectors) {
                componentModel.manageDependencies(Facet.InterceptorSelectors, manager => {
                    selectors.forEach( selector => {
                        if (selector instanceof InterceptorSelector) {
                            selecter = $use(selector);
                        }
                        manager.append(selector);
                    });
                });
                return this;
            },
            /**
             * Marks interceptors to be added to the front of the list.
             * @method toFront
             * @returns {InterceptorBuilder} builder
             * @chainable
             */            
            toFront() {
                return this.atIndex(0);
            },
            /**
             * Marks interceptors to be added at the supplied index.
             * @method atIndex
             * @param {number}  index  -  index to add interceptors at
             * @returns {InterceptorBuilder} builder
             * @chainable
             */            
            atIndex(index) {
                componentModel.manageDependencies(Facet.Interceptors, manager =>
                    interceptors.forEach(interceptor => manager.insertIndex(index, interceptor)));
                return componentModel;
            },
            register(container, composer) {
                componentModel.manageDependencies(Facet.Interceptors,
                    manager => manager.append(interceptors));
                return component.register(container, composer);
            }
        });
    }
});

/**
 * Shortcut for creating a {{#crossLink "ComponentBuilder"}}{{/crossLink}}.
 * @method $component
 * @param   {Any} key - component key
 * @return  {ComponentBuilder} component builder.
 * @for $
 */    
export function $component(key) {
    return new ComponentBuilder(key);
}
                                       
/**
 * Identifies an invalid {{#crossLink "ComponentModel"}}{{/crossLink}}.
 * @class ComponentModelError
 * @constructor
 * @param  {ComponentModel}    componentModel     -  invalid component model
 * @param  {ValidationResult}  validationResults  -  validation results
 * @param  {string}            message            -  error message
 * @extends Error
 */
export function ComponentModelError(componentModel, validationResults, message) {
    /**
     * Gets the error message.
     * @property {string} message
     */
    this.message = message || "The component model contains one or more errors";
    /**
     * Gets the invalid component model.
     * @property {ComponentModel} componentModel
     */         
    this.componentModel = componentModel;
    /**
     * Gets the failing validation results.
     * @property {ValidationResult} validationResults
     */         
    this.validationResults = validationResults;
    
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        Error.call(this);
    }
}
ComponentModelError.prototype             = new Error;
ComponentModelError.prototype.constructor = ComponentModelError;

/**
 * Base class for installing one or more components into a 
 * {{#crossLink "Container"}}{{/crossLink}}.
 * @class Installer
 * @extends Base
 * @uses Registration
 */        
export const Installer = Base.extend(Registration, {
    register(container, composer) {}
});

/**
 * Fluent builder for specifying source of components.
 * @class FromBuilder
 * @constructor
 * @extends Base
 * @uses Registration
 */    
export const FromBuilder = Base.extend(Registration, {
    constructor() {
        let _basedOn;
        this.extend({
            /**
             * Gets the classes represented by this source.
             * @method getClasses
             * @returns {Array} classes from this source.
             */        
            getClasses() { return []; },
            /**
             * Gets the builder for filtering classes from this source.
             * @method basedOn
             * @returns {BasedOnBuilder} fluent class filter.
             */        
            basedOn(...constraints) {
                _basedOn = new BasedOnBuilder(this, $flatten(constraints, true));
                return _basedOn;
            },
            register(container, composer) {
                let   registrations;
                const classes = this.getClasses();
                if (_basedOn) {  // try based on
                    registrations = classes.map(
                        member => _basedOn.builderForClass(member))
                        .filter(component => component);
                } else { // try installers
                    registrations = classes.filter(member => {
                        const clazz = member.member || member;
                        return clazz.prototype instanceof Installer;
                    }).map(installer => {
                        installer = installer.member || installer;
                        return new installer();
                    });
                }
                return Promise.all(container.register(registrations))
                    .then(_unregisterBatch);
            }
        });
    }
});

/**
 * Fluent builder for specifying a Package as a source of components.
 * @class FromPackageBuilder
 * @constructor
 * @param {Package} pkg         -  package containing components
 * @param {Array}   [...names]  -  optional member name filter
 * @extends FromBuilder
 */        
export const FromPackageBuilder = FromBuilder.extend({
    constructor(pkg, names) {
        this.base();
        this.extend({
            getClasses() {
                const classes = [];                
                names = names || Object.keys(pkg);
                for (let name of names) {
                    const member = pkg[name];
                    if (member != null && $isClass(member)) {
                        classes.push({ name, member });
                    }
                }
                return classes;
            }
        });
    }
});

/**
 * Fluent builder for filtering a source of components.
 * @class BasedOnBuilder
 * @constructor
 * @param  {FromBuilder}  from            -  source of components
 * @param  {Array}        ...constraints  -  initial constraints
 * @extends Base
 * @uses Registration
 */        
export const BasedOnBuilder = Base.extend(Registration, {
    constructor(from, constraints) {
        let _if, _unless, _configuration;
        this.withKeys = new KeyBuilder(this);
        this.extend({
            /**
             * Adds a predicate for including a component.
             * @method if
             * @param   {Function}  condition  -  predicate to include component
             * @returns {BasedOnBuilder} current builder.
             * @chainable
             */        
            if(condition) {
                if (_if) {
                    const cond = _if;
                    _if = clazz => cond(clazz) && condition(clazz);
                } else {
                    _if = condition;
                }
                return this;
            },
            /**
             * Adds a predicate for excluding a component.
             * @method unless
             * @param   {Function}  condition  -  predicate to exclude component
             * @returns {BasedOnBuilder} current builder.
             * @chainable
             */                        
            unless(condition) {
                if (_unless) {
                    const cond = _unless;
                    _unless = clazz => cond(clazz) || condition(clazz);
                } else {
                    _unless = condition;
                }
                return this;
            },
            /**
             * Adds a custom component configuration.
             * @method configure
             * @param   {Function}  configuration  -  receives
             * {{#crossLink "ComponentModel"}}{{/crossLink}} for configuration
             * @returns {BasedOnBuilder} current builder.
             * @chainable
             */                                        
            configure(configuration) {
                if (_configuration) {
                    const configure  = _configuration;
                    _configuration = component => {
                        configure(component);
                        configuration(component);
                    };
                } else {
                    _configuration = configuration;
                }
                return this;
            },
            builderForClass(member) {
                const basedOn = [],
                      clazz   = member.member || member,
                      name    = member.name;
                if ((_if && !_if(clazz)) || (_unless && _unless(clazz))) {
                    return;
                }
                for (let constraint of constraints) {
                    if ($isProtocol(constraint)) {
                        if (!constraint.adoptedBy(clazz)) {
                            continue;
                        }
                    } else if ($isClass(constraint)) {
                        if (!(clazz.prototype instanceof constraint)) {
                            continue;
                        }
                    }
                    if (basedOn.indexOf(constraint) < 0) {
                        basedOn.push(constraint);
                    }
                }
                if (basedOn.length > 0 || constraints.length === 0) {
                    const keys      = this.withKeys.getKeys(clazz, basedOn, name),
                          component = $component(keys).boundTo(clazz);
                    if (_configuration) {
                        _configuration(component);
                    }
                    return component;
                }
            },
            register(container, composer) {
                return from.register(container, composer);
            }
        });
    }
});

/**
 * Fluent builder for identifying component key(s).
 * @class KeyBuilder
 * @constructor
 * @param  {BasedOnBuilder}  basedOn  -  based on builder
 * @extends Base
 */            
export const KeyBuilder = Base.extend({
    constructor(basedOn) {
        let _keySelector;
        this.extend({
            /**
             * Uses the component class as the key.
             * @method self
             * @returns {BasedOnBuilder} based on builder.
             */
            self() {
                return selectKeys((keys, clazz) => keys.push(clazz));
            },
            /**
             * Uses the based on contraints as the keys.
             * @method basedOn
             * @returns {BasedOnBuilder} based on builder.
             */
            basedOn() {
                return selectKeys((keys, clazz, constraints) => keys.push.apply(keys, constraints));
            },
            /**
             * Uses any class {{#crossLink "Protocol"}}{{/crossLink}} as the key.
             * @method anyService
             * @returns {BasedOnBuilder} based on builder.
             */
            anyService() {
                return selectKeys((keys, clazz) => {
                    const services = $meta(clazz).protocols;
                    if (services.length > 0) {
                        keys.push(services[0]);
                    }
                });
            },
            /**
             * Uses all class {{#crossLink "Protocol"}}{{/crossLink}} as the keys.
             * @method allServices
             * @returns {BasedOnBuilder} based on builder.
             */
            allServices() {
                return selectKeys((keys, clazz) => keys.push(...$meta(clazz).protocols));
            },
            /**
             * Uses the most specific {{#crossLink "Protocol"}}{{/crossLink}} 
             * in the class hierarchy as the key.
             * @method mostSpecificService
             * @returns {BasedOnBuilder} based on builder.
             */
            mostSpecificService(service) {
                return selectKeys((keys, clazz, constraints) => {
                    if ($isProtocol(service)) {
                        _addMatchingProtocols(clazz, service, keys);
                    } else {
                        for (let constraint of constraints) {
                            if ($isFunction(constraint)) {
                                _addMatchingProtocols(clazz, constraint, keys);
                            }
                        }
                    }
                    if (keys.length === 0) {
                        for (let constraint of constraints) {
                            if (constraint !== Base && constraint !== Object) {
                                if ($isProtocol(constraint)) {
                                    if (constraint.adoptedBy(clazz)) {
                                        keys.push(constraint);
                                        break;
                                    }
                                } else if (clazz === constraint ||
                                           clazz.prototype instanceof constraint) {
                                    keys.push(constraint);
                                    break;
                                }
                            }
                        }
                    }
                });
            },
            /**
             * Uses a string as the component name.  
             * If no name is provided, the default name will be used.
             * @method name
             * @param {string | Function}  [n]  -  name or function receiving default name
             * @returns {BasedOnBuilder} based on builder.
             */                
            name(n) {
                return selectKeys((keys, clazz, constraints, name) => {
                    if ($isNothing(n)) {
                        if (name) {
                            keys.push(name);
                        }
                    } else if ($isFunction(n)) {
                        if (name = n(name)) {
                            keys.push(String(name));
                        }
                    } else {
                        keys.push(String(n));
                    }
                });
            },
            /**
             * Gets the component keys to be registered as.
             * @method getKeys
             * @param {Function}  clazz           -  component class
             * @param {Array}     ...constraints  -  initial constraints
             * @param {string}    name            -  default name
             * @returns {Array} component keys.
             */                                
            getKeys(clazz, constraints, name) {
                const keys = [];
                if (_keySelector) {
                    _keySelector(keys, clazz, constraints, name);
                }
                if (keys.length > 0) {
                    return keys;
                }
            }
        });

        function selectKeys(selector) {
            if (_keySelector) { 
                const select = _keySelector;
                _keySelector = (keys, clazz, constraints, name) => {
                    select(keys, clazz, constraints, name);
                    selector(keys, clazz, constraints, name);
                };
            } else {
                _keySelector = selector;
            }
            return basedOn;
        }
    }
});

/**
 * Shortcut for creating a {{#crossLink "FromBuilder"}}{{/crossLink}}.
 * @method $classes
 * @param  {Any}    from        -  any source of classes.  Only Package is currently supported.
 * @param  {Array}  [...names]  -  optional member name filter
 * @return {FromBuilder} from builder.
 */        
export function $classes(from, names) {
    return new FromPackageBuilder(from, names);
}

/**
 * Creates a {{#crossLink "FromBuilder"}}{{/crossLink}} using a Package source.
 * @method $classes.fromPackage
 * @param  {Package}  pkg
 * @param  {Array}    [...names]  -  optional member name filter
 */    
$classes.fromPackage = (pkg, names) => new FromPackageBuilder(pkg, names);

function _unregisterBatch(registrations) {
    return function () {
        for (let registration of registrations) {
            registration();
        }
    };
}

function _addMatchingProtocols(clazz, preference, matches) {
    const toplevel = _toplevelProtocols(clazz);
    for (let protocol of toplevel) {
        if ($meta(protocol).protocols.indexOf(preference) >= 0) {
            matches.push(protocol);
        }
    }
}

function _toplevelProtocols(type) {
    const protocols = $meta(type).protocols,
          toplevel  = protocols.slice();
    for (let protocol of protocols) {
        const parents = $meta(protocol).protocols;
        for (let parent of parents) {
            const index = toplevel.indexOf(parent);
            if (index >= 0) toplevel.splice(index, 1);
        }
    }
    return toplevel;
}

/**
 * Collects dependencies to be injected into components.
 * @class InjectionPolicy
 * @uses ComponentPolicy
 * @extends Base
 */
export const InjectionPolicy = Base.extend(ComponentPolicy, {
    applyPolicy(componentModel) {
        // Dependencies will be merged from inject metadata
        // starting from most derived unitl no more remain or the
        // current definition is fully specified (no holes).
        if (componentModel.allDependenciesDefined()) {
            return;
        }
        let meta = $meta(componentModel.implementation);
        componentModel.manageDependencies(manager => {
            while (meta) {
                inject.getOwn(meta, "constructor", deps => {
                    if (deps.length > 0) {
                        manager.merge(deps);
                    }
                });
                if (componentModel.allDependenciesDefined()) {
                    return;
                }
                meta = meta.parent;
            }
        });
    }
});

/**
 * Executes the {{#crossLink "Initializing"}}{{/crossLink}} protocol.
 * @class InitializationPolicy
 * @uses ComponentPolicy
 * @extends Base
 */
export const InitializationPolicy = Base.extend(ComponentPolicy, {
    componentCreated(component) {
        if ($isFunction(component.initialize)) {
            return component.initialize();
        }
    }        
});

const DEFAULT_POLICIES = [ new InjectionPolicy(), new InitializationPolicy() ];

/**
 * Default Inversion of Control {{#crossLink "Container"}}{{/crossLink}}.
 * @class IoContainer
 * @constructor
 * @extends CallbackHandler
 * @uses Container
 */
export const IoContainer = CallbackHandler.extend(Container, {
    constructor() {
        let _policies = DEFAULT_POLICIES;
        this.extend({
            addComponent(componentModel, ...policies) {
                policies = $flatten(policies, true);
                policies = policies.length > 0
                         ? _policies.concat(policies)
                         : _policies;
                for (let policy of policies) {
                    if ($isFunction(policy.applyPolicy)) {
                        policy.applyPolicy(componentModel, policies);
                    }
                }
                const validation = Validator($composer).validate(componentModel);
                if (!validation.valid) {
                    throw new ComponentModelError(componentModel, validation);
                }
                return this.registerHandler(componentModel, policies); 
            },
            addPolicies(...policies) {
                policies = $flatten(policies, true);
                if (policies.length > 0) {
                    _policies = _policies.concat(policies);
                }
            }                
        })
    },
    register(...registrations) {
        return $flatten(registrations, true).map(
            registration => registration.register(this, $composer));
    },
    registerHandler(componentModel, policies) {
        let   key       = componentModel.key;
        const type      = componentModel.implementation,
              lifestyle = componentModel.lifestyle || new SingletonLifestyle(),
              factory   = componentModel.factory,
              burden    = componentModel.burden;
        key = componentModel.invariant ? $eq(key) : key;
        return _registerHandler(this, key, type, lifestyle, factory, burden, policies); 
    },
    invoke(fn, dependencies, ctx) {
        let   inject  = fn.$inject || fn.inject;
        const manager = new DependencyManager(dependencies);
        if (inject) {
            if ($isFunction(inject)) {
                inject = inject();
            }
            manager.merge(inject);
        }
        dependencies = manager.getItems();
        if (dependencies.length > 0) {
            const burden = { d:  dependencies },
                  deps   = _resolveBurden(burden, true, null, $composer);
            return fn.apply(ctx, deps.d);
        }
        return fn();
    },
    dispose() {
        $provide.removeAll(this);
    }
});

function _registerHandler(container, key, type, lifestyle, factory, burden, policies) {
    return $provide(container, key, function handler(resolution, composer) {
        if (!(resolution instanceof DependencyResolution)) {
            resolution = new DependencyResolution(resolution.key);
        }
        if (!resolution.claim(handler, type)) {  // cycle detected
            return $NOT_HANDLED;
        }
        return lifestyle.resolve(configure => {
            const instant      = $instant.test(resolution.key),
                  dependencies = _resolveBurden(burden, instant, resolution, composer);
            return $isPromise(dependencies)
                 ? dependencies.then(createComponent)
                 : createComponent(dependencies);
            function createComponent(dependencies) {
                const component = factory.call(composer, dependencies);
                if ($isFunction(configure)) {
                    configure(component, dependencies);
                }
                return applyPolicies(0);
                function applyPolicies(index) {
                    for (let i = index; i < policies.length; ++i) {
                        const policy = policies[i];
                        if ($isFunction(policy.componentCreated)) {
                            const result = policy.componentCreated(component, dependencies, composer);
                            if ($isPromise(result)) {
                                return result.then(() => applyPolicies(i + 1));
                            }
                        }
                    }
                    return component;
                }
            }
        }, composer);
    }, lifestyle.dispose.bind(lifestyle));
}

function _resolveBurden(burden, instant, resolution, composer) {
    const promises     = [],
          dependencies = {},
          containerDep = Container(composer);
    for (let key in burden) {
        const group = burden[key];
        if ($isNothing(group)) {
            continue;
        }
        const resolved = group.slice();
        for (let index = 0; index < resolved.length; ++index) {
            const dep = resolved[index];
            if (dep === undefined) {
                continue;
            }
            const use        = dep.test(DependencyModifier.Use),
                  lazy       = dep.test(DependencyModifier.Lazy),
                  promise    = dep.test(DependencyModifier.Promise),
                  child      = dep.test(DependencyModifier.Child),
                  dynamic    = dep.test(DependencyModifier.Dynamic);
            let   dependency = dep.dependency;
            if (use || dynamic || $isNothing(dependency)) {
                if (dynamic && $isFunction(dependency)) {
                    dependency = dependency(containerDep);
                }
                if (child) {
                    dependency = _createChild(dependency);
                }
                if (promise) {
                    dependency = Promise.resolve(dependency);
                }
            } else if (dependency === $$composer) {
                dependency = composer;
            } else if (dependency === Container) {
                dependency = containerDep;
            } else {
                const all           = dep.test(DependencyModifier.Every),
                      optional      = dep.test(DependencyModifier.Optional),
                      invariant     = dep.test(DependencyModifier.Invariant),
                      fromContainer = dep.test(DependencyModifier.Container);
                if (invariant) {
                    dependency = $eq(dependency);
                }
                if (instant) {
                    dependency = $instant(dependency);
                }
                if (lazy) {
                    dependency = (function (paramDep, created, param) {
                        return function () {
                            if (!created) {
                                created = true;
                                const container = fromContainer ? containerDep : composer;
                                param = _resolveDependency(paramDep, false, promise, child, all, container);
                            }
                            return param;
                        };
                    })(dependency);
                } else {
                    const paramDep  = new DependencyResolution(dependency, resolution, all),
                          container = fromContainer ? containerDep : composer;
                    dependency = _resolveDependency(paramDep, !optional, promise, child, all, container);
                    if (!promise && $isPromise(dependency)) {
                        promises.push(dependency);
                        dependency.then(param => resolved[index] = param);
                    }
                }
            }
            resolved[index] = dependency;
        }
        dependencies[key] = resolved;
    }
    if (promises.length === 1) {
        return promises[0].then(() => dependencies);
    } else if (promises.length > 1) {
        return Promise.all(promises).then(() => dependencies);
    }
    return dependencies;
}

function _resolveDependency(dependency, required, promise, child, all, composer) {
    let result = all ? composer.resolveAll(dependency) : composer.resolve(dependency);
    if (result === undefined) {
        if (required) {
            const error = new DependencyResolutionError(dependency);
            if ($instant.test(dependency.key)) {
                throw error;
            }
            return Promise.reject(error);
        }
        return result;
    }
    if (child && !all) {
        result = $isPromise(result) ? result.then(_createChild) : _createChild(result);
    }
    return promise ? Promise.resolve(result) : result;
}

function _createChild(parent) {
    if (!(parent && $isFunction(parent.newChild))) {
        throw new Error(`Child dependency requested, but ${parent} is not a parent.`);
    }
    return parent.newChild();
}
