// UAP Summoner Pro - Core Web Audio Synth Engine & Visualizer

function main() {
  const startButton = document.getElementById("startButton");
  const previewButton = document.getElementById("previewButton");
  const resetButton = document.getElementById("resetButton");
  const masterVolumeSlider = document.getElementById("volumeSlider");
  const visualizerModeSelect = document.getElementById("visualizerMode");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const countdownTimer = document.getElementById("countdownTimer");

  let audioContext = null;
  let masterGainNode = null;
  let analyserNode = null;
  let animationId = null;

  // PixiJS visualizer objects and variables
  let pixiApp = null;
  let gridGraphics = null;
  let particleGraphics = null;
  let particles = [];
  
  // Three.js visualizer objects and variables
  let threeScene = null;
  let threeCamera = null;
  let threeRenderer = null;
  let coreMesh = null;
  let cageMesh = null;
  let orbitPoints = null;
  const resonanceOrbCanvas = document.getElementById("resonanceOrb");

  const gridCols = 18;
  const gridRows = 10;
  let gridNodes = [];

  let activeChannels = {}; // keys are config.id, values are { nodes, gainNode, cleanup }
  let recorder = null;
  let chunks = [];
  let recordingInterval = null;
  let recordingTimeout = null;
  let previewInterval = null;
  let summonTimeout = null;
  let timeLeft = 30.0;

  // Sound Graph Canvas configuration
  const soundGraphCanvas = document.getElementById("soundGraph");

  // Create PixiJS Application targeting our canvas
  pixiApp = new PIXI.Application({
    view: soundGraphCanvas,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    backgroundAlpha: 0, // Transparent, matches container bg
    width: soundGraphCanvas.clientWidth,
    height: soundGraphCanvas.clientHeight
  });

  // Create graphics layers
  gridGraphics = new PIXI.Graphics();
  particleGraphics = new PIXI.Graphics();
  
  pixiApp.stage.addChild(gridGraphics);
  pixiApp.stage.addChild(particleGraphics);

  // Initialize space-time grid nodes
  function initGridNodes() {
    const w = soundGraphCanvas.clientWidth || 800;
    const h = soundGraphCanvas.clientHeight || 180;
    gridNodes = [];
    
    for (let c = 0; c < gridCols; c++) {
      gridNodes[c] = [];
      const originX = (c / (gridCols - 1)) * w;
      for (let r = 0; r < gridRows; r++) {
        const originY = (r / (gridRows - 1)) * h;
        gridNodes[c][r] = {
          originX: originX,
          originY: originY,
          x: originX,
          y: originY
        };
      }
    }
  }
  initGridNodes();

  // Initialize Three.js 3D WebGL resonance orb
  function initThreeJS() {
    const w = resonanceOrbCanvas.clientWidth || 200;
    const h = resonanceOrbCanvas.clientHeight || 180;

    threeScene = new THREE.Scene();
    
    // Perspective Camera
    threeCamera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    threeCamera.position.z = 7;

    // WebGL Renderer with Alpha (transparency)
    threeRenderer = new THREE.WebGLRenderer({
      canvas: resonanceOrbCanvas,
      alpha: true,
      antialias: true
    });
    threeRenderer.setPixelRatio(window.devicePixelRatio || 1);
    threeRenderer.setSize(w, h);

    // Dynamic Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 5, 5);
    threeScene.add(dirLight);

    const pointLight = new THREE.PointLight(0x7c3aed, 2, 15);
    pointLight.position.set(0, 0, 3);
    threeScene.add(pointLight);

    // Procedurally generate a high-tech Earth texture mapping
    const createEarthTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      const tw = canvas.width;
      const th = canvas.height;

      // Fill ocean (deep blue)
      ctx.fillStyle = "#1e3a8a";
      ctx.fillRect(0, 0, tw, th);

      // Draw latitude/longitude grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let x = 0; x < tw; x += tw / 18) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, th);
        ctx.stroke();
      }
      for (let y = 0; y < th; y += th / 10) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(tw, y);
        ctx.stroke();
      }

      // Draw continents with emerald fill and cyan borders
      ctx.fillStyle = "#047857";
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;

      const drawLand = (coords) => {
        ctx.beginPath();
        ctx.moveTo(coords[0].x * tw, coords[0].y * th);
        for (let i = 1; i < coords.length; i++) {
          ctx.lineTo(coords[i].x * tw, coords[i].y * th);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      };

      // North America (canada, hudson bay, alaska, us, florida, gulf of mexico, central america)
      drawLand([
        { x: 0.05, y: 0.15 },
        { x: 0.12, y: 0.1 },
        { x: 0.22, y: 0.07 },
        { x: 0.25, y: 0.1 },
        { x: 0.25, y: 0.17 },
        { x: 0.28, y: 0.17 },
        { x: 0.31, y: 0.12 },
        { x: 0.33, y: 0.16 },
        { x: 0.3, y: 0.25 },
        { x: 0.32, y: 0.32 }, // florida
        { x: 0.29, y: 0.33 },
        { x: 0.28, y: 0.38 }, // gulf of mexico
        { x: 0.23, y: 0.36 },
        { x: 0.25, y: 0.45 }, // central america
        { x: 0.22, y: 0.46 },
        { x: 0.19, y: 0.36 }, // mexico
        { x: 0.17, y: 0.36 }, // baja
        { x: 0.18, y: 0.31 },
        { x: 0.13, y: 0.26 }, // west coast US
        { x: 0.08, y: 0.25 }  // alaska bottom
      ]);

      // South America
      drawLand([
        { x: 0.26, y: 0.46 }, // panama
        { x: 0.32, y: 0.45 }, // venezuela
        { x: 0.35, y: 0.52 }, // brazil bulge
        { x: 0.33, y: 0.64 }, // rio
        { x: 0.29, y: 0.76 }, // argentina
        { x: 0.27, y: 0.85 }, // horn
        { x: 0.25, y: 0.8 },
        { x: 0.24, y: 0.65 }, // chile
        { x: 0.22, y: 0.54 }, // peru
        { x: 0.24, y: 0.48 }
      ]);

      // Greenland
      drawLand([
        { x: 0.31, y: 0.08 },
        { x: 0.37, y: 0.06 },
        { x: 0.39, y: 0.14 },
        { x: 0.34, y: 0.16 }
      ]);

      // Great Britain & Ireland
      drawLand([
        { x: 0.42, y: 0.21 },
        { x: 0.44, y: 0.19 },
        { x: 0.44, y: 0.24 },
        { x: 0.42, y: 0.25 }
      ]);

      // Iceland
      drawLand([
        { x: 0.39, y: 0.16 },
        { x: 0.42, y: 0.15 },
        { x: 0.41, y: 0.18 },
        { x: 0.39, y: 0.18 }
      ]);

      // Madagascar
      drawLand([
        { x: 0.59, y: 0.64 },
        { x: 0.61, y: 0.61 },
        { x: 0.6, y: 0.73 },
        { x: 0.58, y: 0.74 }
      ]);

      // Japan
      drawLand([
        { x: 0.88, y: 0.24 },
        { x: 0.9, y: 0.28 },
        { x: 0.89, y: 0.33 },
        { x: 0.87, y: 0.31 }
      ]);

      // Eurasia (Europe + Asia)
      drawLand([
        { x: 0.41, y: 0.35 }, // spain
        { x: 0.42, y: 0.26 }, // france
        { x: 0.45, y: 0.23 }, // denmark
        { x: 0.47, y: 0.15 }, // scandinavia
        { x: 0.49, y: 0.16 },
        { x: 0.49, y: 0.24 }, // baltic
        { x: 0.56, y: 0.14 }, // siberia north
        { x: 0.7, y: 0.12 },
        { x: 0.84, y: 0.13 },
        { x: 0.87, y: 0.16 }, // kamchatka
        { x: 0.84, y: 0.22 },
        { x: 0.86, y: 0.28 }, // korea
        { x: 0.87, y: 0.34 }, // china coast
        { x: 0.84, y: 0.41 }, // indochina
        { x: 0.79, y: 0.42 }, // bangladesh
        { x: 0.77, y: 0.46 }, // india
        { x: 0.74, y: 0.4 },
        { x: 0.69, y: 0.42 }, // arabia
        { x: 0.67, y: 0.48 },
        { x: 0.62, y: 0.45 },
        { x: 0.62, y: 0.39 }, // red sea
        { x: 0.58, y: 0.36 }, // turkey
        { x: 0.51, y: 0.33 }, // greece/italy
        { x: 0.45, y: 0.32 }  // mediterranean
      ]);

      // Africa
      drawLand([
        { x: 0.45, y: 0.36 }, // morocco
        { x: 0.54, y: 0.35 }, // libya
        { x: 0.59, y: 0.39 }, // sinai
        { x: 0.59, y: 0.49 }, // horn of africa
        { x: 0.56, y: 0.66 }, // mozambique
        { x: 0.53, y: 0.77 }, // south africa
        { x: 0.49, y: 0.74 },
        { x: 0.48, y: 0.55 }, // gulf of guinea
        { x: 0.41, y: 0.47 }, // west hump
        { x: 0.43, y: 0.38 }
      ]);

      // Australia
      drawLand([
        { x: 0.76, y: 0.63 }, // west
        { x: 0.82, y: 0.58 }, // darwin
        { x: 0.87, y: 0.61 }, // queensland
        { x: 0.88, y: 0.73 }, // sydney
        { x: 0.83, y: 0.76 }, // melbourne
        { x: 0.76, y: 0.73 }
      ]);

      // Antarctica (wavy polygon instead of full block)
      drawLand([
        { x: 0.05, y: 0.94 },
        { x: 0.15, y: 0.91 },
        { x: 0.3, y: 0.93 },
        { x: 0.45, y: 0.89 },
        { x: 0.6, y: 0.91 },
        { x: 0.75, y: 0.9 },
        { x: 0.88, y: 0.93 },
        { x: 0.95, y: 0.95 },
        { x: 0.95, y: 0.99 },
        { x: 0.05, y: 0.99 }
      ]);

      const texture = new THREE.CanvasTexture(canvas);
      return texture;
    };

    // 1. Solid Earth Core (pulses with Schumann/Bass harmonics)
    const earthTexture = createEarthTexture();
    const coreGeom = new THREE.SphereGeometry(1.05, 32, 32);
    const coreMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.4,
      metalness: 0.25,
      transparent: true,
      opacity: 0.95
    });
    coreMesh = new THREE.Mesh(coreGeom, coreMat);
    coreMesh.rotation.y = Math.PI; // Face the Americas nicely on start
    threeScene.add(coreMesh);

    // 2. Wireframe Cage (undulates with active frequency spectrum)
    const cageGeom = new THREE.IcosahedronGeometry(2.05, 2);
    // Cache the baseline vertex coordinates for real-time offset calculation
    const posAttr = cageGeom.attributes.position;
    cageGeom.userData = {
      originalPositions: new Float32Array(posAttr.array)
    };

    const cageMat = new THREE.MeshBasicMaterial({
      color: 0x7c3aed,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    cageMesh = new THREE.Mesh(cageGeom, cageMat);
    threeScene.add(cageMesh);

    // 3. Orbiting Telemetry Particles (rotates and reacts to high tones)
    const particleCount = 80;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const originalRadii = new Float32Array(particleCount);
    const randomSpeeds = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount * 2); // phi, theta pairs

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.5 + Math.random() * 0.6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      originalRadii[i] = radius;
      randomSpeeds[i] = 0.004 + Math.random() * 0.008;
      angles[i * 2] = phi;
      angles[i * 2 + 1] = theta;
    }

    particleGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeom.userData = {
      originalRadii: originalRadii,
      randomSpeeds: randomSpeeds,
      angles: angles
    };

    const particleMat = new THREE.PointsMaterial({
      color: 0x0891b2,
      size: 0.075,
      transparent: true,
      opacity: 0.85
    });
    orbitPoints = new THREE.Points(particleGeom, particleMat);
    threeScene.add(orbitPoints);
  }
  initThreeJS();

  // Dynamic resonance coherence display based on active mixer channels
  function updateResonanceCoherence() {
    const resonanceEl = document.getElementById("resonanceCoherence");
    if (!resonanceEl) return;

    const activeIds = Object.keys(activeChannels).map(Number);
    
    if (activeIds.length === 0) {
      resonanceEl.textContent = "NOT STARTED";
      resonanceEl.className = "text-slate-500 font-bold";
      return;
    }

    // Schumann Resonance Channel IDs: 1 (CH1), 8 (CH2), 9 (CH3)
    const schumannIds = [1, 8, 9];
    const activeSchumann = activeIds.filter(id => schumannIds.includes(id));
    const activeOthers = activeIds.filter(id => !schumannIds.includes(id));

    if (activeOthers.length === 0 && activeSchumann.length > 0) {
      resonanceEl.textContent = "SCHUMANN COHERENT";
      resonanceEl.className = "text-emerald-700 font-bold animate-pulse";
    } else if (activeIds.includes(3) || activeIds.includes(4) || activeIds.includes(5)) {
      resonanceEl.textContent = "ULTRASONIC COUPLING";
      resonanceEl.className = "text-amber-600 font-bold";
    } else if (activeIds.includes(2) || activeIds.includes(6)) {
      resonanceEl.textContent = "SOLFEGGIO HARMONIC";
      resonanceEl.className = "text-emerald-600 font-bold";
    } else if (activeIds.includes(7)) {
      resonanceEl.textContent = "ORGANIC MASKING";
      resonanceEl.className = "text-teal-600 font-bold";
    } else {
      resonanceEl.textContent = "COMPLEX COUPLING";
      resonanceEl.className = "text-purple-600 font-bold";
    }
  }

  // Helper to convert HSL to Hex color for PixiJS drawing
  function hslaToHex(h, s, l) {
    s /= 100;
    l /= 100;
    let c = (1 - Math.abs(2 * l - 1)) * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) {
      r = c; g = x; b = 0;
    } else if (60 <= h && h < 120) {
      r = x; g = c; b = 0;
    } else if (120 <= h && h < 180) {
      r = 0; g = c; b = x;
    } else if (180 <= h && h < 240) {
      r = 0; g = x; b = c;
    } else if (240 <= h && h < 300) {
      r = x; g = 0; b = c;
    } else if (300 <= h && h < 360) {
      r = c; g = 0; b = x;
    }
    let red = Math.round((r + m) * 255);
    let green = Math.round((g + m) * 255);
    let blue = Math.round((b + m) * 255);
    return (red << 16) + (green << 8) + blue;
  }

  function spawnParticle(x, y, vx, vy, size, color, maxLife) {
    if (particles.length > 150) {
      particles.shift();
    }
    particles.push({
      x: x,
      y: y,
      vx: vx,
      vy: vy,
      size: size,
      color: color,
      life: maxLife,
      maxLife: maxLife
    });
  }

  function updateAndDrawParticles() {
    const width = soundGraphCanvas.clientWidth;
    const height = soundGraphCanvas.clientHeight;
    
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 1;
      
      if (p.life <= 0 || p.x < 0 || p.x > width || p.y < 0 || p.y > height) {
        particles.splice(i, 1);
        continue;
      }
      
      const alpha = p.life / p.maxLife;
      particleGraphics.lineStyle(0);
      particleGraphics.beginFill(p.color, alpha);
      particleGraphics.drawCircle(p.x, p.y, p.size);
      particleGraphics.endFill();
    }
  }

  // Draw initial static clean grid in canvas depending on view mode
  function drawStaticGrid() {
    const w = soundGraphCanvas.clientWidth;
    const h = soundGraphCanvas.clientHeight;
    pixiApp.renderer.resize(w, h);
    
    gridGraphics.clear();
    particleGraphics.clear();
    
    const mode = visualizerModeSelect ? visualizerModeSelect.value : "spectrum";

    if (mode === "radial") {
      // Draw radar scope grid (concentric circles and crosshairs)
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.45;
      
      gridGraphics.lineStyle(1.5, 0x4f46e5, 0.08);
      for (let r = maxRadius / 3; r <= maxRadius; r += maxRadius / 3) {
        gridGraphics.drawCircle(cx, cy, r);
      }
      
      gridGraphics.moveTo(cx - maxRadius, cy);
      gridGraphics.lineTo(cx + maxRadius, cy);
      gridGraphics.moveTo(cx, cy - maxRadius);
      gridGraphics.lineTo(cx, cy + maxRadius);

      gridGraphics.lineStyle(1.5, 0x4f46e5, 0.2);
      gridGraphics.drawCircle(cx, cy, maxRadius);
    } else if (mode === "oscilloscope") {
      gridGraphics.lineStyle(1.0, 0x000000, 0.03);
      for (let y = h / 4; y < h; y += h / 4) {
        if (Math.abs(y - h / 2) > 2) {
          gridGraphics.moveTo(0, y);
          gridGraphics.lineTo(w, y);
        }
      }
      gridGraphics.lineStyle(2.0, 0x4f46e5, 0.25);
      gridGraphics.moveTo(0, h / 2);
      gridGraphics.lineTo(w, h / 2);
    } else {
      gridGraphics.lineStyle(1.0, 0x000000, 0.04);
      for (let x = 20; x < w; x += 20) {
        gridGraphics.moveTo(x, 0);
        gridGraphics.lineTo(x, h);
      }
      for (let y = 20; y < h; y += 20) {
        gridGraphics.moveTo(0, y);
        gridGraphics.lineTo(w, y);
      }
    }
  }
  drawStaticGrid();
  
  window.addEventListener("resize", () => {
    initGridNodes();
    if (!animationId) drawStaticGrid();
  });
  
  if (visualizerModeSelect) {
    visualizerModeSelect.addEventListener("change", () => {
      if (!animationId) drawStaticGrid();
    });
  }

  // TONE LAYER SETUP FUNCTIONS
  // Channel 1: 7.83 Hz AM (Fundamental Schumann)
  function setupChannel1(ctx, dest, gainVal) {
    const carrier = ctx.createOscillator();
    carrier.frequency.value = 100; // Carrier tone
    const ampGain = ctx.createGain();
    ampGain.gain.value = gainVal;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 7.83; // Schumann frequency
    lfoGain.gain.value = 8; // FM modulation width

    lfo.connect(lfoGain).connect(carrier.frequency);
    carrier.connect(ampGain).connect(dest);

    lfo.start();
    carrier.start();

    return {
      nodes: [carrier, lfo, ampGain, lfoGain],
      gainNode: ampGain
    };
  }

  // Channel 2: 14.3 Hz AM (Schumann 2nd Resonance)
  function setupChannel8(ctx, dest, gainVal) {
    const carrier = ctx.createOscillator();
    carrier.frequency.value = 120;
    const ampGain = ctx.createGain();
    ampGain.gain.value = gainVal;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 14.3;
    lfoGain.gain.value = 8;

    lfo.connect(lfoGain).connect(carrier.frequency);
    carrier.connect(ampGain).connect(dest);

    lfo.start();
    carrier.start();

    return {
      nodes: [carrier, lfo, ampGain, lfoGain],
      gainNode: ampGain
    };
  }

  // Channel 3: 20.8 Hz AM (Schumann 3rd Resonance)
  function setupChannel9(ctx, dest, gainVal) {
    const carrier = ctx.createOscillator();
    carrier.frequency.value = 140;
    const ampGain = ctx.createGain();
    ampGain.gain.value = gainVal;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 20.8;
    lfoGain.gain.value = 8;

    lfo.connect(lfoGain).connect(carrier.frequency);
    carrier.connect(ampGain).connect(dest);

    lfo.start();
    carrier.start();

    return {
      nodes: [carrier, lfo, ampGain, lfoGain],
      gainNode: ampGain
    };
  }

  // Channel 4: 528 Hz Constant Harmonic
  function setupChannel2(ctx, dest, gainVal) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 528;
    const gain = ctx.createGain();
    gain.gain.value = gainVal;

    osc.connect(gain).connect(dest);
    osc.start();

    return {
      nodes: [osc, gain],
      gainNode: gain
    };
  }

  // Channel 5: 17 kHz Ultrasonic Pulsed Pings
  function setupChannel3(ctx, dest, gainVal) {
    const chGain = ctx.createGain();
    chGain.gain.value = gainVal;
    chGain.connect(dest);

    const ping = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 17000;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
      osc.connect(gain).connect(chGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    };

    ping(); // Fire initial ping immediately
    const intervalId = setInterval(ping, 3000); // Repeat every 3s

    return {
      nodes: [],
      gainNode: chGain,
      cleanup: () => clearInterval(intervalId)
    };
  }

  // Channel 6: 1 kHz Square Rhythmic Pulses
  function setupChannel4(ctx, dest, gainVal) {
    const chGain = ctx.createGain();
    chGain.gain.value = gainVal;
    chGain.connect(dest);

    const pulse = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1000;
      osc.type = "square";
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.connect(gain).connect(chGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    };

    pulse();
    const intervalId = setInterval(pulse, 2000); // Repeat every 2s

    return {
      nodes: [],
      gainNode: chGain,
      cleanup: () => clearInterval(intervalId)
    };
  }

  // Channel 7: 2.5 kHz Sweep Chirps
  function setupChannel5(ctx, dest, gainVal) {
    const chGain = ctx.createGain();
    chGain.gain.value = gainVal;
    chGain.connect(dest);

    const chirp = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(2500, ctx.currentTime);
      osc.type = "square";
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.connect(gain).connect(chGain);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    };

    chirp();
    const intervalId = setInterval(chirp, 10000); // Repeat every 10s

    return {
      nodes: [],
      gainNode: chGain,
      cleanup: () => clearInterval(intervalId)
    };
  }

  // Channel 8: 432 Hz Ambient Pad
  function setupChannel6(ctx, dest, gainVal) {
    const osc = ctx.createOscillator();
    osc.frequency.value = 432;
    osc.type = "triangle";
    const gain = ctx.createGain();
    gain.gain.value = gainVal;

    osc.connect(gain).connect(dest);
    osc.start();

    return {
      nodes: [osc, gain],
      gainNode: gain
    };
  }

  // Channel 9: Breath Modulated White Noise Layer
  function setupChannel7(ctx, dest, gainVal) {
    const chGain = ctx.createGain();
    chGain.gain.value = gainVal;
    chGain.connect(dest);

    // Create white noise buffer source
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.5;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.25; // slow breathing (4s cycle)
    lfoGain.gain.value = 0.45; // modulation depth

    lfo.connect(lfoGain).connect(noiseGain.gain);

    const pFilter = ctx.createBiquadFilter();
    pFilter.type = "highpass";
    pFilter.frequency.value = 20;

    const pFilter1 = ctx.createBiquadFilter();
    pFilter1.type = "lowpass";
    pFilter1.frequency.value = 2000;

    whiteNoise.connect(pFilter).connect(pFilter1).connect(noiseGain).connect(chGain);

    whiteNoise.start();
    lfo.start();

    return {
      nodes: [whiteNoise, lfo, noiseGain, lfoGain, pFilter, pFilter1],
      gainNode: chGain
    };
  }

  // CHANNELS DICTIONARY DEFINITION
  const channelsConfig = [
    { id: 1, setup: setupChannel1, defaultVal: 0.7, sliderId: "volumeTone1", buttonId: "playTone1", indicatorId: "channelIndicator1", valTextId: "volVal1" },
    { id: 8, setup: setupChannel8, defaultVal: 0.6, sliderId: "volumeTone8", buttonId: "playTone8", indicatorId: "channelIndicator8", valTextId: "volVal8" },
    { id: 9, setup: setupChannel9, defaultVal: 0.5, sliderId: "volumeTone9", buttonId: "playTone9", indicatorId: "channelIndicator9", valTextId: "volVal9" },
    { id: 2, setup: setupChannel2, defaultVal: 0.04, sliderId: "volumeTone2", buttonId: "playTone2", indicatorId: "channelIndicator2", valTextId: "volVal2" },
    { id: 3, setup: setupChannel3, defaultVal: 0.1, sliderId: "volumeTone3", buttonId: "playTone3", indicatorId: "channelIndicator3", valTextId: "volVal3" },
    { id: 4, setup: setupChannel4, defaultVal: 0.2, sliderId: "volumeTone4", buttonId: "playTone4", indicatorId: "channelIndicator4", valTextId: "volVal4" },
    { id: 5, setup: setupChannel5, defaultVal: 0.2, sliderId: "volumeTone5", buttonId: "playTone5", indicatorId: "channelIndicator5", valTextId: "volVal5" },
    { id: 6, setup: setupChannel6, defaultVal: 0.02, sliderId: "volumeTone6", buttonId: "playTone6", indicatorId: "channelIndicator6", valTextId: "volVal6" },
    { id: 7, setup: setupChannel7, defaultVal: 0.03, sliderId: "volumeTone7", buttonId: "playTone7", indicatorId: "channelIndicator7", valTextId: "volVal7" }
  ];

  // INITIALIZE AUDIO CONTEXT ON DEMAND
  function initAudio() {
    if (audioContext) return;
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;

    masterGainNode = audioContext.createGain();
    masterGainNode.gain.value = masterVolumeSlider.valueAsNumber;

    analyserNode.connect(masterGainNode);
    masterGainNode.connect(audioContext.destination);
  }

  // INDIVIDUAL CHANNEL ROUTING & CONTROLS
  function toggleChannel(config) {
    initAudio();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const id = config.id;
    const button = document.getElementById(config.buttonId);
    const indicator = document.getElementById(config.indicatorId);
    const slider = document.getElementById(config.sliderId);

    const card = document.getElementById("channelCard" + id);
    if (activeChannels[id]) {
      stopChannel(id);
      
      // Update UI button and LED status
      button.textContent = "▶";
      button.classList.remove("btn-active-glow");
      indicator.className = "w-2.5 h-2.5 rounded-full bg-slate-300";
      if (card) card.classList.remove("channel-active");
    } else {
      const gainVal = parseFloat(slider.value);
      const result = config.setup(audioContext, analyserNode, gainVal);
      activeChannels[id] = result;

      // Update UI button and LED status
      button.textContent = "⏸";
      button.classList.add("btn-active-glow");
      indicator.className = "w-2.5 h-2.5 rounded-full bg-emerald-500 blink-led";
      if (card) card.classList.add("channel-active");
      resetButton.disabled = false;
    }

    // Dynamic Resonance updates
    updateResonanceCoherence();
  }

  function stopChannel(id) {
    const ch = activeChannels[id];
    if (ch) {
      if (ch.nodes) {
        ch.nodes.forEach(n => {
          try { n.stop && n.stop(); } catch(e) {}
        });
      }
      if (ch.cleanup) ch.cleanup();
      delete activeChannels[id];
    }
  }

  // BIND SLIDERS AND PLAY BUTTONS DYNAMICALLY
  channelsConfig.forEach(config => {
    const slider = document.getElementById(config.sliderId);
    const button = document.getElementById(config.buttonId);

    // Click behavior
    button.onclick = () => toggleChannel(config);

    // Live volume adjustments
    slider.oninput = () => {
      const val = parseFloat(slider.value);
      
      // Compute display percentage text
      let displayVal = Math.round(val * 100) + "%";
      if (config.id === 2 || config.id === 6 || config.id === 7) {
        displayVal = (val * 100).toFixed(1) + "%";
      }
      document.getElementById(config.valTextId).textContent = displayVal;

      // Adjust gain node value live if playing
      if (activeChannels[config.id] && activeChannels[config.id].gainNode) {
        activeChannels[config.id].gainNode.gain.setValueAtTime(val, audioContext.currentTime);
      }
    };
  });

  // MASTER VOLUME SLIDER BINDING
  masterVolumeSlider.oninput = () => {
    if (masterGainNode) {
      masterGainNode.gain.setValueAtTime(masterVolumeSlider.valueAsNumber, audioContext.currentTime);
    }
  };

  // SUMMON LIVE PREVIEW FLOW (30 Seconds)
  function startSummoning() {
    initAudio();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Turn ON all channels that are currently stopped
    channelsConfig.forEach(config => {
      if (!activeChannels[config.id]) {
        toggleChannel(config);
      }
    });

    // Update Console HUD UI
    previewButton.textContent = "Stop Sequence";
    previewButton.className = "w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-5 px-6 rounded-xl text-base tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer";
    resetButton.disabled = true;

    // Set recording indicators to active pulsing red
    const recordingLabel = document.getElementById("recordingLabel");
    if (recordingLabel) {
      recordingLabel.className = "recording-active-blink font-bold transition-colors duration-200";
    }
    countdownTimer.className = "font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded border border-rose-500 transition-all duration-200 animate-pulse";

    timeLeft = 30.0;
    countdownTimer.textContent = timeLeft.toFixed(1) + "s";

    clearInterval(previewInterval);
    previewInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(previewInterval);
      }
      countdownTimer.textContent = timeLeft.toFixed(1) + "s";
    }, 100);

    clearTimeout(summonTimeout);
    summonTimeout = setTimeout(() => {
      stopAllAudio();
      alert("⏹️ Summoning live preview completed.");
    }, 30000);
  }

  function stopAllAudio() {
    // Turn off all playing channels
    channelsConfig.forEach(config => {
      if (activeChannels[config.id]) {
        toggleChannel(config);
      }
    });

    clearInterval(previewInterval);
    clearTimeout(summonTimeout);

    // Reset Console HUD UI
    previewButton.textContent = "Summon Aliens";
    previewButton.className = "btn-primary-green w-full text-white font-extrabold py-5 px-6 rounded-xl text-base tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer";
    resetButton.disabled = false;

    // Reset recording indicators to standby grey
    const recordingLabel = document.getElementById("recordingLabel");
    if (recordingLabel) {
      recordingLabel.className = "text-slate-400 font-bold transition-colors duration-200";
    }
    countdownTimer.className = "font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded border border-slate-300 transition-all duration-200";
    countdownTimer.textContent = "30.0s";
  }

  previewButton.onclick = startSummoning;

  // COMPILE & DOWNLOAD 30s RECORDING
  function startRecording() {
    initAudio();
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    // Connect master output to a media stream destination
    const dest = audioContext.createMediaStreamDestination();
    masterGainNode.connect(dest);

    recorder = new MediaRecorder(dest.stream, { mimeType: "audio/webm" });
    chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "uap_summon_sound.webm";
      a.click();

      // Clean up routing connection to recorder destination
      try { masterGainNode.disconnect(dest); } catch(e) {}
    };

    // Activate all channels for complete signal compilation
    channelsConfig.forEach(config => {
      if (!activeChannels[config.id]) {
        toggleChannel(config);
      }
    });

    recorder.start();

    // Update Console HUD UI
    previewButton.textContent = "Stop Sequence";
    previewButton.className = "w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-5 px-6 rounded-xl text-base tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer";
    resetButton.disabled = true;

    // Set recording indicators to active pulsing red
    const recordingLabel = document.getElementById("recordingLabel");
    if (recordingLabel) {
      recordingLabel.className = "recording-active-blink font-bold transition-colors duration-200";
    }
    countdownTimer.className = "font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded border border-rose-500 transition-all duration-200 animate-pulse";

    timeLeft = 30.0;
    countdownTimer.textContent = timeLeft.toFixed(1) + "s";

    clearInterval(recordingInterval);
    recordingInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(recordingInterval);
      }
      countdownTimer.textContent = timeLeft.toFixed(1) + "s";
    }, 100);

    clearTimeout(recordingTimeout);
    recordingTimeout = setTimeout(() => {
      stopRecordingFlow();
      alert("⏹️ Signal compilation completed. Audio downloaded.");
    }, 30000);
  }

  function stopRecordingFlow() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    clearInterval(recordingInterval);
    clearTimeout(recordingTimeout);
    stopAllAudio();
  }

  startButton.onclick = startRecording;

  // PREVIEW BUTTON BEHAVIOR TOGGLES ACTIVE STATES
  previewButton.onclick = () => {
    const isRecording = recorder && recorder.state !== "inactive";
    const isPlaying = Object.keys(activeChannels).length > 0;
    if (isRecording || isPlaying) {
      if (isRecording) {
        stopRecordingFlow();
      } else {
        stopAllAudio();
      }
    } else {
      startSummoning();
    }
  };

  // SYSTEM CONTEXT RESET
  resetButton.onclick = () => {
    if (audioContext) {
      // Deactivate all channels
      channelsConfig.forEach(config => {
        stopChannel(config.id);
        const button = document.getElementById(config.buttonId);
        const indicator = document.getElementById(config.indicatorId);
        const card = document.getElementById("channelCard" + config.id);
        button.textContent = "▶";
        button.classList.remove("btn-active-glow");
        indicator.className = "w-2.5 h-2.5 rounded-full bg-slate-300";
        if (card) card.classList.remove("channel-active");
      });

      // Clear particles (animation loop continues running in standby mode)
      particles = [];

      // Reset sliders and readout metrics to default values
      channelsConfig.forEach(config => {
        const slider = document.getElementById(config.sliderId);
        slider.value = config.defaultVal;

        let displayVal = Math.round(config.defaultVal * 100) + "%";
        if (config.id === 2 || config.id === 6 || config.id === 7) {
          displayVal = (config.defaultVal * 100).toFixed(1) + "%";
        }
        document.getElementById(config.valTextId).textContent = displayVal;
      });

      // Close the audio context safely
      audioContext.close().then(() => {
        audioContext = null;
        masterGainNode = null;
        analyserNode = null;
        updateResonanceCoherence();
        resetButton.disabled = true;
        alert("Audio reset successfully.");
      });
    }
  };

  // HIGH-FIDELITY GLOWING FREQUENCY SPECTROGRAM VISUALIZER
  function startGraphVisualizer() {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    const bufferLength = 128;
    const dataArray = new Uint8Array(bufferLength);
    const orbFreqArray = new Uint8Array(bufferLength);

    // Sync canvas drawing space with layout pixel scale
    function resizeCanvas() {
      const rect = soundGraphCanvas.getBoundingClientRect();
      soundGraphCanvas.width = rect.width * window.devicePixelRatio;
      soundGraphCanvas.height = rect.height * window.devicePixelRatio;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    
    // Clear particles on start
    particles = [];
    let phase = 0;

    function draw() {
      animationId = requestAnimationFrame(draw);

      const width = soundGraphCanvas.clientWidth;
      const height = soundGraphCanvas.clientHeight;

      // Make sure PixiJS renderer size is sync'd
      if (pixiApp.renderer.width !== width || pixiApp.renderer.height !== height) {
        pixiApp.renderer.resize(width, height);
        initGridNodes();
      }

      // Make sure Three.js renderer size is sync'd
      if (threeRenderer) {
        const threeW = resonanceOrbCanvas.clientWidth;
        const threeH = resonanceOrbCanvas.clientHeight;
        if (threeRenderer.domElement.width !== threeW * (window.devicePixelRatio || 1) || threeRenderer.domElement.height !== threeH * (window.devicePixelRatio || 1)) {
          threeRenderer.setSize(threeW, threeH);
          threeCamera.aspect = threeW / threeH;
          threeCamera.updateProjectionMatrix();
        }
      }

      gridGraphics.clear();
      particleGraphics.clear();

      const mode = visualizerModeSelect ? visualizerModeSelect.value : "spectrum";
      phase += 0.08; // Increment ripples phase

      // Query active audio analyzer node if available, otherwise fallback to standby zeroes/midlines
      const activeAnalyser = analyserNode;
      if (activeAnalyser) {
        if (mode === "oscilloscope") {
          activeAnalyser.getByteTimeDomainData(dataArray);
        } else {
          activeAnalyser.getByteFrequencyData(dataArray);
        }
        activeAnalyser.getByteFrequencyData(orbFreqArray);
      } else {
        if (mode === "oscilloscope") {
          dataArray.fill(128);
        } else {
          dataArray.fill(0);
        }
        orbFreqArray.fill(0);
      }

      if (mode === "radial") {
        const cx = width / 2;
        const cy = height / 2;
        const maxRadius = Math.min(width, height) * 0.45;
        const innerRadius = maxRadius * 0.25;

        // Draw concentric radar lines
        gridGraphics.lineStyle(1.0, 0x4f46e5, 0.05);
        for (let r = maxRadius / 3; r <= maxRadius; r += maxRadius / 3) {
          gridGraphics.drawCircle(cx, cy, r);
        }
        
        // Draw crosshairs
        gridGraphics.moveTo(cx - maxRadius, cy);
        gridGraphics.lineTo(cx + maxRadius, cy);
        gridGraphics.moveTo(cx, cy - maxRadius);
        gridGraphics.lineTo(cx, cy + maxRadius);

        // Outer ring boundary
        gridGraphics.lineStyle(1.5, 0x4f46e5, 0.12);
        gridGraphics.drawCircle(cx, cy, maxRadius);

        // Draw circular frequency sweep
        const numSpokes = Math.min(bufferLength, 85);
        const angleStep = (Math.PI * 2) / numSpokes;
        
        for (let i = 0; i < numSpokes; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const spokeLength = percent * (maxRadius - innerRadius);

          const angle = i * angleStep - Math.PI / 2;
          const xStart = cx + Math.cos(angle) * innerRadius;
          const yStart = cy + Math.sin(angle) * innerRadius;
          const xEnd = cx + Math.cos(angle) * (innerRadius + spokeLength);
          const yEnd = cy + Math.sin(angle) * (innerRadius + spokeLength);

          const hue = 240 + percent * 110;
          const colorHex = hslaToHex(hue, 90, 50);
          
          gridGraphics.lineStyle(Math.max(2, (width / numSpokes) * 0.5), colorHex, 0.8);
          gridGraphics.moveTo(xStart, yStart);
          gridGraphics.lineTo(xEnd, yEnd);

          // Spawn radial particles
          if (val > 100 && Math.random() < 0.15) {
            spawnParticle(xEnd, yEnd, Math.cos(angle) * (1 + percent * 3), Math.sin(angle) * (1 + percent * 3), 1.5 + percent * 1.5, colorHex, 45);
          }
        }

        // Pulsing inner ring core
        const lowFreqVal = dataArray[1] || 0;
        const pulseFactor = 1 + (lowFreqVal / 255) * 0.15;
        
        gridGraphics.lineStyle(2.0, 0x4f46e5, 1.0);
        gridGraphics.beginFill(0x4f46e5, 0.08);
        gridGraphics.drawCircle(cx, cy, innerRadius * pulseFactor);
        gridGraphics.endFill();

      } else if (mode === "oscilloscope") {
        // Draw central baseline and horizontal grid lines
        gridGraphics.lineStyle(1.0, 0x000000, 0.02);
        for (let y = height / 4; y < height; y += height / 4) {
          if (Math.abs(y - height / 2) > 2) {
            gridGraphics.moveTo(0, y);
            gridGraphics.lineTo(width, y);
          }
        }
        gridGraphics.lineStyle(1.5, 0x4f46e5, 0.1);
        gridGraphics.moveTo(0, height / 2);
        gridGraphics.lineTo(width, height / 2);

        // Trace wave curve
        gridGraphics.lineStyle(3.0, 0x4f46e5, 0.95);
        
        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            gridGraphics.moveTo(x, y);
          } else {
            gridGraphics.lineTo(x, y);
          }
          
          // Spawn waveform current particles
          if (Math.abs(dataArray[i] - 128) > 15 && Math.random() < 0.05) {
            const flowSpeed = 2.5 + Math.random() * 2;
            spawnParticle(x, y, flowSpeed, (v - 1.0) * 1.5, 1.5, 0x4f46e5, 50);
          }

          x += sliceWidth;
        }

      } else {
        // FFT Spectrum - Gravitational Grid deforming
        // Calculate average amplitude for ripple scaling
        let sum = 0;
        for (let i = 0; i < 40; i++) sum += dataArray[i] || 0;
        const avg = sum / 40;
        const amplitude = (avg / 255) * 16; // ripple height up to 16px
        
        // Displace space-time grid nodes
        const cx = width / 2;
        const cy = height / 2;
        
        for (let c = 0; c < gridCols; c++) {
          for (let r = 0; r < gridRows; r++) {
            const node = gridNodes[c][r];
            if (!node) continue;
            
            const dx = node.originX - cx;
            const dy = node.originY - cy;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            
            // Generate expanding circular gravity ripples
            const factor = Math.max(0, 1 - dist / (width * 0.7)); // fade with distance
            const ripple = Math.sin(dist / 14 - phase) * amplitude * factor;
            
            node.x = node.originX + (dx / dist) * ripple;
            node.y = node.originY + (dy / dist) * ripple;
          }
        }

        // Draw horizontal grid lines
        gridGraphics.lineStyle(1.5, 0x4f46e5, 0.12);
        for (let r = 0; r < gridRows; r++) {
          if (gridNodes[0] && gridNodes[0][r]) {
            gridGraphics.moveTo(gridNodes[0][r].x, gridNodes[0][r].y);
            for (let c = 1; c < gridCols; c++) {
              gridGraphics.lineTo(gridNodes[c][r].x, gridNodes[c][r].y);
            }
          }
        }
        
        // Draw vertical grid lines
        for (let c = 0; c < gridCols; c++) {
          if (gridNodes[c] && gridNodes[c][0]) {
            gridGraphics.moveTo(gridNodes[c][0].x, gridNodes[c][0].y);
            for (let r = 1; r < gridRows; r++) {
              gridGraphics.lineTo(gridNodes[c][r].x, gridNodes[c][r].y);
            }
          }
        }

        // Draw frequency amplitude bars on top of the grid
        const barWidth = (width / bufferLength) * 1.25;
        let barX = 0;

        for (let i = 0; i < bufferLength; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const barHeight = percent * height * 0.95;
          const barY = height - barHeight;

          if (barHeight > 0) {
            const hue = 240 + percent * 110;
            const colorHex = hslaToHex(hue, 90, 48);
            
            // Draw visual spectrum columns
            gridGraphics.lineStyle(0);
            gridGraphics.beginFill(colorHex, 0.85);
            gridGraphics.drawRoundedRect(barX, barY, barWidth - 2, barHeight, 3);
            gridGraphics.endFill();

            // Spawn sparks particles at the top of active columns
            if (val > 140 && Math.random() < 0.12) {
              spawnParticle(barX + barWidth / 2, barY, (Math.random() - 0.5) * 1.2, -1 - Math.random() * 2.5, 2.0, colorHex, 40);
            }
          }

          barX += barWidth;
        }
      }

      // Update and Draw Particles
      updateAndDrawParticles();

      // Render Three.js 3D Orb Animations
      if (coreMesh && cageMesh && orbitPoints) {
        let avgEnergy = 0;
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) sum += orbFreqArray[i];
        avgEnergy = sum / bufferLength;

        // Slow rotation speeds up when sound is active (boosted 15%)
        const rotSpeedFactor = 1.0 + (avgEnergy / 255) * 5.75;
        coreMesh.rotation.y += 0.005 * rotSpeedFactor;
        coreMesh.rotation.x += 0.002 * rotSpeedFactor;
        cageMesh.rotation.y -= 0.003 * rotSpeedFactor;
        cageMesh.rotation.x -= 0.001 * rotSpeedFactor;
        orbitPoints.rotation.y += 0.002 * rotSpeedFactor;

        // Core dynamic pulse (bass frequencies e.g. Schumann Resonance bins 1, 2, 3) - boosted 15%
        const bassVal = orbFreqArray[1] * 0.4 + orbFreqArray[2] * 0.4 + orbFreqArray[3] * 0.2;
        const targetCoreScale = 1.0 + (bassVal / 255) * 0.52 + (activeAnalyser ? 0 : Math.sin(Date.now() * 0.002) * 0.05);
        coreMesh.scale.set(targetCoreScale, targetCoreScale, targetCoreScale);

        // 3D Icosahedron Cage vertex mutation based on frequency spectrum - boosted 15%
        const cageGeom = cageMesh.geometry;
        const posAttr = cageGeom.attributes.position;
        const origPos = cageGeom.userData.originalPositions;
        
        for (let i = 0; i < posAttr.count; i++) {
          const x_orig = origPos[i * 3];
          const y_orig = origPos[i * 3 + 1];
          const z_orig = origPos[i * 3 + 2];

          // map vertex index to frequency bin
          const bin = i % bufferLength;
          const amp = orbFreqArray[bin];
          // Up to 63% radial displacement (boosted 15% from 55%)
          const factor = 1.0 + (amp / 255) * 0.63;

          posAttr.setX(i, x_orig * factor);
          posAttr.setY(i, y_orig * factor);
          posAttr.setZ(i, z_orig * factor);
        }
        posAttr.needsUpdate = true;

        // Orbiting particles paths and high-frequency vibrations - boosted 15%
        const pGeom = orbitPoints.geometry;
        const pPosAttr = pGeom.attributes.position;
        const originalRadii = pGeom.userData.originalRadii;
        const randomSpeeds = pGeom.userData.randomSpeeds;
        const angles = pGeom.userData.angles;

        for (let i = 0; i < originalRadii.length; i++) {
          const bin = (i * 2) % bufferLength;
          const highAmp = orbFreqArray[bin];

          // Update rotation angle (boosted 15% from 3.0)
          angles[i * 2 + 1] += randomSpeeds[i] * (1.0 + (highAmp / 255) * 3.45);

          const phi = angles[i * 2];
          const theta = angles[i * 2 + 1];
          // Particle radius expansion (boosted 15% from 0.45)
          const r = originalRadii[i] + (highAmp / 255) * 0.52;

          pPosAttr.setX(i, r * Math.sin(phi) * Math.cos(theta));
          pPosAttr.setY(i, r * Math.sin(phi) * Math.sin(theta));
          pPosAttr.setZ(i, r * Math.cos(phi));
        }
        pPosAttr.needsUpdate = true;

        // Render Three.js scene
        threeRenderer.render(threeScene, threeCamera);
      }
    }
    draw();
  }
  startGraphVisualizer();
}

window.addEventListener("DOMContentLoaded", main);
