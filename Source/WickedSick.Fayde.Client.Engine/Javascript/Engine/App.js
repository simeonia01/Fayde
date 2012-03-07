/// <reference path="../Runtime/RefObject.js" />
/// <reference path="../Core/DependencyObject.js"/>
/// CODE
/// <reference path="Surface.js"/>
/// <reference path="../Runtime/Collections.js"/>
/// <reference path="../Core/UIElement.js"/>
/// <reference path="Clock.js"/>

//#region App

function App() {
    DependencyObject.call(this);
    if (!IsDocumentReady())
        return;

    this.MainSurface = new Surface(this);
    this._Clock = new Clock();
    this._Storyboards = new Array();
}
App.InheritFrom(DependencyObject);

//#region DEPENDENCY PROPERTIES

App.ResourcesProperty = DependencyProperty.RegisterFull("Resources", function () { return ResourceDictionary; }, App, null, { GetValue: function () { return new ResourceDictionary(); } });
App.prototype.GetResources = function () {
    return this.GetValue(App.ResourcesProperty);
};
App.prototype.SetResources = function (value) {
    this.SetValue(App.ResourcesProperty, value);
};

//#endregion

//#region PROPERTIES

App.prototype.GetAddress = function () {
    ///<returns type="Uri"></returns>
    return this._Address;
};
App.prototype.SetAddress = function (value) {
    ///<param name="value" type="Uri"></param>
    this._Address = value;
};

//#endregion

App.prototype.Load = function (element, containerId, width, height) {
    /// <param name="element" type="UIElement"></param>
    this.SetAddress(new Uri(document.URL));
    this.MainSurface.Init(containerId, width, height);
    if (!(element instanceof UIElement))
        return;
    this.MainSurface._Attach(element);
    this.Start();
};

App.prototype.Start = function () {
    this._Clock.RegisterTimer(this);
};
App.prototype._Tick = function (lastTime, nowTime) {
    this.ProcessStoryboards(lastTime, nowTime);
    this.ProcessDirty();
};
App.prototype._Stop = function () {
    this._Clock.UnregisterTimer(this);
};

App.prototype.ProcessStoryboards = function (lastTime, nowTime) {
    for (var i = 0; i < this._Storyboards.length; i++) {
        this._Storyboards[i]._Tick(lastTime, nowTime);
    }
};
App.prototype.ProcessDirty = function () {
    if (this._IsRunning)
        return;
    this._IsRunning = true;
    var extents = this.MainSurface.GetExtents();
    var region = new Rect(0, 0, extents.Width, extents.Height);
    try {
        this.MainSurface.ProcessDirtyElements(region);
    } catch (err) {
        Fatal("An error occurred processing dirty elements: " + err.toString());
    }
    this._IsRunning = false;
};

App.prototype.RegisterStoryboard = function (storyboard) {
    Array.addDistinctRefObject(this._Storyboards, storyboard);
};
App.prototype.UnregisterStoryboard = function (storyboard) {
    Array.removeRefObject(this._Storyboards, storyboard);
};

App.prototype._GetImplicitStyles = function (fe, styleMask) {
    var genericXamlStyle = undefined;
    var appResourcesStyle = undefined;
    var visualTreeStyle = undefined;
    if ((styleMask & _StyleMask.GenericXaml) != 0) {
        if (fe instanceof Control) {
            genericXamlStyle = fe.GetDefaultStyle();
            if (!genericXamlStyle) {
                var styleKey = fe.GetDefaultStyleKey();
                if (styleKey != null)
                    genericXamlStyle = this._GetGenericXamlStyleFor(styleKey);
            }
        }
    }
    if ((styleMask & _StyleMask.ApplicationResources) != 0) {
        appResourcesStyle = this.GetResources().Get(fe.constructor);
        if (appResourcesStyle == null)
            appResourcesStyle = this.GetResources().Get(fe._TypeName);
    }
    if ((styleMask & _StyleMask.VisualTree) != 0) {
        var isControl = fe instanceof Control;
        var el = fe;
        while (el != null) {
            if (el.GetTemplateOwner() != null && fe.GetTemplateOwner() == null) {
                el = el.GetTemplateOwner();
                continue;
            }
            if (!isControl && el == fe.GetTemplateOwner())
                break;

            visualTreeStyle = el.GetResources().Get(fe.constructor);
            if (visualTreeStyle != null)
                break;
            visualTreeStyle = el.GetResources().Get(fe._TypeName);
            if (visualTreeStyle != null)
                break;

            el = el.GetVisualParent();
        }
    }

    var styles = new Array();
    styles[_StyleIndex.GenericXaml] = genericXamlStyle;
    styles[_StyleIndex.ApplicationResources] = appResourcesStyle;
    styles[_StyleIndex.VisualTree] = visualTreeStyle;
    return styles;
};
App.prototype._GetGenericXamlStyleFor = function (type) {
    NotImplemented("App._GetGenericXamlStyleFor");
};

//#endregion