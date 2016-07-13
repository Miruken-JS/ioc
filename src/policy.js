import { Protocol } from 'miruken-core';

/**
 * Protocol for defining policies for components.
 * @class ComponentPolicy
 * @extends miruken.Protocol
 */                
export const ComponentPolicy = Protocol.extend({
    /**
     * Applies the policy to the component model.
     * @method applyPolicy
     * @param  {miruken.ioc.ComponentModel} componentModel  -  component model
     * @param  {Array}                      [...policies]   -  all known policies
     */
    applyPolicy(componentModel, policies) {},
    /**
     * Notifies the creation of a component.
     * @method componentCreated
     * @param  {Object} component                           -  component instance
     * @param  {Object} dependencies                        -  resolved dependencies
     * @param  {miruken.callback.CallbackHandler} composer  -  composition handler
     */        
    componentCreated(component, dependencies, composer) {}
});
