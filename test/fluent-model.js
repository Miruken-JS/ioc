import { Base, Protocol } from 'miruken-core';
import { Installer, $classes } from '../src/fluent';

export const Controller = Base.extend();

export const Credentials = Base.extend({
    constructor(user, password) {
        this.extend({
            get user() { return user; },
            get password() { return password; }
        });
    }
});

export const Service = Protocol.extend();

export const Authentication = Protocol.extend(Service, {
    authenticate(credentials) {}
});

export const LoginController = Controller.extend({
    $inject: [Authentication],
    constructor(authenticator) {
        this.extend({
            login(credentials) {
                return authenticator.authenticate(credentials);
            }
        });
    }
});

export const SomeService = Base.extend(Service);

export const InMemoryAuthenticator = Base.extend(Authentication, {
    authenticate(credentials) {
        return false;
    }
});

export const PackageInstaller = Installer.extend({
    register(container, composer) {
        const pkg = module.exports || exports;
        if (pkg) {        
            container.register(
                $classes.fromPackage(pkg).basedOn(Service)
                        .withKeys.mostSpecificService()
            );
        }
    }
});
