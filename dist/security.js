'use strict';

var _simplSchema = require('simpl-schema');

var _simplSchema2 = _interopRequireDefault(_simplSchema);

var _messageBox = require('message-box');

var _messageBox2 = _interopRequireDefault(_messageBox);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

_simplSchema2.default.extendOptions(['index', 'unique', 'denyInsert', 'denyUpdate', 'placeholder', 'label']);

_messageBox2.default.defaults({ Untrusted: "Inserts/Updates from untrusted code not supported" });

_simplSchema2.default.denyUntrusted = function () {
    if (this.isSet) {
        var autoValue = this.definition.autoValue && this.definition.autoValue.call(this);
        var defaultValue = this.definition.defaultValue;

        if (this.value != defaultValue && this.value != autoValue && !this.isFromTrustedCode) {
            return "Untrusted";
        }
    }
};