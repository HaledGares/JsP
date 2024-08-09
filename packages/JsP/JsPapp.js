export function IsElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;  
}

export function Get(element, array = true, container = null) {

    let returns = null;

    if (element == null)
    {            
        return null;
    } 
    else if(IsElement(element))
    {
        return element;
    }
    else if(typeof element === 'object')
    {
        let elements = Array.isArray(element) ? element : Object.values(element);

        let elementsReturn = null;

        if(elements)
        {
            elementsReturn = [];

            elements.forEach(e => {

                let _e = Get(e, array, container);

                if(_e)
                {
                    if(Array.isArray(_e))
                    {
                        _e.forEach(el => {

                            if(Array.isArray(el))
                            {                                
                                elementsReturn = elementsReturn.concat(Get(el, array, container));
                            }
                            else if(IsElement(el))
                            {
                                elementsReturn.push(el);
                            }
                        });
                    }
                    else if(IsElement(_e))
                    {
                        elementsReturn.push(_e);
                    }
                }
            });
        }

        returns = elementsReturn;
    }
    else if(typeof element === 'string')
    {
        if(/[?^`]/.test(element))
        {
            returns = Get(element.split(/[?^`]/), array, container);
        }
        else
        {
            let cont = container ? container : document;

            let html = cont.getElementById(element);

            if(html)
            {
                returns = html;
            }
    
            html = cont.getElementsByClassName(element);
    
            if(html && html.length > 0)
            {
                returns = html;
            }
    
            html = cont.getElementsByName(element);
    
            if(html && html.length > 0)
            {
                returns = html;
            }
    
            html = cont.getElementsByTagName(element);
    
            if(html && html.length > 0)
            {
                returns = html;
            }
    
            html = cont.querySelectorAll(element);
    
            if(html && html.length > 0)
            {
                let ret = [];

                for(let r = 0; r < html.length; r++)
                {
                    ret.push(html[r]);
                }

                returns = ret;
            }
        }        
    }

    if(returns && returns.lenght)
    {
        if(returns.lenght > 0)
        {
            returns = [...returns];

        }
    }

    if(Array.isArray(returns) && (!array || returns.length == 1))
    {
        let ret = returns[0];
        return ret;
    }

    return returns;

}

export function StringToFunction(code){

    return new Function('return ' + code)();
}

export function CreateObjectByArray(keys, values){

    let obj = keys.reduce((acc, key, index) => {
    acc[key] = values[index];
    return acc;
    }, {});

    return obj;
}

export function StringfyObject(obj){

    let result = "";

    function getArray(item, key = "") {
        result += "[" + key + "<SPLIT>";

        for (let c = 0; c < item.length; c++) {
            if (typeof item[c] === 'object') {
                if (Array.isArray(item[c])) {
                    getArray(item[c]);
                } else {
                    getObject(item[c]);
                }
            } else if (typeof item[c] === 'function') {
                let func = item[c].toString();
                result += "(<FUNCTION>)=>" + func + "<=()<SPLIT>";
            } else {
                result += item[c] + "<SPLIT>";
            }
        }

        result += "]<SPLIT>";
    }

    function getObject(item, key = "") {
        result += "{" + key + "<SPLIT>";

        let _keys = Object.keys(item);
        let values = Object.values(item);

        for (let c = 0; c < values.length; c++) {
            if (typeof values[c] === 'object') {
                if (Array.isArray(values[c])) {
                    getArray(values[c], ":" + _keys[c]);
                } else {
                    getObject(values[c], ":" + _keys[c]);
                }
            } else if (typeof values[c] === 'function') {
                let func = values[c].toString();
                result += _keys[c] + ":" + "(<FUNCTION>)=>" + func + "<=()<SPLIT>";
            } else {
                result += _keys[c] + ":" + values[c] + "<SPLIT>";
            }
        }

        result += "}<SPLIT>";
    }

    if (Array.isArray(obj)) {
        getArray(obj);
    } else if (typeof obj === 'object') {
        getObject(obj);
    }

    return result;
}

export function SerializeString(text){

    if(text)
    {
        let dat = text.split("<SPLIT>");
        let index = 0;
        function getArray()
    {
        let array = [];
        index++; // Skip initial [
        while(index < dat.length)
        {
            let item = dat[index];
            if(item.startsWith("]"))
            {
                index++; // Skip ]
                break;
            }
            else if(item.startsWith("{"))
            {
                array.push(getObject());
            }
            else if(item.startsWith("["))
            {
                array.push(getArray());
            }
            else if(!isNaN(item))
            {
                if(item.includes('.'))
                {
                    array.push(parseFloat(item));
                }
                else
                {
                    array.push(parseInt(item));
                }
                index++;
            }
            else
            {
                if(item.startsWith("()=>{"))
                {
                    let code = item.replace("(<FUNCTION>)=>", "").replace("<=()", "");
                    let func = new Function('return ' + code)();
                    array.push(func);
                }
                else if(item == "true")
                {
                    array.push(true);
                }
                else if(item == "false")
                {
                    array.push(false);
                }
                else
                {
                    array.push(item);
                }

                index++;
            }
        }
        return array;
        }
        function getObject()
    {
        let obj = {};
        index++; // Skip initial {
        while(index < dat.length)
        {
            let item = dat[index];
            if(item.startsWith("}"))
            {
                index++; // Skip }
                break;
            }
            else
            {
                let keyValue = item.split(":");
                if(item.startsWith("{"))
                {
                    let key = keyValue[1];                
                    obj[key] = getObject();
                }
                else if(item.startsWith("["))
                {
                    let key = keyValue[1];                
                    obj[key] = getArray();
                }
                else
                {
                    let key = keyValue[0];                
                    let value = keyValue[1];
                    if(!isNaN(value))
                    {
                        if(value.includes('.'))
                        {
                            obj[key] = parseFloat(value);
                        }
                        else
                        {
                            obj[key] = parseInt(value);
                        }
                        index++;
                    }
                    else
                    {
                        if(value.startsWith("(<FUNCTION>)=>"))
                        {
                            let code = value.replace("(<FUNCTION>)=>", "").replace("<=()", "");
                            let func = new Function('return ' + code)();
                            obj[key] = func;
                        }
                        else if(value == "true")
                        {
                            obj[key] = true;
                        }
                        else if(value == "false")
                        {
                            obj[key] = false;
                        }
                        else
                        {
                            obj[key] = value;
                        }
                        
                        index++;
                    }
                }                
            }
        }
        return obj;
        }
        if(text.startsWith("{"))
        {
            return getObject();
        }
        else if(text.startsWith("["))
        {
            return getArray();
        }
    }

    return null;
}

export function FindDevice(maxLenght = 860, integer = false){

    return window.innerWidth < window.innerHeight ? (integer ? 1 : 'mobile-vertical') : window.innerWidth < maxLenght ? (integer ? 2 : 'mobile-horizontal') : (integer ? 0 : 'desktop');
}

export let TriggerEvent = (el, eventType, detail) => el.dispatchEvent(new CustomEvent(eventType, { detail }));

export function ModifyCSSrule(selector, rule, value){

    let ss = document.styleSheets;
    let _break = false;

    for(let s = 0; s < ss.length; s++)
    {
        var rules = ss[s].cssRules || ss[s].rules;

        for (var i = 0; i < rules.length; i++) {
            if (rules[i].selectorText === selector)
            {
              rules[i].style.backgroundColor = rule;
              rules[i].style.color = value;
              _break = true;
              break;
            }
        }

        if(_break)
        {
            break;
        }
    }
}

export function ModifyCSSvar(varName, varValue){

    document.documentElement.style.setProperty(varName, varValue);
}

export function IsInvalidCSSProperty(property, value) {

    var el = document.createElement('div');
    var keys = Object.keys(el.style);

    if(keys.includes(property))
    {
        if(value.includes('%') || value.includes('px'))
        {
            let um = value.includes('px') ? 'px' : '%';
            let number = value.replace(um, '');

            if(!isNaN(number))
            {
                return false;
            }
        }
    }

    return true;
}
