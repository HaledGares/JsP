export function AngleInterpolation(a,b,c){let d=b-a;return 180<d?d-=360:-180>d&&(d+=360),a+c*d}export function Repeat(a,b){return a-Math.floor(a/b)*b}export function Split(a,b="fraction"){return"integer"==b?a-Math.floor(a):Math.trunc(a)}export function Remap(a,b,c,d,e){return d+(a-b)*(e-d)/(c-b)}export function MatrixMultiply(a,b,c="column*row"){return"column*row"==c?function(){let c=[];for(let d=0;d<b.length;d++){c[d]=[];for(let e=0;e<a.length;e++)c[d][e]=b[d]*a[e]}return c}():function(){if(a.length!==b.length)throw new Error("I vettori devono avere la stessa dimensione per questa operazione.");let c=0;for(let d=0;d<a.length;d++)c+=a[d]*b[d];return c}()}