﻿/// <reference path="ButtonBase.js"/>
/// CODE
/// <reference path="Style.js"/>
/// <reference path="JsonParser.js"/>
/// <reference path="Brushes.js"/>
/// <reference path="Primitives.js"/>

//#region Button

function Button() {
    ButtonBase.call(this);
    this._ElementRoot = null;
    this._ElementFocusVisual = null;
    this._StateNormal = null;
    this.SetIsTabStop(false);
}
Button.InheritFrom(ButtonBase);

Button.StateDisabled = "";
Button.StatePressed = "";
Button.StateMouseOver = "";
Button.StateNormal = "";
Button.StateFocused = "";
Button.StateUnfocused = "";

Button.prototype.OnApplyTemplate = function () {
    ButtonBase.prototype.OnApplyTemplate.call(this);

    this.UpdateVisualState(false);
};
Button.prototype.ChangeVisualState = function (useTransitions) {
    if (!this.GetIsEnabled()) {
        this._GoToState(useTransitions, Button.StateDisabled);
    } else if (this.GetIsPressed()) {
        this._GoToState(useTransitions, Button.StatePressed);
    } else if (this.GetIsMouseOver()) {
        this._GoToState(useTransitions, Button.StateMouseOver);
    } else {
        this._GoToState(useTransitions, Button.StateNormal);
    }

    if (this.GetIsFocused() && this.GetIsEnabled()) {
        this._GoToState(useTransitions, Button.StateFocused);
    } else {
        this._GoToState(useTransitions, Button.StateUnfocused);
    }
};
Button.prototype.OnIsEnabledChanged = function (e) {
    ButtonBase.prototype.OnIsEnabledChanged.call(this, e);
    this.SetIsTabStop(e.NewValue);
};

//#region DEFAULT STYLE

Button.prototype.GetDefaultStyle = function () {
    var style = {
        Type: Style,
        Props: {
            TargetType: Button
        },
        Children: [
            {
                Type: Setter,
                Props: {
                    Property: "Background",
                    Value: new SolidColorBrush(Color.FromHex("#FF1F3B53"))
                }
            },
            {
                Type: Setter,
                Props: {
                    Property: "Foreground",
                    Value: new SolidColorBrush(Color.FromHex("#FF000000"))
                }
            },
            {
                Type: Setter,
                Props: {
                    Property: "Padding",
                    Value: new Thickness(3, 3, 3, 3)
                }
            },
            {
                Type: Setter,
                Props: {
                    Property: "BorderThickness",
                    Value: new Thickness(1, 1, 1, 1)
                }
            },
            {
                Type: Setter,
                Props: {
                    Property: "BorderBrush",
                    Value: {
                        Type: LinearGradientBrush,
                        Props: {
                            StartPoint: new Point(0.5, 1),
                            EndPoint: new Point(0.5, 1),
                            GradientStops: [
                                {
                                    Type: GradientStop,
                                    Props: {
                                        Color: Color.FromHex("#FFA3AEB9"),
                                        Offset: 0.0
                                    }
                                },
                                {
                                    Type: GradientStop,
                                    Props: {
                                        Color: Color.FromHex("#FF8399A9"),
                                        Offset: 0.375
                                    }
                                },
                                {
                                    Type: GradientStop,
                                    Props: {
                                        Color: Color.FromHex("#FF718597"),
                                        Offset: 0.375
                                    }
                                },
                                {   
                                    Type: GradientStop,
                                    Props: {
                                        Color: Color.FromHex("#FF617584"),
                                        Offset: 1.0
                                    }
                                }
                            ]
                        }
                    }
                }
            },
            {
                Type: Setter,
                Props: {
                    Property: "Template",
                    Value: new ControlTemplate(Button, {
                        Type: Grid,
                        Children: [
                            {
                                Type: Border,
                                Name: "Background",
                                Props: {
                                    CornerRadius: new CornerRadius(3, 3, 3, 3),
                                    Background: new SolidColorBrush(Color.FromHex("#FFFFFFFF")),
                                    BorderThickness: new TemplateBinding("BorderThickness"),
                                    BorderBrush: new TemplateBinding("BorderBrush")
                                },
                                Content: {
                                    Type: Grid,
                                    Props: {
                                        Background: new TemplateBinding("Background"),
                                        Margin: new Thickness(1, 1, 1, 1)
                                    },
                                    Children: [
                                        {
                                            Type: Border,
                                            Name: "BackgroundAnimation",
                                            Props: {
                                                Opacity: 0.0,
                                                Background: new SolidColorBrush(Color.FromHex("#FF448DCA"))
                                            }
                                        },
                                        {
                                            Type: Border,
                                            Name: "BackgroundGradient",
                                            Props: {
                                                Background: {
                                                    Type: LinearGradientBrush,
                                                    Props: {
                                                        StartPoint: new Point(0.7, 0.0),
                                                        EndPoint: new Point(0.7, 1.0),
                                                        GradientStops: [
                                                            {
                                                                Type: GradientStop,
                                                                Props: {
                                                                    Color: Color.FromHex("#FFFFFFFF"),
                                                                    Offset: 0.0
                                                                }
                                                            },
                                                            {
                                                                Type: GradientStop,
                                                                Props: {
                                                                    Color: Color.FromHex("#F9FFFFFF"),
                                                                    Offset: 0.375
                                                                }
                                                            },
                                                            {
                                                                Type: GradientStop,
                                                                Props: {
                                                                    Color: Color.FromHex("#E5FFFFFF"),
                                                                    Offset: 0.625
                                                                }
                                                            },
                                                            {   
                                                                Type: GradientStop,
                                                                Props: {
                                                                    Color: Color.FromHex("#C6FFFFFF"),
                                                                    Offset: 1.0
                                                                }
                                                            }
                                                        ]
                                                    },
                                                }
                                            }
                                        }
                                    ]
                                }
                            },
                            {
                                Type: ContentPresenter,
                                Name: "contentPresenter",
                                Props: {
                                    Content: new TemplateBinding("Content"),
                                    ContentTemplate: new TemplateBinding("ContentTemplate"),
                                    VerticalAlignment: new TemplateBinding("VerticalContentAlignment"),
                                    HorizontalAlignment: new TemplateBinding("HorizontalContentAlignment"),
                                    Margin: new TemplateBinding("Padding")
                                }
                            }
                            //DisabledVisualElement
                            //FocusVisualElement
                        ]
                    })
                }
            }
        ]
    };
    return style;
};

//#endregion

//#endregion