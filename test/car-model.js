import {
    Base, Protocol, Resolving, Disposing,
    Interceptor, $isString, $inferProperties,
    $optional, $every
} from 'miruken-core';

export const Engine = Resolving.extend(
    $inferProperties, {
        getNumberOfCylinders() {},
        getHorsepower() {},
        getDisplacement() {},
        getRpm() {},
        rev(rpm) {}
    });

export const Car = Protocol.extend(
    $inferProperties, {
        getMake() {},
        getModel() {},
        getEngine () {}
    });

export const Diagnostics = Protocol.extend(
    $inferProperties, {
        getMPG() {}
    });

export const Junkyard = Protocol.extend(
    $inferProperties, {
        decomission(part) {}
    });

export const V12 = Base.extend(Engine, $inferProperties, {
    $inject: [,,$optional(Diagnostics)],
    constructor(horsepower, displacement, diagnostics) {
        let _rpm;
        this.extend({
            getHorsepower() { return horsepower; },
            getDisplacement() { return displacement; },
            getDiagnostics() { return diagnostics; },
            getRpm() { return _rpm; },
            rev(rpm) {
                if (rpm <= 8000) {
                    _rpm = rpm;
                    return true;
                }
                return false;
            }
        });
    },
    initialize() {
        Object.defineProperty(this, "calibrated", { value: true });
    },
    getNumberOfCylinders() { return 12; }
});

export const RebuiltV12 = V12.extend(Engine, Disposing, $inferProperties, {
    $inject: [,,,Junkyard],
    constructor: function (horsepower, displacement, diagnostics, junkyard) {
        this.base(horsepower, displacement, diagnostics, junkyard);
        this.extend({
            dispose() {
                junkyard.decomission(this);
            }
        });
    }
});

export const Supercharger = Base.extend(Engine, $inferProperties, {
    $inject: [Engine],
    constructor(engine, boost) {
        this.extend({
            getHorsepower() {
                return engine.getHorsepower() * (1.0 + boost); 
            },
            getDisplacement() {
                return engine.getDisplacement(); 
            }
        });
    }
});

export const Ferrari = Base.extend(Car, $inferProperties, {
    $inject: [,Engine],
    constructor(model, engine) {
        this.extend({
            getMake() { return "Ferrari"; },
            getModel() { return model; },
            getEngine() { return engine; }
        });
    }
});

export const Bugatti = Base.extend(Car, $inferProperties, {
    $inject: [,Engine],
    constructor(model, engine) {
        this.extend({
            getMake() { return "Bugatti"; },
            getModel() { return model; },
            getEngine() { return engine; }
        });
    }
});

export const Auction = Base.extend($inferProperties, {
    $inject: [$every(Car)],
    constructor(cars) {
        let inventory = {};
        cars.forEach(car => {
            const make   = car.make;
            let   models = inventory[make];
            if (!models) {
                inventory[make] = models = [];
            }
            models.push(car);
        });
        this.extend({
            getCars() { return inventory; }
        });
    }
});

export const OBDII = Base.extend(Diagnostics, $inferProperties, {
    constructor() {
        this.extend({
            getMPG() { return 22.0; }
        });
    }
});

export const CraigsJunk = Base.extend(Junkyard, $inferProperties, {
    constructor() {
        let _parts = [];
        this.extend({
            getParts() { return _parts.slice(0); },
            decomission(part) { _parts.push(part); }
        });
    }
});

export const LogInterceptor = Interceptor.extend({
    intercept(invocation) {
        console.log(`Called ${invocation.method} with (${invocation.args.join(", ")}) from ${invocation.source.name}`);
        const result = invocation.proceed();
        console.log(`    And returned ${result}`);
        return result;
    }
});

export const ToUpperInterceptor = Interceptor.extend({
    intercept(invocation) {
        const args = invocation.args;
        for (let i = 0; i < args.length; ++i) {
            if ($isString(args[i])) {
                args[i] = args[i].toUpperCase();
            }
        }
        let result = invocation.proceed();
        if ($isString(result)) {
            result = result.toUpperCase();
        }
        return result;
    }
});

export const ToLowerInterceptor = Interceptor.extend({
    intercept(invocation) {
        const args = invocation.args;
        for (let i = 0; i < args.length; ++i) {
            if ($isString(args[i])) {
                args[i] = args[i].toUpperCase();
            }
        }
        let result = invocation.proceed();
        if ($isString(result)) {
            result = result.toLowerCase();
        }
        return result;
    }
});
