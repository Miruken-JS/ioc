import {
    Protocol, StrictProtocol, Invoking, Disposing
} from 'miruken-core';

/**
 * Protocol for registering components in a {{#crossLink "miruken.ioc.Container"}}{{/crossLink}}.
 * @class Registration
 * @extends miruken.Protocol
 */                
export const Registration = Protocol.extend({
    /**
     * Encapsulates the regisration of components in a container.
     * @method register
     * @param  {miruken.ioc.Container}            container  -  container
     * @param  {miruken.callback.CallbackHandler} composer   -  composition handler
     * @return {Function} function to unregister components.
     */
    register(container, composer) {}
});

/**
 * Protocol for exposing container capabilities.
 * @class Container
 * @extends miruken.StrictProtocol
 * @uses miruken.Invoking
 * @uses miruken.Disposing
 */            
export const Container = StrictProtocol.extend(Invoking, Disposing, {
    /**
     * Registers components in the container.
     * @method register
     * @param   {Arguments}  [...registrations]  -  registrations
     * @return {Function} function to unregister components.
     */
    register(registrations) {},
    /**
     * Adds a configured component to the container.
     * @method addComponent
     * @param   {miruken.ioc.ComponentModel} componentModel  -  component model
     * @param   {Array}                      [...policies]   -  component policies
     * @return  {Function} function to remove component.
     */
    addComponent(componentModel, policies) {},
    /**
     * Adds container-wide policies for all components.
     * @method addPolicies
     * @param   {Array}  [...policies]  -  container-wide policies
     */        
    addPolicies(policies) {},
    /**
     * Resolves the first component satisfying the key.
     * @method resolve
     * @param   {Any}  key  -  key used to identify the component
     * @returns {Object | Promise} first component satisfying the key.
     * @async
     */
    resolve(key) {},
    /**
     * Resolves all the components satisfying the key.
     * @method resolveAll
     * @param   {Any}  key  -  key used to identify the component
     * @returns {Array | Promise} all components satisfying the key.
     * @async
     */
    resolveAll(key) {}
});
