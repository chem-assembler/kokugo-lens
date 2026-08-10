/* ------------------------------------------------------------------
   sortable-lite.js — SortableJS(CDN) の代替となる自前のドラッグ＆ドロップ

   **InfoLens（1行ずつみるアルゴリズム）からの流用**。
   SchoolLenz の方針「外部アセットゼロ・オフラインで動く」に合わせた自前実装。
   本アプリ用に **掴む対象の選択子を opts.itemSelector で指定できるように**した
   （InfoLens 版は ".block-card" 固定だった）。それ以外の挙動は同じ。

   対応オプション:
     itemSelector（本アプリでの追加）/ group{name,pull,put} / ghostClass
     delay / delayOnTouchOnly / touchStartThreshold / filter / onStart / onEnd

   仕様の要点
   - 並べ替えの実体は DOM の移動。呼び出し側は DOM の並び順を正として読めばよい。
   - カード内の input / button は掴まない（カード上の操作ボタンを殺さないため）。
   - タッチでは delay ms 長押しで開始。長押し前に動かした場合はドラッグせず
     ページのスクロールに譲る（delayOnTouchOnly 相当）。
   ------------------------------------------------------------------ */
(function (global) {
  "use strict";

  var instances = [];
  var drag = null; // 同時に走るドラッグは1つだけ

  var DEFAULT_ITEM = ".block-card";
  var EDGE = 42;   // 端からこの距離でオートスクロール
  var SPEED = 14;  // オートスクロール量(px/フレーム相当)

  function normalizeGroup(g) {
    if (typeof g === "string") return { name: g, pull: true, put: true };
    if (!g) return { name: "__default__", pull: true, put: true };
    return { name: g.name || "__default__", pull: g.pull !== false, put: g.put !== false };
  }

  // list の直下の子要素まで遡って、並べ替え対象のカードを返す
  function itemFrom(inst, node) {
    var list = inst.el;
    while (node && node !== list && node.parentElement !== list) node = node.parentElement;
    if (!node || node === list || node.parentElement !== list) return null;
    return node.matches && node.matches(inst.item) ? node : null;
  }

  function instanceFor(el) {
    for (var i = 0; i < instances.length; i++) if (instances[i].el === el) return instances[i];
    return null;
  }

  // 座標が乗っているリスト（同じグループで put 可）を探す
  function listAt(x, y) {
    var node = document.elementFromPoint(x, y);
    while (node) {
      var inst = instanceFor(node);
      if (inst && inst.group.name === drag.inst.group.name && inst.group.put) return inst;
      node = node.parentElement;
    }
    return null;
  }

  // list 内で y に対応する挿入位置（この要素の前に入れる／null なら末尾）
  function referenceAt(inst, y) {
    var items = inst.el.querySelectorAll(inst.item);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (it === drag.item) continue;
      var r = it.getBoundingClientRect();
      if (y < r.top + r.height / 2) return it;
    }
    return null;
  }

  function autoScroll(el, y) {
    if (!el || el.scrollHeight <= el.clientHeight) return;
    var r = el.getBoundingClientRect();
    if (y < r.top + EDGE) el.scrollTop -= SPEED;
    else if (y > r.bottom - EDGE) el.scrollTop += SPEED;
  }

  function beginDrag(x, y) {
    var item = drag.item;
    var r = item.getBoundingClientRect();

    var clone = item.cloneNode(true);
    clone.classList.remove(drag.inst.opts.ghostClass || "sortable-ghost");
    clone.style.position = "fixed";
    clone.style.left = "0";
    clone.style.top = "0";
    clone.style.width = r.width + "px";
    clone.style.height = r.height + "px";
    clone.style.margin = "0";
    clone.style.pointerEvents = "none";
    clone.style.zIndex = "10000";
    clone.style.opacity = "0.92";
    clone.style.boxShadow = "0 12px 28px rgba(0,0,0,0.35)";
    clone.style.transform = "translate(" + (r.left) + "px," + (r.top) + "px) scale(1.02)";
    document.body.appendChild(clone);

    drag.clone = clone;
    drag.offsetX = x - r.left;
    drag.offsetY = y - r.top;
    drag.started = true;

    item.classList.add(drag.inst.opts.ghostClass || "sortable-ghost");
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    if (typeof drag.inst.opts.onStart === "function") drag.inst.opts.onStart();
  }

  function moveDrag(x, y) {
    drag.clone.style.transform =
      "translate(" + (x - drag.offsetX) + "px," + (y - drag.offsetY) + "px) scale(1.02)";

    var target = listAt(x, y);
    if (!target) return;

    autoScroll(target.el, y);

    var ref = referenceAt(target, y);
    if (ref !== drag.item) {
      if (ref) target.el.insertBefore(drag.item, ref);
      else target.el.appendChild(drag.item);
    }
  }

  function endDrag() {
    if (!drag) return;
    if (drag.timer) clearTimeout(drag.timer);

    if (drag.started) {
      if (drag.clone && drag.clone.parentNode) drag.clone.parentNode.removeChild(drag.clone);
      drag.item.classList.remove(drag.inst.opts.ghostClass || "sortable-ghost");
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
      var opts = drag.inst.opts;
      drag = null;
      if (typeof opts.onEnd === "function") opts.onEnd();
      return;
    }
    drag = null;
  }

  function onPointerMove(e) {
    if (!drag) return;

    if (!drag.started) {
      var dx = e.clientX - drag.startX;
      var dy = e.clientY - drag.startY;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (!drag.armed) {
        // 長押し待ちの最中に動いた＝スクロール操作とみなしてドラッグを諦める
        if (dist > drag.threshold) endDrag();
        return;
      }
      if (dist <= 3) return;
      beginDrag(e.clientX, e.clientY);
    }

    e.preventDefault();
    moveDrag(e.clientX, e.clientY);
  }

  function onPointerUp() {
    endDrag();
  }

  // ドラッグ中はページのスクロールを止める（タッチ）
  function onTouchMove(e) {
    if (drag && drag.started) e.preventDefault();
  }

  document.addEventListener("pointermove", onPointerMove, { passive: false });
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  document.addEventListener("touchmove", onTouchMove, { passive: false });

  function Sortable(el, opts) {
    if (!(this instanceof Sortable)) return new Sortable(el, opts);
    this.el = el;
    this.opts = opts || {};
    this.item = this.opts.itemSelector || DEFAULT_ITEM;
    this.group = normalizeGroup(this.opts.group);
    instances.push(this);

    var self = this;
    el.addEventListener("pointerdown", function (e) {
      if (drag) return;
      if (e.button != null && e.button !== 0) return;
      if (!self.group.pull) return;

      // カード内の入力・ボタンは掴まない（カード上の操作ボタンを優先）
      if (e.target.closest("input, button, select, textarea, a")) return;

      var item = itemFrom(self, e.target);
      if (!item) return;
      if (self.opts.filter && item.matches(self.opts.filter)) return;

      var isTouch = e.pointerType !== "mouse";
      drag = {
        inst: self,
        item: item,
        started: false,
        armed: !(isTouch && self.opts.delay > 0 && self.opts.delayOnTouchOnly !== false),
        startX: e.clientX,
        startY: e.clientY,
        threshold: self.opts.touchStartThreshold || 5,
        timer: null
      };

      if (!drag.armed) {
        var x = e.clientX, y = e.clientY;
        drag.timer = setTimeout(function () {
          if (!drag || drag.started) return;
          drag.armed = true;
          beginDrag(x, y);       // 長押しが成立した時点でドラッグ開始
          moveDrag(x, y);
        }, self.opts.delay);
      }
    });
  }

  Sortable.prototype.destroy = function () {
    var i = instances.indexOf(this);
    if (i >= 0) instances.splice(i, 1);
  };

  global.Sortable = Sortable;
})(window);
