/// <reference path="DependencyObject.js" />
/// CODE
/// <reference path="../Core/DependencyProperty.js" />
/// <reference path="Canvas.js" />
/// <reference path="../Engine/Dirty.js"/>
/// <reference path="../Engine/App.js"/>
/// <reference path="../Core/Collections/Collection.js"/>
/// <reference path="../Media/Geometry.js"/>
/// <reference path="../Media/Brush.js"/>
/// <reference path="RequestBringIntoViewEventArgs.js"/>
/// <reference path="../Media/MatrixTransform.js"/>
/// <reference path="Enums.js"/>
/// <reference path="../Engine/RenderContext.js"/>
/// <reference path="../Primitives/Matrix3D.js"/>
/// <reference path="../Primitives/Rect.js"/>
/// <reference path="../Primitives/Thickness.js"/>

//#region UIElement
var UIElement = Nullstone.Create("UIElement", DependencyObject);

UIElement.Instance.Init = function () {
    this.Init$DependencyObject();

    this.Unloaded = new MulticastEvent();
    this.Loaded = new MulticastEvent();
    this.Invalidated = new MulticastEvent();

    this._Providers[_PropertyPrecedence.Inherited] = new _InheritedPropertyValueProvider(this, _PropertyPrecedence.Inherited);

    this._Flags = UIElementFlags.RenderVisible | UIElementFlags.HitTestVisible;

    this._HiddenDesire = new Size(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
    this._Bounds = new Rect();
    this._GlobalBounds = new Rect();
    this._SurfaceBounds = new Rect();

    this._DirtyFlags = _Dirty.Measure;
    this._PropagateFlagUp(UIElementFlags.DirtyMeasureHint);
    this._UpDirtyNode = this._DownDirtyNode = null;
    this._ForceInvalidateOfNewBounds = false;
    this._DirtyRegion = new Rect();
    this._DesiredSize = new Size();
    this._RenderSize = new Size();
    this._EffectPadding = new Thickness();

    this._AbsoluteXform = new Matrix();
    this._LayoutXform = new Matrix();
    this._LocalXform = new Matrix();
    this._RenderXform = new Matrix();
    this._CacheXform = new Matrix();

    this._LocalProjection = new Matrix3D();
    this._AbsoluteProjection = new Matrix3D();
    this._RenderProjection = new Matrix3D();

    this._ComputeLocalTransform();
    this._ComputeLocalProjection();
    this._ComputeTotalRenderVisibility();
    this._ComputeTotalHitTestVisibility();

    this.MouseMove = new MulticastEvent();
    this.MouseMove.Subscribe(this.OnMouseMove, this);

    this.MouseLeftButtonDown = new MulticastEvent();
    this.MouseLeftButtonDown.Subscribe(this.OnMouseLeftButtonDown, this);

    this.MouseLeftButtonUp = new MulticastEvent();
    this.MouseLeftButtonUp.Subscribe(this.OnMouseLeftButtonUp, this);

    this.MouseRightButtonDown = new MulticastEvent();
    this.MouseRightButtonDown.Subscribe(this.OnMouseRightButtonDown, this);

    this.MouseRightButtonUp = new MulticastEvent();
    this.MouseRightButtonUp.Subscribe(this.OnMouseRightButtonUp, this);

    this.MouseEnter = new MulticastEvent();
    this.MouseLeave = new MulticastEvent();

    this.MouseWheel = new MulticastEvent();
    this.MouseWheel.Subscribe(this.OnMouseWheel, this);

    this.LostMouseCapture = new MulticastEvent();
    this.LostMouseCapture.Subscribe(this.OnLostMouseCapture, this);

    this.GotFocus = new MulticastEvent();
    this.GotFocus.Subscribe(this.OnGotFocus, this);

    this.LostFocus = new MulticastEvent();
    this.LostFocus.Subscribe(this.OnLostFocus, this);

    this.KeyDown = new MulticastEvent();
    this.KeyUp = new MulticastEvent();

    this.RequestBringIntoView = new MulticastEvent();

    this.VisualParentChanged = new MulticastEvent();
};

//#region Properties

UIElement.ClipProperty = DependencyProperty.RegisterCore("Clip", function () { return Geometry; }, UIElement);
//UIElement.CacheModeProperty;
UIElement.EffectProperty = DependencyProperty.Register("Effect", function () { return Effect; }, UIElement);
UIElement.IsHitTestVisibleProperty = DependencyProperty.RegisterCore("IsHitTestVisible", function () { return Boolean; }, UIElement, true);
UIElement.OpacityMaskProperty = DependencyProperty.RegisterCore("OpacityMask", function () { return Brush; }, UIElement);
UIElement.OpacityProperty = DependencyProperty.RegisterCore("Opacity", function () { return Number; }, UIElement, 1.0);
//UIElement.ProjectionProperty;
//UIElement.RenderTransformProperty;
//UIElement.RenderTransformOriginProperty;
//UIElement.AllowDropProperty;
UIElement.CursorProperty = DependencyProperty.RegisterFull("Cursor", function () { return new Enum(CursorType); }, UIElement, CursorType.Default, undefined); //, UIElement._CoerceCursor);
UIElement.ResourcesProperty = DependencyProperty.RegisterFull("Resources", function () { return ResourceDictionary; }, UIElement, undefined, { GetValue: function () { return new ResourceDictionary(); } });
UIElement.TriggersProperty = DependencyProperty.RegisterFull("Triggers", function () { return Object; }, UIElement/*, undefined, { GetValue: function () { } }*/);
UIElement.UseLayoutRoundingProperty = DependencyProperty.RegisterCore("UseLayoutRounding", function () { return Boolean; }, UIElement, true);
UIElement.VisibilityProperty = DependencyProperty.RegisterCore("Visibility", function () { return new Enum(Visibility); }, UIElement, Visibility.Visible);
UIElement.TagProperty = DependencyProperty.Register("Tag", function () { return Object; }, UIElement);

UIElement.IsMouseOverProperty = DependencyProperty.RegisterReadOnlyCore("IsMouseOver", function () { return Boolean; }, UIElement);

Nullstone.AutoProperties(UIElement, [
    UIElement.ClipProperty,
    UIElement.EffectProperty,
    UIElement.IsHitTestVisibleProperty,
    UIElement.OpacityMaskProperty,
    UIElement.OpacityProperty,
    UIElement.CursorProperty,
    UIElement.ResourcesProperty,
    UIElement.TriggersProperty,
    UIElement.UseLayoutRoundingProperty,
    UIElement.VisibilityProperty,
    UIElement.TagProperty
]);

Nullstone.AutoPropertiesReadOnly(UIElement, [
    UIElement.IsMouseOverProperty
]);

//#endregion

UIElement.Instance.BringIntoView = function (rect) {
    if (!rect) rect = new Rect();
    var args = new RequestBringIntoViewEventArgs(this, rect);

    var cur = this;
    while (cur && !args.Handled) {
        cur.RequestBringIntoView.Raise(this, args);
        cur = VisualTreeHelper.GetParent(cur);
    }
};
UIElement.Instance.SetVisualParent = function (value) {
    /// <param name="value" type="UIElement"></param>
    this._VisualParent = value;
    this.VisualParentChanged.Raise(this, new EventArgs());
};
UIElement.Instance.GetVisualParent = function () {
    /// <returns type="UIElement" />
    return this._VisualParent;
};
UIElement.Instance.GetVisualRoot = function () {
    var visualParent = this.GetVisualParent();
    if (visualParent)
        return visualParent.GetVisualRoot();
    return visualParent;
};
UIElement.Instance.IsLayoutContainer = function () { return false; };
UIElement.Instance.IsContainer = function () { return this.IsLayoutContainer(); };
UIElement.Instance.IsAncestorOf = function (el) {
    /// <param name="el" type="UIElement"></param>
    var parent = el;
    while (parent && !Nullstone.RefEquals(parent, this))
        parent = VisualTreeHelper.GetParent(parent);
    return Nullstone.RefEquals(parent, this);
};
UIElement.Instance.TransformToVisual = function (uie) {
    /// <param name="uie" type="UIElement"></param>
    var visual = this;
    var ok = false;
    var surface = App.Instance.MainSurface;
    if (this._IsAttached) {
        while (visual) {
            if (surface._IsTopLevel(visual))
                ok = true;
            visual = visual.GetVisualParent();
        }
    }

    if (!ok || (uie && !uie._IsAttached)) {
        throw new ArgumentException("UIElement not attached.");
        return null;
    }

    if (uie && !surface._IsTopLevel(uie)) {
        ok = false;
        visual = uie.GetVisualParent();
        if (visual && uie._IsAttached) {
            while (visual) {
                if (surface._IsTopLevel(visual))
                    ok = true;
                visual = visual.GetVisualParent();
            }
        }
        if (!ok) {
            throw new ArgumentException("UIElement not attached.");
            return null;
        }
    }

    //1. invert transform from input element to top level
    //2. transform back down to this element
    var result = new Matrix3D();
    // A = From, B = To, M = what we want
    // A = M * B
    // => M = A * inv (B)
    if (uie) {
        var inverse = uie._AbsoluteProjection.Inverse;
        Matrix3D.Multiply(result, this._AbsoluteProjection, inverse);
    } else {
        Matrix3D.Init(result, this._AbsoluteProjection);
    }

    var matrix = Matrix3D.Get2DAffine(result);
    if (matrix) {
        var mt = new MatrixTransform();
        mt._SetValue(MatrixTransform.MatrixProperty, matrix);
        return mt;
    }

    var it = new InternalTransform();
    it._SetTransform(result);
    return it;
};

UIElement.Instance._GetSizeForBrush = function () {
    AbstractMethod("UIElement._GetSizeForBrush");
};
UIElement.Instance._GetTransformOrigin = function () {
    return new Point(0, 0);
};
UIElement.Instance._ShiftPosition = function (point) {
    this._Bounds.X = point.X;
    this._Bounds.Y = point.Y;
};

//#region Invalidation

UIElement.Instance._CacheInvalidateHint = function () {
    //Intentionally empty
};
UIElement.Instance._FullInvalidate = function (renderTransform) {
    this._Invalidate();
    if (renderTransform) {
        this._UpdateTransform();
        this._UpdateProjection();
    }
    this._UpdateBounds(true);
};
UIElement.Instance._Invalidate = function (rect) {
    if (!rect)
        rect = this.GetBounds();
    if (!this._GetRenderVisible() || this._IsOpacityInvisible())
        return;

    if (this._IsAttached) {
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.Invalidate);
        this._InvalidateBitmapCache();
        if (false) {
            //TODO: Render Intermediate not implemented
            this._DirtyRegion = this._DirtyRegion.Union(this._GetSubtreeBounds());
        } else {
            this._DirtyRegion = this._DirtyRegion.Union(rect);
        }
        this._OnInvalidated();
    }
};
UIElement.Instance._InvalidateMeasure = function () {
    this._DirtyFlags |= _Dirty.Measure;
    this._PropagateFlagUp(UIElementFlags.DirtyMeasureHint);
    //TODO: Alert redraw necessary
};
UIElement.Instance._InvalidateArrange = function () {
    this._DirtyFlags |= _Dirty.Arrange;
    this._PropagateFlagUp(UIElementFlags.DirtyArrangeHint);
    //TODO: Alert redraw necessary
};
UIElement.Instance._InvalidateVisibility = function () {
    this._UpdateTotalRenderVisibility();
    this._InvalidateParent(this._GetSubtreeBounds());
};
UIElement.Instance._InvalidateSubtreePaint = function () {
    this._Invalidate(this._GetSubtreeBounds());
};
UIElement.Instance._InvalidateParent = function (r) {
    var visualParent = this.GetVisualParent();
    if (visualParent)
        visualParent._Invalidate(r);
    else if (this._IsAttached)
        App.Instance.MainSurface._Invalidate(r);
};
UIElement.Instance._InvalidateClip = function () {
    this._InvalidateParent(this._GetSubtreeBounds());
    this._UpdateBounds(true);
    this._ComputeComposite();
};
UIElement.Instance._InvalidateEffect = function () {
    var effect = this.Effect;
    var oldPadding = this._EffectPadding;
    if (effect)
        this._EffectPadding = effect.Padding();
    else
        this._EffectPadding = new Thickness();

    this._InvalidateParent(this._GetSubtreeBounds());

    if (!Thickness.Equals(oldPadding, this._EffectPadding))
        this._UpdateBounds();

    this._ComputeComposite();
};
UIElement.Instance._InvalidateBitmapCache = function () {
    //NotImplemented("UIElement._InvalidateBitmapCache");
};

//#endregion

//#region Updates/Computes

UIElement.Instance._UpdateBounds = function (forceRedraw) {
    if (this._IsAttached)
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.Bounds);
    this._ForceInvalidateOfNewBounds = this._ForceInvalidateOfNewBounds || forceRedraw;
};
UIElement.Instance._UpdateTransform = function () {
    if (this._IsAttached)
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.LocalTransform);
};
UIElement.Instance._UpdateProjection = function () {
    if (this._IsAttached)
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.LocalProjection);
};

UIElement.Instance._ComputeBounds = function () {
    AbstractMethod("UIElement._ComputeBounds()");
};
UIElement.Instance._ComputeGlobalBounds = function () {
    this._GlobalBounds = this._IntersectBoundsWithClipPath(this._Extents.GrowByThickness(this._EffectPadding), false).Transform(this._LocalProjection);
};
UIElement.Instance._ComputeSurfaceBounds = function () {
    this._SurfaceBounds = this._IntersectBoundsWithClipPath(this._Extents.GrowByThickness(this._EffectPadding), false).Transform(this._AbsoluteProjection);
};
UIElement.Instance._ComputeTransform = function () {
    var projection = this.Projection;
    var cacheMode = this.CacheMode;

    var oldProjection = new Matrix3D();
    Matrix3D.Init(oldProjection, this._LocalProjection);
    var old = this._AbsoluteXform;
    var oldCache = this._CacheXform;

    this._AbsoluteXform = new Matrix();
    this._RenderXform = new Matrix();
    this._CacheXform = new Matrix();
    this._AbsoluteProjection = new Matrix3D();
    this._LocalProjection = new Matrix3D();

    var visualParent = this.GetVisualParent();
    if (visualParent != null) {
        this._AbsoluteXform = visualParent._AbsoluteXform.Copy();
        Matrix3D.Init(this._AbsoluteProjection, visualParent._AbsoluteProjection);
    } else if (this._Parent != null && this._Parent instanceof Popup) {
        throw new NotImplementedException();
    }

    var renderXform = this._RenderXform;
    Matrix.Multiply(renderXform, this._LayoutXform, renderXform);
    Matrix.Multiply(renderXform, this._LocalXform, renderXform);

    var m = Matrix3D.CreateAffine(renderXform);
    Matrix3D.Multiply(this._LocalProjection, m, this._LocalProjection);

    if (false) {
        //TODO: Render To Intermediate not implemented
    } else {
        Matrix.Multiply(this._AbsoluteXform, this._RenderXform, this._AbsoluteXform);
    }

    if (projection) {
        m = projection.GetTransform();
        Matrix3D.Multiply(this._LocalProjection, m, this._LocalProjection);
        this._Flags |= UIElementFlags.RenderProjection;
    }

    Matrix3D.Multiply(this._AbsoluteProjection, this._LocalProjection, this._AbsoluteProjection);

    if (this instanceof Popup) {
        var popupChild = this.Child;
        if (popupChild)
            popupChild._UpdateTransform();
    }

    if (!Matrix3D.Equals(oldProjection, this._LocalProjection)) {
        if (visualParent)
            visualParent._Invalidate(this._GetSubtreeBounds());
        else if (App.Instance.MainSurface._IsTopLevel(this))
            this._InvalidateSubtreePaint();

        if (this._IsAttached)
            App.Instance.MainSurface._AddDirtyElement(this, _Dirty.NewBounds);
    }

    if (cacheMode) {
        if (!this.Effect)
            cacheMode.GetTransform(this._CacheXform);

        if (!Matrix3D.Equals(oldCache, this._CacheXform))
            this._InvalidateBitmapCache();

        var inverse = this._CacheXform.Inverse;

        m = Matrix3D.CreateAffine(inverse);
        Matrix3D.Multiply(this._RenderProjection, m, this._LocalProjection);
    } else {
        Matrix3D.Init(this._RenderProjection, this._LocalProjection);
    }

    if (/* RUNTIME_INIT_USE_UPDATE_POSITION */false && !(this._DirtyFlags & _Dirty.Bounds)) {
        this._TransformBounds(old, this._AbsoluteXform);
    } else {
        this._UpdateBounds();
    }

    this._ComputeComposite();
};
UIElement.Instance._ComputeLocalTransform = function () {
    var transform = this.RenderTransform;
    if (!transform)
        return;

    var transformOrigin = this._GetTransformOrigin();
    this._LocalXform = new Matrix();
    this._RenderXform = new Matrix();
    transform.GetTransform(this._RenderXform);

    Matrix.Translate(this._LocalXform, transformOrigin.X, transformOrigin.Y);
    Matrix.Multiply(this._LocalXform, this._RenderXform, this._LocalXform);
    Matrix.Translate(this._LocalXform, -transformOrigin.X, -transformOrigin.Y);
};
UIElement.Instance._ComputeLocalProjection = function () {
    var projection = this.Projection;
    if (!projection) {
        Canvas.SetZ(this, NaN);
        return;
    }

    var size = this._GetSizeForBrush();
    projection._SetObjectSize(size.Width, size.Height);
    Canvas.SetZ(this, projection._GetDistanceFromXYPlane());
};
UIElement.Instance._ComputeComposite = function () {
    //NotImplemented("UIElement._ComputeComposite");
};

UIElement.Instance._IntersectBoundsWithClipPath = function (unclipped, transform) {
    /// <returns type="Rect" />
    var clip = this.Clip;
    var layoutClip = transform ? undefined : LayoutInformation.GetLayoutClip(this);
    var box;

    if (!clip && !layoutClip)
        return unclipped;
    if (clip)
        box = clip.GetBounds();
    else
        box = layoutClip.GetBounds();

    if (layoutClip)
        box = box.Intersection(layoutClip.GetBounds());

    if (!this._GetRenderVisible())
        box = new Rect(0, 0, 0, 0);

    if (transform)
        box = box.Transform(this._AbsoluteXform);

    return box.Intersection(unclipped);
};
UIElement.Instance._TransformBounds = function (old, current) {
    var updated = new Rect();

    var tween = new Matrix();
    Matrix.Multiply(tween, old.Inverse, current);

    var p0 = new Point(0, 0);
    var p1 = new Point(1, 0);
    var p2 = new Point(1, 1);
    var p3 = new Point(0, 1);

    var p0a = new Point();
    Matrix.TransformPoint(p0a, tween, p0);
    p0.X = p0.X - p0a.X;
    p0.Y = p0.Y - p0a.Y;

    var p1a = new Point();
    Matrix.TransformPoint(p1a, tween, p1);
    p1.X = p1.X - p1a.X;
    p1.Y = p1.Y - p1a.Y;

    var p2a = new Point();
    Matrix.TransformPoint(p2a, tween, p2);
    p2.X = p2.X - p2a.X;
    p2.Y = p2.Y - p2a.Y;

    var p3a = new Point();
    Matrix.TransformPoint(p3a, tween, p3);
    p3.X = p3.X - p3a.X;
    p3.Y = p3.Y - p3a.Y;

    if (Point.Equals(p0, p1) && Point.Equals(p1, p2) && Point.Equals(p2, p3)) {
        this._ShiftPosition(new Point(this._Bounds.X, this._Bounds.Y).Transform(tween));
        this._ComputeGlobalBounds();
        this._ComputeSurfaceBounds();
        return;
    }

    this._UpdateBounds();
};

//#endregion

//#region Render Visibility

UIElement.Instance._ComputeTotalRenderVisibility = function () {
    if (this._GetActualTotalRenderVisibility())
        this._Flags |= UIElementFlags.TotalRenderVisible;
    else
        this._Flags &= ~UIElementFlags.TotalRenderVisible;
};
UIElement.Instance._UpdateTotalRenderVisibility = function () {
    if (this._IsAttached)
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.RenderVisibility);
};
UIElement.Instance._GetActualTotalRenderVisibility = function () {
    var visible = (this._Flags & UIElementFlags.RenderVisible) != 0;
    var parentVisible = true;
    this._TotalOpacity = this.Opacity;

    var visualParent = this.GetVisualParent();
    if (visualParent) {
        visualParent._ComputeTotalRenderVisibility();
        parentVisible = visible && visualParent._GetRenderVisible();
        this._TotalOpacity *= visualParent._TotalOpacity;
    }
    visible = visible && parentVisible;
    return visible;
};
UIElement.Instance._GetRenderVisible = function () {
    return (this._Flags & UIElementFlags.TotalRenderVisible) != 0;
};

//#endregion

//#region Total Hit Test Visibility

UIElement.Instance._ComputeTotalHitTestVisibility = function () {
    if (this._GetActualTotalHitTestVisibility())
        this._Flags |= UIElementFlags.TotalHitTestVisible;
    else
        this._Flags &= ~UIElementFlags.TotalHitTestVisible;
};
UIElement.Instance._UpdateTotalHitTestVisibility = function () {
    if (this._IsAttached)
        App.Instance.MainSurface._AddDirtyElement(this, _Dirty.HitTestVisibility);
};
UIElement.Instance._GetActualTotalHitTestVisibility = function () {
    var visible = (this._Flags & UIElementFlags.HitTestVisible) != 0;
    var visualParent;
    if (visible && (visualParent = this.GetVisualParent())) {
        visualParent._ComputeTotalRenderVisibility();
        visible = visible && visualParent._GetIsHitTestVisible();
    }
    return visible;
};

//#endregion

//#region Hit Testing

UIElement.Instance._GetIsHitTestVisible = function () {
    return (this._Flags & UIElementFlags.TotalHitTestVisible) != 0;
};
UIElement.Instance._HitTestPoint = function (ctx, p, uielist) {
    uielist.Prepend(new UIElementNode(this));
};
UIElement.Instance._InsideObject = function (ctx, x, y) {
    return this._InsideClip(ctx, x, y);
};
UIElement.Instance._InsideClip = function (ctx, x, y) {
    var clip = this.Clip;
    if (!clip)
        return true;

    var np = new Point(x, y);
    this._TransformPoint(np);

    if (!clip.GetBounds().ContainsPoint(np))
        return false;

    return ctx.IsPointInClipPath(clip, np);
};
UIElement.Instance._TransformPoint = function (p) {
    /// <param name="p" type="Point"></param>
    var inverse = this._AbsoluteProjection.Inverse;
    if (inverse == null) {
        Warn("Could not get inverse of Absolute Projection for UIElement.");
        return;
    }

    var p4 = [
        p.X,
        p.Y,
        -(inverse._Elements[8] * p.X + inverse._Elements[8] * p.Y + inverse._Elements[11]) / inverse._Elements[10],
        1.0
    ];
    Matrix3D.TransformPoint(p4, inverse, p4);
    p.X = p4[0] / p4[3];
    p.Y = p4[1] / p4[3];
};
UIElement.Instance._CanFindElement = function () {
    return false;
};

//#endregion

//#region Measurements

UIElement.Instance.GetBounds = function () {
    return this._SurfaceBounds;
};
UIElement.Instance._GetGlobalBounds = function () {
    return this._GlobalBounds;
};
UIElement.Instance._GetCoverageBounds = function () {
    /// <returns type="Rect" />
    return new Rect();
};
UIElement.Instance._GetSubtreeObject = function () {
    return this._SubtreeObject;
};
UIElement.Instance._SetSubtreeObject = function (value) {
    this._SubtreeObject = value;
};
UIElement.Instance._GetSubtreeExtents = function () {
    /// <returns type="Rect" />
    AbstractMethod("UIElement._GetSubtreeExtents()");
};
UIElement.Instance._GetSubtreeBounds = function () {
    return this._SurfaceBounds;
};
UIElement.Instance._SetRenderSize = function (value) {
    this._RenderSize = value;
};
UIElement.Instance._GetRenderSize = function () {
    return this._RenderSize;
};
UIElement.Instance._GetOriginPoint = function () {
    return new Point(0.0, 0.0);
};

//#endregion

//#region Measure

UIElement.Instance._DoMeasureWithError = function (error) {
    var last = LayoutInformation.GetPreviousConstraint(this);
    var parent = this.GetVisualParent();
    var infinite = new Size(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);

    if (!this._IsAttached && !last && !parent && this.IsLayoutContainer()) {
        last = infinite;
    }

    if (last) {
        var previousDesired = this._DesiredSize;
        this._MeasureWithError(last, error);
        if (Size.Equals(previousDesired, this._DesiredSize))
            return;
    }

    if (parent)
        parent._InvalidateMeasure();

    this._DirtyFlags &= ~_Dirty.Measure;
};
UIElement.Instance.Measure = function (availableSize) {
    var error = new BError();
    this._MeasureWithError(availableSize, error);
};
UIElement.Instance._MeasureWithError = function (availableSize, error) { };

//#endregion

//#region Arrange

UIElement.Instance._DoArrangeWithError = function (error) {
    var last = this._ReadLocalValue(LayoutInformation.LayoutSlotProperty);
    if (last === null)
        last = undefined;
    var parent = this.GetVisualParent();

    if (!parent) {
        var desired = new Size();
        var surface = App.Instance.MainSurface;

        if (this.IsLayoutContainer()) {
            desired = this._DesiredSize;
            if (this._IsAttached && surface._IsTopLevel(this) && !this._GetParent()) {
                var measure = LayoutInformation.GetPreviousConstraint(this);
                if (measure)
                    desired = desired.Max(measure);
                else
                    desired = new Size(surface.GetWidth(), surface.GetHeight());
            }
        } else {
            desired = new Size(this.ActualWidth, this.ActualHeight);
        }

        viewport = new Rect(Canvas.GetLeft(this), Canvas.GetTop(this), desired.Width, desired.Height)

        last = viewport;
    }

    if (last) {
        this._ArrangeWithError(last, error);
    } else {
        if (parent)
            parent._InvalidateArrange();
    }
};
UIElement.Instance.Arrange = function (finalRect) {
    var error = new BError();
    this._ArrangeWithError(finalRect, error);
};
UIElement.Instance._ArrangeWithError = function (finalRect, error) { };

//#endregion

//#region Render

UIElement.Instance._DoRender = function (ctx, parentRegion) {
    /// <param name="ctx" type="_RenderContext"></param>
    if (!this._GetRenderVisible() || this._IsOpacityInvisible())
        return;

    var region;
    if (false) {
        //TODO: Render to intermediate
    } else {
        region = this._GetSubtreeExtents()
            .Transform(this._RenderXform)
            .Transform(ctx.GetCurrentTransform())
            .RoundOut()
            .Intersection(parentRegion);
    }

    if (region.IsEmpty())
        return;

    ctx.Save();

    ctx.Transform(this._RenderXform);
    ctx.SetGlobalAlpha(this._TotalOpacity);

    var canvasCtx = ctx.GetCanvasContext();
    var clip = this.Clip;
    if (clip) {
        clip.Draw(ctx);
        canvasCtx.clip();
    }

    RenderDebug.Count++;
    RenderDebug(this.__DebugToString());

    var effect = this.Effect;
    if (effect) {
        canvasCtx.save();
        effect.PreRender(ctx);
    }
    this._Render(ctx, region);
    if (effect) {
        canvasCtx.restore();
    }

    var walker = new _VisualTreeWalker(this, _VisualTreeWalkerDirection.ZForward);
    var child;
    while (child = walker.Step()) {
        child._DoRender(ctx, region);
    }

    ctx.Restore();
};
UIElement.Instance._Render = function (ctx, region) { };

//#endregion

//#region Loaded

UIElement.Instance._SetIsLoaded = function (value) {
    if (this._IsLoaded !== value) {
        this._IsLoaded = value;
        this._OnIsLoadedChanged(value);
    }
};
UIElement.Instance._OnIsLoadedChanged = function (loaded) {
    var iter;
    var v;
    if (!this._IsLoaded) {
        //WTF: ClearForeachGeneration(Loaded)
        this.Unloaded.Raise(this, new EventArgs());
        iter = new CollectionIterator(this.Resources);
        while (iter.Next()) {
            v = iter.GetCurrent();
            v = Nullstone.As(v, FrameworkElement);
            if (v)
                v._SetIsLoaded(loaded);
        }
    }

    var walker = new _VisualTreeWalker(this);
    var element;
    while (element = walker.Step()) {
        element._SetIsLoaded(loaded);
    }

    if (this._IsLoaded) {
        iter = new CollectionIterator(this.Resources);
        while (iter.Next()) {
            v = iter.GetCurrent();
            v = Nullstone.As(v, FrameworkElement);
            if (v)
                v._SetIsLoaded(loaded);
        }
        //WTF: AddAllLoadedHandlers
        this.Loaded.RaiseAsync(this, new EventArgs());
    }
};

//#endregion

//#region Visual State Changes

UIElement.Instance._OnIsAttachedChanged = function (value) {
    this._UpdateTotalRenderVisibility();

    if (this._SubtreeObject)
        this._SubtreeObject._SetIsAttached(value);

    this._OnIsAttachedChanged$DependencyObject(value);

    if (!value) {
        this._CacheInvalidateHint();

        var surface = App.Instance.MainSurface;
        if (surface) {
            surface._RemoveDirtyElement(this);
            if (surface._FocusedElement === this)
                surface._FocusElement(null);
        }
    }
};
UIElement.Instance._OnInvalidated = function () {
    this.Invalidated.Raise(this, null);
};
UIElement.Instance._ElementRemoved = function (item) {
    this._Invalidate(item._GetSubtreeBounds());
    item.SetVisualParent(null);
    item._SetIsLoaded(false);
    item._SetIsAttached(false);
    item.SetMentor(null);

    var emptySlot = new Rect();
    LayoutInformation.SetLayoutSlot(item, emptySlot);
    item._ClearValue(LayoutInformation.LayoutClipProperty);

    this._InvalidateMeasure();

    this._Providers[_PropertyPrecedence.Inherited].ClearInheritedPropertiesOnRemovingFromTree(item);
}
UIElement.Instance._ElementAdded = function (item) {
    item.SetVisualParent(this);
    item._UpdateTotalRenderVisibility();
    item._UpdateTotalHitTestVisibility();
    item._Invalidate();

    this._Providers[_PropertyPrecedence.Inherited].PropagateInheritedPropertiesOnAddingToTree(item);
    item._SetIsAttached(this._IsAttached);
    item._SetIsLoaded(this._IsLoaded);
    var o = this;
    while (o && !(o instanceof FrameworkElement))
        o = o.GetMentor();
    item.SetMentor(o);

    this._UpdateBounds(true);

    this._InvalidateMeasure();
    this._ClearValue(LayoutInformation.LayoutClipProperty);
    this._ClearValue(LayoutInformation.PreviousConstraintProperty);
    item._SetRenderSize(new Size(0, 0));
    item._UpdateTransform();
    item._UpdateProjection();
    item._InvalidateMeasure();
    item._InvalidateArrange();
    if (item._HasFlag(UIElementFlags.DirtySizeHint) || item._ReadLocalValue(LayoutInformation.LastRenderSizeProperty) !== undefined)
        item._PropagateFlagUp(UIElementFlags.DirtySizeHint);
}

//#endregion

//#region Dirty Updates

UIElement.Instance._UpdateLayer = function (pass, error) {
    //Intentionally empty
};
UIElement.Instance._HasFlag = function (flag) { return (this._Flags & flag) == flag; };
UIElement.Instance._ClearFlag = function (flag) { this._Flags &= ~flag; };
UIElement.Instance._SetFlag = function (flag) { this._Flags |= flag; };
UIElement.Instance._PropagateFlagUp = function (flag) {
    this._SetFlag(flag);
    var el = this.GetVisualParent();
    while (el && !el._HasFlag(flag)) {
        el._SetFlag(flag);
        el = el.GetVisualParent();
    }
};

UIElement.Instance.__DebugDownDirtyFlags = function () {
    var t = new String();
    if (this._DirtyFlags & _Dirty.ChildrenZIndices)
        t = t.concat("[ChildrenZIndices]");
    if (this._DirtyFlags & _Dirty.Clip)
        t = t.concat("[Clip]");
    if (this._DirtyFlags & _Dirty.Transform)
        t = t.concat("[Transform]");
    if (this._DirtyFlags & _Dirty.LocalTransform)
        t = t.concat("[LocalTransform]");
    if (this._DirtyFlags & _Dirty.LocalProjection)
        t = t.concat("[LocalProjection]");
    if (this._DirtyFlags & _Dirty.RenderVisibility)
        t = t.concat("[RenderVisibility]");
    if (this._DirtyFlags & _Dirty.HitTestVisibility)
        t = t.concat("[HitTestVisibility]");
    return t;
};
UIElement.Instance.__DebugUpDirtyFlags = function () {
    var t = new String();
    if (this._DirtyFlags & _Dirty.Bounds)
        t = t.concat("[Bounds]");
    if (this._DirtyFlags & _Dirty.NewBounds)
        t = t.concat("[NewBounds]");
    if (this._DirtyFlags & _Dirty.Invalidate)
        t = t.concat("[Invalidate]");
    return t;
};

//#endregion

//#region Property Changed

UIElement.Instance._OnPropertyChanged = function (args, error) {
    if (args.Property.OwnerType !== UIElement) {
        this._OnPropertyChanged$DependencyObject(args, error);
        return;
    }
    if (args.Property._ID === UIElement.OpacityProperty._ID) {
        this._InvalidateVisibility();
    } else if (args.Property._ID === UIElement.VisibilityProperty._ID) {
        if (args.NewValue === Visibility.Visible)
            this._Flags |= UIElementFlags.RenderVisible;
        else
            this._Flags &= ~UIElementFlags.RenderVisible;
        this._InvalidateVisibility();
        this._InvalidateMeasure();
        var parent = this.GetVisualParent();
        if (parent)
            parent._InvalidateMeasure();
        App.Instance.MainSurface._RemoveFocus(this);
    } else if (args.Property._ID === UIElement.IsHitTestVisibleProperty._ID) {
        if (args.NewValue === true) {
            this._Flags |= UIElementFlags.HitTestVisible;
        } else {
            this._Flags &= ~UIElementFlags.HitTestVisible;
        }
        this._UpdateTotalHitTestVisibility();
    } else if (args.Property._ID === UIElement.ClipProperty._ID) {
        this._InvalidateClip();
    } else if (args.Property._ID === UIElement.UseLayoutRoundingProperty._ID) {
        this._InvalidateMeasure();
        this._InvalidateArrange();
    } else if (args.Property._ID === UIElement.EffectProperty._ID) {
        var oldEffect = args.OldValue != null;
        var newEffect = args.NewValue != null;
        this._InvalidateEffect();
        if (oldEffect !== newEffect && this._IsAttached)
            App.Instance.MainSurface._AddDirtyElement(this, _Dirty.Transform);
    }
    //TODO: Check invalidation of some properties
    this.PropertyChanged.Raise(this, args);
};
UIElement.Instance._OnSubPropertyChanged = function (propd, sender, args) {
    if (propd._ID === UIElement.ClipProperty._ID) {
        this._InvalidateClip();
    } else if (propd._ID === UIElement.EffectProperty._ID) {
        this._InvalidateEffect();
    }
    this._OnSubPropertyChanged$DependencyObject(propd, sender, args);
};

//#endregion

//#region Mouse

UIElement.Instance.CanCaptureMouse = function () { return true; };
UIElement.Instance.CaptureMouse = function () {
    if (!this._IsAttached)
        return false;
    return App.Instance.MainSurface.SetMouseCapture(this);
};
UIElement.Instance.ReleaseMouseCapture = function () {
    if (!this._IsAttached)
        return;
    App.Instance.MainSurface.ReleaseMouseCapture(this);
};

UIElement.Instance._EmitEvent = function (type, button, args) {
    if (type === "up") {
        if (Surface.IsLeftButton(button)) {
            //HUDUpdate("clicky", "MouseLeftButtonUp " + absolutePos.toString());
            this.MouseLeftButtonUp.Raise(this, args);
        } else if (Surface.IsRightButton(button)) {
            //HUDUpdate("clicky", "MouseRightButtonUp " + absolutePos.toString());
            this.MouseRightButtonUp.Raise(this, args);
        }
    } else if (type === "down") {
        if (Surface.IsLeftButton(button)) {
            //HUDUpdate("clicky", "MouseLeftButtonDown " + absolutePos.toString());
            this.MouseLeftButtonDown.Raise(this, args);
        } else if (Surface.IsRightButton(button)) {
            //HUDUpdate("clicky", "MouseRightButtonDown " + absolutePos.toString());
            this.MouseRightButtonDown.Raise(this, args);
        }
    } else if (type === "leave") {
        this.$SetValueInternal(UIElement.IsMouseOverProperty, false);
        this.OnMouseLeave(args);
        this.MouseLeave.Raise(this, args);
    } else if (type === "enter") {
        this.$SetValueInternal(UIElement.IsMouseOverProperty, true);
        this.OnMouseEnter(args);
        this.MouseEnter.Raise(this, args);
    } else if (type === "move") {
        this.MouseMove.Raise(this, args);
    } else if (type === "wheel") {
        this.MouseWheel.Raise(this, args);
    } else {
        return false;
    }
    return args.Handled;
};

UIElement.Instance.OnMouseMove = function (sender, e) { };
UIElement.Instance.OnMouseLeftButtonDown = function (sender, e) { };
UIElement.Instance.OnMouseLeftButtonUp = function (sender, e) { };
UIElement.Instance.OnMouseRightButtonDown = function (sender, e) { };
UIElement.Instance.OnMouseRightButtonUp = function (sender, e) { };
UIElement.Instance.OnMouseEnter = function (e) { };
UIElement.Instance.OnMouseLeave = function (e) { };
UIElement.Instance.OnMouseWheel = function (sender, e) { };

UIElement.Instance._EmitLostMouseCapture = function (absolutePos) {
    this.LostMouseCapture.Raise(this, new MouseEventArgs(absolutePos));
};
UIElement.Instance.OnLostMouseCapture = function (sender, e) { };

//#endregion

//#region Keyboard

UIElement.Instance._EmitKeyDown = function (args) {
    this.OnKeyDown(args);
    this.KeyDown.Raise(this, args);
};
UIElement.Instance._EmitKeyUp = function (args) {
    this.OnKeyUp(args);
    this.KeyUp.Raise(this, args);
};

UIElement.Instance.OnKeyDown = function (args) { };
UIElement.Instance.OnKeyUp = function (args) { };

//#endregion

//#region Focus

UIElement.Instance.Focus = function (recurse) {
    return false;
};

UIElement.Instance._EmitFocusChange = function (type) {
    if (type === "got")
        this._EmitGotFocus();
    else if (type === "lost")
        this._EmitLostFocus();
};

UIElement.Instance._EmitGotFocus = function () {
    this.GotFocus.Raise(this, new EventArgs());
};
UIElement.Instance.OnGotFocus = function (sender, e) { };

UIElement.Instance._EmitLostFocus = function () {
    this.LostFocus.Raise(this, new EventArgs());
};
UIElement.Instance.OnLostFocus = function (sender, e) { };

//#endregion

UIElement.Instance._IsOpacityInvisible = function () {
    return this._TotalOpacity * 255 < .5;
};
UIElement.Instance._IsOpacityTranslucent = function () {
    return this._TotalOpacity * 255 < 245.5;
};
UIElement.ZIndexComparer = function (uie1, uie2) {
    var c = Canvas;
    var zi1 = c.GetZIndex(uie1);
    var zi2 = c.GetZIndex(uie2);
    if (zi1 == zi2) {
        var z1 = c.GetZ(uie1);
        var z2 = c.GetZ(uie2);
        if (isNaN(z1) || isNaN(z2))
            return 0;
        return z1 > z2 ? 1 : (z1 < z2 ? -1 : 0);
    }
    return zi1 - zi2;
};

UIElement.Instance.__DebugToString = function () {
    return this._ID + ":" + this.constructor._TypeName + ":" + this.Name;
};

Nullstone.FinishCreate(UIElement);
//#endregion