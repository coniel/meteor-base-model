'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _simplSchema = require('simpl-schema');

var _simplSchema2 = _interopRequireDefault(_simplSchema);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//Object.create shim
if (typeof Object.create != 'function') {
    Object.create = function () {
        var thing = function thing() {};
        return function (prototype) {
            if (arguments.length > 1) {
                throw Error('Second argument not supported');
            }
            if ((typeof prototype === 'undefined' ? 'undefined' : _typeof(prototype)) != 'object') {
                throw TypeError('Argument must be an object');
            }
            thing.prototype = prototype;
            var result = new thing();
            thing.prototype = null;
            return result;
        };
    }();
}

var diff = function diff(a, b) {
    var keys = _.map(a, function (v, k) {
        if (b[k] === v) {
            return k;
        }
    });
    return _.omit(a, keys);
};

var extend = function extend(reciever, provider) {
    for (prop in provider) {
        if (provider.hasOwnProperty(prop)) {
            reciever[prop] = provider[prop];
        }
    }
};

var BaseModel = function BaseModel() {};

BaseModel.extend = function () {
    var Model = function Model(document) {
        extend(this, document);
        this._document = document;
    };

    Model._meteorMethods = Model.prototype._meteorMethods = {};

    Model.createEmpty = function (_id) {
        return new this({ _id: _id });
    };
    Model.appendSchema = function (schemaObject) {
        var schema = new _simplSchema2.default(schemaObject);
        var collection = this.prototype.getCollection();

        if (collection) {
            collection.attachSchema(schema);
        } else {
            throw new Error("Can't append schema to non existent collection. Please use extendAndSetupCollection() to create your models");
        }
    };

    Model.getSchema = function () {
        return this.prototype.getCollection()._c2._simpleSchema;
    };

    Model.getSchemaKey = function (key) {
        return this.prototype.getCollection()._c2._simpleSchema._schema[key];
    };

    Model.getSchemaKeyAsOptional = function (key) {
        var schemaKeyValue = _.clone(this.prototype.getCollection()._c2._simpleSchema._schema[key]);
        schemaKeyValue.optional = true;
        return schemaKeyValue;
    };

    Model.getSubSchema = function (keys, modifiers, returnValidator) {
        var _this = this;

        var subSchema = {};

        _.each(keys, function (key) {
            var keyName = key;

            if (modifiers && modifiers.renameKeys && modifiers.renameKeys[key]) {
                keyName = modifiers.renameKeys[key];
            }

            var keySchema = _.clone(_this.prototype.getCollection()._c2._simpleSchema._schema[key]);

            if (modifiers && modifiers.modifySchema && modifiers.modifySchema[key]) {
                _.extend(keySchema, modifiers.modifySchema[key]);
            }

            subSchema[keyName] = keySchema;
        });

        if (modifiers && modifiers.extend) {
            _.extend(subSchema, modifiers.extend);
        }

        if (returnValidator) {
            return new _simplSchema2.default(subSchema).validator();
        } else {
            return new _simplSchema2.default(subSchema, { requiredByDefault: true });
        }
    };

    Model.methods = function (methodMap) {
        var self = this;
        if (_.isObject(methodMap)) {
            _.each(methodMap, function (method, name) {
                if (_.isFunction(method)) {
                    if (!self.prototype[name]) {
                        self.prototype[name] = method;
                    } else {
                        throw new Meteor.Error("existent-method", "The method " + name + " already exists.");
                    }
                }
            });
        }
    };

    Model.meteorMethods = function (methodMap) {
        var self = this;
        if (_.isObject(methodMap)) {
            _.each(methodMap, function (method, name) {
                if (_.isObject(method)) {
                    if (!self._meteorMethods[name] && !self.prototype._meteorMethods[name]) {
                        self.prototype._meteorMethods[name] = method;
                        self._meteorMethods[name] = method;
                    } else {
                        throw new Meteor.Error("existent-method", "The meteor method " + name + " already exists.");
                    }
                }
            });
        }
    };

    Model.prototype._getSchema = function () {
        var schema = Meteor._get(this.getCollection(), "_c2", "_simpleSchema");
        if (schema) {
            return schema;
        } else {
            throw new Meteor.Error("noSchema", "You don't have a schema defined for " + this.getCollectionName());
        }
    };

    Model.prototype._checkCollectionExists = function () {
        if (!this.getCollection()) {
            throw new Error("No collection found. Pleas use extendAndSetupCollection() to create your models");
        }
    };

    Model.prototype.getCollectionName = function () {
        this._checkCollectionExists();
        return this.getCollection()._name;
    };

    Model.prototype.checkOwnership = function () {
        return this.userId === Meteor.userId();
    };

    Model.prototype.save = function () {
        var _this2 = this;

        this._checkCollectionExists();
        var obj = {};
        var schema = this._getSchema();

        _.each(this, function (value, key) {
            if (key !== "_document") {
                obj[key] = value;
            }
        });

        if (this._id) {
            obj = diff(obj, this._document);
            delete obj.createdAt;
            return this._meteorMethods.update.callPromise({ _id: this._id, doc: obj });
        } else {
            if (Meteor.isClient && schema) {
                obj = schema.clean(obj);
            }

            var promise = this._meteorMethods.insert.callPromise({ doc: obj });
            promise.then(function (result) {
                _this2._id = result;
            });
            return promise;
        }
    };

    Model.prototype.update = function (obj, callback) {
        if (this._id) {
            this._checkCollectionExists();
            delete obj.createdAt;
            return this._meteorMethods.update.callPromise({ _id: this._id, doc: obj });
        }
    };

    Model.prototype._setProps = function (key, value, validationPathOnly) {
        var current;
        var level = this;
        var steps = key.split(".");
        var last = steps.pop();
        var set = {};
        var currentSet = set;

        while (current = steps.shift()) {
            if (!validationPathOnly) {
                if (level[current]) {
                    if (!_.isObject(level[current])) {
                        throw new Meteor.Error("PropertyNotObject", current + " of " + key + " is not an object");
                    }
                } else {
                    level[current] = {};
                }

                level = level[current];
            }
            currentSet = currentSet[current] = {};
        }

        if (!validationPathOnly) {
            level[last] = value;
        }

        currentSet[last] = value;

        return set;
    };

    Model.prototype._updateLocal = function (modifier) {
        this.getCollection()._collection.update(this._id, modifier);
    };

    Model.prototype.set = function (key, value) {
        var context = this._getSchema().newContext();
        var obj = {};

        obj.$set = this._setProps(key, value, true);

        if (context.validate(obj, { modifier: true })) {
            obj.$set = this._setProps(key, value);
            this[key] = value;

            if (Meteor.isClient) {
                this._id && this._updateLocal(obj);
            }
        } else {
            throw new Meteor.Error(context.keyErrorMessage(key));
        }
        return this;
    };

    Model.prototype.remove = function (callback) {
        if (this._id) {
            this._checkCollectionExists();
            return this._meteorMethods.remove.callPromise({ _id: this._id });
        }
    };

    return Model;
};

BaseModel.extendAndSetupCollection = function (collectionName, options) {
    var collectionOptions = {};
    var model = this.extend();

    if (!options) options = {};

    if (!options.noTransform) {
        collectionOptions.transform = function (document) {
            return new model(document);
        };
    }

    var collection = model.collection = new Mongo.Collection(collectionName, collectionOptions);
    model.prototype.getCollection = function () {
        return collection;
    };

    // Deny all client side operations
    model.collection.deny({
        insert: function insert() {
            return true;
        },
        update: function update() {
            return true;
        },
        remove: function remove() {
            return true;
        }
    });

    // Create default schema for collection
    var createdAtKey = 'createdAt';
    var updatedAtKey = 'updatedAt';
    var userId = false;

    if (typeof options !== 'undefined') {
        if (typeof options.createdTimestamp !== 'undefined') createdAtKey = options.createdTimestamp;
        if (typeof options.updatedTimestamp !== 'undefined') updatedAtKey = options.updatedTimestamp;
        if (options.userId && typeof options.userId === 'boolean') {
            userId = 'userId';
        } else if (typeof options.userId === 'string') {
            userId = options.userId;
        }
    }

    var schema = {
        _id: {
            type: String,
            regEx: _simplSchema2.default.RegEx.Id
        }
    };

    if (createdAtKey) {
        schema[createdAtKey] = {
            type: Date,
            autoValue: function autoValue() {
                if (this.isInsert) {
                    return new Date();
                }
            },
            denyUpdate: true
        };
    }

    if (updatedAtKey) {
        schema[updatedAtKey] = {
            type: Date,
            optional: true,
            autoValue: function autoValue() {
                if (this.isUpdate || this.isUpsert) {
                    return new Date();
                }
            }
        };
    }

    if (userId) {
        schema[userId] = {
            type: String,
            regEx: _simplSchema2.default.RegEx.Id,
            autoValue: function autoValue() {
                if (this.isInsert) {
                    return Meteor.userId();
                }
            },
            denyUpdate: options && options.allowUserIdUpdate ? !options.denyUserIdUpdate : true
        };
    }

    model.appendSchema(schema);

    // Make soft removable (if specified in options)
    if (options && options.softRemovable) {
        model.collection.attachBehaviour('softRemovable');
    }

    // Add userId schema key (if specified in options)
    if (options && options.userId) {
        model.collection.attachBehaviour('softRemovable');
    }

    Meteor[collectionName] = model.collection;

    return model;
};

exports.default = BaseModel;