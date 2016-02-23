'use strict';

var objectPath = require('object-path');
var clone = require('clone');

Polymer({
    is: 'nodecg-replicant',

    /**
     * Fired when the value of the target replicant changes.
     *
     * @event change
     */

    hostAttributes: {
        hidden: true
    },

    behaviors: [
        Polymer.NodeCGReplicantTargetingBehavior
    ],

    get value () {
        if (this.replicant) {
            return this.replicant.value;
        }
    },

    set value (newVal) {
        if (this.replicant) {
            return this.replicant.value = newVal;
        }
    },

    /**
     * The current value of the target replicant.
     *
     * @return {*}
     */
    _replicantChanged: function(oldVal, newVal, changes) {
        this.fire('value-changed', {
            value: newVal
        }, {bubbles: false});

        if (changes) {
            changes.forEach(function (change) {
                var pathParts = clone(change.path);
                pathParts.unshift('value');
                var path = pathParts.join('.');

                // squelch splice notifications to avoid issues
                var prop = change.path.slice(-1)[0];
                var parent = objectPath.get(newVal, change.path.slice(0, -1));
                if (prop === 'splices' && Array.isArray(parent)) {
                    return;
                }

                switch (change.type) {
                    case 'add':
                    case 'update':
                    case 'delete':
                        this.notifyPath(path, change.newValue);
                        break;
                    case 'splice':
                        /* Because Polymer is keeping its own internal copy of the Replicants value in
                           a WeakMap, we have to alter the `removed` items of our splice record to point
                           to the items already in Polymer's store, otherwise it will fail to remove them. */
                        var coll = Polymer._collections.get(this.value);
                        var storeKeys = Object.keys(coll.store);
                        for (var i = 0; i < change.removedCount; i++) {
                            var removedItemIndexInStore = storeKeys[change.index];
                            change.removed[i] = objectPath.get(coll.store, change.path)[removedItemIndexInStore];
                        }

                        this.notifySplices(path, [change]);
                }
            }.bind(this));
        }

        this._oldValue = clone(this.replicant.value);

        this.fire('change', {
            oldVal: oldVal,
            newVal: newVal,
            changes: changes
        }, {bubbles: false});
    }
});
