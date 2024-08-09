function MobileSwipeOut(element, callbacks, ActionClass = '') {
    let startX, startY, endX, endY;
    const threshold = 30;
    let isSwiping = false;

    element.addEventListener('touchstart', function(e) {
        if(e.target.classList.contains(ActionClass))
        {
            e.preventDefault();
            e.stopImmediatePropagation();

            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;  // Reset del flag

            if (callbacks && callbacks.touchStart) {
                    callbacks.touchStart(startX, startY);
            }
        }

    }, { passive: false });

    element.addEventListener('touchmove', function(e) {
        if(e.target.classList.contains(ActionClass))
        {
            e.preventDefault();
            e.stopImmediatePropagation();

            endX = e.touches[0].clientX;
            endY = e.touches[0].clientY;
            isSwiping = true;  // Imposta il flag

            if (callbacks && callbacks.touchMove) {
                callbacks.touchMove(endX, endY);
            }
        }
    }, { passive: false });

    element.addEventListener('touchend', function(e) {
        if(e.target.classList.contains(ActionClass))
        {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (isSwiping) {
                const diffX = endX - startX;
                const diffY = endY - startY;

                if (Math.abs(diffX) + Math.abs(diffY) > threshold) {
                    let direction = null;

                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        // Horizontal swipe
                        if (diffX > threshold) {
                            direction = ['right', 0];
                        } else if (diffX < -threshold) {
                            direction = ['left', 1];
                        }
                    } else {
                        // Vertical swipe
                        if (diffY > threshold) {
                            direction = ['down', 3];
                        } else if (diffY < -threshold) {
                            direction = ['up', 2];
                        }
                    }

                    if (direction && callbacks && callbacks.touchEnd) {
                        callbacks.touchEnd(direction[0], direction[1]);
                    }
                }
            }

            startX = 0;
            startY = 0;
            endX = 0;
            endY = 0;
            isSwiping = false;  // Reset del flag
        }
    }, { passive: false });
}

function MobileViewer_Vertical(element, classGroup, classItem, options = null)
{
    let exits = [
    'ui-mobileViewer-exitTop', 'ui-mobileViewer-exitBottom', 'ui-mobileViewer-exitRight', 'ui-mobileViewer-exitLeft'
    ];        
    let enters = [
    'ui-mobileViewer-enterBottom', 'ui-mobileViewer-enterTop', 'ui-mobileViewer-enterLeft', 'ui-mobileViewer-enterRight'
    ];
    let elements = [];
    let indexGroup = 0;
    let indexItems = 0;        
    let timeout_id_0 = null;
    let timeout_id_1 = null;
    let timeout_id_A = null;
    let timeout_id_B = null;
    let timeSet = options && options.timeSet && options.id ? options.timeSet : 200;
    let classHide = options && options.classHide ? options.classHide : 'ui-mobileViewer-hide';
    let wait = options && options.wait ? true : false;

    function canGo()
    {
        return timeout_id_0 == null && timeout_id_1 == null && timeout_id_A == null && timeout_id_B == null;
    }

    function initContainer(newContainer = null)
    {
        if(newContainer)
        {
            elements = [];
        }
        let groups = newContainer ? newContainer.querySelectorAll('.' + classGroup) : element.querySelectorAll('.' + classGroup);
        for(let g = 0; g < groups.length; g++)
        {
            let group = groups[g];
            group.classList.add('ui-mobileViewer-ActionClass');
            group.classList.add('ui-mobileViewer-group');
            group.classList.add(classHide);
            
            let items = [];
            for(let c = 0; c < groups[g].children.length; c++)
            {
                let child = groups[g].children[c];
                if(child.classList.contains(classItem))
                {                        
                    items.push(child);
                    child.classList.add('ui-mobileViewer-ActionClass');
                    child.classList.add('ui-mobileViewer-item');
                    child.classList.add(classHide);
                }
            }
            elements.push([groups[g], items]);
            if(newContainer)
            {
                element.appendChild(groups[g]);
            }
        }
    }

    function setIndexes(groupIndex = null, itemIndex = null)
    {
        indexGroup = (options && options.startIndexGroup) && (options.startIndexGroup < elements.length) ? options.startIndexGroup : 0; 
        indexItems = (options && options.startIndexItem) && (options.startIndexItem < elements[indexGroup][1].length) ? options.startIndexItem : 0;
        indexGroup = groupIndex ? groupIndex : indexGroup;
        indexItems = itemIndex ? itemIndex : indexItems;
        let showItem = elements[indexGroup][1][indexItems];
        let shopwGroup = elements[indexGroup][0];
        shopwGroup.classList.remove(classHide);
        showItem.classList.remove(classHide);
    }

    function indexes(group, add)
    {            
        if(group)
        {
            indexGroup = add ? indexGroup + 1 : indexGroup - 1;
            if(indexGroup < 0)
            {
                indexGroup = elements.length - 1;
            }
            if(indexGroup == elements.length)
            {
                indexGroup = 0;
            }
        }
        else
        {
            indexItems = add ? indexItems + 1 : indexItems - 1;
            if(indexItems < 0)
            {
                indexItems = elements[indexGroup][1].length - 1;
            }
            if(indexItems == elements[indexGroup][1].length)
            {
                indexItems = 0;
            }
        }
    }

    function move(dir)
    {
        function _timeout_(i, it)
        {
            switch(i)
            {
                case 0:
                    if(timeout_id_0)
                    {
                        clearTimeout(timeout_id_0);
                        timeout_id_0 = null;
                    }                        
                    timeout_id_0 = setTimeout(() => {
                        it.classList.add(classHide);
                        exits.forEach(cl => {
                            it.classList.remove(cl);
                        });
                        timeout_id_0 = null;
                    }, timeSet);
                break;
                case 1:
                    if(timeout_id_1)
                    {
                        clearTimeout(timeout_id_1);
                        timeout_id_1 = null;
                    }                        
                    timeout_id_1 = setTimeout(() => {
                        enters.forEach(cl => {
                            it.classList.remove(cl);
                        });
                        timeout_id_1 = null;
                    }, timeSet);
                break;
                case 2:
                    if(timeout_id_A)
                    {
                        clearTimeout(timeout_id_A);
                        timeout_id_A = null;
                    }                        
                    timeout_id_A = setTimeout(() => {
                        it.classList.add(classHide);
                        exits.forEach(cl => {
                            it.classList.remove(cl);
                        });
                        timeout_id_A = null;
                    }, timeSet);
                break;
                case 3:
                    if(timeout_id_B)
                    {
                        clearTimeout(timeout_id_B);
                        timeout_id_B = null;
                    }                        
                    timeout_id_B = setTimeout(() => {
                        enters.forEach(cl => {
                            it.classList.remove(cl);
                        });
                        timeout_id_B = null;
                    }, timeSet);
                break;
            }             
        }

        if((wait && canGo()) || !wait)
        {
            if((dir === 'up' || dir === 'down') && elements.length > 1)
            {
                let exitItem = elements[indexGroup][0];
                indexes(true, dir === 'up' ? true : false);
                let enterItem = elements[indexGroup][0];
                elements[indexGroup][1].forEach(its => {
                    its.classList.add(classHide);
                });
                indexItems = indexItems < elements[indexGroup][1].length ? indexItems : elements[indexGroup][1].length - 1;
                elements[indexGroup][1][indexItems].classList.remove(classHide);
                exitItem.classList.add(dir === 'up' ? exits[0] : exits[1]);
                enters.forEach(cl => {
                    exitItem.classList.remove(cl);
                });
                _timeout_(0, exitItem);
                enterItem.classList.remove(classHide);
                enterItem.classList.add(dir === 'up' ? enters[0] : enters[1]);
                exits.forEach(cl => {
                    enterItem.classList.remove(cl);
                });
                _timeout_(1, enterItem);

                if(options && options.callbackDirection)
                {
                    options.callbackDirection(dir, indexGroup, indexItems);
                }
            }
            else if((dir === 'right' || dir === 'left') && elements[indexGroup][1].length > 1)
            {
                let exitItem = elements[indexGroup][1][indexItems];
                indexes(false, dir === 'right' ? false : true);
                let enterItem = elements[indexGroup][1][indexItems];
                exitItem.classList.add(dir === 'right' ? exits[2] : exits[3]);
                enters.forEach(cl => {
                    exitItem.classList.remove(cl);
                });
                _timeout_(2, exitItem);
                enterItem.classList.remove(classHide);
                enterItem.classList.add(dir === 'right' ? enters[2] : enters[3]);
                exits.forEach(cl => {
                    enterItem.classList.remove(cl);
                });
                _timeout_(3, enterItem);      
                
                if(options && options.callbackDirection)
                {
                    options.callbackDirection(dir, indexGroup, indexItems);
                }
            }  
        }          
    }

    function installStyle()
    {
        let systemCSS = `
            .ui-mobileViewer-group{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            .ui-mobileViewer-item{
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
            }
            .ui-mobileViewer-hide{
                display: none !important;
            }
            .ui-mobileViewer-transition{
                                    
            }
            .ui-mobileViewer-fadeIn{
                
            }
            .ui-mobileViewer-fadeOut{
                
            }
            .ui-mobileViewer-exitTop, .ui-mobileViewer-exitBottom{
                left: 0%;
                opacity: 0.0;
            }
            .ui-mobileViewer-exitRight, .ui-mobileViewer-exitLeft{
                top: 0%;
                opacity: 0.0;
            }
            .ui-mobileViewer-enterBottom, .ui-mobileViewer-enterTop, .ui-mobileViewer-enterLeft, .ui-mobileViewer-enterRight{
                left: 0%;
                top: 0%;
                opacity: 1.0;
            }
            @keyframes exitTop {
                0%      {top: 0%; opacity: 1.0;}
                100%     {top: -85%; opacity: 0.0;}
            }
            @keyframes exitBottom {
                0%      {top: 0%; opacity: 1.0;}
                100%     {top: 85%; opacity: 0.0;}
            }
            @keyframes exitRight {
                0%      {left: 0%; opacity: 1.0;}
                100%     {left: 85%; opacity: 0.0;}
            }
            @keyframes exiltLeft {
                0%      {left: 0%; opacity: 1.0;}
                100%     {left: -85%; opacity: 0.0;}
            }
            @keyframes enterBottom {
                0%      {top: 85%; opacity: 0.0;}
                100%     {top: 0%; opacity: 1.0;}
            }
            @keyframes enterTop {
                0%      {top: -85%; opacity: 0.0;}
                100%     {top: 0%; opacity: 1.0;}
            }
            @keyframes enterLeft {
                0%      {left: -85%; opacity: 0.0;}
                100%     {left: 0%; opacity: 1.0;}
            }
            @keyframes enterRight {
                0%      {left: 85%; opacity: 0.0;}
                100%     {left: 0%; opacity: 1.0;}
            }
    /*----------------------------------------------   MOBILE-VIEWER-EXITS-ANIMATION ---------------------------------------------------------------------------*/
            .ui-mobileViewer-exitTop{
                top: -85%;
                animation: exitTop 0.2s ease-out;
            }
            .ui-mobileViewer-exitBottom{
                top: 85%;
                animation: exitBottom 0.2s ease-out;
            }
            .ui-mobileViewer-exitRight{
                left: 85%;
                animation: exitRight 0.2s ease-out;
            }
            .ui-mobileViewer-exitLeft{
                left: -85%;
                animation: exiltLeft 0.2s ease-out;
            }    
    /*----------------------------------------------   MOBILE-VIEWER-ENTERS-ANIMATION ---------------------------------------------------------------------------*/
            .ui-mobileViewer-enterBottom{
                animation: enterBottom 0.2s ease-out;
            }
            .ui-mobileViewer-enterTop{
                animation: enterTop 0.2s ease-out;
            }
            .ui-mobileViewer-enterLeft{
                animation: enterLeft 0.2s ease-out;
            }
            .ui-mobileViewer-enterRight{
                animation: enterRight 0.2s ease-out;
            }
        `;
        if(options && options.id)
        {
            let id_personal = element.id + '-CSS-id'
            exits = [
                id_personal + '-exitTop', id_personal + '-exitBottom', id_personal + '-exitRight', id_personal + '-exitLeft'
            ];
            enters = [
                id_personal + '-enterBottom', id_personal + '-enterTop', id_personal + '-enterLeft', id_personal + '-enterRight'
            ];
            let cssSubNode = document.getElementById(id_personal);
            if(!cssSubNode)
            {
                cssSubNode = document.createElement('style');
                cssSubNode.id = id_personal;
                cssSubNode.setAttribute('type', 'text/css');
                document.head.appendChild(cssSubNode);
            }
            cssSubNode.innerHTML = `
                .${id_personal}-exitTop, .${id_personal}-exitBottom{
                    left: 0%;
                    opacity: 0.0;
                }
                .${id_personal}-exitRight, .${id_personal}-exitLeft{
                    top: 0%;
                    opacity: 0.0;
                }
                .${id_personal}-enterBottom, .${id_personal}-enterTop, .${id_personal}-enterLeft, .${id_personal}-enterRight{
                    left: 0%;
                    top: 0%;
                    opacity: 1.0;
                }
    /*----------------------------------------------   MOBILE-VIEWER-EXITS-ANIMATION ---------------------------------------------------------------------------*/
                .${id_personal}-exitTop{
                    top: -85%;
                    animation: exitTop ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-exitBottom{
                    top: 85%;
                    animation: exitBottom ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-exitRight{
                    left: 85%;
                    animation: exitRight ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-exitLeft{
                    left: -85%;
                    animation: exiltLeft ${timeSet / 1000}s ease-out;
                }    
    /*----------------------------------------------   MOBILE-VIEWER-ENTERS-ANIMATION ---------------------------------------------------------------------------*/
                .${id_personal}-enterBottom{
                    animation: enterBottom ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-enterTop{
                    animation: enterTop ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-enterLeft{
                    animation: enterLeft ${timeSet / 1000}s ease-out;
                }
                .${id_personal}-enterRight{
                    animation: enterRight ${timeSet / 1000}s ease-out;
                }
            `;
        }
        let id_css = 'ui-mobileViewer-css-ID'
        let cssNode = document.getElementById(id_css);
        if(!cssNode)
        {
            cssNode = document.createElement('style');
            cssNode.id = id_css;
            cssNode.setAttribute('type', 'text/css');
            document.head.appendChild(cssNode);
        }
        cssNode.innerHTML = systemCSS;
    }

    installStyle();

    initContainer();

    setIndexes();

    let subCallbacks = {};

    subCallbacks.touchEnd = (d)=>{

        move(d);

        if(options && options.callbackTouchEnd)
        {
            options.callbackTouchEnd(d, indexGroup, indexItems, elements);
        }
    };

    if(options && options.callbackTouchStart)
    {
        subCallbacks.touchStart = (d)=>{
            options.callbackTouchStart(d, indexGroup, indexItems, elements);
        }
    }

    if(options && options.callbackTouchMove)
    {
        subCallbacks.touchMove = (d)=>{
            options.callbackTouchMove(d, indexGroup, indexItems, elements);
        }
    }

    MobileSwipeOut(element, subCallbacks, 'ui-mobileViewer-ActionClass');
    
    return {
        elements: elements,
        SetNewContent:(newContents, groupIndexStart = 0, itemIndexStart = 0)=>{
            let vault = element.querySelectorAll('.ui-mobileViewer-vault')[0];
            if(!vault)
            {
                vault = document.createElement('div');
                vault.classList.add('ui-mobileViewer-vault');
                vault.classList.add(classHide);
                element.appendChild(vault);
            }
            let oldEls = [];
            elements.forEach(el => {
                vault.appendChild(el[0]);
                oldEls.push(el);
            });
            initContainer(newContents);
            setIndexes(groupIndexStart, itemIndexStart);
            return {
                newElements: elements,
                oldElement: oldEls
            };
        }
    };
}

function HideShowDiv(div, mode, options)
{
    let classHide = options && options.classHide ? options.classHide : 'div-hide';
    let classShow = options && options.classShow ? options.classShow : 'div-show';

    if(classHide == 'div-hide' || classShow == 'div-show')
    {
        let style = document.getElementById('P-open-close-div');

        if(!style)
        {
            style = document.createElement('style');
            style.id = 'P-open-close-div';
            style.setAttribute('type', 'text/css');
            document.head.appendChild(style);
        }

        style.innerHTML = `
            .div-hide{
                animation: closeDiv 0.25s ease-in-out forwards;
            }
            .div-show{
                animation: openDiv 0.25s ease-in-out forwards;
            }
            @keyframes closeDiv{
                0%{transform: scaleY(100%);}
                50%{transform: scaleY(50%);
                    transform: scaleX(100%);}
                100%{transform: scaleX(0%);
                    transform: scaleY(0%);}
            }
            @keyframes openDiv{
                0%{transform: scaleX(0%);
                    transform: scaleY(0%);}
                50%{transform: scaleX(100%);
                    transform: scaleY(50%);}
                100%{transform: scaleY(100%);}
            }
        `;
    }

    if(mode === 'show')
    {
        let timeout = options && options.timeout ? options.timeout : 250;

        if(div.classList.contains(classHide))
        {
            div.classList.remove(classHide);
        
            div.classList.add(classShow);
        
            setTimeout(() => {
                div.classList.remove(classShow);
            }, timeout);
        }
    }
    else
    {
        div.classList.remove(classShow);

        if(!div.classList.contains(classHide))
        {
            div.classList.add(classHide);
        }
    }
}

function MoveDiv(div, mode, options)
{
    let classOut = options && options.classOut ? options.classOut : null;
    let classTransition = options && options.classTransition ? options.classTransition : 'ui-P-transition'; 

    if(classTransition == 'ui-P-transition' || classOut == null)
    {
        let style = document.getElementById('P-move-div');

        if(!style)
        {
            style = document.createElement('style');
            style.id = 'P-move-div';
            style.setAttribute('type', 'text/css');
            document.head.appendChild(style);
        }   

        style.innerHTML = `
            .ui-P-transition{
                transition: opacity 0.25s, transform 0.25s;
            }
            .ui-P-closed-sx{
                transform: translateX(-120%);
            }
            .ui-P-closed-dx{
                transform: translateX(120%);
            }
            .ui-P-closed-top{
                transform: translateY(-120%);
            }
            .ui-P-closed-bottom{
                transform: translateY(120%);
            }
        `;
    }   

    if(!div.classList.contains(classTransition))
    {
        div.classList.add(classTransition);
    }   

    switch(mode)
    {
        case 'outTop':
            classOut = classOut == null ? 'ui-P-closed-top' : classOut;
        break;
        case 'outBottom':
            classOut = classOut == null ? 'ui-P-closed-bottom' : classOut;
        break;
        case 'outRight':
            classOut = classOut == null ? 'ui-P-closed-dx' : classOut;
        break;
        case 'outLeft':
            classOut = classOut == null ? 'ui-P-closed-sx' : classOut;
        break;
        case 'inTop':
            classOut = classOut == null ? 'ui-P-closed-top' : classOut;
        break;
        case 'inBottom':
            classOut = classOut == null ? 'ui-P-closed-bottom' : classOut;
        break;
        case 'inRight':
            classOut = classOut == null ? 'ui-P-closed-dx' : classOut;
        break;
        case 'inLeft':
            classOut = classOut == null ? 'ui-P-closed-sx' : classOut;
        break;
    }   

    if(mode.includes('out'))
    {
        div.classList.add(classOut);
    }
    else
    {
        div.classList.remove(classOut);
    }
}