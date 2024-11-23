// line.js를 이용한 데이터 > 엘리먼트화 및 정렬/파싱
async function loadJSON(file) {
  const xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");

  return new Promise((resolve, reject) => {
    xobj.open("GET", file, true);

    xobj.onreadystatechange = function () {
      if (xobj.readyState === 4) {
        if (xobj.status === 200) {
          resolve(xobj.responseText);
        } else {
          reject(
            new Error(`Failed to load file: ${file}, status: ${xobj.status}`)
          );
        }
      }
    };

    xobj.send(null);
  });
}

var pageAction = "";
var $map = $(".subway-map").eq(0);
var $icons = $(".mapInfo");
var $panel = $("#select-panel");
var stations = {},
  allStations = {},
  names = {};
var lines = {};

(async function () {
  const data = await loadJSON("/static/lines.json");
  lines = JSON.parse(data);
  window.lines = lines;

  $.each(lines, function (no, e) {
    e["attr"]["data-indicator-text"] = e["attr"]["data-indicator-text"];
    var $ul = $("<ul/>").attr(e["attr"]).attr("data-line-id", no);
    for (var i in e["stations"]) {
      var station = e["stations"][i];
      if (typeof station == "object") {
        var $li = $("<li/>");
        for (var a in station) {
          var attr = station[a];
          if (a == "data-coords" || a == "data-moveTo") {
            var arr = attr.split(",");
            attr = String(Number(arr[0])) + "," + String(Number(arr[1]));
            //station[a] = attr;
          }
          $li.attr(a, attr);
        }

        if (station["station-nm"]) {
          var uid = station["data-uid"];
          var stationId = station["station-cd"];
          var icon = $icons
            .find("li[data-line-id='" + no + "']")
            .children("img")
            .clone()
            .wrap("<div/>")
            .parent()
            .html();
          var oName = station["station-nm"].replace(/\s/g, "");
          var sName = station["sub-nm"]
            ? ("(" + station["sub-nm"] + ")").replace(/\s/g, "")
            : "";
          var name = oName;
          if (sName) name += sName;
          if (stations[uid]) stations[uid].icon += icon;
          else {
            stations[uid] = {
              uid: uid,
              name: name,
              oName: oName,
              sName: sName,
              icon: icon,
              lineId: no,
            };
          }
          allStations[stationId] = {
            uid: uid,
            name: name,
            oName: oName,
            sName: sName,
            lineId: no,
          };

          if (names[no]) names[no] = names[no] + ", " + oName;
          else names[no] = oName;
        }

        $li.text(station["station-nm"]);
        $ul.append($li);
      }
    }
    $map.append($ul);
  });

  if (!$.isEmptyObject(names)) {
    for (var i in names) {
      $icons
        .find("li[data-line-id='" + i + "']")
        .children(".mapInfoText")
        .text(names[i]);
    }
  }

  // 노선도 생성
  var clickedStation = null;
  $(".subway-map").subwayMap({
    debug: false,
    grid: false,
    gridNumbers: false,
    labelFontSize: "9",
    lang: "ko",
    labelLetterSpacing: "-1",
    moveStep: 5,
    onStationClick: function (e) {
      clickedStation = { ob: this, e: e };
    },
    onMouseWheel: function () {
      $("#select-panel").hide();
    },
    /* onMouseDown:function(e) {
        if ( e.target.tagName.toLowerCase() != "button" ) $("#select-panel").hide();
    }, */
    onClick: function () {
      if (clickedStation) {
        ob = clickedStation.ob;
        e = clickedStation.e;

        if (ob.style.opacity && ob.style.opacity != "1") return;

        var $el = $(".subway-map");

        var pw = $panel.width(),
          ph = $panel.height();
        var obPos = $(ob).offset();
        var elPos = $el.offset();
        var left = obPos.left - elPos.left - pw / 2,
          top = obPos.top - elPos.top - ph - 30;

        var mw = $el.width();

        left = left < 20 ? 20 : left + pw + 20 > mw ? mw - pw - 20 : left;
        top = top < 20 ? 20 : top;

        var uid = ob.getAttribute("uid");

        ////////////////////////////////////
        ///////// 김포라인 클릭금지/////////
        ////////////////////////////////////
        /*
            if(uid == '4928' || uid == '4927' || uid == '4926' || uid == '4925' || uid == '4924' || uid == '4923' || uid == '4922' || uid == '4921' || uid == '4920'){
                var gimpoConfirm = confirm('김포 도시철도의 역 정보 및 열차시각은 운영사 홈페이지를 통해 제공하고 있습니다. 이동하시겠습니까?');
                if(gimpoConfirm){
                    clickedStation = null;
                    window.open("http://www.gimpogoldline.com/?page_id=489", "_blank");
                    return false;
                }else{
                    clickedStation = null;
                    return false;
                }
            }
            */
        /*
            if(uid == '2563' || uid == '2564') {
                alert("5호선 하남연장 구간의 경로탐색 및 시간표 제공을 준비중입니다.\n8월 14일부터 제공예정이며 이용에 불편을 드려 죄송합니다.");
                return false;
            }
            */
        ////////////////////////////////////

        $panel.find(".name").text(stations[uid].name);
        $panel.find(".icon").empty().html(stations[uid].icon);

        $panel
          .data("uid", uid)
          .css({
            left: (left + $el.scrollLeft()).toFixed(0) + "px",
            top: (top + $el.scrollTop()).toFixed(0) + "px",
          })
          .show(1, function () {
            $(this).find("button").eq(0).focus();
          }); //;
        //$panel.find("a:first-child").focus();
        //$panel.find("button:first-child").focus();
        var dummyX = Math.abs(obPos.left - elPos.left - left - 1);
        dummyX = dummyX > pw - 20 ? pw - 20 : dummyX < 20 ? 20 : dummyX;
        $panel.find(".dummy").css("left", dummyX + "px");

        clickedStation = null;
      } else {
        $("#select-panel").hide();
      }
      return false;
    },
  });
})();

String.prototype.toCurrency = function () {
  var step = this.length % 3;
  var res = "";
  for (var i = 0; i < this.length; i++) {
    if (i == step) {
      if (i > 0 && i) res += ",";
      step += 3;
    }
    res += this.charAt(i);
  }
  return res;
};
String.prototype.toTime = function () {
  var res = "";
  if (this.length > 3) {
    res = this.substring(0, 2) + ":" + this.substring(2, 4);
  }
  return res;
};
String.prototype.toDayKind = function () {
  var res = "";
  if (this == "WEEKDAY") res = "평일";
  else if (this == "SATURDAY") res = "토요일";
  else if (this == "SUNDAY") res = "공휴일";
  return res;
};
String.prototype.toWeekTag = function () {
  var res = "";
  if (this == "WEEKDAY") res = "1";
  else if (this == "SATURDAY") res = "2";
  else if (this == "SUNDAY") res = "3";
  return res;
};
String.prototype.toLineId = function () {
  var cases = {};
  cases["kong"] = "A";
  cases["in2"] = "I2";
  cases["in"] = "I";
  cases["suin"] = "SU";
  cases["kyung"] = "K";
  cases["chun"] = "G";
  cases["ujb"] = "U";
  cases["bun"] = "B";
  cases["sinbun"] = "S";
  cases["yongin"] = "E";
  cases["kyeongkang"] = "KK";
  cases["우이신설경전철"] = "W";
  cases["서해선"] = "SH";
  cases["김포도시철도"] = "KP";
  cases["신림선"] = "SL";
  cases["GTX-A"] = "GA";
  return cases[this] || this;
};
String.prototype.toLineName = function () {
  var cases = {};

  cases["1"] = "1호선";
  cases["2"] = "2호선";
  cases["3"] = "3호선";
  cases["4"] = "4호선";
  cases["5"] = "5호선";
  cases["6"] = "6호선";
  cases["7"] = "7호선";
  cases["8"] = "8호선";
  cases["9"] = "9호선";
  cases["kong"] = "공항철도";
  cases["in2"] = "인천2호선";
  cases["in"] = "인천1호선";
  cases["suin"] = "수인분당선";
  cases["kyung"] = "경의중앙선";
  cases["chun"] = "경춘선";
  cases["ujb"] = "의정부경전철";
  cases["bun"] = "분당선";
  cases["sinbun"] = "신분당선";
  cases["yongin"] = "용인경전철";
  cases["kyeongkang"] = "경강선";

  return cases[this] || this;
};
String.prototype.toLineEnName = function () {
  var cases = {};
  cases["1"] = "Line1";
  cases["2"] = "Line2";
  cases["3"] = "Line3";
  cases["4"] = "Line4";
  cases["5"] = "Line5";
  cases["6"] = "Line6";
  cases["7"] = "Line7";
  cases["8"] = "Line8";
  cases["9"] = "Line9";
  cases["kong"] = "Airport Railroad";
  cases["in2"] = "Incheon2";
  cases["in"] = "Incheon1";
  cases["suin"] = "Suin-Bundang";
  cases["kyung"] = "Gyeongui-Joungang";
  cases["chun"] = "GyeongChun";
  cases["ujb"] = "Uijeongbu Lrt";
  cases["bun"] = "Bundang";
  cases["sinbun"] = "Sinbundang";
  cases["yongin"] = "Everline";
  cases["kyeongkang"] = "Gyeonggang";
  cases["우이신설경전철"] = "Wooe-Sinseul Lrt";
  cases["서해선"] = "Seohae Line";
  cases["김포도시철도"] = "Gimpo Lrt";
  cases["신림선"] = "Sillim Lrt";
  return cases[this] || this;
};

function initStation(force) {
  if ($(".footer").find(".on").length > 0 || force) {
    $(".footer").find(".on").removeClass("on");
    $.fn.subwayMap("showStation");
  }
}

function initLine(force) {
  if ($(".mapInfo").find(".on").length > 0 || force) {
    $(".mapInfo").find(".on").removeClass("on");
    $.fn.subwayMap("showLine");
  }
}
////////////////////////////////////////////////////// 광명역구분 함수 / 초로 변환해주는 함수 / 시간으로 변환해 주는 함수 EX) 131000
function isGwangmyung(endStationCode) {
  var gwangmyung = false;
  if (endStationCode == "1750") {
    gwangmyung = true;
  }
  return gwangmyung;
}
function transeSecond(time) {
  var returnValue = 0;
  var sTime = time.substring(0, 2) * 60 * 60;
  var sMinute = time.substring(2, 4) * 60;
  var sSec = time.substring(4, 6);
  returnValue = Number(sTime) + Number(sMinute) + Number(sSec);
  return returnValue;
}

function humanReadable(seconds) {
  var pad = function (x) {
    return x < 10 ? "0" + x : x;
  };
  var value =
    pad(parseInt(seconds / (60 * 60))) +
    "" +
    pad(parseInt((seconds / 60) % 60)) +
    "" +
    pad(seconds % 60);
  return value;
}
