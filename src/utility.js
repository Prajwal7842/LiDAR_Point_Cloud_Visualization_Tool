
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
	let minimum = 100, maximum = -100;
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

