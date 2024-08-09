function forceCast(v) {
    return v;
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

class ListConstraint {
    constructor(options) {
        this.values = ValueMap.fromObject({
            options: options,
        });
    }
    get options() {
        return this.values.get('options');
    }
    constrain(value) {
        const opts = this.values.get('options');
        if (opts.length === 0) {
            return value;
        }
        const matched = opts.filter((item) => {
            return item.value === value;
        }).length > 0;
        return matched ? value : opts[0].value;
    }
}

function computeOffset(ev, elem) {
    var _a, _b;
    const win = elem.ownerDocument.defaultView;
    const rect = elem.getBoundingClientRect();
    return {
        x: ev.pageX - (((_a = (win && win.scrollX)) !== null && _a !== void 0 ? _a : 0) + rect.left),
        y: ev.pageY - (((_b = (win && win.scrollY)) !== null && _b !== void 0 ? _b : 0) + rect.top),
    };
}
class PointerHandler {
    constructor(element) {
        this.lastTouch_ = null;
        this.onDocumentMouseMove_ = this.onDocumentMouseMove_.bind(this);
        this.onDocumentMouseUp_ = this.onDocumentMouseUp_.bind(this);
        this.onMouseDown_ = this.onMouseDown_.bind(this);
        this.onTouchEnd_ = this.onTouchEnd_.bind(this);
        this.onTouchMove_ = this.onTouchMove_.bind(this);
        this.onTouchStart_ = this.onTouchStart_.bind(this);
        this.elem_ = element;
        this.emitter = new Emitter();
        element.addEventListener('touchstart', this.onTouchStart_, {
            passive: false,
        });
        element.addEventListener('touchmove', this.onTouchMove_, {
            passive: true,
        });
        element.addEventListener('touchend', this.onTouchEnd_);
        element.addEventListener('mousedown', this.onMouseDown_);
    }
    computePosition_(offset) {
        const rect = this.elem_.getBoundingClientRect();
        return {
            bounds: {
                width: rect.width,
                height: rect.height,
            },
            point: offset
                ? {
                    x: offset.x,
                    y: offset.y,
                }
                : null,
        };
    }
    onMouseDown_(ev) {
        var _a;
        ev.preventDefault();
        (_a = ev.currentTarget) === null || _a === void 0 ? void 0 : _a.focus();
        const doc = this.elem_.ownerDocument;
        doc.addEventListener('mousemove', this.onDocumentMouseMove_);
        doc.addEventListener('mouseup', this.onDocumentMouseUp_);
        this.emitter.emit('down', {
            altKey: ev.altKey,
            data: this.computePosition_(computeOffset(ev, this.elem_)),
            sender: this,
            shiftKey: ev.shiftKey,
        });
    }
    onDocumentMouseMove_(ev) {
        this.emitter.emit('move', {
            altKey: ev.altKey,
            data: this.computePosition_(computeOffset(ev, this.elem_)),
            sender: this,
            shiftKey: ev.shiftKey,
        });
    }
    onDocumentMouseUp_(ev) {
        const doc = this.elem_.ownerDocument;
        doc.removeEventListener('mousemove', this.onDocumentMouseMove_);
        doc.removeEventListener('mouseup', this.onDocumentMouseUp_);
        this.emitter.emit('up', {
            altKey: ev.altKey,
            data: this.computePosition_(computeOffset(ev, this.elem_)),
            sender: this,
            shiftKey: ev.shiftKey,
        });
    }
    onTouchStart_(ev) {
        ev.preventDefault();
        const touch = ev.targetTouches.item(0);
        const rect = this.elem_.getBoundingClientRect();
        this.emitter.emit('down', {
            altKey: ev.altKey,
            data: this.computePosition_(touch
                ? {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                }
                : undefined),
            sender: this,
            shiftKey: ev.shiftKey,
        });
        this.lastTouch_ = touch;
    }
    onTouchMove_(ev) {
        const touch = ev.targetTouches.item(0);
        const rect = this.elem_.getBoundingClientRect();
        this.emitter.emit('move', {
            altKey: ev.altKey,
            data: this.computePosition_(touch
                ? {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                }
                : undefined),
            sender: this,
            shiftKey: ev.shiftKey,
        });
        this.lastTouch_ = touch;
    }
    onTouchEnd_(ev) {
        var _a;
        const touch = (_a = ev.targetTouches.item(0)) !== null && _a !== void 0 ? _a : this.lastTouch_;
        const rect = this.elem_.getBoundingClientRect();
        this.emitter.emit('up', {
            altKey: ev.altKey,
            data: this.computePosition_(touch
                ? {
                    x: touch.clientX - rect.left,
                    y: touch.clientY - rect.top,
                }
                : undefined),
            sender: this,
            shiftKey: ev.shiftKey,
        });
    }
}

function parseListOptions(value) {
    const p = ParamsParsers;
    if (Array.isArray(value)) {
        return p.required.array(p.required.object({
            text: p.required.string,
            value: p.required.raw,
        }))(value).value;
    }
    if (typeof value === 'object') {
        return p.required.raw(value)
            .value;
    }
    return undefined;
}
function normalizeListOptions(options) {
    if (Array.isArray(options)) {
        return options;
    }
    const items = [];
    Object.keys(options).forEach((text) => {
        items.push({ text: text, value: options[text] });
    });
    return items;
}

// Create a class name generator from the view name
// ClassName('tmp') will generate a CSS class name like `tp-tmpv`
const className = ClassName('multiple-select');
// Custom view class should implement `View` interface
class PluginView {
    constructor(doc, config) {
        this.optionEls = [];
        this.emptyEl = null;
        // Create a root element for the plugin
        this.element = doc.createElement('div');
        this.element.classList.add(className());
        // Bind view props to the element
        config.viewProps.bindClassModifiers(this.element);
        // Receive the bound value from the controller
        this.value_ = config.value;
        // Handle 'change' event of the value
        this.value_.emitter.on('change', this.onValueChange_.bind(this));
        this.lc = config.lc;
        // Create child elements
        this.containerEl = doc.createElement('div');
        this.containerEl.classList.add(className('container'));
        this.element.appendChild(this.containerEl);
        // Apply the initial value
        this.refresh_();
        config.viewProps.handleDispose(() => {
            // Called when the view is disposing
            console.log('TODO: dispose view');
        });
    }
    refresh_() {
        const rawValue = this.value_.rawValue;
        while (this.optionEls.length > 0) {
            const elem = this.optionEls.shift();
            if (elem) {
                this.containerEl.removeChild(elem);
            }
        }
        const doc = this.element.ownerDocument;
        if (this.lc.values.get('options').length === 0 && !this.emptyEl) {
            this.emptyEl = doc.createElement('div');
            this.emptyEl.classList.add(className('empty'));
            this.emptyEl.textContent = '(empty)';
            this.containerEl.appendChild(this.emptyEl);
        }
        else if (this.emptyEl) {
            this.containerEl.removeChild(this.emptyEl);
            this.emptyEl = null;
        }
        this.lc.values.get('options').forEach((item) => {
            const optionEl = doc.createElement('label');
            optionEl.classList.add(className('option'));
            const inputEl = doc.createElement('input');
            inputEl.classList.add(className('input'));
            inputEl.type = 'checkbox';
            inputEl.checked = rawValue.includes(item.value);
            inputEl.addEventListener('input', () => {
                let current = this.value_.rawValue;
                if (inputEl.checked) {
                    current = [...current, item.value];
                }
                else {
                    current = current.filter((v) => v !== item.value);
                }
                this.value_.setRawValue(current);
            });
            optionEl.appendChild(inputEl);
            const textEl = doc.createElement('span');
            textEl.classList.add(className('text'));
            textEl.textContent = item.text;
            optionEl.appendChild(textEl);
            this.optionEls.push(optionEl);
            this.containerEl.appendChild(optionEl);
        });
    }
    onValueChange_() {
        this.refresh_();
    }
}

// Custom controller class should implement `Controller` interface
class PluginController {
    constructor(doc, config) {
        this.onPoint_ = this.onPoint_.bind(this);
        // Receive the bound value from the plugin
        this.value = config.value;
        const lc = new ListConstraint(normalizeListOptions(config.options));
        this.lc = lc;
        // and also view props
        this.viewProps = config.viewProps;
        this.viewProps.handleDispose(() => {
            // Called when the controller is disposing
            console.log('TODO: dispose controller');
        });
        // Create a custom view
        this.view = new PluginView(doc, {
            value: this.value,
            viewProps: this.viewProps,
            lc: this.lc,
        });
        // You can use `PointerHandler` to handle pointer events in the same way as Tweakpane do
        const ptHandler = new PointerHandler(this.view.element);
        ptHandler.emitter.on('down', this.onPoint_);
        ptHandler.emitter.on('move', this.onPoint_);
        ptHandler.emitter.on('up', this.onPoint_);
    }
    onPoint_() {
        // const data = ev.data;
        // if (!data.point) {
        // 	return;
        // }
        // // Update the value by user input
        // const dx =
        // 	constrainRange(data.point.x / data.bounds.width + 0.05, 0, 1) * 10;
        // const dy = data.point.y / 10;
        // this.value.rawValue = Math.floor(dy) * 10 + dx;
    }
}

// NOTE: You can see JSDoc comments of `InputBindingPlugin` for details about each property
//
// `InputBindingPlugin<In, Ex, P>` means...
// - The plugin receives the bound value as `Ex`,
// - converts `Ex` into `In` and holds it
// - P is the type of the parsed parameters
//
const TweakpaneMultipleSelectPlugin = {
    id: 'input-multiple-select',
    // type: The plugin type.
    // - 'input': Input binding
    // - 'monitor': Monitor binding
    type: 'input',
    // This plugin template injects a compiled CSS by @rollup/plugin-replace
    // See rollup.config.js for details
    css: '.tp-multiple-selectv{max-height:calc(var(--bld-us)*5);overflow-y:auto;position:relative;color:var(--in-fg)}.tp-multiple-selectv.tp-v-disabled{opacity:.5}.tp-multiple-selectv_option{display:flex;align-content:center;gap:5px;margin-top:2px;margin-bottom:2px}.tp-multiple-selectv_input{margin:0}.tp-multiple-selectv_text{flex:auto}.tp-multiple-selectv_empty{color:var(--in-fg-placeholder)}',
    accept(exValue, params) {
        if (exValue != null && !Array.isArray(exValue)) {
            return null;
        }
        // Parse parameters object
        const p = ParamsParsers;
        const result = parseParams(params, {
            // `view` option may be useful to provide a custom control for primitive values
            view: p.required.constant('multiple-select'),
            options: p.required.custom(parseListOptions),
        });
        if (!result) {
            return null;
        }
        // Return a typed value and params to accept the user input
        return {
            initialValue: exValue,
            params: result,
        };
    },
    binding: {
        reader(_args) {
            return (exValue) => {
                // Convert an external unknown value into the internal value
                return Array.isArray(exValue) ? exValue : [];
            };
        },
        writer(_args) {
            return (target, inValue) => {
                // Use `target.write()` to write the primitive value to the target,
                // or `target.writeProperty()` to write a property of the target
                target.write(inValue);
            };
        },
    },
    controller(args) {
        // Create a controller for the plugin
        return new PluginController(args.document, {
            value: args.value,
            viewProps: args.viewProps,
            options: args.params.options,
        });
    },
};

// Export your plugin(s) as constant `plugins`
const plugins = [TweakpaneMultipleSelectPlugin];

export { plugins };
