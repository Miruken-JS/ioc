import {
    Protocol, Metadata, $flatten
} from "miruken-core";

const policyMetadataKey = Symbol();

/**
 * Protocol for defining policies for components.
 * @class ComponentPolicy
 * @extends Protocol
 */                
export const ComponentPolicy = Protocol.extend({
    /**
     * Applies the policy to the component model.
     * @method applyPolicy
     * @param  {ComponentModel} componentModel  -  component model
     * @param  {Array}          [...policies]   -  all known policies
     */
    applyPolicy(componentModel, policies) {},
    /**
     * Notifies the creation of a component.
     * @method componentCreated
     * @param  {Object} component          -  component instance
     * @param  {Object} dependencies       -  resolved dependencies
     * @param  {CallbackHandler} composer  -  composition handler
     */        
    componentCreated(component, dependencies, composer) {}
});

/**
 * Attaches one or more policies to a component.
 * @method policy
 * @param  {Array}  ...policies  -  component policies
 */  
export const policy = Metadata.decorator(policyMetadataKey,
    (target, key, descriptor, policies) => {
        policies = $flatten(policies, true);
        return target => {
            if (policies.length > 0) {
                Metadata.getOrCreateOwn(policyMetadataKey, target, () => [])
                    .push(...policies);
            }
        };
    });     
