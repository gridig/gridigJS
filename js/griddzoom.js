// Zoom gridig elements - work in progress

let griddZoomIn = document.createElement('div');
griddZoomIn.setAttribute('class', 'zoomdd-button gridig-item');
griddZoomIn.setAttribute('id', 'zoomdd-in');
griddZoomIn.innerHTML = '+';
document.getElementById('gridig').appendChild(griddZoomIn);

let griddZoomOut = document.createElement('div');
griddZoomOut.setAttribute('class', 'zoomdd-button gridig-item');
griddZoomOut.setAttribute('id', 'zoomdd-out');
griddZoomOut.innerHTML = '-';
document.getElementById('gridig').appendChild(griddZoomOut);

// Zoom gridig function - work in progress

function griddZoomCheck() {
	let zoomddIn = document.getElementById('zoomdd-in');
	let zoomddOut = document.getElementById('zoomdd-out');
	if (zoomGridd > 175) {
		zoomddIn.innerHTML = 'max';
	} else if (zoomGridd < 75) {
		zoomddOut.innerHTML = 'min';
	} else {
		zoomddIn.innerHTML = '+';
		zoomddOut.innerHTML = '-';
	};
};

function griddZoom() {
	document.getElementById('zoomdd-in').addEventListener('click', function griddAreaIn() {
		if (zoomGridd > 175) {
			return;
		}
		zoomGridd = zoomGridd + 50;
		griddZoomCheck();
		calcGridd();
		griddArea();
		griddPopulateCond();
	});

	document.getElementById('zoomdd-out').addEventListener('click', function griddAreaOut() {
		if (zoomGridd < 75) {
			return;
		}
		zoomGridd = zoomGridd - 50;
		griddZoomCheck();
		calcGridd();
		griddArea();
		griddPopulateCond();
	});
};

griddZoom();