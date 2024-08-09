export function MobileSwipeOut(a,b,c=""){let d,f,g,h;const i=30;let j=!1;a.addEventListener("touchstart",function(a){a.target.classList.contains(c)&&(a.preventDefault(),a.stopImmediatePropagation(),d=a.touches[0].clientX,f=a.touches[0].clientY,j=!1,b&&b.touchStart&&b.touchStart(d,f))},{passive:!1}),a.addEventListener("touchmove",function(a){a.target.classList.contains(c)&&(a.preventDefault(),a.stopImmediatePropagation(),g=a.touches[0].clientX,h=a.touches[0].clientY,j=!0,b&&b.touchMove&&b.touchMove(g,h))},{passive:!1}),a.addEventListener("touchend",function(a){if(a.target.classList.contains(c)){if(a.preventDefault(),a.stopImmediatePropagation(),j){const a=g-d,c=h-f;if(Math.abs(a)+Math.abs(c)>i){let d=null;Math.abs(a)>Math.abs(c)?a>i?d=["right",0]:-30>a&&(d=["left",1]):c>i?d=["down",3]:-30>c&&(d=["up",2]),d&&b&&b.touchEnd&&b.touchEnd(d[0],d[1])}}d=0,f=0,g=0,h=0,j=!1}},{passive:!1})}export function MobileViewer_Vertical(a,b,d,e=null){function f(){return null==p&&null==q&&null==r&&null==s}function g(c=null){c&&(m=[]);let e=c?c.querySelectorAll("."+b):a.querySelectorAll("."+b);for(let b,f=0;f<e.length;f++){b=e[f],b.classList.add("ui-mobileViewer-ActionClass"),b.classList.add("ui-mobileViewer-group"),b.classList.add(u);let g=[];for(let a,b=0;b<e[f].children.length;b++)a=e[f].children[b],a.classList.contains(d)&&(g.push(a),a.classList.add("ui-mobileViewer-ActionClass"),a.classList.add("ui-mobileViewer-item"),a.classList.add(u));m.push([e[f],g]),c&&a.appendChild(e[f])}}function h(a=null,b=null){n=e&&e.startIndexGroup&&e.startIndexGroup<m.length?e.startIndexGroup:0,o=e&&e.startIndexItem&&e.startIndexItem<m[n][1].length?e.startIndexItem:0,n=a?a:n,o=b?b:o;let c=m[n][1][o],d=m[n][0];d.classList.remove(u),c.classList.remove(u)}function i(a,b){a?(n=b?n+1:n-1,0>n&&(n=m.length-1),n==m.length&&(n=0)):(o=b?o+1:o-1,0>o&&(o=m[n][1].length-1),o==m[n][1].length&&(o=0))}function j(a){function b(a,b){0===a?(p&&(clearTimeout(p),p=null),p=setTimeout(()=>{b.classList.add(u),k.forEach(a=>{b.classList.remove(a)}),p=null},t)):1===a?(q&&(clearTimeout(q),q=null),q=setTimeout(()=>{l.forEach(a=>{b.classList.remove(a)}),q=null},t)):2===a?(r&&(clearTimeout(r),r=null),r=setTimeout(()=>{b.classList.add(u),k.forEach(a=>{b.classList.remove(a)}),r=null},t)):3===a?(s&&(clearTimeout(s),s=null),s=setTimeout(()=>{l.forEach(a=>{b.classList.remove(a)}),s=null},t)):void 0}if(v&&f()||!v)if(("up"===a||"down"===a)&&1<m.length){let c=m[n][0];i(!0,"up"===a);let d=m[n][0];m[n][1].forEach(a=>{a.classList.add(u)}),o=o<m[n][1].length?o:m[n][1].length-1,m[n][1][o].classList.remove(u),c.classList.add("up"===a?k[0]:k[1]),l.forEach(a=>{c.classList.remove(a)}),b(0,c),d.classList.remove(u),d.classList.add("up"===a?l[0]:l[1]),k.forEach(a=>{d.classList.remove(a)}),b(1,d),e&&e.callbackDirection&&e.callbackDirection(a,n,o)}else if(("right"===a||"left"===a)&&1<m[n][1].length){let c=m[n][1][o];i(!1,"right"!==a);let d=m[n][1][o];c.classList.add("right"===a?k[2]:k[3]),l.forEach(a=>{c.classList.remove(a)}),b(2,c),d.classList.remove(u),d.classList.add("right"===a?l[2]:l[3]),k.forEach(a=>{d.classList.remove(a)}),b(3,d),e&&e.callbackDirection&&e.callbackDirection(a,n,o)}}let k=["ui-mobileViewer-exitTop","ui-mobileViewer-exitBottom","ui-mobileViewer-exitRight","ui-mobileViewer-exitLeft"],l=["ui-mobileViewer-enterBottom","ui-mobileViewer-enterTop","ui-mobileViewer-enterLeft","ui-mobileViewer-enterRight"],m=[],n=0,o=0,p=null,q=null,r=null,s=null,t=e&&e.timeSet&&e.id?e.timeSet:200,u=e&&e.classHide?e.classHide:"ui-mobileViewer-hide",v=!!(e&&e.wait);(function(){if(e&&e.id){let b=a.id+"-CSS-id";k=[b+"-exitTop",b+"-exitBottom",b+"-exitRight",b+"-exitLeft"],l=[b+"-enterBottom",b+"-enterTop",b+"-enterLeft",b+"-enterRight"];let c=document.getElementById(b);c||(c=document.createElement("style"),c.id=b,c.setAttribute("type","text/css"),document.head.appendChild(c)),c.innerHTML=`
                .${b}-exitTop, .${b}-exitBottom{
                    left: 0%;
                    opacity: 0.0;
                }
                .${b}-exitRight, .${b}-exitLeft{
                    top: 0%;
                    opacity: 0.0;
                }
                .${b}-enterBottom, .${b}-enterTop, .${b}-enterLeft, .${b}-enterRight{
                    left: 0%;
                    top: 0%;
                    opacity: 1.0;
                }
    /*----------------------------------------------   MOBILE-VIEWER-EXITS-ANIMATION ---------------------------------------------------------------------------*/
                .${b}-exitTop{
                    top: -85%;
                    animation: exitTop ${t/1e3}s ease-out;
                }
                .${b}-exitBottom{
                    top: 85%;
                    animation: exitBottom ${t/1e3}s ease-out;
                }
                .${b}-exitRight{
                    left: 85%;
                    animation: exitRight ${t/1e3}s ease-out;
                }
                .${b}-exitLeft{
                    left: -85%;
                    animation: exiltLeft ${t/1e3}s ease-out;
                }    
    /*----------------------------------------------   MOBILE-VIEWER-ENTERS-ANIMATION ---------------------------------------------------------------------------*/
                .${b}-enterBottom{
                    animation: enterBottom ${t/1e3}s ease-out;
                }
                .${b}-enterTop{
                    animation: enterTop ${t/1e3}s ease-out;
                }
                .${b}-enterLeft{
                    animation: enterLeft ${t/1e3}s ease-out;
                }
                .${b}-enterRight{
                    animation: enterRight ${t/1e3}s ease-out;
                }
            `}let b=document.getElementById("ui-mobileViewer-css-ID");b||(b=document.createElement("style"),b.id="ui-mobileViewer-css-ID",b.setAttribute("type","text/css"),document.head.appendChild(b)),b.innerHTML="\n            .ui-mobileViewer-group{\n                position: absolute;\n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n            }\n            .ui-mobileViewer-item{\n                position: absolute;\n                top: 0;\n                left: 0;\n                width: 100%;\n                height: 100%;\n            }\n            .ui-mobileViewer-hide{\n                display: none !important;\n            }\n            .ui-mobileViewer-transition{\n                                    \n            }\n            .ui-mobileViewer-fadeIn{\n                \n            }\n            .ui-mobileViewer-fadeOut{\n                \n            }\n            .ui-mobileViewer-exitTop, .ui-mobileViewer-exitBottom{\n                left: 0%;\n                opacity: 0.0;\n            }\n            .ui-mobileViewer-exitRight, .ui-mobileViewer-exitLeft{\n                top: 0%;\n                opacity: 0.0;\n            }\n            .ui-mobileViewer-enterBottom, .ui-mobileViewer-enterTop, .ui-mobileViewer-enterLeft, .ui-mobileViewer-enterRight{\n                left: 0%;\n                top: 0%;\n                opacity: 1.0;\n            }\n            @keyframes exitTop {\n                0%      {top: 0%; opacity: 1.0;}\n                100%     {top: -85%; opacity: 0.0;}\n            }\n            @keyframes exitBottom {\n                0%      {top: 0%; opacity: 1.0;}\n                100%     {top: 85%; opacity: 0.0;}\n            }\n            @keyframes exitRight {\n                0%      {left: 0%; opacity: 1.0;}\n                100%     {left: 85%; opacity: 0.0;}\n            }\n            @keyframes exiltLeft {\n                0%      {left: 0%; opacity: 1.0;}\n                100%     {left: -85%; opacity: 0.0;}\n            }\n            @keyframes enterBottom {\n                0%      {top: 85%; opacity: 0.0;}\n                100%     {top: 0%; opacity: 1.0;}\n            }\n            @keyframes enterTop {\n                0%      {top: -85%; opacity: 0.0;}\n                100%     {top: 0%; opacity: 1.0;}\n            }\n            @keyframes enterLeft {\n                0%      {left: -85%; opacity: 0.0;}\n                100%     {left: 0%; opacity: 1.0;}\n            }\n            @keyframes enterRight {\n                0%      {left: 85%; opacity: 0.0;}\n                100%     {left: 0%; opacity: 1.0;}\n            }\n    /*----------------------------------------------   MOBILE-VIEWER-EXITS-ANIMATION ---------------------------------------------------------------------------*/\n            .ui-mobileViewer-exitTop{\n                top: -85%;\n                animation: exitTop 0.2s ease-out;\n            }\n            .ui-mobileViewer-exitBottom{\n                top: 85%;\n                animation: exitBottom 0.2s ease-out;\n            }\n            .ui-mobileViewer-exitRight{\n                left: 85%;\n                animation: exitRight 0.2s ease-out;\n            }\n            .ui-mobileViewer-exitLeft{\n                left: -85%;\n                animation: exiltLeft 0.2s ease-out;\n            }    \n    /*----------------------------------------------   MOBILE-VIEWER-ENTERS-ANIMATION ---------------------------------------------------------------------------*/\n            .ui-mobileViewer-enterBottom{\n                animation: enterBottom 0.2s ease-out;\n            }\n            .ui-mobileViewer-enterTop{\n                animation: enterTop 0.2s ease-out;\n            }\n            .ui-mobileViewer-enterLeft{\n                animation: enterLeft 0.2s ease-out;\n            }\n            .ui-mobileViewer-enterRight{\n                animation: enterRight 0.2s ease-out;\n            }\n        "})(),g(),h();let w={};return w.touchEnd=a=>{j(a),e&&e.callbackTouchEnd&&e.callbackTouchEnd(a,n,o,m)},e&&e.callbackTouchStart&&(w.touchStart=a=>{e.callbackTouchStart(a,n,o,m)}),e&&e.callbackTouchMove&&(w.touchMove=a=>{e.callbackTouchMove(a,n,o,m)}),MobileSwipeOut(a,w,"ui-mobileViewer-ActionClass"),{elements:m,SetNewContent:(b,c=0,d=0)=>{let e=a.querySelectorAll(".ui-mobileViewer-vault")[0];e||(e=document.createElement("div"),e.classList.add("ui-mobileViewer-vault"),e.classList.add(u),a.appendChild(e));let f=[];return m.forEach(a=>{e.appendChild(a[0]),f.push(a)}),g(b),h(c,d),{newElements:m,oldElement:f}}}}export function HideShowDiv(a,b,c){let d=c&&c.classHide?c.classHide:"div-hide",e=c&&c.classShow?c.classShow:"div-show";if("div-hide"==d||"div-show"==e){let a=document.getElementById("P-open-close-div");a||(a=document.createElement("style"),a.id="P-open-close-div",a.setAttribute("type","text/css"),document.head.appendChild(a)),a.innerHTML=`
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
        `}if("show"===b){let b=c&&c.timeout?c.timeout:250;a.classList.contains(d)&&(a.classList.remove(d),a.classList.add(e),setTimeout(()=>{a.classList.remove(e)},b))}else a.classList.remove(e),a.classList.contains(d)||a.classList.add(d)}export function MoveDiv(a,b,c){let d=c&&c.classOut?c.classOut:null,e=c&&c.classTransition?c.classTransition:"ui-P-transition";if("ui-P-transition"==e||null==d){let a=document.getElementById("P-move-div");a||(a=document.createElement("style"),a.id="P-move-div",a.setAttribute("type","text/css"),document.head.appendChild(a)),a.innerHTML=`
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
        `}a.classList.contains(e)||a.classList.add(e);"outTop"===b?d=null==d?"ui-P-closed-top":d:"outBottom"===b?d=null==d?"ui-P-closed-bottom":d:"outRight"===b?d=null==d?"ui-P-closed-dx":d:"outLeft"===b?d=null==d?"ui-P-closed-sx":d:"inTop"===b?d=null==d?"ui-P-closed-top":d:"inBottom"===b?d=null==d?"ui-P-closed-bottom":d:"inRight"===b?d=null==d?"ui-P-closed-dx":d:"inLeft"===b?d=null==d?"ui-P-closed-sx":d:void 0;b.includes("out")?a.classList.add(d):a.classList.remove(d)}