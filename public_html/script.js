// Függvények definiálása

	function makeSVG(tag, attrs) {
		var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
		for (var k in attrs)
			el.setAttribute(k, attrs[k]);
		return el;
	}

	// Egy 0 és 1 közötti értékhez színt rendel.
	function getColor(value) {
		if (isNaN(value)) {
			return naColor;
		} else {
			var v = Math.max(Math.min(value, 1), 0);
			var c = Array(3);
			for (var i = 0; i < 3; i++) {
				c[i] = (v < 0.5) ? parseInt((1 - (v * 2)) * color[0][i] + (v * 2) * color[1][i]) : parseInt((1 - ((v - 0.5) * 2)) * color[1][i] + ((v - 0.5) * 2) * color[2][i]);
			}
			return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
		}
	}

	function getValueIn01(v, min, max) {
		return (v - min) / (max - min);
	}

	function style(feature) {
		var col = getColor(getValueIn01(getData(feature.properties.shapeid, dataToShow), minMax[dataToShow].min, minMax[dataToShow].max));
		var st;
		if (borderRequired) {
			st = {
				weight: borderSize,
				opacity: 0.5,
				color: 'black',
				dashArray: '3',
				fillOpacity: opacity,
				fillColor: col
			};
		} else {
			st = {
				weight: 1,
				opacity: opacity,
				color: col,
				fillOpacity: opacity,
				fillColor: col
			};
		}
		return st;
	}

	function loadFile(file) {
		currentFileName = file.name.substring(0, file.name.lastIndexOf("."));

		var reader = new FileReader();
		reader.onloadend = function(evt) {
			if (evt.target.readyState === FileReader.DONE) {
				var data = CSVToArray(readUTF8String(evt.target.result));
				newData(data);
			}
		};
		reader.readAsBinaryString(file);
	}

	function loadPaste(txt) {
		var isGood = true;
		var z = txt.split('\t');
		var lineLength;
		for (var i = 0; i < z.length; i++) {
			if (z[i].indexOf(' ') > -1) {
				lineLength = i + 1;
				break;
			}
		}

		if (lineLength === undefined || lineLength === z.length || ((z.length - 1) % (lineLength - 1)) !== 0) {
			isGood = false;
		}

		if (isGood) {

			var d = [];
			var line = [];

			for (var i = 0; i < z.length; i++) {
				if ((i % (lineLength - 1)) === 0 && i > 0) {
					var pieces = z[i].split(' ');
					line.push(pieces[0]);
					d.push(line);
					line = [];
					line.push(pieces[1]);
				} else {
					line.push(z[i]);
				}
			}
		}


		if (isGood) {
			currentFileName = "data";
			newData(d);
		} else {
			document.getElementById('pasteField').value = '';
			document.getElementById('pasteField').placeholder = 'Hibás adat';
		}
	}

	function newData(d) {
		data = d;
		// Adatok fejléce a csvből.
		header = data[0];
		header.shift();
		header.shift();

		data.splice(0, 1);
		var firstId = data[0][0];
		let mapLevelContainer = mapData.map;
		var mapLevelSelector = "level0"; // ország
		if (firstId.length === 2) {
			mapLevelSelector = "level1"; // megye
		} else if (firstId.length === 3) {
			mapLevelSelector = "level2"; // kistérség
		} else if (firstId.length === 5) {
			mapLevelSelector = "t0"; // település
			mapLevelContainer = topodata;
		}
		minMax = getMinMax();
		dataToShow = 0;
		choser.update();
		legend.update();
		createMapLayer(mapLevelContainer, mapLevelSelector);
		labelG.style.visibility = "hidden";
		valueG.style.visibility = "hidden";
		info.update();
	}

	function saveAsPng() {
		var svg = document.getElementsByTagName('svg')[0];
		var box = svg.getBBox();
		var opacitySaved = opacity;
		opacity = 1;
		geojson.setStyle(style);
		var rz = document.getElementById("legendSVG");
		var rz2 = rz.cloneNode(true);
		svg.appendChild(rz2);
		var legendGHeight = rz2.getBBox().height;
		var dx = box.x + box.width + 10;
		var dy = box.y + box.height - legendGHeight;
		rz2.setAttribute('transform', 'translate(' + dx + ' ' + dy + ')');
		saveSvgAsPng(svg, currentFileName + "_" + header[dataToShow] + ".png", 1);
		svg.removeChild(rz2);
		opacity = opacitySaved;
		geojson.setStyle(style);
	}

	// Térképre mutatáskor ez fut le.
	function highlightFeature(e) {
		var layer = e.target;
		layer.setStyle({
			weight: 3,
			color: '#666',
			dashArray: '',
			fillOpacity: opacity
		});
		if (!L.Browser.ie && !L.Browser.opera) {
			layer.bringToFront();
			labelG.parentNode.appendChild(labelG);
			valueG.parentNode.appendChild(valueG);
		}
		info.update(layer.feature.properties);
	}

	function getMinMax() {
		var minMax = [];
		for (var d = 0; d < data[0].length - 2; d++) {
			minMax.push({min: parseFloat(data[0][d + 2]), max: parseFloat(data[0][d + 2]), avg: 0, num: 0});
		}

		for (var i = 0; i < data.length; i++) {
			for (var d = 0; d < data[0].length - 2; d++) {
				if (minMax[d].min > parseFloat(data[i][d + 2])) {
					minMax[d].min = parseFloat(data[i][d + 2]);
				}
				if (minMax[d].max < parseFloat(data[i][d + 2])) {
					minMax[d].max = parseFloat(data[i][d + 2]);
				}
				if (!isNaN(parseFloat(data[i][d + 2]))) {
					minMax[d].avg = minMax[d].avg + parseFloat(data[i][d + 2]);
					minMax[d].num++;
				}
			}
		}
		for (var d = 0; d < data[0].length - 2; d++) {
			minMax[d].avg = minMax[d].avg / minMax[d].num;
		}
		return minMax;
	}

	function getData(id, dataIndex) {
		for (var i = 0; i < data.length; i++) {
			if (id === data[i][0]) {
				return parseFloat(data[i][dataIndex + 2]);
			}
		}
	}

	function getName(id) {
		for (var i = 0; i < data.length; i++) {
			if (id === data[i][0]) {
				return (data[i][1]);
			}
		}
	}

	function resetHighlight(e) {
		var layer = e.target;
		geojson.resetStyle(layer);
		if (!L.Browser.ie && !L.Browser.opera) {
			layer.bringToBack();
		}
		info.update();
	}

	function zoomToFeature(e) {
		map.fitBounds(e.target.getBounds());
	}

	function onEachFeature(feature, layer) {
		var latlngs = [];

		if (feature.geometry.type === "MultiPolygon") {
			for (var i = 0; i < feature.geometry.coordinates.length; i++) {
				var coords = feature.geometry.coordinates[i][0];
				for (var j = 0; j < coords.length; j++) {
					latlngs.push(L.GeoJSON.coordsToLatLng(coords[j]));
				}
			}

		} else {
			var coords = feature.geometry.coordinates[0];
			for (var j = 0; j < coords.length; j++) {
				latlngs.push(L.GeoJSON.coordsToLatLng(coords[j]));
			}
		}
		var box = L.latLngBounds(latlngs);
		feature.center = {lat: (box._northEast.lat + box._southWest.lat) / 2, lng: (box._northEast.lng + box._southWest.lng) / 2};
		if (feature.properties.shapeid === "HU102") {
			feature.center.lat = feature.center.lat * 0.996;
		}
		feature.name = getName(feature.properties.shapeid) || feature.properties.shapeid;
		feature.value = getData(feature.properties.shapeid, dataToShow);

		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
			click: zoomToFeature
		});
	}

	function refreshLabels() {
		if (baseMap) {
			var svg = document.getElementsByTagName('svg')[0];
			var visible = false;
			var Vvisible = false;
			if (labelG) {
				visible = (labelG.style.visibility !== "hidden");
				svg.removeChild(labelG);
			}
			if (valueG) {
				Vvisible = (valueG.style.visibility !== "hidden");
				svg.removeChild(valueG);
			}
			
			
			labelG = makeSVG('g', {class: "leaflet-zoom-hide"});
			valueG = makeSVG('g', {class: "leaflet-zoom-hide"});

			for (var i = 0; i < baseMap.length; i++) {
				var feature = baseMap[i];
				var pos = map.latLngToLayerPoint(feature.center);
				var text = makeSVG('text', {x: pos.x, y: pos.y, style: 'font-size: 18; font-weight: bold'});
				text.innerHTML = feature.name;
				labelG.appendChild(text);
				var text = makeSVG('text', {x: pos.x, y: pos.y, style: 'font-size: 18; font-weight: bold'});
				
				text.innerHTML = getData(feature.properties.shapeid, dataToShow);
				valueG.appendChild(text);
			}
			setLabelsVisibility(visible);
			setValuesVisibility(Vvisible);
			svg.appendChild(labelG);
			svg.appendChild(valueG);
		}
	}

	function setLabelsVisibility(isVisible) {
		labelG.style.visibility = (isVisible) ? "visible" : "hidden";
	}
	
	function setValuesVisibility(isVisible) {
		valueG.style.visibility = (isVisible) ? "visible" : "hidden";
	}
	
	function setBordersVisibility(isVisible) {
		borderRequired = isVisible;
		geojson.setStyle(style);
	}

	function setOpacity(op) {
		opacity = op / 100;
		geojson.setStyle(style);
	}

	function choserchanged() {
		var radios = document.getElementsByName('adat');
		for (var i = 0; i < radios.length; i++) {
			if (radios[i].type === 'radio' && radios[i].checked) {
				dataToShow = parseInt(radios[i].id.substr(4));
				break;
			}
		}
		geojson.setStyle(style);
		legend.update();
		refreshLabels();
	}

	function createMapLayer(containerObject, level) {
		if (geojson) {
			map.removeLayer(geojson);
		}
		//baseMap = topojson.feature(topodata, topodata.objects[level]).features;
		baseMap = topojson.feature(containerObject, containerObject.objects[level]).features;
		geojson = L.geoJson(baseMap, {
			style: style,
			onEachFeature: onEachFeature
		});
		geojson.addTo(map);
		refreshLabels();
	}

	function colorPicker(i) {
		var cIndex = (i > 6) ? 0 : (i < 4) ? 2 : 1;
		var picker = document.getElementById('colorpicker');
		picker.value = "#" + ((1 << 24) + (color[cIndex][0] << 16) + (color[cIndex][1] << 8) + color[cIndex][2]).toString(16).slice(1);
		picker.setAttribute('onchange', 'colorChanged(' + cIndex + ', this.value);');
		picker.click();
	}

	function colorChanged(i, value, that) {
		var bigint = parseInt(value.replace(/[^0-9A-F]/gi, ''), 16);
		color[i] = [bigint >> 16 & 255, bigint >> 8 & 255, bigint & 255];
		geojson.setStyle(style);
		legend.update();
	}

	function help() {
		if (document.getElementById('help').style.display !== 'block') {
			document.getElementById('help').style.display = 'block';
			document.getElementById('helpButton').style="border-style:inset;";
		} else {
			document.getElementById('help').style.display = 'none';
			document.getElementById('helpButton').style="border-style:default;";
		}
	}


///////////////////////////////////////////////////////////////////////////////////////////////
// Konfigurálható színek.
var color = [[0, 255, 0], [255, 255, 255], [255, 0, 0]];		// A skála színei.
var naColor = 'darkgrey';		// A nincsadat színe.
var borderSize = 1;				// Határvonal vastagsága (0 eltünteti).
var borderRequired = true;
var opacity = 1;				// Színezés átlátszósága (0: teljesen átlátszó, 1: átlátszatlan).

// Az alaptérkép. A használandót kell kikommentelni.


////////////////////////////////////////////////////////////////////////////////////////////////

// Alaptérkép beállítása.
var map = L.map('map').setView([47.44, 19.02], 7);
map.on("zoomend", refreshLabels);
map.doubleClickZoom.disable();

L.tileLayer('http://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);

var dataToShow = 0;
var geojson;
var header;
var labelG;
var valueG;
var currentFileName = "data";
var baseMap;

// Jobb felső információs ablak.
var info = L.control();
info.onAdd = function() {
	this._div = L.DomUtil.create('div', 'info');
	L.DomEvent.disableClickPropagation(this._div);
	this.update();
	return this._div;
};
info.update = function(props) {
	var s = '';
	if (props) {
		var d = parseFloat(getData(props.shapeid, dataToShow));
		var n = getName(props.shapeid);
		s = '<b>Név: ' + n + ', Id: ' + props.shapeid + '</b><br>';
		s = s + header[dataToShow] + ': ' + d + ' (átlag: ' + minMax[dataToShow].avg + ')';
	} else if (baseMap) {
		s = 'Mutass egy területre a pontos adatért.';
	} else {
		s = 'Kezdetnek tölts be adatokat.';
	}
	this._div.innerHTML = s;
};
info.addTo(map);


// Jelkulcs elkészítése és hozzáadása.
var legend = L.control({position: 'bottomright'});
legend.onAdd = function() {
	this.div = L.DomUtil.create('div', 'info legend');
	L.DomEvent.disableClickPropagation(this.div);
	return this.div;
};
legend.update = function() {
	var legendheight = 18;
	var grades = [1, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2, 0.1, 0];
	var labels = [];
	for (var i = 0; i < grades.length; i++) {
		var from = grades[i];
		var to = grades[i + 1];
		var colorPickerString = 'onclick="colorPicker(' + i + ')"';
		var str = '<rect class="colorRect" x="0" y="' + legendheight * i + '" width="' + legendheight + '" height="' + legendheight + '" fill="' + getColor(from) + '" ' + colorPickerString + '></rect>' +
				'<text dy="-0.25em" dx=".6em" x="' + legendheight + '" y="' + legendheight * (i + 1) + '" style="font-size: 14">' + (parseInt((minMax[dataToShow].min + from * (minMax[dataToShow].max - minMax[dataToShow].min)) * 100) / 100) + '</text>';
		labels.push(str);
	}
	//var pickerHTML = '<form><input id="colorpicker" type="color" name="favcolor" style="visibility: hidden"></form>';
	var svgHTML = '<svg width="90" height="' + (grades.length * legendheight) + '"><g id="legendSVG">' + labels.join("") + '<rect x="0" y="0" width="90" height="1" style="opacity: 0"></rect></g></svg>';
	this.div.innerHTML = '<div style="display: table-cell">' + svgHTML + '</div>';
};
legend.addTo(map);

// Bal felső kontrol panel
var choser = L.control({position: 'topleft'});
choser.onAdd = function() {
	this._div = L.DomUtil.create('div', 'info');
	L.DomEvent.disableClickPropagation(this._div);
	choser.update();
	return this._div;
};
choser.update = function() {
	var onClick = "document.getElementById('loadFileButton').click();";
	var s = '<form>';
	s = s + '<input type="file" id="loadFileButton" onchange="loadFile(this.files[0]);">';
	s = s + '<button type="button" class="button" onclick="' + onClick + '">csv betöltése</button>';
	s = s + '<input type="text" id="pasteField" class="flushright" oninput="loadPaste(this.value)" placeholder="Ctrl+v excelből"><br>';
	if (header !== undefined) {
		s = s + '<div class="leaflet-control-layers-separator"></div>';
		s = s + '<input type="checkbox" name="labels" id="labels" onchange="setLabelsVisibility(this.checked)">nevek mutatása<br>';
		s = s + '<input type="checkbox" name="values" id="values" onchange="setValuesVisibility(this.checked)">értékek mutatása<br>';
		s = s + '<input type="checkbox" name="borders" id="borders" onchange="setBordersVisibility(this.checked)" checked>határok mutatása<br>';
		s = s + '<input type="range" name="opacity" id="opacity" onchange="setOpacity(this.value)" value="100">Átlátszóság<br>';
		s = s + '<div class="leaflet-control-layers-separator"></div>';
		for (var v = 0; v < header.length; v++) {
			var checkedString = (v === 0) ? "checked" : "";
			s = s + '<input type="radio" name="adat" id="adat' + v + '" onchange="choserchanged()" ' + checkedString + '>' + header[v] + '<br>';
		}
	}
	s = s + '<div class="leaflet-control-layers-separator"></div>';
	if (header !== undefined) {
		s = s + '<button type="button" class="button" onclick="saveAsPng()">Kép készítése</button>';
	}
	s = s + '<button type="button" id="helpButton" class="button flushright" onclick="help()">Segítség</button>';
	s = s + '</form>';
	this._div.innerHTML = s;
};
choser.addTo(map);
