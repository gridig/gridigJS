// Update viewport resolution and create a Gridd layout

let windowW;
let windowH;
let windowA;

let zoomGridd;

let griddW;
let griddH;
let griddA;

let griddNo = 0;

zoomGridd = 50;

function calcGridd() {
	windowW = window.innerWidth;
	windowH = window.innerHeight;
	windowA = windowW * windowH;

	griddW = Math.round(windowW / zoomGridd);
	griddH = Math.round(windowH / zoomGridd);
	griddA = griddW * griddH;
};

function viewRes() {
	window.addEventListener('resize', viewRes);

	calcGridd();
	griddArea();
	griddPopulateCond();
};

viewRes();

// Change CSS grid properties

function griddArea() {
	document.getElementById('gridig').style.gridTemplateColumns = 'repeat(' + griddW + ', 1fr)';
	document.getElementById('gridig').style.gridTemplateRows = 'repeat(' + griddH + ', 1fr)';
};

// Populate CSS grid with divs

function griddPopulateCond() {
	if (griddNo < griddA - 2) {
		griddPopulate();
		} else if (griddNo > griddA - 2) {
		griddDePopulate();
		} else {
		console.log('griddNo = griddA');
	};
};

function griddPopulate() {
	while (griddNo < griddA - 2) {
		let griddDiv = document.createElement('div');
		griddDiv.setAttribute('class', 'gridig-item');
		griddDiv.setAttribute('id', 'g-item-' + (griddNo + 1).toString());
		document.getElementById('gridig').appendChild(griddDiv);
		griddNo++;
	};
};

function griddDePopulate() {
	while (griddNo > griddA - 2) {
		var gridigParent = document.querySelector('#gridig');
		gridigParent.removeChild(gridigParent.lastChild);
		griddNo--;
	};
};