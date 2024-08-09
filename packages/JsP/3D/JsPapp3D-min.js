import*as THREE from"three";export function Create(a,b){if("empty"===a||-1===a)return new THREE.Object3D;if("Scene"===a||0===a)return new THREE.Scene;if("Camera"===a||1===a){let a=null;if(b&&"ortho"===b.type){let b=window.innerWidth/window.innerHeight;a=new THREE.OrthographicCamera(5*-b,5*b,5,-5,.1,1e3),a.position.z=5}else a=new THREE.PerspectiveCamera(75,window.innerWidth/window.innerHeight,.1,1e3),a.position.set(5,5,5),a.lookAt(0,0,0);return a}if("Renderer"===a||2===a){const a=new THREE.WebGLRenderer({antialias:!0});let c=null;return b&&b.size?P.isElement(b.size)?(c=b.size.getBoundingClientRect(),a.setSize(c.width,c.height),window.addEventListener("resize",()=>{c=b.size.getBoundingClientRect(),b.camera.aspect=c.width/c.height,b.camera.updateProjectionMatrix(),a.setSize(c.width,c.height)})):(c=b.size,a.setSize(c.x,c.y),window.addEventListener("resize",()=>{b.camera.aspect=c.x/c.y,b.camera.updateProjectionMatrix(),a.setSize(c.x,c.y)})):(a.setSize(window.innerWidth,window.innerHeight),window.addEventListener("resize",()=>{b.camera.aspect=window.innerWidth/window.innerHeight,b.camera.updateProjectionMatrix(),a.setSize(window.innerWidth,window.innerHeight)})),{renderer:a,domElement:a.domElement}}if("dirLight"===a||3===a){let a=b&&b.color?b.color:"#dddddd";const c=new THREE.DirectionalLight(a,1);return c.position.set(10,10,10),c}if("ambLight"===a||4===a){let a=b&&b.color?b.color:"#7c73ff";return new THREE.AmbientLight(a,2)}if("Controls"===a||5===a){if(0===b.type){let a=new THREE.OrbitControls(b.camera,b.renderer.domElement);a.enableDamping=!0,a.dampingFactor=.25,a.mouseButtons.LEFT=THREE.MOUSE.ROTATE,a.mouseButtons.RIGHT=THREE.MOUSE.PAN,a.mouseButtons.MIDDLE=THREE.MOUSE.PAN;let c,d,f,g=!1,h=0,i=null,j=b.canvas;return j.addEventListener("pointermove",a=>{if((c||g)&&b.model){let e=a.clientX-d,j=a.clientY-h;if(c){let a=1+.001*(e+j),c=f.x*a,d=f.y*a,g=f.z*a;b.model.scale.set(1*c,1*d,1*g),b.scaleCallback&&b.scaleCallback()}else if(g){let a=i.x+.01*j,c=i.y+.01*e,d=i.z;b.model.rotation.set(1*a,1*c,1*d),b.rotateCallback&&b.rotateCallback()}}}),j.addEventListener("pointerdown",j=>{(2==j.button||0==j.button)&&j.altKey&&b.model&&(a.enableRotate=!1,a.enablePan=!1,d=j.clientX,h=j.clientY,2==j.button?(f=b.model.scale.clone(),c=!0,b.startScaleCallback&&b.startScaleCallback()):0==j.button&&(i=b.model.rotation.clone(),g=!0,b.startRotateCallback&&b.startRotateCallback()))}),j.addEventListener("pointerup",d=>{a.enableRotate=!0,a.enablePan=!0,c=!1,g=!1,2==d.button?b.startScaleCallback&&b.endScaleCallback():0==d.button&&b.startRotateCallback&&b.endRotateCallback()}),a}}else if("Grid"===a||6===a){if(0===b.type){const a=new THREE.GridHelper(b&&b.size?b.size:10,b&&b.divisions?b.divisions:10);return a}if(1===b.type){const a=new THREE.PlaneGeometry(b.x,b.y,b.xs,b.ys),c=new THREE.MeshBasicMaterial({color:b.color,wireframe:!0,side:THREE.DoubleSide}),d=new THREE.Mesh(a,c);return d.rotation.x=Math.PI/2,d}}else{if("Origin"===a||7===a){const a=new THREE.Group,c=new THREE.LineBasicMaterial({color:16711680}),d=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(b&&b.Lenght?b.Lenght:2,0,0)]),e=new THREE.Line(d,c);a.add(e);const f=new THREE.LineBasicMaterial({color:65280}),g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,b&&b.Lenght?b.Lenght:2,0)]),h=new THREE.Line(g,f);a.add(h);const i=new THREE.LineBasicMaterial({color:255}),j=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,b&&b.Lenght?b.Lenght:2)]),k=new THREE.Line(j,i);return a.add(k),a}if("ImportModel"===a||8===a){const a=b.event.target.files[0];if(a||b.forcedPath){const c=new FileReader;c.readAsText(b.forcedPath?b.forcedPath:a),c.onload=a=>{const c=a.target.result,d=new THREE.OBJLoader,e=d.parse(c);return b.callback&&b.callback(e),e}}}}}export function advOrbitControls(a,b,c,d=null){let f=new THREE.OrbitControls(b,c.domElement);return f.enableDamping=!0,f.dampingFactor=.25,f.mouseButtons.LEFT=THREE.MOUSE.ROTATE,f.mouseButtons.RIGHT=THREE.MOUSE.PAN,f.mouseButtons.MIDDLE=THREE.MOUSE.PAN,f.isScaling=!1,f.isRotating=!1,f.x=0,f.y=0,f.scale=null,f.rot=null,f.canvas=a,f.scaleCallback=d&&d.scaleCallback?d.scaleCallback:null,f.rotateCallback=d&&d.rotateCallback?d.rotateCallback:null,f.startScaleCallback=d&&d.startScaleCallback?d.startScaleCallback:null,f.startRotateCallback=d&&d.startRotateCallback?d.startRotateCallback:null,f.endScaleCallback=d&&d.endScaleCallback?d.endScaleCallback:null,f.endRotateCallback=d&&d.endRotateCallback?d.endRotateCallback:null,a.addEventListener("pointermove",a=>{if((f.isScaling||f.isRotating)&&f.model){let b=a.clientX-f.x,c=a.clientY-f.y;if(f.isScaling){let d=1+.001*(b+c),e=f.scale.x*d,g=f.scale.y*d,h=f.scale.z*d,i=1;f.model.scale.set(e*i,g*i,h*i),f.scaleCallback&&f.scaleCallback(a,f)}else if(f.isRotating){let d=f.rot.x+.01*c,e=f.rot.y+.01*b,g=f.rot.z,h=1;f.model.rotation.set(d*h,e*h,g*h),f.rotateCallback&&f.rotateCallback(a,f)}}}),a.addEventListener("pointerdown",a=>{(2==a.button||0==a.button)&&a.altKey&&f.model&&(f.enableRotate=!1,f.enablePan=!1,f.x=a.clientX,f.y=a.clientY,2==a.button?(f.scale=f.model.scale.clone(),f.isScaling=!0,f.startScaleCallback&&f.startScaleCallback(a,f)):0==a.button&&(f.rot=f.model.rotation.clone(),f.isRotating=!0,f.startRotateCallback&&f.startRotateCallback(a,f)))}),a.addEventListener("pointerup",a=>{f.enableRotate=!0,f.enablePan=!0,f.isScaling=!1,f.isRotating=!1,2==a.button?f.startScaleCallback&&f.endScaleCallback(a,f):0==a.button&&f.startRotateCallback&&f.endRotateCallback(a,f)}),f}export function ConvertToWireframe(a,b=16777215){return a.traverse(function(a){if(a.isMesh){const c=new THREE.MeshBasicMaterial({color:b,wireframe:!0});a.material=c}}),a}export function GetGeometry(a="Box"){let b=null,c=null;switch(a){case"Box":b=new THREE.BoxGeometry(1,1,1),c={width:1,height:1,depth:1,widthSegments:1,heightSegments:1,depthSegments:1};break;case"Capsule":b=new THREE.CapsuleGeometry(1,1,8,16),c={radius:1,length:1,capSegments:8,radialSegments:16};break;case"Circle":b=new THREE.CircleGeometry(1,32),c={radius:1,segments:32};break;case"Cone":b=new THREE.ConeGeometry(1,2,32),c={radius:1,height:2,radialSegments:32,heightSegments:1};break;case"Cylinder":b=new THREE.CylinderGeometry(1,1,2,32),c={radiusTop:1,radiusBottom:1,height:2,radialSegments:32,heightSegments:1};break;case"Dodecahedron":b=new THREE.DodecahedronGeometry(1),c={radius:1,detail:0};break;case"Icosahedron":b=new THREE.IcosahedronGeometry(1),c={radius:1,detail:0};break;case"Octahedron":b=new THREE.OctahedronGeometry(1),c={radius:1,detail:0};break;case"Plane":b=new THREE.PlaneGeometry(1,1,1,1),c={width:1,height:1,widthSegments:1,heightSegments:1};break;case"Ring":b=new THREE.RingGeometry(.5,1,32),c={innerRadius:.5,outerRadius:1,thetaSegments:32,phiSegments:1,thetaStart:0,thetaLength:2*Math.PI};break;case"Sphere":b=new THREE.SphereGeometry(1,32,32),c={radius:1,widthSegments:32,heightSegments:32};break;case"Tetrahedron":b=new THREE.TetrahedronGeometry(1),c={radius:1,detail:0};break;case"Torus":b=new THREE.TorusGeometry(1,.4,16,100),c={radius:1,tube:.4,radialSegments:16,tubularSegments:100};break;default:return void console.error("Tipo di geometria non supportato:",a);}return{geometry:b,options:c}}