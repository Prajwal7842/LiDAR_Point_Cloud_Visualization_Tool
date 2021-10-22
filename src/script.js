import './style.css'
import * as THREE from 'three'
import * as d3 from 'd3'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import * as utility from './utility.js'

// Debug
const gui = new dat.GUI()

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

var metaData = require('./metadata.json');
// console.log(metaData);
var mesh = {};
var classData = {}; // {label -> [label_mesh]}
var currentLabels = []; // {label}
var currLabelNumber = 0;
var classDistribution = {};
// Objects
// const particlesGeometry = new THREE.BufferGeometry();

// Preprocessing Function calls


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

  
function generateClassInfo() {
    // console.log("IN generate class Info()");
    let colorMapping = {}
    let classes = []
    for(let [key, value] of Object.entries(metaData["classCode"])) {
        let color = metaData.classNames[value];
        colorMapping[key] = color;
        classes.push(value);
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

function displayMesh(label) {
    for(const [key, value] of Object.entries(mesh[label])) {
        scene.add(value.mesh);
    }
    displayGUI(mesh[label]);
}

function displayGUI (classMesh) {
    let classNames = metaData.classNames;
    // console.log(classNames);
    let length = classNames.length;
    for(let [key, value] of Object.entries(classNames)) {
        let className = key;
        let classColor = value;
        console.log(className, classColor);
        const folder = gui.addFolder(className);
        var initialColor = { Color : classColor};
        var initialShow = { Show : true};
        const finalColor = {"New Color" : "" + classColor};
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
    }
}

function storeClassDistribution(data, className) {
    console.log(data);
    let length = data.length;
    let classDistribution = {}
    for(let i = 0; i < length; i ++) {
        let key = data[i][className];
        if(key in classDistribution) classDistribution[key] += 1;
        else classDistribution[key] = 1;
    }
    return classDistribution;
}

function getClassDistribution() {
    var labelClassDistribution = [];
    let labelName = currentLabels[currLabelNumber];
    let total = 0.0;
    for(let [key, value] of Object.entries(classDistribution[labelName])) {
        total += value;
    }
    for(let [key, value] of Object.entries(classDistribution[labelName])) {
        console.log(value);
        labelClassDistribution.push({
            "class" : key,
            "value" : (value / total) * 100.0
        });
    }
    console.log(labelName, labelClassDistribution);
    return labelClassDistribution;
}

function addNewLabel(data, label) {
    currentLabels.push(label);
    console.log(label);
    let labelData = [];
    let length = data.length;
    for(let i = 0; i < length; i ++) {
        labelData.push(parseInt(data[i][label]));
    }
    console.log(labelData);
    let pointCloudData = {};
    for(let i = 0; i < length; i ++) {
        if(!(labelData[i] in pointCloudData)) {
            pointCloudData[labelData[i]] = {
                x: [],
                y: [],
                z: [],
                color: []
            };
        }
        // let classData = generateClassInfo();
        let color = classData.colorMapping[labelData[i]];
        if(data[i].x != NaN && data[i].y != NaN && data[i].z != NaN) {
            pointCloudData[labelData[i]].x.push(parseFloat(data[i].x));
            pointCloudData[labelData[i]].y.push(parseFloat(data[i].y));
            pointCloudData[labelData[i]].z.push(parseFloat(data[i].z));
            pointCloudData[labelData[i]].color.push(color);
        }
    }
    console.log(label,pointCloudData);
    // FulFill Class Distribution Variable of current label.
    var labelClassDistribution = {}; // To store the class distribution of current label.
    for(const [key, value] of Object.entries(pointCloudData)) {
        labelClassDistribution[key] = value.x.length;
    }
    // console.log(labelClassDistribution);
    classDistribution[label] = labelClassDistribution; // Store the current label class distribution in global variable.
    
    let classMesh = {};
    for(const [key, value] of Object.entries(pointCloudData)) {
        // console.log(key, value);
        let className = metaData["classCode"][key];
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
        classMesh[className] = {
            "mesh" : particleMesh
        };
    }
    // console.log(classMesh);
    mesh[label] = classMesh;
    // for(const [key, value] of Object.entries(classMesh)) {
    //     scene.add(value.mesh);
    // }
}

function openComplexPointCloud(data) {
    console.log("Data", data);
    let labels = metaData.labels;
    labels.forEach(function(label) {
        if(!(label in data[0])) {
            return ;
        }
        addNewLabel(data, label);
    })
    
    
    // console.log(groundTruth);
}

// Event Listener for Next Label Button
const nextLabelButton = document.getElementById("nextLabelButton");
nextLabelButton.addEventListener('click', (event) => {
    for(const [key, value] of Object.entries(mesh[currentLabels[currLabelNumber]])) {
        scene.remove(value.mesh);
    }
    currLabelNumber += 1;
    currLabelNumber %= (currentLabels.length);
    for(const [key, value] of Object.entries(mesh[currentLabels[currLabelNumber]])) {
        scene.add(value.mesh);
    }
});

// Get class Data
classData = generateClassInfo();

// GUI Code Begin
// GUI Button Utility function
let parsedData = [];
let currValueCount = [];
let currData = undefined, currClassDistribution;

// Function : Open File Button : Code Begin
const openFileButton = document.getElementById("openFileButton");
const fileInput = document.getElementById('file-input');
openFileButton.addEventListener('click', (event) => {
    fileInput.click();
});
fileInput.addEventListener('change', (event) => {
    let fileList = event.target.files;
    let len = fileList.length;
    for(let i = 0; i < len; i ++) {
        // console.log(fileList[i]);
        var reader = new FileReader();
        reader.readAsText(fileList[i],'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;
            let data = d3.csvParse(content);
            currData = data;
            openComplexPointCloud(data);
            displayMesh(currentLabels[0]);
            // console.log(fileList[i].name);
            let obj = {};
            obj[fileList[i].name] = data;
            
            parsedData.push(obj);
        }
    }
});
// Function : Open File Button : Code Ends

// Function : Add New Label : Code Begin
const newLabelButton = document.getElementById("addNewLabel");
const labelFileInput = document.getElementById("label-file-input");
newLabelButton.addEventListener('click', (event) => {
    if(currData == undefined) {
        alert("Error : No Input Data File Found!");
    }
    else {
        labelFileInput.click();
    }
});

labelFileInput.addEventListener('change', (event) => {
    let file = event.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');
    reader.onload = readerEvent => {
        let content = readerEvent.target.result;
        let data = d3.csvParse(content);
        // console.log(file.name);
        console.log("Label File Data : ", data);
        if(currData.length != data.length) {
            alert("Label Data has missing values !");
        }
        else {
            let length = data.length;

            console.log("CurrData", currData);
            for(let i = 0; i < length; i ++) {
                
                for(let [key, value] of Object.entries(data[i])) {
                    currData[i][key] = value;
                }
            }
            let labels = Object.keys(data[0]);
            labels.forEach(function(newLabel) {
                addNewLabel(currData, newLabel);
            });
        }
    }
})
// Function : Add New Label : Code End


// Function : Display Bar Chart : Code Begin 
const showBarChartButton = document.getElementById("showBarChartButton");
showBarChartButton.addEventListener('click', (event) => {
    let barCharData = getClassDistribution();
    document.getElementById("barChart").style.display = "block";
    function render(data) {
        var svg = d3.select("svg");
        svg.selectAll("*").remove();
        let margin = {top : 20, bottom : 20, left : 80, right : 20};
        var width = svg.attr("width") - margin.left - margin.right;
        var height = svg.attr("height") - margin.top - margin.bottom;
        let yAxisLabel = d => metaData.classCode[d.class];
        let xScale = d3.scaleLinear()
                        .domain([0, 100])
                        .range([0, width]);
        
        let yScale = d3.scaleBand()
                        .domain(data.map(yAxisLabel))
                        .range([0, height]).padding(0.1);
        let yAxis = d3.axisLeft(yScale);
        var g = svg.append("g")
                    .attr("transform", `translate(${margin.left}, ${margin.top})`);
        g.append("g").call(d3.axisLeft(yScale));
        g.append("g").call(d3.axisBottom(xScale))
                .attr("transform", `translate(0, ${height})`);
        g.selectAll('rect')
            .data(data)
            .enter()
            .append('rect')
                .attr('y', d => yScale(yAxisLabel(d)))
                .attr('width', d => xScale(d.value))
                .attr('height', yScale.bandwidth())
                .attr('fill', d => metaData.classNames[metaData.classCode[d.class]]);
        
    }
    render(barCharData);
});
// Function : Display Bar chart : Code End


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


