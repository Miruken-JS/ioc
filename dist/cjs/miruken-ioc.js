'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var mirukenCore = require('miruken-core');
var mirukenContext = require('miruken-context');
var mirukenValidate = require('miruken-validate');
var mirukenCallback = require('miruken-callback');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var policyMetadataKey = Symbol();

var ComponentPolicy = mirukenCore.Protocol.extend({
    applyPolicy: function applyPolicy(componentModel, policies) {},
    componentCreated: function componentCreated(component, componentModel, dependencies, composer) {}
});

var policy = mirukenCore.Metadata.decorator(policyMetadataKey, function (target, key, descriptor, policies) {
    if (mirukenCore.isDescriptor(descriptor)) {
        throw new SyntaxError("@policy can only be applied to a class");
    }
    policies = mirukenCore.$flatten(key, true);
    if (policies.length > 0) {
        var _Metadata$getOrCreate;

        (_Metadata$getOrCreate = mirukenCore.Metadata.getOrCreateOwn(policyMetadataKey, target, function () {
            return [];
        })).push.apply(_Metadata$getOrCreate, _toConsumableArray(policies.map(_createOrUsePolicy)));
    }
});

function _createOrUsePolicy(policy) {
    return mirukenCore.$isFunction(policy) ? new policy() : policy;
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var Lifestyle = mirukenCore.Abstract.extend(ComponentPolicy, mirukenCore.Disposing, mirukenCore.DisposingMixin, {
    resolve: function resolve(factory) {
        return factory();
    },
    trackInstance: function trackInstance(instance) {
        var _this = this;

        if (instance && mirukenCore.$isFunction(instance.dispose)) {
            var _ret = function () {
                var lifestyle = _this;
                return {
                    v: mirukenCore.$decorate(instance, {
                        dispose: function dispose(disposing) {
                            if (disposing || lifestyle.disposeInstance(this, true)) {
                                this.base();
                                Reflect.deleteProperty(this, "dispose");
                            }
                        }
                    })
                };
            }();

            if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
        }
        return instance;
    },
    disposeInstance: function disposeInstance(instance, disposing) {
        if (!disposing && instance && mirukenCore.$isFunction(instance.dispose)) {
            instance.dispose(true);
        }
        return !disposing;
    },
    applyPolicy: function applyPolicy(componentModel) {
        componentModel.lifestyle = new this.constructor();
    }
});

var TransientLifestyle = Lifestyle.extend({
    constructor: function constructor() {},
    applyPolicy: function applyPolicy(componentModel) {
        componentModel.lifestyle = this;
    }
});

var SingletonLifestyle = Lifestyle.extend({
    constructor: function constructor(instance) {
        this.extend({
            resolve: function resolve(factory) {
                var _this2 = this;

                if (instance == null) {
                    return factory(function (object) {
                        if (!instance && object) {
                            instance = _this2.trackInstance(object);
                            return instance;
                        }
                    });
                }
                instance = this.trackInstance(instance);
                return instance;
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

var ContextualLifestyle = Lifestyle.extend({
    constructor: function constructor() {
        var _cache = {};
        this.extend({
            resolve: function resolve(factory, composer) {
                var _this3 = this;

                var context = composer.resolve(mirukenContext.Context);
                if (context) {
                    var _ret2 = function () {
                        var id = context.id;
                        var instance = _cache[id];
                        return {
                            v: instance ? instance : factory(function (object) {
                                if (object && !_cache[id]) {
                                    instance = _this3.trackInstance(object);
                                    instance = _this3.setContext(object, instance, context);
                                    _cache[id] = instance;
                                    context.onEnded(function () {
                                        return instance.context = null;
                                    });
                                }
                                return instance;
                            })
                        };
                    }();

                    if ((typeof _ret2 === "undefined" ? "undefined" : _typeof(_ret2)) === "object") return _ret2.v;
                }
            },
            setContext: function setContext(object, instance, context) {
                var lifestyle = this,
                    property = mirukenCore.getPropertyDescriptors(instance, "context");
                if (!(property && property.set)) {
                    instance = object === instance ? mirukenCore.$decorate(object, mirukenContext.ContextualMixin) : instance.extend(mirukenContext.ContextualMixin);
                }
                mirukenContext.ContextualHelper.bindContext(instance, context, true);
                return instance.extend({
                    set context(value) {
                        if (value == context) {
                            return;
                        }
                        if (value != null) {
                            throw new Error("Container managed instances cannot change context");
                        }
                        this.base(value);
                        lifestyle.disposeInstance(instance);
                        return;
                    }
                });
            },
            disposeInstance: function disposeInstance(instance, disposing) {
                if (!disposing) {
                    for (var contextId in _cache) {
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
            _dispose: function _dispose() {
                for (var contextId in _cache) {
                    this.disposeInstance(_cache[contextId]);
                }
                _cache = {};
            }
        });
    }
});

var $$composer = Symbol();

var $container = mirukenCore.$createModifier();

var DependencyModifier = mirukenCore.Flags({
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

DependencyModifier.Use.modifier = mirukenCore.$use;
DependencyModifier.Lazy.modifier = mirukenCore.$lazy;
DependencyModifier.Every.modifier = mirukenCore.$every;
DependencyModifier.Dynamic.modifier = mirukenCore.$eval;
DependencyModifier.Child.modifier = mirukenCore.$child;
DependencyModifier.Optional.modifier = mirukenCore.$optional;
DependencyModifier.Promise.modifier = mirukenCore.$promise;
DependencyModifier.Container.modifier = $container;
DependencyModifier.Invariant.modifier = mirukenCore.$eq;

var DependencyModel = mirukenCore.Base.extend({
  constructor: function constructor(dependency, modifiers) {
    modifiers = DependencyModifier.None.addFlag(modifiers);
    if (dependency instanceof mirukenCore.Modifier) {
      DependencyModifier.items.forEach(function (flag) {
        var modifier = flag.modifier;
        if (modifier && modifier.test(dependency)) {
          modifiers = modifiers.addFlag(flag);
        }
      });
      dependency = mirukenCore.Modifier.unwrap(dependency);
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

var DependencyManager = mirukenCore.ArrayManager.extend({
  constructor: function constructor(dependencies) {
    this.base(dependencies);
  },
  mapItem: function mapItem(item) {
    return !(item !== undefined && item instanceof DependencyModel) ? DependencyModel(item) : item;
  }
});

var DependencyResolution = mirukenCallback.Resolution.extend({
  constructor: function constructor(key, parent, many) {
    var _type = void 0,
        _handler = void 0;
    this.base(key, many);
    this.extend({
      claim: function claim(handler, type) {
        if (this.isResolvingDependency(handler)) {
          return false;
        }
        _handler = handler;
        _type = type;
        return true;
      },

      get parent() {
        return parent;
      },

      get type() {
        return _type;
      },
      isResolvingDependency: function isResolvingDependency(handler) {
        return handler === _handler || parent && parent.isResolvingDependency(handler);
      },
      formattedDependencyChain: function formattedDependencyChain() {
        var invariant = mirukenCore.$eq.test(key),
            rawKey = mirukenCore.Modifier.unwrap(key),
            keyDisplay = invariant ? "`" + rawKey + "`" : rawKey,
            display = _type ? "(" + keyDisplay + " <- " + _type + ")" : keyDisplay;
        return parent ? display + " <= " + parent.formattedDependencyChain() : display;
      }
    });
  }
});

function DependencyResolutionError(dependency, message) {
  this.message = message || "Dependency " + dependency.formattedDependencyChain() + " could not be resolved.";

  this.dependency = dependency;
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    Error.call(this);
  }
}
DependencyResolutionError.prototype = new Error();
DependencyResolutionError.prototype.constructor = DependencyResolutionError;

var Registration = mirukenCore.Protocol.extend({
  register: function register(container, composer) {}
});

var Container = mirukenCore.Protocol.extend(mirukenCore.Invoking, mirukenCore.Disposing, {
  register: function register(registrations) {},
  addComponent: function addComponent(componentModel, policies) {},
  addPolicies: function addPolicies(policies) {},
  resolve: function resolve(key) {},
  resolveAll: function resolveAll(key) {}
});

var _obj;

function _applyDecoratedDescriptor(target, property, decorators, descriptor, context) {
    var desc = {};
    Object['ke' + 'ys'](descriptor).forEach(function (key) {
        desc[key] = descriptor[key];
    });
    desc.enumerable = !!desc.enumerable;
    desc.configurable = !!desc.configurable;

    if ('value' in desc || desc.initializer) {
        desc.writable = true;
    }

    desc = decorators.slice().reverse().reduce(function (desc, decorator) {
        return decorator(target, property, desc) || desc;
    }, desc);

    if (context && desc.initializer !== void 0) {
        desc.value = desc.initializer ? desc.initializer.call(context) : void 0;
        desc.initializer = undefined;
    }

    if (desc.initializer === void 0) {
        Object['define' + 'Property'](target, property, desc);
        desc = null;
    }

    return desc;
}

var proxyBuilder = new mirukenCore.ProxyBuilder();

var ComponentModel = mirukenCore.Base.extend((_obj = {
    constructor: function constructor() {
        var _key = void 0,
            _impl = void 0,
            _lifestyle = void 0,
            _factory = void 0,
            _invariant = false,
            _burden = {};
        this.extend({
            get key() {
                return _key || _impl;
            },
            set key(value) {
                _key = value;
            },

            get implementation() {
                var impl = _impl;
                if (!impl && mirukenCore.$isClass(_key)) {
                    impl = _key;
                }
                return impl;
            },
            set implementation(value) {
                if (mirukenCore.$isSomething(value) && !mirukenCore.$isClass(value)) {
                    throw new TypeError(value + " is not a class.");
                }
                _impl = value;
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
                if (!mirukenCore.$isSomething(value) && !(value instanceof Lifestyle)) {
                    throw new TypeError(value + " is not a Lifestyle.");
                }
                _lifestyle = value;
            },

            get factory() {
                var factory = _factory,
                    clazz = this.implementation;
                if (!factory) {
                    var interceptors = _burden[mirukenCore.Facet.Interceptors];
                    if (interceptors && interceptors.length > 0) {
                        var types = [];
                        if (clazz) {
                            types.push(clazz);
                        }
                        if (mirukenCore.$isProtocol(_key)) {
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
                if (mirukenCore.$isSomething(value) && !mirukenCore.$isFunction(value)) {
                    throw new TypeError(value + " is not a function.");
                }
                _factory = value;
            },
            getDependencies: function getDependencies(key) {
                return _burden[key || mirukenCore.Facet.Parameters];
            },
            setDependencies: function setDependencies(key, value) {
                if (arguments.length === 1) {
                    value = key, key = mirukenCore.Facet.Parameters;
                }
                if (mirukenCore.$isSomething(value) && !Array.isArray(value)) {
                    throw new TypeError(value + " is not an array.");
                }
                _burden[key] = value.map(DependencyModel);
            },
            allDependenciesDefined: function allDependenciesDefined(key) {
                var deps = _burden[key || mirukenCore.Facet.Parameters];
                if (!deps) return false;
                for (var i = 0; i < deps.length; ++i) {
                    if (deps[i] === undefined) {
                        return false;
                    }
                }
                return true;
            },
            manageDependencies: function manageDependencies(key, actions) {
                if (arguments.length === 1) {
                    actions = key, key = mirukenCore.Facet.Parameters;
                }
                var dependencies = _burden[key];
                var manager = new DependencyManager(dependencies);
                if (mirukenCore.$isFunction(actions)) {
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
}, (_applyDecoratedDescriptor(_obj, "keyCanBeDetermined", [mirukenValidate.validateThat], Object.getOwnPropertyDescriptor(_obj, "keyCanBeDetermined"), _obj), _applyDecoratedDescriptor(_obj, "factoryCanBeDetermined", [mirukenValidate.validateThat], Object.getOwnPropertyDescriptor(_obj, "factoryCanBeDetermined"), _obj)), _obj));

function _makeClassFactory(clazz) {
    return function (burden) {
        return Reflect.construct(clazz, burden[mirukenCore.Facet.Parameters] || mirukenCore.emptyArray);
    };
}

function _makeProxyFactory(types) {
    var proxy = proxyBuilder.buildProxy(types);
    return function (burden) {
        return Reflect.construct(proxy, [burden]);
    };
}

var ComponentBuilder = mirukenCore.Base.extend(Registration, {
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

                dependencies = mirukenCore.$flatten(dependencies);
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
                for (var _len2 = arguments.length, interceptors = Array(_len2), _key3 = 0; _key3 < _len2; _key3++) {
                    interceptors[_key3] = arguments[_key3];
                }

                interceptors = mirukenCore.$flatten(interceptors, true);
                return new InterceptorBuilder(this, _componentModel, interceptors);
            },
            policies: function policies() {
                for (var _len3 = arguments.length, policies = Array(_len3), _key4 = 0; _key4 < _len3; _key4++) {
                    policies[_key4] = arguments[_key4];
                }

                policies = mirukenCore.$flatten(policies, true);
                if (policies.length > 0) {
                    _policies = (_policies || []).concat(policies);
                }
                return this;
            },
            register: function register(container) {
                if (_newInContext || _newInChildContext) {
                    (function () {
                        var factory = _componentModel.factory;
                        _componentModel.factory = function (dependencies) {
                            var object = factory(dependencies),
                                context = this.resolve(mirukenContext.Context);
                            if (_newInContext) {
                                mirukenContext.ContextualHelper.bindContext(object, context);
                            } else {
                                mirukenContext.ContextualHelper.bindChildContext(context, object);
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

var InterceptorBuilder = mirukenCore.Base.extend(Registration, {
    constructor: function constructor(component, componentModel, interceptors) {
        this.extend({
            selectWith: function selectWith(selectors) {
                componentModel.manageDependencies(mirukenCore.Facet.InterceptorSelectors, function (manager) {
                    selectors.forEach(function (selector) {
                        if (selector instanceof InterceptorSelector) {
                            selecter = mirukenCore.$use(selector);
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
                componentModel.manageDependencies(mirukenCore.Facet.Interceptors, function (manager) {
                    return interceptors.forEach(function (interceptor) {
                        return manager.insertIndex(index, interceptor);
                    });
                });
                return componentModel;
            },
            register: function register(container, composer) {
                componentModel.manageDependencies(mirukenCore.Facet.Interceptors, function (manager) {
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

function _toConsumableArray$1(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var Installer = mirukenCore.Base.extend(Registration, {
    register: function register(container, composer) {}
});

var FromBuilder = mirukenCore.Base.extend(Registration, {
    constructor: function constructor() {
        var _basedOn = void 0;
        this.extend({
            getClasses: function getClasses() {
                return [];
            },
            basedOn: function basedOn() {
                for (var _len = arguments.length, constraints = Array(_len), _key = 0; _key < _len; _key++) {
                    constraints[_key] = arguments[_key];
                }

                _basedOn = new BasedOnBuilder(this, mirukenCore.$flatten(constraints, true));
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
                return Promise.all(container.register(registrations)).then(_unregisterBatch);
            }
        });
    }
});

var FromPackageBuilder = FromBuilder.extend({
    constructor: function constructor(pkg, names) {
        this.base();
        this.extend({
            getClasses: function getClasses() {
                var classes = [];
                names = names || Object.keys(pkg);
                var _iteratorNormalCompletion = true;
                var _didIteratorError = false;
                var _iteratorError = undefined;

                try {
                    for (var _iterator = names[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        var name = _step.value;

                        var member = pkg[name];
                        if (member != null && mirukenCore.$isClass(member)) {
                            classes.push({ name: name, member: member });
                        }
                    }
                } catch (err) {
                    _didIteratorError = true;
                    _iteratorError = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion && _iterator.return) {
                            _iterator.return();
                        }
                    } finally {
                        if (_didIteratorError) {
                            throw _iteratorError;
                        }
                    }
                }

                return classes;
            }
        });
    }
});

var BasedOnBuilder = mirukenCore.Base.extend(Registration, {
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
                var _iteratorNormalCompletion2 = true;
                var _didIteratorError2 = false;
                var _iteratorError2 = undefined;

                try {
                    for (var _iterator2 = constraints[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                        var constraint = _step2.value;

                        if (mirukenCore.$isProtocol(constraint)) {
                            if (!constraint.isAdoptedBy(clazz)) {
                                continue;
                            }
                        } else if (mirukenCore.$isClass(constraint)) {
                            if (!(clazz.prototype instanceof constraint)) {
                                continue;
                            }
                        }
                        if (basedOn.indexOf(constraint) < 0) {
                            basedOn.push(constraint);
                        }
                    }
                } catch (err) {
                    _didIteratorError2 = true;
                    _iteratorError2 = err;
                } finally {
                    try {
                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                            _iterator2.return();
                        }
                    } finally {
                        if (_didIteratorError2) {
                            throw _iteratorError2;
                        }
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

var KeyBuilder = mirukenCore.Base.extend({
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
                    var services = mirukenCore.$protocols(clazz);
                    if (services.length > 0) {
                        keys.push(services[0]);
                    }
                });
            },
            allServices: function allServices() {
                return selectKeys(function (keys, clazz) {
                    return keys.push.apply(keys, _toConsumableArray$1(mirukenCore.$protocols(clazz)));
                });
            },
            mostSpecificService: function mostSpecificService(service) {
                return selectKeys(function (keys, clazz, constraints) {
                    if (mirukenCore.$isProtocol(service)) {
                        _addMatchingProtocols(clazz, service, keys);
                    } else {
                        var _iteratorNormalCompletion3 = true;
                        var _didIteratorError3 = false;
                        var _iteratorError3 = undefined;

                        try {
                            for (var _iterator3 = constraints[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                var constraint = _step3.value;

                                if (mirukenCore.$isFunction(constraint)) {
                                    _addMatchingProtocols(clazz, constraint, keys);
                                }
                            }
                        } catch (err) {
                            _didIteratorError3 = true;
                            _iteratorError3 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion3 && _iterator3.return) {
                                    _iterator3.return();
                                }
                            } finally {
                                if (_didIteratorError3) {
                                    throw _iteratorError3;
                                }
                            }
                        }
                    }
                    if (keys.length === 0) {
                        var _iteratorNormalCompletion4 = true;
                        var _didIteratorError4 = false;
                        var _iteratorError4 = undefined;

                        try {
                            for (var _iterator4 = constraints[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                                var _constraint = _step4.value;

                                if (_constraint !== mirukenCore.Base && _constraint !== Object) {
                                    if (mirukenCore.$isProtocol(_constraint)) {
                                        if (_constraint.isAdoptedBy(clazz)) {
                                            keys.push(_constraint);
                                            break;
                                        }
                                    } else if (clazz === _constraint || clazz.prototype instanceof _constraint) {
                                        keys.push(_constraint);
                                        break;
                                    }
                                }
                            }
                        } catch (err) {
                            _didIteratorError4 = true;
                            _iteratorError4 = err;
                        } finally {
                            try {
                                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                                    _iterator4.return();
                                }
                            } finally {
                                if (_didIteratorError4) {
                                    throw _iteratorError4;
                                }
                            }
                        }
                    }
                });
            },
            name: function name(n) {
                return selectKeys(function (keys, clazz, constraints, name) {
                    if (mirukenCore.$isNothing(n)) {
                        if (name) {
                            keys.push(name);
                        }
                    } else if (mirukenCore.$isFunction(n)) {
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
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
            for (var _iterator5 = registrations[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var registration = _step5.value;

                registration();
            }
        } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion5 && _iterator5.return) {
                    _iterator5.return();
                }
            } finally {
                if (_didIteratorError5) {
                    throw _iteratorError5;
                }
            }
        }
    };
}

function _addMatchingProtocols(clazz, preference, matches) {
    var toplevel = _toplevelProtocols(clazz);
    var _iteratorNormalCompletion6 = true;
    var _didIteratorError6 = false;
    var _iteratorError6 = undefined;

    try {
        for (var _iterator6 = toplevel[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
            var protocol = _step6.value;

            if (mirukenCore.$protocols(protocol).indexOf(preference) >= 0) {
                matches.push(protocol);
            }
        }
    } catch (err) {
        _didIteratorError6 = true;
        _iteratorError6 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion6 && _iterator6.return) {
                _iterator6.return();
            }
        } finally {
            if (_didIteratorError6) {
                throw _iteratorError6;
            }
        }
    }
}

function _toplevelProtocols(type) {
    var protocols = mirukenCore.$protocols(type),
        toplevel = protocols.slice();
    var _iteratorNormalCompletion7 = true;
    var _didIteratorError7 = false;
    var _iteratorError7 = undefined;

    try {
        for (var _iterator7 = protocols[Symbol.iterator](), _step7; !(_iteratorNormalCompletion7 = (_step7 = _iterator7.next()).done); _iteratorNormalCompletion7 = true) {
            var protocol = _step7.value;

            var parents = mirukenCore.$protocols(protocol);
            var _iteratorNormalCompletion8 = true;
            var _didIteratorError8 = false;
            var _iteratorError8 = undefined;

            try {
                for (var _iterator8 = parents[Symbol.iterator](), _step8; !(_iteratorNormalCompletion8 = (_step8 = _iterator8.next()).done); _iteratorNormalCompletion8 = true) {
                    var parent = _step8.value;

                    var index = toplevel.indexOf(parent);
                    if (index >= 0) toplevel.splice(index, 1);
                }
            } catch (err) {
                _didIteratorError8 = true;
                _iteratorError8 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion8 && _iterator8.return) {
                        _iterator8.return();
                    }
                } finally {
                    if (_didIteratorError8) {
                        throw _iteratorError8;
                    }
                }
            }
        }
    } catch (err) {
        _didIteratorError7 = true;
        _iteratorError7 = err;
    } finally {
        try {
            if (!_iteratorNormalCompletion7 && _iterator7.return) {
                _iterator7.return();
            }
        } finally {
            if (_didIteratorError7) {
                throw _iteratorError7;
            }
        }
    }

    return toplevel;
}

var _typeof$1 = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray$2(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var ConstructorPolicy = mirukenCore.Policy.extend(ComponentPolicy, {
    applyPolicy: function applyPolicy(componentModel) {
        var implementation = componentModel.implementation;
        if (!implementation) {
            return;
        }

        componentModel.manageDependencies(function (manager) {
            return mirukenCore.inject.collect(implementation.prototype, "constructor", function (deps) {
                if (deps && deps.length > 0) {
                    manager.merge(deps);
                    return componentModel.allDependenciesDefined();
                }
            });
        });

        if (!componentModel.allDependenciesDefined()) {
            (function () {
                var params = mirukenCore.design.get(implementation.prototype, "constructor");
                if (params && params.length > 0) {
                    componentModel.manageDependencies(function (manager) {
                        for (var i = 0; i < params.length; ++i) {
                            if (!manager.getIndex(i)) {
                                var param = params[i];
                                if (Array.isArray(param)) {
                                    param = mirukenCore.$every(param[0]);
                                }
                                manager.setIndex(i, param);
                            }
                        }
                    });
                }
            })();
        }
    }
});

var PropertyInjectionPolicy = mirukenCore.Policy.extend(ComponentPolicy, {
    applyPolicy: function applyPolicy(componentModel) {
        var _this = this;

        var implementation = componentModel.implementation;
        if (!implementation) {
            return;
        }

        var prototype = implementation.prototype,
            props = mirukenCore.getPropertyDescriptors(prototype);
        Reflect.ownKeys(props).forEach(function (key) {
            var descriptor = props[key];
            if (!mirukenCore.$isFunction(descriptor.value)) {
                var _ret2 = function () {
                    var dependency = mirukenCore.inject.get(prototype, key);
                    if (mirukenCore.$isNothing(dependency)) {
                        if (_this.explicit) {
                            return {
                                v: void 0
                            };
                        }
                        dependency = mirukenCore.design.get(prototype, key);
                    }
                    if (dependency) {
                        componentModel.manageDependencies("property:" + key, function (manager) {
                            if (!manager.getIndex(0)) {
                                manager.setIndex(0, mirukenCore.$optional(dependency));
                            }
                        });
                    }
                }();

                if ((typeof _ret2 === "undefined" ? "undefined" : _typeof$1(_ret2)) === "object") return _ret2.v;
            }
        });
    },
    componentCreated: function componentCreated(component, componentModel, dependencies) {
        Reflect.ownKeys(dependencies).forEach(function (key) {
            if (mirukenCore.$isFunction(key.startsWith) && key.startsWith("property:")) {
                var dependency = dependencies[key][0];
                if (mirukenCore.$isSomething(dependency)) {
                    var property = key.substring(9);
                    component[property] = dependency;
                }
            }
        });
    }
});

var ComponentModelAware = mirukenCore.Protocol.extend({
    set componentModel(value) {}
});

var ComponentModelAwarePolicy = mirukenCore.Policy.extend(ComponentPolicy, {
    constructor: function constructor(implicit) {
        this.extend({
            componentCreated: function componentCreated(component, componentModel) {
                if (!implicit || ComponentModelAware.isAdoptedBy(component)) {
                    component.componentModel = componentModel;
                }
            }
        });
    }
});
Object.defineProperties(ComponentModelAwarePolicy, {
    Implicit: { value: new ComponentModelAwarePolicy(true) },

    Explicit: { value: new ComponentModelAwarePolicy(false) }
});

var PolicyMetadataPolicy = mirukenCore.Policy.extend(ComponentPolicy, {
    applyPolicy: function applyPolicy(componentModel, policies) {
        var implementation = componentModel.implementation;
        if (implementation) {
            (function () {
                var index = policies.length;
                policy.collect(implementation, function (ps) {
                    return policies.splice.apply(policies, [index, 0].concat(_toConsumableArray$2(ps)));
                });
            })();
        }
    }
});

var InitializationPolicy = new (mirukenCore.Policy.extend(ComponentPolicy, {
    componentCreated: function componentCreated(component) {
        if (mirukenCore.$isFunction(component.initialize)) {
            return component.initialize();
        }
    }
}))();

var DEFAULT_POLICIES = [new ConstructorPolicy(), ComponentModelAwarePolicy.Implicit, new PolicyMetadataPolicy()];

var IoContainer = mirukenCallback.Handler.extend(Container, {
    constructor: function constructor() {
        var _policies = DEFAULT_POLICIES;
        this.extend({
            addComponent: function addComponent(componentModel) {
                for (var _len = arguments.length, policies = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                    policies[_key - 1] = arguments[_key];
                }

                var policyIndex = 0;
                policies = _policies.concat(mirukenCore.$flatten(policies, true));
                while (policyIndex < policies.length) {
                    var _policy = policies[policyIndex++];
                    if (mirukenCore.$isFunction(_policy.applyPolicy)) {
                        _policy.applyPolicy(componentModel, policies);
                    }
                }
                var validation = mirukenValidate.Validator(mirukenCallback.$composer).validate(componentModel);
                if (!validation.valid) {
                    throw new ComponentModelError(componentModel, validation);
                }
                return this.registerHandler(componentModel, policies);
            },
            addPolicies: function addPolicies() {
                for (var _len2 = arguments.length, policies = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
                    policies[_key2] = arguments[_key2];
                }

                policies = mirukenCore.$flatten(policies, true);
                if (policies.length > 0) {
                    _policies = _policies.concat(policies);
                }
            }
        });
    },
    resolve: function resolve(key) {
        var resolution = key instanceof mirukenCallback.Resolution ? key : new DependencyResolution(key);
        if (this.handle(resolution, false, mirukenCallback.$composer)) {
            return resolution.callbackResult;
        }
    },
    resolveAll: function resolveAll(key) {
        var resolution = key instanceof mirukenCallback.Resolution ? key : new DependencyResolution(key, null, true);
        return this.handle(resolution, true, mirukenCallback.$composer) ? resolution.callbackResult : [];
    },
    register: function register() {
        var _this2 = this;

        for (var _len3 = arguments.length, registrations = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
            registrations[_key3] = arguments[_key3];
        }

        return mirukenCore.$flatten(registrations, true).map(function (registration) {
            return registration.register(_this2, mirukenCallback.$composer);
        });
    },
    registerHandler: function registerHandler(componentModel, policies) {
        return _registerHandler(componentModel, this, policies);
    },
    invoke: function invoke(fn, dependencies, ctx) {
        var inject$$1 = fn.$inject || fn.inject;
        var manager = new DependencyManager(dependencies);
        if (inject$$1) {
            if (mirukenCore.$isFunction(inject$$1)) {
                inject$$1 = inject$$1();
            }
            manager.merge(inject$$1);
        }
        dependencies = manager.getItems();
        if (dependencies.length > 0) {
            var burden = { d: dependencies },
                deps = _resolveBurden(burden, true, null, mirukenCallback.$composer);
            return fn.apply(ctx, deps.d);
        }
        return fn();
    },
    dispose: function dispose() {
        mirukenCallback.$provide.removeAll(this);
    }
});

function _registerHandler(componentModel, container, policies) {
    var key = componentModel.key;
    var type = componentModel.implementation,
        lifestyle = componentModel.lifestyle || new SingletonLifestyle(),
        factory = componentModel.factory,
        burden = componentModel.burden;
    key = componentModel.invariant ? mirukenCore.$eq(key) : key;
    return mirukenCallback.$provide(container, key, function handler(resolution, composer) {
        if (!(resolution instanceof DependencyResolution)) {
            resolution = new DependencyResolution(resolution.key);
        }
        if (!resolution.claim(handler, type)) {
            return mirukenCallback.$unhandled;
        }
        policies = policies.concat(InitializationPolicy);
        return lifestyle.resolve(function (configure) {
            var instant = mirukenCore.$instant.test(resolution.key),
                dependencies = _resolveBurden(burden, instant, resolution, composer);
            return mirukenCore.$isPromise(dependencies) ? dependencies.then(createComponent) : createComponent(dependencies);
            function createComponent(dependencies) {
                var component = factory.call(composer, dependencies);
                if (mirukenCore.$isFunction(configure)) {
                    component = configure(component, dependencies) || component;
                }
                return applyPolicies(0);
                function applyPolicies(index) {
                    var _loop = function _loop(i) {
                        var policy$$1 = policies[i];
                        if (mirukenCore.$isFunction(policy$$1.componentCreated)) {
                            var result = policy$$1.componentCreated(component, componentModel, dependencies, composer);
                            if (mirukenCore.$isPromise(result)) {
                                return {
                                    v: result.then(function () {
                                        return applyPolicies(i + 1);
                                    })
                                };
                            }
                        }
                    };

                    for (var i = index; i < policies.length; ++i) {
                        var _ret4 = _loop(i);

                        if ((typeof _ret4 === "undefined" ? "undefined" : _typeof$1(_ret4)) === "object") return _ret4.v;
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
        if (mirukenCore.$isNothing(group)) {
            return "continue";
        }
        var resolved = group.slice();

        var _loop3 = function _loop3(index) {
            var dep = resolved[index];
            if (dep === undefined) {
                return "continue";
            }
            var use = dep.test(DependencyModifier.Use),
                lazy = dep.test(DependencyModifier.Lazy),
                promise = dep.test(DependencyModifier.Promise),
                child = dep.test(DependencyModifier.Child),
                dynamic = dep.test(DependencyModifier.Dynamic);
            var dependency = dep.dependency;
            if (use || dynamic || mirukenCore.$isNothing(dependency)) {
                if (dynamic && mirukenCore.$isFunction(dependency)) {
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
                        dependency = mirukenCore.$eq(dependency);
                    }
                    if (instant) {
                        dependency = mirukenCore.$instant(dependency);
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
                        if (!promise && mirukenCore.$isPromise(dependency)) {
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
            var _ret6 = _loop3(index);

            if (_ret6 === "continue") continue;
        }
        dependencies[key] = resolved;
    };

    for (var key in burden) {
        var _ret5 = _loop2(key);

        if (_ret5 === "continue") continue;
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
            var error = new DependencyResolutionError(dependency);
            if (mirukenCore.$instant.test(dependency.key)) {
                throw error;
            }
            return Promise.reject(error);
        }
        return result;
    }
    if (child && !all) {
        result = mirukenCore.$isPromise(result) ? result.then(_createChild) : _createChild(result);
    }
    return promise ? Promise.resolve(result) : result;
}

function _createChild(parent) {
    if (!(parent && mirukenCore.$isFunction(parent.newChild))) {
        throw new Error("Child dependency requested, but " + parent + " is not a parent.");
    }
    return parent.newChild();
}

exports.ComponentModel = ComponentModel;
exports.ComponentBuilder = ComponentBuilder;
exports.InterceptorBuilder = InterceptorBuilder;
exports.$component = $component;
exports.ComponentModelError = ComponentModelError;
exports.Registration = Registration;
exports.Container = Container;
exports.$$composer = $$composer;
exports.$container = $container;
exports.DependencyModifier = DependencyModifier;
exports.DependencyModel = DependencyModel;
exports.DependencyManager = DependencyManager;
exports.DependencyResolution = DependencyResolution;
exports.DependencyResolutionError = DependencyResolutionError;
exports.Installer = Installer;
exports.FromBuilder = FromBuilder;
exports.FromPackageBuilder = FromPackageBuilder;
exports.BasedOnBuilder = BasedOnBuilder;
exports.KeyBuilder = KeyBuilder;
exports.$classes = $classes;
exports.ConstructorPolicy = ConstructorPolicy;
exports.PropertyInjectionPolicy = PropertyInjectionPolicy;
exports.ComponentModelAware = ComponentModelAware;
exports.ComponentModelAwarePolicy = ComponentModelAwarePolicy;
exports.PolicyMetadataPolicy = PolicyMetadataPolicy;
exports.IoContainer = IoContainer;
exports.Lifestyle = Lifestyle;
exports.TransientLifestyle = TransientLifestyle;
exports.SingletonLifestyle = SingletonLifestyle;
exports.ContextualLifestyle = ContextualLifestyle;
exports.ComponentPolicy = ComponentPolicy;
exports.policy = policy;
