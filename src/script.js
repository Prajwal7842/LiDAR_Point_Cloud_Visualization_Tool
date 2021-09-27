import './style.css'
import * as THREE from 'three'
import * as d3 from 'd3'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import * as utility from './utility.js'

/* 
    - Visualization (Completed)
    - Class Colors can be changed (Completed)
    - Add a boolean value in each gui, to display the current class or not (Completed)
    - Add a open file button and then open file using that button. (Completed)
*/




// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Objects
// const particlesGeometry = new THREE.BufferGeometry();

// Utility Function


function generatePositionArray(X, Y, Z) {
    X = utility.normalize(X);
    Y = utility.normalize(Y);
    Z = utility.normalize(Z);
    let length = X.length;
    let index = 0;
    const posArray = new Float32Array(length * 3);

    for(let i = 0; i < length; i ++) {
        posArray[index ++] = X[i];
        posArray[index ++] = Y[i];
        posArray[index ++] = Z[i];
    }
    return posArray;
}

function generateColorArray(data) {
    let length = data.color.length;
    const colorArray = new Float32Array(length * 3);
    let index = 0;
    for(let i = 0; i < length; i ++) {
        // Convert hex into rgb
        var aRgbHex = data.color[i].match(/.{1,2}/g);
        colorArray[index ++] = parseInt(aRgbHex[0], 16)/255;
        colorArray[index ++] = parseInt(aRgbHex[1], 16)/255;
        colorArray[index ++] = parseInt(aRgbHex[2], 16)/255;
    }
    return colorArray;
}


function generateClassInfo(groundTruth) {
    let length = groundTruth.length;
    let colorMapping = {}
    let classes = []
    for(let i = 0; i < length; i ++) {
        if(!(groundTruth[i] in colorMapping)) {
            colorMapping[groundTruth[i]] = utility.getRandomColor();
            classes.push(groundTruth[i]);
        }
    }
    return {"colorMapping": colorMapping, "classes" : classes};
}


function openSimplePointCloud(filename) {
    d3.csv(filename).then(function(data) {
        let X = []
        let Y = []
        let Z = []
        let length = data.length;
        for(let i = 0; i < length; i ++) {
            X.push(parseFloat(data[i].x));
            Y.push(parseFloat(data[i].y));
            Z.push(parseFloat(data[i].z));
        }
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.01,
            color: 'white'
        });
        let posArray = generatePositionArray(X, Y, Z);
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        console.log(particleMesh);
        scene.add(particleMesh);
    });
}


function openComplexPointCloud(data) {
    console.log("Data", data);
    let groundTruth = [];
    let length = data.length;
    for(let i = 0; i < length; i ++) {
        groundTruth.push(parseInt(data[i].groundtruth));
    }
    console.log(groundTruth);
    let classData = generateClassInfo(groundTruth);
    console.log(classData);
    let pointCloudData = {};
    for(let i = 0; i < length; i ++) {
        if(!(groundTruth[i] in pointCloudData)) {
            pointCloudData[groundTruth[i]] = {
                x: [],
                y: [],
                z: [],
                color: []
            };
        }
        let color = classData.colorMapping[groundTruth[i]];
        pointCloudData[groundTruth[i]].x.push(parseFloat(data[i].x));
        pointCloudData[groundTruth[i]].y.push(parseFloat(data[i].y));
        pointCloudData[groundTruth[i]].z.push(parseFloat(data[i].z));
        pointCloudData[groundTruth[i]].color.push(color);
    }
    let classMesh = {};
    for(const [key, value] of Object.entries(pointCloudData)) {
        const posArray = generatePositionArray(value.x, value.y, value.z);
        // const color = generateColorArray(value);
        const color = classData.colorMapping[key];
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.01,
            color: classData.colorMapping[key]
        });
        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        // particlesGeometry.setAttribute('color', new THREE.BufferAttribute(color, 3));
        const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        classMesh[key] = {
            "mesh" : particleMesh
        };

        // GUI 
        let className = "Class_" + key;    
        const folder = gui.addFolder(className);
        var initialColor = { Color : classData.colorMapping[key] };
        var initialShow = { Show : true};
        const finalColor = {"New Color" : "" + classData.colorMapping[key]};
        // Widget to show a class mesh or not. Boolean in nature.
        folder.add(initialShow, 'Show').onChange(function(value) {
            if(value == false)
                scene.remove(classMesh[key].mesh);
            else
                scene.add(classMesh[key].mesh);
        });
        // Widget to change color of class. Colorbar is shown.
        folder.addColor(initialColor, 'Color').onChange( function(colorValue) {
            classData.colorMapping[key] = colorValue;
            classMesh[key].mesh.material.color.set(colorValue);
        });
        folder.add(finalColor, "New Color").onFinishChange(function(colorCode) {
            if(utility.verifyColorCode(colorCode)) {
                // Change the value of initialColor.
                folder.__controllers[1].setValue(colorCode);
            }
            else {
                // Do not change the value of finalColor if color entered is wrong.
                folder.__controllers[2].setValue(classData.colorMapping[key]);
            }
        });
        // console.log(folder.__controllers[1].setValue('#000000'));
    }
    for(const [key, value] of Object.entries(classMesh)) {
        scene.add(value.mesh);
    }
}


// GUI Code Begin
// GUI Button Utility function
const openFileButton = document.getElementById("openFileButton");
const fileInput = document.getElementById('file-input');
openFileButton.addEventListener('click', (event) => {
    fileInput.click();
});
let parsedData = [];
fileInput.addEventListener('change', (event) => {
    let fileList = event.target.files;
    let len = fileList.length;
    for(let i = 0; i < len; i ++) {
        console.log(fileList[i]);
        var reader = new FileReader();
        reader.readAsText(fileList[i],'UTF-8');
        reader.onload = readerEvent => {
            var content = readerEvent.target.result;
            let data = d3.csvParse(content);
            openComplexPointCloud(data);
            console.log(fileList[i].name);
            let obj = {};
            obj[fileList[i].name] = data;
            parsedData.push(obj);
        }
    }
});

// GUI Code End
// openSimplePointCloud("./data.csv")
// openComplexPointCloud("./data.csv")





// Mesh


// Lights

const pointLight = new THREE.PointLight(0xffffff, 0.1)
pointLight.position.x = 2
pointLight.position.y = 3
pointLight.position.z = 4
scene.add(pointLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 5
camera.position.y = 0
camera.position.z = 2
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */

const clock = new THREE.Clock()

const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()

    // Update objects

    // Update Orbital Controls
    // controls.update()

    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


