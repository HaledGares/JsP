(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TweakpaneCubicBezierPlugin = {}));
}(this, (function (exports) { 'use strict';

    class BladeApi {
        constructor(controller) {
            this.controller_ = controller;
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
            const constrainedValue = this.constraint_
                ? this.constraint_.constrain(rawValue)
                : rawValue;
            const changed = !this.equals_(this.rawValue_, constrainedValue);
            if (!changed) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.rawValue_ = constrainedValue;
            this.emitter.emit('change', {
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
            if (this.value_ === value) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.value_ = value;
            this.emitter.emit('change', {
                sender: this,
                rawValue: this.value_,
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

    function disposeElement(elem) {
        if (elem && elem.parentElement) {
            elem.parentElement.removeChild(elem);
        }
        return null;
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

    function getAllBladePositions() {
        return ['veryfirst', 'first', 'last', 'verylast'];
    }

    const className$9 = ClassName('');
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
                    elem.classList.remove(className$9(undefined, POS_TO_CLASS_NAME_MAP[pos]));
                });
                this.blade.get('positions').forEach((pos) => {
                    elem.classList.add(className$9(undefined, POS_TO_CLASS_NAME_MAP[pos]));
                });
            });
            this.viewProps.handleDispose(() => {
                disposeElement(elem);
            });
        }
        get parent() {
            return this.parent_;
        }
    }

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function forceReflow(element) {
        element.offsetHeight;
    }
    function disableTransitionTemporarily(element, callback) {
        const t = element.style.transition;
        element.style.transition = 'none';
        callback();
        element.style.transition = t;
    }
    function supportsTouch(doc) {
        return doc.ontouchstart !== undefined;
    }
    function removeChildNodes(element) {
        while (element.childNodes.length > 0) {
            element.removeChild(element.childNodes[0]);
        }
    }
    function findNextTarget(ev) {
        if (ev.relatedTarget) {
            return forceCast(ev.relatedTarget);
        }
        if ('explicitOriginalTarget' in ev) {
            return ev.explicitOriginalTarget;
        }
        return null;
    }

    function compose$1(h1, h2) {
        return (input) => h2(h1(input));
    }
    function extractValue(ev) {
        return ev.rawValue;
    }
    function bindValue(value, applyValue) {
        value.emitter.on('change', compose$1(extractValue, applyValue));
        applyValue(value.rawValue);
    }
    function bindValueMap(valueMap, key, applyValue) {
        bindValue(valueMap.value(key), applyValue);
    }

    const className$8 = ClassName('lbl');
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
            this.element.classList.add(className$8());
            config.viewProps.bindClassModifiers(this.element);
            const labelElem = doc.createElement('div');
            labelElem.classList.add(className$8('l'));
            bindValueMap(config.props, 'label', (value) => {
                if (isEmpty(value)) {
                    this.element.classList.add(className$8(undefined, 'nol'));
                }
                else {
                    this.element.classList.remove(className$8(undefined, 'nol'));
                    removeChildNodes(labelElem);
                    labelElem.appendChild(createLabelNode(doc, value));
                }
            });
            this.element.appendChild(labelElem);
            this.labelElement = labelElem;
            const valueElem = doc.createElement('div');
            valueElem.classList.add(className$8('v'));
            this.element.appendChild(valueElem);
            this.valueElement = valueElem;
        }
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

    class ValueBladeController extends BladeController {
        constructor(config) {
            super(config);
            this.value = config.value;
        }
    }

    class Foldable extends ValueMap {
        constructor(valueMap) {
            super(valueMap);
        }
        static create(expanded) {
            const coreObj = {
                completed: true,
                expanded: expanded,
                expandedHeight: null,
                shouldFixHeight: false,
                temporaryExpanded: null,
            };
            const core = ValueMap.createCore(coreObj);
            return new Foldable(core);
        }
        get styleExpanded() {
            var _a;
            return (_a = this.get('temporaryExpanded')) !== null && _a !== void 0 ? _a : this.get('expanded');
        }
        get styleHeight() {
            if (!this.styleExpanded) {
                return '0';
            }
            const exHeight = this.get('expandedHeight');
            if (this.get('shouldFixHeight') && !isEmpty(exHeight)) {
                return `${exHeight}px`;
            }
            return 'auto';
        }
        bindExpandedClass(elem, expandedClassName) {
            bindValueMap(this, 'expanded', () => {
                const expanded = this.styleExpanded;
                if (expanded) {
                    elem.classList.add(expandedClassName);
                }
                else {
                    elem.classList.remove(expandedClassName);
                }
            });
        }
    }
    function createFoldable(expanded) {
        return Foldable.create(expanded);
    }
    function computeExpandedFolderHeight(folder, containerElement) {
        let height = 0;
        disableTransitionTemporarily(containerElement, () => {
            folder.set('expandedHeight', null);
            folder.set('temporaryExpanded', true);
            forceReflow(containerElement);
            height = containerElement.clientHeight;
            folder.set('temporaryExpanded', null);
            forceReflow(containerElement);
        });
        return height;
    }
    function applyHeight(foldable, elem) {
        elem.style.height = foldable.styleHeight;
    }
    function bindFoldable(foldable, elem) {
        foldable.value('expanded').emitter.on('beforechange', () => {
            foldable.set('completed', false);
            if (isEmpty(foldable.get('expandedHeight'))) {
                foldable.set('expandedHeight', computeExpandedFolderHeight(foldable, elem));
            }
            foldable.set('shouldFixHeight', true);
            forceReflow(elem);
        });
        foldable.emitter.on('change', () => {
            applyHeight(foldable, elem);
        });
        applyHeight(foldable, elem);
        elem.addEventListener('transitionend', (ev) => {
            if (ev.propertyName !== 'height') {
                return;
            }
            foldable.set('shouldFixHeight', false);
            foldable.set('expandedHeight', null);
            foldable.set('completed', true);
        });
    }

    class LabeledValueController extends ValueBladeController {
        constructor(doc, config) {
            const viewProps = config.valueController.viewProps;
            super(Object.assign(Object.assign({}, config), { value: config.valueController.value, view: new LabelView(doc, {
                    props: config.props,
                    viewProps: viewProps,
                }), viewProps: viewProps }));
            this.props = config.props;
            this.valueController = config.valueController;
            this.view.valueElement.appendChild(this.valueController.view.element);
        }
    }

    class RangeConstraint {
        constructor(config) {
            this.maxValue = config.max;
            this.minValue = config.min;
        }
        constrain(value) {
            let result = value;
            if (!isEmpty(this.minValue)) {
                result = Math.max(result, this.minValue);
            }
            if (!isEmpty(this.maxValue)) {
                result = Math.min(result, this.maxValue);
            }
            return result;
        }
    }

    const className$7 = ClassName('pop');
    class PopupView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$7());
            config.viewProps.bindClassModifiers(this.element);
            bindValue(config.shows, valueToClassName(this.element, className$7(undefined, 'v')));
        }
    }

    class PopupController {
        constructor(doc, config) {
            this.shows = createValue(false);
            this.viewProps = config.viewProps;
            this.view = new PopupView(doc, {
                shows: this.shows,
                viewProps: this.viewProps,
            });
        }
    }

    const className$6 = ClassName('txt');
    class TextView {
        constructor(doc, config) {
            this.onChange_ = this.onChange_.bind(this);
            this.element = doc.createElement('div');
            this.element.classList.add(className$6());
            config.viewProps.bindClassModifiers(this.element);
            this.props_ = config.props;
            this.props_.emitter.on('change', this.onChange_);
            const inputElem = doc.createElement('input');
            inputElem.classList.add(className$6('i'));
            inputElem.type = 'text';
            config.viewProps.bindDisabled(inputElem);
            this.element.appendChild(inputElem);
            this.inputElement = inputElem;
            config.value.emitter.on('change', this.onChange_);
            this.value_ = config.value;
            this.refresh();
        }
        refresh() {
            const formatter = this.props_.get('formatter');
            this.inputElement.value = formatter(this.value_.rawValue);
        }
        onChange_() {
            this.refresh();
        }
    }

    class TextController {
        constructor(doc, config) {
            this.onInputChange_ = this.onInputChange_.bind(this);
            this.parser_ = config.parser;
            this.props = config.props;
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.view = new TextView(doc, {
                props: config.props,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.inputElement.addEventListener('change', this.onInputChange_);
        }
        onInputChange_(e) {
            const inputElem = forceCast(e.currentTarget);
            const value = inputElem.value;
            const parsedValue = this.parser_(value);
            if (!isEmpty(parsedValue)) {
                this.value.rawValue = parsedValue;
            }
            this.view.refresh();
        }
    }

    class NumberLiteralNode {
        constructor(text) {
            this.text = text;
        }
        evaluate() {
            return Number(this.text);
        }
        toString() {
            return this.text;
        }
    }
    const BINARY_OPERATION_MAP = {
        '**': (v1, v2) => Math.pow(v1, v2),
        '*': (v1, v2) => v1 * v2,
        '/': (v1, v2) => v1 / v2,
        '%': (v1, v2) => v1 % v2,
        '+': (v1, v2) => v1 + v2,
        '-': (v1, v2) => v1 - v2,
        '<<': (v1, v2) => v1 << v2,
        '>>': (v1, v2) => v1 >> v2,
        '>>>': (v1, v2) => v1 >>> v2,
        '&': (v1, v2) => v1 & v2,
        '^': (v1, v2) => v1 ^ v2,
        '|': (v1, v2) => v1 | v2,
    };
    class BinaryOperationNode {
        constructor(operator, left, right) {
            this.left = left;
            this.operator = operator;
            this.right = right;
        }
        evaluate() {
            const op = BINARY_OPERATION_MAP[this.operator];
            if (!op) {
                throw new Error(`unexpected binary operator: '${this.operator}`);
            }
            return op(this.left.evaluate(), this.right.evaluate());
        }
        toString() {
            return [
                'b(',
                this.left.toString(),
                this.operator,
                this.right.toString(),
                ')',
            ].join(' ');
        }
    }
    const UNARY_OPERATION_MAP = {
        '+': (v) => v,
        '-': (v) => -v,
        '~': (v) => ~v,
    };
    class UnaryOperationNode {
        constructor(operator, expr) {
            this.operator = operator;
            this.expression = expr;
        }
        evaluate() {
            const op = UNARY_OPERATION_MAP[this.operator];
            if (!op) {
                throw new Error(`unexpected unary operator: '${this.operator}`);
            }
            return op(this.expression.evaluate());
        }
        toString() {
            return ['u(', this.operator, this.expression.toString(), ')'].join(' ');
        }
    }

    function combineReader(parsers) {
        return (text, cursor) => {
            for (let i = 0; i < parsers.length; i++) {
                const result = parsers[i](text, cursor);
                if (result !== '') {
                    return result;
                }
            }
            return '';
        };
    }
    function readWhitespace(text, cursor) {
        var _a;
        const m = text.substr(cursor).match(/^\s+/);
        return (_a = (m && m[0])) !== null && _a !== void 0 ? _a : '';
    }
    function readNonZeroDigit(text, cursor) {
        const ch = text.substr(cursor, 1);
        return ch.match(/^[1-9]$/) ? ch : '';
    }
    function readDecimalDigits(text, cursor) {
        var _a;
        const m = text.substr(cursor).match(/^[0-9]+/);
        return (_a = (m && m[0])) !== null && _a !== void 0 ? _a : '';
    }
    function readSignedInteger(text, cursor) {
        const ds = readDecimalDigits(text, cursor);
        if (ds !== '') {
            return ds;
        }
        const sign = text.substr(cursor, 1);
        cursor += 1;
        if (sign !== '-' && sign !== '+') {
            return '';
        }
        const sds = readDecimalDigits(text, cursor);
        if (sds === '') {
            return '';
        }
        return sign + sds;
    }
    function readExponentPart(text, cursor) {
        const e = text.substr(cursor, 1);
        cursor += 1;
        if (e.toLowerCase() !== 'e') {
            return '';
        }
        const si = readSignedInteger(text, cursor);
        if (si === '') {
            return '';
        }
        return e + si;
    }
    function readDecimalIntegerLiteral(text, cursor) {
        const ch = text.substr(cursor, 1);
        if (ch === '0') {
            return ch;
        }
        const nzd = readNonZeroDigit(text, cursor);
        cursor += nzd.length;
        if (nzd === '') {
            return '';
        }
        return nzd + readDecimalDigits(text, cursor);
    }
    function readDecimalLiteral1(text, cursor) {
        const dil = readDecimalIntegerLiteral(text, cursor);
        cursor += dil.length;
        if (dil === '') {
            return '';
        }
        const dot = text.substr(cursor, 1);
        cursor += dot.length;
        if (dot !== '.') {
            return '';
        }
        const dds = readDecimalDigits(text, cursor);
        cursor += dds.length;
        return dil + dot + dds + readExponentPart(text, cursor);
    }
    function readDecimalLiteral2(text, cursor) {
        const dot = text.substr(cursor, 1);
        cursor += dot.length;
        if (dot !== '.') {
            return '';
        }
        const dds = readDecimalDigits(text, cursor);
        cursor += dds.length;
        if (dds === '') {
            return '';
        }
        return dot + dds + readExponentPart(text, cursor);
    }
    function readDecimalLiteral3(text, cursor) {
        const dil = readDecimalIntegerLiteral(text, cursor);
        cursor += dil.length;
        if (dil === '') {
            return '';
        }
        return dil + readExponentPart(text, cursor);
    }
    const readDecimalLiteral = combineReader([
        readDecimalLiteral1,
        readDecimalLiteral2,
        readDecimalLiteral3,
    ]);
    function parseBinaryDigits(text, cursor) {
        var _a;
        const m = text.substr(cursor).match(/^[01]+/);
        return (_a = (m && m[0])) !== null && _a !== void 0 ? _a : '';
    }
    function readBinaryIntegerLiteral(text, cursor) {
        const prefix = text.substr(cursor, 2);
        cursor += prefix.length;
        if (prefix.toLowerCase() !== '0b') {
            return '';
        }
        const bds = parseBinaryDigits(text, cursor);
        if (bds === '') {
            return '';
        }
        return prefix + bds;
    }
    function readOctalDigits(text, cursor) {
        var _a;
        const m = text.substr(cursor).match(/^[0-7]+/);
        return (_a = (m && m[0])) !== null && _a !== void 0 ? _a : '';
    }
    function readOctalIntegerLiteral(text, cursor) {
        const prefix = text.substr(cursor, 2);
        cursor += prefix.length;
        if (prefix.toLowerCase() !== '0o') {
            return '';
        }
        const ods = readOctalDigits(text, cursor);
        if (ods === '') {
            return '';
        }
        return prefix + ods;
    }
    function readHexDigits(text, cursor) {
        var _a;
        const m = text.substr(cursor).match(/^[0-9a-f]+/i);
        return (_a = (m && m[0])) !== null && _a !== void 0 ? _a : '';
    }
    function readHexIntegerLiteral(text, cursor) {
        const prefix = text.substr(cursor, 2);
        cursor += prefix.length;
        if (prefix.toLowerCase() !== '0x') {
            return '';
        }
        const hds = readHexDigits(text, cursor);
        if (hds === '') {
            return '';
        }
        return prefix + hds;
    }
    const readNonDecimalIntegerLiteral = combineReader([
        readBinaryIntegerLiteral,
        readOctalIntegerLiteral,
        readHexIntegerLiteral,
    ]);
    const readNumericLiteral = combineReader([
        readNonDecimalIntegerLiteral,
        readDecimalLiteral,
    ]);

    function parseLiteral(text, cursor) {
        const num = readNumericLiteral(text, cursor);
        cursor += num.length;
        if (num === '') {
            return null;
        }
        return {
            evaluable: new NumberLiteralNode(num),
            cursor: cursor,
        };
    }
    function parseParenthesizedExpression(text, cursor) {
        const op = text.substr(cursor, 1);
        cursor += op.length;
        if (op !== '(') {
            return null;
        }
        const expr = parseExpression(text, cursor);
        if (!expr) {
            return null;
        }
        cursor = expr.cursor;
        cursor += readWhitespace(text, cursor).length;
        const cl = text.substr(cursor, 1);
        cursor += cl.length;
        if (cl !== ')') {
            return null;
        }
        return {
            evaluable: expr.evaluable,
            cursor: cursor,
        };
    }
    function parsePrimaryExpression(text, cursor) {
        return (parseLiteral(text, cursor) || parseParenthesizedExpression(text, cursor));
    }
    function parseUnaryExpression(text, cursor) {
        const expr = parsePrimaryExpression(text, cursor);
        if (expr) {
            return expr;
        }
        const op = text.substr(cursor, 1);
        cursor += op.length;
        if (op !== '+' && op !== '-' && op !== '~') {
            return null;
        }
        const num = parseUnaryExpression(text, cursor);
        if (!num) {
            return null;
        }
        cursor = num.cursor;
        return {
            cursor: cursor,
            evaluable: new UnaryOperationNode(op, num.evaluable),
        };
    }
    function readBinaryOperator(ops, text, cursor) {
        cursor += readWhitespace(text, cursor).length;
        const op = ops.filter((op) => text.startsWith(op, cursor))[0];
        if (!op) {
            return null;
        }
        cursor += op.length;
        cursor += readWhitespace(text, cursor).length;
        return {
            cursor: cursor,
            operator: op,
        };
    }
    function createBinaryOperationExpressionParser(exprParser, ops) {
        return (text, cursor) => {
            const firstExpr = exprParser(text, cursor);
            if (!firstExpr) {
                return null;
            }
            cursor = firstExpr.cursor;
            let expr = firstExpr.evaluable;
            for (;;) {
                const op = readBinaryOperator(ops, text, cursor);
                if (!op) {
                    break;
                }
                cursor = op.cursor;
                const nextExpr = exprParser(text, cursor);
                if (!nextExpr) {
                    return null;
                }
                cursor = nextExpr.cursor;
                expr = new BinaryOperationNode(op.operator, expr, nextExpr.evaluable);
            }
            return expr
                ? {
                    cursor: cursor,
                    evaluable: expr,
                }
                : null;
        };
    }
    const parseBinaryOperationExpression = [
        ['**'],
        ['*', '/', '%'],
        ['+', '-'],
        ['<<', '>>>', '>>'],
        ['&'],
        ['^'],
        ['|'],
    ].reduce((parser, ops) => {
        return createBinaryOperationExpressionParser(parser, ops);
    }, parseUnaryExpression);
    function parseExpression(text, cursor) {
        cursor += readWhitespace(text, cursor).length;
        return parseBinaryOperationExpression(text, cursor);
    }
    function parseEcmaNumberExpression(text) {
        const expr = parseExpression(text, 0);
        if (!expr) {
            return null;
        }
        const cursor = expr.cursor + readWhitespace(text, expr.cursor).length;
        if (cursor !== text.length) {
            return null;
        }
        return expr.evaluable;
    }

    function parseNumber(text) {
        var _a;
        const r = parseEcmaNumberExpression(text);
        return (_a = r === null || r === void 0 ? void 0 : r.evaluate()) !== null && _a !== void 0 ? _a : null;
    }
    function createNumberFormatter(digits) {
        return (value) => {
            return value.toFixed(Math.max(Math.min(digits, 20), 0));
        };
    }

    function connectValues({ primary, secondary, forward, backward, }) {
        let changing = false;
        function preventFeedback(callback) {
            if (changing) {
                return;
            }
            changing = true;
            callback();
            changing = false;
        }
        primary.emitter.on('change', () => {
            preventFeedback(() => {
                secondary.rawValue = forward(primary, secondary);
            });
        });
        secondary.emitter.on('change', () => {
            preventFeedback(() => {
                primary.rawValue = backward(primary, secondary);
            });
            preventFeedback(() => {
                secondary.rawValue = forward(primary, secondary);
            });
        });
        preventFeedback(() => {
            secondary.rawValue = forward(primary, secondary);
        });
    }

    function getStepForKey(baseStep, keys) {
        const step = baseStep * (keys.altKey ? 0.1 : 1) * (keys.shiftKey ? 10 : 1);
        if (keys.upKey) {
            return +step;
        }
        else if (keys.downKey) {
            return -step;
        }
        return 0;
    }
    function getVerticalStepKeys(ev) {
        return {
            altKey: ev.altKey,
            downKey: ev.key === 'ArrowDown',
            shiftKey: ev.shiftKey,
            upKey: ev.key === 'ArrowUp',
        };
    }
    function getHorizontalStepKeys(ev) {
        return {
            altKey: ev.altKey,
            downKey: ev.key === 'ArrowLeft',
            shiftKey: ev.shiftKey,
            upKey: ev.key === 'ArrowRight',
        };
    }
    function isVerticalArrowKey(key) {
        return key === 'ArrowUp' || key === 'ArrowDown';
    }
    function isArrowKey(key) {
        return isVerticalArrowKey(key) || key === 'ArrowLeft' || key === 'ArrowRight';
    }

    function computeOffset(ev, elem) {
        const win = elem.ownerDocument.defaultView;
        const rect = elem.getBoundingClientRect();
        return {
            x: ev.pageX - (((win && win.scrollX) || 0) + rect.left),
            y: ev.pageY - (((win && win.scrollY) || 0) + rect.top),
        };
    }
    class PointerHandler {
        constructor(element) {
            this.onDocumentMouseMove_ = this.onDocumentMouseMove_.bind(this);
            this.onDocumentMouseUp_ = this.onDocumentMouseUp_.bind(this);
            this.onMouseDown_ = this.onMouseDown_.bind(this);
            this.onTouchEnd_ = this.onTouchEnd_.bind(this);
            this.onTouchMove_ = this.onTouchMove_.bind(this);
            this.onTouchStart_ = this.onTouchStart_.bind(this);
            this.elem_ = element;
            this.emitter = new Emitter();
            element.addEventListener('touchstart', this.onTouchStart_);
            element.addEventListener('touchmove', this.onTouchMove_);
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
        }
        onTouchEnd_(ev) {
            const touch = ev.targetTouches.item(0);
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

    function mapRange(value, start1, end1, start2, end2) {
        const p = (value - start1) / (end1 - start1);
        return start2 + p * (end2 - start2);
    }
    function constrainRange(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    const className$5 = ClassName('txt');
    class NumberTextView {
        constructor(doc, config) {
            this.onChange_ = this.onChange_.bind(this);
            this.props_ = config.props;
            this.props_.emitter.on('change', this.onChange_);
            this.element = doc.createElement('div');
            this.element.classList.add(className$5(), className$5(undefined, 'num'));
            if (config.arrayPosition) {
                this.element.classList.add(className$5(undefined, config.arrayPosition));
            }
            config.viewProps.bindClassModifiers(this.element);
            const inputElem = doc.createElement('input');
            inputElem.classList.add(className$5('i'));
            inputElem.type = 'text';
            config.viewProps.bindDisabled(inputElem);
            this.element.appendChild(inputElem);
            this.inputElement = inputElem;
            this.onDraggingChange_ = this.onDraggingChange_.bind(this);
            this.dragging_ = config.dragging;
            this.dragging_.emitter.on('change', this.onDraggingChange_);
            this.element.classList.add(className$5());
            this.inputElement.classList.add(className$5('i'));
            const knobElem = doc.createElement('div');
            knobElem.classList.add(className$5('k'));
            this.element.appendChild(knobElem);
            this.knobElement = knobElem;
            const guideElem = doc.createElementNS(SVG_NS, 'svg');
            guideElem.classList.add(className$5('g'));
            this.knobElement.appendChild(guideElem);
            const bodyElem = doc.createElementNS(SVG_NS, 'path');
            bodyElem.classList.add(className$5('gb'));
            guideElem.appendChild(bodyElem);
            this.guideBodyElem_ = bodyElem;
            const headElem = doc.createElementNS(SVG_NS, 'path');
            headElem.classList.add(className$5('gh'));
            guideElem.appendChild(headElem);
            this.guideHeadElem_ = headElem;
            const tooltipElem = doc.createElement('div');
            tooltipElem.classList.add(ClassName('tt')());
            this.knobElement.appendChild(tooltipElem);
            this.tooltipElem_ = tooltipElem;
            config.value.emitter.on('change', this.onChange_);
            this.value = config.value;
            this.refresh();
        }
        onDraggingChange_(ev) {
            if (ev.rawValue === null) {
                this.element.classList.remove(className$5(undefined, 'drg'));
                return;
            }
            this.element.classList.add(className$5(undefined, 'drg'));
            const x = ev.rawValue / this.props_.get('draggingScale');
            const aox = x + (x > 0 ? -1 : x < 0 ? +1 : 0);
            const adx = constrainRange(-aox, -4, +4);
            this.guideHeadElem_.setAttributeNS(null, 'd', [`M ${aox + adx},0 L${aox},4 L${aox + adx},8`, `M ${x},-1 L${x},9`].join(' '));
            this.guideBodyElem_.setAttributeNS(null, 'd', `M 0,4 L${x},4`);
            const formatter = this.props_.get('formatter');
            this.tooltipElem_.textContent = formatter(this.value.rawValue);
            this.tooltipElem_.style.left = `${x}px`;
        }
        refresh() {
            const formatter = this.props_.get('formatter');
            this.inputElement.value = formatter(this.value.rawValue);
        }
        onChange_() {
            this.refresh();
        }
    }

    class NumberTextController {
        constructor(doc, config) {
            this.originRawValue_ = 0;
            this.onInputChange_ = this.onInputChange_.bind(this);
            this.onInputKeyDown_ = this.onInputKeyDown_.bind(this);
            this.onPointerDown_ = this.onPointerDown_.bind(this);
            this.onPointerMove_ = this.onPointerMove_.bind(this);
            this.onPointerUp_ = this.onPointerUp_.bind(this);
            this.baseStep_ = config.baseStep;
            this.parser_ = config.parser;
            this.props = config.props;
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.dragging_ = createValue(null);
            this.view = new NumberTextView(doc, {
                arrayPosition: config.arrayPosition,
                dragging: this.dragging_,
                props: this.props,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.inputElement.addEventListener('change', this.onInputChange_);
            this.view.inputElement.addEventListener('keydown', this.onInputKeyDown_);
            const ph = new PointerHandler(this.view.knobElement);
            ph.emitter.on('down', this.onPointerDown_);
            ph.emitter.on('move', this.onPointerMove_);
            ph.emitter.on('up', this.onPointerUp_);
        }
        onInputChange_(e) {
            const inputElem = forceCast(e.currentTarget);
            const value = inputElem.value;
            const parsedValue = this.parser_(value);
            if (!isEmpty(parsedValue)) {
                this.value.rawValue = parsedValue;
            }
            this.view.refresh();
        }
        onInputKeyDown_(e) {
            const step = getStepForKey(this.baseStep_, getVerticalStepKeys(e));
            if (step !== 0) {
                this.value.rawValue += step;
            }
        }
        onPointerDown_() {
            this.originRawValue_ = this.value.rawValue;
            this.dragging_.rawValue = 0;
        }
        onPointerMove_(ev) {
            if (!ev.data.point) {
                return;
            }
            const dx = ev.data.point.x - ev.data.bounds.width / 2;
            this.value.rawValue =
                this.originRawValue_ + dx * this.props.get('draggingScale');
            this.dragging_.rawValue = this.value.rawValue - this.originRawValue_;
        }
        onPointerUp_() {
            this.dragging_.rawValue = null;
        }
    }

    class PointNdConstraint {
        constructor(config) {
            this.components = config.components;
            this.asm_ = config.assembly;
        }
        constrain(value) {
            const comps = this.asm_
                .toComponents(value)
                .map((comp, index) => { var _a, _b; return (_b = (_a = this.components[index]) === null || _a === void 0 ? void 0 : _a.constrain(comp)) !== null && _b !== void 0 ? _b : comp; });
            return this.asm_.fromComponents(comps);
        }
    }

    const className$4 = ClassName('pndtxt');
    class PointNdTextView {
        constructor(doc, config) {
            this.textViews = config.textViews;
            this.element = doc.createElement('div');
            this.element.classList.add(className$4());
            this.textViews.forEach((v) => {
                const axisElem = doc.createElement('div');
                axisElem.classList.add(className$4('a'));
                axisElem.appendChild(v.element);
                this.element.appendChild(axisElem);
            });
        }
    }

    function createAxisController(doc, config, index) {
        return new NumberTextController(doc, {
            arrayPosition: index === 0 ? 'fst' : index === config.axes.length - 1 ? 'lst' : 'mid',
            baseStep: config.axes[index].baseStep,
            parser: config.parser,
            props: config.axes[index].textProps,
            value: createValue(0, {
                constraint: config.axes[index].constraint,
            }),
            viewProps: config.viewProps,
        });
    }
    class PointNdTextController {
        constructor(doc, config) {
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.acs_ = config.axes.map((_, index) => createAxisController(doc, config, index));
            this.acs_.forEach((c, index) => {
                connectValues({
                    primary: this.value,
                    secondary: c.value,
                    forward: (p) => {
                        return config.assembly.toComponents(p.rawValue)[index];
                    },
                    backward: (p, s) => {
                        const comps = config.assembly.toComponents(p.rawValue);
                        comps[index] = s.rawValue;
                        return config.assembly.fromComponents(comps);
                    },
                });
            });
            this.view = new PointNdTextView(doc, {
                textViews: this.acs_.map((ac) => ac.view),
            });
        }
    }

    class CubicBezierApi extends BladeApi {
        get label() {
            return this.controller_.props.get('label');
        }
        set label(label) {
            this.controller_.props.set('label', label);
        }
        get value() {
            return this.controller_.valueController.value.rawValue;
        }
    }

    function interpolate(x1, x2, t) {
        return x1 * (1 - t) + x2 * t;
    }
    const MAX_ITERATION = 20;
    const X_DELTA = 0.001;
    const CACHE_RESOLUTION = 100;
    function y(cb, x) {
        let dt = 0.25;
        let t = 0.5;
        let y = -1;
        for (let i = 0; i < MAX_ITERATION; i++) {
            const [tx, ty] = cb.curve(t);
            t += dt * (tx < x ? +1 : -1);
            y = ty;
            dt *= 0.5;
            if (Math.abs(x - tx) < X_DELTA) {
                break;
            }
        }
        return y;
    }
    class CubicBezier {
        constructor(x1 = 0, y1 = 0, x2 = 1, y2 = 1) {
            this.cache_ = [];
            this.comps_ = [x1, y1, x2, y2];
        }
        get x1() {
            return this.comps_[0];
        }
        get y1() {
            return this.comps_[1];
        }
        get x2() {
            return this.comps_[2];
        }
        get y2() {
            return this.comps_[3];
        }
        static isObject(obj) {
            if (isEmpty(obj)) {
                return false;
            }
            if (!Array.isArray(obj)) {
                return false;
            }
            return (typeof obj[0] === 'number' &&
                typeof obj[1] === 'number' &&
                typeof obj[2] === 'number' &&
                typeof obj[3] === 'number');
        }
        static equals(v1, v2) {
            return (v1.x1 === v2.x1 && v1.y1 === v2.y1 && v1.x2 === v2.x2 && v1.y2 === v2.y2);
        }
        curve(t) {
            const x01 = interpolate(0, this.x1, t);
            const y01 = interpolate(0, this.y1, t);
            const x12 = interpolate(this.x1, this.x2, t);
            const y12 = interpolate(this.y1, this.y2, t);
            const x23 = interpolate(this.x2, 1, t);
            const y23 = interpolate(this.y2, 1, t);
            const xr0 = interpolate(x01, x12, t);
            const yr0 = interpolate(y01, y12, t);
            const xr1 = interpolate(x12, x23, t);
            const yr1 = interpolate(y12, y23, t);
            return [interpolate(xr0, xr1, t), interpolate(yr0, yr1, t)];
        }
        y(x) {
            if (this.cache_.length === 0) {
                const cache = [];
                for (let i = 0; i < CACHE_RESOLUTION; i++) {
                    cache.push(y(this, mapRange(i, 0, CACHE_RESOLUTION - 1, 0, 1)));
                }
                this.cache_ = cache;
            }
            return this.cache_[Math.round(mapRange(constrainRange(x, 0, 1), 0, 1, 0, CACHE_RESOLUTION - 1))];
        }
        toObject() {
            return [this.comps_[0], this.comps_[1], this.comps_[2], this.comps_[3]];
        }
    }
    const CubicBezierAssembly = {
        toComponents: (p) => p.toObject(),
        fromComponents: (comps) => new CubicBezier(...comps),
    };

    function cubicBezierToString(cb) {
        const formatter = createNumberFormatter(2);
        const comps = cb.toObject().map((c) => formatter(c));
        return `cubic-bezier(${comps.join(', ')})`;
    }
    const COMPS_EMPTY = [0, 0.5, 0.5, 1];
    function cubicBezierFromString(text) {
        const m = text.match(/^cubic-bezier\s*\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)$/);
        if (!m) {
            return new CubicBezier(...COMPS_EMPTY);
        }
        const comps = [m[1], m[2], m[3], m[4]].reduce((comps, comp) => {
            if (!comps) {
                return null;
            }
            const n = Number(comp);
            if (isNaN(n)) {
                return null;
            }
            return [...comps, n];
        }, []);
        return new CubicBezier(...(comps !== null && comps !== void 0 ? comps : COMPS_EMPTY));
    }

    const className$3 = ClassName('cbz');
    class CubicBezierView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$3());
            config.viewProps.bindClassModifiers(this.element);
            config.foldable.bindExpandedClass(this.element, className$3(undefined, 'expanded'));
            bindValueMap(config.foldable, 'completed', valueToClassName(this.element, className$3(undefined, 'cpl')));
            const headElem = doc.createElement('div');
            headElem.classList.add(className$3('h'));
            this.element.appendChild(headElem);
            const buttonElem = doc.createElement('button');
            buttonElem.classList.add(className$3('b'));
            config.viewProps.bindDisabled(buttonElem);
            const iconElem = doc.createElementNS(SVG_NS, 'svg');
            iconElem.innerHTML = '<path d="M2 13C8 13 8 3 14 3"/>';
            buttonElem.appendChild(iconElem);
            headElem.appendChild(buttonElem);
            this.buttonElement = buttonElem;
            const textElem = doc.createElement('div');
            textElem.classList.add(className$3('t'));
            headElem.appendChild(textElem);
            this.textElement = textElem;
            if (config.pickerLayout === 'inline') {
                const pickerElem = doc.createElement('div');
                pickerElem.classList.add(className$3('p'));
                this.element.appendChild(pickerElem);
                this.pickerElement = pickerElem;
            }
            else {
                this.pickerElement = null;
            }
        }
    }

    const className$2 = ClassName('cbzp');
    class CubicBezierPickerView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$2());
            config.viewProps.bindClassModifiers(this.element);
            const graphElem = doc.createElement('div');
            graphElem.classList.add(className$2('g'));
            this.element.appendChild(graphElem);
            this.graphElement = graphElem;
            const textElem = doc.createElement('div');
            textElem.classList.add(className$2('t'));
            this.element.appendChild(textElem);
            this.textElement = textElem;
        }
    }

    function waitToBeAddedToDom(elem, callback) {
        const ob = new MutationObserver((ml) => {
            for (const m of ml) {
                if (m.type !== 'childList') {
                    continue;
                }
                m.addedNodes.forEach((elem) => {
                    if (!elem.contains(elem)) {
                        return;
                    }
                    callback();
                    ob.disconnect();
                });
            }
        });
        const doc = elem.ownerDocument;
        ob.observe(doc.body, {
            attributes: true,
            childList: true,
            subtree: true,
        });
    }

    const className$1 = ClassName('cbzg');
    // TODO: Apply to core
    function compose(h1, h2) {
        return (input) => h2(h1(input));
    }
    class CubicBezierGraphView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$1());
            config.viewProps.bindClassModifiers(this.element);
            config.viewProps.bindTabIndex(this.element);
            const previewElem = doc.createElement('div');
            previewElem.classList.add(className$1('p'));
            this.element.appendChild(previewElem);
            this.previewElement = previewElem;
            const svgElem = doc.createElementNS(SVG_NS, 'svg');
            svgElem.classList.add(className$1('g'));
            this.element.appendChild(svgElem);
            this.svgElem_ = svgElem;
            const guideElem = doc.createElementNS(SVG_NS, 'path');
            guideElem.classList.add(className$1('u'));
            this.svgElem_.appendChild(guideElem);
            this.guideElem_ = guideElem;
            const lineElem = doc.createElementNS(SVG_NS, 'polyline');
            lineElem.classList.add(className$1('l'));
            this.svgElem_.appendChild(lineElem);
            this.lineElem_ = lineElem;
            this.handleElems_ = [doc.createElement('div'), doc.createElement('div')];
            this.handleElems_.forEach((elem) => {
                elem.classList.add(className$1('h'));
                this.element.appendChild(elem);
            });
            this.vectorElems_ = [
                doc.createElementNS(SVG_NS, 'line'),
                doc.createElementNS(SVG_NS, 'line'),
            ];
            this.vectorElems_.forEach((elem) => {
                elem.classList.add(className$1('v'));
                this.svgElem_.appendChild(elem);
            });
            this.value_ = config.value;
            this.value_.emitter.on('change', this.onValueChange_.bind(this));
            this.sel_ = config.selection;
            this.handleElems_.forEach((elem, index) => {
                bindValue(this.sel_, compose((selection) => selection === index, valueToClassName(elem, className$1('h', 'sel'))));
            });
            waitToBeAddedToDom(this.element, () => {
                this.refresh();
            });
        }
        getVertMargin_(h) {
            return h * 0.25;
        }
        valueToPosition(x, y) {
            const bounds = this.element.getBoundingClientRect();
            const w = bounds.width;
            const h = bounds.height;
            const vm = this.getVertMargin_(h);
            return {
                x: mapRange(x, 0, 1, 0, w),
                y: mapRange(y, 0, 1, h - vm, vm),
            };
        }
        positionToValue(x, y) {
            const bounds = this.element.getBoundingClientRect();
            const w = bounds.width;
            const h = bounds.height;
            const vm = this.getVertMargin_(h);
            return {
                x: constrainRange(mapRange(x, 0, w, 0, 1), 0, 1),
                y: mapRange(y, h - vm, vm, 0, 1),
            };
        }
        refresh() {
            this.guideElem_.setAttributeNS(null, 'd', [0, 1]
                .map((index) => {
                const p1 = this.valueToPosition(0, index);
                const p2 = this.valueToPosition(1, index);
                return [`M ${p1.x},${p1.y}`, `L ${p2.x},${p2.y}`].join(' ');
            })
                .join(' '));
            const bezier = this.value_.rawValue;
            const points = [];
            let t = 0;
            for (;;) {
                const p = this.valueToPosition(...bezier.curve(t));
                points.push([p.x, p.y].join(','));
                if (t >= 1) {
                    break;
                }
                t = Math.min(t + 0.05, 1);
            }
            this.lineElem_.setAttributeNS(null, 'points', points.join(' '));
            const obj = bezier.toObject();
            [0, 1].forEach((index) => {
                const p1 = this.valueToPosition(index, index);
                const p2 = this.valueToPosition(obj[index * 2], obj[index * 2 + 1]);
                const vElem = this.vectorElems_[index];
                vElem.setAttributeNS(null, 'x1', String(p1.x));
                vElem.setAttributeNS(null, 'y1', String(p1.y));
                vElem.setAttributeNS(null, 'x2', String(p2.x));
                vElem.setAttributeNS(null, 'y2', String(p2.y));
                const hElem = this.handleElems_[index];
                hElem.style.left = `${p2.x}px`;
                hElem.style.top = `${p2.y}px`;
            });
        }
        onValueChange_() {
            this.refresh();
        }
    }

    const TICK_COUNT = 24;
    const PREVIEW_DELAY = 400;
    const PREVIEW_DURATION = 1000;
    const className = ClassName('cbzprv');
    class CubicBezierPreviewView {
        constructor(doc, config) {
            this.stopped_ = true;
            this.startTime_ = -1;
            this.onDispose_ = this.onDispose_.bind(this);
            this.onTimer_ = this.onTimer_.bind(this);
            this.onValueChange_ = this.onValueChange_.bind(this);
            this.element = doc.createElement('div');
            this.element.classList.add(className());
            config.viewProps.bindClassModifiers(this.element);
            const svgElem = doc.createElementNS(SVG_NS, 'svg');
            svgElem.classList.add(className('g'));
            this.element.appendChild(svgElem);
            this.svgElem_ = svgElem;
            const ticksElem = doc.createElementNS(SVG_NS, 'path');
            ticksElem.classList.add(className('t'));
            this.svgElem_.appendChild(ticksElem);
            this.ticksElem_ = ticksElem;
            const markerElem = doc.createElement('div');
            markerElem.classList.add(className('m'));
            this.element.appendChild(markerElem);
            this.markerElem_ = markerElem;
            this.value_ = config.value;
            this.value_.emitter.on('change', this.onValueChange_);
            config.viewProps.handleDispose(this.onDispose_);
            waitToBeAddedToDom(this.element, () => {
                this.refresh();
            });
        }
        play() {
            this.stop();
            this.updateMarker_(0);
            this.markerElem_.classList.add(className('m', 'a'));
            this.startTime_ = new Date().getTime() + PREVIEW_DELAY;
            this.stopped_ = false;
            requestAnimationFrame(this.onTimer_);
        }
        stop() {
            this.stopped_ = true;
            this.markerElem_.classList.remove(className('m', 'a'));
        }
        onDispose_() {
            this.stop();
        }
        updateMarker_(progress) {
            const p = this.value_.rawValue.y(constrainRange(progress, 0, 1));
            this.markerElem_.style.left = `${p * 100}%`;
        }
        refresh() {
            const bounds = this.svgElem_.getBoundingClientRect();
            const w = bounds.width;
            const h = bounds.height;
            const ds = [];
            const bezier = this.value_.rawValue;
            for (let i = 0; i < TICK_COUNT; i++) {
                const px = mapRange(i, 0, TICK_COUNT - 1, 0, 1);
                const x = mapRange(bezier.y(px), 0, 1, 0, w);
                ds.push(`M ${x},0 v${h}`);
            }
            this.ticksElem_.setAttributeNS(null, 'd', ds.join(' '));
        }
        onTimer_() {
            if (this.startTime_ === null) {
                return;
            }
            const dt = new Date().getTime() - this.startTime_;
            const p = dt / PREVIEW_DURATION;
            this.updateMarker_(p);
            if (dt > PREVIEW_DURATION + PREVIEW_DELAY) {
                this.stop();
            }
            if (!this.stopped_) {
                requestAnimationFrame(this.onTimer_);
            }
        }
        onValueChange_() {
            this.refresh();
            this.play();
        }
    }

    function getDistance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    }
    function lockAngle(x1, y1, x2, y2) {
        const d = getDistance(x1, y1, x2, y2);
        const a = Math.atan2(y2 - y1, x2 - x1);
        const la = (Math.round(a / (Math.PI / 4)) * Math.PI) / 4;
        return {
            x: x1 + Math.cos(la) * d,
            y: y1 + Math.sin(la) * d,
        };
    }
    class CubicBezierGraphController {
        constructor(doc, config) {
            this.onKeyDown_ = this.onKeyDown_.bind(this);
            this.onPointerDown_ = this.onPointerDown_.bind(this);
            this.onPointerMove_ = this.onPointerMove_.bind(this);
            this.baseStep_ = config.baseStep;
            this.value = config.value;
            this.sel_ = createValue(0);
            this.viewProps = config.viewProps;
            this.view = new CubicBezierGraphView(doc, {
                selection: this.sel_,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.element.addEventListener('keydown', this.onKeyDown_);
            this.prevView_ = new CubicBezierPreviewView(doc, {
                value: this.value,
                viewProps: this.viewProps,
            });
            this.prevView_.element.addEventListener('mousedown', (ev) => {
                ev.stopImmediatePropagation();
                ev.preventDefault();
                this.prevView_.play();
            });
            this.view.previewElement.appendChild(this.prevView_.element);
            const ptHandler = new PointerHandler(this.view.element);
            ptHandler.emitter.on('down', this.onPointerDown_);
            ptHandler.emitter.on('move', this.onPointerMove_);
        }
        refresh() {
            this.view.refresh();
            this.prevView_.refresh();
            this.prevView_.play();
        }
        updateValue_(point, locksAngle) {
            const index = this.sel_.rawValue;
            const comps = this.value.rawValue.toObject();
            const vp = this.view.positionToValue(point.x, point.y);
            const v = locksAngle ? lockAngle(index, index, vp.x, vp.y) : vp;
            comps[index * 2] = v.x;
            comps[index * 2 + 1] = v.y;
            this.value.rawValue = new CubicBezier(...comps);
        }
        onPointerDown_(ev) {
            const data = ev.data;
            if (!data.point) {
                return;
            }
            const bezier = this.value.rawValue;
            const p1 = this.view.valueToPosition(bezier.x1, bezier.y1);
            const d1 = getDistance(data.point.x, data.point.y, p1.x, p1.y);
            const p2 = this.view.valueToPosition(bezier.x2, bezier.y2);
            const d2 = getDistance(data.point.x, data.point.y, p2.x, p2.y);
            this.sel_.rawValue = d1 <= d2 ? 0 : 1;
            this.updateValue_(data.point, ev.shiftKey);
        }
        onPointerMove_(ev) {
            const data = ev.data;
            if (!data.point) {
                return;
            }
            this.updateValue_(data.point, ev.shiftKey);
        }
        onKeyDown_(ev) {
            if (isArrowKey(ev.key)) {
                ev.preventDefault();
            }
            const index = this.sel_.rawValue;
            const comps = this.value.rawValue.toObject();
            comps[index * 2] += getStepForKey(this.baseStep_, getHorizontalStepKeys(ev));
            comps[index * 2 + 1] += getStepForKey(this.baseStep_, getVerticalStepKeys(ev));
            this.value.rawValue = new CubicBezier(...comps);
        }
    }

    class CubicBezierPickerController {
        constructor(doc, config) {
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.view = new CubicBezierPickerView(doc, {
                viewProps: this.viewProps,
            });
            this.gc_ = new CubicBezierGraphController(doc, {
                baseStep: config.axis.baseStep,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.graphElement.appendChild(this.gc_.view.element);
            const xAxis = Object.assign(Object.assign({}, config.axis), { constraint: new RangeConstraint({ max: 1, min: 0 }) });
            const yAxis = Object.assign(Object.assign({}, config.axis), { constraint: undefined });
            this.tc_ = new PointNdTextController(doc, {
                assembly: CubicBezierAssembly,
                axes: [xAxis, yAxis, xAxis, yAxis],
                parser: parseNumber,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.textElement.appendChild(this.tc_.view.element);
        }
        get allFocusableElements() {
            return [
                this.gc_.view.element,
                ...this.tc_.view.textViews.map((v) => v.inputElement),
            ];
        }
        refresh() {
            this.gc_.refresh();
        }
    }

    class CubicBezierController {
        constructor(doc, config) {
            this.onButtonBlur_ = this.onButtonBlur_.bind(this);
            this.onButtonClick_ = this.onButtonClick_.bind(this);
            this.onPopupChildBlur_ = this.onPopupChildBlur_.bind(this);
            this.onPopupChildKeydown_ = this.onPopupChildKeydown_.bind(this);
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.foldable_ = createFoldable(config.expanded);
            this.view = new CubicBezierView(doc, {
                foldable: this.foldable_,
                pickerLayout: config.pickerLayout,
                viewProps: this.viewProps,
            });
            this.view.buttonElement.addEventListener('blur', this.onButtonBlur_);
            this.view.buttonElement.addEventListener('click', this.onButtonClick_);
            this.tc_ = new TextController(doc, {
                parser: cubicBezierFromString,
                props: ValueMap.fromObject({
                    formatter: cubicBezierToString,
                }),
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view.textElement.appendChild(this.tc_.view.element);
            this.popC_ =
                config.pickerLayout === 'popup'
                    ? new PopupController(doc, {
                        viewProps: this.viewProps,
                    })
                    : null;
            const pickerC = new CubicBezierPickerController(doc, {
                axis: config.axis,
                value: this.value,
                viewProps: this.viewProps,
            });
            pickerC.allFocusableElements.forEach((elem) => {
                elem.addEventListener('blur', this.onPopupChildBlur_);
                elem.addEventListener('keydown', this.onPopupChildKeydown_);
            });
            this.pickerC_ = pickerC;
            if (this.popC_) {
                this.view.element.appendChild(this.popC_.view.element);
                this.popC_.view.element.appendChild(this.pickerC_.view.element);
                bindValue(this.popC_.shows, (shows) => {
                    if (shows) {
                        pickerC.refresh();
                    }
                });
                connectValues({
                    primary: this.foldable_.value('expanded'),
                    secondary: this.popC_.shows,
                    forward: (p) => p.rawValue,
                    backward: (_, s) => s.rawValue,
                });
            }
            else if (this.view.pickerElement) {
                this.view.pickerElement.appendChild(this.pickerC_.view.element);
                bindFoldable(this.foldable_, this.view.pickerElement);
            }
        }
        onButtonBlur_(ev) {
            if (!this.popC_) {
                return;
            }
            const nextTarget = forceCast(ev.relatedTarget);
            if (!nextTarget || !this.popC_.view.element.contains(nextTarget)) {
                this.popC_.shows.rawValue = false;
            }
        }
        onButtonClick_() {
            this.foldable_.set('expanded', !this.foldable_.get('expanded'));
            if (this.foldable_.get('expanded')) {
                this.pickerC_.allFocusableElements[0].focus();
            }
        }
        onPopupChildBlur_(ev) {
            if (!this.popC_) {
                return;
            }
            const elem = this.popC_.view.element;
            const nextTarget = findNextTarget(ev);
            if (nextTarget && elem.contains(nextTarget)) {
                // Next target is in the popup
                return;
            }
            if (nextTarget &&
                nextTarget === this.view.buttonElement &&
                !supportsTouch(elem.ownerDocument)) {
                // Next target is the trigger button
                return;
            }
            this.popC_.shows.rawValue = false;
        }
        onPopupChildKeydown_(ev) {
            if (!this.popC_) {
                return;
            }
            if (ev.key === 'Escape') {
                this.popC_.shows.rawValue = false;
            }
        }
    }

    function createConstraint() {
        return new PointNdConstraint({
            assembly: CubicBezierAssembly,
            components: [0, 1, 2, 3].map((index) => index % 2 === 0
                ? new RangeConstraint({
                    min: 0,
                    max: 1,
                })
                : undefined),
        });
    }
    const CubicBezierBladePlugin = {
        id: 'cubic-bezier',
        type: 'blade',
        css: '.tp-cbzv_b,.tp-cbzgv{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0}.tp-cbzv_b{background-color:var(--btn-bg);border-radius:var(--elm-br);color:var(--btn-fg);cursor:pointer;display:block;font-weight:bold;height:var(--bld-us);line-height:var(--bld-us);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tp-cbzv_b:hover{background-color:var(--btn-bg-h)}.tp-cbzv_b:focus{background-color:var(--btn-bg-f)}.tp-cbzv_b:active{background-color:var(--btn-bg-a)}.tp-cbzv_b:disabled{opacity:0.5}.tp-cbzgv{background-color:var(--in-bg);border-radius:var(--elm-br);box-sizing:border-box;color:var(--in-fg);font-family:inherit;height:var(--bld-us);line-height:var(--bld-us);min-width:0;width:100%}.tp-cbzgv:hover{background-color:var(--in-bg-h)}.tp-cbzgv:focus{background-color:var(--in-bg-f)}.tp-cbzgv:active{background-color:var(--in-bg-a)}.tp-cbzgv:disabled{opacity:0.5}.tp-cbzv{position:relative}.tp-cbzv_h{display:flex}.tp-cbzv_b{margin-right:4px;position:relative;width:var(--bld-us)}.tp-cbzv_b svg{display:block;height:16px;left:50%;margin-left:-8px;margin-top:-8px;position:absolute;top:50%;width:16px}.tp-cbzv_b svg path{stroke:var(--bs-bg);stroke-width:2}.tp-cbzv_t{flex:1}.tp-cbzv_p{height:0;margin-top:0;opacity:0;overflow:hidden;transition:height .2s ease-in-out,opacity .2s linear,margin .2s ease-in-out}.tp-cbzv.tp-cbzv-expanded .tp-cbzv_p{margin-top:var(--bld-s);opacity:1}.tp-cbzv.tp-cbzv-cpl .tp-cbzv_p{overflow:visible}.tp-cbzv .tp-popv{left:calc(-1 * var(--cnt-h-p));position:absolute;right:calc(-1 * var(--cnt-h-p));top:var(--bld-us)}.tp-cbzpv_t{margin-top:var(--bld-s)}.tp-cbzgv{height:auto;overflow:hidden;position:relative}.tp-cbzgv.tp-v-disabled{opacity:0.5}.tp-cbzgv_p{left:16px;position:absolute;right:16px;top:0}.tp-cbzgv_g{cursor:pointer;display:block;height:calc(var(--bld-us) * 5);width:100%}.tp-cbzgv_u{opacity:0.1;stroke:var(--in-fg);stroke-dasharray:1}.tp-cbzgv_l{fill:transparent;stroke:var(--in-fg)}.tp-cbzgv_v{opacity:0.5;stroke:var(--in-fg);stroke-dasharray:1}.tp-cbzgv_h{border:var(--in-fg) solid 1px;border-radius:50%;box-sizing:border-box;height:4px;margin-left:-2px;margin-top:-2px;pointer-events:none;position:absolute;width:4px}.tp-cbzgv:focus .tp-cbzgv_h-sel{background-color:var(--in-fg);border-width:0}.tp-cbzprvv{cursor:pointer;height:4px;padding:4px 0;position:relative}.tp-cbzprvv_g{display:block;height:100%;overflow:visible;width:100%}.tp-cbzprvv_t{opacity:0.5;stroke:var(--mo-fg)}.tp-cbzprvv_m{background-color:var(--mo-fg);border-radius:50%;height:4px;margin-left:-2px;margin-top:-2px;opacity:0;position:absolute;top:50%;transition:opacity 0.2s ease-out;width:4px}.tp-cbzprvv_m.tp-cbzprvv_m-a{opacity:1}',
        accept(params) {
            const p = ParamsParsers;
            const result = parseParams(params, {
                value: p.required.array(p.required.number),
                view: p.required.constant('cubicbezier'),
                expanded: p.optional.boolean,
                label: p.optional.string,
                picker: p.optional.custom((v) => {
                    return v === 'inline' || v === 'popup' ? v : undefined;
                }),
            });
            return result ? { params: result } : null;
        },
        controller(args) {
            var _a, _b;
            const rv = new CubicBezier(...args.params.value);
            const v = createValue(rv, {
                constraint: createConstraint(),
                equals: CubicBezier.equals,
            });
            const vc = new CubicBezierController(args.document, {
                axis: {
                    baseStep: 0.1,
                    textProps: ValueMap.fromObject({
                        draggingScale: 0.01,
                        formatter: createNumberFormatter(2),
                    }),
                },
                expanded: (_a = args.params.expanded) !== null && _a !== void 0 ? _a : false,
                pickerLayout: (_b = args.params.picker) !== null && _b !== void 0 ? _b : 'popup',
                value: v,
                viewProps: args.viewProps,
            });
            return new LabeledValueController(args.document, {
                blade: args.blade,
                props: ValueMap.fromObject({
                    label: args.params.label,
                }),
                valueController: vc,
            });
        },
        api(args) {
            if (!(args.controller instanceof LabeledValueController)) {
                return null;
            }
            if (!(args.controller.valueController instanceof CubicBezierController)) {
                return null;
            }
            return new CubicBezierApi(args.controller);
        },
    };

    exports.plugin = CubicBezierBladePlugin;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
