/* globals performance */

document.write(
  `
    <!DOCTYPE html>
    <meta charset="utf-8">
    <style>
h1 {
  text-align: center;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-size: 50px;

}

body {
    margin: 0 auto;
    max-width: 760px;
}

path {
    stroke: steelblue;
    stroke-width: 2;
    fill: none;
}
.axis path,
.axis line {
    fill: none;
    stroke: grey;
    stroke-width: 1;
    shape-rendering: crispEdges;
}
div.tooltip {
    position: absolute;
    text-align: left;
    width: 360px;
    padding: 10px;
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: #222;

    font-size: 14px;
    background: white;
    border: 2px;
    border-radius: 8px;
    border-style: solid;
    border-color: #000;
}
text {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    fill: #666;
    font-size: 14px;
}
  </style>

  <body>

  <script src="bench/d3.v3.min.js"></script>
  <script>

  function sigfigs (x) {
    var xr = Math.round(x * 1000)
    return (xr / 1000)
  }

  // Setup margins.
  var margin = {top: 30, right: 20, bottom: 30, left: 50},
      width = 600 - margin.left - margin.right,
      height = 270 - margin.top - margin.bottom;

  var x = d3.time.scale().range([0, width]);
  var y = d3.scale.linear().range([height, 0]);

  var xAxis = d3.svg.axis().scale(x)
      .orient("bottom").ticks(5);
  var yAxis = d3.svg.axis().scale(y)
      .orient("left").ticks(5);

  var valueline = d3.svg.line()
      .x(function(d) { return x(d.date); })
      .y(function(d) { return y(d.testData.time.mean); });

  // Define the div for the tooltip
  var div = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0); // initially, the div is invisible.

  var req = new XMLHttpRequest();
  req.open("GET", 'bench/test_data.json', true);
  req.onreadystatechange = function ()
  {
    if(req.readyState === 4 && (req.status === 200 || req.status == 0)) {
      var json = JSON.parse(req.responseText)

      Object.keys(json[0].testData).map(function (testCase) {

        // create header.
        var header = document.createElement('h1')
        header.innerHTML = testCase
        document.body.appendChild(header)

        // gather test data for this test case.
        var data = []
        for (var i = 0; i < json.length; i++) {
          data.push({
            date: new Date(json[i].timestamp*1000),
            title: json[i].title,
            description: json[i].description,
            hash: json[i].hash,
            author: json[i].author,

            testData: json[i].testData[testCase]
          })
        }

        // add svg canvas.
        var svg = d3.select("body")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform",
                  "translate(" + margin.left + "," + margin.top + ")");

        x.domain(d3.extent(data, function(d) { return d.date; }));
        y.domain([0, d3.max(data, function(d) { return d.testData.time.mean; })]);

        // draw line chart.
        svg.append("path")
          .attr("class", "line")
          .attr("d", valueline(data));

        // draw data point dots.
        svg.selectAll("dot")
	  .data(data)
	  .enter().append("circle")
	  .attr("r", 3)
	  .attr("cx", function(d) { return x(d.date); })
	  .attr("cy", function(d) { return y(d.testData.time.mean); })

        // show tooltip on hover.
          .on("mouseover", function(d) {
            div.transition()
              .duration(200)
              .style("opacity", .9);

            var desc = d.title + d.description
            var shortenedDesc = desc.length > 70 ? desc.substring(0,69)+'...' : desc
            var commitUrl = 'https://github.com/mikolalysenko/regl/commit/' + d.hash
            console.log("link: ", commitUrl)

            div.html(
              "<b>Hash: </b>" + '<a href="' + commitUrl + '"><code>'+d.hash+'</code></a>' + "<br/>" +
                "<b>Desc.: </b>" + shortenedDesc + "<br/>" +
                "<b>Avg. time: </b>" + sigfigs(d.testData.time.mean) + '∓' + sigfigs(d.testData.time.stddev)  + "ms" + "<br/>" +
                "<b>Author: </b>" + d.author + "<br/>" +
                "<b>Date: </b>" + d.date + "<br/>"
            )
              .style("left", (d3.event.pageX) + "px")
              .style("top", (d3.event.pageY - 28) + "px");
          })

        // X-axis
        svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + height + ")")
          .call(xAxis)
        .append("text")
      .attr("class", "label")
      .attr("x", width+20)
      .attr("y", -6)
      .style("text-anchor", "end")
      .text("Commit Time");

        // Y-axis
        svg.append("g")
          .attr("class", "y axis")
          .call(yAxis)
        .append("text")
      .attr("class", "label")
      .attr("y", -20)
      .attr("x", 40)
      .attr("dy", ".7em")
      .style("text-anchor", "end")
      .text("Runtime(ms)");

      })
    }
  }
  req.send(null);

  </script>
  </body>
    `);
