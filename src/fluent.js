import {
    Base, Metadata, $isNothing, $isProtocol,
    $isClass, $isFunction, $flatten
} from 'miruken-core';

import { Registration } from './container';
import { $component } from './component';

/**
 * Base class for installing one or more components into a 
 * {{#crossLink "miruken.ioc.Container"}}{{/crossLink}}.
 * @class Installer
 * @extends Base
 * @uses miruken.ioc.Registration
 */        
export const Installer = Base.extend(Registration, {
    register(container, composer) {}
});

/**
 * Fluent builder for specifying source of components.
 * @class FromBuilder
 * @constructor
 * @extends Base
 * @uses miruken.ioc.Registration
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
             * @returns {miruken.ioc.BasedOnBuilder} fluent class filter.
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
 * @extends miruken.ioc.FromBuilder
 */        
export const FromPackageBuilder = FromBuilder.extend({
    constructor(pkg, names) {
        this.base();
        this.extend({
            getClasses() {
                const classes = [];                
                names = names || Object.keys(pkg);
                for (let i = 0; i < names.length; ++i) {
                    const name   = names[i],
                          member = pkg[name];
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
 * @param  {miruken.ioc.FromBuilder}  from            -  source of components
 * @param  {Array}                    ...constraints  -  initial constraints
 * @extends Base
 * @uses miruken.ioc.Registration
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
             * @returns {miruken.ioc.BasedOnBuilder} current builder.
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
             * @returns {miruken.ioc.BasedOnBuilder} current builder.
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
             * {{#crossLink "miruken.ioc.ComponentModel"}}{{/crossLink}} for configuration
             * @returns {miruken.ioc.BasedOnBuilder} current builder.
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
                for (let i = 0; i < constraints.length; ++i) {
                    const constraint = constraints[i];
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
 * @param  {miruken.ioc.BasedOnBuilder}  basedOn  -  based on builder
 * @extends Base
 */            
export const KeyBuilder = Base.extend({
    constructor(basedOn) {
        let _keySelector;
        this.extend({
            /**
             * Uses the component class as the key.
             * @method self
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
             */
            self() {
                return selectKeys((keys, clazz) => keys.push(clazz));
            },
            /**
             * Uses the based on contraints as the keys.
             * @method basedOn
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
             */
            basedOn() {
                return selectKeys((keys, clazz, constraints) => keys.push.apply(keys, constraints));
            },
            /**
             * Uses any class {{#crossLink "miruken.Protocol"}}{{/crossLink}} as the key.
             * @method anyService
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
             */
            anyService() {
                return selectKeys((keys, clazz) => {
                    const services = clazz[Metadata].allProtocols;
                    if (services.length > 0) {
                        keys.push(services[0]);
                    }
                });
            },
            /**
             * Uses all class {{#crossLink "miruken.Protocol"}}{{/crossLink}} as the keys.
             * @method allServices
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
             */
            allServices() {
                return selectKeys((keys, clazz) => keys.push(...clazz[Metadata].allProtocols));
            },
            /**
             * Uses the most specific {{#crossLink "miruken.Protocol"}}{{/crossLink}} 
             * in the class hierarchy as the key.
             * @method mostSpecificService
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
             */
            mostSpecificService(service) {
                return selectKeys((keys, clazz, constraints) => {
                    if ($isProtocol(service)) {
                        _addMatchingProtocols(clazz, service, keys);
                    } else {
                        for (let i = 0; i < constraints.length; ++i) {
                            const constraint = constraints[i];
                            if ($isFunction(constraint)) {
                                _addMatchingProtocols(clazz, constraint, keys);
                            }
                        }
                    }
                    if (keys.length === 0) {
                        for (let i = 0; i < constraints.length; ++i) {
                            const constraint = constraints[i];
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
             * @returns {miruken.ioc.BasedOnBuilder} based on builder.
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
 * Shortcut for creating a {{#crossLink "miruken.ioc.FromBuilder"}}{{/crossLink}}.
 * @method $classes
 * @param  {Any}    from        -  any source of classes.  Only Package is currently supported.
 * @param  {Array}  [...names]  -  optional member name filter
 * @return {miruken.ioc.FromBuilder} from builder.
 * @for miruken.ioc.$
 */        
export function $classes(from, names) {
    return new FromPackageBuilder(from, names);
}

/**
 * Creates a {{#crossLink "miruken.ioc.FromBuilder"}}{{/crossLink}} using a Package source.
 * @method $classes.fromPackage
 * @param  {Package}  pkg
 * @param  {Array}    [...names]  -  optional member name filter
 * @for miruken.ioc.$
 */    
$classes.fromPackage = (pkg, names) => new FromPackageBuilder(pkg, names);

function _unregisterBatch(registrations) {
    return function () {
        for (let i = 0; i < registrations.length; ++i) {
            registrations[i]();
        }
    };
}

function _addMatchingProtocols(clazz, preference, matches) {
    const toplevel = _toplevelProtocols(clazz);
    for (let i = 0; i < toplevel.length; ++i) {
        const protocol = toplevel[i];
        if (protocol[Metadata].allProtocols.indexOf(preference) >= 0) {
            matches.push(protocol);
        }
    }
}

function _toplevelProtocols(type) {
    const protocols = type[Metadata].allProtocols,
          toplevel  = protocols.slice(0);
    for (let i = 0; i < protocols.length; ++i) {
        const parents = protocols[i][Metadata].allProtocols;
        for (let ii = 0; ii < parents.length; ++ii) {
            const index = toplevel.indexOf(parents[ii]);
            if (index >= 0) toplevel.splice(index, 1);
        }
    }
    return toplevel;
}
