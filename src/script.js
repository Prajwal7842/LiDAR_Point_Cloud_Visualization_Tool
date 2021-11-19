import './style.css'
import * as THREE from 'three'
import * as d3 from 'd3'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'dat.gui'
import * as utility from './utility.js'

// Debug
const gui = new dat.GUI();
dat.GUI.prototype.removeFolder = function(name) {
    var folder = this.__folders[name];
    if (!folder) {
        return;
    }
    folder.close();
    this.__ul.removeChild(folder.domElement.parentNode);
    delete this.__folders[name];
    this.onResize();
}
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

var metaData = require('./metadata.json');
var mesh = {};
var classData = {}; // {label -> [label_mesh]}
var currentLabels = []; // {label}
var currLabelNumber = 0;
var classDistribution = {};
// Objects


// Utility Function
function generatePositionArray(X, Y, Z) {
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

function generateClassInfo() {
    let colorMapping = {}
    let classes = []
    for(let [key, value] of Object.entries(metaData["classCode"])) {
        let color = metaData.classNames[value];
        colorMapping[key] = color;
        classes.push(value);
    }
    return {"colorMapping": colorMapping, "classes" : classes};
}

function displayMesh(label) {
    document.getElementById("currentLabelName").innerHTML = `Current Label : ${label}`;
    for(const [key, value] of Object.entries(mesh[label])) {
        scene.add(value.mesh);
    }
    displayGUI(mesh[label]);
}

function displayGUI (classMesh) {
    let classNames = metaData.classNames;
    for(let [key, _] of Object.entries(classNames)) {
        gui.removeFolder(key);
    }
    for(let [key, value] of Object.entries(classNames)) {
        let className = key;
        let classColor = value;
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

function getClassDistribution() {
    var labelClassDistribution = [];
    let labelName = currentLabels[currLabelNumber];
    let total = 0.0;
    for(let [_, value] of Object.entries(classDistribution[labelName])) {
        total += value;
    }
    for(let [key, value] of Object.entries(classDistribution[labelName])) {
        labelClassDistribution.push({
            "class" : key,
            "value" : (value / total) * 100.0
        });
    }
    return labelClassDistribution;
}

function addNewLabel(data, label, isNormalize = false) {
    // Function to add a new Label to the existing point cloud. This is also used to draw initial layout.
    currentLabels.push(label);
    let labelData = [], X = [], Y = [], Z = [];
    let length = data.length;
    for(let i = 0; i < length; i ++) {
        labelData.push(parseInt(data[i][label]));
        X.push(parseFloat(data[i].x));
        Y.push(parseFloat(data[i].y));
        Z.push(parseFloat(data[i].z));
    }
    if(isNormalize == false) {
        X = utility.normalize(X);
        Y = utility.normalize(Y);
        Z = utility.normalize(Z);
    }
    for(let i = 0; i < length; i ++) {
        let x = "" + X[i];
        let y = "" + Y[i];
        let z = "" + Z[i];
        if(!(x in propertise)) {
            propertise[x] = {};
        }
        if(!(y in propertise[x])) {
            propertise[x][y] = {};
        }
        if(!(z in propertise[x][y])) {
            propertise[x][y][z] = {};
        }
        if(parseInt(data[i][label]) == NaN) continue;
        propertise[x][y][z][label] = parseInt(data[i][label]);
    }
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
        let color = classData.colorMapping[labelData[i]];
        if(X[i] != NaN && Y[i] != NaN && Z[i].z != NaN) {
            pointCloudData[labelData[i]].x.push(X[i]);
            pointCloudData[labelData[i]].y.push(Y[i]);
            pointCloudData[labelData[i]].z.push(Z[i]);
            pointCloudData[labelData[i]].color.push(color);
        }
    }
    // FulFill Class Distribution Variable of current label.
    var labelClassDistribution = {}; // To store the class distribution of current label.
    for(const [key, value] of Object.entries(pointCloudData)) {
        labelClassDistribution[key] = value.x.length;
    }
    classDistribution[label] = labelClassDistribution; // Store the current label class distribution in global variable.
    
    let classMesh = {};
    for(const [key, value] of Object.entries(pointCloudData)) {
        let className = metaData["classCode"][key];
        const posArray = generatePositionArray(value.x, value.y, value.z);
        
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.01,
            color: classData.colorMapping[key]
        });
        const particlesGeometry = new THREE.BufferGeometry();
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particleMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        classMesh[className] = {
            "mesh" : particleMesh
        };
    }
    mesh[label] = classMesh;
}

function openComplexPointCloud(data) {
    // Function to draw initial point cloud when a file is loaded.
    let labels = metaData.labels;
    let length = data.length;
    let X = [],  Y = [], Z = [];
    for(let i = 0; i < length; i += 1) {
        X.push(parseFloat(data[i].x));
        Y.push(parseFloat(data[i].y));
        Z.push(parseFloat(data[i].z));
    }
    X = utility.normalize(X);
    Y = utility.normalize(Y);
    Z = utility.normalize(Z);
    for(let i = 0; i < length; i += 1) {
        data[i].x = X[i];
        data[i].y = Y[i];
        data[i].z = Z[i];
    }
    labels.forEach(function(label) {
        if(!(label in data[0])) {
            return ;
        }
        addNewLabel(data, label, true);
    })
}

// Event Listener for Next Label Button
const nextLabelButton = document.getElementById("nextLabelButton");
nextLabelButton.addEventListener('click', () => {
    for(const [_, value] of Object.entries(mesh[currentLabels[currLabelNumber]])) {
        scene.remove(value.mesh);
    }
    currLabelNumber += 1;
    currLabelNumber %= (currentLabels.length);
    document.getElementById("currentLabelName").innerHTML = `Current Label : ${currentLabels[currLabelNumber]}`;
    for(const [_, value] of Object.entries(mesh[currentLabels[currLabelNumber]])) {
        scene.add(value.mesh);
    }
    displayGUI(mesh[currentLabels[currLabelNumber]]);
});

// Get class Data
classData = generateClassInfo();

// GUI Code Begin
// GUI Button Utility function
let parsedData = [];
let currData = undefined;
let propertise = {};

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
        var reader = new FileReader();
        reader.readAsText(fileList[i],'UTF-8');
        reader.onload = readerEvent => {
            let content = readerEvent.target.result;
            let data = d3.csvParse(content);
            currData = data;
            openComplexPointCloud(data);
            displayMesh(currentLabels[0]);
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
        if(currData.length != data.length) {
            alert("Label Data has missing values !");
        }
        else {
            let labels = Object.keys(data[0]);
            labels.forEach(function(newLabel) {
                if(newLabel != "x" && newLabel != "y" && newLabel != "z")
                    addNewLabel(data, newLabel);
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
    if(currData == undefined) {
        alert("Error : No Input Data File Found!");
        return ;
    }
    render(barCharData);
});
// Function : Display Bar chart : Code End

// Function : Confusion Matrix : Code Begin
const showConfusionMatrix = document.getElementById("showConfusionMatrix");
showConfusionMatrix.addEventListener('click', () => {
    function render(confusionMatrix, classes) {
		Matrix({
			container : '#container',
			data      : confusionMatrix,
			labels    : classes,
            start_color : '#ffffff',
            end_color : '#e67e22'
		});

		// rendering the table
        function Matrix(options) {
            // Main
            var margin = {top: 50, right: 100, bottom: 100, left: 100};
            var width = 700,
            height = 700,
            data = options.data,
            container = options.container,
            labelsData = options.labels,
            startColor = options.start_color,
            endColor = options.end_color;

            var widthLegend = 100;

            if(!data){
                throw new Error('Please pass data');
            }

            if(!Array.isArray(data) || !data.length || !Array.isArray(data[0])){
                throw new Error('It should be a 2-D array');
            }

            var maxValue = d3.max(data, function(layer) { return d3.max(layer, function(d) { return d; }); });
            var minValue = d3.min(data, function(layer) { return d3.min(layer, function(d) { return d; }); });

            var numrows = data.length;
            var numcols = data[0].length;
            d3.select(container).selectAll("*").remove();
            d3.select("#legend").selectAll("*").remove();
            var svg = d3.select(container).append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

            var background = svg.append("rect")
                .style("stroke", "black")
                .style("stroke-width", "2px")
                .attr("width", width)
                .attr("height", height);

            var x = d3.scaleBand()
                .domain(d3.range(numcols))
                .range([0, width]);

            var y = d3.scaleBand()
                .domain(d3.range(numrows))
                .range([0, height]);

            var colorMap = d3.scaleLinear()
                .domain([minValue,maxValue])
                .range([startColor, endColor]);

            var row = svg.selectAll(".row")
                .data(data)
                .enter().append("g")
                .attr("class", "row")
                .attr("transform", function(d, i) { return "translate(0," + y(i) + ")"; });

            var cell = row.selectAll(".cell")
                .data(function(d) { return d; })
                    .enter().append("g")
                .attr("class", "cell")
                .attr("transform", function(d, i) { return "translate(" + x(i) + ", 0)"; });

            cell.append('rect')
                .attr("width", x.bandwidth())
                .attr("height", y.bandwidth())
                .style("stroke-width", 0);

            cell.append("text")
                .attr("dy", ".32em")
                .attr("x", x.bandwidth() / 2)
                .attr("y", y.bandwidth() / 2)
                .attr("text-anchor", "middle")
                .style("fill", function(d, i) { return d >= maxValue/2 ? 'white' : 'black'; })
                .text(function(d, i) { return d; });

            row.selectAll(".cell")
                .data(function(d, i) { return data[i]; })
                .style("fill", colorMap);

            var labels = svg.append('g')
                .attr('class', "labels");

            var columnLabels = labels.selectAll(".column-label")
                .data(labelsData)
                .enter().append("g")
                .attr("class", "column-label")
                .attr("transform", function(d, i) { return "translate(" + x(i) + "," + height * 1.02 + ")"; });

            columnLabels.append("line")
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .attr("x1", x.bandwidth() / 2)
                .attr("x2", x.bandwidth() / 2)
                .attr("y1", 0)
                .attr("y2", 5);

            columnLabels.append("text")
                .attr("x", 30)
                .attr("y", y.bandwidth() / 2)
                .attr("dy", ".22em")
                .attr("text-anchor", "end")
                .attr("transform", "rotate(-60)")
                .text(function(d, i) { return d; });

            var rowLabels = labels.selectAll(".row-label")
                .data(labelsData)
            .enter().append("g")
                .attr("class", "row-label")
                .attr("transform", function(d, i) { return "translate(" + 0 + "," + y(i) + ")"; });

            rowLabels.append("line")
                .style("stroke", "black")
                .style("stroke-width", "1px")
                .attr("x1", 0)
                .attr("x2", -5)
                .attr("y1", y.bandwidth() / 2)
                .attr("y2", y.bandwidth() / 2);

            rowLabels.append("text")
                .attr("x", -8)
                .attr("y", y.bandwidth() / 2)
                .attr("dy", ".32em")
                .attr("text-anchor", "end")
                .text(function(d, i) { return d; });

            var key = d3.select("#legend")
            .append("svg")
            .attr("width", widthLegend)
            .attr("height", height + margin.top + margin.bottom);

            var legend = key
            .append("defs")
            .append("svg:linearGradient")
            .attr("id", "gradient")
            .attr("x1", "100%")
            .attr("y1", "0%")
            .attr("x2", "100%")
            .attr("y2", "100%")
            .attr("spreadMethod", "pad");

            legend
            .append("stop")
            .attr("offset", "0%")
            .attr("stop-color", endColor)
            .attr("stop-opacity", 1);

            legend
            .append("stop")
            .attr("offset", "100%")
            .attr("stop-color", startColor)
            .attr("stop-opacity", 1);

            key.append("rect")
            .attr("width", widthLegend/2-10)
            .attr("height", height)
            .style("fill", "url(#gradient)")
            .attr("transform", "translate(0," + margin.top + ")");

            var y = d3.scaleLinear()
            .range([height, 0])
            .domain([minValue, maxValue]);

            var yAxis = d3.axisRight(y)

            key.append("g")
            .attr("class", "y axis")
            .attr("transform", "translate(41," + margin.top + ")")
            .call(yAxis)

        }

    }
    if(currData == undefined) {
        alert("Error : No Input Data File Found!");
        return ;
    }
    var classes = [];
    var classIndex = {};
    let index = 0;
    for(let [key, _] of Object.entries(metaData.classNames)) {
        classes.push(key);
        classIndex[key] = index;
        index ++;
    }
    var confusionMatrix = new Array(classes.length).fill(0).map(() => new Array(classes.length).fill(0));
    var actualData = prompt("Enter Actual Data Label Name : ");
    if(!currentLabels.includes(actualData)) {
        alert("Actual Data Label is not present");
        return ;
    }
    var predictedData = prompt("Enter Prediction Data Label Name : ");
    if(!currentLabels.includes(predictedData)) {
        alert("Predicted Data Label is not present");
        return ;
    }
    for(let [_, valueX] of Object.entries(propertise)) {
        for(let [_, valueY] of Object.entries(valueX)) {
            for(let [_, valueZ] of Object.entries(valueY)) {
                if(actualData in valueZ && predictedData in valueZ) {
                    let rowNumber = parseInt(classIndex[metaData.classCode[valueZ[actualData]]]);
                    let colNumber = parseInt(classIndex[metaData.classCode[valueZ[predictedData]]]);
                    confusionMatrix[rowNumber][colNumber] += 1;
                }
            }
        }
    }
    render(confusionMatrix, classes)
});
// Function : Confusion Matrix : Code End

// GUI Code End

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
renderer.setClearColor( 0xffffff, metaData.lightMode);
/**
 * Animate
 */

const clock = new THREE.Clock()

const tick = () =>
{

    const elapsedTime = clock.getElapsedTime()

    // Update objects


    // Render
    renderer.render(scene, camera);

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()