(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TweakpaneChromaticPlugin = {}));
})(this, (function (exports) { 'use strict';

    class BladeApi {
        constructor(controller) {
            this.controller_ = controller;
        }
        get element() {
            return this.controller_.view.element;
        }
        get disabled() {
            return this.controller_.viewProps.get('disabled');
        }
        set disabled(disabled) {
            this.controller_.viewProps.set('disabled', disabled);
        }
        get hidden() {
            return this.controller_.viewProps.get('hidden');
        }
        set hidden(hidden) {
            this.controller_.viewProps.set('hidden', hidden);
        }
        dispose() {
            this.controller_.viewProps.set('disposed', true);
        }
    }

    function forceCast(v) {
        return v;
    }
    function isEmpty(value) {
        return value === null || value === undefined;
    }

    class Emitter {
        constructor() {
            this.observers_ = {};
        }
        on(eventName, handler) {
            let observers = this.observers_[eventName];
            if (!observers) {
                observers = this.observers_[eventName] = [];
            }
            observers.push({
                handler: handler,
            });
            return this;
        }
        off(eventName, handler) {
            const observers = this.observers_[eventName];
            if (observers) {
                this.observers_[eventName] = observers.filter((observer) => {
                    return observer.handler !== handler;
                });
            }
            return this;
        }
        emit(eventName, event) {
            const observers = this.observers_[eventName];
            if (!observers) {
                return;
            }
            observers.forEach((observer) => {
                observer.handler(event);
            });
        }
    }

    const PREFIX = 'tp';
    function ClassName(viewName) {
        const fn = (opt_elementName, opt_modifier) => {
            return [
                PREFIX,
                '-',
                viewName,
                'v',
                opt_elementName ? `_${opt_elementName}` : '',
                opt_modifier ? `-${opt_modifier}` : '',
            ].join('');
        };
        return fn;
    }

    function compose(h1, h2) {
        return (input) => h2(h1(input));
    }
    function extractValue(ev) {
        return ev.rawValue;
    }
    function bindValue(value, applyValue) {
        value.emitter.on('change', compose(extractValue, applyValue));
        applyValue(value.rawValue);
    }
    function bindValueMap(valueMap, key, applyValue) {
        bindValue(valueMap.value(key), applyValue);
    }

    function applyClass(elem, className, active) {
        if (active) {
            elem.classList.add(className);
        }
        else {
            elem.classList.remove(className);
        }
    }
    function valueToClassName(elem, className) {
        return (value) => {
            applyClass(elem, className, value);
        };
    }

    class BoundValue {
        constructor(initialValue, config) {
            var _a;
            this.constraint_ = config === null || config === void 0 ? void 0 : config.constraint;
            this.equals_ = (_a = config === null || config === void 0 ? void 0 : config.equals) !== null && _a !== void 0 ? _a : ((v1, v2) => v1 === v2);
            this.emitter = new Emitter();
            this.rawValue_ = initialValue;
        }
        get constraint() {
            return this.constraint_;
        }
        get rawValue() {
            return this.rawValue_;
        }
        set rawValue(rawValue) {
            this.setRawValue(rawValue, {
                forceEmit: false,
                last: true,
            });
        }
        setRawValue(rawValue, options) {
            const opts = options !== null && options !== void 0 ? options : {
                forceEmit: false,
                last: true,
            };
            const constrainedValue = this.constraint_
                ? this.constraint_.constrain(rawValue)
                : rawValue;
            const prevValue = this.rawValue_;
            const changed = !this.equals_(prevValue, constrainedValue);
            if (!changed && !opts.forceEmit) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.rawValue_ = constrainedValue;
            this.emitter.emit('change', {
                options: opts,
                previousRawValue: prevValue,
                rawValue: constrainedValue,
                sender: this,
            });
        }
    }

    class PrimitiveValue {
        constructor(initialValue) {
            this.emitter = new Emitter();
            this.value_ = initialValue;
        }
        get rawValue() {
            return this.value_;
        }
        set rawValue(value) {
            this.setRawValue(value, {
                forceEmit: false,
                last: true,
            });
        }
        setRawValue(value, options) {
            const opts = options !== null && options !== void 0 ? options : {
                forceEmit: false,
                last: true,
            };
            const prevValue = this.value_;
            if (prevValue === value && !opts.forceEmit) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.value_ = value;
            this.emitter.emit('change', {
                options: opts,
                previousRawValue: prevValue,
                rawValue: this.value_,
                sender: this,
            });
        }
    }

    function createValue(initialValue, config) {
        const constraint = config === null || config === void 0 ? void 0 : config.constraint;
        const equals = config === null || config === void 0 ? void 0 : config.equals;
        if (!constraint && !equals) {
            return new PrimitiveValue(initialValue);
        }
        return new BoundValue(initialValue, config);
    }

    class ValueMap {
        constructor(valueMap) {
            this.emitter = new Emitter();
            this.valMap_ = valueMap;
            for (const key in this.valMap_) {
                const v = this.valMap_[key];
                v.emitter.on('change', () => {
                    this.emitter.emit('change', {
                        key: key,
                        sender: this,
                    });
                });
            }
        }
        static createCore(initialValue) {
            const keys = Object.keys(initialValue);
            return keys.reduce((o, key) => {
                return Object.assign(o, {
                    [key]: createValue(initialValue[key]),
                });
            }, {});
        }
        static fromObject(initialValue) {
            const core = this.createCore(initialValue);
            return new ValueMap(core);
        }
        get(key) {
            return this.valMap_[key].rawValue;
        }
        set(key, value) {
            this.valMap_[key].rawValue = value;
        }
        value(key) {
            return this.valMap_[key];
        }
    }

    function parseObject(value, keyToParserMap) {
        const keys = Object.keys(keyToParserMap);
        const result = keys.reduce((tmp, key) => {
            if (tmp === undefined) {
                return undefined;
            }
            const parser = keyToParserMap[key];
            const result = parser(value[key]);
            return result.succeeded
                ? Object.assign(Object.assign({}, tmp), { [key]: result.value }) : undefined;
        }, {});
        return forceCast(result);
    }
    function parseArray(value, parseItem) {
        return value.reduce((tmp, item) => {
            if (tmp === undefined) {
                return undefined;
            }
            const result = parseItem(item);
            if (!result.succeeded || result.value === undefined) {
                return undefined;
            }
            return [...tmp, result.value];
        }, []);
    }
    function isObject(value) {
        if (value === null) {
            return false;
        }
        return typeof value === 'object';
    }
    function createParamsParserBuilder(parse) {
        return (optional) => (v) => {
            if (!optional && v === undefined) {
                return {
                    succeeded: false,
                    value: undefined,
                };
            }
            if (optional && v === undefined) {
                return {
                    succeeded: true,
                    value: undefined,
                };
            }
            const result = parse(v);
            return result !== undefined
                ? {
                    succeeded: true,
                    value: result,
                }
                : {
                    succeeded: false,
                    value: undefined,
                };
        };
    }
    function createParamsParserBuilders(optional) {
        return {
            custom: (parse) => createParamsParserBuilder(parse)(optional),
            boolean: createParamsParserBuilder((v) => typeof v === 'boolean' ? v : undefined)(optional),
            number: createParamsParserBuilder((v) => typeof v === 'number' ? v : undefined)(optional),
            string: createParamsParserBuilder((v) => typeof v === 'string' ? v : undefined)(optional),
            function: createParamsParserBuilder((v) =>
            typeof v === 'function' ? v : undefined)(optional),
            constant: (value) => createParamsParserBuilder((v) => (v === value ? value : undefined))(optional),
            raw: createParamsParserBuilder((v) => v)(optional),
            object: (keyToParserMap) => createParamsParserBuilder((v) => {
                if (!isObject(v)) {
                    return undefined;
                }
                return parseObject(v, keyToParserMap);
            })(optional),
            array: (itemParser) => createParamsParserBuilder((v) => {
                if (!Array.isArray(v)) {
                    return undefined;
                }
                return parseArray(v, itemParser);
            })(optional),
        };
    }
    const ParamsParsers = {
        optional: createParamsParserBuilders(true),
        required: createParamsParserBuilders(false),
    };
    function parseParams(value, keyToParserMap) {
        const result = ParamsParsers.required.object(keyToParserMap)(value);
        return result.succeeded ? result.value : undefined;
    }

    function warnMissing(info) {
        console.warn([
            `Missing '${info.key}' of ${info.target} in ${info.place}.`,
            'Please rebuild plugins with the latest core package.',
        ].join(' '));
    }

    function disposeElement(elem) {
        if (elem && elem.parentElement) {
            elem.parentElement.removeChild(elem);
        }
        return null;
    }

    class ReadonlyValue {
        constructor(value) {
            this.value_ = value;
        }
        static create(value) {
            return [
                new ReadonlyValue(value),
                (rawValue, options) => {
                    value.setRawValue(rawValue, options);
                },
            ];
        }
        get emitter() {
            return this.value_.emitter;
        }
        get rawValue() {
            return this.value_.rawValue;
        }
    }

    const className$3 = ClassName('');
    function valueToModifier(elem, modifier) {
        return valueToClassName(elem, className$3(undefined, modifier));
    }
    class ViewProps extends ValueMap {
        constructor(valueMap) {
            var _a;
            super(valueMap);
            this.onDisabledChange_ = this.onDisabledChange_.bind(this);
            this.onParentChange_ = this.onParentChange_.bind(this);
            this.onParentGlobalDisabledChange_ =
                this.onParentGlobalDisabledChange_.bind(this);
            [this.globalDisabled_, this.setGlobalDisabled_] = ReadonlyValue.create(createValue(this.getGlobalDisabled_()));
            this.value('disabled').emitter.on('change', this.onDisabledChange_);
            this.value('parent').emitter.on('change', this.onParentChange_);
            (_a = this.get('parent')) === null || _a === void 0 ? void 0 : _a.globalDisabled.emitter.on('change', this.onParentGlobalDisabledChange_);
        }
        static create(opt_initialValue) {
            var _a, _b, _c;
            const initialValue = opt_initialValue !== null && opt_initialValue !== void 0 ? opt_initialValue : {};
            return new ViewProps(ValueMap.createCore({
                disabled: (_a = initialValue.disabled) !== null && _a !== void 0 ? _a : false,
                disposed: false,
                hidden: (_b = initialValue.hidden) !== null && _b !== void 0 ? _b : false,
                parent: (_c = initialValue.parent) !== null && _c !== void 0 ? _c : null,
            }));
        }
        get globalDisabled() {
            return this.globalDisabled_;
        }
        bindClassModifiers(elem) {
            bindValue(this.globalDisabled_, valueToModifier(elem, 'disabled'));
            bindValueMap(this, 'hidden', valueToModifier(elem, 'hidden'));
        }
        bindDisabled(target) {
            bindValue(this.globalDisabled_, (disabled) => {
                target.disabled = disabled;
            });
        }
        bindTabIndex(elem) {
            bindValue(this.globalDisabled_, (disabled) => {
                elem.tabIndex = disabled ? -1 : 0;
            });
        }
        handleDispose(callback) {
            this.value('disposed').emitter.on('change', (disposed) => {
                if (disposed) {
                    callback();
                }
            });
        }
        getGlobalDisabled_() {
            const parent = this.get('parent');
            const parentDisabled = parent ? parent.globalDisabled.rawValue : false;
            return parentDisabled || this.get('disabled');
        }
        updateGlobalDisabled_() {
            this.setGlobalDisabled_(this.getGlobalDisabled_());
        }
        onDisabledChange_() {
            this.updateGlobalDisabled_();
        }
        onParentGlobalDisabledChange_() {
            this.updateGlobalDisabled_();
        }
        onParentChange_(ev) {
            var _a;
            const prevParent = ev.previousRawValue;
            prevParent === null || prevParent === void 0 ? void 0 : prevParent.globalDisabled.emitter.off('change', this.onParentGlobalDisabledChange_);
            (_a = this.get('parent')) === null || _a === void 0 ? void 0 : _a.globalDisabled.emitter.on('change', this.onParentGlobalDisabledChange_);
            this.updateGlobalDisabled_();
        }
    }

    function getAllBladePositions() {
        return ['veryfirst', 'first', 'last', 'verylast'];
    }

    const className$2 = ClassName('');
    const POS_TO_CLASS_NAME_MAP = {
        veryfirst: 'vfst',
        first: 'fst',
        last: 'lst',
        verylast: 'vlst',
    };
    class BladeController {
        constructor(config) {
            this.parent_ = null;
            this.blade = config.blade;
            this.view = config.view;
            this.viewProps = config.viewProps;
            const elem = this.view.element;
            this.blade.value('positions').emitter.on('change', () => {
                getAllBladePositions().forEach((pos) => {
                    elem.classList.remove(className$2(undefined, POS_TO_CLASS_NAME_MAP[pos]));
                });
                this.blade.get('positions').forEach((pos) => {
                    elem.classList.add(className$2(undefined, POS_TO_CLASS_NAME_MAP[pos]));
                });
            });
            this.viewProps.handleDispose(() => {
                disposeElement(elem);
            });
        }
        get parent() {
            return this.parent_;
        }
        set parent(parent) {
            this.parent_ = parent;
            if (!('parent' in this.viewProps.valMap_)) {
                warnMissing({
                    key: 'parent',
                    target: ViewProps.name,
                    place: 'BladeController.parent',
                });
                return;
            }
            this.viewProps.set('parent', this.parent_ ? this.parent_.viewProps : null);
        }
    }

    function removeChildNodes(element) {
        while (element.childNodes.length > 0) {
            element.removeChild(element.childNodes[0]);
        }
    }

    const className$1 = ClassName('lbl');
    function createLabelNode(doc, label) {
        const frag = doc.createDocumentFragment();
        const lineNodes = label.split('\n').map((line) => {
            return doc.createTextNode(line);
        });
        lineNodes.forEach((lineNode, index) => {
            if (index > 0) {
                frag.appendChild(doc.createElement('br'));
            }
            frag.appendChild(lineNode);
        });
        return frag;
    }
    class LabelView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$1());
            config.viewProps.bindClassModifiers(this.element);
            const labelElem = doc.createElement('div');
            labelElem.classList.add(className$1('l'));
            bindValueMap(config.props, 'label', (value) => {
                if (isEmpty(value)) {
                    this.element.classList.add(className$1(undefined, 'nol'));
                }
                else {
                    this.element.classList.remove(className$1(undefined, 'nol'));
                    removeChildNodes(labelElem);
                    labelElem.appendChild(createLabelNode(doc, value));
                }
            });
            this.element.appendChild(labelElem);
            this.labelElement = labelElem;
            const valueElem = doc.createElement('div');
            valueElem.classList.add(className$1('v'));
            this.element.appendChild(valueElem);
            this.valueElement = valueElem;
        }
    }

    class LabelController extends BladeController {
        constructor(doc, config) {
            const viewProps = config.valueController.viewProps;
            super(Object.assign(Object.assign({}, config), { view: new LabelView(doc, {
                    props: config.props,
                    viewProps: viewProps,
                }), viewProps: viewProps }));
            this.props = config.props;
            this.valueController = config.valueController;
            this.view.valueElement.appendChild(this.valueController.view.element);
        }
    }

    function createNumberFormatter(digits) {
        return (value) => {
            return value.toFixed(Math.max(Math.min(digits, 20), 0));
        };
    }

    const innerFormatter = createNumberFormatter(0);
    function formatPercentage(value) {
        return innerFormatter(value) + '%';
    }

    function constrainRange(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function removeAlphaComponent(comps) {
        return [comps[0], comps[1], comps[2]];
    }

    function zerofill(comp) {
        const hex = constrainRange(Math.floor(comp), 0, 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    }
    function colorToHexRgbString(value, prefix = '#') {
        const hexes = removeAlphaComponent(value.getComponents('rgb'))
            .map(zerofill)
            .join('');
        return `${prefix}${hexes}`;
    }
    function colorToHexRgbaString(value, prefix = '#') {
        const rgbaComps = value.getComponents('rgb');
        const hexes = [rgbaComps[0], rgbaComps[1], rgbaComps[2], rgbaComps[3] * 255]
            .map(zerofill)
            .join('');
        return `${prefix}${hexes}`;
    }
    function colorToFunctionalRgbString(value, opt_type) {
        const formatter = createNumberFormatter(opt_type === 'float' ? 2 : 0);
        const comps = removeAlphaComponent(value.getComponents('rgb', opt_type)).map((comp) => formatter(comp));
        return `rgb(${comps.join(', ')})`;
    }
    function createFunctionalRgbColorFormatter(type) {
        return (value) => {
            return colorToFunctionalRgbString(value, type);
        };
    }
    function colorToFunctionalRgbaString(value, opt_type) {
        const aFormatter = createNumberFormatter(2);
        const rgbFormatter = createNumberFormatter(opt_type === 'float' ? 2 : 0);
        const comps = value.getComponents('rgb', opt_type).map((comp, index) => {
            const formatter = index === 3 ? aFormatter : rgbFormatter;
            return formatter(comp);
        });
        return `rgba(${comps.join(', ')})`;
    }
    function createFunctionalRgbaColorFormatter(type) {
        return (value) => {
            return colorToFunctionalRgbaString(value, type);
        };
    }
    function colorToFunctionalHslString(value) {
        const formatters = [
            createNumberFormatter(0),
            formatPercentage,
            formatPercentage,
        ];
        const comps = removeAlphaComponent(value.getComponents('hsl')).map((comp, index) => formatters[index](comp));
        return `hsl(${comps.join(', ')})`;
    }
    function colorToFunctionalHslaString(value) {
        const formatters = [
            createNumberFormatter(0),
            formatPercentage,
            formatPercentage,
            createNumberFormatter(2),
        ];
        const comps = value
            .getComponents('hsl')
            .map((comp, index) => formatters[index](comp));
        return `hsla(${comps.join(', ')})`;
    }
    function colorToObjectRgbString(value, type) {
        const formatter = createNumberFormatter(type === 'float' ? 2 : 0);
        const names = ['r', 'g', 'b'];
        const comps = removeAlphaComponent(value.getComponents('rgb', type)).map((comp, index) => `${names[index]}: ${formatter(comp)}`);
        return `{${comps.join(', ')}}`;
    }
    function createObjectRgbColorFormatter(type) {
        return (value) => colorToObjectRgbString(value, type);
    }
    function colorToObjectRgbaString(value, type) {
        const aFormatter = createNumberFormatter(2);
        const rgbFormatter = createNumberFormatter(type === 'float' ? 2 : 0);
        const names = ['r', 'g', 'b', 'a'];
        const comps = value.getComponents('rgb', type).map((comp, index) => {
            const formatter = index === 3 ? aFormatter : rgbFormatter;
            return `${names[index]}: ${formatter(comp)}`;
        });
        return `{${comps.join(', ')}}`;
    }
    function createObjectRgbaColorFormatter(type) {
        return (value) => colorToObjectRgbaString(value, type);
    }
    [
        {
            format: {
                alpha: false,
                mode: 'rgb',
                notation: 'hex',
                type: 'int',
            },
            stringifier: colorToHexRgbString,
        },
        {
            format: {
                alpha: true,
                mode: 'rgb',
                notation: 'hex',
                type: 'int',
            },
            stringifier: colorToHexRgbaString,
        },
        {
            format: {
                alpha: false,
                mode: 'hsl',
                notation: 'func',
                type: 'int',
            },
            stringifier: colorToFunctionalHslString,
        },
        {
            format: {
                alpha: true,
                mode: 'hsl',
                notation: 'func',
                type: 'int',
            },
            stringifier: colorToFunctionalHslaString,
        },
        ...['int', 'float'].reduce((prev, type) => {
            return [
                ...prev,
                {
                    format: {
                        alpha: false,
                        mode: 'rgb',
                        notation: 'func',
                        type: type,
                    },
                    stringifier: createFunctionalRgbColorFormatter(type),
                },
                {
                    format: {
                        alpha: true,
                        mode: 'rgb',
                        notation: 'func',
                        type: type,
                    },
                    stringifier: createFunctionalRgbaColorFormatter(type),
                },
                {
                    format: {
                        alpha: false,
                        mode: 'rgb',
                        notation: 'object',
                        type: type,
                    },
                    stringifier: createObjectRgbColorFormatter(type),
                },
                {
                    format: {
                        alpha: true,
                        mode: 'rgb',
                        notation: 'object',
                        type: type,
                    },
                    stringifier: createObjectRgbaColorFormatter(type),
                },
            ];
        }, []),
    ];

    class PluginApi extends BladeApi {
        get label() {
            return this.controller_.props.get('label');
        }
        set label(label) {
            this.controller_.props.set('label', label);
        }
        get colors() {
            return this.controller_.valueController.props.get('colors');
        }
        set colors(value) {
            this.controller_.valueController.props.set('colors', value);
        }
    }

    const className = ClassName('chrom');
    class PluginView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className());
            config.viewProps.bindClassModifiers(this.element);
            bindValueMap(config.props, 'colors', (value) => {
                if (isEmpty(value)) {
                    removeChildNodes(this.element);
                }
                else {
                    removeChildNodes(this.element);
                    const colors = config.props.value('colors');
                    colors.rawValue.forEach((color) => {
                        const colorElem = doc.createElement('div');
                        colorElem.classList.add(className('col'));
                        colorElem.style.backgroundColor = color;
                        this.element.appendChild(colorElem);
                    });
                }
            });
            config.viewProps.handleDispose(() => {
                // Called when the view is disposing
            });
        }
    }

    class PluginController {
        constructor(doc, config) {
            this.props = config.props;
            this.viewProps = config.viewProps;
            this.view = new PluginView(doc, {
                props: this.props,
                viewProps: this.viewProps,
            });
        }
    }

    const ChromaticBladePlugin = {
        id: 'blade-chromatic',
        type: 'blade',
        css: '.tp-chromv{cursor:pointer;display:grid;grid-template-columns:repeat(10, 1fr);height:var(--bld-us);overflow:hidden;position:relative;-moz-column-gap:1px;column-gap:1px;align-items:center}.tp-chromv.tp-v-disabled{opacity:.5}.tp-chromv_col{height:60%}',
        accept(params) {
            const p = ParamsParsers;
            const result = parseParams(params, {
                view: p.required.constant('chromatic'),
                colors: p.required.array(p.required.string),
                label: p.optional.string,
            });
            return result ? { params: result } : null;
        },
        controller(args) {
            const controller = new PluginController(args.document, {
                props: ValueMap.fromObject({
                    colors: args.params.colors,
                }),
                viewProps: args.viewProps,
            });
            return new LabelController(args.document, {
                blade: args.blade,
                props: ValueMap.fromObject({
                    label: args.params.label,
                }),
                valueController: controller,
            });
        },
        api(args) {
            if (!(args.controller instanceof LabelController)) {
                return null;
            }
            if (!(args.controller.valueController instanceof PluginController)) {
                return null;
            }
            return new PluginApi(args.controller);
        },
    };

    const plugins = [ChromaticBladePlugin];

    exports.plugins = plugins;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
