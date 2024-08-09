(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TormakTweakpaneGradientPlugin = {}));
})(this, (function (exports) { 'use strict';

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
            const changed = !this.equals_(this.rawValue_, constrainedValue);
            if (!changed && !opts.forceEmit) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.rawValue_ = constrainedValue;
            this.emitter.emit('change', {
                options: opts,
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
            if (this.value_ === value && !opts.forceEmit) {
                return;
            }
            this.emitter.emit('beforechange', {
                sender: this,
            });
            this.value_ = value;
            this.emitter.emit('change', {
                options: opts,
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

    const SVG_NS = 'http://www.w3.org/2000/svg';
    function supportsTouch(doc) {
        return doc.ontouchstart !== undefined;
    }
    function getCanvasContext(canvasElement) {
        const win = canvasElement.ownerDocument.defaultView;
        if (!win) {
            return null;
        }
        const isBrowser = 'document' in win;
        return isBrowser ? canvasElement.getContext('2d') : null;
    }
    const ICON_ID_TO_INNER_HTML_MAP = {
        check: '<path d="M2 8l4 4l8 -8"/>',
        dropdown: '<path d="M5 7h6l-3 3 z"/>',
        p2dpad: '<path d="M8 4v8"/><path d="M4 8h8"/><circle cx="12" cy="12" r="1.2"/>',
    };
    function createSvgIconElement(document, iconId) {
        const elem = document.createElementNS(SVG_NS, 'svg');
        elem.innerHTML = ICON_ID_TO_INNER_HTML_MAP[iconId];
        return elem;
    }
    function removeChildElements(element) {
        while (element.children.length > 0) {
            element.removeChild(element.children[0]);
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
            const onExpand = () => {
                const expanded = this.styleExpanded;
                if (expanded) {
                    elem.classList.add(expandedClassName);
                }
                else {
                    elem.classList.remove(expandedClassName);
                }
            };
            bindValueMap(this, 'expanded', onExpand);
            bindValueMap(this, 'temporaryExpanded', onExpand);
        }
        cleanUpTransition() {
            this.set('shouldFixHeight', false);
            this.set('expandedHeight', null);
            this.set('completed', true);
        }
    }

    class CompositeConstraint {
        constructor(constraints) {
            this.constraints = constraints;
        }
        constrain(value) {
            return this.constraints.reduce((result, c) => {
                return c.constrain(result);
            }, value);
        }
    }
    function findConstraint(c, constraintClass) {
        if (c instanceof constraintClass) {
            return c;
        }
        if (c instanceof CompositeConstraint) {
            const result = c.constraints.reduce((tmpResult, sc) => {
                if (tmpResult) {
                    return tmpResult;
                }
                return sc instanceof constraintClass ? sc : null;
            }, null);
            if (result) {
                return result;
            }
        }
        return null;
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

    class StepConstraint {
        constructor(step, origin = 0) {
            this.step = step;
            this.origin = origin;
        }
        constrain(value) {
            const o = this.origin % this.step;
            const r = Math.round((value - o) / this.step);
            return o + r * this.step;
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
        var _a;
        return ((_a = parseLiteral(text, cursor)) !== null && _a !== void 0 ? _a : parseParenthesizedExpression(text, cursor));
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

    const innerFormatter = createNumberFormatter(0);
    function formatPercentage(value) {
        return innerFormatter(value) + '%';
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
        primary.emitter.on('change', (ev) => {
            preventFeedback(() => {
                secondary.setRawValue(forward(primary, secondary), ev.options);
            });
        });
        secondary.emitter.on('change', (ev) => {
            preventFeedback(() => {
                primary.setRawValue(backward(primary, secondary), ev.options);
            });
            preventFeedback(() => {
                secondary.setRawValue(forward(primary, secondary), ev.options);
            });
        });
        preventFeedback(() => {
            secondary.setRawValue(forward(primary, secondary), {
                forceEmit: false,
                last: true,
            });
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

    function mapRange(value, start1, end1, start2, end2) {
        const p = (value - start1) / (end1 - start1);
        return start2 + p * (end2 - start2);
    }
    function getDecimalDigits(value) {
        const text = String(value.toFixed(10));
        const frac = text.split('.')[1];
        return frac.replace(/0+$/, '').length;
    }
    function constrainRange(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    function loopRange(value, max) {
        return ((value % max) + max) % max;
    }

    const className$6 = ClassName('txt');
    class NumberTextView {
        constructor(doc, config) {
            this.onChange_ = this.onChange_.bind(this);
            this.props_ = config.props;
            this.props_.emitter.on('change', this.onChange_);
            this.element = doc.createElement('div');
            this.element.classList.add(className$6(), className$6(undefined, 'num'));
            if (config.arrayPosition) {
                this.element.classList.add(className$6(undefined, config.arrayPosition));
            }
            config.viewProps.bindClassModifiers(this.element);
            const inputElem = doc.createElement('input');
            inputElem.classList.add(className$6('i'));
            inputElem.type = 'text';
            config.viewProps.bindDisabled(inputElem);
            this.element.appendChild(inputElem);
            this.inputElement = inputElem;
            this.onDraggingChange_ = this.onDraggingChange_.bind(this);
            this.dragging_ = config.dragging;
            this.dragging_.emitter.on('change', this.onDraggingChange_);
            this.element.classList.add(className$6());
            this.inputElement.classList.add(className$6('i'));
            const knobElem = doc.createElement('div');
            knobElem.classList.add(className$6('k'));
            this.element.appendChild(knobElem);
            this.knobElement = knobElem;
            const guideElem = doc.createElementNS(SVG_NS, 'svg');
            guideElem.classList.add(className$6('g'));
            this.knobElement.appendChild(guideElem);
            const bodyElem = doc.createElementNS(SVG_NS, 'path');
            bodyElem.classList.add(className$6('gb'));
            guideElem.appendChild(bodyElem);
            this.guideBodyElem_ = bodyElem;
            const headElem = doc.createElementNS(SVG_NS, 'path');
            headElem.classList.add(className$6('gh'));
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
                this.element.classList.remove(className$6(undefined, 'drg'));
                return;
            }
            this.element.classList.add(className$6(undefined, 'drg'));
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
            var _a;
            this.originRawValue_ = 0;
            this.onInputChange_ = this.onInputChange_.bind(this);
            this.onInputKeyDown_ = this.onInputKeyDown_.bind(this);
            this.onInputKeyUp_ = this.onInputKeyUp_.bind(this);
            this.onPointerDown_ = this.onPointerDown_.bind(this);
            this.onPointerMove_ = this.onPointerMove_.bind(this);
            this.onPointerUp_ = this.onPointerUp_.bind(this);
            this.baseStep_ = config.baseStep;
            this.parser_ = config.parser;
            this.props = config.props;
            this.sliderProps_ = (_a = config.sliderProps) !== null && _a !== void 0 ? _a : null;
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
            this.view.inputElement.addEventListener('keyup', this.onInputKeyUp_);
            const ph = new PointerHandler(this.view.knobElement);
            ph.emitter.on('down', this.onPointerDown_);
            ph.emitter.on('move', this.onPointerMove_);
            ph.emitter.on('up', this.onPointerUp_);
        }
        constrainValue_(value) {
            var _a, _b;
            const min = (_a = this.sliderProps_) === null || _a === void 0 ? void 0 : _a.get('minValue');
            const max = (_b = this.sliderProps_) === null || _b === void 0 ? void 0 : _b.get('maxValue');
            let v = value;
            if (min !== undefined) {
                v = Math.max(v, min);
            }
            if (max !== undefined) {
                v = Math.min(v, max);
            }
            return v;
        }
        onInputChange_(e) {
            const inputElem = forceCast(e.currentTarget);
            const value = inputElem.value;
            const parsedValue = this.parser_(value);
            if (!isEmpty(parsedValue)) {
                this.value.rawValue = this.constrainValue_(parsedValue);
            }
            this.view.refresh();
        }
        onInputKeyDown_(ev) {
            const step = getStepForKey(this.baseStep_, getVerticalStepKeys(ev));
            if (step === 0) {
                return;
            }
            this.value.setRawValue(this.constrainValue_(this.value.rawValue + step), {
                forceEmit: false,
                last: false,
            });
        }
        onInputKeyUp_(ev) {
            const step = getStepForKey(this.baseStep_, getVerticalStepKeys(ev));
            if (step === 0) {
                return;
            }
            this.value.setRawValue(this.value.rawValue, {
                forceEmit: true,
                last: true,
            });
        }
        onPointerDown_() {
            this.originRawValue_ = this.value.rawValue;
            this.dragging_.rawValue = 0;
        }
        computeDraggingValue_(data) {
            if (!data.point) {
                return null;
            }
            const dx = data.point.x - data.bounds.width / 2;
            return this.constrainValue_(this.originRawValue_ + dx * this.props.get('draggingScale'));
        }
        onPointerMove_(ev) {
            const v = this.computeDraggingValue_(ev.data);
            if (v === null) {
                return;
            }
            this.value.setRawValue(v, {
                forceEmit: false,
                last: false,
            });
            this.dragging_.rawValue = this.value.rawValue - this.originRawValue_;
        }
        onPointerUp_(ev) {
            const v = this.computeDraggingValue_(ev.data);
            if (v === null) {
                return;
            }
            this.value.setRawValue(v, {
                forceEmit: true,
                last: true,
            });
            this.dragging_.rawValue = null;
        }
    }

    function getSuitableDecimalDigits(constraint, rawValue) {
        const sc = constraint && findConstraint(constraint, StepConstraint);
        if (sc) {
            return getDecimalDigits(sc.step);
        }
        return Math.max(getDecimalDigits(rawValue), 2);
    }

    function rgbToHslInt(r, g, b) {
        const rp = constrainRange(r / 255, 0, 1);
        const gp = constrainRange(g / 255, 0, 1);
        const bp = constrainRange(b / 255, 0, 1);
        const cmax = Math.max(rp, gp, bp);
        const cmin = Math.min(rp, gp, bp);
        const c = cmax - cmin;
        let h = 0;
        let s = 0;
        const l = (cmin + cmax) / 2;
        if (c !== 0) {
            s = c / (1 - Math.abs(cmax + cmin - 1));
            if (rp === cmax) {
                h = (gp - bp) / c;
            }
            else if (gp === cmax) {
                h = 2 + (bp - rp) / c;
            }
            else {
                h = 4 + (rp - gp) / c;
            }
            h = h / 6 + (h < 0 ? 1 : 0);
        }
        return [h * 360, s * 100, l * 100];
    }
    function hslToRgbInt(h, s, l) {
        const hp = ((h % 360) + 360) % 360;
        const sp = constrainRange(s / 100, 0, 1);
        const lp = constrainRange(l / 100, 0, 1);
        const c = (1 - Math.abs(2 * lp - 1)) * sp;
        const x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
        const m = lp - c / 2;
        let rp, gp, bp;
        if (hp >= 0 && hp < 60) {
            [rp, gp, bp] = [c, x, 0];
        }
        else if (hp >= 60 && hp < 120) {
            [rp, gp, bp] = [x, c, 0];
        }
        else if (hp >= 120 && hp < 180) {
            [rp, gp, bp] = [0, c, x];
        }
        else if (hp >= 180 && hp < 240) {
            [rp, gp, bp] = [0, x, c];
        }
        else if (hp >= 240 && hp < 300) {
            [rp, gp, bp] = [x, 0, c];
        }
        else {
            [rp, gp, bp] = [c, 0, x];
        }
        return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
    }
    function rgbToHsvInt(r, g, b) {
        const rp = constrainRange(r / 255, 0, 1);
        const gp = constrainRange(g / 255, 0, 1);
        const bp = constrainRange(b / 255, 0, 1);
        const cmax = Math.max(rp, gp, bp);
        const cmin = Math.min(rp, gp, bp);
        const d = cmax - cmin;
        let h;
        if (d === 0) {
            h = 0;
        }
        else if (cmax === rp) {
            h = 60 * (((((gp - bp) / d) % 6) + 6) % 6);
        }
        else if (cmax === gp) {
            h = 60 * ((bp - rp) / d + 2);
        }
        else {
            h = 60 * ((rp - gp) / d + 4);
        }
        const s = cmax === 0 ? 0 : d / cmax;
        const v = cmax;
        return [h, s * 100, v * 100];
    }
    function hsvToRgbInt$1(h, s, v) {
        const hp = loopRange(h, 360);
        const sp = constrainRange(s / 100, 0, 1);
        const vp = constrainRange(v / 100, 0, 1);
        const c = vp * sp;
        const x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
        const m = vp - c;
        let rp, gp, bp;
        if (hp >= 0 && hp < 60) {
            [rp, gp, bp] = [c, x, 0];
        }
        else if (hp >= 60 && hp < 120) {
            [rp, gp, bp] = [x, c, 0];
        }
        else if (hp >= 120 && hp < 180) {
            [rp, gp, bp] = [0, c, x];
        }
        else if (hp >= 180 && hp < 240) {
            [rp, gp, bp] = [0, x, c];
        }
        else if (hp >= 240 && hp < 300) {
            [rp, gp, bp] = [x, 0, c];
        }
        else {
            [rp, gp, bp] = [c, 0, x];
        }
        return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
    }
    function hslToHsvInt(h, s, l) {
        const sd = l + (s * (100 - Math.abs(2 * l - 100))) / (2 * 100);
        return [
            h,
            sd !== 0 ? (s * (100 - Math.abs(2 * l - 100))) / sd : 0,
            l + (s * (100 - Math.abs(2 * l - 100))) / (2 * 100),
        ];
    }
    function hsvToHslInt(h, s, v) {
        const sd = 100 - Math.abs((v * (200 - s)) / 100 - 100);
        return [h, sd !== 0 ? (s * v) / sd : 0, (v * (200 - s)) / (2 * 100)];
    }
    function removeAlphaComponent$1(comps) {
        return [comps[0], comps[1], comps[2]];
    }
    function appendAlphaComponent$1(comps, alpha) {
        return [comps[0], comps[1], comps[2], alpha];
    }
    const MODE_CONVERTER_MAP = {
        hsl: {
            hsl: (h, s, l) => [h, s, l],
            hsv: hslToHsvInt,
            rgb: hslToRgbInt,
        },
        hsv: {
            hsl: hsvToHslInt,
            hsv: (h, s, v) => [h, s, v],
            rgb: hsvToRgbInt$1,
        },
        rgb: {
            hsl: rgbToHslInt,
            hsv: rgbToHsvInt,
            rgb: (r, g, b) => [r, g, b],
        },
    };
    function getColorMaxComponents$1(mode, type) {
        return [
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 360,
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
        ];
    }
    function constrainColorComponents(components, mode, type) {
        var _a;
        const ms = getColorMaxComponents$1(mode, type);
        return [
            mode === 'rgb'
                ? constrainRange(components[0], 0, ms[0])
                : loopRange(components[0], ms[0]),
            constrainRange(components[1], 0, ms[1]),
            constrainRange(components[2], 0, ms[2]),
            constrainRange((_a = components[3]) !== null && _a !== void 0 ? _a : 1, 0, 1),
        ];
    }
    function convertColorType(comps, mode, from, to) {
        const fms = getColorMaxComponents$1(mode, from);
        const tms = getColorMaxComponents$1(mode, to);
        return comps.map((c, index) => (c / fms[index]) * tms[index]);
    }
    function convertColor(components, from, to) {
        const intComps = convertColorType(components, from.mode, from.type, 'int');
        const result = MODE_CONVERTER_MAP[from.mode][to.mode](...intComps);
        return convertColorType(result, to.mode, 'int', to.type);
    }

    function isRgbColorComponent(obj, key) {
        if (typeof obj !== 'object' || isEmpty(obj)) {
            return false;
        }
        return key in obj && typeof obj[key] === 'number';
    }
    class Color {
        constructor(comps, mode, type = 'int') {
            this.mode = mode;
            this.type = type;
            this.comps_ = constrainColorComponents(comps, mode, type);
        }
        static black(type = 'int') {
            return new Color([0, 0, 0], 'rgb', type);
        }
        static fromObject(obj, type = 'int') {
            const comps = 'a' in obj ? [obj.r, obj.g, obj.b, obj.a] : [obj.r, obj.g, obj.b];
            return new Color(comps, 'rgb', type);
        }
        static toRgbaObject(color, type = 'int') {
            return color.toRgbaObject(type);
        }
        static isRgbColorObject(obj) {
            return (isRgbColorComponent(obj, 'r') &&
                isRgbColorComponent(obj, 'g') &&
                isRgbColorComponent(obj, 'b'));
        }
        static isRgbaColorObject(obj) {
            return this.isRgbColorObject(obj) && isRgbColorComponent(obj, 'a');
        }
        static isColorObject(obj) {
            return this.isRgbColorObject(obj);
        }
        static equals(v1, v2) {
            if (v1.mode !== v2.mode) {
                return false;
            }
            const comps1 = v1.comps_;
            const comps2 = v2.comps_;
            for (let i = 0; i < comps1.length; i++) {
                if (comps1[i] !== comps2[i]) {
                    return false;
                }
            }
            return true;
        }
        getComponents(opt_mode, type = 'int') {
            return appendAlphaComponent$1(convertColor(removeAlphaComponent$1(this.comps_), { mode: this.mode, type: this.type }, { mode: opt_mode !== null && opt_mode !== void 0 ? opt_mode : this.mode, type }), this.comps_[3]);
        }
        toRgbaObject(type = 'int') {
            const rgbComps = this.getComponents('rgb', type);
            return {
                r: rgbComps[0],
                g: rgbComps[1],
                b: rgbComps[2],
                a: rgbComps[3],
            };
        }
    }

    function zerofill(comp) {
        const hex = constrainRange(Math.floor(comp), 0, 255).toString(16);
        return hex.length === 1 ? `0${hex}` : hex;
    }
    function colorToHexRgbString(value, prefix = '#') {
        const hexes = removeAlphaComponent$1(value.getComponents('rgb'))
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
        const comps = removeAlphaComponent$1(value.getComponents('rgb', opt_type)).map((comp) => formatter(comp));
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
        const comps = removeAlphaComponent$1(value.getComponents('hsl')).map((comp, index) => formatters[index](comp));
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
        const comps = removeAlphaComponent$1(value.getComponents('rgb', type)).map((comp, index) => `${names[index]}: ${formatter(comp)}`);
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

    const className$5 = ClassName('colp');
    class ColorPickerView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$5());
            const hsvElem = doc.createElement('div');
            hsvElem.classList.add(className$5('hsv'));
            const svElem = doc.createElement('div');
            svElem.classList.add(className$5('sv'));
            this.svPaletteView_ = config.svPaletteView;
            svElem.appendChild(this.svPaletteView_.element);
            hsvElem.appendChild(svElem);
            const hElem = doc.createElement('div');
            hElem.classList.add(className$5('h'));
            this.hPaletteView_ = config.hPaletteView;
            hElem.appendChild(this.hPaletteView_.element);
            hsvElem.appendChild(hElem);
            this.element.appendChild(hsvElem);
            const rgbElem = doc.createElement('div');
            rgbElem.classList.add(className$5('rgb'));
            this.textView_ = config.textView;
            rgbElem.appendChild(this.textView_.element);
            this.element.appendChild(rgbElem);
        }
        get allFocusableElements() {
            const elems = [
                this.svPaletteView_.element,
                this.hPaletteView_.element,
                this.textView_.modeSelectElement,
                ...this.textView_.textViews.map((v) => v.inputElement),
            ];
            return elems;
        }
    }

    const className$4 = ClassName('coltxt');
    function createModeSelectElement(doc) {
        const selectElem = doc.createElement('select');
        const items = [
            { text: 'RGB', value: 'rgb' },
            { text: 'HSL', value: 'hsl' },
            { text: 'HSV', value: 'hsv' },
        ];
        selectElem.appendChild(items.reduce((frag, item) => {
            const optElem = doc.createElement('option');
            optElem.textContent = item.text;
            optElem.value = item.value;
            frag.appendChild(optElem);
            return frag;
        }, doc.createDocumentFragment()));
        return selectElem;
    }
    /**
     * @hidden
     */
    class ColorTextView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$4());
            const modeElem = doc.createElement('div');
            modeElem.classList.add(className$4('m'));
            this.modeElem_ = createModeSelectElement(doc);
            this.modeElem_.classList.add(className$4('ms'));
            modeElem.appendChild(this.modeSelectElement);
            const modeMarkerElem = doc.createElement('div');
            modeMarkerElem.classList.add(className$4('mm'));
            modeMarkerElem.appendChild(createSvgIconElement(doc, 'dropdown'));
            modeElem.appendChild(modeMarkerElem);
            this.element.appendChild(modeElem);
            const textsElem = doc.createElement('div');
            textsElem.classList.add(className$4('w'));
            this.element.appendChild(textsElem);
            this.textsElem_ = textsElem;
            this.textViews_ = config.textViews;
            this.applyTextViews_();
            bindValue(config.colorMode, (mode) => {
                this.modeElem_.value = mode;
            });
        }
        get modeSelectElement() {
            return this.modeElem_;
        }
        get textViews() {
            return this.textViews_;
        }
        set textViews(textViews) {
            this.textViews_ = textViews;
            this.applyTextViews_();
        }
        applyTextViews_() {
            removeChildElements(this.textsElem_);
            const doc = this.element.ownerDocument;
            this.textViews_.forEach((v) => {
                const compElem = doc.createElement('div');
                compElem.classList.add(className$4('c'));
                compElem.appendChild(v.element);
                this.textsElem_.appendChild(compElem);
            });
        }
    }

    /**
     * @hidden
     */
    function hsvToRgbInt(h, s, v) {
        const hp = loopRange(h, 360);
        const sp = constrainRange(s / 100, 0, 1);
        const vp = constrainRange(v / 100, 0, 1);
        const c = vp * sp;
        const x = c * (1 - Math.abs(((hp / 60) % 2) - 1));
        const m = vp - c;
        let rp, gp, bp;
        if (hp >= 0 && hp < 60) {
            [rp, gp, bp] = [c, x, 0];
        }
        else if (hp >= 60 && hp < 120) {
            [rp, gp, bp] = [x, c, 0];
        }
        else if (hp >= 120 && hp < 180) {
            [rp, gp, bp] = [0, c, x];
        }
        else if (hp >= 180 && hp < 240) {
            [rp, gp, bp] = [0, x, c];
        }
        else if (hp >= 240 && hp < 300) {
            [rp, gp, bp] = [x, 0, c];
        }
        else {
            [rp, gp, bp] = [c, 0, x];
        }
        return [(rp + m) * 255, (gp + m) * 255, (bp + m) * 255];
    }
    /**
     * @hidden
     */
    function removeAlphaComponent(comps) {
        return [comps[0], comps[1], comps[2]];
    }
    /**
     * @hidden
     */
    function appendAlphaComponent(comps, alpha) {
        return [comps[0], comps[1], comps[2], alpha];
    }
    /**
     * @hidden
     */
    function getColorMaxComponents(mode, type) {
        return [
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 360,
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
            type === 'float' ? 1 : mode === 'rgb' ? 255 : 100,
        ];
    }

    /**
     * @hidden
     */
    function getBaseStepForColor(forAlpha) {
        return forAlpha ? 0.1 : 1;
    }

    function createFormatter(type) {
        return createNumberFormatter(type === 'float' ? 2 : 0);
    }
    function createConstraint(mode, type, index) {
        const max = getColorMaxComponents(mode, type)[index];
        return new RangeConstraint({
            min: 0,
            max: max,
        });
    }
    function createComponentController(doc, config, index) {
        return new NumberTextController(doc, {
            arrayPosition: index === 0 ? 'fst' : index === 3 - 1 ? 'lst' : 'mid',
            baseStep: getBaseStepForColor(false),
            parser: config.parser,
            props: ValueMap.fromObject({
                draggingScale: config.colorType === 'float' ? 0.01 : 1,
                formatter: createFormatter(config.colorType),
            }),
            value: createValue(0, {
                constraint: createConstraint(config.colorMode, config.colorType, index),
            }),
            viewProps: config.viewProps,
        });
    }
    /**
     * @hidden
     */
    class ColorTextController {
        constructor(doc, config) {
            this.onModeSelectChange_ = this.onModeSelectChange_.bind(this);
            this.colorType_ = config.colorType;
            this.parser_ = config.parser;
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.colorMode = createValue(this.value.rawValue.mode);
            this.ccs_ = this.createComponentControllers_(doc);
            this.view = new ColorTextView(doc, {
                colorMode: this.colorMode,
                textViews: [this.ccs_[0].view, this.ccs_[1].view, this.ccs_[2].view],
            });
            this.view.modeSelectElement.addEventListener('change', this.onModeSelectChange_);
        }
        createComponentControllers_(doc) {
            const cc = {
                colorMode: this.colorMode.rawValue,
                colorType: this.colorType_,
                parser: this.parser_,
                viewProps: this.viewProps,
            };
            const ccs = [
                createComponentController(doc, cc, 0),
                createComponentController(doc, cc, 1),
                createComponentController(doc, cc, 2),
            ];
            ccs.forEach((cs, index) => {
                connectValues({
                    primary: this.value,
                    secondary: cs.value,
                    forward: (p) => {
                        return p.rawValue.getComponents(this.colorMode.rawValue, this.colorType_)[index];
                    },
                    backward: (p, s) => {
                        const pickedMode = this.colorMode.rawValue;
                        const comps = p.rawValue.getComponents(pickedMode, this.colorType_);
                        comps[index] = s.rawValue;
                        return new Color(appendAlphaComponent(removeAlphaComponent(comps), comps[3]), pickedMode, this.colorType_);
                    },
                });
            });
            return ccs;
        }
        onModeSelectChange_(ev) {
            const selectElem = ev.currentTarget;
            this.colorMode.rawValue = selectElem.value;
            this.ccs_ = this.createComponentControllers_(this.view.element.ownerDocument);
            this.view.textViews = [
                this.ccs_[0].view,
                this.ccs_[1].view,
                this.ccs_[2].view,
            ];
        }
    }

    const className$3 = ClassName('hpl');
    class HPaletteView {
        constructor(doc, config) {
            this.onValueChange_ = this.onValueChange_.bind(this);
            this.value = config.value;
            this.value.emitter.on('change', this.onValueChange_);
            this.element = doc.createElement('div');
            this.element.classList.add(className$3());
            config.viewProps.bindTabIndex(this.element);
            const colorElem = doc.createElement('div');
            colorElem.classList.add(className$3('c'));
            this.element.appendChild(colorElem);
            const markerElem = doc.createElement('div');
            markerElem.classList.add(className$3('m'));
            this.element.appendChild(markerElem);
            this.markerElem_ = markerElem;
            this.update_();
        }
        update_() {
            const c = this.value.rawValue;
            const [h] = c.getComponents('hsv');
            this.markerElem_.style.backgroundColor = colorToFunctionalRgbString(new Color([h, 100, 100], 'hsv'));
            const left = mapRange(h, 0, 360, 0, 100);
            this.markerElem_.style.left = `${left}%`;
        }
        onValueChange_() {
            this.update_();
        }
    }

    /**
     * @hidden
     */
    class HPaletteController {
        constructor(doc, config) {
            this.onKeyDown_ = this.onKeyDown_.bind(this);
            this.onKeyUp_ = this.onKeyUp_.bind(this);
            this.onPointerDown_ = this.onPointerDown_.bind(this);
            this.onPointerMove_ = this.onPointerMove_.bind(this);
            this.onPointerUp_ = this.onPointerUp_.bind(this);
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.view = new HPaletteView(doc, {
                value: this.value,
                viewProps: this.viewProps,
            });
            this.ptHandler_ = new PointerHandler(this.view.element);
            this.ptHandler_.emitter.on('down', this.onPointerDown_);
            this.ptHandler_.emitter.on('move', this.onPointerMove_);
            this.ptHandler_.emitter.on('up', this.onPointerUp_);
            this.view.element.addEventListener('keydown', this.onKeyDown_);
            this.view.element.addEventListener('keyup', this.onKeyUp_);
        }
        handlePointerEvent_(d, opts) {
            if (!d.point) {
                return;
            }
            const hue = mapRange(constrainRange(d.point.x, 0, d.bounds.width), 0, d.bounds.width, 0, 359);
            const c = this.value.rawValue;
            const [, s, v, a] = c.getComponents('hsv');
            this.value.setRawValue(new Color([hue, s, v, a], 'hsv'), opts);
        }
        onPointerDown_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: false,
                last: false,
            });
        }
        onPointerMove_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: false,
                last: false,
            });
        }
        onPointerUp_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: true,
                last: true,
            });
        }
        onKeyDown_(ev) {
            const step = getStepForKey(getBaseStepForColor(false), getHorizontalStepKeys(ev));
            if (step === 0) {
                return;
            }
            const c = this.value.rawValue;
            const [h, s, v, a] = c.getComponents('hsv');
            this.value.setRawValue(new Color([h + step, s, v, a], 'hsv'), {
                forceEmit: false,
                last: false,
            });
        }
        onKeyUp_(ev) {
            const step = getStepForKey(getBaseStepForColor(false), getHorizontalStepKeys(ev));
            if (step === 0) {
                return;
            }
            this.value.setRawValue(this.value.rawValue, {
                forceEmit: true,
                last: true,
            });
        }
    }

    const className$2 = ClassName('svp');
    const CANVAS_RESOL = 64;
    /**
     * @hidden
     */
    class SvPaletteView {
        constructor(doc, config) {
            this.onValueChange_ = this.onValueChange_.bind(this);
            this.value = config.value;
            this.value.emitter.on('change', this.onValueChange_);
            this.element = doc.createElement('div');
            this.element.classList.add(className$2());
            config.viewProps.bindTabIndex(this.element);
            const canvasElem = doc.createElement('canvas');
            canvasElem.height = CANVAS_RESOL;
            canvasElem.width = CANVAS_RESOL;
            canvasElem.classList.add(className$2('c'));
            this.element.appendChild(canvasElem);
            this.canvasElement = canvasElem;
            const markerElem = doc.createElement('div');
            markerElem.classList.add(className$2('m'));
            this.element.appendChild(markerElem);
            this.markerElem_ = markerElem;
            this.update_();
        }
        update_() {
            const ctx = getCanvasContext(this.canvasElement);
            if (!ctx) {
                return;
            }
            const c = this.value.rawValue;
            const hsvComps = c.getComponents('hsv');
            const width = this.canvasElement.width;
            const height = this.canvasElement.height;
            const imgData = ctx.getImageData(0, 0, width, height);
            const data = imgData.data;
            for (let iy = 0; iy < height; iy++) {
                for (let ix = 0; ix < width; ix++) {
                    const s = mapRange(ix, 0, width, 0, 100);
                    const v = mapRange(iy, 0, height, 100, 0);
                    const rgbComps = hsvToRgbInt(hsvComps[0], s, v);
                    const i = (iy * width + ix) * 4;
                    data[i] = rgbComps[0];
                    data[i + 1] = rgbComps[1];
                    data[i + 2] = rgbComps[2];
                    data[i + 3] = 255;
                }
            }
            ctx.putImageData(imgData, 0, 0);
            const left = mapRange(hsvComps[1], 0, 100, 0, 100);
            this.markerElem_.style.left = `${left}%`;
            const top = mapRange(hsvComps[2], 0, 100, 100, 0);
            this.markerElem_.style.top = `${top}%`;
        }
        onValueChange_() {
            this.update_();
        }
    }

    /**
     * @hidden
     */
    class SvPaletteController {
        constructor(doc, config) {
            this.onKeyDown_ = this.onKeyDown_.bind(this);
            this.onKeyUp_ = this.onKeyUp_.bind(this);
            this.onPointerDown_ = this.onPointerDown_.bind(this);
            this.onPointerMove_ = this.onPointerMove_.bind(this);
            this.onPointerUp_ = this.onPointerUp_.bind(this);
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.view = new SvPaletteView(doc, {
                value: this.value,
                viewProps: this.viewProps,
            });
            this.ptHandler_ = new PointerHandler(this.view.element);
            this.ptHandler_.emitter.on('down', this.onPointerDown_);
            this.ptHandler_.emitter.on('move', this.onPointerMove_);
            this.ptHandler_.emitter.on('up', this.onPointerUp_);
            this.view.element.addEventListener('keydown', this.onKeyDown_);
            this.view.element.addEventListener('keyup', this.onKeyUp_);
        }
        handlePointerEvent_(d, opts) {
            if (!d.point) {
                return;
            }
            const saturation = mapRange(d.point.x, 0, d.bounds.width, 0, 100);
            const value = mapRange(d.point.y, 0, d.bounds.height, 100, 0);
            const [h, , , a] = this.value.rawValue.getComponents('hsv');
            this.value.setRawValue(new Color([h, saturation, value, a], 'hsv'), opts);
        }
        onPointerDown_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: false,
                last: false,
            });
        }
        onPointerMove_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: false,
                last: false,
            });
        }
        onPointerUp_(ev) {
            this.handlePointerEvent_(ev.data, {
                forceEmit: true,
                last: true,
            });
        }
        onKeyDown_(ev) {
            if (isArrowKey(ev.key)) {
                ev.preventDefault();
            }
            const [h, s, v, a] = this.value.rawValue.getComponents('hsv');
            const baseStep = getBaseStepForColor(false);
            const ds = getStepForKey(baseStep, getHorizontalStepKeys(ev));
            const dv = getStepForKey(baseStep, getVerticalStepKeys(ev));
            if (ds === 0 && dv === 0) {
                return;
            }
            this.value.setRawValue(new Color([h, s + ds, v + dv, a], 'hsv'), {
                forceEmit: false,
                last: false,
            });
        }
        onKeyUp_(ev) {
            const baseStep = getBaseStepForColor(false);
            const ds = getStepForKey(baseStep, getHorizontalStepKeys(ev));
            const dv = getStepForKey(baseStep, getVerticalStepKeys(ev));
            if (ds === 0 && dv === 0) {
                return;
            }
            this.value.setRawValue(this.value.rawValue, {
                forceEmit: true,
                last: true,
            });
        }
    }

    /**
     * @hidden
     */
    class ColorPickerController {
        constructor(doc, config) {
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.hPaletteC_ = new HPaletteController(doc, {
                value: this.value,
                viewProps: this.viewProps,
            });
            this.svPaletteC_ = new SvPaletteController(doc, {
                value: this.value,
                viewProps: this.viewProps,
            });
            this.textC_ = new ColorTextController(doc, {
                colorType: config.colorType,
                parser: parseNumber,
                value: this.value,
                viewProps: this.viewProps,
            });
            this.view = new ColorPickerView(doc, {
                hPaletteView: this.hPaletteC_.view,
                supportsAlpha: false,
                svPaletteView: this.svPaletteC_.view,
                textView: this.textC_.view,
            });
        }
        get textController() {
            return this.textC_;
        }
    }

    const className$1 = ClassName('pop_custom');
    /**
     * @hidden
     */
    class PopupView {
        constructor(doc, config) {
            this.element = doc.createElement('div');
            this.element.classList.add(className$1());
            config.viewProps.bindClassModifiers(this.element);
            bindValue(config.shows, valueToClassName(this.element, className$1(undefined, 'v')));
        }
    }

    class PopupController {
        constructor(doc, config) {
            this.shows = createValue(false);
            console.log(this.shows);
            this.viewProps = config.viewProps;
            this.view = new PopupView(doc, {
                shows: this.shows,
                // container: config.container,
                viewProps: this.viewProps,
            });
        }
    }

    function hexToRGB(hex) {
        const color = hex.substring(1);
        if (color.length == 6) {
            return {
                r: Number.parseInt(color.substring(0, 2), 16),
                g: Number.parseInt(color.substring(2, 4), 16),
                b: Number.parseInt(color.substring(4), 16)
            };
        }
        else if (color.length == 3) {
            return {
                r: Number.parseInt(color.substring(0, 1), 16),
                g: Number.parseInt(color.substring(1, 2), 16),
                b: Number.parseInt(color.substring(2), 16)
            };
        }
        else {
            throw new Error(`Expected hex string length of 7 or 4, but got ${hex.length}`);
        }
    }
    function rgbToHex(rgb) {
        const ret = rgb.map(c => {
            c = Math.round(c);
            const r = c.toString(16);
            return r.length == 1 ? `0${r}` : r;
        });
        return `#${ret[0]}${ret[1]}${ret[2]}`;
    }
    function rgbToHsv(rgb) {
        let rr;
        let gg;
        let bb;
        let h;
        let s;
        const rabs = rgb[0] > 1 ? rgb[0] / 255 : rgb[0];
        const gabs = rgb[1] > 1 ? rgb[1] / 255 : rgb[1];
        const babs = rgb[2] > 1 ? rgb[2] / 255 : rgb[2];
        const v = Math.max(rabs, gabs, babs);
        const diff = v - Math.min(rabs, gabs, babs);
        const diffc = (c) => (v - c) / 6 / diff + 1 / 2;
        const percentRoundFn = (num) => Math.round(num * 100) / 100;
        if (diff == 0) {
            h = s = 0;
        }
        else {
            s = diff / v;
            rr = diffc(rabs);
            gg = diffc(gabs);
            bb = diffc(babs);
            if (rabs === v) {
                h = bb - gg;
            }
            else if (gabs === v) {
                h = (1 / 3) + rr - bb;
            }
            else { //(babs === v)
                h = (2 / 3) + gg - rr;
            }
            if (h < 0) {
                h += 1;
            }
            else if (h > 1) {
                h -= 1;
            }
        }
        return {
            h: Math.round(h * 360),
            s: percentRoundFn(s * 100),
            v: percentRoundFn(v * 100)
        };
    }

    // Create a class name generator from the view name
    // ClassName('tmp') will generate a CSS class name like `tp-tmpv`
    const className = ClassName('gradient');
    const canvasWidth = 150;
    // Custom view class should implement `View` interface
    class PluginView {
        constructor(doc, config) {
            this.stopIdx = createValue(0);
            this.movingStop = false;
            this._cnvsStopsArr = [];
            // Create a root element for the plugin
            this.element = doc.createElement('div');
            this.element.classList.add(className());
            // Bind view props to the element
            config.viewProps.bindClassModifiers(this.element);
            // Receive the bound value from the controller
            this._value = config.value;
            this.colBtnCol = createValue(config.colBtnCol);
            this.curStopPos = config.curStopPos;
            // Handle 'change' event of the value
            this._value.emitter.on('change', this._onValueChange.bind(this));
            this.stopIdx.emitter.on('change', this._onValueChange.bind(this));
            // Create child elements
            {
                const arCont = doc.createElement('div');
                arCont.classList.add(className('ar_cont'));
                this.addStop = doc.createElement('div');
                this.addStop.classList.add(className('edit_stops'));
                this.addStop.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Pro 6.1.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M432 256c0 17.69-14.33 32.01-32 32.01H256v144c0 17.69-14.33 31.99-32 31.99s-32-14.3-32-31.99v-144H48c-17.67 0-32-14.32-32-32.01s14.33-31.99 32-31.99H192v-144c0-17.69 14.33-32.01 32-32.01s32 14.32 32 32.01v144h144C417.7 224 432 238.3 432 256z"/></svg>`;
                arCont.appendChild(this.addStop);
                this.removeStop = doc.createElement('div');
                this.removeStop.classList.add(className('edit_stops'));
                this.removeStop.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--! Font Awesome Pro 6.1.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M400 288h-352c-17.69 0-32-14.32-32-32.01s14.31-31.99 32-31.99h352c17.69 0 32 14.3 32 31.99S417.7 288 400 288z"/></svg>`;
                arCont.appendChild(this.removeStop);
                this.element.appendChild(arCont);
            }
            const canvasCont = doc.createElement('div');
            canvasCont.classList.add(className('canvas_cont'));
            this._canvas = doc.createElement('canvas');
            this._canvas.height = 20;
            this._canvas.width = canvasWidth;
            this._canvas.classList.add(className('canvas'));
            canvasCont.appendChild(this._canvas);
            this.element.appendChild(canvasCont);
            {
                const ctrlCont = doc.createElement('div');
                ctrlCont.classList.add(className('ctrl_cont'));
                this._cycleIdx = doc.createElement('div');
                this._cycleIdx.classList.add(className('cycle_idx'));
                this.nCycleIdx = doc.createElement('div');
                this.nCycleIdx.classList.add(className('cycle_idx_btn'));
                this.nCycleIdx.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.1.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M137.4 406.6l-128-127.1C3.125 272.4 0 264.2 0 255.1s3.125-16.38 9.375-22.63l128-127.1c9.156-9.156 22.91-11.9 34.88-6.943S192 115.1 192 128v255.1c0 12.94-7.781 24.62-19.75 29.58S146.5 415.8 137.4 406.6z"/></svg>`;
                this._cycleIdx.appendChild(this.nCycleIdx);
                this._idxDisp = doc.createElement('div');
                this._idxDisp.classList.add(className('cycle_idx_disp'));
                this._idxDisp.innerText = this.stopIdx.rawValue.toString();
                this._cycleIdx.appendChild(this._idxDisp);
                this.pCycleIdx = doc.createElement('div');
                this.pCycleIdx.classList.add(className('cycle_idx_btn'));
                this.pCycleIdx.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512"><!--! Font Awesome Pro 6.1.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path d="M118.6 105.4l128 127.1C252.9 239.6 256 247.8 256 255.1s-3.125 16.38-9.375 22.63l-128 127.1c-9.156 9.156-22.91 11.9-34.88 6.943S64 396.9 64 383.1V128c0-12.94 7.781-24.62 19.75-29.58S109.5 96.23 118.6 105.4z"/></svg>`;
                this._cycleIdx.appendChild(this.pCycleIdx);
                ctrlCont.appendChild(this._cycleIdx);
                this.setPos = doc.createElement('div');
                this.setPos.classList.add(className('set_pos'));
                const label = doc.createElement('div');
                label.innerText = "Pos:";
                label.classList.add(className('set_pos_label'));
                this.setPos.appendChild(label);
                ctrlCont.appendChild(this.setPos);
                this.element.appendChild(ctrlCont);
            }
            {
                const colCont = doc.createElement('div');
                colCont.classList.add(className('col_cont'));
                this.colorButton = doc.createElement('div');
                this.colorButton.classList.add(className('stop_color_view'));
                colCont.appendChild(this.colorButton);
                this.element.appendChild(colCont);
            }
            // Apply the initial value
            this._refresh();
            const moveHandler = (e) => {
                if (this.movingStop) {
                    const value = Math.floor((e.pageX - this._canvas.getBoundingClientRect().left) / canvasWidth * 100) / 100;
                    if (value >= 0 && value <= 1) {
                        this.curStopPos.setRawValue(value);
                    }
                }
            };
            moveHandler.bind(this);
            config.viewProps.handleDispose(() => {
                this._value.emitter.off('change', this._onValueChange.bind(this));
                doc.removeEventListener('mouseup', () => {
                    if (this.movingStop)
                        this.movingStop = false;
                });
                doc.removeEventListener('mousemove', moveHandler);
            });
            doc.addEventListener('mouseup', () => {
                if (this.movingStop)
                    this.movingStop = false;
            });
            doc.addEventListener('mousemove', moveHandler);
        }
        getCanvasTexture() {
            const ctx = this._canvas.getContext("2d");
            return ctx.getImageData(0, 0, 150, 20);
        }
        getColorAtPoint(pos) {
            const ctx = this._canvas.getContext("2d");
            const p = ctx.getImageData(pos * canvasWidth, 0, 1, 1).data;
            return {
                r: p[0],
                g: p[1],
                b: p[2]
            };
        }
        _refresh() {
            var _a;
            this._idxDisp.innerText = this.stopIdx.rawValue.toString();
            const color = this.colBtnCol.rawValue.getComponents(this.colBtnCol.rawValue.mode, 'int');
            this.colorButton.style.backgroundColor = `${this.colBtnCol.rawValue.mode == 'rgb' ? 'rgb' : (this.colBtnCol.rawValue.mode == 'hsv' ? 'hsv' : 'hsl')}(${color[0]}, ${color[1]}, ${color[2]})`;
            const rawValue = this._value.rawValue;
            const ctx = this._canvas.getContext("2d");
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvasWidth, 20);
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, 0);
            this._cnvsStopsArr.map(e => { e.remove(); });
            this._cnvsStopsArr = [];
            for (let i = 0; i < rawValue.stops.length; i++) {
                const stop = rawValue.stops[i];
                gradient.addColorStop(stop.stop, (typeof stop.color == 'string' ? stop.color : (stop.color.r !== undefined ? `rgb(${stop.color.r}, ${stop.color.g}, ${stop.color.b})` : `hsv(${stop.color.h}, ${stop.color.s}, ${stop.color.v})`)));
                const sElem = document.createElement('div');
                sElem.classList.add(className('canvas_marker'));
                sElem.setAttribute('idx', i.toString());
                sElem.style.left = `${stop.stop * canvasWidth - 2}px`;
                sElem.style.bottom = `-8px`;
                sElem.addEventListener('mousedown', (e) => {
                    this.movingStop = true;
                    this.stopIdx.setRawValue(parseInt(e.currentTarget.getAttribute('idx')));
                });
                const top = document.createElement('div');
                top.classList.add(className('marker_top'));
                sElem.appendChild(top);
                const colDisp = document.createElement('div');
                colDisp.classList.add(className('marker_col_disp'));
                colDisp.style.backgroundColor = `${(typeof stop.color == 'string' ? stop.color : (stop.color.r !== undefined ? `rgb(${stop.color.r}, ${stop.color.g}, ${stop.color.b})` : `hsv(${stop.color.h}, ${stop.color.s}, ${stop.color.v})`))}`;
                sElem.appendChild(colDisp);
                this._cnvsStopsArr.push(sElem);
                (_a = this._canvas.parentElement) === null || _a === void 0 ? void 0 : _a.appendChild(sElem);
            }
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, 20);
        }
        _onValueChange() {
            this._refresh();
        }
    }

    var COLOR_SPACES;
    (function (COLOR_SPACES) {
        COLOR_SPACES["RGB"] = "rgb";
        COLOR_SPACES["HSV"] = "hsv";
        COLOR_SPACES["HEX"] = "hex";
    })(COLOR_SPACES || (COLOR_SPACES = {}));
    // Custom controller class should implement `Controller` interface
    class PluginController {
        constructor(doc, config) {
            this._stopIdx = createValue(0);
            this._curStopPos = createValue(0);
            this._curStopCol = createValue(new Color([0, 0, 0], 'rgb'));
            this._colorSpace = config.colorSpace;
            this._onButtonBlur = this._onButtonBlur.bind(this);
            this._onButtonClick = this._onButtonClick.bind(this);
            this._onPopupChildBlur = this._onPopupChildBlur.bind(this);
            this._onPopupChildKeydown = this._onPopupChildKeydown.bind(this);
            this._cycleStopIdx = this._cycleStopIdx.bind(this);
            this._addStop = this._addStop.bind(this);
            this._removeStop = this._removeStop.bind(this);
            this._setStopPos = this._setStopPos.bind(this);
            this._setStopColor = this._setStopColor.bind(this);
            // Receive the bound value from the plugin
            this.value = config.value;
            this._curStopPos.setRawValue(this.value.rawValue.stops[0].stop);
            this._curStopCol.setRawValue(this._gradientColToTweakCol(this.value.rawValue.stops[0].color));
            // and also view props
            this.viewProps = config.viewProps;
            this._foldable = Foldable.create(config.expanded ? config.expanded : false);
            // Create a custom view
            this.view = new PluginView(doc, { value: this.value, curStopPos: this._curStopPos, colBtnCol: this._curStopCol.rawValue, viewProps: this.viewProps, });
            this.value.setRawValue({
                stops: this.value.rawValue.stops,
                getGradient: this.view.getCanvasTexture.bind(this.view)
            });
            const buttonElem = this.view.colorButton;
            buttonElem.addEventListener('blur', this._onButtonBlur);
            buttonElem.addEventListener('click', this._onButtonClick);
            const addSBtn = this.view.addStop;
            addSBtn.addEventListener('click', this._addStop);
            const remSBtn = this.view.removeStop;
            remSBtn.addEventListener('click', this._removeStop);
            this.view.nCycleIdx.addEventListener('click', () => { this._cycleStopIdx(false); });
            this.view.pCycleIdx.addEventListener('click', () => { this._cycleStopIdx(true); });
            this.popUpC = new PopupController(doc, { viewProps: this.viewProps, });
            this.colorPickerC = new ColorPickerController(doc, { colorType: 'int', value: this._curStopCol, viewProps: this.viewProps, });
            this.colorPickerC.view.allFocusableElements.forEach((elem) => { elem.addEventListener('blur', this._onPopupChildBlur); elem.addEventListener('keydown', this._onPopupChildKeydown); });
            this.view.element.appendChild(this.popUpC.view.element);
            this.popUpC.view.element.appendChild(this.colorPickerC.view.element);
            this.posInput = new NumberTextController(doc, {
                baseStep: 0.01,
                sliderProps: ValueMap.fromObject({
                    maxValue: 1.0,
                    minValue: 0.0,
                }),
                props: ValueMap.fromObject({
                    draggingScale: 0.01,
                    formatter: createNumberFormatter(getSuitableDecimalDigits(undefined, 0.01)),
                }),
                parser: parseNumber,
                value: this._curStopPos,
                viewProps: this.viewProps
            });
            this.view.setPos.appendChild(this.posInput.view.element);
            // connect popup
            connectValues({
                primary: this._foldable.value('expanded'),
                secondary: this.popUpC.shows,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            // connect stopIdx variables
            connectValues({
                primary: this._stopIdx,
                secondary: this.view.stopIdx,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            this._stopIdx.emitter.on('change', (e) => {
                this._setStopIdx(e.rawValue);
            });
            // connect curStopPos variables
            connectValues({
                primary: this._curStopPos,
                secondary: this.posInput.value,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            connectValues({
                primary: this._curStopPos,
                secondary: this.view.curStopPos,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            this._curStopPos.emitter.on('change', this._setStopPos);
            // connect curStopColor variables
            connectValues({
                primary: this._curStopCol,
                secondary: this.colorPickerC.value,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            connectValues({
                primary: this._curStopCol,
                secondary: this.view.colBtnCol,
                forward: (p) => p.rawValue,
                backward: (_, s) => s.rawValue,
            });
            this._curStopCol.emitter.on('change', this._setStopColor);
            this.viewProps.handleDispose(() => {
                const buttonElem = this.view.colorButton;
                buttonElem.removeEventListener('blur', this._onButtonBlur);
                buttonElem.removeEventListener('click', this._onButtonClick);
                const addSBtn = this.view.addStop;
                addSBtn.addEventListener('click', this._addStop);
                const remSBtn = this.view.removeStop;
                remSBtn.addEventListener('click', this._removeStop);
                this.colorPickerC.view.allFocusableElements.forEach((elem) => {
                    elem.removeEventListener('blur', this._onPopupChildBlur);
                    elem.removeEventListener('keydown', this._onPopupChildKeydown);
                });
            });
        }
        _cycleStopIdx(dir) {
            if (dir ? this._stopIdx.rawValue + 1 < this.value.rawValue.stops.length : this._stopIdx.rawValue - 1 >= 0) {
                this._setStopIdx(dir ? this._stopIdx.rawValue + 1 : this._stopIdx.rawValue - 1);
            }
        }
        _setStopIdx(newIdx) {
            this._stopIdx.setRawValue(newIdx);
            this._curStopPos.setRawValue(this.value.rawValue.stops[newIdx].stop);
            const curVal = this.value.rawValue.stops[newIdx];
            this._curStopCol.setRawValue(this._gradientColToTweakCol(curVal.color));
        }
        _tweakColToGradientCol(curVal) {
            switch (this._colorSpace) {
                case COLOR_SPACES.RGB: {
                    const comps = curVal.getComponents('rgb', 'int');
                    return {
                        r: comps[0],
                        g: comps[1],
                        b: comps[2]
                    };
                }
                case COLOR_SPACES.HSV: {
                    const comps = curVal.getComponents('hsv', 'int');
                    return {
                        h: comps[0],
                        s: comps[1],
                        v: comps[2]
                    };
                }
                case COLOR_SPACES.HEX: {
                    return rgbToHex(curVal.getComponents('rgb', 'int'));
                }
            }
        }
        _gradientColToTweakCol(curVal) {
            switch (this._colorSpace) {
                case COLOR_SPACES.RGB: {
                    const c = curVal;
                    return new Color([c.r, c.g, c.b], 'rgb');
                }
                case COLOR_SPACES.HSV: {
                    const c = curVal;
                    return new Color([c.h, c.s, c.v], 'hsv');
                }
                case COLOR_SPACES.HEX: {
                    const c = hexToRGB(curVal);
                    return new Color([c.r, c.g, c.b], 'rgb');
                }
            }
        }
        _addStop() {
            const newVal = [...this.value.rawValue.stops];
            const curVal = newVal[this._stopIdx.rawValue];
            let newColor;
            let newPos;
            let splIdx;
            if (this._stopIdx.rawValue < this.value.rawValue.stops.length - 1) {
                newPos = curVal.stop + Math.floor((newVal[this._stopIdx.rawValue + 1].stop - curVal.stop) / 2 * 100) / 100;
                splIdx = this._stopIdx.rawValue + 1;
            }
            else {
                newPos = newVal[this._stopIdx.rawValue - 1].stop + Math.floor((curVal.stop - newVal[this._stopIdx.rawValue - 1].stop) / 2 * 100) / 100;
                splIdx = this._stopIdx.rawValue;
            }
            newColor = this.view.getColorAtPoint(newPos);
            if (this._colorSpace == COLOR_SPACES.HEX) {
                newColor = rgbToHex(Object.values(newColor));
            }
            else if (this._colorSpace == COLOR_SPACES.HSV) {
                newColor = rgbToHsv(Object.values(newColor));
            }
            newVal.splice(splIdx, 0, {
                color: newColor,
                stop: newPos
            });
            this.value.setRawValue({
                stops: newVal,
                getGradient: this.view.getCanvasTexture.bind(this.view)
            });
            this._stopIdx.setRawValue(splIdx);
        }
        _removeStop() {
            if (this.value.rawValue.stops.length > 2) {
                const idx = this._stopIdx.rawValue;
                const newVal = [...this.value.rawValue.stops];
                newVal.splice(idx, 1);
                this.value.setRawValue({
                    stops: newVal,
                    getGradient: this.view.getCanvasTexture.bind(this.view)
                });
                if (this._stopIdx.rawValue >= this.value.rawValue.stops.length)
                    this._stopIdx.setRawValue(idx - 1);
            }
        }
        _setStopPos(e) {
            const newVal = [...this.value.rawValue.stops];
            const curVal = newVal[this._stopIdx.rawValue];
            newVal[this._stopIdx.rawValue] = {
                color: curVal.color,
                stop: e.rawValue
            };
            this.value.setRawValue({
                stops: newVal,
                getGradient: this.view.getCanvasTexture.bind(this.view)
            });
        }
        _setStopColor(e) {
            const newVal = [...this.value.rawValue.stops];
            const curVal = newVal[this._stopIdx.rawValue];
            newVal[this._stopIdx.rawValue] = {
                color: this._tweakColToGradientCol(e.rawValue),
                stop: curVal.stop
            };
            this.value.setRawValue({
                stops: newVal,
                getGradient: this.view.getCanvasTexture.bind(this.view)
            });
        }
        _onButtonBlur(e) {
            const elem = this.view.element;
            const nextTarget = forceCast(e.relatedTarget);
            if (!nextTarget || !elem.contains(nextTarget)) {
                this.popUpC.shows.rawValue = false;
            }
        }
        _onButtonClick() {
            this._foldable.set('expanded', !this._foldable.get('expanded'));
            if (this._foldable.get('expanded')) {
                this.colorPickerC.view.allFocusableElements[0].focus();
            }
        }
        _onPopupChildBlur(ev) {
            const elem = this.popUpC.view.element;
            const nextTarget = findNextTarget(ev);
            if (nextTarget && elem.contains(nextTarget)) {
                // Next target is in the picker
                return;
            }
            if (nextTarget &&
                nextTarget === this.view.colorButton &&
                !supportsTouch(elem.ownerDocument)) {
                // Next target is the trigger button
                return;
            }
            this.popUpC.shows.rawValue = false;
        }
        _onPopupChildKeydown(ev) {
            if (ev.key === 'Escape') {
                this.popUpC.shows.rawValue = false;
            }
        }
    }

    exports.COLOR_SPACES = void 0;
    (function (COLOR_SPACES) {
        COLOR_SPACES["RGB"] = "rgb";
        COLOR_SPACES["HSV"] = "hsv";
        COLOR_SPACES["HEX"] = "hex";
    })(exports.COLOR_SPACES || (exports.COLOR_SPACES = {}));
    function isGradientStopArr(params) {
        return params.stops !== undefined ? (params.stops.every((grad) => grad.stop !== undefined && ((grad.color.r !== undefined && grad.color.g !== undefined && grad.color.b !== undefined) || (grad.color.h !== undefined && grad.color.s !== undefined && grad.color.v !== undefined) || typeof grad.color === 'string'))) : false;
    }
    const GradientGeneratorPlugin = {
        id: 'gradient',
        type: 'input',
        css: '.tp-gradientv{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:rgba(0,0,0,0);border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0}.tp-gradientv{background-color:var(--in-bg);border-radius:var(--elm-br);box-sizing:border-box;color:var(--in-fg);font-family:inherit;height:var(--bld-us);line-height:var(--bld-us);min-width:0;width:100%}.tp-gradientv:hover{background-color:var(--in-bg-h)}.tp-gradientv:focus{background-color:var(--in-bg-f)}.tp-gradientv:active{background-color:var(--in-bg-a)}.tp-gradientv:disabled{opacity:.5}.tp-pop_customv{background-color:var(--bs-bg);border-radius:6px;box-shadow:0 2px 10px #000;display:none;max-width:168px;padding:var(--cnt-v-p) var(--cnt-h-p);position:absolute;visibility:hidden;z-index:1000;top:112px}.tp-pop_customv.tp-pop_customv-v{display:block;visibility:visible}.tp-gradientv{display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:117px;position:relative;background-color:var(--bs-bg) !important}.tp-gradientv.tp-v-disabled{opacity:.5}.tp-gradientv_ar_cont{width:154px;height:20px;display:flex;flex-direction:row;align-items:center;justify-content:flex-start;margin-bottom:3px}.tp-gradientv_edit_stops{cursor:pointer;background-color:var(--bs-bg);width:30px;height:20px;border-radius:4px;margin-right:7px;display:flex;flex-direction:row;align-items:center;justify-content:center}.tp-gradientv_edit_stops:hover{background-color:var(--cnt-bg-h)}.tp-gradientv_edit_stops:active{background-color:var(--cnt-bg-a)}.tp-gradientv_edit_stops:focus{background-color:var(--cnt-bg-f)}.tp-gradientv_edit_stops>svg{height:15px;fill:var(--lbl-fg)}.tp-gradientv_canvas_cont{background-color:var(--cnt-bg-a);width:150px;height:20px;padding:2px;border-radius:2px;margin-bottom:14px;position:relative}.tp-gradientv_canvas_marker{width:9px;height:13px;cursor:pointer;position:absolute}.tp-gradientv_marker_top{width:0;height:0;border-style:solid;border-width:0 4.5px 4px 4.5px;border-color:rgba(0,0,0,0) rgba(0,0,0,0) var(--in-fg) rgba(0,0,0,0)}.tp-gradientv_marker_col_disp{border:1px solid var(--in-fg);width:7px;height:7px}.tp-gradientv_ctrl_cont{width:154px;height:20px;display:flex;flex-direction:row;align-items:center;justify-content:space-between;margin-bottom:7px}.tp-gradientv_cycle_idx{width:45px;height:20px;background-color:var(--cnt-bg);border-radius:4px;display:flex;align-items:center;justify-content:space-between}.tp-gradientv_cycle_idx_btn{cursor:pointer;width:7px;padding:0px 3px;height:20px;border-radius:4px;display:flex;flex-direction:column;align-items:center;justify-content:center}.tp-gradientv_cycle_idx_btn:hover{background-color:var(--cnt-bg-h)}.tp-gradientv_cycle_idx_btn:active{background-color:var(--cnt-bg-a)}.tp-gradientv_cycle_idx_btn:focus{background-color:var(--cnt-bg-f)}.tp-gradientv_cycle_idx_btn>svg{max-width:7px;fill:var(--in-fg)}.tp-gradientv_set_pos{width:98px;height:20px;border-radius:4px;display:flex;flex-direction:row;align-items:center}.tp-gradientv_set_pos_label{margin-right:3px}.tp-gradientv_col_cont{background-color:var(--cnt-bg);cursor:pointer;width:146px;height:16px;padding:4px;border-radius:4px;margin-bottom:7px;position:relative}.tp-gradientv_col_cont:hover{background-color:var(--cnt-bg-h)}.tp-gradientv_col_cont:active{background-color:var(--cnt-bg-a)}.tp-gradientv_col_cont:focus{background-color:var(--cnt-bg-f)}.tp-gradientv_stop_color_view{width:100%;height:16px;border-radius:4px}.tp-gradientv_stop_color_input{position:absolute;left:-100%;top:-100%}',
        accept(exValue, params) {
            if (!isGradientStopArr(exValue)) {
                // Return null to deny the user input
                return null;
            }
            // Parse parameters object
            const p = ParamsParsers;
            const result = parseParams(params, {
                view: p.required.constant('gradient'),
                colorSpace: p.optional.custom((value) => {
                    if (Object.values(exports.COLOR_SPACES).includes(value)) {
                        return value;
                    }
                    return exports.COLOR_SPACES.RGB;
                })
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
                    return isGradientStopArr(exValue) ? exValue : {
                        'stops': [
                            { color: '#000000', stop: 0.0 },
                            { color: '#ffffff', stop: 1.0 },
                        ],
                        'getGradient': () => { return new ImageData(0, 0); }
                    };
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
            return new PluginController(args.document, {
                value: args.value,
                viewProps: args.viewProps,
                colorSpace: args.params.colorSpace
            });
        },
    };

    // Export your plugin(s) as constant `plugins`
    const plugins = [GradientGeneratorPlugin];

    exports.plugins = plugins;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
