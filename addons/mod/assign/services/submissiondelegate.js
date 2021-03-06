// (C) Copyright 2015 Martin Dougiamas
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

angular.module('mm.addons.mod_assign')

/**
 * Delegate to register assign submission handlers.
 *
 * @module mm.addons.mod_assign
 * @ngdoc service
 * @name $mmaModAssignSubmissionDelegate
 * @description
 *
 * Delegate to register assign submission handlers.
 * You can use this service to register your own submission handlers to be used in an assign.
 *
 * To register a handler:
 *
 * $mmaModAssignSubmissionDelegate.registerHandler('mmaYourAddon', 'pluginType', 'handlerName');
 *
 * Please take into account that this delegate belongs to an addon so it might not be available in custom apps.
 * We recommend using $mmAddonManager to inject this delegate to avoid errors.
 *
 * Example:
 *
 * .run(function($mmAddonManager) {
 *     var $mmaModAssignSubmissionDelegate = $mmAddonManager.get('$mmaModAssignSubmissionDelegate');
 *     if ($mmaModAssignSubmissionDelegate) {
 *         $mmaModAssignSubmissionDelegate.registerHandler('mmaModAssignSubmissionFile', 'file',
                                '$mmaModAssignSubmissionFileHandler');
 *      }
 * });
 *
 * @see $mmaModAssignSubmissionDelegate#registerHandler to see the methods your handle needs to implement.
 */
.factory('$mmaModAssignSubmissionDelegate', function($log, $mmSite, $mmUtil, $q) {
    $log = $log.getInstance('$mmaModAssignSubmissionDelegate');

    var handlers = {},
        enabledHandlers = {},
        self = {},
        updatePromises = {},
        lastUpdateHandlersStart;

    /**
     * Clear some temporary data because a submission was cancelled.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#clearTmpData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to clear the data for.
     * @param  {Object} plugin     Plugin to clear the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Void}
     */
    self.clearTmpData = function(assign, submission, plugin, inputData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.clearTmpData) {
            handler.clearTmpData(assign, submission, plugin, inputData);
        }
    };

    /**
     * Copy the data from last submitted attempt to the current submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#copyPluginSubmissionData
     * @param  {Object} assign     Assignment.
     * @param  {Object} plugin     Plugin data of the previous submission (the one to get the data from).
     * @param  {Object} pluginData Object where to add the plugin data.
     * @return {Promise}           Promise resolved when data has been gathered.
     */
    self.copyPluginSubmissionData = function(assign, plugin, pluginData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.copySubmissionData) {
            return $q.when(handler.copySubmissionData(assign, plugin, pluginData));
        }
        return $q.when();
    };

    /**
     * Get the directive to use for a certain submission plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#getDirectiveForPlugin
     * @param  {Object} plugin Plugin to get the directive for.
     * @param  {Boolean} edit  True if editing a submission, false if read only.
     * @return {String}        Directive name. Undefined if no directive found.
     */
    self.getDirectiveForPlugin = function(plugin, edit) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getDirectiveName) {
            return handler.getDirectiveName(plugin, edit);
        }
    };

    /**
     * Get the handler for a certain submission plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#getPluginHandler
     * @param  {String} pluginType Type of the plugin.
     * @return {Object}            Handler. Undefined if no handler found for the plugin.
     */
    self.getPluginHandler = function(pluginType) {
        if (typeof enabledHandlers[pluginType] != 'undefined') {
            return enabledHandlers[pluginType];
        }
    };

    /**
     * Check if the submission data has changed for a certain plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#hasPluginDataChanged
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with true if data has changed, resolved with false otherwise.
     */
    self.hasPluginDataChanged = function(assign, submission, plugin, inputData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.hasDataChanged) {
            return $q.when(handler.hasDataChanged(assign, submission, plugin, inputData));
        }
        return $q.when(false);
    };

    /**
     * Get the size of data (in bytes) this plugin will send to copy a previous attempt.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#getPluginSizeForCopy
     * @param  {Object} assign Assignment.
     * @param  {Object} plugin Plugin data of the previous submission (the one to get the data from).
     * @return {Promise}       Promise resolved with the size.
     */
    self.getPluginSizeForCopy = function(assign, plugin) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getSizeForCopy) {
            return $q.when(handler.getSizeForCopy(assign, plugin));
        }
        return $q.when(0);
    };

    /**
     * Get the size of data (in bytes) this plugin will send to add or edit a submission.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#getPluginSizeForEdit
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @return {Promise}           Promise resolved with the size.
     */
    self.getPluginSizeForEdit = function(assign, submission, plugin, inputData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.getSizeForEdit) {
            return $q.when(handler.getSizeForEdit(assign, submission, plugin, inputData));
        }
        return $q.when(0);
    };

    /**
     * Check if a time belongs to the last update handlers call.
     * This is to handle the cases where updateHandlers don't finish in the same order as they're called.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#isLastUpdateCall
     * @param  {Number}  time Time to check.
     * @return {Boolean}      True if equal, false otherwise.
     */
    self.isLastUpdateCall = function(time) {
        if (!lastUpdateHandlersStart) {
            return true;
        }
        return time == lastUpdateHandlersStart;
    };

    /**
     * Check if a submission plugin is supported.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#isPluginSupported
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupported = function(pluginType) {
        return typeof enabledHandlers[pluginType] != 'undefined';
    };

    /**
     * Check if a submission plugin is supported for edit.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#isPluginSupportedForEdit
     * @param  {String} pluginType Type of the plugin.
     * @return {Boolean}           True if supported, false otherwise.
     */
    self.isPluginSupportedForEdit = function(pluginType) {
        var handler = self.getPluginHandler(pluginType);
        if (handler && handler.isEnabledForEdit) {
            return handler.isEnabledForEdit();
        }
        return false;
    };

    /**
     * Prepare and return the data to submit for a certain submission plugin.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#preparePluginSubmissionData
     * @param  {Object} assign     Assignment.
     * @param  {Object} submission Submission to check data.
     * @param  {Object} plugin     Plugin to get the data for.
     * @param  {Object} inputData  Data entered in the submission form.
     * @param  {Object} pluginData Object where to add the plugin data.
     * @return {Promise}           Promise resolved when data has been gathered.
     */
    self.preparePluginSubmissionData = function(assign, submission, plugin, inputData, pluginData) {
        var handler = self.getPluginHandler(plugin.type);
        if (handler && handler.prepareSubmissionData) {
            return $q.when(handler.prepareSubmissionData(assign, submission, plugin, inputData, pluginData));
        }
        return $q.when();
    };

    /**
     * Register a submission plugin handler. The handler will be used when submitting an assign.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#registerHandler
     * @param {String} addon                   Handler's name.
     * @param {String} pluginType              Type of the plugin the handler supports.
     * @param {String|Object|Function} handler Must be resolved to an object defining the following properties. Or to a function
     *                           returning an object defining these properties. See {@link $mmUtil#resolveObject}.
     *                             - isEnabled (Boolean|Promise) Whether or not the handler is enabled on a site level.
     *                                                           When using a promise, it should return a boolean.
     *                             - isEnabledForEdit (Boolean|Promise) Whether or not the handler is enabled for edit on a site
     *                                                           level. When using a promise, it should return a boolean.
     *                                                           This should return true if the plugin has no submission component.
     *                             - getDirectiveName(plugin, edit) (String) Optional. Returns the name of the directive to render
     *                                                           the plugin.
     *                             - prepareSubmissionData(assign, submission, plugin, inputData, pluginData). Should prepare and
     *                                                           add to pluginData the data to send to server based in the input.
     *                                                           Return promise if async.
     *                             - copySubmissionData(assign, plugin, pluginData). Function meant to copy a submission. Should
     *                                                           add to pluginData the data to send to server based in the data
     *                                                           in plugin (previous attempt).
     *                             - hasDataChanged(assign, submission, plugin, inputData) (Promise|Boolean) Check if the
     *                                                           submission data has changed for this plugin.
     *                             - clearTmpData(assign, submission, plugin, inputData). Optional. Should clear temporary data
     *                                                           for a cancelled submission.
     */
    self.registerHandler = function(addon, pluginType, handler) {
        if (typeof handlers[pluginType] !== 'undefined') {
            $log.debug("Addon '" + addon + "' already registered as handler for '" + pluginType + "'");
            return false;
        }
        $log.debug("Registered handler '" + addon + "' for submission plugin '" + pluginType + "'");
        handlers[pluginType] = {
            addon: addon,
            instance: undefined,
            handler: handler
        };

        // Handlers are registered in the "run" phase, it can happen that a handler is registered after updateHandlers
        // has been executed. If the user is logged in we'll run updateHandler to be sure it has been executed for this site.
        if ($mmSite.isLoggedIn()) {
            self.updateHandler(pluginType, handlers[pluginType]);
        }
    };

    /**
     * Check if a handler is enabled for a certain site and add/remove it to enabledHandlers.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#updateHandler
     * @param {String} pluginType   The type of the plugin this handler handles.
     * @param {Object} handlerInfo  The handler details.
     * @param  {Number} time        Time this update process started.
     * @return {Promise}            Resolved when done.
     * @protected
     */
    self.updateHandler = function(pluginType, handlerInfo, time) {
        var promise,
            deleted = false,
            siteId = $mmSite.getId();

        if (updatePromises[siteId] && updatePromises[siteId][pluginType]) {
            // There's already an update ongoing for this package, return the promise.
            return updatePromises[siteId][pluginType];
        } else if (!updatePromises[siteId]) {
            updatePromises[siteId] = {};
        }

        if (typeof handlerInfo.instance === 'undefined') {
            handlerInfo.instance = $mmUtil.resolveObject(handlerInfo.handler, true);
        }

        if (!$mmSite.isLoggedIn()) {
            promise = $q.reject();
        } else {
            promise = $q.when(handlerInfo.instance.isEnabled());
        }

        // Checks if the handler is enabled.
        promise = promise.catch(function() {
            return false;
        }).then(function(enabled) {
            // Verify that this call is the last one that was started.
            // Check that site hasn't changed since the check started.
            if (self.isLastUpdateCall(time) && $mmSite.isLoggedIn() && $mmSite.getId() === siteId) {
                if (enabled) {
                    enabledHandlers[pluginType] = handlerInfo.instance;
                } else {
                    delete enabledHandlers[pluginType];
                }
            }
        }).finally(function() {
            // Update finished, delete the promise.
            delete updatePromises[siteId][pluginType];
            deleted = true;
        });

        if (!deleted) { // In case promise was finished immediately.
            updatePromises[siteId][pluginType] = promise;
        }
        return promise;
    };

    /**
     * Update the enabled handlers for the current site.
     *
     * @module mm.addons.mod_assign
     * @ngdoc method
     * @name $mmaModAssignSubmissionDelegate#updateHandlers
     * @return {Promise} Resolved when done.
     * @protected
     */
    self.updateHandlers = function() {
        var promises = [],
            now = new Date().getTime();

        $log.debug('Updating handlers for current site.');

        lastUpdateHandlersStart = now;

        // Loop over all the handlers.
        angular.forEach(handlers, function(handlerInfo, pluginType) {
            promises.push(self.updateHandler(pluginType, handlerInfo, now));
        });

        return $q.all(promises).then(function() {
            return true;
        }, function() {
            // Never reject.
            return true;
        });
    };

    return self;
})

.run(function($mmEvents, mmCoreEventLogin, mmCoreEventSiteUpdated, $mmaModAssignSubmissionDelegate, mmCoreEventRemoteAddonsLoaded) {
    $mmEvents.on(mmCoreEventLogin, $mmaModAssignSubmissionDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventSiteUpdated, $mmaModAssignSubmissionDelegate.updateHandlers);
    $mmEvents.on(mmCoreEventRemoteAddonsLoaded, $mmaModAssignSubmissionDelegate.updateHandlers);
});
