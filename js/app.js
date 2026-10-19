/**
 * 中间是总目标，支线从两边连出去。
 * 点一支线进入它的分解树。点叶子切换状态，进度向上汇总。
 */
(function () {
  var STORAGE_KEY = "me-plan.status.v2";
  var WEIGHT = { todo: 0, active: 0.5, done: 1 };
  var LABEL = { todo: "待完成", active: "进行中", done: "已完成" };

  var app = document.getElementById("app");
  if (!window.PLAN || !Array.isArray(window.PLAN.branches)) {
    app.textContent = "没有读到任务数据。";
    return;
  }

  var plan = structuredClone(window.PLAN);
  var folded = new Set();
  var resizeObserver = null;

  applyStorage();
  window.addEventListener("hashchange", render);
  window.addEventListener("popstate", render);
  app.addEventListener("click", onClick);
  render();

  function onClick(event) {
    var leafBtn = event.target.closest("[data-leaf]");
    if (leafBtn) {
      cycleLeaf(leafBtn.getAttribute("data-leaf"));
      return;
    }
    var foldBtn = event.target.closest("[data-fold]");
    if (foldBtn) {
      var foldId = foldBtn.getAttribute("data-fold");
      if (folded.has(foldId)) folded.delete(foldId);
      else folded.add(foldId);
      render();
      return;
    }
    var openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      location.hash = openBtn.getAttribute("data-open");
      return;
    }
    if (event.target.closest("[data-back]")) {
      if (location.hash) location.hash = "";
      else render();
    }
  }

  function cycleLeaf(id) {
    var leaf = findLeaf(id);
    if (!leaf) return;
    var order = ["todo", "active", "done"];
    var current = normalize(leaf.status);
    leaf.status = order[(order.indexOf(current) + 1) % order.length];
    writeStorage();
    render();
  }

  function currentView() {
    var hash = location.hash.replace(/^#/, "");
    var found = plan.branches.some(function (branch) {
      return branch.id === hash;
    });
    return found ? hash : "map";
  }

  function render() {
    var scrollY = window.scrollY;
    var active = document.activeElement;
    var focusLeaf = active && active.getAttribute ? active.getAttribute("data-leaf") : "";
    var focusFold = active && active.getAttribute ? active.getAttribute("data-fold") : "";

    if (resizeObserver) resizeObserver.disconnect();
    app.innerHTML = currentView() === "map" ? mapView() : detailView(currentView());
    window.scrollTo(0, scrollY);

    var next = null;
    if (focusLeaf) next = app.querySelector('[data-leaf="' + focusLeaf + '"]');
    else if (focusFold) next = app.querySelector('[data-fold="' + focusFold + '"]');
    if (next) next.focus();

    if (currentView() === "map") watchMap();
  }

  function mapView() {
    var ratio = globalProgress(plan.branches);
    var nodes = plan.branches
      .map(function (branch) {
        var p = progressOf(branch);
        return (
          '<button type="button" class="node-side" data-open="' +
          esc(branch.id) +
          '" data-side="' +
          esc(branch.side) +
          '" style="--x:' +
          esc(branch.x) +
          ";--y:" +
          esc(branch.y) +
          '">' +
          '<span class="node-name">' +
          esc(branch.name) +
          "</span>" +
          '<span class="node-fact' +
          (branch.emphasis ? " is-num" : "") +
          '">' +
          esc(branch.fact) +
          "</span>" +
          '<span class="meter" aria-hidden="true"><span style="width:' +
          (p * 100).toFixed(2) +
          '%"></span></span>' +
          "</button>"
        );
      })
      .join("");

    return (
      '<div class="view-map">' +
      '<div class="map">' +
      '<svg class="links" aria-hidden="true"></svg>' +
      '<div class="node-main" style="--p:' +
      pct(ratio) +
      '">' +
      '<div class="core" role="img" aria-label="' +
      esc(plan.main) +
      " " +
      pct(ratio) +
      '%">' +
      "<strong>" +
      esc(plan.main) +
      "</strong>" +
      "<span>" +
      pct(ratio) +
      "%</span>" +
      "</div>" +
      "</div>" +
      nodes +
      "</div>" +
      "</div>"
    );
  }

  function detailView(id) {
    var branch = plan.branches.filter(function (item) {
      return item.id === id;
    })[0];
    if (!branch) return mapView();
    return (
      '<div class="view-detail">' +
      '<div class="detail">' +
      '<button type="button" class="back" data-back>返回</button>' +
      "<h1>" +
      esc(branch.name) +
      "</h1>" +
      '<div class="kids root-kids">' +
      (branch.children || [])
        .map(function (node) {
          return renderNode(node);
        })
        .join("") +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderNode(node) {
    if (isLeaf(node)) {
      var status = normalize(node.status);
      return (
        '<div class="item">' +
        '<button type="button" class="leaf" data-leaf="' +
        esc(node.id) +
        '">' +
        '<span class="leaf-name">' +
        esc(node.name) +
        "</span>" +
        '<span class="leaf-state is-' +
        status +
        '">' +
        LABEL[status] +
        "</span>" +
        "</button>" +
        "</div>"
      );
    }

    var open = !folded.has(node.id);
    var tone = groupTone(node);
    return (
      '<div class="item">' +
      '<button type="button" class="twig" data-fold="' +
      esc(node.id) +
      '" aria-expanded="' +
      (open ? "true" : "false") +
      '">' +
      '<span class="twig-label"><i class="dot is-' +
      tone +
      '"></i>' +
      esc(node.name) +
      "</span>" +
      '<i class="chev" aria-hidden="true"></i>' +
      "</button>" +
      (open
        ? '<div class="kids">' +
          node.children
            .map(function (child) {
              return renderNode(child);
            })
            .join("") +
          "</div>"
        : "") +
      "</div>"
    );
  }

  function watchMap() {
    var map = document.querySelector(".map");
    if (!map) return;
    resizeObserver = new ResizeObserver(function () {
      drawLinks();
    });
    resizeObserver.observe(map);
    drawLinks();
  }

  function drawLinks() {
    var map = document.querySelector(".map");
    var svg = map && map.querySelector(".links");
    var main = map && map.querySelector(".node-main");
    if (!map || !svg || !main) return;
    if (window.matchMedia("(max-width: 760px)").matches) {
      svg.innerHTML = "";
      return;
    }

    var width = map.clientWidth;
    var height = map.clientHeight;
    if (width < 40 || height < 40) return;
    svg.setAttribute("viewBox", "0 0 " + width + " " + height);

    var origin = map.getBoundingClientRect();
    var mainRect = relRect(main, origin);
    var mainCenter = {
      x: mainRect.left + mainRect.width / 2,
      y: mainRect.top + mainRect.height / 2,
    };
    var radius = mainRect.width / 2;

    var html = "";
    map.querySelectorAll(".node-side").forEach(function (node) {
      var rect = relRect(node, origin);
      var center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      var from = pointOnCircle(mainCenter, radius, center);
      var to = pointOnRect(rect, mainCenter);
      var midX = (from.x + to.x) / 2;
      html +=
        '<path data-for="' +
        esc(node.getAttribute("data-open")) +
        '" d="M ' +
        from.x.toFixed(1) +
        " " +
        from.y.toFixed(1) +
        " C " +
        midX.toFixed(1) +
        " " +
        from.y.toFixed(1) +
        ", " +
        midX.toFixed(1) +
        " " +
        to.y.toFixed(1) +
        ", " +
        to.x.toFixed(1) +
        " " +
        to.y.toFixed(1) +
        '"></path>';
    });
    svg.innerHTML = html;
  }

  app.addEventListener("mouseover", function (event) {
    var node = event.target.closest && event.target.closest(".node-side");
    var id = node ? node.getAttribute("data-open") : "";
    document.querySelectorAll(".links path").forEach(function (path) {
      path.classList.toggle("is-hot", !!id && path.getAttribute("data-for") === id);
    });
  });

  function relRect(el, origin) {
    var rect = el.getBoundingClientRect();
    return {
      left: rect.left - origin.left,
      top: rect.top - origin.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function pointOnCircle(center, radius, toward) {
    var dx = toward.x - center.x;
    var dy = toward.y - center.y;
    var len = Math.hypot(dx, dy) || 1;
    return {
      x: center.x + (dx / len) * radius,
      y: center.y + (dy / len) * radius,
    };
  }

  function pointOnRect(rect, toward) {
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    var dx = toward.x - cx;
    var dy = toward.y - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var scaleX = dx !== 0 ? rect.width / 2 / Math.abs(dx) : Infinity;
    var scaleY = dy !== 0 ? rect.height / 2 / Math.abs(dy) : Infinity;
    var scale = Math.min(scaleX, scaleY);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function isLeaf(node) {
    return !node.children || node.children.length === 0;
  }

  function normalize(status) {
    if (status === "todo" || status === "active" || status === "done") return status;
    return "todo";
  }

  function nodeWeight(node) {
    return typeof node.weight === "number" && node.weight > 0 ? node.weight : 1;
  }

  function progressOf(node) {
    if (isLeaf(node)) return WEIGHT[normalize(node.status)];
    var acc = 0;
    var sum = 0;
    node.children.forEach(function (child) {
      var weight = nodeWeight(child);
      acc += progressOf(child) * weight;
      sum += weight;
    });
    return sum ? acc / sum : 0;
  }

  function globalProgress(branches) {
    var acc = 0;
    var sum = 0;
    branches.forEach(function (branch) {
      var weight = nodeWeight(branch);
      acc += progressOf(branch) * weight;
      sum += weight;
    });
    return sum ? acc / sum : 0;
  }

  function groupTone(node) {
    var ratio = progressOf(node);
    if (ratio >= 0.999) return "done";
    if (ratio <= 0) return "todo";
    return "active";
  }

  function eachLeaf(node, fn) {
    if (isLeaf(node)) {
      fn(node);
      return;
    }
    node.children.forEach(function (child) {
      eachLeaf(child, fn);
    });
  }

  function findLeaf(id) {
    var found = null;
    plan.branches.forEach(function (branch) {
      if (found) return;
      eachLeaf(branch, function (leaf) {
        if (leaf.id === id) found = leaf;
      });
    });
    return found;
  }

  function applyStorage() {
    var saved = readStorage();
    plan.branches.forEach(function (branch) {
      eachLeaf(branch, function (leaf) {
        var status = saved[leaf.id];
        if (status === "todo" || status === "active" || status === "done") {
          leaf.status = status;
        }
      });
    });
  }

  function writeStorage() {
    var map = {};
    plan.branches.forEach(function (branch) {
      eachLeaf(branch, function (leaf) {
        map[leaf.id] = normalize(leaf.status);
      });
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (err) {
      /* 存不下就只留在这次打开里 */
    }
  }

  function readStorage() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch (err) {
      return {};
    }
  }

  function pct(ratio) {
    return String(Math.round(ratio * 100));
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

})();
