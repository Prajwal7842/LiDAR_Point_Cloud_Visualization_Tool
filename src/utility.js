
export function getRandomColor() {
  // Function to generate random colors.
	var letters = '0123456789ABCDEF';
	var color = '#';
	for (var i = 0; i < 6; i++) {
		color += letters[Math.floor(Math.random() * 16)];
	}
	return color;
}


export function normalize(arr) {
  // Function to normalize the array in range [-0.5, 0.5]
	let length = arr.length;
	let minimum = 10000000, maximum = -10000000;
	arr.forEach(function(val) {
		minimum = Math.min(minimum, val);
		maximum = Math.max(maximum, val);
	});
	for(let i = 0; i < length; i ++) {
		arr[i] = (arr[i] - minimum) / (maximum - minimum);
		arr[i] = arr[i] - 0.5;
	}
	return arr;
}


export function verifyColorCode(colorCode) {
	// Check if the color input by user, represents a valid hex color code or not.
	var RegExp = /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i;
	return RegExp.test(colorCode);
}

export function generateClassInfo(groundTruth) {
    let length = groundTruth.length;
    let colorMapping = {}
    let classes = []
    for(let i = 0; i < length; i ++) {
        classes.push(groundTruth[i]);
    }
    return {"colorMapping": colorMapping, "classes" : classes};
}

export function openSimplePointCloud(filename) {
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
        scene.add(particleMesh);
    });
}

export function generateColorArray(data) {
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