export function ResizeImage(a,b,c){const d=document.createElement("canvas");d.width=b,d.height=c;const e=d.getContext("2d");return e.drawImage(a,0,0,b,c),d.toDataURL()}