// define elements
var modelElement   = document.getElementById("model")
var canvasElement  = document.getElementById("outputCanvas")
var outputElement  = document.getElementById("output")
var textElement    = document.getElementById("outputText")
var messageElement = document.getElementById("outputMessage")

// prefill modelElement
modelElement.value = `name:   "Example"
unit:   "month"
layout: "year"
start:  "0/20"
end:    "1/21"
today:  "6/20"
streams:
 - name: "Workstream A"
   start: "start"
   end:   "end"
   milestones:
    - version:     "V1.0"
      date:        "1/20"
      description: "First version"
    - version:     "V2.0"
      date:        "4/20"
      description: "Second version"
    - version:     "V2.5"
      date:        "7/20"
      description: "Second version 2 patch"
 - name: "Workstream B"
   start: "02/20"
   end:   "end"
   milestones:
    - version:     "V1.0"
      date:        "3/20"
      description: "First version"
      dependencies:
       - stream:   "Workstream A"
         version:  "V1.0"
         duration: 1
    - version:     "V2.0"
      date:        "7/20"
      description: "Second version"
      dependencies:
       - stream:   "Workstream A"
         version:  "V2.0"
         duration: 2
 - name: "Workstream C"
   start: "06/20"
   end:   "end"
   milestones:
    - version:     "V1.0"
      date:        "10/20"
      description: "First version"
      dependencies:
       - stream:   "Workstream A"
         version:  "V1.0"
         duration: 2
       - stream:   "Workstream B"
         version:  "V2.0"
         duration: 2`


// default values
var defaults = {
  unit:   'week',
  layout: 'year',
  titel:  'Demo',
  start:  '1/20',
  end:    '53/20',
  today:  'today',
  width:   1200,
  height:  800,
  padding: {
    left:   200,
    right:  16,
    top:    64,
    bottom: 200
  },
  timeline: {
    show:        true,
    width:       4,
    arrow:       false,
    arrowwidth:  4,
    arrowheight: 4,
    color:       '000000'
  },
  colors: ['EF6F6C', '465775', '6B4E71', '59C9A5', '5B6C5D', '114B5F', '008DD5', '6B2737', '3A2E39', '1E555C']
}

//------------------------------------------------------------------------------

// model: the model with timeline information
var model = {}

// canvas: the dimensions of the canvas grid
var canvas = {
  x:  0,
  y:  0,
  w:  0,
  h:  0,
  x1: 0,
  x2: 0,
  dx: 0,
  dy: 0
}

//------------------------------------------------------------------------------

// clearMessages: remove all messages
function clearMessages() {
  // hide canvas
  canvasElement.classList.remove("display")

  // set text
  messageElement.innerHTML = ""
}

// displayMessage: display a message
function displayMessage(text) {
  // set text
  messageElement.innerHTML += text
}

// displayError: display an error
function displayError(text) {
  // set text
  messageElement.innerHTML += text

  // throw error
  throw new Error(text)
}

//------------------------------------------------------------------------------

function highlightLine(line) {
  var lines = modelElement.value.split("\n")
  var start = 0
  var end   = modelElement.value.length

  // determine start and end
  for (var n = 0; n < lines.length; n++) {
    if (n == line) {
        break
    }

    start += (lines[n].length+1);
  }

  end = lines[line].length + start

  modelElement.focus()
  modelElement.selectionStart = start
  modelElement.selectionEnd   = end
}

//------------------------------------------------------------------------------

// calculateCanvasDimensions: determines the dimensions of the canvas
function calculateCanvasDimensions() {
  calculateCanvasDimensionsBasedOnMonths()
}

function calculateCanvasDimensionsBasedOnMonths() {
  try {
    var startMonth = parseInt(model.start.split("/")[0])
    var startYear  = parseInt(model.start.split("/")[1])
    var endMonth   = parseInt(model.end.split("/")[0])
    var endYear    = parseInt(model.end.split("/")[1])

    canvas.x1 = startYear * 12 + startMonth
    canvas.x2 = endYear * 12 + endMonth
    canvas.dx = canvas.x2 - canvas.x1

    if (canvas.x2 <= canvas.x1) {
      displayMessage("Start date must be before end date!")
    }

    // determine canvas dimension
    canvas.x  = model.padding.left
    canvas.y  = model.padding.top
    canvas.w  = model.width - canvas.x - model.padding.right
    canvas.h  = model.height - canvas.y - model.padding.bottom
    canvas.dx = canvas.w / (canvas.x2 - canvas.x1)
    canvas.dy = canvas.h / (model.streams.length+1)

  } catch(e) {
    displayMessage("Incorrect start and end dates!")
  }
}

//------------------------------------------------------------------------------

var title_template = `
<text style="fill: #__C__; font-size: __S__px"  dominant-baseline="hanging" text-anchor="middle" x="__X__" y="__Y__">__T__</text>`

// generateTitle: generates title SVG fragment
function generateTitle() {
  var svg = title_template

  svg = svg.replace("__X__", model.width / 2)
  svg = svg.replace("__Y__", model.padding.top/2)
  svg = svg.replace("__C__", model.timeline.color)
  svg = svg.replace("__T__", model.name)
  svg = svg.replace("__S__", model.timeline.width * 6)

  return svg
}

//------------------------------------------------------------------------------

var timeline_template = `
<line style="stroke: #__COLOR__; stroke-width: __WIDTH__px; stroke-linecap: round; stroke-linejoin: round;" x1="__X1__" y1="__Y__" x2="__X2__" y2="__Y__"></line>
<line style="stroke: #__COLOR__; stroke-dasharray: 8 8; stroke-width: 1px; stroke-linecap: round; stroke-linejoin: round;" x1="__TX__" y1="__TY1__" x2="__TX__" y2="__TY2__"></line>
<path style="fill: #__COLOR__" d="M __AX1__ __AY1__ L __AX2__ __AY2__ L __AX3__ __AY3__ Z"></path>
__TIMELINEMARKERS__
`

var timeline_marker_template = `
<circle style="fill: #__COLOR__" cx="__X__" cy="__Y__" r="__R__"></circle>
<text style="fill: #__COLOR__; font-size: __TS__px"  dominant-baseline="middle" text-anchor="middle" x="__TX__" y="__TY__">__TEXT__</text>`

// generateTimeline: generates timeline SVG fragment
function generateTimeline() {
  var svg = timeline_template

  var month = parseInt(model.today.split("/")[0])
  var year  = parseInt(model.today.split("/")[1])
  var today = month + year * 12

  svg = svg.replace("__X1__",     canvas.x)
  svg = svg.replace("__X2__",     canvas.x + canvas.w)
  svg = svg.replace(/__Y__/g,     canvas.y + canvas.h)
  svg = svg.replace(/__COLOR__/g, model.timeline.color)
  svg = svg.replace("__WIDTH__",  model.timeline.width)
  svg = svg.replace("__AX1__",    canvas.x + canvas.w)
  svg = svg.replace("__AY1__",    canvas.y + canvas.h - model.timeline.width * 2)
  svg = svg.replace("__AX2__",    canvas.x + canvas.w)
  svg = svg.replace("__AY2__",    canvas.y + canvas.h + model.timeline.width * 2)
  svg = svg.replace("__AX3__",    canvas.x + canvas.w + model.timeline.width * 3)
  svg = svg.replace("__AY3__",    canvas.y + canvas.h)
  svg = svg.replace(/__TX__/g,    canvas.x + (today-canvas.x1) * canvas.dx)
  svg = svg.replace("__TY1__",    canvas.y)
  svg = svg.replace("__TY2__",    canvas.y + canvas.h)

  // add markers
  var markers = ""
  for (var i = canvas.x1+1; i < canvas.x2; i++) {
    var marker = timeline_marker_template
    var month = i % 12
    var year  = Math.round(i /   12)

    if (month == 0) {
      month = 12
      year  = year - 1
    }

    marker = marker.replace("__X__", canvas.x + (i-canvas.x1) * canvas.dx)
    marker = marker.replace("__Y__", canvas.y + canvas.h)
    marker = marker.replace("__R__", model.timeline.width * 1.2)
    marker = marker.replace(/__COLOR__/g, model.timeline.color)
    marker = marker.replace("__TX__", canvas.x + (i-canvas.x1) * canvas.dx)
    marker = marker.replace("__TY__", canvas.y + canvas.h + model.timeline.width * 6)
    marker = marker.replace("__TS__", model.timeline.width * 4)
    marker = marker.replace("__TEXT__", month + "/" + year)

    markers = markers + marker
  }

  svg = svg.replace("__TIMELINEMARKERS__", markers)

  return svg
}

//------------------------------------------------------------------------------

var dependency_template = `
<path style="fill: none; stroke: #__COLOR__; stroke-width: __WIDTH__px; stroke-linecap: round; stroke-linejoin: round;" d="M __X1__ __Y1__ C __XM__ __Y1__ __XM__ __Y2__ __X2__ __Y2__"></path>`

// generateStream: generate stream SVG fragment
function generateDependency(index) {
  var stream = model.streams[index]
  var svg    = ""

  var startMonth
  var startYear
  var start
  var endMonth
  var endYear
  var end
  var lane = (index+1) / (model.streams.length+1) * canvas.h
  var color = model.colors[index % model.colors.length]

  // add milestones
  for (var i = 0; i < stream.milestones.length; i++) {
    var milestone = stream.milestones[i]

    var month = parseInt(milestone.date.split("/")[0])
    var year  = parseInt(milestone.date.split("/")[1])
    var offset = month + year * 12

    // add dependencies
    for (var j = 0; j < milestone.dependencies.length; j++) {
      var dependency = milestone.dependencies[j]
      var deppath    = dependency_template
      var lane2      = -1

      for (var k = 0; k < model.streams.length; k++) {
        if (model.streams[k].name == dependency.stream) {
          lane2 = (k+1) / (model.streams.length+1) * canvas.h
          break
        }
      }

      // check if stream has been found
      if (lane2 == -1) {
        break
      }

      var x1 = canvas.x + (offset - dependency.duration - canvas.x1) * canvas.dx
      var y1 = canvas.y + canvas.h - lane2
      var x2 = canvas.x + (offset - canvas.x1) * canvas.dx
      var y2 = canvas.y + canvas.h - lane
      var xm = (x1+x2) / 2

      deppath = deppath.replace(/__X1__/g, x1)
      deppath = deppath.replace(/__Y1__/g, y1)
      deppath = deppath.replace(/__X2__/g, x2)
      deppath = deppath.replace(/__Y2__/g, y2)
      deppath = deppath.replace(/__XM__/g, xm)
      deppath = deppath.replace(/__WIDTH__/g, model.timeline.width)
      deppath = deppath.replace(/__COLOR__/g, color)

      svg = svg + deppath
    }
  }

  return svg
}

// generateDependencies: generate dependency SVG fragments
function generateDependencies() {
  var dependencies = ""

  for (var index = 0; index < model.streams.length; index++) {
    dependencies = dependencies + generateDependency(index)
  }

  return dependencies
}

//------------------------------------------------------------------------------

var stream_template = `
<line style="stroke: #__COLOR__; stroke-width: __WIDTH__px; stroke-linecap: round; stroke-linejoin: round;" x1="__X1__" y1="__Y__" x2="__X2__" y2="__Y__"></line>
<path style="fill: #__COLOR__" d="M __AX1__ __AY1__ L __AX2__ __AY2__ L __AX3__ __AY3__ Z"></path>
<text style="fill: #__COLOR__; font-size: __TS__px"  dominant-baseline="middle" text-anchor="end" x="__TX__" y="__TY__">__TEXT__</text>
__MILESTONES__`

var stream_marker_template =`
<circle style="fill: #__COLOR__" cx="__X__" cy="__Y__" r="__R__"></circle>
<text style="fill: #__COLOR__; font-size: __TS__px"  dominant-baseline="middle" text-anchor="middle" x="__TX__" y="__TY__">
<title>__DESCRIPTION__</title>
__TEXT__
</text>`

// generateStream: generate stream SVG fragment
function generateStream(index) {
  var stream = model.streams[index]
  var svg    = stream_template

  var startMonth
  var startYear
  var start
  var endMonth
  var endYear
  var end
  var lane

  var color = model.colors[index % model.colors.length]

  // determine endpoints of stream
  if (stream.start == "start") {
    startMonth = parseInt(model.start.split("/")[0])
    startYear  = parseInt(model.start.split("/")[1])
  } else {
    startMonth = parseInt(stream.start.split("/")[0])
    startYear  = parseInt(stream.start.split("/")[1])
  }
  start = startYear * 12 + startMonth


  if (stream.end == "end") {
    endMonth   = parseInt(model.end.split("/")[0])
    endYear    = parseInt(model.end.split("/")[1])
  } else {
    endMonth   = parseInt(stream.end.split("/")[0])
    endYear    = parseInt(stream.end.split("/")[1])
  }
  end = endYear * 12 + endMonth

  lane = (index+1) / (model.streams.length+1) * canvas.h

  svg = svg.replace("__X1__", canvas.x + (start-canvas.x1) * canvas.dx)
  svg = svg.replace("__X2__", canvas.x + (end-canvas.x1) * canvas.dx)
  svg = svg.replace(/__Y__/g, canvas.y + canvas.h - lane )
  svg = svg.replace(/__COLOR__/g, color)
  svg = svg.replace("__WIDTH__", model.timeline.width)
  svg = svg.replace("__AX1__", canvas.x + (end-canvas.x1) * canvas.dx)
  svg = svg.replace("__AY1__", canvas.y + canvas.h - lane - model.timeline.width * 2)
  svg = svg.replace("__AX2__", canvas.x + (end-canvas.x1) * canvas.dx)
  svg = svg.replace("__AY2__", canvas.y + canvas.h - lane + model.timeline.width * 2)
  svg = svg.replace("__AX3__", canvas.x + (end-canvas.x1) * canvas.dx + model.timeline.width * 3)
  svg = svg.replace("__AY3__", canvas.y + canvas.h - lane)
  svg = svg.replace("__TX__", canvas.x - model.timeline.width * 2)
  svg = svg.replace("__TY__", canvas.y + canvas.h - lane)
  svg = svg.replace("__TS__", model.timeline.width * 4)
  svg = svg.replace("__TEXT__", stream.name)

  // add milestones
  var markers = ""
  for (var i = 0; i < stream.milestones.length; i++) {
    var milestone = stream.milestones[i]
    var marker = stream_marker_template

    var month = parseInt(milestone.date.split("/")[0])
    var year  = parseInt(milestone.date.split("/")[1])
    var offset = month + year * 12

    marker = marker.replace("__X__", canvas.x + (offset-canvas.x1) * canvas.dx)
    marker = marker.replace("__Y__", canvas.y + canvas.h - lane)
    marker = marker.replace("__R__", model.timeline.width * 1.2)
    marker = marker.replace(/__COLOR__/g, color)
    marker = marker.replace("__TX__", canvas.x + (offset-canvas.x1) * canvas.dx)
    marker = marker.replace("__TY__", canvas.y + canvas.h - lane - model.timeline.width * 4)
    marker = marker.replace("__TS__", model.timeline.width * 3)
    marker = marker.replace("__TEXT__", milestone.version)
    marker = marker.replace("__DESCRIPTION__", milestone.description)

    markers = markers + marker
  }

  svg = svg.replace("__MILESTONES__", markers)

  return svg
}

// generateSVG: generate stream SVG fragments
function generateStreams() {
  var streams = ""

  for (var index = 0; index < model.streams.length; index++) {
    streams = streams + generateStream(index)
  }

  return streams
}

//------------------------------------------------------------------------------

// svg template
var svg_template = `
<svg xmlns="http://www.w3.org/2000/svg" id="timelines" viewBox="0 0 __WIDTH__ __HEIGHT__">
<style type="text/css">
<![CDATA[
text {
  font-family: Roboto;
}
]]>
</style>
<defs>
  <style>@font-face{font-family:"Roboto";src:url(data:application/font-woff;charset=utf-8;base64,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) format("woff"); font-weight:normal;font-style:normal;}</style>
</defs>
__TIMELINE__
__TITLE__
__DEPENDENCIES__
__STREAMS__
</svg>
`

// generateSVG: generate and replace SVG
function generateSVG() {
  var svg = svg_template

  var title        = generateTitle()
  var timeline     = generateTimeline()
  var dependencies = generateDependencies()
  var streams      = generateStreams()

  svg = svg.replace(/__WIDTH__/g,        model.width)
  svg = svg.replace(/__HEIGHT__/g,       model.height)
  svg = svg.replace(/__TITLE__/g,        title)
  svg = svg.replace(/__TIMELINE__/g,     timeline)
  svg = svg.replace(/__DEPENDENCIES__/g, dependencies)
  svg = svg.replace(/__STREAMS__/g,      streams)

  canvasElement.innerHTML = svg
}


// save: offer to download SVG file
function save() {
  var svg = canvasElement.innerHTML

  var element  = document.createElement('a')
  var filename = model.name + ".svg"

  element.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  element.setAttribute('download', filename);

  element.style.display = 'none';

  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

//------------------------------------------------------------------------------

// handlers
function render() {
  // reset message output
  clearMessages()

  // get model
  displayMessage("1. Parsing yaml input\n\n")
  try {
    model = jsyaml.safeLoad(modelElement.value)
  } catch(e) {
    msg =  e.name + " at line: " + e.mark.line + " column: " + e.mark.position + "\n"
    msg += e.mark.getSnippet() + "\n"
    msg += e.reason

    highlightLine(e.mark.line)

    displayError(msg)
  }

  // apply defaults
  displayMessage("2. Normalize input\n\n")
  model.unit   = model.unit   ? model.unit   : defaults.unit
  model.layout = model.layout ? model.layout : defaults.layout
  model.titel  = model.titel  ? model.titel  : defaults.titel
  model.start  = model.start  ? model.start  : defaults.start
  model.end    = model.end    ? model.end    : defaults.end
  model.today  = model.today  ? model.today  : defaults.today
  model.width  = model.width  ? model.width  : defaults.width
  model.height = model.height ? model.height : defaults.height
  if (!model.padding) {
    model.padding = defaults.padding
  } else {
    model.padding.left   = model.padding.left   ? model.padding.left   : defaults.padding.left
    model.padding.right  = model.padding.right  ? model.padding.right  : defaults.padding.right
    model.padding.top    = model.padding.top    ? model.padding.top    : defaults.padding.top
    model.padding.bottom = model.padding.bottom ? model.padding.bottom : defaults.padding.bottom
  }
  if (!model.timeline) {
    model.timeline = defaults.timeline
  } else {
    model.timeline.show        = model.timeline.show        ? model.timeline.show        : defaults.timeline.show
    model.timeline.color       = model.timeline.color       ? model.timeline.color       : defaults.timeline.color
    model.timeline.width       = model.timeline.width       ? model.timeline.width       : defaults.timeline.width
    model.timeline.arrow       = model.timeline.arrow       ? model.timeline.arrow       : defaults.timeline.arrow
    model.timeline.arrowwidth  = model.timeline.arrowwidth  ? model.timeline.arrowwidth  : defaults.timeline.arrowwidth
    model.timeline.arrowheight = model.timeline.arrowheight ? model.timeline.arrowheight : defaults.timeline.arrowheight
  }
  if (!model.colors) {
    model.colors = defaults.colors
  } else {
    for (var i = 0; i < Math.max(model.colors.length, defaults.colors.length); i++) {
      if (i >= model.colors.length) {
        model.colors.push(defaults.colors[i])
      }
    }
  }

  // initialise undefined arrays
  if (!model.streams) { model.streams = [] }
  for (var i = 0; i < model.streams.length; i++) {
    var stream = model.streams[i]

    if (!stream.milestones) { stream.milestones = [] }
    for (var j = 0; j < stream.milestones.length; j++) {
      var milestone = stream.milestones[j]

      if (!milestone.dependencies) { milestone.dependencies = [] }
    }
  }

  // validate input against schema
  displayMessage("3. Validate schema (todo)\n\n")

  // determine canvas dimensions and generate SVG
  displayMessage("4. Generate SVG\n\n")
  calculateCanvasDimensions()
  generateSVG()

  // show canvas
  canvasElement.classList.add("display")
}

function editor() {
  // hide message
  outputElement.classList.remove("display")

  // hide canvas
  canvasElement.classList.remove("display")
}

// register handlers
document.getElementById("editorButton").addEventListener("click", render);
document.getElementById("outputCanvas").addEventListener("click", editor);
document.getElementById("outputButton").addEventListener("click", save);
