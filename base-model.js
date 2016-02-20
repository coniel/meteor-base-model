//Object.create shim
if (typeof Object.create != 'function') {
    Object.create = (function() {
        var thing = function() {};
        return function (prototype) {
            if (arguments.length > 1) {
                throw Error('Second argument not supported');
            }
            if (typeof prototype != 'object') {
                throw TypeError('Argument must be an object');
            }
            thing.prototype = prototype;
            var result = new thing();
            thing.prototype = null;
            return result;
        };
    })();
}

var diff = function(a,b) {
    var keys = _.map(a, function(v, k){
        if(b[k] === v){
            return k;
        }
    });
    return _.omit(a, keys);
};



/*globals BaseModel:true*/

BaseModel = function(){};

BaseModel.methods = {};

BaseModel.createEmpty = function (_id) {
    return new this({_id:_id});
};

BaseModel.extend = function() {
    var child = function(document) {
        _.extend(this, document);
        if (!this._document) {
            this._document = document;
        }
    };

    //add Static properties and methods
    _.extend(child, this);

    //prototypal inheritence
    child.prototype = Object.create(this.prototype);
    child.prototype.constructor = child;

    //access to parent
    child.prototype._parent_ = this;
    child.prototype._super_ = this.prototype;

    return child;
};

BaseModel.extendAndSetupCollection = function(collectionName) {
    var model = this.extend();

    model.collection = model.prototype._collection = new Mongo.Collection(collectionName, {
        transform: function(document){
            return new model(document);
        }
    });

    model.collection.deny({
        insert() { return true; },
        update() { return true; },
        remove() { return true; }
    });

    Meteor[collectionName] = model.collection;

    return model;
};

BaseModel.appendSchema = function(schemaObject) {
    var schema = new SimpleSchema(schemaObject);
    var collection = this.prototype._collection;

    if(collection){
        collection.attachSchema(schema);
    }else{
        throw new Error("Can't append schema to non existent collection. Either use extendAndSetupCollection() or assign a collection to Model.prototype._collection");
    }
};

BaseModel.getSchema = function() {
    console.log(this.prototype._collection._c2._simpleSchema);
    return this.prototype._collection._c2._simpleSchema;
};

BaseModel.getSchemaKey = function(key) {
    return this.prototype._collection._c2._simpleSchema._schema[key];
};

BaseModel.getSubSchema = function(keys, modifiers) {

    var subSchema = {};

    _.each(keys, function(key) {
        var keyName = key;

        if (modifiers && modifiers.renameKeys && modifiers.renameKeys[key]) {
            keyName = modifiers.renameKeys[key];
        }

        var keySchema = _.clone(this.prototype._collection._c2._simpleSchema._schema[key]);

        if (modifiers && modifiers.modifySchema && modifiers.modifySchema[key]) {
            _.extend(keySchema, modifiers.modifySchema[key]);
        }

        subSchema[keyName] = keySchema;
    });

    if (modifiers && modifiers.extendSchema) {
        _.extend(subSchema, modifiers.extendSchema);
    }

    return new SimpleSchema(subSchema);
};

BaseModel.instanceMethods = function(methodMap) {
    var self = this;
    if(_.isObject(methodMap)){
        _.each(methodMap, function(method, name){
            if(_.isFunction(method)){
                if(!self.prototype[name]){
                    self.prototype[name] = method;
                }else{
                    throw new Meteor.Error("existent-method", "The method "+name+" already exists.");
                }
            }
        });
    }
};

BaseModel.prototype._getSchema = function() {
    return this._collection._c2._simpleSchema;
};

BaseModel.prototype._checkCollectionExists = function() {
    if(!this._collection) {
        throw new Error("No collection found. Either use extendAndSetupCollection() or assign a collection to Model.prototype._collection");
    }
};

BaseModel.prototype.getCollectionName = function() {
    this._checkCollectionExists();
    return this._collection._name;
};

BaseModel.prototype.checkOwnership = function() {
    return this.userId === Meteor.userId();
};

BaseModel.prototype.save = function(callback) {
    this._checkCollectionExists();
    var obj = {};
    var schema = this._getSchema();

    _.each(this, function(value, key) {
        if(key !== "_document"){
            obj[key] = value;
        }
    });

    if(this._id){
        obj = diff(obj, this._document);
        delete obj.createdAt;
        Meteor.call(this._collection._name + ".update", this._id, obj, callback);
    }else{
        if(Meteor.isClient && schema){
            obj = schema.clean(obj);
        }

        this._id = Meteor.apply(this._collection._name + ".insert", [obj], {returnStubValue: true}, callback);
    }

    return this;
};

BaseModel.prototype.update = function(modifier, callback) {
    if(this._id){
        this._checkCollectionExists();
        delete modifier.createdAt;
        Meteor.call(this._collection._name + ".update", this._id, modifier, callback);
    }
};

BaseModel.prototype._updateLocal = function(modifier) {
    this._collection._collection.update(this._id, modifier);
};

BaseModel.prototype.set = function(key, value) {
    var obj = {};
    obj[key] = value;
    this[key] = value;
    this._id && this._updateLocal({$set:obj});
    return this;
};

BaseModel.prototype.remove = function(callback) {
    if(this._id){
        this._checkCollectionExists();
        Meteor.call(this._collection._name + ".remove", this._id, callback);
    }
};