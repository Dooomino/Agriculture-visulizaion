var w = 700;
var h = 400;
var hr = 3;
var selectedMonth = 0
var selectedYear = 1990
var weatherType = 'Tmax'
var weatherFile = ''
var weatherData = {}
var visData = []
var proj = undefined
var hexPath = []
var cScale = d3.scaleLinear()
  .domain([-20, 0, 20])
  .range(['blue', 'white', 'red']);

var t = d3.transition();

function updateVisDataColours() {
  if (visData.length != 0) {
    var yearlyData = weatherData[selectedYear]
    visData = visData.map((d) => {
      var hexLonLat = cordRound(proj.invert([d.x, d.y]))
      if ((yearlyData != undefined) &&
        (cordToKey(hexLonLat) in yearlyData)) {
        var hexData = yearlyData[cordToKey(hexLonLat)][selectedMonth]
        if (hexData != null) {
          d.colour = cScale(hexData)
        } else {
          d.colour = 'lightgray'
        }
      } else {
        d.colour = 'black'
      }
      return d
    })
  }
  //  console.log('Updated vis data', visData)
}

function loadWeatherData(weatherFile) {
  $.ajax({
    url: weatherFile,
    async: false,
    dataType: 'json',
    success: function (response) {
      weatherData = response
      updateVisDataColours()
    }
  });
}

function makeWeatherFileName(year, wtype) {
  var prefix = '/wdata/'
  var rYear = Math.ceil(year / 5) * 5;
  return prefix + weatherType + rYear + '.json'
}

function saveTextAsFile(t) {
  var textFileAsBlob = new Blob([t], {
    type: "application/json"
  });
  var downloadLink = document.createElement("a");
  downloadLink.download = "cords.json";
  downloadLink.innerHTML = "Download File";
  if (window.webkitURL != null) {
    downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
  } else {
    downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
    downloadLink.onclick = destroyClickedElement;
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
  }

  downloadLink.click();
}

function cordToKey(cord) {
  return cord[0].toString() + " " + cord[1].toString()
}

function cordRound(cord) {
  return [Math.round(cord[0] * 100 + Number.EPSILON) / 100,
          Math.round(cord[1] * 100 + Number.EPSILON) / 100]
}

function drawHexmap() {
  //  console.log('Drawing Hexmap')
  var svg = d3.select("#canvas")
    .attr("height", h)
    .attr("width", w)
    .attr("viewBox", [0, 0, w, h]);
  var map = svg.append("g")
  d3.select("#canvas").on("click", function () {
    var m = d3.mouse(this)
    var p = proj.invert(m);
    console.log("lat/lon:" + p);
    console.log("mouse :" + m);
  });
  //  svg.selectAll('.hex').remove()
  svg.selectAll('.hex')
    .data(visData)
    .join(
      enter => enter
      .append('path')
      .attr('class', 'hex')
      .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
      .attr('d', hexPath)
      .style('stroke', '#666')
      .style('fill', 'lightgray')
      .style('stroke-width', 1)
      .call(enter => enter.transition(t)
        .duration(1500)
        .style('fill', (d) => {
          return d.colour
        })),
      update => update
      .attr('class', 'hex')
      .attr('transform', d => 'translate(' + d.x + ',' + d.y + ')')
      .attr('d', hexPath)
      .style('stroke', '#666')
      .style('stroke-width', 1)
      .call(enter => enter.transition(t)
        .duration(1500)
        .style('fill', (d) => {
          return d.colour
        })
      ),
      exit => exit
      .call(ex => ex.transition(t)
        .duration(1000)
        .style('fill', 'lightgray')
        .remove()
      )
    );
}

var sliderMonth = d3
  .sliderHorizontal()
  .min(1)
  .max(12)
  .step(1)
  .width(w * 0.9)
  .displayValue(false)
  .on('onchange', val => {
    d3.select('#value').text(val);
    selectedMonth = val - 1
    //    console.log(selectedMonth)
    updateVisDataColours()
    drawHexmap()
  });

d3.select('#sliderMonth')
  .append('svg')
  .attr('width', w)
  .attr('height', 100)
  .attr('class', 'slider')
  .append('g')
  .attr('transform', 'translate(30,30)')
  .call(sliderMonth);

var sliderYear = d3
  .sliderHorizontal()
  .min(1950)
  .max(2012)
  .default(1990)
  .step(1)
  .width(w * 0.9)
  .displayValue(false)
  .on('onchange', val => {
    d3.select('#value').text(val);
    selectedYear = val
    updateVisDataColours()
    drawHexmap()
  });

d3.select('#sliderYear')
  .append('svg')
  .attr('width', w)
  .attr('height', 100)
  .attr('class', 'slider')
  .append('g')
  .attr('transform', 'translate(30,30)')
  .call(sliderYear);

window.onload = function () {
  //Loads in the grid data
  var ca_b = d3.json("canadaBorder.geo.json")
    .then(function (ca) {
      proj = d3.geoAlbers()
        .fitSize([w * 0.95, h * 0.90], ca)
      var path = d3.geoPath().projection(proj);
      var hex = d3.hexgrid()
        .extent([w, h])
        .geography(ca)
        .pathGenerator(path)
        .projection(proj)
        .hexRadius(hr)
      var hexmap = hex(ca)
      hexPath = hexmap.hexagon()
      visData = hexmap.grid.layout
      //loads the weather data
      weatherFile = makeWeatherFileName(selectedYear, weatherType)
      loadWeatherData(weatherFile)
      //Updates the vis colours based on new weather data
      updateVisDataColours()
      //Redraws the hex map
      drawHexmap()
      //Gets the cords for preprocessing
      //var cords = hexmap.grid.layout.map((x) => {return cordRound(proj.invert([x.x, x.y]))})
      //saveTextAsFile(JSON.stringify({"cords": cords}))
      //console.log(JSON.stringify({"cords": cords}))
    }); // end then()
}
