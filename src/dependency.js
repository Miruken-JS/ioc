import {
    Flags, Base, ArrayManager, Modifier,
    $createModifier, $use, $lazy,
    $every, $eval, $child, $optional,
    $promise, $eq
} from 'miruken-core';

import { Resolution } from 'miruken-callback';

/**
 * Symbol for injecting composer dependency.<br/>
 * See {{#crossLink "miruken.callback.CallbackHandler"}}{{/crossLink}}
 * @property {Object} $$composer
 * @for miruken.ioc.$
 */    
export const $$composer = Symbol();

/**
 * Modifier to request container dependency.<br/>
 * See {{#crossLink "miruken.ioc.Container"}}{{/crossLink}}
 * @class $container
 * @extend miruken.Modifier
 */            
export const $container = $createModifier();

/**
 * DependencyModifier flags
 * @class DependencyModifier
 * @extends miruken.Enum
 */    
export const DependencyModifier = Flags({
    /**
     * No dependency modifiers.
     * @property {number} None
     */
    None: 0,
    /**
     * See {{#crossLink "miruken.Modifier/$use:attribute"}}{{/crossLink}}
     * @property {number} Use
     */
    Use: 1 << 0,
    /**
     * See {{#crossLink "miruken.Modifier/$lazy:attribute"}}{{/crossLink}}
     * @property {number} Lazy
     */
    Lazy: 1 << 1,
    /**
     * See {{#crossLink "miruken.Modifier/$every:attribute"}}{{/crossLink}}
     * @property {number} Every
     */
    Every: 1 << 2,
    /**
     * See {{#crossLink "miruken.Modifier/$eval:attribute"}}{{/crossLink}}
     * @property {number} Dynamic
     */
    Dynamic: 1 << 3,
    /**
     * See {{#crossLink "miruken.Modifier/$optional:attribute"}}{{/crossLink}}
     * @property {number} Optional
     */
    Optional: 1 << 4,
    /**
     * See {{#crossLink "miruken.Modifier/$promise:attribute"}}{{/crossLink}}
     * @property {number} Promise
     */
    Promise: 1 << 5,
    /**
     * See {{#crossLink "miruken.Modifier/$eq:attribute"}}{{/crossLink}}
     * @property {number} Invariant
     */
    Invariant: 1 << 6,
    /**
     * See {{#crossLink "miruken.ioc.$container"}}{{/crossLink}}
     * @property {number} Container
     */
    Container: 1 << 7,
    /**
     * See {{#crossLink "miruken.Modifier/$child:attribute"}}{{/crossLink}}
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
 * @param {Any} dependency  -  annotated dependency
 * @param {miruken.ioc.DependencyModifier} modifiers  -  dependency annotations
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
             * @property {miruken.ioc.DependencyModifier} modifiers
             * @readOnly
             */                        
            get modifiers() { return modifiers; }
        });
    },
    /**
     * Tests if the receiving dependency is annotated with the modifier.
     * @method test
     * @param   {miruken.ioc.DependencyModifier}  modifier  -  modifier flags
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
 * @extends miruken.ArrayManager
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
 * Specialized {{#crossLink "miruken.callback.Resolution"}}{{/crossLink}}
 * that maintains a parent relationship for representing resolution chains.
 * @class DependencyResolution
 * @constructor
 * @param   {string}                             key     -  resolution key
 * @param   {miruken.ioc.DependencyResolution}   parent  -  parent resolution
 * @param   {boolean}                            many    -  resolution cardinality
 * @extends miruken.callback.Resolution
 */
export const DependencyResolution = Resolution.extend({
    constructor(key, parent, many) {
        let _class, _handler;
        this.base(key, many);
        this.extend({
            claim(handler, clazz) { 
                if (this.isResolvingDependency(handler)) {
                    return false;
                }
                _handler = handler;
                _class   = clazz;
                return true;
            },
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
                    display    = _class ? `(${keyDisplay} <- ${_class})` : keyDisplay;
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
 * @param {miruken.ioc.DependencyResolution} dependency  -  failing dependency
 * @param {string}                           message     -  error message
 * @extends Error
 */
export function DependencyResolutionError(dependency, message) {
    /**
     * Gets the error message.
     * @property {string} message
     */
    this.message = message;
    /**
     * Gets the failing dependency resolution.
     * @property {miruken.ioc.DependencyResolution} dependency
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