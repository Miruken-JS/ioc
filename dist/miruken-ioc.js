import {Protocol,Metadata,$flatten,StrictProtocol,Invoking,Disposing,Flags,Base,ArrayManager,Modifier,$createModifier,$use,$lazy,$every,$eval,$child,$optional,$promise,$eq,Abstract,DisposingMixin,$isFunction,Facet,ProxyBuilder,$isSomething,$isProtocol,$isClass,$isNothing,$protocols,inject,$isPromise,$instant,$using,$decorated} from 'miruken-core';
import {Resolution,CallbackHandler,$provide,$composer,$NOT_HANDLED} from 'miruken-callback';
import {Context,ContextualHelper,contextual} from 'miruken-context';
import {validateThat,Validator,ValidationCallbackHandler} from 'miruken-validate';
import {expect} from 'chai';

const policyMetadataKey = Symbol();

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
 * Attaches one or more policies to a component.
 * @method policy
 * @param  {Array}  ...policies  -  component policies
 */  
export const policy = Metadata.decorator(policyMetadataKey, (target, policies) => {
    policies = $flatten(policies, true);
    if (policies.length > 0) {
        Metadata.getOrCreateOwn(policyMetadataKey, target, () => [])
            .push(...policies);
    };
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
                        if (!constraint.isAdoptedBy(clazz)) {
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
                    const services = $protocols(clazz);
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
                return selectKeys((keys, clazz) => keys.push(...$protocols(clazz)));
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
                                    if (constraint.isAdoptedBy(clazz)) {
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
        if ($protocols(protocol).indexOf(preference) >= 0) {
            matches.push(protocol);
        }
    }
}

function _toplevelProtocols(type) {
    const protocols = $protocols(type),
          toplevel  = protocols.slice();
    for (let protocol of protocols) {
        const parents = $protocols(protocol);
        for (let parent of parents) {
            const index = toplevel.indexOf(parent);
            if (index >= 0) toplevel.splice(index, 1);
        }
    }
    return toplevel;
}

/**
 * Collects constructor dependencies to be injected.
 * @class ConstructorPolicy
 * @uses ComponentPolicy
 * @extends Base
 */
export const ConstructorPolicy = Base.extend(ComponentPolicy, {
    applyPolicy(componentModel) {
        const implementation = componentModel.implementation;
        
        // Dependencies will be merged from inject metadata
        // starting from most derived unitl no more remain or the
        // current definition is fully specified (no holes).
        if (!implementation || componentModel.allDependenciesDefined()) {
            return;
        }
        componentModel.manageDependencies(manager => inject.collect(
            implementation.prototype, "constructor", deps => {
                if (deps.length > 0) {
                    manager.merge(deps);
                    return componentModel.allDependenciesDefined();
                }
            }));
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

/**
 * Expands any Metadata implementation policies to be applied.
 * @class PolicyMetadataPolicy
 * @uses ComponentPolicy
 * @extends Base
 */
export const PolicyMetadataPolicy = Base.extend(ComponentPolicy, {
    applyPolicy(componentModel, policies) {
        const implementation = componentModel.implementation;
        if (implementation) {
            const index = policies.length;
            policy.collect(implementation, ps => policies.splice(index, 0, ...ps));
        }
    }
});


const DEFAULT_POLICIES = [
    new ConstructorPolicy(),
    new InitializationPolicy(),
    new PolicyMetadataPolicy()
];

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
                let policyIndex = 0;                
                policies = _policies.concat($flatten(policies, true));
                while (policyIndex < policies.length) {
                    const policy = policies[policyIndex++];
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

import * as car from "./car-model";

describe("DependencyModel", () => {
    describe("#dependency", () => {
        it("should return actual dependency", () => {
            const dependency = new DependencyModel(22);
            expect(dependency.dependency).to.equal(22);
        });

        it("should coerce dependency", () => {
            const dependency = DependencyModel(car.Engine);
            expect(dependency.dependency).to.equal(car.Engine);
        });

        it("should not ceorce undefined dependency", () => {
            const dependency = DependencyModel();
            expect(dependency).to.be.undefined;
        });
    });

    describe("#test", () => {
        it("should test dependency modifier", () => {
            const dependency = new DependencyModel(22, DependencyModifier.Use);
            expect(dependency.test(DependencyModifier.Use)).to.be.true;
        });
    });
});

describe("ComponentModel", () => {
    describe("#getKey", () => {
        it("should return class if no key", () => {
            const componentModel = new ComponentModel();
            componentModel.implementation = car.Ferrari;
            expect(componentModel.key).to.equal(car.Ferrari);
        });
    });

    describe("#setImplementation", () => {
        it("should reject invalid class", () => {
            const componentModel = new ComponentModel();
            expect(() => {
                componentModel.implementation = 1;
            }).to.throw(Error, "1 is not a class.");
        });
    });

    describe("#getFactory", () => {
        it("should return default factory", () => {
            const componentModel = new ComponentModel();
            componentModel.implementation = car.Ferrari;
            expect(componentModel.factory).to.be.a("function");
        });
    });

    describe("#setFactory", () => {
        it("should reject factory if not a function", () => {
            const componentModel = new ComponentModel();
            expect(() => {
                componentModel.factory = true;
            }).to.throw(Error, "true is not a function.");
        });
    });

    describe("#manageDependencies", () => {
        it("should manage dependencies", () => {
            const componentModel = new ComponentModel(),
                  dependencies   = componentModel.manageDependencies(
                      deps => deps.append(car.Car, 22));
            expect(dependencies).to.have.length(2);
            expect(dependencies[0].dependency).to.equal(car.Car);
            expect(dependencies[1].dependency).to.equal(22);
        });
    });

    let context, container;
    beforeEach(() => {
        context   = new Context;
        container = Container(context);
        context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
    });

    describe("#constructor", () => {
        it("should configure component fluently", done => {
            container.register($component(car.V12));
            Promise.resolve(container.resolve(car.V12)).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });
    });

    describe("#instance", () => {
        it("should use supplied instance", done => {
            const v12 = new car.V12(333, 4.2);
            container.register($component(car.V12).instance(v12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine).to.equal(v12);
                done();
            });
        });
    });

    describe("#singleton", () => {
        it("should configure singleton component", done => {
            container.register($component(car.V12).singleton());
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine2).to.equal(engine1);
                    done();
                });
        });
    });

    describe("#transient", () => {
        it("should configure transient component", done => {
            container.register($component(car.V12).transient());
            Promise.all([container.resolve(car.V12), container.resolve(car.V12)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine2).to.not.equal(engine1);
                    done();
                });
        });
    });

    describe("#contextual", () => {
        it("should configure contextual component", done => {
            container.register($component(car.V12).contextual());
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine2).to.equal(engine1);
                    const childContext = context.newChild();
                    $using(childContext, 
                           Promise.resolve(Container(childContext).resolve(car.V12)).then(
                               engine3 => {
                                   expect(engine3).to.not.equal(engine1);
                                   done();
                               })
                    );
                });
        });
    });

    describe("#boundTo", () => {
        it("should configure component implementation", done => {
            container.register($component(car.Engine).boundTo(car.V12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });

        it("should configure component name", done => {
            container.register($component("engine").boundTo(car.V12));
            Promise.resolve(container.resolve("engine")).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });
    });

    describe("#usingFactory", () => {
        it("should create components with factory", done => {
             container.register(
                 $component(car.Engine).usingFactory(() => new car.V12(450, 6.2))
             );
             Promise.resolve(container.resolve(car.Engine)).then(engine => {
                 expect(engine).to.be.instanceOf(car.V12);
                 expect(engine.horsepower).to.equal(450);
                 expect(engine.displacement).to.equal(6.2);
                 done();
            });
        });
    });

    describe("#dependsOn", () => {
        it("should configure component dependencies", done => {
            container.register(
                $component(car.Engine).boundTo(car.V12)
                                  .dependsOn($use(255), $use(5.0))
            );
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(255);
                expect(engine.displacement).to.equal(5.0);
                done();
            });
        });

        it("should configure component dependencies with factory", done => {
            container.register(
                $component(car.Engine).dependsOn($use(1000), $use(7.7))
                    .usingFactory(burden =>  Reflect.construct(car.V12, burden[Facet.Parameters]))
            );
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                expect(engine.horsepower).to.equal(1000);
                expect(engine.displacement).to.equal(7.7);
                done();
            });
        });
    });

    describe("#interceptors", () => {
        it("should configure component interceptors", done => {
            container.register(
                $component(car.LogInterceptor),
                $component(car.Engine).boundTo(car.V12)
                                  .dependsOn($use(255), $use(5.0))
                                  .interceptors(car.LogInterceptor)
            );
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                const i = 0;
                expect(engine.horsepower).to.equal(255);
                expect(engine.displacement).to.equal(5.0);
                done();
            });
        });
    });
});

describe("ComponentBuilder", () => {
    let context, container;
    beforeEach(() => {
        context   = new Context();
        container = Container(context);
        context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
    });
    
    describe("#constructor", () => {
        it("should configure component fluently", done => {
            container.register($component(car.V12));
            Promise.resolve(container.resolve(car.V12)).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });
    });
    
    describe("#boundTo", () => {
        it("should configure component implementation", done => {
            container.register($component(car.Engine).boundTo(car.V12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });
            
        it("should configure component name", done => {
            container.register($component("engine").boundTo(car.V12));
            Promise.resolve(container.resolve("engine")).then(engine => {
                expect(engine).to.be.instanceOf(car.V12);
                done();
            });
        });
    });
    
    describe("#dependsOn", () => {
        it("should configure component dependencies", done => {
            container.register($component(car.Engine).boundTo(car.V12).dependsOn($use(255), $use(5.0)));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(255);
                expect(engine.displacement).to.equal(5.0);
                done();
            });
        });
    });

    describe("#interceptors", () => {
        it("should configure component interceptors", done => {
            container.register($component(car.LogInterceptor),
                               $component(car.Engine).boundTo(car.V12)
                                   .dependsOn($use(255), $use(5.0))
                                   .interceptors(car.LogInterceptor));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(255);
                expect(engine.displacement).to.equal(5.0);
                done();
            });
        });
    });
});

describe("SingletonLifestyle", () => {
    describe("#resolve", () => {
        const context   = new Context(),
              container = Container(context);
        context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        
        it("should resolve same instance for SingletonLifestyle", done => {
            container.register($component(car.V12).singleton());
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.equal(engine2);
                    done();
                });
        });
    });

    describe("#dispose", () => {
        it("should dispose instance when unregistered", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            const unregister = container.register(
                $component(car.RebuiltV12).singleton(), $component(car.CraigsJunk))[0];
            Promise.all([container.resolve(car.Engine), container.resolve(car.Junkyard)])
                .then(([engine, junk]) => {
                    unregister();
                    expect(junk.parts).to.eql([engine]);
                    done();
            });
        });

        it("should not dispose instance when called directly", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            Promise.all(container.register($component(car.RebuiltV12),
                                     $component(car.CraigsJunk))).then(() => {
                Promise.all([container.resolve(car.Engine), container.resolve(car.Junkyard)])
                    .then(([engine, junk]) => {
                        engine.dispose();
                        expect(junk.parts).to.eql([]);
                        done();
                    });
            });
        });
    });
});

describe("TransientLifestyle", () => {
    describe("#resolve", () => {
        const context   = new Context(),
              container = Container(context);
        context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        
        it("should resolve diferent instance for TransientLifestyle", done => {
            container.register($component(car.V12).transient());
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.not.equal(engine2);
                    done();
                });
        });
    });
});

describe("ContextualLifestyle", () => {
    const Controller = Base.extend(contextual, {
        @inject($optional(Context))
        constructor(context) {
            this.context = context;
        },
        initialize() {
            Object.defineProperty(this, "initialized", { value: !!this.context });
        }
    });
    
    describe("#resolve", () => {
        it("should resolve diferent instance per context for ContextualLifestyle", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            container.register($component(car.V12).contextual());
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.equal(engine2);
                    const childContext = context.newChild();
                    $using(childContext, 
                           Promise.resolve(Container(childContext).resolve(car.Engine)).then(engine3 => {
                               expect(engine3).to.not.equal(engine1);
                               done();
                           })
                    );
            });
        });

        it("should implicitly satisfy Context dependency", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            container.register($component(Controller));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context).to.equal(context);
                done();
            });
        });

        it("should set context after resolved", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            container.register($component(Controller).contextual().dependsOn([]));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context).to.equal(context);
                done();
            });
        });

        it("should fulfill child Context dependency", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            container.register($component(Controller).dependsOn($child(Context)));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context.parent).to.equal(context);
                done();
            });
        });

        it("should resolve nothing if context not available", done => {
            const container = (new ValidationCallbackHandler()).next(new IoContainer);
            Container(container).register($component(car.V12).contextual());
            Promise.resolve(Container(container).resolve(car.Engine)).then(engine => {
                expect(engine).to.be.undefined;
                done();
            });
        });

        it("should reject Context dependency if context not available", done => {
            const container = (new ValidationCallbackHandler()).next(new IoContainer);
            Container(container).register($component(Controller).dependsOn(Context));
            Promise.resolve(Container(container).resolve(Controller)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect(error.dependency.key).to.equal(Context);
                done();
            });
        });

        it("should not fail if optional child Context and no context available", done => {
            const container = (new ValidationCallbackHandler()).next(new IoContainer);
            Container(container).register($component(Controller).dependsOn($optional($child(Context))));
            Promise.resolve(Container(container).resolve(Controller)).then(controller => {
                done();
            });
        });
    });

    describe("#dispose", () => {
        it("should dispose unregistered components", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            const unregister = container.register(
                $component(car.RebuiltV12).contextual(), $component(car.CraigsJunk))[0];
            Promise.all([container.resolve(car.Engine), container.resolve(car.Junkyard)])
                .then(([engine, junk]) => {
                     unregister();
                     expect(junk.parts).to.eql([engine]);
                     done();
                });
        });

        it("should dispose components when context ended", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            Promise.all(container.register($component(car.RebuiltV12).contextual(),
                                     $component(car.CraigsJunk))).then(() => {
                let   engine, junk;
                const childContext = context.newChild();
                $using(childContext, 
                       Promise.all([Container(childContext).resolve(car.Engine),
                              Container(childContext).resolve(car.Junkyard)]).then(([e, j]) => {
                           engine = e, junk = j;
                      })
                ).finally(() => {
                      expect(junk.parts).to.eql([engine]);
                      done();
                  });
            });
        });

        it("should not dispose instance when called directly", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
            Promise.all(container.register($component(car.RebuiltV12).contextual(),
                                     $component(car.CraigsJunk))).then(() => {
                Promise.all([container.resolve(car.Engine), container.resolve(car.Junkyard)])
                    .then(([engine, junk]) => {
                        engine.dispose();
                        expect(junk.parts).to.eql([]);
                        done();
                });
            });
        });
    })
});

describe("IoContainer", () => {
    const Policy1 =  Base.extend(ComponentPolicy, {
        componentCreated(component, dependencies) {
            component.policies = ["Policy1"];
        }
    });
    
    const Policy2 =  Base.extend(ComponentPolicy, {
        componentCreated(component, dependencies) {
            return Promise.delay(2).then(() => {
                component.policies.push("Policy2");
            });
        }
    });
    
    const Policy3 =  Base.extend(ComponentPolicy, {
        componentCreated(component, dependencies) {
            component.policies.push("Policy3");
        }
    });
    
    describe("#register", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });

        it("should register component from class", () => {
            container.register($component(car.Ferrari));
        });

        it("should register component from protocol and class", () => {
            container.register($component(car.Car).boundTo(car.Ferrari));
        });

        it("should register component from name and class", () => {
            container.register($component("car").boundTo(car.Ferrari));
        });

        it("should register component as singletons by default", done => {
            container.register($component(car.V12));
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine2).to.equal(engine1);
                    done();
                });
        });
        
        it("should unregister component", done => {
            const unregister = container.register($component(car.V12))[0];
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                unregister();
                expect(engine).to.be.instanceOf(car.V12);
                expect(container.resolve(car.Engine)).to.be.undefined;
                done();
            });
        });

        it("should reject registration if no key", done => {
            try {
                container.register($component());
            }
            catch (error) {
                expect(error).to.be.instanceOf(ComponentModelError);
                expect(error.validationResults["key"].errors["required"][0]).to.eql({
                    message: "Key could not be determined for component."
                });
                done();
            }
        });

        it("should reject registration if no factory", done => {
            try {
                container.register($component("car"));
            }
            catch (error) {
                expect(error).to.be.instanceOf(ComponentModelError);
                expect(error.validationResults["factory"].errors["required"][0]).to.eql({
                    message: "Factory could not be determined for component."
                });
                done();
            }
        });
    });

    describe("#addPolicies", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });
        
        it("should apply policies container-wide", done => {
            container.addPolicies(new Policy1(), new Policy2(), new Policy3());
            container.register($component(car.V12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.policies).to.eql(["Policy1", "Policy2", "Policy3"]);
                done();
            });
        });        

        it("should apply policies array container-wide", done => {
            container.addPolicies([new Policy1(), new Policy2(), new Policy3()]);
            container.register($component(car.V12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.policies).to.eql(["Policy1", "Policy2", "Policy3"]);
                done();
            });
        });

        it("should change the default lifestyle to transient", done => {
            container.addPolicies(new TransientLifestyle());
            container.register($component(car.V12));
            Promise.all([container.resolve(car.Engine), container.resolve(car.Engine)])
                .then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine2).to.not.equal(engine1);
                    done();
                });
        });

        it.("should apply policies from metadata", done => {
            const Component = Base.extend(policy(new Policy1(), new Policy2()));
            container.register($component(Component));
            Promise.resolve(container.resolve(Component)).then(component => {
                expect(component.policies).to.eql(["Policy1", "Policy2"]);
                done();
            });
        });        
    });
    
    describe("#resolve", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });

        it("should resolve component", done => {
            container.register($component(car.Ferrari), $component(car.V12));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.be.instanceOf(car.V12);
                done();
            });
        });
        
        it("should resolve nothing if component not found", done => {
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.undefined;
                done();
            });
        });

        it("should resolve class invariantly", done => {
            container.register($component(car.Ferrari), $component(car.V12));
            Promise.resolve(container.resolve($eq(car.Car))).then(c => {
                expect(c).to.be.undefined;
                Promise.resolve(container.resolve($eq(car.Ferrari))).then(c => {
                    expect(c).to.be.instanceOf(car.Ferrari);
                    expect(c.engine).to.be.instanceOf(car.V12);
                    done();
                });
            });
        });

        it("should resolve class instantly", () => {
            container.register($component(car.Ferrari), $component(car.V12));
            const c = container.resolve($instant(car.Car));
            expect(c).to.be.instanceOf(car.Ferrari);
            expect(c.engine).to.be.instanceOf(car.V12);
        });

        it("should resolve instance with supplied dependencies", done => {
            container.register($component(car.V12).dependsOn($use(917), $use(6.3)));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(917);
                expect(engine.displacement).to.equal(6.3);
                done();
            });
        });

        it("should resolve instance using decorator pattern", done => {
            container.register(
                $component(car.Supercharger).dependsOn([,$use(.5)]),
                $component(car.V12).dependsOn($use(175), $use(3.2)));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(262.5);
                expect(engine.displacement).to.equal(3.2);
                done();
            });
        });

        it("should resolve instance with dependency promises", done => {
            const Order = Base.extend({
                    @inject($promise(car.Engine), $promise($use(19)))
                    constructor(engine, count) {
                        this.extend({
                            get engine() { return engine; },
                            get count() { return count; }
                        });
                    }
                });
            container.register($component(Order), $component(car.V12));
            Promise.resolve(container.resolve(Order)).then(order => {
                expect($isPromise(order.engine)).to.be.true;
                expect($isPromise(order.count)).to.be.true;
                Promise.all([order.engine, order.count]).then(([engine, count]) => {
                    expect(engine).to.be.instanceOf(car.V12);
                    expect(count).to.equal(19);
                    done();
                });
            });
        });

        it("should override dependencies", done => {
            container.register(
                $component(car.Ferrari).dependsOn($use("Enzo"), $optional(car.Engine)),
                $component(car.V12));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.be.instanceOf(car.V12);
                done();
            });
        });

        it("should accept null dependnecies", done => {
            container.register($component(car.Ferrari).dependsOn(null, null));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.be.null;
                done();
            });
        });

        it("should resolve instance with optional dependencies", done => {
            container.register($component(car.Ferrari), $component(car.V12), $component(car.OBDII));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                const diagnostics = c.engine.diagnostics;
                expect(diagnostics).to.be.instanceOf(car.OBDII);
                expect(diagnostics.mpg).to.equal(22.0);
                done();
            });
        });

        it("should resolve instance with optional missing dependencies", done => {
            container.register($component(car.Ferrari).dependsOn($optional(car.Engine)));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.be.undefined;
                done();
            });
        });

        it("should resolve instance with lazy dependencies", done => {
            const Order = Base.extend({
                    @inject($lazy(car.Engine), $lazy($use(9)))
                    constructor(engine, count) {
                        this.extend({
                            get engine() { return engine(); },
                            get count() { return count; }
                        });
                    }
                });
            container.register($component(Order), $component(car.V12));
            Promise.resolve(container.resolve(Order)).then(order => {
                Promise.all([order.engine, order.engine]).then(([engine1, engine2]) => {
                    expect(engine1).to.be.instanceOf(car.V12);
                    expect(engine1).to.equal(engine2);
                    expect(order.count).to.equal(9);
                    done();
                });
            });
        });

        it("should not fail resolve when missing lazy dependencies", done => {
            const Order = Base.extend({
                    @inject($lazy(car.Engine))
                    constructor(engine) {
                        this.extend({
                            get engine() { return engine(); }
                        });
                    }
                });
            container.register($component(Order));
            Promise.resolve(container.resolve(Order)).then(order => {
                expect(order).to.be.instanceOf(Order);
                expect(order.engine).to.be.undefined;
                done();
            });
        });

        it("should delay rejecting lazy dependency failures", done => {
            const Order = Base.extend({
                    @inject($lazy(car.Car))
                    constructor(c) {
                        this.extend({
                            get car() { return c(); }
                        });
                    }
                });
            container.register($component(Order), $component(car.Ferrari));
            Promise.resolve(container.resolve(Order)).then(order => {
                expect(order).to.be.instanceOf(Order);
                Promise.resolve(order.car).catch(error => {
                    expect(error).to.be.instanceof(DependencyResolutionError);
                    expect(error.dependency.key).to.eql(car.Engine);
                    expect(error.dependency.parent.key).to.eql(car.Car);
                    expect(error.dependency.parent.type).to.equal(car.Ferrari);
                    //expect(error.message).to.match(/Dependency.*Engine.*<=.*Car.*could not be resolved./);
                    done();
                });
            });
        });

        it("should resolve instance with invariant dependencies", done => {
            container.register($component(car.Ferrari).dependsOn($use("Spider"), $eq(car.V12)),
                               $component(car.Engine).boundTo(car.V12));
            Promise.resolve(container.resolve(car.Car)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect($eq.test(error.dependency.key)).to.be.true;
                expect(Modifier.unwrap(error.dependency.key)).to.eql(car.V12);
                expect(error.dependency.parent.type).to.equal(car.Ferrari);                
                //expect(error.message).to.match(/Dependency.*`.*V12.*`.*<=.*Car.*could not be resolved./);
                container.register($component(car.V12));
                Promise.resolve(container.resolve(car.Car)).then(c => {
                    expect(c).to.be.instanceOf(car.Ferrari);
                    expect(c.engine).to.be.instanceOf(car.V12);
                    done();
                });
            });
        });

        it("should resolve instance with dynamic dependencies", done => {
            let   count   = 0;
            const counter = function () { return ++count; },
                  Order = Base.extend({
                      @inject(car.Engine, $eval(counter))
                      constructor(engine, count) {
                          this.extend({
                              get engine() { return engine; },
                              get count() { return count; }
                         });
                      }
                  });
            Promise.all(container.register($component(Order).transient(),
                                           $component(car.V12))).then(reg => {
                Promise.all([container.resolve(Order), container.resolve(Order)])
                    .then(([order1, order2]) => {
                        expect(order1.count).to.equal(1);
                        expect(order2.count).to.equal(2);
                        done();
                    });
            });
        });

        it("should behave like $use if no function passed to $eval", done => {
            const  Order = Base.extend({
                    @inject(car.Engine, $eval(5))
                    constructor(engine, count) {
                        this.extend({
                            get engine() { return engine; },
                            get count() { return count; }
                        });
                    }
                });
            Promise.all(container.register($component(Order).transient(),
                                           $component(car.V12))).then(reg => {
                Promise.all([container.resolve(Order), container.resolve(Order)])
                    .then(([order1, order2]) => {
                        expect(order1.count).to.equal(5);
                        expect(order2.count).to.equal(5);
                        done();
                    });
            });
        });

        it("should implicitly satisfy container dependency", done => {
            const Registry = Base.extend({
                    @inject(Container)
                    constructor(container) {
                        this.extend({
                            get container() { return container; },
                        });
                    }
                });
            container.register($component(Registry));
            Promise.resolve(container.resolve(Registry)).then(registry => {
                 expect(registry.container).to.be.instanceOf(Container);
                 done();
            });
        });

        it("should implicitly satisfy composer dependency", done => {
            const Registry = Base.extend({
                    @inject($$composer)
                    constructor(composer) {
                        this.extend({
                            get composer() { return composer; },
                        });
                    }
                });
            container.register($component(Registry));
            Promise.resolve(container.resolve(Registry)).then(registry => {
                expect($decorated(registry.composer)).to.equal(context);
                Promise.resolve(Validator(registry.composer).validate(registry))
                    .then(validation => {
                        expect(validation.valid).to.be.true;
                });
                done();
            });
        });

        it("should have opportunity to resolve missing components", done => {
            const context   = new Context(),
                  container = new IoContainer();
            context.addHandlers(container, new ValidationCallbackHandler());
            $provide(container, car.Car, (resolution, composer) => {
                return new car.Ferrari("TRS", new car.V12(917, 6.3));
            });
            Promise.resolve(Container(context).resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.model).to.equal("TRS");
                expect(c.engine).to.be.instanceOf(car.V12);
                done();
            });
        });

        it("should resolve external dependencies", done => {
            const engine = new car.V12();
            context.store(engine);
            container.register($component(car.Ferrari));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.equal(engine);
                done();
            });
        });

        it("should call initialize", done => {
            container.register($component(car.V12));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.calibrated).to.be.true;
                done();
            });
        });

        it("should wait on promise from initialize", done => {
            const SelfCheckV12 = car.V12.extend({
                initialize() {
                    this.base();
                    return Promise.delay(2).then(() => this.selfCheck = true);
                }
            });
            container.register($component(SelfCheckV12));
            Promise.resolve(container.resolve(SelfCheckV12)).then(engine => {
                expect(engine.calibrated).to.be.true;
                expect(engine.selfCheck).to.be.true;
                done();
            });
        });        
        
        it("should apply policies after creation", done => {
            container.register($component(car.V12).policies(new Policy1(), new Policy2(), new Policy3()));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.policies).to.eql(["Policy1", "Policy2", "Policy3"]);
                done();
            });
        });        

        it("should apply policies array after creation", done => {
            container.register($component(car.V12).policies([new Policy1(), new Policy2(), new Policy3()]));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.policies).to.eql(["Policy1", "Policy2", "Policy3"]);
                done();
            });
        });        
        
        it("should resolve in new context", done => {
            const Workflow = Base.extend(contextual);
            container.register($component(Workflow).newInContext());
            Promise.resolve(container.resolve(Workflow)).then(workflow => {
                expect(workflow).to.be.instanceOf(Workflow);
                expect(workflow.context).to.equal(context);
                done();
            });
        });

        it("should resolve in new child context", done => {
            const AssemblyLine = Base.extend({
                @inject(car.Engine)
                constructor(engine) {
                    this.extend({
                        get engine() { return engine; }
                    });
                }    
            });
            container.register($component(car.V12), $component(AssemblyLine).newInChildContext());
            Promise.resolve(container.resolve(AssemblyLine)).then(assembleEngine => {
                expect(assembleEngine).to.be.instanceOf(AssemblyLine);
                expect(assembleEngine.engine).to.be.instanceOf(car.V12);
                expect(assembleEngine.context.parent).to.equal(context);
                done();
            });
        });

        it("should ignore external dependencies for $container", done => {
            context.store(new car.V12());
            container.register($component(car.Ferrari).dependsOn($container(car.Engine)));
            Promise.resolve(container.resolve(car.Car)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect(error.dependency.key).to.eql(car.Engine);
                expect(error.dependency.parent.key).to.eql(car.Car);
                expect(error.dependency.parent.type).to.equal(car.Ferrari);
                // expect(error.message).to.match(/Dependency.*car.Engine.*<= (.*Car.*<-.*Ferrari.*)could not be resolved./);
                done();
            });
        });

        it("should use child contexts to manage child containers", done => {
            const Order = Base.extend({
                    @inject(car.Car)
                    constructor(c) {
                        this.extend({
                            get car() { return c; }
                        });
                    }
                }),
                childContext = context.newChild();
            $using(childContext, 
                   Promise.all([Container(childContext).register(
                               $component(Order), $component(car.RebuiltV12)),
                          container.register($component(car.Ferrari), $component(car.OBDII),
                                             $component(car.CraigsJunk))]).then(() => {
                    Promise.resolve(container.resolve(Order)).then(order => {
                        const c           = order.car,
                              engine      = c.engine,
                              diagnostics = engine.diagnostics;
                        expect(c).to.be.instanceOf(car.Ferrari);
                        expect(engine).to.be.instanceOf(car.RebuiltV12);
                        expect(diagnostics).to.be.instanceOf(car.OBDII);
                        done();
                    });
                })
            );
        });

        it("should resolve collection dependencies", done => {
            container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                               $component(car.Bugatti).dependsOn($use("Veyron")),
                               $component(car.V12), $component(car.Auction));
            Promise.resolve(container.resolve(car.Auction)).then(auction => {
                const cars = auction.cars;
                expect(cars["Ferrari"]).to.have.length(1);
                expect(cars["Bugatti"]).to.have.length(1);
                done();
            });
        });

        it("should resolve collection dependencies from child containers", done => {
            container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                               $component(car.Bugatti).dependsOn($use("Veyron")),
                               $component(car.V12));
            const childContext = context.newChild();
            $using(childContext, ctx => {
                   Container(ctx).register(
                       $component(car.Ferrari).dependsOn($use("California")),
                       $component(car.Auction)
                   );
                   Promise.resolve(Container(ctx).resolve(car.Auction)).then(auction => {
                       const cars  = auction.cars;
                       expect(cars["Ferrari"]).to.have.length(2);
                       const ferraris = cars["Ferrari"].map(ferrari => ferrari.model);
                       expect(ferraris).to.eql(["LaFerrari", "California"]);
                       expect(cars["Bugatti"]).to.have.length(1);
                       done();
                   });
            });
        });

        it("should fail resolve if missing dependencies", done => {
            container.register($component(car.Ferrari));
            Promise.resolve(container.resolve(car.Car)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect(error.dependency.key).to.eql(car.Engine);
                expect(error.dependency.parent.key).to.eql(car.Car);
                expect(error.dependency.parent.type).to.equal(car.Ferrari);                
                //expect(error.message).to.match(/Dependency.*car.Engine.*<= (.*Car.*<-.*Ferrari.*)could not be resolved./);
                done();
            });
        });
        
        it("should detect circular dependencies", done => {
            container.register($component(car.Ferrari),
                               $component(car.V12).dependsOn($use(917), $use(6.3), car.Engine));
            Promise.resolve(container.resolve(car.Car)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect(error.dependency.key).to.eql(car.Engine);
                expect(error.dependency.parent.key).to.eql(car.Engine);
                expect(error.dependency.parent.type).to.equal(car.V12);
                expect(error.dependency.parent.parent.key).to.eql(car.Car);
                expect(error.dependency.parent.parent.type).to.equal(car.Ferrari);
                //expect(error.message).to.match(/Dependency.*Engine.*<= (.*Engine.*<-.*V12.*) <= (.*Car.*<-.*Ferrari.*) could not be resolved./);
                done();
            });
        });

        it("should resolve from container for invocation", done => {
            container.register($component(car.V12).dependsOn($use(917), $use(6.3)));
            expect(car.Engine(context).rev(4000)).to.be.true;
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.horsepower).to.equal(917);
                expect(engine.displacement).to.equal(6.3);                
                expect(engine.rpm).to.equal(4000);
                done();
            });
        });

        it("should fail invocation if component not found", () => {
            expect(() => {
                car.Engine(context).rev(4000);                
            }).to.throw(Error, /has no method 'rev'/);
        });       
    });

    describe("#resolveAll", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });

        it("should resolve all components", done => {
            container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                               $component(car.Bugatti).dependsOn($use("Veyron")),
                               $component(car.V12));
            Promise.resolve(container.resolveAll(car.Car)).then(cars => {
                const makes     = cars.map(c => c.make),
                      models    = cars.map(c => c.model),
                      inventory = {};
                makes.forEach((make, i) => inventory[make] = models[i]);
                expect(inventory["Ferrari"]).to.equal("LaFerrari");
                expect(inventory["Bugatti"]).to.equal("Veyron");
                done();
            });
        });
    });

    describe("#invoke", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });

        function jump() {};

        function drive(c) {
            return c;
        }
        drive.$inject = [car.Car];

        function supercharge(engine) {}
        supercharge.$inject = [car.Engine];

        it("should invoke function with no dependencies", () => {
            expect(container.invoke(jump)).to.be.undefined;
        });

        it("should invoke with user supplied dependencies", () => {
            const ferarri = new car.Ferrari();
            expect(container.invoke(drive, [$use(ferarri)])).to.equal(ferarri);
        });

        it("should invoke with container supplied dependencies", () => {
            container.register($component(car.Ferrari), $component(car.V12));
            const c = container.invoke(drive);
            expect(c).to.be.instanceOf(car.Ferrari);
        });

        it("should fail if dependencies not resolved", () => {
            try {
                container.invoke(supercharge);
                expect.fail();                
            }
            catch (error) {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect($instant.test(error.dependency.key)).to.be.true;
                expect(Modifier.unwrap(error.dependency.key)).to.eql(car.Engine);
            }
        });
    });

    describe("#dispose", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
        });

        it("should dispose all components", done => {
            container.register($component(car.Ferrari), $component(car.V12));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                done();
                container.dispose();
            });
        });
    });
});
