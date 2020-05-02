import {
    Base, Facet, ProxyBuilder, emptyArray,
    $isSomething, $isFunction, $isProtocol,
    $isClass, $flatten, $use
} from "miruken-core";

import {
    Context, ContextualHelper
} from "miruken-context";

import { validateThat } from "miruken-validate";

import {
    Lifestyle, SingletonLifestyle,
    TransientLifestyle, ContextualLifestyle
} from "./lifestyle";

import {
    DependencyModel, DependencyManager
} from "./dependency";

import { Registration } from "./container";

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
        this._burden = {};
    },

    /**
     * Gets/sets the component key.
     * @property {Any} key
     */
    get key() { return this._key || this._impl },
    set key(value) { this._key = value; },
    /**
     * Gets/sets the component class.
     * @property {Functon} implementation
     */
    get implementation() {
        let impl = this._impl;
        if (!impl && $isClass(this._key)) {
            impl = this._key;
        }
        return impl;
    },
    set implementation(value) {
        if ($isSomething(value) && !$isClass(value)) {
            throw new TypeError(`${value} is not a class.`);
        }
        this._impl = value;
    },
    /**
     * Gets/sets if component is invariant.
     * @property {boolean} invariant
     */                                                
    get invariant () { return this._invariant; },
    set invariant(value) { this._invariant = !!value; },
    /**
     * Gets/sets the component lifestyle.
     * @property {Lifestyle} lifestyle
     */
    get lifestyle() { return this._lifestyle; },
    set lifestyle(value) {
        if (!$isSomething(value) && !(value instanceof Lifestyle)) {
            throw new TypeError(`${value} is not a Lifestyle.`);
        }
        this._lifestyle = value; 
    },
    /**
     * Gets/sets the component factory.
     * @property {Function} factory
     */
    get factory() {
        const factory = this._factory,
              clazz   = this.implementation;
        if (!factory) {
            const interceptors = this._burden[Facet.Interceptors];
            if (interceptors && interceptors.length > 0) {
                const types = [];
                if (clazz) {
                    types.push(clazz);
                }
                if ($isProtocol(this._key)) {
                    types.push(this._key);
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
        this._factory = value;
    },
    /**
     * Gets the component dependency burden.
     * @property {Object} burden
     * @readOnly
     */                                
    get burden() { return this._burden; },

    /**
     * Gets the component dependency group.
     * @method getDependencies
     * @param   {string} [key=Facet.Parameters]  -  dependency group  
     * @returns {Array}  group dependencies.
     */                
    getDependencies(key) { 
        return this._burden[key || Facet.Parameters];
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
        this._burden[key] = value.map(DependencyModel);
    },
    /**
     * Determines if the component dependency group is complete.
     * @method allDependenciesDefined
     * @param  {string}  [key=Facet.Parameters]  -  dependency group
     * @return {boolean} true if all dependencies defined.
     */                            
    allDependenciesDefined(key) {
        const deps = this._burden[key || Facet.Parameters];
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
        let   dependencies = this._burden[key];
        const manager      = new DependencyManager(dependencies);
        if ($isFunction(actions)) {                
            actions(manager);
        }
        dependencies = manager.getItems();
        if (dependencies.length > 0) {
            this._burden[key] = dependencies;
        }
        return dependencies;
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

function _makeClassFactory(clazz) {
    return burden => Reflect.construct(clazz, burden[Facet.Parameters] || emptyArray);
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
        this._componentModel     = new ComponentModel();
        this._componentModel.key = key;
    },
    
    /**
     * Marks the component as invariant.
     * @method invariant
     * @return {ComponentBuilder} builder
     * @chainable
     */
    invariant() {
        this._componentModel.setInvariant();
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
        this._componentModel.implementation = clazz;
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
        this._componentModel.setDependencies(dependencies);
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
        this._componentModel.factory = factory;
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
        this._componentModel.lifestyle = new SingletonLifestyle(instance);
        return this;
    },
    /**
     * Chooses the {{#crossLink "SingletonLifestyle"}}{{/crossLink}}.
     * @method singleon
     * @return {ComponentBuilder} builder
     * @chainable
     */
    singleton() {
        this._componentModel.lifestyle = new SingletonLifestyle();
        return this;
    },
    /**
     * Chooses the {{#crossLink "TransientLifestyle"}}{{/crossLink}}.
     * @method transient
     * @return {ComponentBuilder} builder
     * @chainable
     */                
    transient() {
        this._componentModel.lifestyle = new TransientLifestyle();
        return this;
    },
    /**
     * Chooses the {{#crossLink "ContextualLifestyle"}}{{/crossLink}}.
     * @method contextual
     * @return {ComponentBuilder} builder
     * @chainable
     */                                
    contextual() {
        this._componentModel.lifestyle = new ContextualLifestyle();
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
        this._newInContext = true;
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
        this._newInChildContext = true;
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
        return new InterceptorBuilder(this, this._componentModel, interceptors);
    },
    /**
     * Attaches {{#crossLink "ComponentPolicy"}}{{/crossLink}}'s.
     * @method policies
     * @param   {ComponentPolicy}  ...policies  -  policies
     */            
    policies(...policies) {
        policies = $flatten(policies, true);
        if (policies.length > 0) {
            this._policies = (this._policies || []).concat(policies);
        }
        return this;
    },
    register(container) {
        if (this._newInContext || this._newInChildContext) {
            const factory   = this._componentModel.factory,
                  component = this;
            this._componentModel.factory = function (dependencies) {
                const object  = factory(dependencies),
                      context = this.resolve(Context);
                if (component._newInContext) {
                    ContextualHelper.bindContext(object, context);
                } else {
                    ContextualHelper.bindChildContext(context, object);
                }
                return object;
            };
        }
        return container.addComponent(this._componentModel, this._policies);
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
