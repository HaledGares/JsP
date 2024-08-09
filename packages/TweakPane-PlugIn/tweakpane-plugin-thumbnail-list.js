(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.TweakpaneThumbnailListPlugin = {}));
}(this, (function (exports) { 'use strict';

    function forceCast(v) {
        return v;
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

    const CHECKER_IMG_SRC = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAA4klEQVR4Xu2awQ3EQAjEbjun9Ohq8ANZOP8JZDBstOL94DMzQ16xrX8k+b92+wNo/AyIAOgARXBbXwtAABqC2wjT+LVALQAdoAhu62sBCECnwDbCNH4tcL4FKEJ2/bN/AM0/A6iDdn0E2CtI848A6qBdHwH2CtL8I4A6aNdHgL2CNP8IoA7a9d0Inb8RygDoQDOgHaGWpNoSI2Nke4b0H0Cq155gi5JtirYfsD3FafxOgfOnAEXIru9KzF5Bmn8EUAft+giwV5DmHwHUQbs+AuwVpPlHAHXQro8AewVp/ucJ+AAX4sBQqPDC3AAAAABJRU5ErkJggg==';
    const className = ClassName('thumb');
    // Custom view class should implement `View` interface
    class PluginView {
        constructor(doc, config) {
            this.optionEls_ = [];
            this.onSelect_ = this.onSelect_.bind(this);
            this.open_ = this.open_.bind(this);
            this.close_ = this.close_.bind(this);
            // DOM.
            this.doc_ = doc;
            this.element = doc.createElement('div');
            this.element.classList.add(className());
            this.selectEl_ = document.createElement('div');
            this.selectEl_.classList.add(className('sopt'));
            this.element.appendChild(this.selectEl_);
            this.selectThumbEl_ = document.createElement('div');
            this.selectThumbEl_.classList.add(className('sthmb'));
            this.selectEl_.appendChild(this.selectThumbEl_);
            this.selectLabelEl_ = document.createElement('span');
            this.selectLabelEl_.classList.add(className('slbl'));
            this.selectEl_.appendChild(this.selectLabelEl_);
            this.overlayEl_ = doc.createElement('div');
            this.overlayEl_.classList.add(className('ovl'));
            this.element.appendChild(this.overlayEl_);
            // Events.
            this.selectEl_.addEventListener('click', this.open_);
            config.viewProps.bindClassModifiers(this.element);
            this.value_ = config.value;
            this.value_.emitter.on('change', this.onValueChange_.bind(this));
            this.valueOptions_ = config.valueOptions;
            this.init_();
            this.refresh_();
            config.viewProps.handleDispose(() => {
                this.selectEl_.removeEventListener('click', this.open_);
                this.doc_.removeEventListener('click', this.close_);
                let rowEl;
                while ((rowEl = this.optionEls_.pop())) {
                    rowEl.removeEventListener('click', this.onSelect_);
                    this.overlayEl_.removeChild(rowEl);
                }
            });
        }
        init_() {
            const doc = this.element.ownerDocument;
            const createOptionEl = (thumbnail) => {
                const thumbEl = doc.createElement('div');
                thumbEl.classList.add(className('thmb'));
                thumbEl.style.backgroundImage = thumbnail
                    ? `url(${thumbnail.src})`
                    : `url(${CHECKER_IMG_SRC})`;
                const labelEl = doc.createElement('span');
                labelEl.classList.add(className('lbl'));
                labelEl.textContent = thumbnail ? thumbnail.text : 'None';
                const optionEl = doc.createElement('div');
                optionEl.classList.add(className('opt'));
                optionEl.appendChild(thumbEl);
                optionEl.appendChild(labelEl);
                optionEl.setAttribute('data-value', thumbnail ? thumbnail.value : '');
                optionEl.addEventListener('click', this.onSelect_);
                this.optionEls_.push(optionEl);
                this.overlayEl_.appendChild(optionEl);
            };
            createOptionEl(null);
            for (const thumbnail of this.valueOptions_) {
                createOptionEl(thumbnail);
            }
        }
        /** Updates UI state after a value change. */
        refresh_() {
            const active = this.value_.rawValue;
            if (active) {
                this.selectThumbEl_.style.backgroundImage = `url(${active.src})`;
                this.selectLabelEl_.textContent = active.text;
            }
            else {
                this.selectThumbEl_.style.backgroundImage = `url(${CHECKER_IMG_SRC})`;
                this.selectLabelEl_.textContent = '';
            }
            const activeValue = active ? active.value : '';
            for (const optionEl of this.optionEls_) {
                if (optionEl.getAttribute('data-value') === activeValue) {
                    optionEl.setAttribute('aria-selected', 'true');
                }
                else {
                    optionEl.removeAttribute('aria-selected');
                }
            }
        }
        /** Opens the overlay. */
        open_(event) {
            this.element.classList.add(className('-active'));
            this.doc_.addEventListener('click', this.close_);
            event.stopPropagation();
        }
        /** Closes the overlay. */
        close_() {
            this.element.classList.remove(className('-active'));
            this.doc_.removeEventListener('click', this.close_);
        }
        /** Selects the thumbnail element clicked. */
        onSelect_(event) {
            const optionEl = this.findOptionEl_(event.target);
            const value = optionEl.getAttribute('data-value');
            const thumbnail = this.valueOptions_.find((option) => option.value === value);
            this.value_.setRawValue(thumbnail || null);
        }
        /** Given a click event somewhere in an option, finds the nearest option element. */
        findOptionEl_(el) {
            while (el && !el.hasAttribute('data-value')) {
                el = el.parentElement;
            }
            if (!el)
                throw new Error('Invalid DOM scope');
            return el;
        }
        /** Change handler. */
        onValueChange_() {
            this.refresh_();
        }
    }

    /** Thumbnail List Controller */
    class PluginController {
        constructor(doc, config) {
            this.value = config.value;
            this.viewProps = config.viewProps;
            this.viewProps.handleDispose(() => {
                //
            });
            this.view = new PluginView(doc, {
                value: this.value,
                valueOptions: config.valueOptions,
                viewProps: this.viewProps,
            });
        }
    }

    /**
     * Thumbnail List Plugin
     *
     * `InputBindingPlugin<In, Ex, P>` means...
     * - The plugin receives the bound value as `Ex`,
     * - converts `Ex` into `In` and holds it
     * - P is the type of the parsed parameters
     */
    const TweakpaneThumbnailListPlugin = {
        id: 'thumbnail-list',
        type: 'input',
        css: '.tp-thumbv{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:transparent;border-width:0;font-family:inherit;font-size:inherit;font-weight:inherit;margin:0;outline:none;padding:0}.tp-thumbv{background-color:var(--in-bg);border-radius:var(--elm-br);box-sizing:border-box;color:var(--in-fg);font-family:inherit;height:var(--bld-us);line-height:var(--bld-us);min-width:0;width:100%}.tp-thumbv:hover{background-color:var(--in-bg-h)}.tp-thumbv:focus{background-color:var(--in-bg-f)}.tp-thumbv:active{background-color:var(--in-bg-a)}.tp-thumbv:disabled{opacity:0.5}.tp-thumbv{--tptl-thumb-size: var(--tp-plugin-thumbnail-list-thumb-size, var(--bld-us));position:relative;height:var(--bld-us);cursor:pointer}.tp-thumbv,.tp-thumbv:hover{background:none}.tp-thumbv.tp-v-disabled{opacity:0.5}.tp-thumbv_ovl{z-index:100;box-shadow:0 2px 4px var(--bs-sh);display:none;position:absolute;top:var(--bld-us);right:0;overflow-x:hidden;overflow-y:auto;max-height:var(--tp-plugin-thumbnail-list-height, 400px);width:var(--tp-plugin-thumbnail-list-width, 200px);background:var(--bs-bg);padding:var(--cnt-v-p) var(--cnt-h-p);border-bottom-left-radius:var(--bs-br);border-bottom-right-radius:var(--bs-br)}.tp-thumbv_-active .tp-thumbv_ovl{display:block}.tp-thumbv_opt,.tp-thumbv_sopt{display:flex;flex-direction:row;color:var(--in-fg)}.tp-thumbv_sopt{height:var(--bld-us)}.tp-thumbv_opt{height:var(--tptl-thumb-size);margin:0 calc(-1 * var(--cnt-h-p));padding:var(--cnt-v-p) var(--cnt-h-p) 0;opacity:0.75}.tp-thumbv_opt[aria-selected]{opacity:1.0;background:var(--in-bg)}.tp-thumbv_opt:hover{opacity:1.0}.tp-thumbv_thmb,.tp-thumbv_sthmb{flex-shrink:0;width:var(--bld-us);height:100%;border-radius:var(--elm-br);background-size:contain;position:relative}.tp-thumbv_sthmb{width:var(--bld-us)}.tp-thumbv_thmb{margin-right:2em;width:var(--tptl-thumb-size)}[aria-selected] .tp-thumbv_thmb::after{content:\'✓\';position:absolute;right:-1em;font-size:1.5em;line-height:var(--tptl-thumb-size)}.tp-thumbv_lbl,.tp-thumbv_slbl{height:var(--bld-us);line-height:var(--bld-us);text-overflow:ellipsis}.tp-thumbv_slbl{margin-left:4px;padding:0 4px;background-color:var(--in-bg);border-radius:var(--elm-br);box-sizing:border-box;min-width:0;width:100%}.tp-thumbv_lbl{height:var(--tptl-thumb-size);line-height:var(--tptl-thumb-size)}',
        accept(exValue, params) {
            if (typeof exValue !== 'string')
                return null;
            const p = ParamsParsers;
            const result = parseParams(params, {
                view: p.required.constant('thumbnail-list'),
                options: p.required.array(p.required.object({
                    text: p.required.string,
                    value: p.required.string,
                    src: p.required.string,
                    data: p.optional.custom((d) => d),
                })),
            });
            if (!result)
                return null;
            return {
                initialValue: exValue,
                params: result,
            };
        },
        binding: {
            /** Converts an external unknown value into the internal value. */
            reader(_args) {
                return (exValue) => {
                    return (_args.params.options.find((option) => option.value === exValue) ||
                        null);
                };
            },
            /** Creates a value constraint from the user input. */
            constraint(_args) {
                return new CompositeConstraint([]);
            },
            /**
             * Use `target.write()` to write the primitive value to the target,
             * or `target.writeProperty()` to write a property of the target.
             */
            writer(_args) {
                return (target, inValue) => {
                    target.write(inValue);
                };
            },
        },
        controller(args) {
            return new PluginController(args.document, {
                value: args.value,
                valueOptions: args.params.options,
                viewProps: args.viewProps,
            });
        },
    };

    const plugin = TweakpaneThumbnailListPlugin;

    exports.plugin = plugin;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
