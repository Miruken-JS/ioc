import {
    Base,$isNothing, $isFunction, $isPromise,
    $ancestorOf, $eq, $instant, $flatten
} from 'miruken-core';

import {
    CallbackHandler, $provide, $composer, $NOT_HANDLED
} from 'miruken-callback';

import { Validator } from 'miruken-validate';

import { Container } from './container';
import { ComponentPolicy } from './policy';
import { ComponentModelError } from './component';
import { SingletonLifestyle } from './lifestyle';

import {
    DependencyModifier, DependencyResolution,
    DependencyManager, DependencyResolutionError,
    $$composer
} from './dependency';

/**
 * Collects dependencies to be injected into components.
 * @class InjectionPolicy
 * @uses miruken.ioc.ComponentPolicy
 * @extends Base
 */
export const InjectionPolicy = Base.extend(ComponentPolicy, {
    applyPolicy(componentModel) {
        // Dependencies will be merged from inject definitions
        // starting from most derived unitl no more remain or the
        // current definition is fully specified (no holes).
        if (componentModel.allDependenciesDefined()) {
            return;
        }
        let clazz = componentModel.implementation;
        componentModel.manageDependencies(manager => {
            while (clazz && (clazz !== Base)) {
                const injects = [clazz.prototype.$inject, clazz.prototype.inject,
                                 clazz.$inject, clazz.inject];
                for (let inject of injects) {
                    if (inject !== undefined) {
                        if ($isFunction(inject)) {
                            inject = inject();
                        }
                        manager.merge(inject);
                        if (componentModel.allDependenciesDefined()) {
                            return;
                        }
                    }
                }
                clazz = $ancestorOf(clazz);
            }
        });
    }
});

/**
 * Executes the {{#crossLink "miruken.Initializing"}}{{/crossLink}} protocol.
 * @class InitializationPolicy
 * @uses miruken.ioc.ComponentPolicy
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
 * Default Inversion of Control {{#crossLink "miruken.ioc.Container"}}{{/crossLink}}.
 * @class IoContainer
 * @constructor
 * @extends CallbackHandler
 * @uses miruken.ioc.Container
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
        const resolved = group.slice(0);
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
