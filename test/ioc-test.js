import {
    Base, Facet, Modifier, inject, design,
    Disposing, $isPromise, $using, $decorated,
    $promise, $optional, $eq, $use, $lazy,
    $instant, $eval, $child
} from "miruken-core";

import { $provide } from "miruken-callback";
import { Context, contextual } from "miruken-context";

import {
    Validator, ValidationHandler
} from "miruken-validate";

import {
    DependencyModel, DependencyModifier,
    DependencyResolutionError,
    $$composer, $container
} from "../src/dependency";

import { ComponentPolicy, policy } from "../src/policy";
import {
    ComponentModel, ComponentModelError, $component
} from "../src/component";

import { TransientLifestyle } from "../src/lifestyle";
import { Container } from "../src/container";
import {
    IoContainer, PropertyInjectionPolicy,
    ComponentModelAware,  ComponentModelAwarePolicy
} from "../src/ioc";

import { expect } from "chai";

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
        context.addHandlers(new IoContainer(), new ValidationHandler());
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

        it("should augment component dependences", done => {
            container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                               $component(car.V12));
            Promise.resolve(container.resolve(car.Car)).then(c => {
                expect(c).to.be.instanceOf(car.Ferrari);
                expect(c.engine).to.be.instanceOf(car.V12);                
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
        context.addHandlers(new IoContainer(), new ValidationHandler());
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
        context.addHandlers(new IoContainer(), new ValidationHandler());
        
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
        context.addHandlers(new IoContainer(), new ValidationHandler());
        
        it("should resolve different instance for TransientLifestyle", done => {
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
    const Controller = Base.extend(contextual, Disposing, {
        @inject($optional(Context))
        constructor(context) {
            this.context = context;
        },
        initialize() {
            Object.defineProperty(this, "initialized", { value: !!this.context });
        },
        dispose() {
            this.disposed = true;
        }
    });
    
    describe("#resolve", () => {
        it("should resolve different instance per context for ContextualLifestyle", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
            container.register($component(Controller));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context).to.equal(context);
                done();
            });
        });

        it("should set context after resolved", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
            container.register($component(Controller).contextual().dependsOn([]));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context).to.equal(context);
                done();
            });
        });

        it("should fulfill child Context dependency", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
            container.register($component(Controller).dependsOn($child(Context)));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.context.parent).to.equal(context);
                done();
            });
        });

        it("should resolve nothing if context not available", done => {
            const container = (new ValidationHandler()).next(new IoContainer);
            Container(container).register($component(car.V12).contextual());
            Promise.resolve(Container(container).resolve(car.Engine)).then(engine => {
                expect(engine).to.be.undefined;
                done();
            });
        });

        it("should reject Context dependency if context not available", done => {
            const container = (new ValidationHandler()).next(new IoContainer());
            Container(container).register($component(Controller).dependsOn(Context));
            Promise.resolve(Container(container).resolve(Controller)).catch(error => {
                expect(error).to.be.instanceof(DependencyResolutionError);
                expect(error.dependency.key).to.equal(Context);
                done();
            });
        });

        it("should not fail if optional child Context and no context available", done => {
            const container = (new ValidationHandler()).next(new IoContainer());
            Container(container).register($component(Controller).dependsOn($optional($child(Context))));
            Promise.resolve(Container(container).resolve(Controller)).then(controller => {
                done();
            });
        });

        it("should reject changing component Context", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
            container.register($component(Controller).contextual());
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(() => {
                    controller.context = context.newChild();
                }).to.throw(Error, "Container managed instances cannot change context");
                done();
            });
        });

        it("should dispose component when Context cleared", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
            container.register($component(Controller).contextual());
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.disposed).to.not.be.true;
                controller.context = null;
                expect(controller.disposed).to.be.true;
                controller.context = context.newChild();
                done();
            });
        });        
    });

    describe("#dispose", () => {
        it("should dispose unregistered components", done => {
            const context   = new Context(),
                  container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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

        it("should apply policies from metadata", done => {
            const Component = Base.extend(policy(Policy1, Policy2));
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            container.register($component(car.Ferrari).dependsOn([, $optional(car.Engine)]));
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
                expect($decorated(registry.composer, true)).to.equal(context);
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
            context.addHandlers(container, new ValidationHandler());
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

        it("should set ComponentModel explicitly", done => {
            container.register($component(car.V12)
                               .policies(ComponentModelAwarePolicy.Explicit));
            Promise.resolve(container.resolve(car.Engine)).then(engine => {
                expect(engine.componentModel).to.be.defined;
                expect(engine.componentModel.implementation).to.equal(car.V12);
                done();
            });            
        });

        it("should set ComponentModel implicitly", done => {
            var Controller = Base.extend(ComponentModelAware);
            container.register($component(Controller));
            Promise.resolve(container.resolve(Controller)).then(controller => {
                expect(controller.componentModel).to.be.defined;
                expect(controller.componentModel.implementation).to.equal(Controller);
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
            }).to.throw(Error, /rev could not be handled/);
        });

        it("should use design metadata to infer dependencies", done => {
            const DetailShop = Base.extend({
                @design(car.Car, car.Engine)
                @inject(undefined, car.RebuiltV12) 
                constructor(car, engine) {
                    this.car    = car;
                    this.engine = engine;
                }
            });
            container.register($component(car.Ferrari), $component(car.V12),
                               $component(car.RebuiltV12), $component(car.CraigsJunk),
                               $component(DetailShop));
            Promise.resolve(container.resolve(DetailShop)).then(shop => {
                expect(shop.car).to.be.instanceOf(car.Ferrari);
                expect(shop.engine).to.be.instanceOf(car.RebuiltV12);
                done();
            });
        });

        it("should map [] design metadata to $every", done => {
            const CarWash = Base.extend({
                @design([car.Car])
                constructor(cars) {
                    this.cars = cars;
                }
            });
            container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                               $component(car.Bugatti).dependsOn($use("Veyron")),
                               $component(car.V12), $component(CarWash));
            Promise.resolve(container.resolve(CarWash)).then(carWash => {
                expect(carWash.cars.length).to.equal(2);
                expect(carWash.cars.map(c => c.model)).to.have.members(["LaFerrari", "Veyron"]);
                done();
            });
        });
 
        describe("PropertyInjectionPolicy", () => {
            const CarParts = Base.extend(policy(PropertyInjectionPolicy), {
                      @inject($optional(car.Auction))
                      constructor(auction) {
                          this.auction = auction;
                      },
                      initialize() {
                          this.initialized = !!this.engine;
                      },
                
                      @inject(car.Engine)
                      engine: undefined,

                      @design(car.Car)
                      get car() { return this._car; },
                      set car(value) { this._car = value; }
                  }),
                  Garage = Base.extend(
                      policy(PropertyInjectionPolicy({explicit: true})), {
                      @inject(car.Supercharger)
                      supercharger: undefined,
                          
                      @design(car.Junkyard)
                      junkyard: undefined
                  });

            it("should ignore unsatisfied optional property dependencies", done => {
                container.register($component(CarParts), $component(car.Auction));
                Promise.resolve(container.resolve(CarParts)).then(carParts => {
                    expect(carParts.engine).to.be.undefined;
                    expect(carParts.car).to.be.undefined;                    
                    done();
                });
            });
            
            it("should satisfy optional property dependencies using @inject", done => {
                container.register($component(car.V12), $component(CarParts));
                Promise.resolve(container.resolve(CarParts)).then(carParts => {
                    expect(carParts.engine).to.be.instanceOf(car.V12);
                    done();
                });
            });

            it("should satisfy optional property dependencies using @design", done => {
                container.register($component(car.Ferrari).dependsOn($use("LaFerrari")),
                                   $component(car.V12), $component(CarParts));
                Promise.resolve(container.resolve(CarParts)).then(carParts => {
                    expect(carParts.engine).to.be.instanceOf(car.V12);
                    expect(carParts.car).to.be.instanceOf(car.Ferrari);
                    expect(carParts.engine).to.equal(carParts.car.engine);
                    done();
                });
            });

            it("should ignore implicit optional property dependencies", done => {
                container.register($component(car.V12), $component(car.CraigsJunk),
                                   $component(car.Supercharger).dependsOn([,$use(.5)]),
                                   $component(Garage));
                Promise.resolve(container.resolve(Garage)).then(garage => {
                    expect(garage.supercharger).to.be.instanceOf(car.Supercharger);
                    expect(garage.junkyard).to.be.undefined;
                    done();
                });                      
            });

            it("should call initialize after all properties injected", done => {
                container.register($component(car.V12), $component(CarParts));
                Promise.resolve(container.resolve(CarParts)).then(carParts => {
                    expect(carParts.initialized).to.be.true;
                    done();
                });
            });            
        });
    });

    describe("#resolveAll", () => {
        let context, container;
        beforeEach(() => {
            context   = new Context();
            container = Container(context);
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
            context.addHandlers(new IoContainer(), new ValidationHandler());
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
