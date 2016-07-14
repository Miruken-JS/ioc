import {
    Base, Facet, ProxyBuilder, $isSomething,
    $isFunction, $isProtocol, $isClass,
    $flatten, $use
} from 'miruken-core';

import {
    Context, ContextualHelper
} from 'miruken-context';

import { $validateThat } from 'miruken-validate';

import {
    Lifestyle, SingletonLifestyle,
    TransientLifestyle, ContextualLifestyle
} from './lifestyle';

import {
    DependencyModel, DependencyManager
} from './dependency';

import { Registration } from './container';

/**
 * Shared proxy builder
 * @property {miruken.ProxyBuilder} proxyBuilder
 * @for miruken.ioc.$
 */            
const $proxyBuilder = new ProxyBuilder();

/**
 * Describes a component to be managed by a {{#crossLink "miruken.ioc.Container"}}{{/crossLink}}.
 * @class ComponentModel
 * @constructor
 * @extends Base
 */
export const ComponentModel = Base.extend($validateThat, {
    constructor() {
        let _key, _implementation, _lifestyle, _factory,
            _invariant = false, _burden = {};
        this.extend({
            /**
             * Gets/sets the component key.
             * @property {Any} key
             */
            get key() { return _key || _implementation },
            set key(value) { _key = value; },
            /**
             * Gets/sets the component class.
             * @property {Functon} implementation
             */
            get implementation() {
                let impl = _implementation;
                if (!impl && $isClass(_key)) {
                    impl = _key;
                }
                return impl;
            },
            set implementation(value) {
                if ($isSomething(value) && !$isClass(value)) {
                    throw new TypeError(`${value} is not a class.`);
                }
                _implementation = value;
            },
            /**
             * Gets/sets if component is invariant.
             * @property {boolean} invariant
             */                                                
            get invariant () { return _invariant; },
            set invariant(value) { _invariant = !!value; },
            /**
             * Gets/sets the component lifestyle.
             * @property {miruken.ioc.Lifestyle} lifestyle
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
             * @param  {string}   [key=Facet.Parameters]  -  dependency group  
             * @param  {Function} actions  -  function accepting miruken.ioc.DependencyManager
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
    $validateThat: {
        keyCanBeDetermined(validation) {
            if (!this.key) {
                validation.results.addKey("key").addError("required", { 
                    message: "Key could not be determined for component." 
                });
            }
        },
        factoryCanBeDetermined(validation) {
            if (!this.factory) {
                validation.results.addKey("factory").addError("required", { 
                    message: "Factory could not be determined for component." 
                });
            }
        }
    }
});

const NO_ARGS = Object.freeze([]);

function _makeClassFactory(clazz) {
    return burden => Reflect.construct(clazz, burden[Facet.Parameters] || NO_ARGS);
}

function _makeProxyFactory(types) {
    const proxy = $proxyBuilder.buildProxy(types);
    return burden => Reflect.construct(proxy, [burden]);
}

/**
 * Builds {{#crossLink "miruken.ioc.ComponentModel"}}{{/crossLink}} using fluent api.
 * @class ComponentBuilder
 * @constructor
 * @extends Base
 * @uses miruken.ioc.Registration
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
             * @return {miruken.ioc.ComponentBuilder} builder
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
             * @return {miruken.ioc.ComponentBuilder} builder
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
             * @return {miruken.ioc.ComponentBuilder} builder
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
             * @return {miruken.ioc.ComponentBuilder} builder
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
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                                                
            instance(instance) {
                _componentModel.lifestyle = new SingletonLifestyle(instance);
                return this;
            },
            /**
             * Chooses the {{#crossLink "miruken.ioc.SingletonLifestyle"}}{{/crossLink}}.
             * @method singleon
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */
            singleton() {
                _componentModel.lifestyle = new SingletonLifestyle();
                return this;
            },
            /**
             * Chooses the {{#crossLink "miruken.ioc.TransientLifestyle"}}{{/crossLink}}.
             * @method transient
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                
            transient() {
                _componentModel.lifestyle = new TransientLifestyle();
                return this;
            },
            /**
             * Chooses the {{#crossLink "miruken.ioc.ContextualLifestyle"}}{{/crossLink}}.
             * @method contextual
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                                
            contextual() {
                _componentModel.lifestyle = new ContextualLifestyle();
                return this;
            },
            /**
             * Binds the component to the current 
             * {{#crossLink "miruken.context.Context"}}{{/crossLink}}.
             * @method newInContext
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                                                
            newInContext() {
                _newInContext = true;
                return this;
            },
            /**
             * Binds the component to a child of the current 
             * {{#crossLink "miruken.context.Context"}}{{/crossLink}}.
             * @method newInContext
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                                                                
            newInChildContext() {
                _newInChildContext = true;
                return this;
            },
            /**
             * Attaches component interceptors.
             * @method interceptors
             * @param  {miruken.Interceptor}  ...interceptors  -  interceptors
             * @return {miruken.ioc.ComponentBuilder} builder
             * @chainable
             */                                                
            interceptors(...interceptors) {
                interceptors = $flatten(interceptors, true);
                return new InterceptorBuilder(this, _componentModel, interceptors);
            },
            /**
             * Attaches {{#crossLink "miruken.ioc.ComponentPolicy"}}{{/crossLink}}'s.
             * @method policies
             * @param   {miruken.ioc.ComponentPolicy}  ...policies  -  policies
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
 * Builds {{#crossLink "miruken.ioc.ComponentModel"}}{{/crossLink}} interceptors using fluent api.
 * @class InterceptorBuilder
 * @constructor
 * @param {miruken.ioc.ComponentBuilder}  component       -  component builder
 * @param {miruken.ioc.ComponentModel}    componentModel  -  component model
 * @param {Array}                         interceptors    -  component interceptors
 * @extends Base
 * @uses miruken.ioc.Registration
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
             * @returns {miruken.ioc.InterceptorBuilder} builder
             * @chainable
             */            
            toFront() {
                return this.atIndex(0);
            },
            /**
             * Marks interceptors to be added at the supplied index.
             * @method atIndex
             * @param {number}  index  -  index to add interceptors at
             * @returns {miruken.ioc.InterceptorBuilder} builder
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
 * Shortcut for creating a {{#crossLink "miruken.ioc.ComponentBuilder"}}{{/crossLink}}.
 * @method $component
 * @param   {Any} key - component key
 * @return  {miruken.ioc.ComponentBuilder} component builder.
 * @for miruken.ioc.$
 */    
export function $component(key) {
    return new ComponentBuilder(key);
}
                                       
/**
 * Identifies an invalid {{#crossLink "miruken.ioc.ComponentModel"}}{{/crossLink}}.
 * @class ComponentModelError
 * @constructor
 * @param {miruken.ioc.ComponentModel}        componentModel     -  invalid component model
 * @param {miruken.validate.ValidationResult} validationResults  -  validation results
 * @param {string}                            message            -  error message
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
     * @property {miruken.ioc.ComponentModel} componentModel
     */         
    this.componentModel = componentModel;
    /**
     * Gets the failing validation results.
     * @property {miruken.validate.ValidationResult} validationResults
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
