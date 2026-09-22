/* Ritaren och smakprovet.
 *
 * Det här är en ritare, ingenting mer. Uppgifterna kommer färdiga ur
 * assets/puzzles.json, exporterade från MatrixCore med `swift run
 * matrix-export`. Ingen regel, ingen generator och ingen validering finns
 * här. Geometrin speglar MatrixRender/FigureGeometry.swift: samma rum på
 * 100 × 100, samma radier, samma lägen. */
(function () {
  "use strict";

  /* ---- Geometri, speglar FigureGeometry.swift ------------------------ */

  var sizeScale = [0.50, 0.64, 0.78, 0.92, 1.06];
  var baseRadius = { 1: 20, 2: 10.5, 3: 10, 4: 10, 5: 8 };
  var layout = {
    1: [[50, 50]],
    2: [[35, 50], [65, 50]],
    3: [[50, 37], [37, 62], [63, 62]],
    4: [[38, 38], [62, 38], [38, 62], [62, 62]],
    5: [[36, 36], [64, 36], [50, 50], [36, 64], [64, 64]]
  };
  var slots = [[19, 19], [50, 15], [81, 19], [85, 50], [81, 81], [50, 85], [19, 81], [15, 50]];
  var segments = [
    [[10, 10], [90, 10]], [[90, 10], [90, 90]], [[90, 90], [10, 90]], [[10, 90], [10, 10]],
    [[10, 10], [26, 26]], [[90, 10], [74, 26]], [[90, 90], [74, 74]], [[10, 90], [26, 74]]
  ];

  function clearance(count) {
    var centers = layout[count];
    if (!centers || centers.length < 2) return null;
    var nearest = Infinity;
    for (var i = 0; i < centers.length; i++) {
      for (var j = i + 1; j < centers.length; j++) {
        var dx = centers[i][0] - centers[j][0], dy = centers[i][1] - centers[j][1];
        nearest = Math.min(nearest, Math.sqrt(dx * dx + dy * dy));
      }
    }
    return nearest / 2 - 1.6;
  }

  function polygon(sides, radius, offset) {
    var points = [];
    for (var i = 0; i < sides; i++) {
      var a = (offset + i * 360 / sides) * Math.PI / 180;
      points.push([radius * Math.cos(a), radius * Math.sin(a)]);
    }
    return points;
  }

  function star(count, outer, inner) {
    var points = [];
    for (var i = 0; i < count * 2; i++) {
      var r = i % 2 === 0 ? outer : inner;
      var a = (-90 + i * 180 / count) * Math.PI / 180;
      points.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    return points;
  }

  function arc(cx, cy, radius, from, to, steps) {
    steps = steps || 48;
    var points = [];
    for (var s = 0; s <= steps; s++) {
      var a = from + (to - from) * s / steps;
      points.push([cx + radius * Math.cos(a), cy + radius * Math.sin(a)]);
    }
    return points;
  }

  function bezier(p0, p1, p2, p3, steps) {
    var points = [];
    for (var s = 1; s <= steps; s++) {
      var t = s / steps, u = 1 - t;
      points.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]
      ]);
    }
    return points;
  }

  /* Formen som en sluten polylinje kring origo, eller en cirkel. */
  function outline(shape, r) {
    switch (shape) {
      case "circle": return { circle: r };
      case "square": { var s = r * 1.62 / 2; return { points: [[-s, -s], [s, -s], [s, s], [-s, s]] }; }
      case "triangle": return { points: polygon(3, r * 1.30, -90) };
      case "diamond": return { points: polygon(4, r * 1.20, -90) };
      case "pentagon": return { points: polygon(5, r * 1.12, -90) };
      case "hexagon": return { points: polygon(6, r * 1.10, 0) };
      case "heptagon": return { points: polygon(7, r * 1.08, -90) };
      case "octagon": return { points: polygon(8, r * 1.07, 22.5) };
      case "star": return { points: star(5, r * 1.25, r * 0.52) };
      case "cross": {
        var a = r * 0.42, b = r * 1.18;
        return { points: [[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]] };
      }
      case "arrow": {
        var k = r * 1.20;
        return { points: [[0, -1], [0.72, -0.08], [0.27, -0.08], [0.27, 1], [-0.27, 1], [-0.27, -0.08], [-0.72, -0.08]].map(function (p) { return [p[0] * k, p[1] * k]; }) };
      }
      case "heart": {
        var h = r * 1.15;
        var pts = [[0, 0.95 * h]];
        pts = pts.concat(bezier([0, 0.95 * h], [-0.62 * h, 0.42 * h], [-h, 0.14 * h], [-h, -0.28 * h], 16));
        pts = pts.concat(arc(-0.5 * h, -0.28 * h, 0.5 * h, Math.PI, 2 * Math.PI, 24).slice(1));
        pts = pts.concat(arc(0.5 * h, -0.28 * h, 0.5 * h, Math.PI, 2 * Math.PI, 24).slice(1));
        pts = pts.concat(bezier([h, -0.28 * h], [h, 0.14 * h], [0.62 * h, 0.42 * h], [0, 0.95 * h], 16));
        return { points: pts };
      }
      case "crescent": {
        var outer = r * 1.06, inner = outer * 0.82, offset = outer * 0.42;
        var cut = (outer * outer - inner * inner + offset * offset) / (2 * offset);
        var height = Math.sqrt(outer * outer - cut * cut);
        var outerAngle = Math.atan2(height, cut), innerAngle = Math.atan2(height, cut - offset);
        return { points: arc(0, 0, outer, outerAngle, 2 * Math.PI - outerAngle).concat(arc(offset, 0, inner, -innerAngle, innerAngle - 2 * Math.PI)) };
      }
      case "trapezoid": {
        var top = r * 0.62, bottom = r * 1.24, hh = r * 0.96;
        return { points: [[-top, -hh], [top, -hh], [bottom, hh], [-bottom, hh]] };
      }
      default: return { circle: r };
    }
  }

  /* Formen placerad i rummet: roterad medurs och flyttad till center. */
  function place(shape, center, r, degrees) {
    var o = outline(shape, r);
    if (o.circle) return { circle: o.circle, cx: center[0], cy: center[1], box: [-o.circle, -o.circle, o.circle, o.circle] };
    var a = degrees * Math.PI / 180, cos = Math.cos(a), sin = Math.sin(a);
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    var points = o.points.map(function (p) {
      var x = p[0] * cos - p[1] * sin, y = p[0] * sin + p[1] * cos;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      return [x + center[0], y + center[1]];
    });
    return { points: points, box: [minX, minY, maxX, maxY] };
  }

  function pathData(figure) {
    if (figure.circle) {
      var r = figure.circle, cx = figure.cx, cy = figure.cy;
      return "M" + f(cx - r) + "," + f(cy) + "a" + f(r) + "," + f(r) + " 0 1,0 " + f(2 * r) + ",0a" + f(r) + "," + f(r) + " 0 1,0 " + f(-2 * r) + ",0Z";
    }
    return "M" + figure.points.map(function (p) { return f(p[0]) + "," + f(p[1]); }).join("L") + "Z";
  }

  function f(n) { return Math.round(n * 100) / 100; }

  /* ---- Ritaren, speglar CellView.swift ------------------------------- */

  var clipCounter = 0;

  function paint(d, fill) {
    switch (fill) {
      case "solid": return '<path d="' + d + '" class="ink"/>';
      case "striped": return '<path d="' + d + '" class="paper"/><path d="' + d + '" fill="url(#mx-stripes)"/>';
      case "dotted": return '<path d="' + d + '" class="paper"/><path d="' + d + '" fill="url(#mx-dots)"/>';
      default: return '<path d="' + d + '" class="paper"/>';
    }
  }

  function paintPartially(d, box, percent) {
    var out = '<path d="' + d + '" class="paper"/>';
    if (percent <= 0) return out;
    var id = "mx-clip-" + (++clipCounter);
    var height = (box[3] - box[1]) * percent / 100;
    out += '<clipPath id="' + id + '"><path d="' + d + '"/></clipPath>';
    out += '<rect x="' + f(box[0]) + '" y="' + f(box[3] - height) + '" width="' + f(box[2] - box[0]) + '" height="' + f(height) + '" class="ink" clip-path="url(#' + id + ')"/>';
    return out;
  }

  function renderCell(cell) {
    var out = '<svg viewBox="0 0 100 100" aria-hidden="true">';
    if (cell.lines) {
      var d = "";
      for (var i = 0; i < segments.length; i++) {
        if (cell.lines & (1 << i)) {
          d += "M" + segments[i][0].join(",") + "L" + segments[i][1].join(",");
        }
      }
      out += '<path d="' + d + '" class="stroke" stroke-width="2.4" stroke-linecap="round"/>';
    }
    if (cell.shape) {
      var count = cell.count || 1;
      var sizeLevel = cell.size || 3;
      var degrees = cell.rotation || 0;
      var fill = cell.fill || "empty";
      var radius = (baseRadius[count] || 12) * sizeScale[Math.max(0, Math.min(4, sizeLevel - 1))];
      var room = clearance(count);
      if (room !== null) {
        var probe = place(cell.shape, [0, 0], radius, degrees).box;
        var extent = Math.max(probe[2] - probe[0], probe[3] - probe[1]) / 2;
        if (extent > room) radius *= room / extent;
      }
      var centers = layout[count] || [[50, 50]];
      for (var c = 0; c < centers.length; c++) {
        var figure = place(cell.shape, centers[c], radius, degrees);
        var d2 = pathData(figure);
        var box = [figure.box[0] + centers[c][0], figure.box[1] + centers[c][1], figure.box[2] + centers[c][0], figure.box[3] + centers[c][1]];
        if (typeof cell.fillRatio === "number") out += paintPartially(d2, box, cell.fillRatio);
        else out += paint(d2, fill);
        out += '<path d="' + d2 + '" class="stroke" stroke-width="2.2" stroke-linejoin="round"/>';
        if (cell.innerShape) {
          var inner = place(cell.innerShape, centers[c], radius * 0.44, 0);
          var d3 = pathData(inner);
          out += paint(d3, cell.innerFill || "solid");
          out += '<path d="' + d3 + '" class="stroke" stroke-width="1.8" stroke-linejoin="round"/>';
        }
      }
    }
    if (typeof cell.position === "number") {
      var p = slots[cell.position];
      out += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4.2" class="ink"/>';
    }
    return out + "</svg>";
  }

  /* Hålet i matrisen: skraffering och ett frågetecken, så att det syns utan färg. */
  function renderMissing() {
    var d = "";
    for (var x = -100; x < 100; x += 9) d += "M" + x + ",100L" + (x + 100) + ",0";
    return '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="' + d + '" class="stroke" stroke-width="1" opacity="0.10"/>' +
      '<text x="50" y="50" text-anchor="middle" dominant-baseline="central" font-size="30" font-weight="500" fill="currentColor" opacity="0.45" font-family="inherit">?</text></svg>';
  }

  /* Mönstren som fyllnaderna refererar till. Ett defs-block per dokument räcker. */
  function installDefs() {
    if (document.getElementById("mx-defs")) return;
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "mx-defs");
    svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
    svg.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML =
      '<defs>' +
      '<pattern id="mx-stripes" patternUnits="userSpaceOnUse" width="6" height="6">' +
      '<path d="M-1,7L7,-1M-1,1L1,-1M5,7L7,5" stroke="currentColor" stroke-width="1.6" fill="none"/></pattern>' +
      '<pattern id="mx-dots" patternUnits="userSpaceOnUse" width="6" height="12">' +
      '<circle cx="0" cy="0" r="1.1" fill="currentColor"/><circle cx="6" cy="0" r="1.1" fill="currentColor"/>' +
      '<circle cx="3" cy="6" r="1.1" fill="currentColor"/>' +
      '<circle cx="0" cy="12" r="1.1" fill="currentColor"/><circle cx="6" cy="12" r="1.1" fill="currentColor"/></pattern>' +
      '</defs>';
    document.body.insertBefore(svg, document.body.firstChild);
    var style = document.createElement("style");
    style.textContent = ".paper{fill:var(--card)}.ink{fill:currentColor}.stroke{fill:none;stroke:currentColor}";
    document.head.appendChild(style);
  }

  /* ---- Smakprovet ------------------------------------------------------ */

  var texts = {
    sv: {
      task: "Uppgift {n} av {total}", level: "Nivå {l}",
      correct: "Rätt", wrong: "Fel. Rätt svar är {letter}",
      next: "Nästa uppgift", restart: "Börja om",
      rulesLabel: "Regler i uppgiften:",
      optionLabel: "Alternativ {letter}",
      doneTitle: "Det var smakprovet",
      doneBody: "{correct} av {total} rätt. I appen tar uppgifterna aldrig slut, och nivån följer dig.",
      loadError: "Uppgifterna kunde inte läsas in."
    },
    en: {
      task: "Task {n} of {total}", level: "Level {l}",
      correct: "Correct", wrong: "Wrong. The correct answer is {letter}",
      next: "Next task", restart: "Start over",
      rulesLabel: "Rules in this task:",
      optionLabel: "Option {letter}",
      doneTitle: "That was the sample",
      doneBody: "{correct} of {total} correct. In the app the tasks never run out, and the level follows you.",
      loadError: "The tasks could not be loaded."
    }
  };

  function t(lang, key, values) {
    var s = (texts[lang] || texts.sv)[key] || key;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return values && k in values ? values[k] : "{" + k + "}"; });
  }

  var letters = ["A", "B", "C", "D", "E", "F"];

  function Sample(root, lang) {
    this.root = root;
    this.lang = lang;
    this.index = 0;
    this.score = 0;
    this.puzzles = [];
  }

  Sample.prototype.load = function (url) {
    var self = this;
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      self.puzzles = data.puzzles;
      self.render();
    }).catch(function () {
      self.root.querySelector(".sample-body").innerHTML = '<p class="caption">' + t(self.lang, "loadError") + "</p>";
    });
  };

  Sample.prototype.render = function () {
    var self = this;
    var body = this.root.querySelector(".sample-body");
    if (this.index >= this.puzzles.length) {
      body.innerHTML =
        '<div class="verdict"><h3>' + t(this.lang, "doneTitle") + "</h3><p>" +
        t(this.lang, "doneBody", { correct: this.score, total: this.puzzles.length }) + "</p></div>" +
        '<div class="sample-actions"><button type="button" class="button secondary wide" data-action="restart">' + t(this.lang, "restart") + "</button></div>";
      body.querySelector("[data-action=restart]").addEventListener("click", function () {
        self.index = 0; self.score = 0; self.render();
      });
      return;
    }
    var puzzle = this.puzzles[this.index];
    var html = '<div class="sample-head"><strong>' + t(this.lang, "task", { n: this.index + 1, total: this.puzzles.length }) +
      "</strong><span>" + t(this.lang, "level", { l: puzzle.level }) + "</span></div>";
    html += '<div class="matrix" role="img">';
    for (var i = 0; i < 9; i++) {
      html += '<div class="cell" data-cell="' + i + '">' + (puzzle.cells[i] ? renderCell(puzzle.cells[i]) : renderMissing()) + "</div>";
    }
    html += "</div>";
    html += '<ul class="options">';
    for (var o = 0; o < puzzle.options.length; o++) {
      html += '<li><button type="button" class="option" data-option="' + o + '" aria-label="' + t(this.lang, "optionLabel", { letter: letters[o] }) + '">' +
        '<span class="letter">' + letters[o] + "</span>" + renderCell(puzzle.options[o]) + "</button></li>";
    }
    html += "</ul>";
    html += '<div class="verdict hidden"></div><div class="sample-actions hidden"></div>';
    body.innerHTML = html;
    var buttons = body.querySelectorAll(".option");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].addEventListener("click", function (event) {
        self.answer(parseInt(event.currentTarget.getAttribute("data-option"), 10));
      });
    }
  };

  Sample.prototype.answer = function (chosen) {
    var self = this;
    var puzzle = this.puzzles[this.index];
    var body = this.root.querySelector(".sample-body");
    var correct = chosen === puzzle.answer;
    if (correct) this.score += 1;
    var buttons = body.querySelectorAll(".option");
    for (var b = 0; b < buttons.length; b++) {
      buttons[b].disabled = true;
      var index = parseInt(buttons[b].getAttribute("data-option"), 10);
      if (index === puzzle.answer) {
        buttons[b].classList.add("correct");
        buttons[b].insertAdjacentHTML("beforeend", '<span class="mark" aria-hidden="true">✓</span>');
      } else if (index === chosen) {
        buttons[b].classList.add("wrong");
        buttons[b].insertAdjacentHTML("beforeend", '<span class="mark" aria-hidden="true">✕</span>');
      }
    }
    var hole = body.querySelector('[data-cell="8"]');
    hole.innerHTML = renderCell(puzzle.options[puzzle.answer]);
    hole.classList.add("revealed");

    var lines = puzzle.explanations[this.lang] || puzzle.explanations.sv;
    var names = puzzle.ruleNames[this.lang] || puzzle.ruleNames.sv;
    var verdict = body.querySelector(".verdict");
    verdict.classList.remove("hidden");
    verdict.classList.add(correct ? "correct" : "wrong");
    verdict.innerHTML = "<h3><span class=\"badge\" aria-hidden=\"true\">" + (correct ? "✓" : "✕") + "</span>" +
      (correct ? t(this.lang, "correct") : t(this.lang, "wrong", { letter: letters[puzzle.answer] })) + "</h3>" +
      "<ul>" + lines.map(function (l) { return "<li>" + escapeHtml(l) + "</li>"; }).join("") + "</ul>" +
      '<p class="caption rules">' + t(this.lang, "rulesLabel") + " " + names.map(escapeHtml).join(", ") + "</p>";
    var actions = body.querySelector(".sample-actions");
    actions.classList.remove("hidden");
    actions.innerHTML = '<button type="button" class="button primary wide" data-action="next">' + t(this.lang, "next") + "</button>";
    actions.querySelector("[data-action=next]").addEventListener("click", function () {
      self.index += 1;
      self.render();
      self.root.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  }

  /* ---- Start ------------------------------------------------------------ */

  function start() {
    installDefs();
    var lang = (document.documentElement.lang || "sv").slice(0, 2);
    var roots = document.querySelectorAll("[data-sample]");
    for (var i = 0; i < roots.length; i++) {
      new Sample(roots[i], lang).load(roots[i].getAttribute("data-sample"));
    }
    var decor = document.querySelectorAll("[data-cell-json]");
    for (var d = 0; d < decor.length; d++) {
      decor[d].innerHTML = renderCell(JSON.parse(decor[d].getAttribute("data-cell-json")));
    }
    /* En länk till "Om matristest" öppnar första frågan, så att texten
       syns utan ett klick till. */
    function openFromHash() {
      var target = location.hash && document.querySelector(location.hash);
      if (!target) return;
      var first = target.matches("details") ? target : target.querySelector("details");
      if (first) first.open = true;
    }
    window.addEventListener("hashchange", openFromHash);
    openFromHash();
  }

  window.MatrixRender = { renderCell: renderCell, renderMissing: renderMissing };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
