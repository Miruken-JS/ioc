import {
    Protocol, Metadata, $isFunction,
    $flatten, isDescriptor
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
     * @param  {Object}         component       -  component instance
     * @param  {ComponentModel} componentModel  -  component model
     * @param  {Object}         dependencies    -  resolved dependencies
     * @param  {Handler}        composer        -  composition handler
     */        
    componentCreated(component, componentModel, dependencies, composer) {}
});

/**
 * Attaches one or more policies to a component.
 * @method policy
 * @param  {Array}  ...policies  -  component policies
 */  
export const policy = Metadata.decorator(policyMetadataKey,
    (target, key, descriptor, policies) => {
        if (isDescriptor(descriptor)) {
            throw new SyntaxError("@policy can only be applied to a class");
        }    
        policies = $flatten(key, true);
        if (policies.length > 0) {
            Metadata.getOrCreateOwn(policyMetadataKey, target, () => [])
                .push(...policies.map(_createOrUsePolicy));
        };
    });

function _createOrUsePolicy(policy) {
    return $isFunction(policy) ? new policy() : policy;
}
