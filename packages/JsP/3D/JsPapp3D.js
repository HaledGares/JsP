import * as THREE from 'three';

export function Create(type, options)
{
    if(type === 'empty' || type === -1)
    {
        return new THREE.Object3D();
    }
    else if(type === 'Scene' || type === 0)
    {
        return new THREE.Scene();
    }
    else if(type === 'Camera' || type === 1)
    {
        let camera = null;

        if(options && options.type === 'ortho')
        {                
            let aspect = window.innerWidth / window.innerHeight;

            camera = new THREE.OrthographicCamera(-aspect * 5, aspect * 5, 5, -5, 0.1, 1000);

            camera.position.z = 5;
        }
        else
        {
            camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

            camera.position.set(5, 5, 5);

            camera.lookAt(0, 0, 0);
        }
        
        return camera;
    }
    else if(type === 'Renderer' || type === 2)
    {
        const renderer = new THREE.WebGLRenderer({ antialias: true });

        let size = null;

        if(options && options.size)
        {
            if(P.isElement(options.size))
            {
                size = options.size.getBoundingClientRect();

                renderer.setSize(size.width, size.height);

                window.addEventListener('resize', () => {

                    size = options.size.getBoundingClientRect();

                    options.camera.aspect = size.width / size.height;
                    options.camera.updateProjectionMatrix();
                    renderer.setSize(size.width, size.height);
                });
            }
            else
            {
                size = options.size;

                renderer.setSize(size.x, size.y);
    
                window.addEventListener('resize', () => {
                    options.camera.aspect = size.x / size.y;
                    options.camera.updateProjectionMatrix();
                    renderer.setSize(size.x, size.y);
                });
            }
        }
        else
        {
            renderer.setSize(window.innerWidth, window.innerHeight);
    
            window.addEventListener('resize', () => {
                options.camera.aspect = window.innerWidth / window.innerHeight;
                options.camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });
        }
        
        return {renderer: renderer, domElement: renderer.domElement};
    }
    else if(type === 'dirLight' || type === 3)
    {
        let color = options && options.color ? options.color : '#dddddd';
        const dirLight = new THREE.DirectionalLight(color, 1);
        dirLight.position.set(10, 10, 10);
        return dirLight;
    }
    else if(type === 'ambLight' || type === 4)
    {
        let color = options && options.color ? options.color : '#7c73ff';
        return new THREE.AmbientLight(color, 2);
    }
    else if(type === 'Controls' || type === 5)
    {
        if(options.type === 0)
        {
            let controls = new THREE.OrbitControls(options.camera, options.renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.25;
        
            controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
            controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
            controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
    
            let isScaling, isRotating = false;
            let x1, y1 = 0;
            let scale1, rot1 = null;
    
            let canvas = options.canvas;
    
            canvas.addEventListener('pointermove', (e) => {
                if ((isScaling || isRotating) && options.model) {
                    let dx = e.clientX - x1;
                    let dy = e.clientY - y1;
    
                    if (isScaling) {

                        let scaleFactor = 1 + (dx + dy) * 0.001;
    
                        let scaleX = scale1.x * scaleFactor;
                        let scaleY = scale1.y * scaleFactor;
                        let scaleZ = scale1.z * scaleFactor;
                        let scaleW = 1;

                        options.model.scale.set(
                            scaleX * scaleW,
                            scaleY * scaleW,
                            scaleZ * scaleW
                        );

                        if(options.scaleCallback)
                        {
                            options.scaleCallback();
                        }

                    } else if (isRotating) {

                        let rotFactorX = rot1.x + dy * 0.01;
                        let rotFactorY = rot1.y + dx * 0.01;
    
                        let rotationX = rotFactorX;
                        let rotationY = rotFactorY;
                        let rotationZ = rot1.z;
                        let rotationW = 1;

                        options.model.rotation.set(
                            rotationX * rotationW,
                            rotationY * rotationW,
                            rotationZ * rotationW
                        );

                        if(options.rotateCallback)
                        {
                            options.rotateCallback();
                        }
                    }
                }
            });
        
            canvas.addEventListener('pointerdown', (e) => {
            
                if((e.button == 2 || e.button == 0) && e.altKey && options.model)
                {
                    controls.enableRotate = false;
                    controls.enablePan = false;
                
                    x1 = e.clientX;
                    y1 = e.clientY;
                
                    if(e.button == 2)
                    {
                        scale1 = options.model.scale.clone();
                        isScaling = true;
                        if(options.startScaleCallback)
                        {
                            options.startScaleCallback();
                        }
                    }
                    else if(e.button == 0)
                    {
                        rot1 = options.model.rotation.clone();
                        isRotating = true;
                        if(options.startRotateCallback)
                        {
                            options.startRotateCallback();
                        }
                    }
                }
            });
        
            canvas.addEventListener('pointerup', (e)=>{
                controls.enableRotate = true;
                controls.enablePan = true;
            
                isScaling = false;
                isRotating = false;

                if(e.button == 2)
                {
                    if(options.startScaleCallback)
                    {
                        options.endScaleCallback();
                    }
                }
                else if(e.button == 0)
                {
                    if(options.startRotateCallback)
                    {
                        options.endRotateCallback();
                    }
                }
            });

            return controls;
        }
    }
    else if(type === 'Grid' || type === 6)
    {
        if(options.type === 0)
        {
            const gridHelper = new THREE.GridHelper(
                options && options.size ? options.size : 10,
                options && options.divisions ? options.divisions : 10);

            return gridHelper;
        }
        else if(options.type === 1)
        {
            const geometry = new THREE.PlaneGeometry( options.x, options.y, options.xs, options.ys );
            const material = new THREE.MeshBasicMaterial({
                color: options.color,
                wireframe: true,
                side: THREE.DoubleSide
            });
            const plane = new THREE.Mesh( geometry, material );
            plane.rotation.x = Math.PI / 2;
        
            return plane;
        }
    }
    else if(type === 'Origin' || type === 7)
    {
        const axes = new THREE.Group();

        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(options && options.Lenght ?options.Lenght : 2, 0, 0)
        ]);
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        axes.add(xAxis);
    
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, options && options.Lenght ?options.Lenght : 2, 0)
        ]);
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        axes.add(yAxis);
    
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, options && options.Lenght ?options.Lenght : 2)
        ]);
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        axes.add(zAxis);
        
        return axes;
    }
    else if(type === 'ImportModel' || type === 8)
    {
        const file = options.event.target.files[0];

        if (file || options.forcedPath) {
            const reader = new FileReader();
            reader.readAsText(options.forcedPath ? options.forcedPath : file);
            reader.onload = (e) => {
                const contents = e.target.result;
                const objLoader = new THREE.OBJLoader();
                const object = objLoader.parse(contents);

                if(options.callback)
                {
                    options.callback(object);
                }

                return object;
            };
        }
    }
}

export function advOrbitControls(canvas, camera, renderer, options = null)
{
    let controls = new THREE.OrbitControls(camera, renderer.domElement);

    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
    controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
    controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;

    controls.isScaling = false;
    controls.isRotating = false;
    controls.x = 0;
    controls.y = 0;
    controls.scale = null;
    controls.rot = null;

    controls.canvas = canvas;

    controls.scaleCallback = options && options.scaleCallback ? options.scaleCallback : null;
    controls.rotateCallback = options && options.rotateCallback ? options.rotateCallback : null;
    controls.startScaleCallback = options && options.startScaleCallback ? options.startScaleCallback : null;
    controls.startRotateCallback = options && options.startRotateCallback ? options.startRotateCallback : null;
    controls.endScaleCallback = options && options.endScaleCallback ? options.endScaleCallback : null;
    controls.endRotateCallback = options && options.endRotateCallback ? options.endRotateCallback : null;

    canvas.addEventListener('pointermove', (e) => {
        if ((controls.isScaling || controls.isRotating) && controls.model) {

            let dx = e.clientX - controls.x;
            let dy = e.clientY - controls.y;

            if (controls.isScaling) {

                let scaleFactor = 1 + (dx + dy) * 0.001;
                let scaleX =controls. scale.x * scaleFactor;
                let scaleY = controls.scale.y * scaleFactor;
                let scaleZ = controls.scale.z * scaleFactor;
                let scaleW = 1;

                controls.model.scale.set(
                    scaleX * scaleW,
                    scaleY * scaleW,
                    scaleZ * scaleW
                );

                if(controls.scaleCallback)
                {
                    controls.scaleCallback(e, controls);
                }

            } else if (controls.isRotating) {

                let rotFactorX = controls.rot.x + dy * 0.01;
                let rotFactorY = controls.rot.y + dx * 0.01;
                let rotationX = rotFactorX;
                let rotationY = rotFactorY;
                let rotationZ = controls.rot.z;
                let rotationW = 1;

                controls.model.rotation.set(
                    rotationX * rotationW,
                    rotationY * rotationW,
                    rotationZ * rotationW
                );

                if(controls.rotateCallback)
                {
                    controls.rotateCallback(e, controls);
                }
            }
        }
    });

    canvas.addEventListener('pointerdown', (e) => {
            
        if((e.button == 2 || e.button == 0) && e.altKey && controls.model)
        {
            controls.enableRotate = false;
            controls.enablePan = false;
        
            controls.x = e.clientX;
            controls.y = e.clientY;
        
            if(e.button == 2)
            {
                controls.scale = controls.model.scale.clone();
                controls.isScaling = true;

                if(controls.startScaleCallback)
                {
                    controls.startScaleCallback(e, controls);
                }
            }
            else if(e.button == 0)
            {
                controls.rot = controls.model.rotation.clone();
                controls.isRotating = true;

                if(controls.startRotateCallback)
                {
                    controls.startRotateCallback(e, controls);
                }
            }
        }
    });

    canvas.addEventListener('pointerup', (e)=>{

        controls.enableRotate = true;
        controls.enablePan = true;
    
        controls.isScaling = false;
        controls.isRotating = false;

        if(e.button == 2)
        {
            if(controls.startScaleCallback)
            {
                controls.endScaleCallback(e, controls);
            }
        }
        else if(e.button == 0)
        {
            if(controls.startRotateCallback)
            {
                controls.endRotateCallback(e, controls);
            }
        }
    });

    return controls;
}

export function ConvertToWireframe(wire, color = 0xffffff)
{
    wire.traverse(function (child) {
        if (child.isMesh) {
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: color,
                wireframe: true
            });
            child.material = wireframeMaterial;
        }
    });

    return wire;
}

export function GetGeometry(type = 'Box')
{
    let geom = null;
    let opts = null;

    switch (type) {
        case 'Box':
            geom = new THREE.BoxGeometry(1, 1, 1);
            opts = {
                width: 1,
                height: 1,
                depth: 1,
                widthSegments: 1,
                heightSegments: 1,
                depthSegments: 1,
            };
            break;

        case 'Capsule':
            geom = new THREE.CapsuleGeometry(1, 1, 8, 16);
            opts = {
                radius: 1,
                length: 1,
                capSegments: 8,
                radialSegments: 16,
            };
            break;

        case 'Circle':
            geom = new THREE.CircleGeometry(1, 32);
            opts = {
                radius: 1,
                segments: 32,
            };
            break;

        case 'Cone':
            geom = new THREE.ConeGeometry(1, 2, 32);
            opts = {
                radius: 1,
                height: 2,
                radialSegments: 32,
                heightSegments: 1,
            };
            break;

        case 'Cylinder':
            geom = new THREE.CylinderGeometry(1, 1, 2, 32);
            opts = {
                radiusTop: 1,
                radiusBottom: 1,
                height: 2,
                radialSegments: 32,
                heightSegments: 1,
            };
            break;

        case 'Dodecahedron':
            geom = new THREE.DodecahedronGeometry(1);
            opts = {
                radius: 1,
                detail: 0,
            };
            break;

        case 'Icosahedron':
            geom = new THREE.IcosahedronGeometry(1);
            opts = {
                radius: 1,
                detail: 0,
            };
            break;

        case 'Octahedron':
            geom = new THREE.OctahedronGeometry(1);
            opts = {
                radius: 1,
                detail: 0,
            };
            break;

        case 'Plane':
            geom = new THREE.PlaneGeometry(1, 1, 1, 1);
            opts = {
                width: 1,
                height: 1,
                widthSegments: 1,
                heightSegments: 1,
            };
            break;

        case 'Ring':
            geom = new THREE.RingGeometry(0.5, 1, 32);
            opts = {
                innerRadius: 0.5,
                outerRadius: 1,
                thetaSegments: 32,
                phiSegments: 1,
                thetaStart: 0,
                thetaLength: Math.PI * 2,
            };
            break;

        case 'Sphere':
            geom = new THREE.SphereGeometry(1, 32, 32);
            opts = {
                radius: 1,
                widthSegments: 32,
                heightSegments: 32,
            };
            break;

        case 'Tetrahedron':
            geom = new THREE.TetrahedronGeometry(1);
            opts = {
                radius: 1,
                detail: 0,
            };
            break;

        case 'Torus':
            geom = new THREE.TorusGeometry(1, 0.4, 16, 100);
            opts = {
                radius: 1,
                tube: 0.4,
                radialSegments: 16,
                tubularSegments: 100,
            };
            break;

        default:
            console.error('Tipo di geometria non supportato:', type);
            return;
    }

    return {
        geometry: geom,
        options: opts
    };
}
