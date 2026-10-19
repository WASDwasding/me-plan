/**
 * 进度汇总与页面渲染。
 *
 * 单核并发：六条支线同时挂在主进程上，各自独立计数。
 * 时间片：状态为「进行中」的叶子进入 RUN QUEUE，表示当前真正占用时间的任务。
 * 分治：叶子状态向上归并，先到一级任务，再到支线，最后到总进度。
 *
 * 交互状态写在 localStorage（键 me-plan.status.v1）。
 * js/data.js 里的 status 是预设；同一个 id 一旦在页面上改过，以本机记录为准。
 */
(function () {
  var STORAGE_KEY = "me-plan.status.v1";
  var WEIGHT = { todo: 0, active: 0.5, done: 1 };
  var LEAF_LABEL = { todo: "待完成", active: "进行中", done: "已完成" };
  var BRANCH_LABEL = { idle: "未开始", run: "进行中", done: "已完成" };

  var app = document.getElementById("app");
  var resetBtn = document.getElementById("reset");
  var live = document.getElementById("live");

  if (!window.PLAN || !Array.isArray(window.PLAN.branches)) {
    app.textContent = "没有读到 js/data.js 里的 PLAN。请确认脚本路径，并用浏览器打开 index.html。";
    return;
  }

  var initialPlan = structuredClone(window.PLAN);
  var plan = structuredClone(window.PLAN);
  var openBranches = new Set();
  var armTimer = 0;

  applyStorage();
  var dupes = duplicateIds(plan.branches);
  render();

  app.addEventListener("click", onClick);
  resetBtn.addEventListener("click", onReset);

  function onClick(event) {
    var leafBtn = event.target.closest("[data-leaf]");
    if (leafBtn) {
      cycleLeaf(leafBtn.getAttribute("data-leaf"));
      return;
    }
    var jump = event.target.closest("[data-jump]");
    if (jump) {
      var id = jump.getAttribute("data-jump");
      openBranches.add(id);
      render();
      var row = document.getElementById("thread-" + id);
      if (row) row.scrollIntoView({ block: "nearest" });
      return;
    }
    var head = event.target.closest("[data-branch]");
    if (head) {
      toggleBranch(head.getAttribute("data-branch"));
    }
  }

  function onReset() {
    if (!resetBtn.classList.contains("is-armed")) {
      resetBtn.classList.add("is-armed");
      resetBtn.textContent = "确认清除本机进度";
      window.clearTimeout(armTimer);
      armTimer = window.setTimeout(disarmReset, 4000);
      return;
    }
    disarmReset();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      /* 清不掉就只恢复内存里的预设 */
    }
    plan = structuredClone(initialPlan);
    render();
    announce("已恢复为代码预设");
  }

  function disarmReset() {
    window.clearTimeout(armTimer);
    resetBtn.classList.remove("is-armed");
    resetBtn.textContent = "重置为代码预设";
  }

  function toggleBranch(id) {
    if (openBranches.has(id)) openBranches.delete(id);
    else openBranches.add(id);
    render();
  }

  function cycleLeaf(id) {
    var leaf = findLeaf(plan.branches, id);
    if (!leaf) return;
    var order = ["todo", "active", "done"];
    var current = normalize(leaf.status);
    leaf.status = order[(order.indexOf(current) + 1) % order.length];
    writeStorage();
    render();
    var branch = branchOf(plan.branches, id);
    if (branch) {
      announce(
        leaf.name +
          "改为" +
          LEAF_LABEL[leaf.status] +
          "。" +
          branch.name +
          " " +
          pctText(progressOf(branch)) +
          "%，总进度 " +
          pctText(globalProgress(plan.branches)) +
          "%"
      );
    }
  }

  function render() {
    var scrollY = window.scrollY;
    var active = document.activeElement;
    var focusLeaf = active && active.getAttribute ? active.getAttribute("data-leaf") : "";
    var focusBranch = active && active.getAttribute ? active.getAttribute("data-branch") : "";

    app.innerHTML = view();

    window.scrollTo(0, scrollY);
    var next = null;
    if (focusLeaf) next = app.querySelector('[data-leaf="' + focusLeaf + '"]');
    else if (focusBranch) next = app.querySelector('[data-branch="' + focusBranch + '"]');
    if (next) next.focus();
  }

  function view() {
    var branches = plan.branches;
    var globalRatio = globalProgress(branches);
    var leaves = collectLeaves(branches);
    var counts = countStatuses(leaves);
    var queue = activeLeaves(branches);

    return (
      banner(dupes) +
      hero(globalRatio, counts) +
      queueView(queue) +
      threadSection(branches)
    );
  }

  function banner(ids) {
    if (!ids.length) return "";
    return (
      '<p class="banner">任务 id 重复：' +
      esc(ids.join("、")) +
      "。本机进度会串线，请在 js/data.js 里改成唯一值。</p>"
    );
  }

  function hero(globalRatio, counts) {
    var specs = plan.profile
      .map(function (item, index) {
        return (
          '<div class="spec' +
          (index === 0 ? "" : " spec-split") +
          '"><span class="spec-label">' +
          esc(item.label) +
          '</span><span class="spec-value">' +
          esc(item.value) +
          "</span></div>"
        );
      })
      .join("");

    var schools = (plan.schools || []).join(" · ");
    if (plan.degree) schools += (schools ? " · " : "") + plan.degree;

    return (
      '<section class="hero">' +
      '<div class="hero-copy">' +
      '<p class="kicker">主进程 · MAIN</p>' +
      "<h1>" +
      esc(plan.goal) +
      "</h1>" +
      '<p class="schools">' +
      esc(schools) +
      "</p>" +
      '<div class="specs">' +
      specs +
      "</div>" +
      "</div>" +
      '<div class="readout">' +
      '<div class="readout-top"><span class="kicker">总进度 · GLOBAL</span></div>' +
      '<p class="readout-num">' +
      pctText(globalRatio) +
      "<small>%</small></p>" +
      bar(globalRatio, "总进度") +
      '<p class="readout-note">六条支线等权平均</p>' +
      '<p class="readout-note">叶子 ' +
      counts.total +
      " · 完成 " +
      counts.done +
      " · 进行 " +
      counts.active +
      " · 未开始 " +
      counts.todo +
      "</p>" +
      "</div>" +
      "</section>"
    );
  }

  function queueView(items) {
    var body;
    if (!items.length) {
      body = '<p class="queue-empty">当前没有进行中的叶子。</p>';
    } else {
      body =
        '<div class="q-list">' +
        items
          .map(function (item) {
            var label = item.group ? item.group + " · " + item.leaf.name : item.leaf.name;
            return (
              '<button type="button" class="q-item" data-jump="' +
              esc(item.branch.id) +
              '" title="' +
              esc(item.leaf.name) +
              '">' +
              '<span class="q-id">' +
              esc(item.branch.code) +
              "</span>" +
              '<span class="q-name">' +
              esc(label) +
              "</span>" +
              "</button>"
            );
          })
          .join("") +
        "</div>";
    }

    return (
      '<section class="queue">' +
      '<div class="queue-head">' +
      '<p class="kicker">当前时间片 · RUN QUEUE</p>' +
      '<p class="queue-hint">状态为「进行中」的最小任务。点击可展开对应支线。</p>' +
      "</div>" +
      body +
      "</section>"
    );
  }

  function threadSection(branches) {
    var rows = branches
      .map(function (branch) {
        return threadRow(branch);
      })
      .join("");

    return (
      '<section class="threads">' +
      '<div class="sec-label">' +
      '<p class="kicker">并行支线 · THREADS</p>' +
      '<p class="sec-hint">点击一行展开分治任务树</p>' +
      "</div>" +
      '<div class="ps">' +
      '<div class="ps-head ps-grid" aria-hidden="true">' +
      '<span>ID</span><span>THREAD</span><span>STATE</span><span class="h-right">%</span><span>PROGRESS</span><span class="h-right">DONE</span><span></span>' +
      "</div>" +
      rows +
      "</div>" +
      "</section>"
    );
  }

  function threadRow(branch) {
    var ratio = progressOf(branch);
    var state = branchState(ratio);
    var tally = tallyLeaves(branch);
    var open = openBranches.has(branch.id);

    return (
      '<article class="thread' +
      (open ? " is-open" : "") +
      '" id="thread-' +
      esc(branch.id) +
      '">' +
      '<button type="button" class="thread-head ps-grid" data-branch="' +
      esc(branch.id) +
      '" aria-expanded="' +
      (open ? "true" : "false") +
      '">' +
      '<span class="c-idx">' +
      esc(branch.code) +
      "</span>" +
      '<span class="c-name"><strong>' +
      esc(branch.name) +
      '</strong><span class="c-brief">' +
      esc(branch.brief || "") +
      "</span></span>" +
      '<span class="c-state is-' +
      state +
      '">' +
      BRANCH_LABEL[state] +
      "</span>" +
      '<span class="c-pct">' +
      pctText(ratio) +
      "%</span>" +
      '<span class="c-bar">' +
      bar(ratio) +
      "</span>" +
      '<span class="c-leaves" title="已完成叶子 / 全部叶子">' +
      tally.done +
      "/" +
      tally.total +
      "</span>" +
      '<span class="c-chev" aria-hidden="true"></span>' +
      "</button>" +
      (open ? treeView(branch, tally, ratio) : "") +
      "</article>"
    );
  }

  function treeView(branch, tally, ratio) {
    return (
      '<div class="tree" id="tree-' +
      esc(branch.id) +
      '">' +
      '<div class="tree-meta">' +
      '<span class="meta-k">ROOT</span>' +
      '<span class="meta-id">' +
      esc(branch.id) +
      "</span>" +
      "<span>" +
      pctText(ratio) +
      "%</span>" +
      "<span>已完成 " +
      tally.done +
      "</span>" +
      "<span>进行中 " +
      tally.active +
      "</span>" +
      "<span>待完成 " +
      tally.todo +
      "</span>" +
      "</div>" +
      '<div class="groups">' +
      renderNodes(branch.children || [], 0) +
      "</div>" +
      "</div>"
    );
  }

  function renderNodes(nodes, depth) {
    return nodes
      .map(function (node, index) {
        if (isLeaf(node)) return renderLeaf(node);
        var ratio = progressOf(node);
        return (
          '<section class="group">' +
          '<div class="group-h">' +
          (depth === 0
            ? '<span class="g-idx">' + (index + 1) + "</span>"
            : '<span class="g-dot" aria-hidden="true"></span>') +
          '<span class="g-name">' +
          esc(node.name) +
          "</span>" +
          '<span class="bar micro" aria-hidden="true"><span class="bar-fill" style="width:' +
          (ratio * 100).toFixed(2) +
          '%"></span></span>' +
          '<span class="g-pct">' +
          pctText(ratio) +
          "%</span>" +
          "</div>" +
          '<div class="group-kids">' +
          renderNodes(node.children || [], depth + 1) +
          "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  function renderLeaf(node) {
    var status = normalize(node.status);
    return (
      '<div class="leaf">' +
      '<span class="leaf-name">' +
      esc(node.name) +
      "</span>" +
      '<button type="button" class="pill is-' +
      status +
      '" data-leaf="' +
      esc(node.id) +
      '" title="点击切换：待完成 → 进行中 → 已完成">' +
      LEAF_LABEL[status] +
      "</button>" +
      "</div>"
    );
  }

  function bar(ratio, label) {
    var html =
      '<span class="bar"' +
      (label
        ? ' role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
          pctText(ratio) +
          '" aria-label="' +
          esc(label) +
          '"'
        : ' aria-hidden="true"') +
      '><span class="bar-fill" style="width:' +
      (ratio * 100).toFixed(2) +
      '%"></span></span>';
    return html;
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

  /** 叶子返回 0 / 0.5 / 1；父节点返回子节点进度的加权平均。 */
  function progressOf(node) {
    if (isLeaf(node)) return WEIGHT[normalize(node.status)];
    var acc = 0;
    var wsum = 0;
    node.children.forEach(function (child) {
      var w = nodeWeight(child);
      acc += progressOf(child) * w;
      wsum += w;
    });
    return wsum ? acc / wsum : 0;
  }

  function globalProgress(branches) {
    var acc = 0;
    var wsum = 0;
    branches.forEach(function (branch) {
      var w = nodeWeight(branch);
      acc += progressOf(branch) * w;
      wsum += w;
    });
    return wsum ? acc / wsum : 0;
  }

  function branchState(ratio) {
    if (ratio <= 0) return "idle";
    if (ratio >= 0.999) return "done";
    return "run";
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

  function collectLeaves(branches) {
    var list = [];
    branches.forEach(function (branch) {
      eachLeaf(branch, function (leaf) {
        list.push(leaf);
      });
    });
    return list;
  }

  function tallyLeaves(node) {
    var tally = { done: 0, active: 0, todo: 0, total: 0 };
    eachLeaf(node, function (leaf) {
      tally[normalize(leaf.status)] += 1;
      tally.total += 1;
    });
    return tally;
  }

  function countStatuses(leaves) {
    return leaves.reduce(
      function (acc, leaf) {
        acc[normalize(leaf.status)] += 1;
        acc.total += 1;
        return acc;
      },
      { done: 0, active: 0, todo: 0, total: 0 }
    );
  }

  function activeLeaves(branches) {
    var items = [];
    branches.forEach(function (branch) {
      eachLeaf(branch, function (leaf) {
        if (normalize(leaf.status) !== "active") return;
        items.push({
          branch: branch,
          leaf: leaf,
          group: parentName(branch, leaf.id),
        });
      });
    });
    return items;
  }

  function parentName(root, leafId) {
    var found = "";
    function walk(node, parent) {
      if (found) return;
      if (node.id === leafId) {
        found = parent ? parent.name : "";
        return;
      }
      if (!node.children) return;
      node.children.forEach(function (child) {
        walk(child, node);
      });
    }
    walk(root, null);
    return found;
  }

  function findLeaf(branches, id) {
    var found = null;
    branches.forEach(function (branch) {
      if (found) return;
      eachLeaf(branch, function (leaf) {
        if (leaf.id === id) found = leaf;
      });
    });
    return found;
  }

  function branchOf(branches, leafId) {
    var found = null;
    branches.forEach(function (branch) {
      if (found) return;
      eachLeaf(branch, function (leaf) {
        if (leaf.id === leafId) found = branch;
      });
    });
    return found;
  }

  function duplicateIds(branches) {
    var seen = Object.create(null);
    var dups = [];
    function walk(nodes) {
      nodes.forEach(function (node) {
        if (!node.id) return;
        if (seen[node.id]) {
          if (dups.indexOf(node.id) === -1) dups.push(node.id);
        } else {
          seen[node.id] = true;
        }
        if (node.children) walk(node.children);
      });
    }
    walk(branches);
    return dups;
  }

  function applyStorage() {
    var saved = readStorage();
    collectLeaves(plan.branches).forEach(function (leaf) {
      var status = saved[leaf.id];
      if (status === "todo" || status === "active" || status === "done") {
        leaf.status = status;
      }
    });
  }

  function writeStorage() {
    var map = {};
    collectLeaves(plan.branches).forEach(function (leaf) {
      map[leaf.id] = normalize(leaf.status);
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch (err) {
      /* 无存储时本次会话仍可操作 */
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

  function pctText(ratio) {
    var n = Math.round(ratio * 1000) / 10;
    if (Object.is(n, -0)) n = 0;
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(1);
  }

  function announce(text) {
    if (!live) return;
    live.textContent = "";
    window.setTimeout(function () {
      live.textContent = text;
    }, 30);
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
