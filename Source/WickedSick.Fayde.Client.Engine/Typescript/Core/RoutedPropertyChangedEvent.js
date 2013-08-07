var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
/// <reference path="RoutedEvent.ts" />
/// CODE
var Fayde;
(function (Fayde) {
    var RoutedPropertyChangedEvent = (function (_super) {
        __extends(RoutedPropertyChangedEvent, _super);
        function RoutedPropertyChangedEvent() {
            _super.apply(this, arguments);
        }
        return RoutedPropertyChangedEvent;
    })(Fayde.RoutedEvent);
    Fayde.RoutedPropertyChangedEvent = RoutedPropertyChangedEvent;
    Nullstone.RegisterType(RoutedPropertyChangedEvent, "RoutedPropertyChangedEvent");

    var RoutedPropertyChangedEventArgs = (function (_super) {
        __extends(RoutedPropertyChangedEventArgs, _super);
        function RoutedPropertyChangedEventArgs(oldValue, newValue) {
            _super.call(this);
            Object.defineProperty(this, "OldValue", { value: oldValue, writable: false });
            Object.defineProperty(this, "NewValue", { value: newValue, writable: false });
        }
        return RoutedPropertyChangedEventArgs;
    })(Fayde.RoutedEventArgs);
    Fayde.RoutedPropertyChangedEventArgs = RoutedPropertyChangedEventArgs;
    Nullstone.RegisterType(RoutedPropertyChangedEventArgs, "RoutedPropertyChangedEventArgs");
})(Fayde || (Fayde = {}));
//@ sourceMappingURL=RoutedPropertyChangedEvent.js.map