// The 3D body twin. Display only: it draws what app.js hands it and reports which region was clicked.
// It holds no rule, no cut-off and no reading. If 3D cannot start, the flat figure in the page stays in use.
// Built from simple shapes with three.js r160 (MIT licence, vendor/three.min.js). No model file.
(function (root) {
  // TODO (you, as the team's medic): which body parts light up for each region. Change freely.
  // Parts available: head, neck, chest, core, armL (the arm on the viewer's left), armR, legL, legR.
  var LIGHTS = {
    head: ["head"],   // sleep and mood
    chest: ["chest"], // blood pressure and heart rate
    core: ["core"],   // body temperature
    arm: ["armL"]     // blood sugar
  };
  // Where each region's label sits against its marker.
  var LABEL_SIDE = { head: "below", chest: "below", core: "below", arm: "left" };
  // Status name to the page's own colour token, so the 3D figure and the chips always agree.
  var TOKEN = { ok: "--accent", expected: "--expected", changed: "--changed", watch: "--watch", serious: "--serious", cannot: "--cannot" };
  var BASE = "#5ae2ff";

  var THREE = root.THREE, st = null;

  function css(name) {
    var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return /^#[0-9a-f]{6}$/i.test(v) ? v : BASE;
  }
  // See-through glow that is brighter at the edges, like a hologram.
  function holo(color) {
    return new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uBase: { value: 0.13 }, uRim: { value: 0.8 } },
      vertexShader: "varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }",
      fragmentShader: "uniform vec3 uColor; uniform float uBase; uniform float uRim; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uColor, min(1.0, uBase + f * uRim)); }",
      transparent: true, depthWrite: false, side: THREE.DoubleSide
    });
  }
  function part(name, geo, x, y, z, sx, sy, sz, rz) {
    var g = new THREE.Group();
    var body = new THREE.Mesh(geo, holo(BASE));
    var grid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: BASE, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false }));
    g.add(body); g.add(grid);
    g.position.set(x, y, z); g.scale.set(sx || 1, sy || 1, sz || 1); g.rotation.z = rz || 0;
    body.userData.part = name;
    st.parts[name] = { group: g, body: body, grid: grid };
    st.body.add(g);
    return g;
  }

  function build() {
    var cap = function (r, len) { return new THREE.CapsuleGeometry(r, len, 6, 14); };
    part("head", new THREE.SphereGeometry(0.33, 18, 12), 0, 2.05, 0);
    part("neck", new THREE.CylinderGeometry(0.1, 0.12, 0.2, 10), 0, 1.68, 0);
    part("chest", cap(0.36, 0.18), 0, 1.28, 0, 1.25, 1, 0.72);
    part("core", cap(0.33, 0.2), 0, 0.5, 0, 1.15, 1, 0.7);
    part("armL", cap(0.105, 0.95), -0.68, 1.0, 0, 1, 1, 1, -0.12);
    part("armR", cap(0.105, 0.95), 0.68, 1.0, 0, 1, 1, 1, 0.12);
    part("legL", cap(0.15, 1.15), -0.21, -0.62, 0);
    part("legR", cap(0.15, 1.15), 0.21, -0.62, 0);
    // The platform under the feet.
    [0.98, 0.64].forEach(function (r, i) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.008, 6, 64), new THREE.MeshBasicMaterial({ color: BASE, transparent: true, opacity: i ? 0.35 : 0.55 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = -1.42;
      st.scene.add(ring);
    });
    // One glowing marker and one label for each region.
    Object.keys(LIGHTS).forEach(function (reg) {
      var first = st.parts[LIGHTS[reg][0]];
      var dot = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), new THREE.MeshBasicMaterial({ color: BASE, depthTest: false, transparent: true }));
      var halo = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), new THREE.MeshBasicMaterial({ color: BASE, depthTest: false, transparent: true, opacity: 0.28 }));
      dot.renderOrder = 5; halo.renderOrder = 4;
      dot.position.copy(first.group.position); halo.position.copy(first.group.position);
      st.body.add(dot); st.body.add(halo);
      var label = document.createElement("span");
      label.className = "twinlabel"; label.setAttribute("aria-hidden", "true");
      st.stage.appendChild(label);
      st.regions[reg] = { dot: dot, halo: halo, label: label, flagged: false };
    });
    st.pickable = [];
    Object.keys(LIGHTS).forEach(function (reg) {
      LIGHTS[reg].forEach(function (p) { if (st.parts[p]) { st.parts[p].body.userData.region = reg; st.pickable.push(st.parts[p].body); } });
    });
  }

  function size() {
    var w = st.stage.clientWidth, h = st.stage.clientHeight;
    if (!w || !h) return;
    st.renderer.setSize(w, h, false);
    st.camera.aspect = w / h;
    // Pull the camera back on a narrow stage so the arms and labels stay inside.
    st.camera.position.z = w / h < 0.62 ? 9.6 : 8.0;
    st.camera.updateProjectionMatrix();
    if (st.regions.head) draw();
  }
  function regionAt(ev) {
    var r = st.canvas.getBoundingClientRect();
    st.ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    st.ray.setFromCamera(st.ptr, st.camera);
    var hit = st.ray.intersectObjects(st.pickable, false)[0];
    return hit ? hit.object.userData.region : null;
  }
  function place() {
    var w = st.stage.clientWidth, h = st.stage.clientHeight, v = st.v;
    Object.keys(st.regions).forEach(function (reg) {
      var R = st.regions[reg];
      R.dot.getWorldPosition(v); v.project(st.camera);
      var x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      R.sx = x; R.sy = y;
      R.label.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) " +
        (LABEL_SIDE[reg] === "left" ? "translate(calc(-100% - 12px), -50%)" : "translate(-50%, 11px)");
    });
  }
  function frame(t) {
    if (!st || st.lost) return;
    st.raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    var s = t / 1000;
    st.body.rotation.y = st.still ? 0.22 : Math.sin(s * 0.45) * 0.42;
    Object.keys(st.regions).forEach(function (reg) {
      var R = st.regions[reg], k = R.flagged && !st.still ? 1 + 0.35 * (0.5 + 0.5 * Math.sin(s * 3.2)) : 1;
      R.halo.scale.setScalar(k);
    });
    draw();
  }
  // One still picture. Also called outside the animation loop, so the figure shows even when the browser pauses animation.
  function draw() { place(); st.renderer.render(st.scene, st.camera); }

  root.TWIN3D = {
    // Starts the 3D figure inside `stage`. Returns false, and changes nothing, when 3D is not available.
    init: function (stage, onPick) {
      if (st) return true;
      if (!THREE || !stage || /[?&]no3d=1/.test(root.location.search)) return false;
      var renderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return false; }
      if (!renderer.getContext()) return false;
      st = { stage: stage, renderer: renderer, canvas: renderer.domElement, scene: new THREE.Scene(), parts: {}, regions: {},
        ray: new THREE.Raycaster(), ptr: new THREE.Vector2(), v: new THREE.Vector3(), lost: false,
        still: !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches) };
      st.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
      st.camera.position.set(0, 0.55, 8.0); st.camera.lookAt(0, 0.42, 0);
      st.body = new THREE.Group(); st.scene.add(st.body);
      renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      st.canvas.setAttribute("aria-hidden", "true"); // the list under the figure is the keyboard and screen-reader path
      stage.appendChild(st.canvas);
      stage.classList.add("has3d");
      build(); size();
      if (root.ResizeObserver) new ResizeObserver(size).observe(stage); else root.addEventListener("resize", size);
      st.canvas.addEventListener("click", function (ev) { var reg = regionAt(ev); if (reg && onPick) onPick(reg); });
      st.canvas.addEventListener("pointermove", function (ev) { st.canvas.style.cursor = regionAt(ev) ? "pointer" : "default"; });
      st.canvas.addEventListener("webglcontextlost", function (ev) { ev.preventDefault(); st.lost = true; stage.classList.remove("has3d"); });
      st.body.rotation.y = 0.22;
      draw();
      st.raf = requestAnimationFrame(frame);
      return true;
    },
    // info: { region: { cls: status name, label: short text } }. selected: the region to ring.
    update: function (info, selected) {
      if (!st) return;
      var lit = {};
      Object.keys(LIGHTS).forEach(function (reg) {
        var i = info[reg]; if (!i) return;
        var col = css(TOKEN[i.cls] || "--accent"), R = st.regions[reg], sel = reg === selected;
        LIGHTS[reg].forEach(function (p) { lit[p] = { col: col, sel: sel }; });
        R.dot.material.color.set(col); R.halo.material.color.set(col);
        R.flagged = i.cls === "watch" || i.cls === "serious";
        R.label.textContent = i.label;
        R.label.className = "twinlabel s-" + i.cls + (sel ? " sel" : "");
      });
      Object.keys(st.parts).forEach(function (p) {
        var P = st.parts[p], L = lit[p];
        P.body.material.uniforms.uColor.value.set(L ? L.col : BASE);
        P.body.material.uniforms.uBase.value = L ? (L.sel ? 0.42 : 0.26) : 0.1;
        P.grid.material.color.set(L && L.sel ? "#ffffff" : (L ? L.col : BASE));
        P.grid.material.opacity = L && L.sel ? 0.4 : 0.1;
      });
      if (!st.lost) draw();
    },
    // For checks: where a region's marker is on screen, and what the figure is showing.
    screenPos: function (reg) {
      if (!st || !st.regions[reg]) return null;
      place();
      var r = st.canvas.getBoundingClientRect();
      return { x: r.left + st.regions[reg].sx, y: r.top + st.regions[reg].sy };
    },
    state: function () {
      if (!st) return null;
      return { running: !st.lost, revision: THREE.REVISION, regions: Object.keys(st.regions), parts: Object.keys(st.parts).length,
        labels: Object.keys(st.regions).map(function (r) { return st.regions[r].label.className.replace("twinlabel ", "") + " " + st.regions[r].label.textContent; }) };
    }
  };
})(window);
