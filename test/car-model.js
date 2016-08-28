import {
    Base, Protocol, Resolving, Disposing,
    Interceptor, inject, $isString,
    $optional, $every, nothing as _
} from 'miruken-core';

export const Engine = Resolving.extend({
    get numberOfCylinders() {},
    get horsepower() {},
    get displacement() {},
    get rpm() {},
    rev(rpm) {}
});

export const Car = Protocol.extend({
    get make() {},
    get model() {},
    get engine () {}
});

export const Diagnostics = Protocol.extend({
    get mpg() {}
});

export const Junkyard = Protocol.extend({
    decomission(part) {}
});

export const V12 = Base.extend(Engine, {
    @inject(_,_,$optional(Diagnostics))
    constructor(horsepower, displacement, diagnostics) {
        let _rpm;
        this.extend({
            get horsepower() { return horsepower; },
            get displacement() { return displacement; },
            get diagnostics() { return diagnostics; },
            get rpm() { return _rpm; },
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
    get numberOfCylinders() { return 12; }
});

export const RebuiltV12 = V12.extend(Engine, Disposing, {
    @inject(_,_,_,Junkyard)
    constructor(horsepower, displacement, diagnostics, junkyard) {
        this.base(horsepower, displacement, diagnostics, junkyard);
        this.extend({
            dispose() {
                junkyard.decomission(this);
            }
        });
    }
});

export const Supercharger = Base.extend(Engine, {
    @inject(Engine)
    constructor(engine, boost) {
        this.extend({
            get horsepower() {
                return engine.horsepower * (1.0 + boost); 
            },
            get displacement() {
                return engine.displacement; 
            }
        });
    }
});

export const Ferrari = Base.extend(Car, {
    @inject(_,Engine)
    constructor(model, engine) {
        this.extend({
            get make() { return "Ferrari"; },
            get model() { return model; },
            get engine() { return engine; }
        });
    }
});

export const Bugatti = Base.extend(Car, {
    @inject(_,Engine)
    constructor(model, engine) {
        this.extend({
            get make() { return "Bugatti"; },
            get model() { return model; },
            get engine() { return engine; }
        });
    }
});

export const Auction = Base.extend({
    @inject($every(Car))
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
            get cars() { return inventory; }
        });
    }
});

export const OBDII = Base.extend(Diagnostics, {
    constructor() {
        this.extend({
            get mpg() { return 22.0; }
        });
    }
});

export const CraigsJunk = Base.extend(Junkyard, {
    constructor() {
        let _parts = [];
        this.extend({
            get parts() { return _parts.slice(0); },
            decomission(part) { _parts.push(part); }
        });
    }
});

export const LogInterceptor = Interceptor.extend({
    intercept (invocation) {
        console.log(
            `${invocation.methodType.name} ${invocation.method} (${invocation.args.join(", ")})`
        );
        const result = invocation.proceed();
        console.log(`     Return ${result}`);
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
