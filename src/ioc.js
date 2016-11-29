import {
    Base, Protocol, Policy, inject, design,
    getPropertyDescriptors, $isNothing, $isSomething,
    $isFunction, $isPromise, $eq, $optional, $every,
    $instant, $flatten
} from "miruken-core";

import {
    Handler, Resolution, $provide, $composer, $unhandled
} from "miruken-callback";

import { Validator } from "miruken-validate";

import { Container } from "./container";
import { ComponentPolicy, policy } from "./policy";
import { ComponentModelError } from "./component";
import { SingletonLifestyle } from "./lifestyle";

import {
    DependencyModifier, DependencyResolution,
    DependencyManager, DependencyResolutionError,
    $$composer
} from "./dependency";

/**
 * Collects constructor dependencies to be injected.
 * @class ConstructorPolicy
 * @uses ComponentPolicy
 * @extends Policy
 */
export const ConstructorPolicy = Policy.extend(ComponentPolicy, {
    applyPolicy(componentModel) {
        const implementation = componentModel.implementation;
        if (!implementation) { return };
        
        // Dependencies will be merged from inject metadata
        // starting from most derived unitl no more remain or the
        // current definition is fully specified (no holes).
        
        componentModel.manageDependencies(
            manager => inject.collect(implementation.prototype, "constructor", deps => {
                if (deps && deps.length > 0) {
                    manager.merge(deps);
                    return componentModel.allDependenciesDefined();
                }
            }));

        // Fill in any parameter holes from design metadata 
        if (!componentModel.allDependenciesDefined()) {
            const params = design.get(implementation.prototype, "constructor");
            if (params && params.length > 0) {
                componentModel.manageDependencies(manager => {
                    for (let i = 0; i < params.length; ++i) {
                        if (!manager.getIndex(i)) {
                            let param = params[i];
                            if (Array.isArray(param)) {
                                param = $every(param[0]);
                            }
                            manager.setIndex(i, param);
                        }
                    }
                });
            }
        }
    }
});

/**
 * Collects optional property dependencies to be injected.
 * @class PropertyInjectionPolicy
 * @uses ComponentPolicy
 * @extends Policy
 */
export const PropertyInjectionPolicy = Policy.extend(ComponentPolicy, {
    applyPolicy(componentModel) {
        const implementation = componentModel.implementation;
        if (!implementation) { return };

        const prototype = implementation.prototype,
              props     = getPropertyDescriptors(prototype);
        Reflect.ownKeys(props).forEach(key => {
            const descriptor = props[key];
            if (!$isFunction(descriptor.value)) {
                let dependency = inject.get(prototype, key);
                if ($isNothing(dependency)) {
                    if (this.explicit) { return; }
                    dependency = design.get(prototype, key);
                }
                if (dependency) {
                    componentModel.manageDependencies(`property:${key}`, manager => {
                        if (!manager.getIndex(0)) {                        
                            manager.setIndex(0, $optional(dependency));
                        }
                    });
                }
            }
        });
    },
    componentCreated(component, componentModel, dependencies) {
        Reflect.ownKeys(dependencies).forEach(key => {
            if ($isFunction(key.startsWith) && key.startsWith("property:")) {
                const dependency = dependencies[key][0];
                if ($isSomething(dependency)) {
                    const property = key.substring(9);
                    component[property] = dependency;
                }
            }
        });
    }
});

/**
 * Marker Protocol for injecting {{#crossLink ComponentModel"}}{{/crossLink}}.
 * @class ComponentModelAware
 * @extends Protocol
 */
export const ComponentModelAware = Protocol.extend({
    set componentModel(value) {}
});

/**
 * Injects {{#crossLink "ComponentModel"}}{{/crossLink}} into components.
 * @class ComponentModelAwarePolicy
 * @uses ComponentPolicy
 * @extends Policy
 */
export const ComponentModelAwarePolicy = Policy.extend(ComponentPolicy, {
    constructor(implicit) {
        this.extend({
            componentCreated(component, componentModel) {
                if (!implicit || ComponentModelAware.isAdoptedBy(component)) {
                    component.componentModel = componentModel;
                }
            }        
        });
    }
});
Object.defineProperties(ComponentModelAwarePolicy, {
    /**
     * Policy assigns ComponentModel to every instance conforming 
     * to the {{#crossLink "ComponentModelAware"}}{{/crossLink}} protocol.
     * @property {ComponentModelAwarePolicy} Implicit
     */    
    Implicit: { value: new ComponentModelAwarePolicy(true) },
    /**
     * Policy assigns ComponentModel to every related instance. 
     * @property {ComponentModelAwarePolicy} Explicit
     */    
    Explicit: { value: new ComponentModelAwarePolicy(false) }
});

/**
 * Expands any Metadata implementation policies to be applied.
 * @class PolicyMetadataPolicy
 * @uses ComponentPolicy
 * @extends Policy
 */
export const PolicyMetadataPolicy = Policy.extend(ComponentPolicy, {
    applyPolicy(componentModel, policies) {
        const implementation = componentModel.implementation;
        if (implementation) {
            const index = policies.length;
            policy.collect(implementation, ps => policies.splice(index, 0, ...ps));
        }
    }
});

const InitializationPolicy = new (Policy.extend(ComponentPolicy, {
    componentCreated(component) {
        if ($isFunction(component.initialize)) {
            return component.initialize();
        }
    }        
}));


const DEFAULT_POLICIES = [
    new ConstructorPolicy(),
    ComponentModelAwarePolicy.Implicit,
    new PolicyMetadataPolicy()
];

/**
 * Default Inversion of Control {{#crossLink "Container"}}{{/crossLink}}.
 * @class IoContainer
 * @constructor
 * @extends Handler
 * @uses Container
 */
export const IoContainer = Handler.extend(Container, {
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
    resolve(key) {
        const resolution = (key instanceof Resolution) ? key : new Resolution(key);
        if (this.handle(resolution, false, $composer)) {
            return resolution.callbackResult;
        }
    },
    resolveAll(key) {
        const resolution = (key instanceof Resolution) ? key : new Resolution(key, true);
        return this.handle(resolution, true, $composer)
             ? resolution.callbackResult
             : [];
    },    
    register(...registrations) {
        return $flatten(registrations, true).map(
            registration => registration.register(this, $composer));
    },
    registerHandler(componentModel, policies) {
        return _registerHandler(componentModel, this, policies); 
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

function _registerHandler(componentModel, container, policies) {
    let   key       = componentModel.key;
    const type      = componentModel.implementation,
          lifestyle = componentModel.lifestyle || new SingletonLifestyle(),
          factory   = componentModel.factory,
          burden    = componentModel.burden;
    key = componentModel.invariant ? $eq(key) : key;    
    return $provide(container, key, function handler(resolution, composer) {
        if (!(resolution instanceof DependencyResolution)) {
            resolution = new DependencyResolution(resolution.key);
        }
        if (!resolution.claim(handler, type)) {  // cycle detected
            return $unhandled;
        }
        policies = policies.concat(InitializationPolicy);
        return lifestyle.resolve(configure => {
            const instant      = $instant.test(resolution.key),
                  dependencies = _resolveBurden(burden, instant, resolution, composer);
            return $isPromise(dependencies)
                 ? dependencies.then(createComponent)
                 : createComponent(dependencies);
            function createComponent(dependencies) {
                let component = factory.call(composer, dependencies);
                if ($isFunction(configure)) {
                    component = configure(component, dependencies) || component;
                }
                return applyPolicies(0);
                function applyPolicies(index) {
                    for (let i = index; i < policies.length; ++i) {
                        const policy = policies[i];
                        if ($isFunction(policy.componentCreated)) {
                            const result = policy.componentCreated(
                                component, componentModel, dependencies, composer);
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
