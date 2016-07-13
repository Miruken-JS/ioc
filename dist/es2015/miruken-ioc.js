'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.IoContainer = exports.InitializationPolicy = exports.InjectionPolicy = exports.KeyBuilder = exports.BasedOnBuilder = exports.FromPackageBuilder = exports.FromBuilder = exports.Installer = exports.InterceptorBuilder = exports.ComponentBuilder = exports.ComponentModel = exports.ContextualLifestyle = exports.SingletonLifestyle = exports.TransientLifestyle = exports.Lifestyle = exports.DependencyResolution = exports.DependencyManager = exports.DependencyModel = exports.DependencyModifier = exports.$container = exports.$$composer = exports.Container = exports.Registration = exports.ComponentPolicy = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

exports.DependencyResolutionError = DependencyResolutionError;
exports.$component = $component;
exports.ComponentModelError = ComponentModelError;
exports.$classes = $classes;

var _mirukenCore = require('miruken-core');

var _mirukenCallback = require('miruken-callback');

var _mirukenContext = require('miruken-context');

var _mirukenValidate = require('miruken-validate');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ComponentPolicy = exports.ComponentPolicy = _mirukenCore.Protocol.extend({
    applyPolicy: function applyPolicy(componentModel, policies) {},
    componentCreated: function componentCreated(component, dependencies, composer) {}
});

var Registration = exports.Registration = _mirukenCore.Protocol.extend({
    register: function register(container, composer) {}
});

var Container = exports.Container = _mirukenCore.StrictProtocol.extend(_mirukenCore.Invoking, _mirukenCore.Disposing, {
    register: function register(registrations) {},
    addComponent: function addComponent(componentModel, policies) {},
    addPolicies: function addPolicies(policies) {},
    resolve: function resolve(key) {},
    resolveAll: function resolveAll(key) {}
});

var $$composer = exports.$$composer = Symbol();

var $container = exports.$container = (0, _mirukenCore.$createModifier)();

var DependencyModifier = exports.DependencyModifier = (0, _mirukenCore.Flags)({
    None: 0,

    Use: 1 << 0,

    Lazy: 1 << 1,

    Every: 1 << 2,

    Dynamic: 1 << 3,

    Optional: 1 << 4,

    Promise: 1 << 5,

    Invariant: 1 << 6,

    Container: 1 << 7,

    Child: 1 << 8
});

DependencyModifier.Use.modifier = _mirukenCore.$use;
DependencyModifier.Lazy.modifier = _mirukenCore.$lazy;
DependencyModifier.Every.modifier = _mirukenCore.$every;
DependencyModifier.Dynamic.modifier = _mirukenCore.$eval;
DependencyModifier.Child.modifier = _mirukenCore.$child;
DependencyModifier.Optional.modifier = _mirukenCore.$optional;
DependencyModifier.Promise.modifier = _mirukenCore.$promise;
DependencyModifier.Container.modifier = $container;
DependencyModifier.Invariant.modifier = _mirukenCore.$eq;

var DependencyModel = exports.DependencyModel = _mirukenCore.Base.extend({
    constructor: function constructor(dependency, modifiers) {
        modifiers = DependencyModifier.None.addFlag(modifiers);
        if (dependency instanceof _mirukenCore.Modifier) {
            DependencyModifier.items.forEach(function (flag) {
                var modifier = flag.modifier;
                if (modifier && modifier.test(dependency)) {
                    modifiers = modifiers.addFlag(flag);
                }
            });
            dependency = _mirukenCore.Modifier.unwrap(dependency);
        }
        this.extend({
            get dependency() {
                return dependency;
            },

            get modifiers() {
                return modifiers;
            }
        });
    },
    test: function test(modifier) {
        return this.modifiers.hasFlag(modifier);
    }
}, {
    coerce: function coerce(object) {
        return object === undefined ? undefined : new DependencyModel(object);
    }
});

var DependencyManager = exports.DependencyManager = _mirukenCore.ArrayManager.extend({
    constructor: function constructor(dependencies) {
        this.base(dependencies);
    },
    mapItem: function mapItem(item) {
        return !(item !== undefined && item instanceof DependencyModel) ? DependencyModel(item) : item;
    }
});

var DependencyResolution = exports.DependencyResolution = _mirukenCallback.Resolution.extend({
    constructor: function constructor(key, parent, many) {
        var _class = void 0,
            _handler = void 0;
        this.base(key, many);
        this.extend({
            claim: function claim(handler, clazz) {
                if (this.isResolvingDependency(handler)) {
                    return false;
                }
                _handler = handler;
                _class = clazz;
                return true;
            },
            isResolvingDependency: function isResolvingDependency(handler) {
                return handler === _handler || parent && parent.isResolvingDependency(handler);
            },
            formattedDependencyChain: function formattedDependencyChain() {
                var invariant = _mirukenCore.$eq.test(key),
                    rawKey = _mirukenCore.Modifier.unwrap(key),
                    keyDisplay = invariant ? '`' + rawKey + '`' : rawKey,
                    display = _class ? '(' + keyDisplay + ' <- ' + _class + ')' : keyDisplay;
                return parent ? display + ' <= ' + parent.formattedDependencyChain() : display;
            }
        });
    }
});

function DependencyResolutionError(dependency, message) {
    this.message = message;

    this.dependency = dependency;
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        Error.call(this);
    }
}
DependencyResolutionError.prototype = new Error();
DependencyResolutionError.prototype.constructor = DependencyResolutionError;

var Lifestyle = exports.Lifestyle = _mirukenCore.Abstract.extend(ComponentPolicy, _mirukenCore.Disposing, _mirukenCore.DisposingMixin, {
    resolve: function resolve(factory) {
        return factory();
    },
    trackInstance: function trackInstance(instance) {
        var _this = this;

        if (instance && (0, _mirukenCore.$isFunction)(instance.dispose)) {
            (function () {
                var lifestyle = _this;
                instance.extend({
                    dispose: function dispose(disposing) {
                        if (disposing || lifestyle.disposeInstance(instance, true)) {
                            this.base();
                            this.dispose = this.base;
                        }
                    }
                });
            })();
        }
    },
    disposeInstance: function disposeInstance(instance, disposing) {
        if (!disposing && instance && (0, _mirukenCore.$isFunction)(instance.dispose)) {
            instance.dispose(true);
        }
        return !disposing;
    },
    applyPolicy: function applyPolicy(componentModel) {
        componentModel.lifestyle = new this.constructor();
    }
});

var TransientLifestyle = exports.TransientLifestyle = Lifestyle.extend({
    constructor: function constructor() {},
    applyPolicy: function applyPolicy(componentModel) {
        componentModel.lifestyle = this;
    }
});

var SingletonLifestyle = exports.SingletonLifestyle = Lifestyle.extend({
    constructor: function constructor(instance) {
        this.extend({
            resolve: function resolve(factory) {
                var _this2 = this;

                return instance ? instance : factory(function (object) {
                    if (!instance && object) {
                        instance = object;
                        _this2.trackInstance(instance);
                    }
                });
            },
            disposeInstance: function disposeInstance(object, disposing) {
                if (!disposing && object === instance) {
                    if (this.base(object, disposing)) {
                        instance = undefined;
                        return true;
                    }
                }
                return false;
            },
            _dispose: function _dispose() {
                this.disposeInstance(instance);
            }
        });
    }
});

var ContextualLifestyle = exports.ContextualLifestyle = Lifestyle.extend({
    constructor: function constructor() {
        var _cache = {};
        this.extend({
            resolve: function resolve(factory, composer) {
                var _this3 = this;

                var context = composer.resolve(_mirukenContext.Context);
                if (context) {
                    var _ret2 = function () {
                        var id = context.id;
                        var instance = _cache[id];
                        return {
                            v: instance ? instance : factory(function (object) {
                                if (object && !_cache[id]) {
                                    _cache[id] = instance = object;
                                    _this3.trackInstance(instance);
                                    _mirukenContext.ContextualHelper.bindContext(instance, context);
                                    context.onEnded(function () {
                                        instance.context = null;
                                        _this3.disposeInstance(instance);
                                        delete _cache[id];
                                    });
                                }
                            })
                        };
                    }();

                    if ((typeof _ret2 === 'undefined' ? 'undefined' : _typeof(_ret2)) === "object") return _ret2.v;
                }
            },
            disposeInstance: function disposeInstance(instance, disposing) {
                if (!disposing) {
                    for (var contextId in _cache) {
                        if (_cache[contextId] === instance) {
                            this.base(instance, disposing);
                            delete _cache[contextId];
                            return true;
                        }
                    }
                }
                return false;
            },
            _dispose: function _dispose() {
                for (var contextId in _cache) {
                    this.disposeInstance(_cache[contextId]);
                }
                _cache = {};
            }
        });
    }
});

var $proxyBuilder = new _mirukenCore.ProxyBuilder();

var ComponentModel = exports.ComponentModel = _mirukenCore.Base.extend(_mirukenValidate.$validateThat, {
    constructor: function constructor() {
        var _key = void 0,
            _implementation = void 0,
            _lifestyle = void 0,
            _factory = void 0,
            _invariant = false,
            _burden = {};
        this.extend({
            get key() {
                return _key || _implementation;
            },
            set key(value) {
                _key = value;
            },

            get implementation() {
                var impl = _implementation;
                if (!impl && (0, _mirukenCore.$isClass)(_key)) {
                    impl = _key;
                }
                return impl;
            },
            set implementation(value) {
                if ((0, _mirukenCore.$isSomething)(value) && !(0, _mirukenCore.$isClass)(value)) {
                    throw new TypeError(value + ' is not a class.');
                }
                _implementation = value;
            },

            get invariant() {
                return _invariant;
            },
            set invariant(value) {
                _invariant = !!value;
            },

            get lifestyle() {
                return _lifestyle;
            },
            set lifestyle(value) {
                if (!(0, _mirukenCore.$isSomething)(value) && !(value instanceof Lifestyle)) {
                    throw new TypeError(value + ' is not a Lifestyle.');
                }
                _lifestyle = value;
            },

            get factory() {
                var factory = _factory,
                    clazz = this.implementation;
                if (!factory) {
                    var interceptors = _burden[_mirukenCore.Facet.Interceptors];
                    if (interceptors && interceptors.length > 0) {
                        var types = [];
                        if (clazz) {
                            types.push(clazz);
                        }
                        if ((0, _mirukenCore.$isProtocol)(_key)) {
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
                if ((0, _mirukenCore.$isSomething)(value) && !(0, _mirukenCore.$isFunction)(value)) {
                    throw new TypeError(value + ' is not a function.');
                }
                _factory = value;
            },
            getDependencies: function getDependencies(key) {
                return _burden[key || _mirukenCore.Facet.Parameters];
            },
            setDependencies: function setDependencies(key, value) {
                if (arguments.length === 1) {
                    value = key, key = _mirukenCore.Facet.Parameters;
                }
                if ((0, _mirukenCore.$isSomething)(value) && !Array.isArray(value)) {
                    throw new TypeError(value + ' is not an array.');
                }
                _burden[key] = value.map(DependencyModel);
            },
            manageDependencies: function manageDependencies(key, actions) {
                if (arguments.length === 1) {
                    actions = key, key = _mirukenCore.Facet.Parameters;
                }

                var dependencies = _burden[key];
                var manager = new DependencyManager(dependencies);
                if ((0, _mirukenCore.$isFunction)(actions)) {
                    actions(manager);
                }
                dependencies = manager.getItems();
                if (dependencies.length > 0) {
                    _burden[key] = dependencies;
                }
                return dependencies;
            },

            get burden() {
                return _burden;
            }
        });
    },

    $validateThat: {
        keyCanBeDetermined: function keyCanBeDetermined(validation) {
            if (!this.key) {
                validation.results.addKey("key").addError("required", {
                    message: "Key could not be determined for component."
                });
            }
        },
        factoryCanBeDetermined: function factoryCanBeDetermined(validation) {
            if (!this.factory) {
                validation.results.addKey("factory").addError("required", {
                    message: "Factory could not be determined for component."
                });
            }
        }
    }
});

var NO_ARGS = Object.freeze([]);

function _makeClassFactory(clazz) {
    return function (burden) {
        return Reflect.construct(clazz, burden[_mirukenCore.Facet.Parameters] || NO_ARGS);
    };
}

function _makeProxyFactory(types) {
    var proxy = $proxyBuilder.buildProxy(types);
    return function (burden) {
        return Reflect.construct(proxy, [burden]);
    };
}

var ComponentBuilder = exports.ComponentBuilder = _mirukenCore.Base.extend(Registration, {
    constructor: function constructor(key) {
        var _componentModel = new ComponentModel(),
            _newInContext = void 0,
            _newInChildContext = void 0,
            _policies = void 0;
        _componentModel.key = key;
        this.extend({
            invarian: function invarian() {
                _componentModel.setInvariant();
                return this;
            },
            boundTo: function boundTo(clazz) {
                _componentModel.implementation = clazz;
                return this;
            },
            dependsOn: function dependsOn() {
                for (var _len = arguments.length, dependencies = Array(_len), _key2 = 0; _key2 < _len; _key2++) {
                    dependencies[_key2] = arguments[_key2];
                }

                dependencies = (0, _mirukenCore.$flatten)(dependencies);
                _componentModel.setDependencies(dependencies);
                return this;
            },
            usingFactory: function usingFactory(factory) {
                _componentModel.factory = factory;
                return this;
            },
            instance: function instance(_instance) {
                _componentModel.lifestyle = new SingletonLifestyle(_instance);
                return this;
            },
            singleton: function singleton() {
                _componentModel.lifestyle = new SingletonLifestyle();
                return this;
            },
            transient: function transient() {
                _componentModel.lifestyle = new TransientLifestyle();
                return this;
            },
            contextual: function contextual() {
                _componentModel.lifestyle = new ContextualLifestyle();
                return this;
            },
            newInContext: function newInContext() {
                _newInContext = true;
                return this;
            },
            newInChildContext: function newInChildContext() {
                _newInChildContext = true;
                return this;
            },
            interceptors: function interceptors() {
                for (var _len2 = arguments.length, _interceptors = Array(_len2), _key3 = 0; _key3 < _len2; _key3++) {
                    _interceptors[_key3] = arguments[_key3];
                }

                _interceptors = (0, _mirukenCore.$flatten)(_interceptors, true);
                return new InterceptorBuilder(this, _componentModel, _interceptors);
            },
            policies: function policies() {
                for (var _len3 = arguments.length, _policies2 = Array(_len3), _key4 = 0; _key4 < _len3; _key4++) {
                    _policies2[_key4] = arguments[_key4];
                }

                _policies2 = (0, _mirukenCore.$flatten)(_policies2, true);
                if (_policies2.length > 0) {
                    _policies = (_policies || []).concat(_policies2);
                }
                return this;
            },
            register: function register(container) {
                if (_newInContext || _newInChildContext) {
                    (function () {
                        var factory = _componentModel.factory;
                        _componentModel.factory = function (dependencies) {
                            var object = factory(dependencies),
                                context = this.resolve(_mirukenContext.Context);
                            if (_newInContext) {
                                _mirukenContext.ContextualHelper.bindContext(object, context);
                            } else {
                                _mirukenContext.ContextualHelper.bindChildContext(context, object);
                            }
                            return object;
                        };
                    })();
                }
                return container.addComponent(_componentModel, _policies);
            }
        });
    }
});

var InterceptorBuilder = exports.InterceptorBuilder = _mirukenCore.Base.extend(Registration, {
    constructor: function constructor(component, componentModel, interceptors) {
        this.extend({
            selectWith: function selectWith(selectors) {
                componentModel.manageDependencies(_mirukenCore.Facet.InterceptorSelectors, function (manager) {
                    selectors.forEach(function (selector) {
                        if (selector instanceof InterceptorSelector) {
                            selecter = (0, _mirukenCore.$use)(selector);
                        }
                        manager.append(selector);
                    });
                });
                return this;
            },
            toFront: function toFront() {
                return this.atIndex(0);
            },
            atIndex: function atIndex(index) {
                componentModel.manageDependencies(_mirukenCore.Facet.Interceptors, function (manager) {
                    return interceptors.forEach(function (interceptor) {
                        return manager.insertIndex(index, interceptor);
                    });
                });
                return componentModel;
            },
            register: function register(container, composer) {
                componentModel.manageDependencies(_mirukenCore.Facet.Interceptors, function (manager) {
                    return manager.append(interceptors);
                });
                return component.register(container, composer);
            }
        });
    }
});

function $component(key) {
    return new ComponentBuilder(key);
}

function ComponentModelError(componentModel, validationResults, message) {
    this.message = message || "The component model contains one or more errors";

    this.componentModel = componentModel;

    this.validationResults = validationResults;

    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        Error.call(this);
    }
}
ComponentModelError.prototype = new Error();
ComponentModelError.prototype.constructor = ComponentModelError;

var Installer = exports.Installer = _mirukenCore.Base.extend(Registration, {
    register: function register(container, composer) {}
});

var FromBuilder = exports.FromBuilder = _mirukenCore.Base.extend(Registration, {
    constructor: function constructor() {
        var _basedOn = void 0;
        this.extend({
            getClasses: function getClasses() {
                return [];
            },
            basedOn: function basedOn() {
                for (var _len4 = arguments.length, constraints = Array(_len4), _key5 = 0; _key5 < _len4; _key5++) {
                    constraints[_key5] = arguments[_key5];
                }

                _basedOn = new BasedOnBuilder(this, (0, _mirukenCore.$flatten)(constraints, true));
                return _basedOn;
            },
            register: function register(container, composer) {
                var registrations = void 0;
                var classes = this.getClasses();
                if (_basedOn) {
                    registrations = classes.map(function (member) {
                        return _basedOn.builderForClass(member);
                    }).filter(function (component) {
                        return component;
                    });
                } else {
                    registrations = classes.filter(function (member) {
                        var clazz = member.member || member;
                        return clazz.prototype instanceof Installer;
                    }).map(function (installer) {
                        installer = installer.member || installer;
                        return new installer();
                    });
                }
                return Promise.all(container.register(registrations)).then(function (registrations) {
                    return _unregisterBatch(registrations);
                });
            }
        });
    }
});

var FromPackageBuilder = exports.FromPackageBuilder = FromBuilder.extend({
    constructor: function constructor(pkg, names) {
        this.base();
        this.extend({
            getClasses: function getClasses() {
                var classes = [];
                pkg.getClasses(names, function (clazz) {
                    return classes.push(clazz);
                });
                return classes;
            }
        });
    }
});

var BasedOnBuilder = exports.BasedOnBuilder = _mirukenCore.Base.extend(Registration, {
    constructor: function constructor(from, constraints) {
        var _if2 = void 0,
            _unless = void 0,
            _configuration = void 0;
        this.withKeys = new KeyBuilder(this);
        this.extend({
            if: function _if(condition) {
                if (_if2) {
                    (function () {
                        var cond = _if2;
                        _if2 = function _if2(clazz) {
                            return cond(clazz) && condition(clazz);
                        };
                    })();
                } else {
                    _if2 = condition;
                }
                return this;
            },
            unless: function unless(condition) {
                if (_unless) {
                    (function () {
                        var cond = _unless;
                        _unless = function _unless(clazz) {
                            return cond(clazz) || condition(clazz);
                        };
                    })();
                } else {
                    _unless = condition;
                }
                return this;
            },
            configure: function configure(configuration) {
                if (_configuration) {
                    (function () {
                        var configure = _configuration;
                        _configuration = function _configuration(component) {
                            configure(component);
                            configuration(component);
                        };
                    })();
                } else {
                    _configuration = configuration;
                }
                return this;
            },
            builderForClass: function builderForClass(member) {
                var basedOn = [],
                    clazz = member.member || member,
                    name = member.name;
                if (_if2 && !_if2(clazz) || _unless && _unless(clazz)) {
                    return;
                }
                for (var i = 0; i < constraints.length; ++i) {
                    var constraint = constraints[i];
                    if ((0, _mirukenCore.$isProtocol)(constraint)) {
                        if (!constraint.adoptedBy(clazz)) {
                            continue;
                        }
                    } else if ((0, _mirukenCore.$isClass)(constraint)) {
                        if (!(clazz.prototype instanceof constraint)) {
                            continue;
                        }
                    }
                    if (basedOn.indexOf(constraint) < 0) {
                        basedOn.push(constraint);
                    }
                }
                if (basedOn.length > 0 || constraints.length === 0) {
                    var keys = this.withKeys.getKeys(clazz, basedOn, name),
                        component = $component(keys).boundTo(clazz);
                    if (_configuration) {
                        _configuration(component);
                    }
                    return component;
                }
            },
            register: function register(container, composer) {
                return from.register(container, composer);
            }
        });
    }
});

var KeyBuilder = exports.KeyBuilder = _mirukenCore.Base.extend({
    constructor: function constructor(basedOn) {
        var _keySelector = void 0;
        this.extend({
            self: function self() {
                return selectKeys(function (keys, clazz) {
                    return keys.push(clazz);
                });
            },
            basedOn: function basedOn() {
                return selectKeys(function (keys, clazz, constraints) {
                    return keys.push.apply(keys, constraints);
                });
            },
            anyService: function anyService() {
                return selectKeys(function (keys, clazz) {
                    var services = clazz[_mirukenCore.Metadata].getAllProtocols();
                    if (services.length > 0) {
                        keys.push(services[0]);
                    }
                });
            },
            allServices: function allServices() {
                return selectKeys(function (keys, clazz) {
                    return keys.push.apply(keys, _toConsumableArray(clazz[_mirukenCore.Metadata].getAllProtocols()));
                });
            },
            mostSpecificService: function mostSpecificService(service) {
                return selectKeys(function (keys, clazz, constraints) {
                    if ((0, _mirukenCore.$isProtocol)(service)) {
                        _addMatchingProtocols(clazz, service, keys);
                    } else {
                        for (var i = 0; i < constraints.length; ++i) {
                            var constraint = constraints[i];
                            if ((0, _mirukenCore.$isFunction)(constraint)) {
                                _addMatchingProtocols(clazz, constraint, keys);
                            }
                        }
                    }
                    if (keys.length === 0) {
                        for (var _i = 0; _i < constraints.length; ++_i) {
                            var _constraint = constraints[_i];
                            if (_constraint !== _mirukenCore.Base && _constraint !== Object) {
                                if ((0, _mirukenCore.$isProtocol)(_constraint)) {
                                    if (_constraint.adoptedBy(clazz)) {
                                        keys.push(_constraint);
                                        break;
                                    }
                                } else if (clazz === _constraint || clazz.prototype instanceof _constraint) {
                                    keys.push(_constraint);
                                    break;
                                }
                            }
                        }
                    }
                });
            },
            name: function name(n) {
                return selectKeys(function (keys, clazz, constraints, name) {
                    if ((0, _mirukenCore.$isNothing)(n)) {
                        if (name) {
                            keys.push(name);
                        }
                    } else if ((0, _mirukenCore.$isFunction)(n)) {
                        if (name = n(name)) {
                            keys.push(String(name));
                        }
                    } else {
                        keys.push(String(n));
                    }
                });
            },
            getKeys: function getKeys(clazz, constraints, name) {
                var keys = [];
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
                (function () {
                    var select = _keySelector;
                    _keySelector = function _keySelector(keys, clazz, constraints, name) {
                        select(keys, clazz, constraints, name);
                        selector(keys, clazz, constraints, name);
                    };
                })();
            } else {
                _keySelector = selector;
            }
            return basedOn;
        }
    }
});

function $classes(from, names) {
    return new FromPackageBuilder(from, names);
}

$classes.fromPackage = function (pkg, names) {
    return new FromPackageBuilder(pkg, names);
};

function _unregisterBatch(registrations) {
    return function () {
        for (var i = 0; i < registrations.length; ++i) {
            registrations[i]();
        }
    };
}

function _addMatchingProtocols(clazz, preference, matches) {
    var toplevel = _toplevelProtocols(clazz);
    for (var i = 0; i < toplevel.length; ++i) {
        var protocol = toplevel[i];
        if (protocol[Meatadata].getAllProtocols().indexOf(preference) >= 0) {
            matches.push(protocol);
        }
    }
}

function _toplevelProtocols(type) {
    var protocols = type[_mirukenCore.Metadata].getAllProtocols(),
        toplevel = protocols.slice(0);
    for (var i = 0; i < protocols.length; ++i) {
        var parents = protocols[i][_mirukenCore.Metadata].getAllProtocols();
        for (var ii = 0; ii < parents.length; ++ii) {
            var index = toplevel.indexOf(parents[ii]);
            if (index >= 0) toplevel.splice(index, 1);
        }
    }
    return toplevel;
}

var InjectionPolicy = exports.InjectionPolicy = _mirukenCore.Base.extend(ComponentPolicy, {
    applyPolicy: function applyPolicy(componentModel) {
        var dependencies = componentModel.getDependencies();
        if (dependencies && dependencies.indexOf(undefined) < 0) {
            return;
        }
        var clazz = componentModel.implementation;
        componentModel.manageDependencies(function (manager) {
            while (clazz && clazz !== _mirukenCore.Base) {
                var injects = [clazz.prototype.$inject, clazz.prototype.inject, clazz.$inject, clazz.inject];
                for (var i = 0; i < injects.length; ++i) {
                    var inject = injects[i];
                    if (inject !== undefined) {
                        if ((0, _mirukenCore.$isFunction)(inject)) {
                            inject = inject();
                        }
                        manager.merge(inject);
                        if (inject.indexOf(undefined) < 0) {
                            return;
                        }
                    }
                }
                clazz = (0, _mirukenCore.$ancestorOf)(clazz);
            }
        });
    }
});

var InitializationPolicy = exports.InitializationPolicy = _mirukenCore.Base.extend(ComponentPolicy, {
    componentCreated: function componentCreated(component) {
        if ((0, _mirukenCore.$isFunction)(component.initialize)) {
            return component.initialize();
        }
    }
});

var DEFAULT_POLICIES = [new InjectionPolicy(), new InitializationPolicy()];

var IoContainer = exports.IoContainer = _mirukenCallback.CallbackHandler.extend(Container, {
    constructor: function constructor() {
        var _policies = DEFAULT_POLICIES;
        this.extend({
            addComponent: function addComponent(componentModel) {
                for (var _len5 = arguments.length, policies = Array(_len5 > 1 ? _len5 - 1 : 0), _key6 = 1; _key6 < _len5; _key6++) {
                    policies[_key6 - 1] = arguments[_key6];
                }

                policies = (0, _mirukenCore.$flatten)(policies, true);
                policies = policies.length > 0 ? _policies.concat(policies) : _policies;
                for (var i = 0; i < policies.length; ++i) {
                    var policy = policies[i];
                    if ((0, _mirukenCore.$isFunction)(policy.applyPolicy)) {
                        policy.applyPolicy(componentModel, policies);
                    }
                }
                var validation = (0, _mirukenValidate.Validator)(_mirukenCallback.$composer).validate(componentModel);
                if (!validation.valid) {
                    throw new ComponentModelError(componentModel, validation);
                }
                return this.registerHandler(componentModel, policies);
            },
            addPolicies: function addPolicies() {
                for (var _len6 = arguments.length, policies = Array(_len6), _key7 = 0; _key7 < _len6; _key7++) {
                    policies[_key7] = arguments[_key7];
                }

                policies = (0, _mirukenCore.$flatten)(policies, true);
                if (policies.length > 0) {
                    _policies = _policies.concat(policies);
                }
            }
        });
    },
    register: function register() {
        var _this4 = this;

        for (var _len7 = arguments.length, registrations = Array(_len7), _key8 = 0; _key8 < _len7; _key8++) {
            registrations[_key8] = arguments[_key8];
        }

        return (0, _mirukenCore.$flatten)(registrations, true).map(function (registration) {
            return registration.register(_this4, _mirukenCallback.$composer);
        });
    },
    registerHandler: function registerHandler(componentModel, policies) {
        var key = componentModel.key;
        var clazz = componentModel.implementation,
            lifestyle = componentModel.lifestyle || new SingletonLifestyle(),
            factory = componentModel.factory,
            burden = componentModel.burden;
        key = componentModel.invariant ? (0, _mirukenCore.$eq)(key) : key;
        return _registerHandler(this, key, clazz, lifestyle, factory, burden, policies);
    },
    invoke: function invoke(fn, dependencies, ctx) {
        var inject = fn.$inject || fn.inject;
        var manager = new DependencyManager(dependencies);
        if (inject) {
            if ((0, _mirukenCore.$isFunction)(inject)) {
                inject = inject();
            }
            manager.merge(inject);
        }
        dependencies = manager.getItems();
        if (dependencies.length > 0) {
            var burden = { d: dependencies },
                deps = _resolveBurden(burden, true, null, _mirukenCallback.$composer);
            return fn.apply(ctx, deps.d);
        }
        return fn();
    },
    dispose: function dispose() {
        _mirukenCallback.$provide.removeAll(this);
    }
});

function _registerHandler(container, key, clazz, lifestyle, factory, burden, policies) {
    return (0, _mirukenCallback.$provide)(container, key, function handler(resolution, composer) {
        if (!(resolution instanceof DependencyResolution)) {
            resolution = new DependencyResolution(resolution.key);
        }
        if (!resolution.claim(handler, clazz)) {
            return _mirukenCallback.$NOT_HANDLED;
        }
        return lifestyle.resolve(function (configure) {
            var instant = _mirukenCore.$instant.test(resolution.key),
                dependencies = _resolveBurden(burden, instant, resolution, composer);
            return (0, _mirukenCore.$isPromise)(dependencies) ? dependencies.then(createComponent) : createComponent(dependencies);
            function createComponent(dependencies) {
                var component = factory.call(composer, dependencies);
                if ((0, _mirukenCore.$isFunction)(configure)) {
                    configure(component, dependencies);
                }
                return applyPolicies(0);
                function applyPolicies(index) {
                    var _loop = function _loop(i) {
                        var policy = policies[i];
                        if ((0, _mirukenCore.$isFunction)(policy.componentCreated)) {
                            var result = policy.componentCreated(component, dependencies, composer);
                            if ((0, _mirukenCore.$isPromise)(result)) {
                                return {
                                    v: result.then(function () {
                                        return applyPolicies(i + 1);
                                    })
                                };
                            }
                        }
                    };

                    for (var i = index; i < policies.length; ++i) {
                        var _ret8 = _loop(i);

                        if ((typeof _ret8 === 'undefined' ? 'undefined' : _typeof(_ret8)) === "object") return _ret8.v;
                    }
                    return component;
                }
            }
        }, composer);
    }, lifestyle.dispose.bind(lifestyle));
}

function _resolveBurden(burden, instant, resolution, composer) {
    var promises = [],
        dependencies = {},
        containerDep = Container(composer);

    var _loop2 = function _loop2(key) {
        var group = burden[key];
        if ((0, _mirukenCore.$isNothing)(group)) {
            return 'continue';
        }
        var resolved = group.slice(0);

        var _loop3 = function _loop3(index) {
            var dep = resolved[index];
            if (dep === undefined) {
                return 'continue';
            }
            var use = dep.test(DependencyModifier.Use),
                lazy = dep.test(DependencyModifier.Lazy),
                promise = dep.test(DependencyModifier.Promise),
                child = dep.test(DependencyModifier.Child),
                dynamic = dep.test(DependencyModifier.Dynamic);
            var dependency = dep.dependency;
            if (use || dynamic || (0, _mirukenCore.$isNothing)(dependency)) {
                if (dynamic && (0, _mirukenCore.$isFunction)(dependency)) {
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
                (function () {
                    var all = dep.test(DependencyModifier.Every),
                        optional = dep.test(DependencyModifier.Optional),
                        invariant = dep.test(DependencyModifier.Invariant),
                        fromContainer = dep.test(DependencyModifier.Container);
                    if (invariant) {
                        dependency = (0, _mirukenCore.$eq)(dependency);
                    }
                    if (instant) {
                        dependency = (0, _mirukenCore.$instant)(dependency);
                    }
                    if (lazy) {
                        dependency = function (paramDep, created, param) {
                            return function () {
                                if (!created) {
                                    created = true;
                                    var container = fromContainer ? containerDep : composer;
                                    param = _resolveDependency(paramDep, false, promise, child, all, container);
                                }
                                return param;
                            };
                        }(dependency);
                    } else {
                        var paramDep = new DependencyResolution(dependency, resolution, all),
                            container = fromContainer ? containerDep : composer;
                        dependency = _resolveDependency(paramDep, !optional, promise, child, all, container);
                        if (!promise && (0, _mirukenCore.$isPromise)(dependency)) {
                            promises.push(dependency);
                            dependency.then(function (param) {
                                return resolved[index] = param;
                            });
                        }
                    }
                })();
            }
            resolved[index] = dependency;
        };

        for (var index = 0; index < resolved.length; ++index) {
            var _ret10 = _loop3(index);

            if (_ret10 === 'continue') continue;
        }
        dependencies[key] = resolved;
    };

    for (var key in burden) {
        var _ret9 = _loop2(key);

        if (_ret9 === 'continue') continue;
    }
    if (promises.length === 1) {
        return promises[0].then(function () {
            return dependencies;
        });
    } else if (promises.length > 1) {
        return Promise.all(promises).then(function () {
            return dependencies;
        });
    }
    return dependencies;
}

function _resolveDependency(dependency, required, promise, child, all, composer) {
    var result = all ? composer.resolveAll(dependency) : composer.resolve(dependency);
    if (result === undefined) {
        if (required) {
            var error = new DependencyResolutionError(dependency, 'Dependency ' + dependency.formattedDependencyChain() + ' could not be resolved.');
            if (_mirukenCore.$instant.test(dependency.key)) {
                throw error;
            }
            return Promise.reject(error);
        }
        return result;
    } else if (child && !all) {
        result = (0, _mirukenCore.$isPromise)(result) ? result.then(function (parent) {
            return _createChild(parent);
        }) : _createChild(result);
    }
    return promise ? Promise.resolve(result) : result;
}

function _createChild(parent) {
    if (!(parent && (0, _mirukenCore.$isFunction)(parent.newChild))) {
        throw new Error('Child dependency requested, but ' + parent + ' is not a parent.');
    }
    return parent.newChild();
}