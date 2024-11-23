/*
Copyright (c) 2010 Nik Kalyani nik@kalyani.com http://www.kalyani.com
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

(function ($) {
  var plugin = {
    _isMobile: function () {
      var mobileArr = new Array(
        "iPhone",
        "iPod",
        "iPad",
        "BlackBerry",
        "Android",
        "Windows CE",
        "LG",
        "MOT",
        "SAMSUNG",
        "SonyEricsson"
      );
      for (var txt in mobileArr) {
        if (navigator.userAgent.match(mobileArr[txt]) != null) {
          return true;
        }
      }
      return false;
    },

    defaults: {
      debug: false,
      grid: false,
      gridNumbers: false,
      gridColor: "#eee",
      labelFontSize: 9,
      labelLetterSpacing: "-1",
      indicatorFontSize: 9,
      moveThreshold: 1,
      lang: "ko",
      maxZoom: 3,
      minZoom: 1.4,
      cellSize: 10,
      scaleStep: 2,
      moveStep: 5,
      onStationClick: function () {},
      onMouseWheel: function () {},
      onMouseMove: function () {},
      onMouseDown: function () {},
      onMouseUp: function () {},
      onClick: function () {},
    },

    options: {},

    logWindow: $("<div/>").addClass("log-window").css({
      position: "fixed",
      bottom: "50%",
      left: 0,
      fontSize: "12px",
      color: "#aaa",
      zIndex: "999999",
      padding: "5px",
      whiteSpace: "pre-line",
    }),

    lines: {},

    $mask: $("<div/>").attr("id", "map-mask").css({
      position: "absolute",
      left: "0",
      top: "0",
      backgroundColor: "#fff",
      opacity: 0.9,
      width: "100%",
      height: "100%",
      zIndex: "4000",
      display: "none",
    }),

    $svg: null,

    identity: function (type) {
      if (type === undefined) type = "name";

      switch (type.toLowerCase()) {
        case "version":
          return "1.0.0";
          break;
        default:
          return "subwayMap Plugin";
          break;
      }
    },

    _debug: function (s) {
      if (this.options.debug) this._log(s);
    },
    _log: function () {
      var log = Array.prototype.join.call(arguments, " ");
      if (window.console && window.console.log)
        window.console.log("[subwayMap] " + log);
      this.logWindow.append("\n" + log);
    },
    _supportsCanvas: function () {
      var canvas = $("<canvas></canvas>");
      if (canvas[0].getContext) return true;
      else return false;
    },
    _getSvg: function ($el, overlay, elClass) {
      this.layer++;
      var $svg =
        $el.children("svg").eq(0) ||
        $(document.createElementNS("http://www.w3.org/2000/svg", "svg")).attr({
          version: "1.1",
        });

      $svg.css({
        position: "absolute",
        zIndex: (overlay ? 2000 : 1000) + this.layer,
        transformOrigin: "0 0 0",
        "-webkit-backface-visibility": "hidden",
        "backface-visibility": "hidden",
        /*"-webkit-perspective": "1000",
				"perspective": "1000",
				"will-change" : "transform"*/
      });
      $el.append($svg);
      return $svg;
    },
    _getSvgElement: function (elName, elClass, elAttr, $parent) {
      var $el = null;
      if (elName) {
        $el = $(
          document.createElementNS("http://www.w3.org/2000/svg", elName)
        ).attr("class", elClass);
        if (typeof elAttr == "object") {
          for (var key in elAttr) {
            $el.get(0).setAttribute(key, elAttr[key]);
          }
        }
        if ($parent) $el.appendTo($parent);
      }
      return $el;
    },
    _render: function ($el) {
      this.$el = $el;
      this.layer = -1;
      var rows = $el.attr("data-rows");
      if (rows === undefined) rows = 10;
      else rows = parseInt(rows);

      var columns = $el.attr("data-columns");
      if (columns === undefined) columns = 10;
      else columns = parseInt(columns);

      var scale = $el.attr("data-cellSize");
      if (scale === undefined) scale = this.options.cellSize;
      else {
        scale = parseInt(scale);
        this.options.cellSize = scale;
      }

      var lineWidth = $el.attr("data-lineWidth");
      if (lineWidth === undefined) lineWidth = 10;
      else lineWidth = parseInt(lineWidth);

      this.lineWidth = lineWidth;

      var textClass = $el.attr("data-textClass");
      if (textClass === undefined) textClass = "";

      var grid = $el.attr("data-grid");
      if (grid) {
        if (grid.toLowerCase() == "false") grid = false;
        else grid = true;
      } else grid = this.options.grid;

      var legendId = $el.attr("data-legendId");
      if (legendId === undefined) legendId = "";

      var gridNumbers = $el.attr("data-gridNumbers");
      if (gridNumbers) {
        if (gridNumbers.toLowerCase() == "false") grid = false;
        else gridNumbers = true;
      } else gridNumbers = this.options.gridNumbers;

      var reverseMarkers = $el.attr("data-reverseMarkers");
      if (
        reverseMarkers === undefined ||
        reverseMarkers.toLowerCase() == "false"
      )
        reverseMarkers = false;
      else reverseMarkers = true;

      this.options.pixelWidth = columns * scale;
      this.options.pixelHeight = rows * scale;

      //$el.css("width", this.options.pixelWidth);
      //$el.css("height", this.options.pixelHeight);
      $el.css({
        position: "relative",
        "z-index": "0",
        overflow: "hidden",
        "min-height": "100px",
        "min-width": "100px",

        /*"width" : this.options.pixelWidth + "px",
				"height" : this.options.pixelHeight + "px"*/
      });

      self = this;
      var $svg = (this.$svg = this._getSvg($el, false));
      console.log($svg);
      $svg
        .get(0)
        .setAttribute(
          "viewBox",
          "0 0 " + plugin.options.pixelWidth + " " + plugin.options.pixelHeight
        );
      //$svg.get(0).setAttribute("preserveAspectRatio", "xMidYMid meet");
      window.onresize = function () {
        (plugin.elWidth = $el.innerWidth()),
          (plugin.elHeight = $el.innerHeight());
        var pWidth = plugin.options.pixelWidth,
          pHeight = plugin.options.pixelHeight;
        if (plugin.elWidth / plugin.elHeight > pWidth / pHeight)
          plugin.elHeight = (plugin.elWidth * pHeight) / pWidth;
        else plugin.elWidth = (plugin.elHeight * pWidth) / pHeight;
        $svg.css({
          width: plugin.elWidth.toFixed(1) + "px",
          height: plugin.elHeight.toFixed(1) + "px",
        });
        /*$svg.css({
					width : pWidth + "px",
					height : pHeight + "px"
				});*/
      };

      this.$mask.appendTo($el);

      if (grid) this._drawGrid($svg, scale, gridNumbers);
      plugin.markerColor = {};
      $el
        .children("ul")
        .each(function (index) {
          var $ul = $(this);

          var color = $ul.attr("data-color") || "#000000";
          var ulLineWidth = $ul.attr("data-lineWidth") || lineWidth;
          var lineTextClass = $ul.attr("data-textClass") || textClass;
          var shiftCoords = $ul.attr("data-shiftCoords") || "";
          var indicatorText =
            $ul.attr("data-indicator-text") || "line" + String(index + 1);
          var lineId = $ul.attr("data-line-id") || String(index + 1);

          var shiftX = 0.0;
          var shiftY = 0.0;
          if (shiftCoords.indexOf(",") > -1) {
            shiftX =
              (parseInt(shiftCoords.split(",")[0]) * ulLineWidth) / scale;
            shiftY =
              (parseInt(shiftCoords.split(",")[1]) * ulLineWidth) / scale;
          }

          var lineLabel = $ul.attr("data-label");
          if (lineLabel === undefined) lineLabel = "Line " + index;

          var nodes = [];
          $ul.children("li").each(function (i, e) {
            var coords = $(this).attr("data-coords") || "";
            var dir = $(this).attr("data-dir") || "";
            var labelPos = $(this).attr("data-labelPos") || "s";
            var uid = $(this).attr("data-uid") || "node-" + index + "-" + i;
            var marker = $(this).attr("data-marker") || "";
            var markerInfo = $(this).attr("data-markerInfo") || "";
            var anchor = $(this).children("a:first-child");
            var label = $(this).text() || "";
            var subLabel = $(this).attr("sub-nm") || "";
            var subLabelStyle = $(this).attr("sub-nm-display") || "block";
            var labelStyle = $(this).attr("data-labelStyle") || "";
            var moveTo = $(this).attr("data-moveTo") || "";
            var nodeType = $(this).attr("data-nodeType") || "normal";
            var nodeLength = $(this).attr("data-nodeLength") || "";
            var changeLineWidth = $(this).attr("data-changeLineWidth") || "";
            var markerPointDir = $(this).attr("data-markerPointDir") || "f";
            var stationCd = $(this).attr("station-cd") || "";

            var link = "";
            var title = "";
            if (anchor != undefined) {
              link = $(anchor).attr("href") || "";
              title = $(anchor).attr("title") || "";
            }

            self._debug(
              "Coords=" +
                coords +
                "; Dir=" +
                dir +
                "; Link=" +
                link +
                "; Label=" +
                label +
                "; labelPos=" +
                labelPos +
                "; Marker=" +
                marker
            );

            var x = "";
            var y = "";
            if (coords.indexOf(",") > -1) {
              /*
						x = Number(coords.split(",")[0]) + (marker.indexOf("interchange") > -1 && markerInfo.indexOf("h") < 0 ? 0 : shiftX);
						y = Number(coords.split(",")[1]) + (marker.indexOf("interchange") > -1 && markerInfo.indexOf("v") < 0 ? 0 : shiftY);
						*/
              x = Math.abs(
                Number(coords.split(",")[0]) +
                  (marker.indexOf("interchange") > -1 ? 0 : shiftX)
              );
              y = Math.abs(
                Number(coords.split(",")[1]) +
                  (marker.indexOf("interchange") > -1 ? 0 : shiftY)
              );
            }

            var isInterchange = marker.indexOf("interchange") > -1;
            if (isInterchange) {
              if (!plugin.markerColor[uid]) plugin.markerColor[uid] = [];
              plugin.markerColor[uid].push(color);
            } else if (moveTo != "" && uid != "" && plugin.markerColor[uid]) {
              plugin.markerColor[uid].push(color);
            }

            nodes[nodes.length] = {
              x: x,
              y: y,
              direction: dir,
              marker: marker,
              markerInfo: markerInfo,
              markerPointDir: markerPointDir,
              link: link,
              title: title,
              label: label,
              labelPos: labelPos,
              uid: uid,
              subLabel: subLabel,
              subLabelStyle: subLabelStyle,
              labelStyle: labelStyle,
              lineWidth: lineWidth,
              moveTo: moveTo,
              nodeType: nodeType,
              nodeLength: nodeLength,
              changeLineWidth: changeLineWidth,
              coords: coords,
              lineId: lineId,
              stationCd: stationCd,
            };
          });

          self.lines[lineId] = {
            label: lineLabel,
            color: color,
            nodes: nodes,
            lineTextClass: lineTextClass,
            lineWidth: ulLineWidth,
            indicatorText: indicatorText,
          };

          /*$ul.remove();*/
        })
        .remove();

      for (var lineId in self.lines) {
        var line = self.lines[lineId];
        self._drawLine(
          $svg,
          scale,
          rows,
          columns,
          line.color,
          line.lineTextClass,
          line.lineWidth,
          line.nodes,
          reverseMarkers,
          line.indicatorText,
          lineId
        );
      }

      var $markerWrap = this._getSvgElement(
        "g",
        "marker-group",
        {
          "transform-origin": "50% 50% 0",
        },
        $svg
      );

      for (var lineId in self.lines) {
        var line = self.lines[lineId];
        for (var node = 0; node < line.nodes.length; node++) {
          this._drawMarker(
            $markerWrap,
            scale,
            line.color,
            textClass,
            plugin.lineWidth,
            line.nodes[node],
            reverseMarkers
          );
        }
      }

      var $labelGroup = $(".label-group");
      if ($labelGroup.length == 0)
        $labelGroup = this._getSvgElement(
          "g",
          "label-group",
          {
            style:
              "fill:black; letter-spacing:" +
              plugin.options.labelLetterSpacing +
              "px; font-size:" +
              plugin.options.labelFontSize +
              "px; font-weight:normal; font-family: NanumGothic, MalgunGothic, Dotum, Arial;",
          },
          $svg
        );
      for (var lineId in self.lines) {
        var line = self.lines[lineId];
        for (var node = 0; node < line.nodes.length; node++) {
          this._drawLabel(
            $labelGroup,
            scale,
            line.color,
            textClass,
            line.lineWidth,
            line.nodes[node],
            reverseMarkers
          );
        }
      }

      if (false && self._isMobile() && $el.css("overflow") != "auto")
        $el.css("overflow", "auto");
      else {
        $el
          .on("mousedown touchstart", function (e) {
            //e.preventDefault();
            //e.stopPropagation();
            //if ( $(el).css("overflow") != "hidden" ) $(el).css("overflow", "hidden");
            var $this = $svg;
            var position = {};
            if (e.type == "touchstart") {
              position = e.originalEvent;
              position.pageX = position.touches[0].pageX;
              position.pageY = position.touches[0].pageY;
            } else {
              position.pageX = e.pageX;
              position.pageY = e.pageY;
            }
            $this.css("cursor", "hand").data("mouse-position", position);
            plugin.options.onMouseDown.apply(this, arguments);
            //plugin._debug(e.type +" : "+ JSON.stringify(position));
            return false;
          }) /*.on("mousemove touchmove", function (e) { 
					e.preventDefault();
					e.stopPropagation();
F					var prevPos = $this.data("mouse-position");
					if ( prevPos ) {
						var currPos = {}
						
						if ( e.type == "touchmove") {
							var touches = e.originalEvent.touches;
							if ( touches.length == 1 && prevPos.touches.length == 1 ) {
								currPos = e.originalEvent;
								currPos.pageX = touches[0].pageX;
								currPos.pageY = touches[0].pageY;
							} else if ( touches.length == 2 && prevPos.touches.length == 2 ) {
								var prevDistanceX = Math.abs(prevPos.touches[0].pageX - prevPos.touches[1].pageX);
								var prevDistanceY = Math.abs(prevPos.touches[0].pageY - prevPos.touches[1].pageY);
								var currDistanceX = Math.abs(touches[1].pageX - touches[0].pageX);
								var currDistanceY = Math.abs(touches[1].pageY - touches[0].pageY);
								
								var deltaX = currDistanceX-prevDistanceX, deltaY = currDistanceY-prevDistanceY;
								if ( Math.abs(deltaX) < 100 && Math.abs(deltaY) < 100 ) return false;
								
								e.pageX = touches[0].pageX + Math.round(touches[1].pageX - touches[0].pageX) / 2;
								e.pageY = touches[0].pageY + Math.round(touches[1].pageY - touches[0].pageY) / 2;
								
								var zoom = (Number($this.data("zoom"))||10);
								var preZoom = zoom;
								
								if ( deltaX < 0 && deltaY < 0 ) zoom -= plugin.options.scaleStep * Math.round(Math.abs( deltaX + deltaY ) / 20);
								else if ( deltaX > 0 && deltaY > 0 ) zoom += plugin.options.scaleStep * Math.round(( deltaX + deltaY) / 20);
								else return false;
								
								var maxZoom = plugin.options.maxZoom * 10;
								if ( zoom < 10 ) zoom = 10;
								else if ( zoom > maxZoom ) zoom = maxZoom;
								
								var scLeft = $svg.position().left, scTop = $svg.position().top;
								var svgWidth = $svg.width(), svgHeight = $svg.height();
								var preX = Math.abs(scLeft) + e.pageX, preY = Math.abs(scTop) + e.pageY;
								var currWidth = zoom/10 * svgWidth, currHeight = zoom/10 * svgHeight;
								var preWidth = preZoom/10 * svgWidth, preHeight = preZoom/10 * svgHeight;
								
								var elLeft = currWidth * preX / preWidth - e.pageX ;
								var elTop =  currHeight * preY / preHeight - e.pageY;
								var leftLimit = currWidth - $el.innerWidth(), topLimit = currHeight - $el.innerHeight();
								elTop = Math.round(elTop > topLimit ? topLimit : elTop < 0 ? 0 : elTop);
								elLeft = Math.round(elLeft > leftLimit ? leftLimit : elLeft < 0 ? 0 : elLeft);
								
								plugin._debug("zoom level : " + zoom/10);
								plugin._debug("prevDistanceX : "+prevDistanceX);
								plugin._debug("currDistanceX : "+currDistanceX);
								$this.css("transform","translate("+(-elLeft)+"px,"+(-elTop)+"px) translateZ(0) scale("+zoom/10+","+zoom/10+") scaleZ(1)").data("zoom", zoom).data("mouse-position", e.originalEvent).data("css-position", {top:-elTop, left:-elLeft});
								plugin.options.onMouseMove.call(this, arguments);
								return false;
							} 
							else {
								plugin.options.onMouseMove.call(this, arguments);
								return false;
							}
						} else {
							currPos.pageX = e.pageX;
							currPos.pageY = e.pageY;
						}
						var deltaY = prevPos.pageY - currPos.pageY;
						var deltaX = prevPos.pageX - currPos.pageX;
						if ( Math.abs(deltaX) < plugin.options.moveThreshold && Math.abs(deltaY) < plugin.options.moveThreshold ) return false;
						
						var zoom = $this.data("zoom")||10;
						plugin._debug(JSON.stringify($this.data("css-position")) + ", deltaX : "+ deltaX);
						var cssPos = $this.data("css-position")||{top:$svg.position().top, left:$svg.position().left};
						
						cssPos.top = cssPos.top - ( deltaY );
						cssPos.left = cssPos.left - ( deltaX );
						
						var svgWidth = $svg.width(), svgHeight = $svg.height();
						var currWidth = zoom/10 * svgWidth, currHeight = zoom/10 * svgHeight;
						var leftLimit = currWidth - $el.innerWidth(), topLimit = currHeight - $el.innerHeight();
						cssPos.top = Math.round(cssPos.top > 0 ? 0 : cssPos.top < -topLimit ? -topLimit : cssPos.top);
						cssPos.left = Math.round(cssPos.left > 0 ? 0 : cssPos.left < -leftLimit ? -leftLimit : cssPos.left);
						
						$this.css("transform","translate("+cssPos.left+"px,"+cssPos.top+"px) translateZ(0) scale("+zoom/10+","+zoom/10+") scaleZ(1)").data("css-position", cssPos);
						$this.data("mouse-position", currPos);
						plugin.options.onMouseMove.call(this, arguments);
					}
				})*/
          .on("mousemove touchmove", function (e) {
            //e.preventDefault();
            //e.stopPropagation();
            var $this = $svg;
            var prevPos = $this.data("mouse-position");
            if (prevPos) {
              var currPos = {};

              if (e.type == "touchmove") {
                var touches = e.originalEvent.touches;
                if (touches.length == 1 && prevPos.touches.length == 1) {
                  currPos = e.originalEvent;
                  currPos.pageX = touches[0].pageX;
                  currPos.pageY = touches[0].pageY;
                } else if (touches.length == 2 && prevPos.touches.length == 2) {
                  var prevDistanceX = Math.abs(
                    prevPos.touches[0].pageX - prevPos.touches[1].pageX
                  );
                  var prevDistanceY = Math.abs(
                    prevPos.touches[0].pageY - prevPos.touches[1].pageY
                  );
                  var currDistanceX = Math.abs(
                    touches[1].pageX - touches[0].pageX
                  );
                  var currDistanceY = Math.abs(
                    touches[1].pageY - touches[0].pageY
                  );

                  var deltaX = currDistanceX - prevDistanceX,
                    deltaY = currDistanceY - prevDistanceY;
                  //if ( Math.abs(deltaX) < 100 && Math.abs(deltaY) < 100 ) return false;

                  e.pageX =
                    touches[0].pageX +
                    Math.round(touches[1].pageX - touches[0].pageX) / 2;
                  e.pageY =
                    touches[0].pageY +
                    Math.round(touches[1].pageY - touches[0].pageY) / 2;

                  var zoom = Number($this.data("zoom")) || 10;
                  var preZoom = zoom;

                  if (deltaX < 0 && deltaY < 0)
                    zoom -=
                      plugin.options.scaleStep *
                      Math.round(Math.abs(deltaX + deltaY) / 20);
                  else if (deltaX > 0 && deltaY > 0)
                    zoom +=
                      plugin.options.scaleStep *
                      Math.round((deltaX + deltaY) / 20);
                  else return false;

                  var maxZoom = plugin.options.maxZoom * 10;
                  var minZoom = plugin.options.minZoom * 10;
                  if (zoom < minZoom) zoom = minZoom;
                  else if (zoom > maxZoom) zoom = maxZoom;

                  var scLeft = $el.scrollLeft(),
                    scTop = $el.scrollTop();
                  var svgWidth = $svg.width(),
                    svgHeight = $svg.height();
                  var preX = Math.abs(scLeft) + e.pageX,
                    preY = Math.abs(scTop) + e.pageY;
                  var currWidth = (zoom / 10) * svgWidth,
                    currHeight = (zoom / 10) * svgHeight;
                  var preWidth = (preZoom / 10) * svgWidth,
                    preHeight = (preZoom / 10) * svgHeight;

                  var elLeft = (currWidth * preX) / preWidth - e.pageX;
                  var elTop = (currHeight * preY) / preHeight - e.pageY;
                  var leftLimit = currWidth - $el.innerWidth(),
                    topLimit = currHeight - $el.innerHeight();
                  elTop = Math.round(
                    elTop > topLimit ? topLimit : elTop < 0 ? 0 : elTop
                  );
                  elLeft = Math.round(
                    elLeft > leftLimit ? leftLimit : elLeft < 0 ? 0 : elLeft
                  );

                  $this
                    .css("transform", "scale(" + zoom / 10 + ") scaleZ(1)")
                    .data("zoom", zoom)
                    .data("mouse-position", e.originalEvent)
                    .data("css-position", { top: elTop, left: elLeft });
                  $el.scrollTop(elTop).scrollLeft(elLeft);

                  plugin._debug("zoom level : " + zoom / 10);
                  plugin._debug("prevDistanceX : " + prevDistanceX);
                  plugin._debug("currDistanceX : " + currDistanceX);
                  plugin.options.onMouseMove.apply(this, arguments);
                  return false;
                } else {
                  plugin.options.onMouseMove.apply(this, arguments);
                  return false;
                }
              } else {
                currPos.pageX = e.pageX;
                currPos.pageY = e.pageY;
              }
              var deltaY = prevPos.pageY - currPos.pageY;
              var deltaX = prevPos.pageX - currPos.pageX;
              if (
                Math.abs(deltaX) < plugin.options.moveThreshold &&
                Math.abs(deltaY) < plugin.options.moveThreshold
              )
                return false;

              var zoom = $this.data("zoom") || 10;
              var cssPos = $this.data("css-position") || {
                top: $el.scrollTop(),
                left: $el.scrollLeft(),
              };
              plugin._debug(
                JSON.stringify($this.data("css-position")) +
                  ", deltaX : " +
                  deltaX
              );

              cssPos.top = cssPos.top + deltaY;
              cssPos.left = cssPos.left + deltaX;

              var svgWidth = $svg.width(),
                svgHeight = $svg.height();
              var currWidth = (zoom / 10) * svgWidth,
                currHeight = (zoom / 10) * svgHeight;
              var leftLimit = currWidth - $el.innerWidth(),
                topLimit = currHeight - $el.innerHeight();
              cssPos.top = Math.round(
                cssPos.top > topLimit
                  ? topLimit
                  : cssPos.top < 0
                  ? 0
                  : cssPos.top
              );
              cssPos.left = Math.round(
                cssPos.left > leftLimit
                  ? leftLimit
                  : cssPos.left < 0
                  ? 0
                  : cssPos.left
              );

              $el.scrollTop(cssPos.top).scrollLeft(cssPos.left);
              $this
                .data("mouse-position", currPos)
                .data("css-position", cssPos);
              plugin.options.onMouseMove.apply(this, arguments);
            }
          })
          .on("mouseup touchend", function (e) {
            //e.preventDefault();
            //e.stopPropagation();
            var $this = $svg;
            var prevPos = $this.data("mouse-position");
            /*if ( prevPos && e.type == "touchend" ) {
						var touches = e.originalEvent.touches;
						var changed = e.originalEvent.changedTouches;
						if ( touches.length == 1 && changed.length == 1 && prevPos.touches.length == 2 ) {
							var prevDistanceX = Math.abs(prevPos.touches[0].pageX - prevPos.touches[1].pageX);
							var prevDistanceY = Math.abs(prevPos.touches[0].pageY - prevPos.touches[1].pageY);
							var currDistanceX = changed[0].pageX - touches[0].pageX;
							var currDistanceY = changed[0].pageY - touches[0].pageY;
							
							e.pageX = touches[0].pageX + currDistanceX / 2;
							e.pageY = touches[0].pageY + currDistanceY / 2;
							
							var zoom = (Number($this.data("zoom"))||10);
							var preZoom = zoom;
							zoom = Math.round(zoom + ((Math.abs(currDistanceX) + Math.abs(currDistanceY)) - (prevDistanceX + prevDistanceY)) / 20);
							var zoomLimit = plugin._isMobile() ? 100 : 30;
							if ( zoom < 10 ) zoom = 10;
							else if ( zoom > zoomLimit ) zoom = zoomLimit;
							
							var scLeft = $svg.position().left, scTop = $svg.position().top;
							var svgWidth = $svg.width(), svgHeight = $svg.height();
							var preX = Math.abs(scLeft) + e.pageX, preY = Math.abs(scTop) + e.pageY;
							var currWidth = zoom/10 * svgWidth, currHeight = zoom/10 * svgHeight;
							var preWidth = preZoom/10 * svgWidth, preHeight = preZoom/10 * svgHeight;
							
							var elLeft = currWidth * preX / preWidth - e.pageX ;
							var elTop =  currHeight * preY / preHeight - e.pageY;
							//console.log( "x:"+elLeft+", y:"+elTop );
							var leftLimit = currWidth - $el.innerWidth(), topLimit = currHeight - $el.innerHeight();
							elTop =  - Math.round(elTop > topLimit ? topLimit : elTop < 0 ? 0 : elTop);
							elLeft = - Math.round(elLeft > leftLimit ? leftLimit : elLeft < 0 ? 0 : elLeft);
							
							//$el.scrollTop(elTop).scrollLeft(elLeft)
							$this.css("transform","translate("+elLeft+"px,"+elTop+"px) translateZ(0) scale("+zoom/10+")").data("zoom", zoom);
						} 
					}*/
            $this.css("cursor", "default").data("mouse-position", null);
            plugin.options.onMouseUp.apply(this, arguments);
            return false;
          })
          .on("mouseleave touchcancel", function (e) {
            //e.preventDefault();
            //e.stopPropagation();
            var $this = $svg;
            $this.css("cursor", "default").data("mouse-position", null);
            plugin.options.onMouseUp.apply(this, arguments);
          });
        $svg.on("click touchstart", function (e) {
          plugin.options.onClick.apply(this, arguments);
        });
        /* 
				$("body").on("keydown", function (e) {
					if ( [37,38,39,40,107,109].indexOf(e.keyCode) > -1 ) {
						if ( e.keyCode == 37 ) plugin._moveToDirection("left");
						else if ( e.keyCode == 38 ) plugin._moveToDirection("up");
						else if ( e.keyCode == 39 ) plugin._moveToDirection("right");
						else if ( e.keyCode == 40 ) plugin._moveToDirection("down");
						else if ( e.keyCode == 107 ) plugin._zoomin();
						else plugin._zoomout();
						return false;
					}
					
				});
				*/
        /*$el.on("mousewheel DOMMouseScroll", function (e) {
					e.stopPropagation();
					e.preventDefault();
					var E = e.originalEvent;
					var delta = 0;

					if (E.detail) delta = E.detail * -40;
					else delta = E.wheelDelta;

					var maxZoom = plugin.options.maxZoom * 10;
					var $this = plugin.$svg;
					var zoom = (Number($this.data("zoom"))||10);
					
					if ( (zoom == 10 && delta < 0) || (zoom == maxZoom && delta > 0) ) return false;
					
					var mX = e.offsetX, mY = e.offsetY;
					var preZoom = zoom;
					if ( delta > 0 ) zoom = zoom + plugin.options.scaleStep;
					else zoom = zoom - plugin.options.scaleStep;
					
					if ( zoom < 10 ) zoom = 10;
					else if ( zoom > maxZoom ) zoom = maxZoom;
					
					var cssPosition = $this.data("css-position")||{top:0, left:0};
					var scLeft = cssPosition.left, scTop = cssPosition.top;
					var svgWidth = $svg.width(), svgHeight = $svg.height();
					var preX = Math.abs(scLeft) + mX, preY = Math.abs(scTop) + mY;
					var currWidth = zoom/10 * svgWidth, currHeight = zoom/10 * svgHeight;
					var preWidth = preZoom/10 * svgWidth, preHeight = preZoom/10 * svgHeight;
					
					var elLeft = currWidth * preX / preWidth - mX ;
					var elTop =  currHeight * preY / preHeight - mY;
					var leftLimit = currWidth - $el.innerWidth(), topLimit = currHeight - $el.innerHeight();
					elTop =  Math.round(elTop > topLimit ? topLimit : elTop < 0 ? 0 : elTop);
					elLeft = Math.round(elLeft > leftLimit ? leftLimit : elLeft < 0 ? 0 : elLeft);
					$this.css("transform","translate("+(-elLeft)+"px,"+(-elTop)+"px) translateZ(0) scale("+zoom/10+","+zoom/10+") scaleZ(1)").data("zoom", zoom).data("css-position", {top:-elTop, left:-elLeft});
				});*/

        $el.on("mousewheel DOMMouseScroll", function (e) {
          e.stopPropagation();
          e.preventDefault();
          var E = e.originalEvent;
          var delta = 0;

          if (E.detail) delta = E.detail * -40;
          else delta = E.wheelDelta;

          e = e.offsetX ? e : E;

          var maxZoom = plugin.options.maxZoom * 10;
          var minZoom = plugin.options.minZoom * 10;
          var $this = plugin.$svg;
          var zoom = Number($this.data("zoom")) || 10;

          if ((zoom == 10 && delta < 0) || (zoom == maxZoom && delta > 0))
            return false;

          if (delta > 0) zoom = zoom + plugin.options.scaleStep;
          else zoom = zoom - plugin.options.scaleStep;

          if (zoom < minZoom) zoom = minZoom;
          else if (zoom > maxZoom) zoom = maxZoom;

          var mX = e.offsetX,
            mY = e.offsetY;
          var elPos = $el.offset();
          var px = e.pageX - elPos.left,
            py = e.pageY - elPos.top;

          var elLeft = (mX * zoom) / 10 - px;
          var elTop = (mY * zoom) / 10 - py;

          $this
            .css("transform", "scale(" + zoom / 10 + ") scaleZ(1)")
            .data("zoom", zoom)
            .data("css-position", { top: elTop, left: elLeft });
          $el.scrollTop(elTop).scrollLeft(elLeft);
          plugin.options.onMouseWheel.apply(this, arguments);
        });
      }

      if (this.options.debug) $el.append(this.logWindow);

      if (legendId != "") {
        var $legend = $("#" + legendId);
        if ($legend.length > 0) {
          $legend.on("click", ".line-legend", function () {
            var $this = $(this);
            var lineId = $this.attr("line-id");
            if ($this.hasClass("on")) {
              plugin._hideLine(lineId);
              /*$(".L"+lineNo).each(function(i, e){
								var $e = $(e);
								$e.css("z-index", $e.data("pre-zindex"));
							});*/
              $this.removeClass("on").css("opacity", 0.3);
              if ($(".line-legend.on").length == 0) {
                $(".line-legend").css("opacity", 1);
              }
            } else {
              $(".line-legend").not(".on").css("opacity", 0.3);
              $this.addClass("on").css("opacity", 1);
              plugin._showLine(lineId);
              /*$(".L"+lineNo).each(function(i, e){
								var $e = $(e);
								var zIndex = Number($e.css("z-index"));
								$e.data("pre-zindex", zIndex).css("z-index", zIndex + 4000);
							});*/
            }
          });

          for (var lineId in this.lines) {
            var line = this.lines[lineId];
            $("<span/>")
              .attr("line-id", lineId)
              .addClass("line-legend")
              .css({
                display: "inline-block",
                padding: "2px 5px 3px",
                margin: "2px",
                backgroundColor: line.color,
                color: "white",
                borderRadius: "5px",
                cursor: "pointer",
              })
              .text(line.label)
              .appendTo($legend);
          }
        }
      }
      window.onresize();
      $(document).ready(function () {
        var zoom = 24;
        var scale = plugin.options.cellSize;
        var center = { x: 129, y: 77 };
        var pWidth = plugin.options.pixelWidth,
          pHeight = plugin.options.pixelHeight;
        var mLeft = Math.round(
          (((plugin.elWidth * center.x * scale) / pWidth) * zoom) / 10 -
            Number($el.width()) / 2
        );
        var mTop = Math.round(
          (((plugin.elHeight * center.y * scale) / pHeight) * zoom) / 10 -
            Number($el.height()) / 2
        );
        $svg
          .css({
            transform: "scale(" + zoom / 10 + ") scaleZ(1)",
          })
          .data("zoom", zoom)
          .data("css-position", { top: mTop, left: mLeft });

        setTimeout(function () {
          $el.scrollTop(mTop).scrollLeft(mLeft);
          $svg.css({
            //transition:plugin._isMobile()?"transform 0.1s":"",
            //transition:"transform 0.5s",
            transitionTimingFunction: "ease",
          });
        }, 0);
        //console.log("moved : top - " + $el.scrollTop());
      });
    },

    _drawLabel: function (
      $labelGroup,
      scale,
      color,
      textClass,
      width,
      data,
      reverseMarkers
    ) {
      // Render text labels and hyperlinks
      if (!data || data.label == "") return;

      var x = data.x * scale;
      var y = data.y * scale;

      var uid = data.uid;
      var $label = $("#S" + uid);
      if (uid && $label.length > 0) {
        plugin._addSVGClass($label, "S" + data.stationCd + " L" + data.lineId);
        plugin._addSVGAttrValue($label, "lineId", data.lineId);
      } else {
        var labelAttr = {
          /*"x":x,*/
          y: y,
          id: "S" + uid,
          class: "label S" + data.stationCd + " L" + data.lineId,
          style: "",
          uid: data.uid,
          lineId: data.lineId,
        };

        var labelpos = data.labelPos.toLowerCase();
        var dx = 0,
          dy = 0,
          inter = 0,
          base = Math.round(scale / labelpos.length);
        if (data.marker.indexOf("interchange") > -1) inter = 4;

        if (labelpos.indexOf("s") > -1) dy = 8 + base + inter;
        else if (labelpos.indexOf("n") > -1) dy = -base - inter;
        else dy = 3;

        if (labelpos.indexOf("e") > -1) {
          labelAttr.style += " text-anchor:start;";
          dx = base + inter;
        } else if (labelpos.indexOf("w") > -1) {
          labelAttr.style += " text-anchor:end;";
          dx = -base - inter;
        } else labelAttr.style += " text-anchor:middle;";

        var mainLabelAttr = {
          x: x,
          dx: dx,
          dy: dy,
          "font-size": plugin.options.labelFontSize + "px",
        };
        if (data.marker.indexOf("interchange") > -1)
          mainLabelAttr["font-weight"] = "bold";
        var labelTextArr = data.label.split("\n");
        //labelAttr.y = (dy >= 0 ) ? y : y-(11*(labelTextArr.length-1));

        $label = this._getSvgElement("text", "S" + uid, labelAttr, $labelGroup);

        var dy2 = Number(plugin.options.labelFontSize) + 3;
        for (var i = 0; i < labelTextArr.length; i++) {
          if (i > 0) {
            mainLabelAttr.dy = dy >= 0 ? dy2 : -dy2;
          }
          //if ( i > 0 ) mainLabelAttr.dy = 11;
          var k = dy >= 0 ? i : labelTextArr.length - 1 - i;
          this._getSvgElement("tspan", null, mainLabelAttr, $label).text(
            labelTextArr[k]
          );
        }

        var $subLabel = "";
        var dy3 = plugin.options.labelFontSize + 2;
        if (data.subLabel != "" && false) {
          var subLabelTextArr = data.subLabel.replace("\n", "").split("\n");
          for (var i = 0; i < subLabelTextArr.length; i++) {
            var k = dy > 0 ? i : subLabelTextArr.length - 1 - i;
            var subLabelText = subLabelTextArr[k];
            if (k == 0) subLabelText = "(" + subLabelText;
            if (k == subLabelTextArr.length - 1)
              subLabelText = subLabelText + ")";

            $subLabel = this._getSvgElement(
              "tspan",
              null,
              { "font-size": plugin.options.labelFontSize - 1 + "px" },
              $label
            ).text(subLabelText);
            switch (labelpos) {
              case "n":
              case "ne":
              case "nw":
                if (data.subLabelStyle != "inline") {
                  $subLabel.attr({ x: x, dx: dx, dy: -dy3 });
                }
                break;
              default:
                $subLabel.attr({ x: x, dx: dx, dy: dy3 });
                break;
            }
          }
        }
      }
    },

    _showedLines: [],
    _isRouteSearching: false,
    _showLine: function (lineId) {
      if (typeof lineId == "string") {
        var $markers = $(".L" + lineId)
          .css("opacity", 1)
          .filter(".marker");
        var uid = $markers.eq(Math.floor($markers.length / 2)).attr("uid");
        this._moveToStation(uid, 1.5);
      } else {
        /*this.$svg.find(".path").css("opacity", "1");
				this.$svg.find(".label").css("opacity", "1");
				this.$svg.find(".marker").css("opacity", "1");
				this.$svg.find(".on").attr("class", function(){ return $(this).attr("class").replace(/\s?\bon\b(\s?)/gi, "$1").trim() });*/
        this.$svg.find(".path").css("opacity", "1");
        this.$svg.find(".label").css("opacity", "1");
        this.$svg.find(".marker").css("opacity", "1");
      }
      this.$svg.find(".routeMarker").attr({ x: 0, y: 0 });
    },
    _hideLine: function (lineId) {
      if (typeof lineId == "string") $(".L" + lineId).css("opacity", 0.1);
      else {
        this.$svg.find(".path").css("opacity", "0.1");
        this.$svg.find(".label").css("opacity", "0.1");
        this.$svg.find(".marker").css("opacity", "0.1");
      }
    },
    _showRoute: function (nodesArray) {
      if (nodesArray && nodesArray.length > 1) {
        this._hideLine();
        for (var i = 1; i < nodesArray.length; i++) {
          var prevCode = nodesArray[i - 1];
          var currCode = nodesArray[i];
          this.$svg.find(".P" + prevCode + currCode).css("opacity", 1);
          if (i == 1) {
            this.$svg.find(".M" + prevCode).css("opacity", 1);
            this.$svg.find(".S" + prevCode).css("opacity", 1);
          }
          this.$svg.find(".M" + currCode).css("opacity", 1);
          this.$svg.find(".S" + currCode).css("opacity", 1);
        }
        this._isRouteSearching = true;
      }
    },
    _drawLine: function (
      $svg,
      scale,
      rows,
      columns,
      color,
      textClass,
      width,
      nodes,
      reverseMarkers,
      indicatorText,
      lineId
    ) {
      if ($svg) {
        var ds = [];
        var d = "";
        var attr = {
          "stroke-width": width,
        };

        var $group = this._getSvgElement(
          "g",
          "line",
          {
            fill: "none",
            stroke: color,
            "stroke-linejoin": "round",
            "stroke-linecap": "round",
          },
          $svg
        );

        var markers = [];
        var lineNodes = [];
        var node;
        var indicator = [];
        for (node = 0; node < nodes.length; node++) {
          if (nodes[node].marker.indexOf("@") != 0)
            lineNodes[lineNodes.length] = nodes[node];
        }

        var currStationCd = "",
          prevStationCd = "";
        for (var lineNode = 0; lineNode < lineNodes.length; lineNode++) {
          if (!prevStationCd && currStationCd) {
            prevStationCd = currStationCd;
            currStationCd = "";
          }

          var currNode = lineNodes[lineNode];
          if (currNode.nodeType == "indicator")
            indicator.push({
              x: currNode.x,
              y: currNode.y,
              width: currNode.nodeLength,
            });

          if (currNode.changeLineWidth != "")
            attr["stroke-width"] = currNode.changeLineWidth;

          if (!currStationCd) currStationCd = currNode.stationCd;

          if (!d) {
            d = this._moveTo(currNode.x * scale, currNode.y * scale);
            continue;
          } else if (currNode.moveTo != "") {
            d = this._moveTo(
              currNode.moveTo.split(",")[0] * scale,
              currNode.moveTo.split(",")[1] * scale
            );
            prevStationCd = "";
            continue;
          } else {
            var nextNode =
              lineNode + 1 < lineNodes.length ? lineNodes[lineNode + 1] : null;
            var prevNode = lineNode > 0 ? lineNodes[lineNode - 1] : null;
            var postNode = lineNode > 1 ? lineNodes[lineNode - 2] : null;

            if (prevNode == null) console.log(JSON.stringify(currNode));

            // Correction for edges so lines are not running off campus
            var xCorr = 0;
            var yCorr = 0;
            if (currNode.x == 0) xCorr = width / 2;
            if (currNode.x == columns) xCorr = (-1 * width) / 2;
            if (currNode.y == 0) yCorr = width / 2;
            if (currNode.y == rows) yCorr = (-1 * width) / 2;

            var xVal = prevNode.x * scale;
            var yVal = prevNode.y * scale;
            var direction = "";

            var xDiff = Math.round(Math.abs(currNode.x - prevNode.x));
            var yDiff = Math.round(Math.abs(currNode.y - prevNode.y));

            if (xDiff == 0) {
              d += this._verticalTo(currNode.y * scale + yCorr);
            } else if (yDiff == 0) {
              d += this._horizonTo(currNode.x * scale + xCorr);
            } else {
              if (currNode.direction != "") {
                direction = currNode.direction.toLowerCase();
                if (direction == "auto" && nextNode && postNode) {
                  var x1 = postNode.x,
                    x2 = prevNode.x,
                    x3 = currNode.x,
                    x4 = nextNode.x;
                  var y1 = postNode.y,
                    y2 = prevNode.y,
                    y3 = currNode.y,
                    y4 = nextNode.y;
                  if ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4) != 0) {
                    xVal =
                      (((x1 * y2 - y1 * x2) * (x3 - x4) -
                        (x1 - x2) * (x3 * y4 - y3 * x4)) /
                        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))) *
                      scale;
                    yVal =
                      (((x1 * y2 - y1 * x2) * (y3 - y4) -
                        (y1 - y2) * (x3 * y4 - y3 * x4)) /
                        ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4))) *
                      scale;
                  }
                } else {
                  var xDiffVal = scale * (currNode.x - prevNode.x);
                  var yDiffVal = scale * (currNode.y - prevNode.y);
                  var t = 0;
                  switch (direction) {
                    case "e":
                    case "w":
                      t = 100;
                      break;
                    case "sc":
                    case "nc":
                      t = 5;
                      break;
                    case "ec":
                    case "wc":
                      t = 95;
                      break;
                  }
                  xVal = xVal + xDiffVal * (t / 100);
                  yVal = yVal + yDiffVal * ((100 - t) / 100);
                }
                d += this._curveTo(
                  xVal,
                  yVal,
                  currNode.x * scale + xCorr,
                  currNode.y * scale + yCorr
                );
                /*ctx.quadraticCurveTo((currNode.x * scale) + xVal, (currNode.y * scale) + yVal,
																(nextNode.x * scale) + xCorr, (nextNode.y * scale) + yCorr);*/
              } else d += this._lineTo(currNode.x * scale, currNode.y * scale);
            }

            if (
              currStationCd ||
              !nextNode ||
              currNode.nodeType == "indicator"
            ) {
              attr.d = d;
              var classes = "path L" + lineId;
              if (prevStationCd && currStationCd)
                classes +=
                  " P" +
                  prevStationCd +
                  currStationCd +
                  " P" +
                  currStationCd +
                  prevStationCd;

              this._getSvgElement("path", classes, attr, $group);

              if (nextNode) {
                d = this._moveTo(currNode.x * scale, currNode.y * scale);
                prevStationCd = "";
              }
            }
          }

          /*
					
					if ( lineNode == 0  ) {
						d = this._moveTo(currNode.x * scale, currNode.y * scale);
						continue;
					} else if ( currNode.moveTo != "" ) {
						d += this._moveTo(currNode.moveTo.split(",")[0] * scale, currNode.moveTo.split(",")[1] * scale);
						continue;
					}*/
        }

        var $indicatorGroup = this._getSvgElement(
          "g",
          "path L" + lineId,
          null,
          $group
        );
        for (var i in indicator) {
          plugin._drawIndicator(
            $indicatorGroup,
            indicator[i].x,
            indicator[i].y,
            indicator[i].width,
            indicator[i].height,
            scale,
            color,
            indicatorText
          );
        }

        //ctx = this._getSvg(el, true);
      }
    },

    _drawIndicator: function ($group, x, y, width, height, scale, color, text) {
      if (text) {
        width = width ? width : scale * 2;
        height = height ? height : scale * 2;
        var attr2 = {
          x: x * scale - width / 2,
          y: y * scale - height / 2,
          width: width,
          height: height,
          fill: color,
          stroke: color,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          "stroke-width": scale,
        };
        this._getSvgElement("rect", null, attr2, $group);

        var attr1 = {
          x: x * scale,
          y: y * scale + Math.round(height / 3),
          lengthAdjust: "spacingAndGlyphs",
          "text-anchor": "middle",
          style:
            "fill:white; stroke:white; stroke-width:0.6; font-size:" +
            plugin.options.indicatorFontSize +
            "px; font-weight:normal; line-height:" +
            scale * 2 +
            "px",
        };

        if (text.length > 1) {
          attr1.x = x * scale - width / 2;
          attr1["text-anchor"] = "start";
          attr1.textLength = width;
        }
        this._getSvgElement("text", null, attr1, $group).text(text);
      }
    },

    _addSVGClass: function (ob, className) {
      this._addSVGAttrValue(ob, "class", className);
    },

    _addSVGAttrValue: function (ob, attrName, attrValue) {
      if (attrName) {
        $(ob).each(function () {
          var attrs = this.getAttribute(attrName);
          if (attrs && attrValue) {
            attrs = attrs.split(" ");
            var attrValues = attrValue.split(" ");
            for (i = 0; i < attrValues.length; i++) {
              if (attrs.indexOf(attrValues[i]) < 0) attrs.push(attrValues[i]);
            }
            attrValue = attrs.join(" ");
            this.setAttribute(attrName, attrValue);
          }
        });
      }
    },

    _removeSVGClass: function (ob, className) {
      $(ob).each(function () {
        var classes = this.getAttribute("class");
        if (classes && className) {
          classes = classes.split(" ");
          var classNames = className.split(" ");
          for (i = 0; i < classNames.length; i++) {
            var idx = classes.indexOf(classNames[i]);
            if (idx > -1) classes.splice(idx, 1);
          }
          className = classes.join(" ");
          this.setAttribute("class", className);
        }
      });
    },

    _removeSVGAttribute: function (ob, attrName, attrValue) {
      if (attrName) {
        $(ob).each(function () {
          var attrs = this.getAttribute(attrName);
          if (attrs && attrValue) {
            attrs = attrs.split(" ");
            var attrValues = attrValue.split(" ");
            for (i = 0; i < attrValues.length; i++) {
              var idx = attrs.indexOf(attrValues[i]);
              if (idx > -1) attrs.splice(idx, 1);
            }
            attrValue = attrs.join(" ");
            this.setAttribute(attrName, attrValue);
          }
        });
      }
    },

    _SVGhasClass: function (ob, className) {
      var res = false;
      $(ob).each(function () {
        var classes = this.getAttribute("class");
        if (classes && className) {
          classes = classes.split(" ");
          var classNames = className.split(" ");
          for (i = 0; i < classNames.length; i++) {
            if (classes.indexOf(classNames[i]) > -1) {
              res = true;
              break;
            }
          }

          if (res) return false;
        }
      });
      return res;
    },

    _drawMarker: function (
      $group,
      scale,
      color,
      textClass,
      width,
      data,
      reverseMarkers
    ) {
      if (data.label == "") return;
      if (data.marker == "") data.marker = "station";

      // Scale coordinates for rendering
      var x = data.x * scale;
      var y = data.y * scale;

      // Keep it simple -- black on white, or white on black
      var fgColor = color; //"#000000";
      var bgColor = "#ffffff";
      if (reverseMarkers) {
        fgColor = "#ffffff";
        bgColor = color; //"#000000";
      }

      var uid = data.uid;
      if (uid && $("#M" + uid).length > 0) {
        var ob = $("#M" + uid).get(0);
        this._addSVGClass(ob, "M" + data.stationCd + " L" + data.lineId);
        this._addSVGAttrValue(ob, "lineId", data.lineId);
        this._addSVGClass($("#A" + uid).get(0), "A" + data.stationCd);
        return;
      }
      var markerClass = "marker M" + data.stationCd + " L" + data.lineId;

      switch (data.marker.toLowerCase()) {
        case "interchange":
        case "@interchange":
          markerClass += " interchange";

          if (data.markerInfo == "") {
            this._getSvgElement(
              "circle",
              markerClass,
              {
                cx: x,
                cy: y,
                r: width * 0.7,
                id: "M" + data.uid,
                stroke: fgColor,
                "stroke-width": width / 2,
                fill: bgColor,
                uid: data.uid,
                lineId: data.lineId,
              },
              $group
            );
          } else {
            var mType = data.markerInfo.substr(0, 1).toLowerCase() || v;
            var markerPointDir = data.markerPointDir.toLowerCase();
            var mDir = data.markerInfo.substr(1, 2) || "+";
            var colors = plugin.markerColor[data.uid];
            var mSize = colors.length;

            var term = scale;
            var delta = term * (mSize - 1);
            var a = Math.abs(width);
            var $marker = this._getSvgElement(
              "g",
              markerClass,
              {
                cx: x,
                cy: y,
                id: "M" + data.uid,
                uid: data.uid,
                lineId: data.lineId,
              },
              $group
            );
            if (mType == "v") {
              /*ctx.arc(x, y, width * 0.7,0 * Math.PI/180, 180 * Math.PI/180, false);
							ctx.arc(x, y-(width*mSize), width * 0.7,180 * Math.PI/180, 0 * Math.PI/180, false);*/
              var sy = mDir == "-" ? y - delta : y;
              var ey = mDir == "-" ? y : y + delta;
              this._getSvgElement(
                "rect",
                null,
                {
                  x: x - a,
                  y: sy - a,
                  width: 2 * a,
                  height: delta + 2 * a,
                  stroke: "black",
                  "stroke-width": 1,
                  fill: bgColor,
                },
                $marker
              );
            } else {
              /*ctx.arc(x, y, width * 0.7,90 * Math.PI/180, 270 * Math.PI/180, false);
							ctx.arc(x+(width*mSize), y, width * 0.7,270 * Math.PI/180, 90 * Math.PI/180, false);*/
              var sx = mDir == "-" ? x - delta : x;
              var ex = mDir == "-" ? x : x + delta;
              this._getSvgElement(
                "rect",
                null,
                {
                  x: sx - a,
                  y: y - a,
                  width: delta + 2 * a,
                  height: 2 * a,
                  stroke: "black",
                  "stroke-width": 1,
                  fill: bgColor,
                },
                $marker
              );
            }
            var f = mDir == "-" ? -1 : 1;
            for (var i = 0; i < mSize; i++) {
              var k =
                markerPointDir == "b"
                  ? mSize - i - 1
                  : isNaN(markerPointDir)
                  ? i
                  : markerPointDir.length > i
                  ? Number(markerPointDir.substr(i, 1)) - 1
                  : i;
              var px, py;
              if (mType == "v") {
                this._getSvgElement(
                  "circle",
                  null,
                  {
                    cx: x,
                    cy: y + term * k * f,
                    r: a * 0.5,
                    stroke: colors[i],
                    "stroke-width": 1,
                    fill: colors[i],
                  },
                  $marker
                );
              } else {
                this._getSvgElement(
                  "circle",
                  null,
                  {
                    cx: x + term * k * f,
                    cy: y,
                    r: a * 0.5,
                    stroke: colors[i],
                    "stroke-width": 1,
                    fill: colors[i],
                  },
                  $marker
                );
              }
            }
          }
          break;
        case "station":
        case "@station":
          this._getSvgElement(
            "circle",
            markerClass,
            {
              cx: x,
              cy: y,
              r: width * 0.6,
              id: "M" + data.uid,
              stroke: fgColor,
              "stroke-width": 1,
              fill: bgColor,
              uid: data.uid,
              lineId: data.lineId,
            },
            $group
          );
          break;
      }
      this._getSvgElement(
        "circle",
        "accent A" + data.stationCd,
        {
          cx: x,
          cy: y,
          r: width * 1,
          id: "A" + data.uid,
          stroke: "black",
          "stroke-width": 1,
          fill: "red",
          uid: data.uid,
          lineId: data.lineId,
          style: "display:none",
        },
        $group
      );
    },

    _drawGrid: function ($svg, scale, gridNumbers) {
      if ($svg) {
        var d = "";

        scale = scale ? scale : 10;
        for (var x = 0.5; x < this.options.pixelWidth; x += scale) {
          d += this._moveTo(x, 0);
          d += this._verticalTo(this.options.pixelHeight);
        }
        d += this._moveTo(this.options.pixelWidth - 0.5, 0);
        d += this._lineTo(
          this.options.pixelWidth - 0.5,
          this.options.pixelHeight
        );

        for (var y = 0.5; y < this.options.pixelHeight; y += scale) {
          d += this._moveTo(0, y);
          d += this._horizonTo(this.options.pixelWidth);
        }
        d += this._moveTo(0, this.options.pixelHeight - 0.5);
        d += this._lineTo(
          this.options.pixelWidth,
          this.options.pixelHeight - 0.5
        );

        var elAttr = {
          d: d,
          stroke: this.options.gridColor,
          "stroke-width": "1px",
          fill: "none",
        };
        var $path = this._getSvgElement("path", null, elAttr);
        var $group = this._getSvgElement("g", "map-grid", null, $svg).append(
          $path
        );

        if (gridNumbers) {
          var counter = 0;
          for (var x = 0.5; x < this.options.pixelWidth; x += scale * 5) {
            this._getSvgElement(
              "text",
              null,
              { x: x - 15, y: 10, style: "font-size:9px" },
              $group
            )
              .text(counter)
              .appendTo($group);
            counter += 5;
          }
          counter = 0;
          for (var y = 0.5; y < this.options.pixelHeight; y += scale * 5) {
            this._getSvgElement(
              "text",
              null,
              { x: 0, y: y - 15, style: "font-size:9px" },
              $group
            )
              .text(counter)
              .appendTo($group);
            counter += 5;
          }
        }
      }
    },
    _moveTo: function (x, y) {
      return "M " + String(x) + " " + String(y) + " ";
    },
    _lineTo: function (x, y) {
      return "L " + String(x) + " " + String(y) + " ";
    },
    _horizonTo: function (x) {
      return "H " + String(x) + " ";
    },
    _verticalTo: function (y) {
      return "V " + String(y) + " ";
    },
    _curveTo: function (dx, dy, x, y) {
      return (
        "Q " +
        String(dx) +
        " " +
        String(dy) +
        " " +
        String(x) +
        " " +
        String(y) +
        " "
      );
    },

    _checkBrowser: function () {
      "use strict";
      var agent = navigator.userAgent.toLowerCase(),
        name = navigator.appName,
        browser;

      // MS 계열 브라우저를 구분하기 위함.
      if (
        name === "Microsoft Internet Explorer" ||
        agent.indexOf("trident") > -1 ||
        agent.indexOf("edge/") > -1
      ) {
        browser = "ie";
        if (name === "Microsoft Internet Explorer") {
          // IE old version (IE 10 or Lower)
          agent = /msie ([0-9]{1,}[\.0-9]{0,})/.exec(agent);
          browser += parseInt(agent[1]);
        } else {
          // IE 11+
          if (agent.indexOf("trident") > -1) {
            // IE 11
            browser += 11;
          } else if (agent.indexOf("edge/") > -1) {
            // Edge
            browser = "edge";
          }
        }
      } else if (agent.indexOf("safari") > -1) {
        // Chrome or Safari
        if (agent.indexOf("opr") > -1) {
          // Opera
          browser = "opera";
        } else if (agent.indexOf("chrome") > -1) {
          // Chrome
          browser = "chrome";
        } else {
          // Safari
          browser = "safari";
        }
      } else if (agent.indexOf("firefox") > -1) {
        // Firefox
        browser = "firefox";
      }

      return browser;
    },
    _setPositionMarker: function (mid, uid) {
      if (mid) {
        var x = 0,
          y = 0;
        if (uid) {
          x = $(".M" + uid).attr("cx");
          y = $(".M" + uid).attr("cy") - 5;
        }
        $("#" + mid).attr({
          x: x,
          y: y,
        });
      }
    },
    _setPositionCurrentMarker: function (mid, uid) {
      if (mid) {
        var x = 0,
          y = 0;
        if (uid) {
          x = $(".M" + uid).attr("cx");
          y = $(".M" + uid).attr("cy") - 13;
        }
        $("#" + mid).attr({
          x: x,
          y: y,
        });
      }
    },
    _showStation: function (uid) {
      if (uid) {
        this.$svg.find(".S" + uid).show();
        this.$svg.find(".A" + uid).show();
        this.$svg.find(".M" + uid).hide();
      } else {
        this.$svg.find(".line").css("opacity", "1");
        this.$svg.find(".marker").show();
        //this.$svg.find(".accent").hide();
        this.$svg.find(".label").show();
      }
    },
    _hideStation: function (uid) {
      if (uid) {
        this.$svg.find(".S" + uid).hide();
        this.$svg.find(".A" + uid).hide();
        this.$svg.find(".M" + uid).hide();
      } else {
        this.$svg.find(".accent").hide();
        this.$svg.find(".line").css("opacity", "0.3");
        this.$svg.find(".marker").hide();
        this.$svg.find(".label").hide();
      }
    },
    _moveToStation: function (uid, zoom) {
      console.log("movetoStation" + uid + " " + zoom);
      if (uid && typeof uid == "string") {
        var $marker = $(".M" + uid);
        //var cx = $marker.attr("cx"), cy = $marker.attr("cy");
        if (!zoom) zoom = plugin.options.maxZoom;
        var oZoom = this.$svg.data("zoom");
        if (!oZoom || oZoom != zoom * 10) {
          this.$svg
            .css("transform", "scale(" + zoom + ") scaleZ(1)")
            .data("zoom", zoom * 10);
        }

        var obPos = $marker.offset();
        var $el = this.$svg.parent();
        var elPos = $el.offset();
        var cssPos = this.$svg.data("css-position") || {
          top: $el.scrollTop(),
          left: $el.scrollLeft(),
        };
        var left = obPos.left - elPos.left + cssPos.left - $el.width() / 2 - 5,
          top = obPos.top - elPos.top + cssPos.top - $el.height() / 2 - 5;
        if (left < 0) left = 0;
        if (top < 0) top = 0;

        console.log("left:" + left + " top:" + top);

        $el.scrollTop(top).scrollLeft(left);
        this.$svg.data("css-position", { left: left, top: top });
      }
    },
    _moveToDirection: function (direction) {
      console.log("movetoDirection" + direction);
      if (
        direction &&
        typeof direction == "string" &&
        ["up", "down", "left", "right"].indexOf(direction.toLowerCase()) > -1
      ) {
        var cssPos = this.$svg.data("css-position") || {
          top: $el.scrollTop(),
          left: $el.scrollLeft(),
        };
        var $el = this.$svg.parent();
        direction = direction.toLowerCase();
        var moveLength = plugin.options.moveStep * plugin.options.cellSize;
        if (direction == "up") {
          cssPos.top -= moveLength;
          $el.scrollTop(cssPos.top);
        } else if (direction == "down") {
          cssPos.top += moveLength;
          $el.scrollTop(cssPos.top);
        } else if (direction == "left") {
          cssPos.left -= moveLength;
          $el.scrollLeft(cssPos.left);
        } else if (direction == "right") {
          cssPos.left += moveLength;
          $el.scrollLeft(cssPos.left);
        }

        this.$svg.data("css-position", cssPos);
      }
    },
    _zoomin: function () {
      var zoom = plugin.options.maxZoom;
      var oZoom = this.$svg.data("zoom") || 10;
      var zoom = oZoom + plugin.options.scaleStep;
      if (zoom > plugin.options.maxZoom * 10)
        zoom = plugin.options.maxZoom * 10;
      if (oZoom != zoom) {
        this.$svg
          .css("transform", "scale(" + zoom / 10 + ") scaleZ(1)")
          .data("zoom", zoom);
        var $el = this.$svg.parent();
        var cssPos = this.$svg.data("css-position") || {
          top: $el.scrollTop(),
          left: $el.scrollLeft(),
        };
        var w = this.$svg.width(),
          h = this.$svg.height();
        var mX = Math.round((w * plugin.options.scaleStep) / 10);
        var mY = Math.round((h * plugin.options.scaleStep) / 10);
        var left =
          cssPos.left +
          Math.round(
            (mX * (cssPos.left + Math.round(w / 2))) / ((w * oZoom) / 10)
          );
        var top =
          cssPos.top +
          Math.round(
            (mY * (cssPos.top + Math.round(h / 2))) / ((h * oZoom) / 10)
          );
        //var left = w/2*zoom/10 - w/2;
        //var top =  h/2*zoom/10 - h/2;
        $el.scrollTop(top).scrollLeft(left);
        this.$svg.data("css-position", {
          left: $el.scrollLeft(),
          top: $el.scrollTop(),
        });
      }
    },
    _zoomout: function () {
      var zoom = plugin.options.maxZoom;
      var oZoom = this.$svg.data("zoom") || 10;
      var zoom = oZoom - plugin.options.scaleStep;
      if (zoom < plugin.options.minZoom * 10)
        zoom = plugin.options.minZoom * 10;
      if (oZoom != zoom) {
        this.$svg
          .css("transform", "scale(" + zoom / 10 + ") scaleZ(1)")
          .data("zoom", zoom);
        var $el = this.$svg.parent();
        var cssPos = this.$svg.data("css-position") || {
          top: $el.scrollTop(),
          left: $el.scrollLeft(),
        };
        var w = this.$svg.width(),
          h = this.$svg.height();
        var mX = Math.round((w * plugin.options.scaleStep) / 10);
        var mY = Math.round((h * plugin.options.scaleStep) / 10);
        var left =
          cssPos.left -
          Math.round(
            (mX * (cssPos.left + Math.round(w / 2))) / ((w * oZoom) / 10)
          );
        var top =
          cssPos.top -
          Math.round(
            (mY * (cssPos.top + Math.round(h / 2))) / ((h * oZoom) / 10)
          );
        $el.scrollTop(top).scrollLeft(left);
        this.$svg.data("css-position", {
          left: $el.scrollLeft(),
          top: $el.scrollTop(),
        });
      }
    },
  };

  var methods = {
    init: function (options) {
      plugin.options = $.extend({}, plugin.defaults, options);
      //if ( plugin._isMobile() ) plugin.options.moveThreshold = 40;

      plugin.options.browser = plugin._checkBrowser();

      // iterate and reformat each matched element 그러나 하나만 동작하도록 변경함
      return this.each(function (index) {
        var $this = $(this);
        plugin.options = $.meta
          ? $.extend(plugin.options, $this.data())
          : plugin.options;

        //plugin._debug("BEGIN: " + plugin.identity() + " for element " + index);

        plugin._render($this);

        var $defs = plugin._getSvgElement("defs", null, null, plugin.$svg);

        var $defsMarkerStart = plugin._getSvgElement(
          "g",
          null,
          {
            id: "def-marker-start",
          },
          $defs
        );

        var scale = plugin.options.cellSize * 3;
        var pathAttr = {
          stroke: "#005124",
          fill: "#00B050",
          "stroke-width": 1,
          "stroke-linejoin": "round",
          "stroke-linecap": "round",
          d:
            "m 0 0 " +
            "l -" +
            scale / 2 +
            " -" +
            scale / 2 +
            " " +
            "a " +
            (scale * 2) / 3 +
            " " +
            (scale * 2) / 3 +
            " 0 1 1 " +
            scale +
            " 0 " +
            /*"v -"+scale+" " +
							"h "+scale+" " +
							"v "+scale+" " +*/
            "l -" +
            scale / 2 +
            " " +
            scale / 2 +
            " " +
            "z",
        };
        var textAttr = {
          dy: (-scale * 2) / 3 - 3,
          lengthAdjust: "spacingAndGlyphs",
          "text-anchor": "middle",
          style:
            "fill:white; stroke:none; stroke-width:0.5; font-size:" +
            (plugin.options.labelFontSize - 2) +
            "px;",
        };

        plugin._getSvgElement("path", null, pathAttr, $defsMarkerStart);
        plugin
          ._getSvgElement("text", null, textAttr, $defsMarkerStart)
          .text(plugin.options.lang == "ko" ? "출발" : "DPT");

        var $defsMarkerStop = plugin._getSvgElement(
          "g",
          null,
          {
            id: "def-marker-stop",
          },
          $defs
        );

        pathAttr.fill = "#F38103";
        pathAttr.stroke = "#BD6402";
        plugin._getSvgElement("path", null, pathAttr, $defsMarkerStop);
        plugin
          ._getSvgElement("text", null, textAttr, $defsMarkerStop)
          .text(plugin.options.lang == "ko" ? "경유" : "STP");

        var $defsMarkerEnd = plugin._getSvgElement(
          "g",
          null,
          {
            id: "def-marker-end",
          },
          $defs
        );

        pathAttr.fill = "#0000FF";
        pathAttr.stroke = "#000086";
        plugin._getSvgElement("path", null, pathAttr, $defsMarkerEnd);
        plugin
          ._getSvgElement("text", null, textAttr, $defsMarkerEnd)
          .text(plugin.options.lang == "ko" ? "도착" : "ARV");

        var $defsMarkerCurrent = plugin._getSvgElement(
          "g",
          null,
          {
            id: "def-marker-current",
          },
          $defs
        );

        pathAttr.fill = "#a62b1f";
        pathAttr.stroke = "#8a1e15";
        plugin._getSvgElement("path", null, pathAttr, $defsMarkerCurrent);
        plugin
          ._getSvgElement("text", null, textAttr, $defsMarkerCurrent)
          .text(plugin.options.lang == "ko" ? "현위치" : "Current");

        plugin._getSvgElement(
          "use",
          null,
          {
            id: "marker-start",
            class: "routeMarker",
            href: "#def-marker-start",
          },
          plugin.$svg
        );

        plugin._getSvgElement(
          "use",
          null,
          {
            id: "marker-stop",
            class: "routeMarker",
            href: "#def-marker-stop",
          },
          plugin.$svg
        );

        plugin._getSvgElement(
          "use",
          null,
          {
            id: "marker-end",
            class: "routeMarker",
            href: "#def-marker-end",
          },
          plugin.$svg
        );
        plugin._getSvgElement(
          "use",
          null,
          {
            id: "marker-current",
            class: "routeMarker",
            href: "#def-marker-current",
          },
          plugin.$svg
        );

        plugin.$svg
          .on("mouseover", ".marker", function () {
            var op = this.style.opacity;
            if (op && op < 1) return;

            this.style.cursor = "pointer";
            //this.style['transform-origin'] = '50% 50% 0';
            /*var zoom = (plugin._SVGhasClass(this, "interchange") ? 1.5 : 2);
					this.setAttribute("transform-origin", "100% 100% 0");
					this.setAttribute("transform", "scale("+ zoom + ")");*/
            if ($(this).attr("class").indexOf("interchange") < 0) {
              this.setAttribute("r", Number(this.getAttribute("r")) * 2);
            } else {
              var zoom = 1.5;
              this.style["transform-origin"] =
                this.getAttribute("cx") +
                "px " +
                this.getAttribute("cy") +
                "px 0";
              this.style["transform"] = "scale(" + zoom + ")";
            }
          })
          .on("mouseout", ".marker", function () {
            var op = this.style.opacity;
            if (op && op < 1) return;

            this.removeAttribute("style");
            if ($(this).attr("class").indexOf("interchange") < 0) {
              this.setAttribute("r", Number(this.getAttribute("r")) / 2);
            } else {
            }
          })
          .on("click touchstart", ".marker", function () {
            plugin.options.onStationClick.apply(this, arguments);
          })
          .on("click touchstart", ".label", function () {
            var uid = $(this).attr("uid");
            var $s = $(".M" + uid);
            plugin.options.onStationClick.apply($s.get(0), arguments);
          });

        return false; // 하나만 동작
      });
    },
    drawLine: function (data) {
      plugin._drawLine(
        data.element,
        data.scale,
        data.rows,
        data.columns,
        data.color,
        data.width,
        data.nodes
      );
    },
    isMobile: function () {
      return plugin._isMobile();
    },
    showLine: function (lineId) {
      plugin._showLine(lineId);
    },
    hideLine: function (lineId) {
      plugin._hideLine(lineId);
    },
    showRoute: function (nodesArray) {
      plugin._showRoute(nodesArray);
    },
    setMarkerStart: function (uid) {
      plugin._setPositionMarker("marker-start", uid);
    },
    setMarkerStop: function (uid) {
      plugin._setPositionMarker("marker-stop", uid);
    },
    setMarkerEnd: function (uid) {
      plugin._setPositionMarker("marker-end", uid);
    },
    setMarkerCurrent: function (uid) {
      plugin._setPositionCurrentMarker("marker-current", uid);
    },
    showStation: function (lineId) {
      plugin._showStation(lineId);
    },
    hideStation: function (lineId) {
      plugin._hideStation(lineId);
    },
    getPlugin: function () {
      return plugin;
    },
    moveToStation: function (uid, zoom, callback) {
      console.log("movetodirection");
      plugin._moveToStation(uid, zoom);
      if (typeof callback == "function") callback();
    },
    moveToDirection: function (Direction, callback) {
      console.log("movetodirectioncallback");
      plugin._moveToDirection(Direction);
      if (typeof callback == "function") callback();
    },
    zoomin: function (callback) {
      plugin._zoomin();
      if (typeof callback == "function") callback();
    },
    zoomout: function (callback) {
      plugin._zoomout();
      if (typeof callback == "function") callback();
    },
  };

  $.fn.subwayMap = function (method) {
    // Method calling logic
    if (methods[method]) {
      return methods[method].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    } else if (typeof method === "object" || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error("Method " + method + " does not exist on jQuery.tooltip");
    }
  };
})(jQuery);

function setStyle(node, att, val, style) {
  style = style || node.style;

  if (style) {
    if (val === null || val === "") {
      // normalize unsetting
      val = "";
    } else if (!isNaN(Number(val)) && att !== "z-index") {
      // number values may need a unit
      val += "px";
    }

    if (att === "") {
      att = "cssText";
      val = "";
    }
    style[att] = val;
  }
}
function setStyles($el, hash) {
  const HAS_CSSTEXT_FEATURE = typeof $el.style.cssText !== "undefined";
  function trim(str) {
    return str.replace(/^\s+|\s+$/g, "");
  }
  let originStyleText;
  const originStyleObj = {};
  if (!!HAS_CSSTEXT_FEATURE) {
    originStyleText = $el.style.cssText;
  } else {
    originStyleText = $el.getAttribute("style");
  }
  originStyleText.split(";").forEach((item) => {
    if (item.indexOf(":") !== -1) {
      const obj = item.split(":");
      originStyleObj[trim(obj[0])] = trim(obj[1]);
    }
  });

  const styleObj = {};
  Object.keys(hash).forEach((item) => {
    setStyle($el, item, hash[item], styleObj);
  });
  const mergedStyleObj = Object.assign({}, originStyleObj, styleObj);
  const styleText = Object.keys(mergedStyleObj)
    .map((item) => item + ": " + mergedStyleObj[item] + ";")
    .join(" ");

  if (!!HAS_CSSTEXT_FEATURE) {
    $el.style.cssText = styleText;
  } else {
    $el.setAttribute("style", styleText);
  }
}
