import { $eq } from "miruken-core";
import { Context } from "miruken-context";
import { $component } from "../src/component";
import { $classes } from "../src/fluent";
import { Container } from "../src/container";
import { IoContainer } from "../src/ioc";

import { ValidationCallbackHandler } from "miruken-validate";

import * as lib from "./fluent-model";

import { expect } from "chai";

describe("$classes", () => {
    let context, container;
    beforeEach(() => {
        context   = new Context();
        container = Container(context);
        context.addHandlers(new IoContainer(), new ValidationCallbackHandler());
    });

    describe("#fromPackage", () => {
        it("should select classes from package", done => {
            container.register(
                $component(lib.Authentication).boundTo(lib.InMemoryAuthenticator),
                $classes.fromPackage(lib).basedOn(lib.Controller)
            );
            Promise.resolve(container.resolve(lib.LoginController)).then(loginController => {
                expect(loginController).to.be.instanceOf(lib.LoginController);
                done();
            });
        });

        it("should select classes from package using shortcut", done => {
            container.register(
                $component(lib.Authentication).boundTo(lib.InMemoryAuthenticator),
                $classes(lib).basedOn(lib.Controller)
            );
            Promise.resolve(container.resolve(lib.LoginController)).then(loginController => {
                expect(loginController).to.be.instanceOf(lib.LoginController);
                done();
            });
        });

        it("should register installers if no based on criteria", done => {
            container.register($classes.fromPackage(lib));
            Promise.all([container.resolve($eq(lib.Service)),
                         container.resolve($eq(lib.Authentication)),
                         container.resolve($eq(lib.InMemoryAuthenticator))])
                .then(([service, authenticator, nothing]) => {
                    expect(service).to.be.instanceOf(lib.SomeService);
                    expect(authenticator).to.be.instanceOf(lib.InMemoryAuthenticator);
                    expect(nothing).to.be.undefined;
                    done();
                });
        });
    });

    describe("#withKeys", () => {
        describe("#self", () => {
            it("should select class as key", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Authentication)
                                           .withKeys.self()
                );
                Promise.all([container.resolve($eq(lib.InMemoryAuthenticator)),
                             container.resolve($eq(lib.Authentication))])
                    .then(([authenticator, nothing]) => {
                        expect(authenticator).to.be.instanceOf(lib.InMemoryAuthenticator);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });
        });

        describe("#basedOn", () => {
            it("should select basedOn as keys", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Authentication)
                                           .withKeys.basedOn()
                );
                Promise.all([container.resolve($eq(lib.Authentication)),
                             container.resolve($eq(lib.InMemoryAuthenticator))])
                   .then(([authenticator, nothing]) => {
                        expect(authenticator).to.be.instanceOf(lib.InMemoryAuthenticator);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });
        });

        describe("#anyService", () => {
            it("should select any service as key", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Service)
                                           .withKeys.anyService()
                );
                Promise.all([container.resolve($eq(lib.Service)),
                             container.resolve($eq(lib.SomeService))])
                    .then(([service, nothing]) => {
                        expect(service).to.be.instanceOf(lib.SomeService);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });
        });

        describe("#allServices", () => {
            it("should select all services as keys", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Authentication)
                                           .withKeys.allServices()
                );
                Promise.all([container.resolve($eq(lib.Service)),
                             container.resolve($eq(lib.Authentication)),
                             container.resolve($eq(lib.InMemoryAuthenticator))])
                   .then(([authenticator1, authenticator2, nothing]) => {
                        expect(authenticator1).to.be.instanceOf(lib.InMemoryAuthenticator);
                        expect(authenticator2).to.equal(authenticator1);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });
        });

        describe("#mostSpecificService", () => {
            it("should select most specific service as key", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Service)
                                           .withKeys.mostSpecificService(lib.Service)
                );
                Promise.all([container.resolve($eq(lib.Service)),
                             container.resolve($eq(lib.Authentication)),
                             container.resolve($eq(lib.InMemoryAuthenticator))])
                    .then(([service, authenticator, nothing]) => {
                        expect(service).to.be.instanceOf(lib.SomeService);
                        expect(authenticator).to.be.instanceOf(lib.InMemoryAuthenticator);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });

            it("should select most specific service form basedOn as key", done => {
                container.register($classes.fromPackage(lib)
                                           .basedOn(lib.Service)
                                           .withKeys.mostSpecificService()
                );
                Promise.all([container.resolve($eq(lib.Service)),
                             container.resolve($eq(lib.Authentication)),
                             container.resolve($eq(lib.InMemoryAuthenticator))])
                   .then(([service, authenticator, nothing]) => {
                       expect(service).to.be.instanceOf(lib.SomeService);
                       expect(authenticator).to.be.instanceOf(lib.InMemoryAuthenticator);
                       expect(nothing).to.be.undefined;
                       done();
                });
            });

            it("should select basedOn as key if no services match", done => {
                container.register($component(lib.Authentication)
                                       .boundTo(lib.InMemoryAuthenticator),
                                   $classes.fromPackage(lib).basedOn(lib.Controller)
                                       .withKeys.mostSpecificService()
                );
                Promise.all([container.resolve($eq(lib.Controller)),
                             container.resolve($eq(lib.LoginController))])
                    .then(([controller, nothing]) => {
                        expect(controller).to.be.instanceOf(lib.LoginController);
                        expect(nothing).to.be.undefined;
                        done();
                });
            });
        });

        describe("#name", () => {
            it("should specify name as key", done => {
                container.register($component(lib.Authentication)
                                   	   .boundTo(lib.InMemoryAuthenticator),
                                   $classes.fromPackage(lib).basedOn(lib.Controller)
                                       .withKeys.name("Login")
                );
                Promise.resolve(container.resolve("Login")).then(controller => {
                    expect(controller).to.be.instanceOf(lib.LoginController);
                    done();
                });
            });

            it("should infer name as key", done => {
                container.register($component(lib.Authentication)
                                   	   .boundTo(lib.InMemoryAuthenticator),
                                   $classes.fromPackage(lib).basedOn(lib.Controller)
                                       .withKeys.name()
                );
                Promise.resolve(container.resolve("LoginController")).then(controller => {
                    expect(controller).to.be.instanceOf(lib.LoginController);
                    done();
                });
            });

            it("should evaluate name as key", done => {
                container.register($component(lib.Authentication)
                                       .boundTo(lib.InMemoryAuthenticator),
                                   $classes.fromPackage(lib)
                                       .basedOn(lib.Controller)
                                       .withKeys.name(name => name.replace("Controller", ""))
                );
                Promise.resolve(container.resolve("Login")).then(controller => {
                    expect(controller).to.be.instanceOf(lib.LoginController);
                    done();
                });
            });
        });
    });

    describe("#configure", () => {
        it("should customize component configuration", done => {
            container.register($classes.fromPackage(lib).basedOn(lib.Service)
                                       .withKeys.mostSpecificService()
                                       .configure(component => component.transient())
            );
            Promise.all([container.resolve($eq(lib.Authentication)),
                         container.resolve($eq(lib.Authentication))])
                .then(([authenticator1, authenticator2]) => {
                    expect(authenticator1).to.be.instanceOf(lib.InMemoryAuthenticator);
                    expect(authenticator2).to.not.equal(authenticator1);
                    done();
                });
            });
        });
});
