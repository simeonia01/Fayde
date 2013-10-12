/// <reference path="../Core/XamlObject.ts" />
/// CODE
/// <reference path="../Runtime/TypeManagement.ts" />
/// <reference path="MarkupExpressionParser.ts" />
/// <reference path="Library.ts" />

module Fayde.Xaml {
    var parser = new DOMParser();

    export class FrameworkTemplate extends Fayde.XamlObject {
        private ResourceChain: ResourceDictionary[] = [];
        private TemplateElement: Element;
        constructor() {
            super();
        }
        GetVisualTree(bindingSource: DependencyObject): UIElement {
            var ctx: IXamlLoadContext = {
                Document: this.TemplateElement.ownerDocument,
                ResourceChain: this.ResourceChain,
                NameScope: new NameScope(true),
                ObjectStack: [],
                TemplateBindingSource: bindingSource,
            };
            var uie = <UIElement>createObject(this.TemplateElement.firstElementChild, ctx);
            if (!(uie instanceof UIElement))
                throw new XamlParseException("Template root visual is not a UIElement.");
            uie.XamlNode.NameScope = ctx.NameScope;
            return uie;
        }
    }
    Fayde.RegisterType(FrameworkTemplate, {
        Name: "FrameworkTemplate",
        Namespace: "Fayde.Xaml"
    });


    interface IOutValue {
        Value: any
    }

    interface IXamlLoadContext {
        Document: Document;
        ResourceChain: ResourceDictionary[];
        NameScope: NameScope;
        ObjectStack: any[];
        TemplateBindingSource: DependencyObject;
    }
    export function Load(xaml: string): XamlObject {
        var ctx: IXamlLoadContext = {
            Document: parser.parseFromString(xaml, "text/xml"),
            ResourceChain: [],
            NameScope: new NameScope(true),
            ObjectStack: [],
            TemplateBindingSource: null,
        };
        validateDocument(ctx.Document);
        var xo = <XamlObject>createObject(ctx.Document.documentElement, ctx);
        xo.XamlNode.NameScope = ctx.NameScope;
        return xo;
    }
    export function LoadDocument(doc: Document): XamlObject {
        var ctx: IXamlLoadContext = {
            Document: doc,
            ResourceChain: [],
            NameScope: new NameScope(true),
            ObjectStack: [],
            TemplateBindingSource: null,
        };
        validateDocument(ctx.Document);
        var xo = <XamlObject>createObject(ctx.Document.documentElement, ctx);
        xo.XamlNode.NameScope = ctx.NameScope;
        return xo;
    }
    function createObject(el: Element, ctx: IXamlLoadContext): any {
        var resolution = TypeResolver.Resolve(el.namespaceURI, el.localName);
        if (resolution === undefined)
            throw new XamlParseException("Could not resolve type '" + el.namespaceURI + ":" + el.localName + "'");
        if (resolution.IsPrimitive)
            return createPrimitive(resolution.Type, el, ctx);
        if (resolution.IsSimple)
            return createSimple(resolution.Type, el, ctx);
        if (resolution.IsSystem)
            return Fayde.ConvertAnyToType(el.textContent, resolution.Type);
        if (resolution.IsEnum) {
            var val = resolution.Type[el.textContent.trim()];
            if (val != null)
                return val;
            return 0;
        }

        var val = new (<any>resolution.Type)();

        if (val instanceof FrameworkTemplate)
            return createTemplate(<FrameworkTemplate>val, el, ctx);

        ctx.ObjectStack.push(val);

        if (val instanceof XamlObject) {
            var xobj = <XamlObject>val;
            var xnode = xobj.XamlNode;

            var nameAttr = el.attributes.getNamedItemNS(Fayde.XMLNSX, "Name");
            if (nameAttr) {
                var name = nameAttr.value;
                ctx.NameScope.RegisterName(name, xnode);
                xnode.Name = name;
            }
            xobj.TemplateOwner = ctx.TemplateBindingSource;
        }

        var childProcessor = createXamlChildProcessor(val, resolution.Type, ctx);
        if (val instanceof XamlObjectCollection) {
            childProcessor.ProcessCollection(el, val);
        } else if (val instanceof ResourceDictionary) {
            ctx.ResourceChain.push(val);
            processResourceDictionary(el, val, ctx);
            ctx.ResourceChain.pop();
        } else {
            childProcessor.Process(el);
        }

        return ctx.ObjectStack.pop();
    }
    function createPrimitive(type: Function, el: Element, ctx: IXamlLoadContext): any {
        if (type === null)
            return null;
        if (type === Number)
            return parseFloat(el.textContent);
        if (type === String)
            return el.textContent;
        if (type === Boolean) {
            var c = el.textContent.toUpperCase();
            return c === "TRUE" ? true : (c === "FALSE" ? false : null);
        }
        if (type === Date)
            return new Date(el.textContent);
        if (type === RegExp)
            return new RegExp(el.textContent);
        if (type === Array) {
            var arr = [];
            ctx.ObjectStack.push(arr);
            var childEl = el.firstElementChild;
            while (childEl) {
                arr.push(createObject(childEl, ctx));
                childEl = childEl.nextElementSibling;
            }
            ctx.ObjectStack.pop();
            return arr;
        }
        return undefined;
    }
    function createSimple(type: Function, el: Element, ctx: IXamlLoadContext): any {
        var text = el.textContent.trim();
        if (text)
            return Fayde.ConvertAnyToType(text, type);
        return new (<any>type)();
    }
    function createTemplate(ft: FrameworkTemplate, el: Element, ctx: IXamlLoadContext): FrameworkTemplate {
        Object.defineProperty(ft, "ResourceChain", { value: ctx.ResourceChain.slice(0), writable: false });
        //Clone Node?
        Object.defineProperty(ft, "TemplateElement", { value: el, writable: false });
        if (ft instanceof Controls.ControlTemplate) {
            var targetTypeNode = el.attributes.getNamedItemNS(Fayde.XMLNS, "TargetType");
            if (!targetTypeNode)
                targetTypeNode = el.attributes.getNamedItem("TargetType");
            if (!targetTypeNode)
                throw new XamlParseException("ControlTemplate must have a TargetType.");
            var ctres = TypeResolver.ResolveFullyQualifiedName(targetTypeNode.value, targetTypeNode);
            if (!ctres)
                throw new XamlParseException("Could not find ControlTemplate.TargetType '" + targetTypeNode.value + "'.");
            Object.defineProperty(ft, "TargetType", {
                value: ctres.Type,
                writable: false
            });
        }

        var childProcessor = createXamlChildProcessor(ft, (<any>ft).constructor, ctx);
        //Handle attributes
        var attrs = el.attributes;
        var len = attrs.length;
        var attr: Attr;
        for (var i = 0; i < len; i++) {
            attr = attrs[i];
            //ignore namespace declarations
            if (attr.name === "xmlns")
                continue;
            if (attr.prefix === "xmlns")
                continue;
            //ignore x:[Property] declarations, they will be handled specifically
            if (attr.namespaceURI === Fayde.XMLNSX)
                continue;
            childProcessor.ProcessAttribute(attr);
        }

        return ft;
    }

    interface IXamlChildProcessor {
        Process(el: Element): void;
        ProcessElement(el: Element): void; 
        ProcessAttribute(attr: Attr): void;
        ProcessCollection(propertyEl: Element, coll: XamlObjectCollection<any>): void;
    }
    function createXamlChildProcessor(owner: any, ownerType: Function, ctx: IXamlLoadContext): IXamlChildProcessor {
        var app: Application;
        var dobj: DependencyObject;
        var contentPropd: DependencyProperty;
        var contentCollection: XamlObjectCollection<any>;
        if (owner instanceof DependencyObject) {
            dobj = owner;
            contentPropd = TypeResolver.GetAnnotation(ownerType, "ContentProperty");
            if (contentPropd instanceof DependencyProperty) {
                if (contentPropd.IsImmutable) {
                    contentCollection = dobj[contentPropd.Name];
                } else {
                    var contentTargetType = contentPropd.GetTargetType();
                    if (Nullstone.DoesInheritFrom(contentTargetType, XamlObjectCollection)) {
                        contentCollection = <XamlObjectCollection<any>>new (<any>contentTargetType)();
                        dobj.SetValue(contentPropd, contentCollection);
                    }
                }
            } else if (dobj instanceof Application) {
                app = <Application>dobj;
            }
        }

        function createAttributeObject(attr: Attr, dobj: DependencyObject, propd: DependencyProperty): any {
            var value = attr.textContent;
            if (value[0] === "{") {
                var parseCtx: IMarkupParseContext = {
                    Owner: dobj,
                    Property: propd,
                    Resolver: attr,
                    ResourceChain: ctx.ResourceChain,
                    TemplateBindingSource: ctx.TemplateBindingSource,
                    ObjectStack: ctx.ObjectStack
                };
                var result = MarkupExpressionParser.Parse(value, parseCtx);
                if (result !== undefined) {
                    if (!propd) {
                        if (result instanceof EventBinding)
                            return (<Xaml.IMarkup>result).Transmute(parseCtx);
                        return result;
                    }
                    if (result) {
                        var tt = propd.GetTargetType();
                        if (tt instanceof Interface && Nullstone.ImplementsInterface(result, <Interface>tt)) {
                            return result;
                        } else if (tt instanceof Enum) {
                        } else if (tt === Object) {
                        } else if (result instanceof <Function>tt) {
                            return result;
                        }
                    }
                    if ((result instanceof TemplateBinding) || (result instanceof Data.Binding))
                        return (<Xaml.IMarkup>result).Transmute(parseCtx);
                    return result;
                }
            }
            if (!propd)
                return value;

            if (propd === Fayde.Style.TargetTypeProperty) {
                var resolution = TypeResolver.ResolveFullyQualifiedName(value, attr);
                if (resolution === undefined)
                    throw new XamlParseException("Could not resolve type '" + value + "'");
                return resolution.Type;
            } else if (propd === Fayde.Setter.PropertyProperty) {
                var ownerStyle = findOwnerStyle();
                return resolveDependencyProperty(value, ownerStyle.TargetType, attr);
            }
            var targetType = <Function>propd.GetTargetType();
            if (targetType === String)
                return value;
            return Fayde.ConvertAnyToType(value, targetType);
        }
        function findOwnerStyle(): Style {
            var s = ctx.ObjectStack;
            var len = s.length;
            var cur: any;
            for (var i = len - 1; i >= 0; i--) {
                cur = s[i];
                if (cur instanceof Style)
                    return cur;
            }
            return undefined;
        }
        function resolveDependencyProperty(val: string, targetType: Function, resolver: INamespacePrefixResolver): DependencyProperty {
            var tokens = val.split(".");
            if (tokens.length === 1)
                return DependencyProperty.GetDependencyProperty(targetType, val);
            var resolution = TypeResolver.ResolveFullyQualifiedName(tokens[0], resolver);
            if (resolution === undefined)
                throw new XamlParseException("Could not resolve DependencyProperty type '" + val + "'");
            return DependencyProperty.GetDependencyProperty(resolution.Type, tokens[1]);
        }
        function getResourcesChildElement(el: Element): Element {
            if (!dobj)
                return undefined;

            var parentNsUri = el.namespaceURI;
            var expectedname = el.localName + ".Resources";

            var child = el.firstElementChild;
            var nsUri: string;
            while (child) {
                nsUri = child.namespaceURI || Fayde.XMLNS;
                if (nsUri === parentNsUri && child.localName === expectedname)
                    return child;
                child = child.nextElementSibling;
            }
            return undefined;
        }

        var hasSetContent = false;
        var propertiesSet = [];
        function ensurePropertyNotSet(propertyName: string) {
            if (propertiesSet.indexOf(propertyName) > -1)
                throw new XamlParseException("Cannot set a property in XAML more than once.");
            propertiesSet.push(propertyName);
        }

        return {
            Process: function (el: Element): void {
                //Handle Resources first
                var resElement = getResourcesChildElement(el);
                var rd: ResourceDictionary;
                if (resElement) {
                    rd = <ResourceDictionary>(<any>dobj).Resources;
                    if (rd) {
                        ctx.ResourceChain.push(rd);
                        processResourceDictionary(resElement, rd, ctx);
                    }
                }

                var attrs = el.attributes;

                //Handle attributes
                var len = attrs.length;
                var attr: Attr;
                for (var i = 0; i < len; i++) {
                    attr = attrs[i];
                    //ignore namespace declarations
                    if (attr.name === "xmlns")
                        continue;
                    if (attr.prefix === "xmlns")
                        continue;
                    //ignore x:[Property] declarations, they will be handled specifically
                    if (attr.namespaceURI === Fayde.XMLNSX)
                        continue;
                    this.ProcessAttribute(attr);
                }

                //Handle child nodes
                var child = el.firstElementChild;
                while (child) {
                    if (child !== resElement) //Skip Resources element
                        this.ProcessElement(child);
                    child = child.nextElementSibling;
                }

                if (!hasSetContent && !el.firstElementChild && contentPropd) {
                    var text = el.textContent;
                    if (text && (text = text.trim()))
                        dobj.SetValue(contentPropd, text);
                }

                if (rd)
                    ctx.ResourceChain.pop();
            },
            ProcessAttribute: function (attr: Attr) {
                var tokens = attr.localName.split(".");
                var propd: DependencyProperty;
                var event: MulticastEvent<any>;
                var propertyName: string;
                if (tokens.length > 1) { // <Tag [ns:]Type.Property="...">
                    var nsUri = attr.namespaceURI || Fayde.XMLNS;
                    var typeRes = TypeResolver.Resolve(nsUri, tokens[0]);
                    propertyName = tokens[1];
                    propd = DependencyProperty.GetDependencyProperty(typeRes.Type, propertyName, true);
                    if (!propd)
                        throw new XamlParseException("Could not find attached property '" + nsUri + ":" + attr.localName + "'");
                    if (!dobj)
                        throw new XamlParseException("Cannot set an attached property on an object that is not a DependencyObject.");
                } else { // <[Tag] Property="...">
                    propertyName = attr.localName
                    if (dobj)
                        propd = DependencyProperty.GetDependencyProperty(ownerType, propertyName, true);
                    if (!propd) {
                        event = <MulticastEvent>owner[propertyName];
                        if (!(event instanceof MulticastEvent))
                            event = undefined;
                    }
                }

                ensurePropertyNotSet(propertyName);

                if (propd) {
                    dobj.SetValue(propd, createAttributeObject(attr, dobj, propd));
                } else if (event) {
                    var val = createAttributeObject(attr, dobj, null);
                    if (val instanceof EventBindingExpression) {
                        var ebe = <EventBindingExpression>val;
                        ebe.Init(event, propertyName);
                        ebe.OnAttached(owner);
                    } else {
                        var rootobj = ctx.ObjectStack[0];
                        var callback = rootobj[attr.value];
                        if (!callback)
                            throw new XamlParseException("Cannot find method for event subscription '" + val + "'.");
                        event.Subscribe(callback, rootobj);
                    }
                } else {
                    //TODO: Add checks for read-only, etc.
                    owner[propertyName] = createAttributeObject(attr, dobj, null);
                }
            },
            ProcessElement: function (el: Element) {
                var tokens = el.localName.split(".");
                var propd: DependencyProperty;
                var propertyName: string;
                if (tokens.length > 1) { // <[ns:]Type.Property /> (DP or Attached DP)
                    var nsUri = el.namespaceURI || Fayde.XMLNS;
                    var typeRes = TypeResolver.Resolve(nsUri, tokens[0]);
                    if (!typeRes)
                        throw new XamlParseException("Could not resolve type '" + nsUri + ":" + tokens[0] + "'");
                    propertyName = tokens[1];
                    propd = DependencyProperty.GetDependencyProperty(typeRes.Type, propertyName, true);
                    if (!propd)
                        throw new XamlParseException("Could not find property '" + nsUri + ":" + el.localName + "'");
                    ensurePropertyNotSet(propertyName);
                    var val: any;
                    if (propd.IsImmutable) {
                        val = dobj.GetValue(propd);
                        if (!(val instanceof XamlObjectCollection))
                            throw new XamlParseException("Cannot set immutable property.");
                        this.ProcessCollection(el, val);
                    } else {
                        if (propd.IsAttached) {
                            var propTargetType = propd.GetTargetType();
                            if (Nullstone.DoesInheritFrom(propTargetType, XamlObjectCollection)) {
                                val = new (<any>propTargetType)();
                                dobj.SetValue(propd, val);
                                this.ProcessCollection(el, val);
                                return;
                            }
                        }
                        dobj.SetValue(propd, createObject(el.firstElementChild, ctx));
                    }
                } else { //<[ns:]Type> (Content)
                    if (!contentPropd) {
                        if (!app)
                            throw new XamlParseException("Attempting to set content on an object that does not have a Content Property.");
                        if (hasSetContent)
                            throw new XamlParseException("Content has already been set.");
                        hasSetContent = true;
                        app.MainSurface.Attach(createObject(el, ctx));
                    } else {
                        if (contentCollection) {
                            contentCollection.Add(createObject(el, ctx));
                        } else {
                            ensurePropertyNotSet(propertyName);
                            if (hasSetContent)
                                throw new XamlParseException("Content has already been set.");
                            hasSetContent = true;
                            dobj.SetValue(contentPropd, createObject(el, ctx));
                        }
                    }
                }
            },
            ProcessCollection: function (propertyEl: Element, coll: XamlObjectCollection<any>): void {
                ctx.ObjectStack.push(coll);
                var curEl = propertyEl.firstElementChild;
                while (curEl) {
                    coll.Add(createObject(curEl, ctx));
                    curEl = curEl.nextElementSibling;
                }
                ctx.ObjectStack.pop();
            }
        };
    }

    /// VALIDATION
    function validateDocument(doc: Document) {
        var docEl = doc.documentElement;
        //if (docEl.childElementCount  !== 1)
        //throw new XamlParseException("There must be 1 root element.");
        if (!docEl.isDefaultNamespace(Fayde.XMLNS))
            throw new XamlParseException("Invalid default namespace in XAML document.");
    }


    /// APPLICATION
    export function LoadApplication(xaml: string, canvas: HTMLCanvasElement) {
        TimelineProfile.Parse(true, "App");
        var appLoader = createAppLoader(xaml, canvas);
        appLoader.Load();
    }
    interface IAppLoader {
        Load(): void;
    }
    interface IXamlDependency {
        NamespaceUri: string;
        Name: string;
    }
    function createAppLoader(xaml: string, canvas: HTMLCanvasElement): IAppLoader {
        var appSources: Namespace[] = [];
        var appLibraries: Library[] = [];
        var rdResources: IXamlResource[] = [];
        var theme: Theme;
        var ctx: IXamlLoadContext = {
            Document: parser.parseFromString(xaml, "text/xml"),
            ResourceChain: [],
            NameScope: new NameScope(true),
            ObjectStack: [],
            TemplateBindingSource: null,
        };
        validateDocument(ctx.Document);
        var appEl = ctx.Document.documentElement;
        var appNsUri = appEl.namespaceURI;

        function preloadLibraries() {
            var curEl = getElementNS(appEl, appNsUri, appEl.localName + ".Libraries");
            if (!curEl)
                return;
            curEl = curEl.firstElementChild;
            var library: Library;
            while (curEl) {
                library = createObject(curEl, ctx);
                library.Register();
                appLibraries.push(library);
                curEl = curEl.nextElementSibling;
            }
        }
        function registerSources() {
            var themeUrl = appEl.getAttributeNS(appNsUri, "Theme")
            if (!themeUrl) themeUrl = appEl.getAttribute("Theme");
            theme = new Theme(themeUrl);
            
            var curElement = getElementNS(appEl, appNsUri, appEl.localName + ".Sources");
            if (!curElement)
                return;

            curElement = curElement.firstElementChild;
            var nsSource: Namespace;
            while (curElement) {
                nsSource = createObject(curElement, ctx);
                nsSource.RegisterSource();
                appSources.push(nsSource);
                curElement = curElement.nextElementSibling;
            }
        }
        function preloadResourceDictionaries() {
            var curElement = getElementNS(appEl, appNsUri, appEl.localName + ".Resources");
            if (curElement)
                parseResources(curElement);
        }
        function parseResources(resel: Element) {
            var curElement = resel.firstElementChild;
            var src: string;
            var childEl: Element;
            while (curElement) {
                if (curElement.localName === "ResourceDictionary") {
                    if (src = curElement.getAttribute("Source"))
                        rdResources.push(Xaml.RegisterResourceDictionary(new Uri(src)));
                    childEl = curElement.firstElementChild;
                    while (childEl) {
                        if (childEl.localName === "ResourceDictionary.MergedDictionaries") {
                            parseResources(childEl);
                            break;
                        }
                        childEl = childEl.nextElementSibling;
                    }
                }
                curElement = curElement.nextElementSibling;
            }
        }
        function collectDependencies() {
            var deps: IXamlDependency[] = [];

            var next: Element;
            var attrs: NamedNodeMap;
            var curElement = ctx.Document.documentElement;
            var nsUri: string;
            while (curElement) {
                nsUri = curElement.namespaceURI;
                if (nsUri !== null && nsUri !== Fayde.XMLNS && nsUri !== Fayde.XMLNSX)
                    deps.push({ NamespaceUri: curElement.namespaceURI, Name: curElement.localName });

                attrs = curElement.attributes;
                //TODO: Finish finding needed dependencies in attributes

                next = curElement.nextElementSibling;
                if (!next) next = (<Element>curElement.parentNode).nextElementSibling;
                curElement = next;
            }

            return deps;
        }
        function finishLoad() {
            var el = ctx.Document.documentElement;
            var nsUri = el.namespaceURI || Fayde.XMLNS;
            var resolution = TypeResolver.Resolve(nsUri, el.localName);
            if (resolution === undefined)
                throw new XamlParseException("Could not resolve application type '" + nsUri + ":" + el.localName + "'");

            var app = new (<any>resolution.Type)();
            theme.Create();
            Object.defineProperty(app, "Theme", { value: theme, writable: false });
            Application.Current = app;
            if (!(app instanceof Application))
                throw new XamlParseException("Root Element must be an Application.");

            app.Sources._ht = appSources;
            app.Libraries._ht = appLibraries;
            app.MainSurface.Register(canvas);

            ctx.ObjectStack.push(app);
            var childProcessor = createXamlChildProcessor(app, resolution.Type, ctx);
            childProcessor.Process(el);
            app.Sources._ht = appSources;
            app.Libraries._ht = appLibraries;
            app.RootVisual.XamlNode.NameScope = ctx.NameScope;
            ctx.ObjectStack.pop();
            TimelineProfile.Parse(false, "App");
            Application.Current.Start();
        }

        return {
            Load: function () {
                preloadLibraries();
                registerSources();
                preloadResourceDictionaries();
                collectDependencies();
                var loaders: Fayde.Runtime.ILoadAsyncable[] = appSources.slice(0);
                loaders.push.apply(loaders, appLibraries);
                loaders.push.apply(loaders, rdResources);
                loaders.push(theme);
                Runtime.LoadBatchAsync(loaders, () => finishLoad());
            }
        };
    }


    /// THEME
    export class Theme implements Runtime.ILoadAsyncable {
        Resources: ResourceDictionary;
        Url: string;
        private _Xaml: string;
        constructor(url: string) {
            this.Url = url;
        }

        Create() {
            var rd = <ResourceDictionary>Load(this._Xaml);
            Object.defineProperty(this, "Resources", { value: rd, writable: false });
        }

        LoadAsync(onLoaded: (state: any) => void) {
            var request = new AjaxRequest(
                (result: IAjaxResult) => {
                    this._Xaml = result.GetData();
                    onLoaded(this);
                },
                (error: string) => {
                    console.warn("Could not load Theme: " + error);
                    onLoaded(this);
                });
            request.Get(this.Url);
        }
    }


    /// RESOURCE DICTIONARY
    function processResourceDictionary(el: Element, rd: ResourceDictionary, ctx: IXamlLoadContext) {
        ctx.ObjectStack.push(rd);

        var subEl = el.firstElementChild;
        var rdEl: Element;
        var curEl = subEl;
        if (subEl && subEl.namespaceURI === Fayde.XMLNS && subEl.localName === "ResourceDictionary") {
            rdEl = subEl;
            curEl = subEl.firstElementChild;
        } else if (el && el.namespaceURI === Fayde.XMLNS && el.localName === "ResourceDictionary") {
            rdEl = el;
        }

        var srcAttr = rdEl ? rdEl.getAttribute("Source") : undefined;
        if (srcAttr) {
            rd.Source = new Uri(srcAttr);
            loadResourceDictionary(rd);
        } else {
            var localName: string;
            while (curEl) {
                localName = curEl.localName;
                if (localName.indexOf(".") < 0) {
                    createObjectInResources(curEl, rd, ctx);
                } else if (localName === "ResourceDictionary.MergedDictionaries") {
                    processMergedDictionaries(curEl, rd, ctx);
                }
                curEl = curEl.nextElementSibling;
            }
        }

        ctx.ObjectStack.pop();
    }
    function processMergedDictionaries(mdEl: Element, rd: ResourceDictionary, ctx: IXamlLoadContext) {
        var curEl = mdEl.firstElementChild;
        var rd: ResourceDictionary;
        var rdc = rd.MergedDictionaries;
        while (curEl) {
            if (curEl.localName === "ResourceDictionary") {
                rdc.Add(rd = new ResourceDictionary());
                processResourceDictionary(curEl, rd, ctx);
            }
            curEl = curEl.nextElementSibling;
        }
    }
    function loadResourceDictionary(rd: ResourceDictionary) {
        if ((<any>rd)._IsSourceLoaded)
            return;
        var resource = Xaml.MapResourceDictionary(rd.Source);
        if (!resource)
            return;
        var doc = resource.Document;
        if (!doc)
            return;

        var ctx: IXamlLoadContext = {
            Document: doc,
            ResourceChain: [rd],
            NameScope: new NameScope(true),
            ObjectStack: [rd],
            TemplateBindingSource: null,
        };
        validateDocument(ctx.Document);
        (<any>rd)._IsSourceLoaded = true;
        processResourceDictionary(ctx.Document.documentElement, rd, ctx);
    }
    function createObjectInResources(el: Element, rd: ResourceDictionary, ctx: IXamlLoadContext) {
        var cur = createObject(el, ctx);
        var key = getElementKey(el);
        if (key) {
            rd.Set(key, cur);
        } else {
            if (!(cur instanceof Style))
                throw new XamlParseException("An object in a ResourceDictionary must have x:Key.");
            var targetType = cur.TargetType;
            if (!targetType)
                throw new XamlParseException("A Style in a ResourceDictionary must have x:Key or TargetType.");
            rd.Set(targetType, cur);
        }
    }
    function getElementKey(el: Element): string {
        var attrs = el.attributes;
        var keyn = attrs.getNamedItemNS(Fayde.XMLNSX, "Key");
        if (keyn)
            return keyn.value;
        var keyn = attrs.getNamedItemNS(Fayde.XMLNSX, "Name");
        if (keyn)
            return keyn.value;
        return "";
    }


    /// XML UTILITIES
    function getElementNS(parentEl: Element, namespaceURI: string, localName: string): Element {
        var nsUri: string;
        var curElement = parentEl.firstElementChild;
        while (curElement) {
            nsUri = curElement.namespaceURI || Fayde.XMLNS;
            if (nsUri === namespaceURI && curElement.localName === localName)
                return curElement;
            curElement = curElement.nextElementSibling;
        }
        return null;
    }
}