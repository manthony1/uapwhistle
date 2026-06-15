console.log("UAP Whistle: script loading...");

function main() {
  console.log("UAP Whistle: executing main()...");
  const startButton = document.getElementById("startButton");
  const previewButton = document.getElementById("previewButton");
  const resetButton = document.getElementById("resetButton");
  const masterVolumeSlider = document.getElementById("volumeSlider");
  const visualizerModeSelect = document.getElementById("visualizerMode");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const countdownTimer = document.getElementById("countdownTimer");
  
  // Basic/Pro Mixer Mode Toggle elements
  const btnMixerBasic = document.getElementById("btnMixerBasic");
  const btnMixerPro = document.getElementById("btnMixerPro");
  const mixerContainerBasic = document.getElementById("mixerContainerBasic");
  const mixerContainerPro = document.getElementById("mixerContainerPro");


  function setResetButtonDisabled(disabled) {
    resetButton.disabled = disabled;
    if (disabled) {
      resetButton.classList.remove("btn-reset-enabled");
      resetButton.classList.add("btn-reset-disabled");
    } else {
      resetButton.classList.remove("btn-reset-disabled");
      resetButton.classList.add("btn-reset-enabled");
    }
  }

  function showDownloadLink() {
    if (startButton) {
      startButton.classList.remove("opacity-0", "pointer-events-none");
      startButton.classList.add("opacity-100", "pointer-events-auto");
    }
  }

  function hideDownloadLink() {
    if (startButton) {
      startButton.classList.remove("opacity-100", "pointer-events-auto");
      startButton.classList.add("opacity-0", "pointer-events-none");
    }
  }

  let audioContext = null;
  let masterGainNode = null;
  let analyserNode = null;
  // p5.js visualizer instance
  let p5Instance = null;
  
  // Three.js visualizer objects and variables
  let threeScene = null;
  let threeCamera = null;
  let threeRenderer = null;
  let coreMesh = null;
  let cageMesh = null;
  let orbitPoints = null;
  const resonanceOrbCanvas = document.getElementById("resonanceOrb");

  let activeChannels = {}; // keys are config.id, values are { nodes, gainNode, cleanup }
  let recorder = null;
  let chunks = [];
  let previewInterval = null;
  let summonTimeout = null;
  let timeLeft = 60.0;
  let lastRecordedBlobUrl = null;
  let recorderDest = null;

  // Sound Graph Container configuration
  const soundGraphContainer = document.getElementById("soundGraphContainer");

  // Initialize Three.js 3D WebGL resonance orb
  function initThreeJS() {
    try {
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
      console.log("UAP Whistle: Three.js resonance orb initialized successfully.");
    } catch (err) {
      console.warn("UAP Whistle: Failed to initialize Three.js resonance orb (WebGL might be unsupported/disabled):", err);
    }
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



  // Basic/Pro Mixer Mode Switching
  if (btnMixerBasic && btnMixerPro && mixerContainerBasic && mixerContainerPro) {
    const indicator = document.getElementById("mixerToggleIndicator");
    btnMixerBasic.addEventListener("click", () => {
      mixerContainerBasic.classList.remove("hidden");
      mixerContainerPro.classList.add("hidden");
      
      if (indicator) {
        indicator.classList.remove("left-[72px]");
        indicator.classList.add("left-1");
      }
      btnMixerBasic.className = "flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer z-10 text-emerald-800";
      btnMixerPro.className = "flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer z-10 text-slate-400";
    });
    btnMixerPro.addEventListener("click", () => {
      mixerContainerBasic.classList.add("hidden");
      mixerContainerPro.classList.remove("hidden");
      
      if (indicator) {
        indicator.classList.remove("left-1");
        indicator.classList.add("left-[72px]");
      }
      btnMixerPro.className = "flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer z-10 text-emerald-800";
      btnMixerBasic.className = "flex-1 text-center text-xs font-bold transition-colors duration-200 cursor-pointer z-10 text-slate-400";
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
    { id: 1, setup: setupChannel1, defaultVal: 0.5, maxGain: 0.5, sliderId: "volumeTone1", buttonId: "playTone1", indicatorId: "channelIndicator1", valTextId: "volVal1" },
    { id: 8, setup: setupChannel8, defaultVal: 0.5, maxGain: 0.5, sliderId: "volumeTone8", buttonId: "playTone8", indicatorId: "channelIndicator8", valTextId: "volVal8" },
    { id: 9, setup: setupChannel9, defaultVal: 0.5, maxGain: 0.5, sliderId: "volumeTone9", buttonId: "playTone9", indicatorId: "channelIndicator9", valTextId: "volVal9" },
    { id: 2, setup: setupChannel2, defaultVal: 0.5, maxGain: 0.1, sliderId: "volumeTone2", buttonId: "playTone2", indicatorId: "channelIndicator2", valTextId: "volVal2" },
    { id: 3, setup: setupChannel3, defaultVal: 0.5, maxGain: 0.25, sliderId: "volumeTone3", buttonId: "playTone3", indicatorId: "channelIndicator3", valTextId: "volVal3" },
    { id: 4, setup: setupChannel4, defaultVal: 0.5, maxGain: 0.25, sliderId: "volumeTone4", buttonId: "playTone4", indicatorId: "channelIndicator4", valTextId: "volVal4" },
    { id: 5, setup: setupChannel5, defaultVal: 0.5, maxGain: 0.25, sliderId: "volumeTone5", buttonId: "playTone5", indicatorId: "channelIndicator5", valTextId: "volVal5" },
    { id: 6, setup: setupChannel6, defaultVal: 0.5, maxGain: 0.05, sliderId: "volumeTone6", buttonId: "playTone6", indicatorId: "channelIndicator6", valTextId: "volVal6" },
    { id: 7, setup: setupChannel7, defaultVal: 0.5, maxGain: 0.075, sliderId: "volumeTone7", buttonId: "playTone7", indicatorId: "channelIndicator7", valTextId: "volVal7" }
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
    const buttonPro = document.getElementById(config.buttonId + "Pro");
    const indicator = document.getElementById(config.indicatorId);
    const indicatorPro = document.getElementById(config.indicatorId + "Pro");
    const slider = document.getElementById(config.sliderId);

    const card = document.getElementById("channelCard" + id);
    const cardPro = document.getElementById("channelCard" + id + "Pro");

    if (activeChannels[id]) {
      stopChannel(id);
      
      // Update UI button and LED status for Basic
      if (button) {
        button.textContent = "▶";
        button.classList.remove("btn-active-glow");
      }
      if (indicator) {
        indicator.classList.remove("bg-emerald-500", "blink-led");
        indicator.classList.add("bg-slate-300");
      }
      if (card) card.classList.remove("channel-active");

      // Update UI button and LED status for Pro
      if (buttonPro) {
        buttonPro.textContent = "▶";
        buttonPro.classList.remove("btn-active-glow");
      }
      if (indicatorPro) {
        indicatorPro.classList.remove("bg-emerald-500", "blink-led");
        indicatorPro.classList.add("bg-slate-300");
      }
      if (cardPro) cardPro.classList.remove("channel-active");
    } else {
      const gainVal = parseFloat(slider.value) * config.maxGain;
      const result = config.setup(audioContext, analyserNode, gainVal);
      activeChannels[id] = result;

      // Update UI button and LED status for Basic
      if (button) {
        button.textContent = "⏸";
        button.classList.add("btn-active-glow");
      }
      if (indicator) {
        indicator.classList.remove("bg-slate-300");
        indicator.classList.add("bg-emerald-500", "blink-led");
      }
      if (card) card.classList.add("channel-active");

      // Update UI button and LED status for Pro
      if (buttonPro) {
        buttonPro.textContent = "⏸";
        buttonPro.classList.add("btn-active-glow");
      }
      if (indicatorPro) {
        indicatorPro.classList.remove("bg-slate-300");
        indicatorPro.classList.add("bg-emerald-500", "blink-led");
      }
      if (cardPro) cardPro.classList.add("channel-active");
      setResetButtonDisabled(false);
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
    const sliderPro = document.getElementById(config.sliderId + "Pro");
    const button = document.getElementById(config.buttonId);
    const buttonPro = document.getElementById(config.buttonId + "Pro");

    // Click behavior
    if (button) {
      button.onclick = () => toggleChannel(config);
    }
    if (buttonPro) {
      buttonPro.onclick = () => toggleChannel(config);
    }

    const handleVolumeInput = (val) => {
      // Sync values of both inputs
      if (slider) slider.value = val;
      if (sliderPro) sliderPro.value = val;

      // Compute display percentage text
      let displayVal = Math.round(val * 100) + "%";
      
      const valText = document.getElementById(config.valTextId);
      const valTextPro = document.getElementById(config.valTextId + "Pro");
      if (valText) valText.textContent = displayVal;
      if (valTextPro) valTextPro.textContent = displayVal;

      // Adjust gain node value live if playing
      if (activeChannels[config.id] && activeChannels[config.id].gainNode) {
        activeChannels[config.id].gainNode.gain.setValueAtTime(val * config.maxGain, audioContext.currentTime);
      }
    };

    // Live volume adjustments
    if (slider) {
      slider.oninput = () => handleVolumeInput(parseFloat(slider.value));
    }
    if (sliderPro) {
      sliderPro.oninput = () => handleVolumeInput(parseFloat(sliderPro.value));
    }
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
    hideDownloadLink();

    // Set up background recording destination
    if (!recorderDest) {
      recorderDest = audioContext.createMediaStreamDestination();
      masterGainNode.connect(recorderDest);
    }

    recorder = new MediaRecorder(recorderDest.stream, { mimeType: "audio/webm" });
    chunks = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      if (lastRecordedBlobUrl) {
        URL.revokeObjectURL(lastRecordedBlobUrl);
      }
      lastRecordedBlobUrl = URL.createObjectURL(blob);
    };
    recorder.start();

    // Turn ON all channels that are currently stopped
    channelsConfig.forEach(config => {
      if (!activeChannels[config.id]) {
        toggleChannel(config);
      }
    });

    // Update Console HUD UI
    previewButton.textContent = "Stop Sequence";
    previewButton.className = "w-full bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-3 px-5 rounded-xl text-base tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer";
    setResetButtonDisabled(true);

    // Set recording indicators to active pulsing red
    const recordingLabel = document.getElementById("recordingLabel");
    if (recordingLabel) {
      recordingLabel.className = "recording-pill-active inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-rose-600 text-xs font-bold transition-all duration-200";
    }
    const recordingDot = document.getElementById("recordingDot");
    if (recordingDot) {
      recordingDot.className = "text-xs text-white";
    }
    countdownTimer.className = "font-mono font-extrabold text-rose-600 bg-white px-2.5 py-1 rounded border border-rose-500 transition-all duration-200 text-sm animate-pulse";

    timeLeft = 60.0;
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
      stopRecordingFlow();
      alert("⏹️ Summoning live preview completed.");
    }, 60000);
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
    previewButton.className = "btn-primary-green w-full text-white font-extrabold py-3 px-5 rounded-xl text-base tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer";
    setResetButtonDisabled(false);
    showDownloadLink();

    // Reset recording indicators to standby grey
    const recordingLabel = document.getElementById("recordingLabel");
    if (recordingLabel) {
      recordingLabel.className = "inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-400 text-xs font-bold transition-all duration-200";
    }
    const recordingDot = document.getElementById("recordingDot");
    if (recordingDot) {
      recordingDot.className = "text-xs text-red-500";
    }
    countdownTimer.className = "font-mono font-extrabold text-slate-400 bg-white px-2.5 py-1 rounded border border-slate-200 transition-all duration-200 text-sm";
    countdownTimer.textContent = "60.0s";
  }

  previewButton.onclick = startSummoning;

  function stopRecordingFlow() {
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    stopAllAudio();
  }

  startButton.onclick = () => {
    if (lastRecordedBlobUrl) {
      const a = document.createElement("a");
      a.href = lastRecordedBlobUrl;
      a.download = "uap_summon_sound.webm";
      a.click();
    }
  };

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
    hideDownloadLink();
    if (lastRecordedBlobUrl) {
      URL.revokeObjectURL(lastRecordedBlobUrl);
      lastRecordedBlobUrl = null;
    }
    if (audioContext) {
      // Deactivate all channels
      channelsConfig.forEach(config => {
        stopChannel(config.id);
        const button = document.getElementById(config.buttonId);
        const buttonPro = document.getElementById(config.buttonId + "Pro");
        const indicator = document.getElementById(config.indicatorId);
        const indicatorPro = document.getElementById(config.indicatorId + "Pro");
        const card = document.getElementById("channelCard" + config.id);
        const cardPro = document.getElementById("channelCard" + config.id + "Pro");

        if (button) {
          button.textContent = "▶";
          button.classList.remove("btn-active-glow");
        }
        if (buttonPro) {
          buttonPro.textContent = "▶";
          buttonPro.classList.remove("btn-active-glow");
        }
        if (indicator) {
          indicator.classList.remove("bg-emerald-500", "blink-led");
          indicator.classList.add("bg-slate-300");
        }
        if (indicatorPro) {
          indicatorPro.classList.remove("bg-emerald-500", "blink-led");
          indicatorPro.classList.add("bg-slate-300");
        }
        if (card) card.classList.remove("channel-active");
        if (cardPro) cardPro.classList.remove("channel-active");
      });

      // Clear particles (animation loop continues running in standby mode)
      particles = [];

      // Reset sliders and readout metrics to default values
      channelsConfig.forEach(config => {
        const slider = document.getElementById(config.sliderId);
        const sliderPro = document.getElementById(config.sliderId + "Pro");
        if (slider) slider.value = config.defaultVal;
        if (sliderPro) sliderPro.value = config.defaultVal;

        let displayVal = Math.round(config.defaultVal * 100) + "%";
        
        const valText = document.getElementById(config.valTextId);
        const valTextPro = document.getElementById(config.valTextId + "Pro");
        if (valText) valText.textContent = displayVal;
        if (valTextPro) valTextPro.textContent = displayVal;
      });


      // Close the audio context safely
      audioContext.close().then(() => {
        audioContext = null;
        masterGainNode = null;
        analyserNode = null;
        updateResonanceCoherence();
        setResetButtonDisabled(true);
        alert("Audio reset successfully.");
      });
    }
  };

  // Three.js update loop helper
  function updateThreeJS(orbFreqArray) {
    if (coreMesh && cageMesh && orbitPoints) {
      const bufferLength = 128;
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
      const targetCoreScale = 1.0 + (bassVal / 255) * 0.52 + (analyserNode ? 0 : Math.sin(Date.now() * 0.002) * 0.05);
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
  }

  // p5.js instance mode sketch configuration
  const sketch = (p) => {
    const bufferLength = 128;
    const dataArray = new Uint8Array(bufferLength);
    const orbFreqArray = new Uint8Array(bufferLength);

    // Peak drop tracking variables
    let peaks = new Array(bufferLength).fill(0);
    let peakHoldFrames = new Array(bufferLength).fill(0);

    // Sparks variables
    let sparks = [];

    // Waterfall Spectrogram variables
    let waterfallHistory = [];
    const maxWaterfallRows = 32;

    // Mandala parameters
    let mandalaAngle = 0;

    // Gravitational Wave Orbitals particles
    let orbitalParticles = [];

    p.setup = () => {
      const w = soundGraphContainer.clientWidth || 800;
      const h = soundGraphContainer.clientHeight || 180;
      p.createCanvas(w, h);
      p.frameRate(60);

      // Initialize Gravitational Wave Orbitals particle swarm
      const maxR = Math.min(w, h) * 0.46;
      const minR = maxR * 0.16;
      for (let i = 0; i < 70; i++) {
        const band = i % 8; // group into 8 frequency bands
        const radius = p.map(band, 0, 8, minR, maxR);
        orbitalParticles.push({
          angle: Math.random() * Math.PI * 2,
          radius: radius,
          baseRadius: radius,
          speed: (0.01 + Math.random() * 0.015) * (Math.random() < 0.5 ? 1 : -1),
          band: band,
          size: 1.5 + Math.random() * 2.5
        });
      }
    };

    p.draw = () => {
      const w = p.width;
      const h = p.height;
      const mode = visualizerModeSelect ? visualizerModeSelect.value : "spectrum";

      p.clear();

      // Get analyser data or fill standbys
      if (analyserNode) {
        analyserNode.getByteFrequencyData(dataArray);
        analyserNode.getByteFrequencyData(orbFreqArray);
      } else {
        dataArray.fill(0);
        orbFreqArray.fill(0);
      }

      // Draw active visualization mode
      if (mode === "waterfall") {
        drawWaterfall(p, w, h, dataArray);
      } else if (mode === "mandala") {
        drawMandala(p, w, h, dataArray);
      } else if (mode === "orbitals") {
        drawGravitationalOrbitals(p, w, h, dataArray);
      } else {
        drawFFTSpectrum(p, w, h, dataArray);
      }

      // Keep Three.js orb in sync
      try {
        updateThreeJS(orbFreqArray);
      } catch (err) {
        // fail silently to keep p5 drawing loop running
      }
    };

    p.windowResized = () => {
      if (soundGraphContainer) {
        const w = soundGraphContainer.clientWidth;
        const h = soundGraphContainer.clientHeight;
        p.resizeCanvas(w, h);
      }
    };

    // p5.js FFT spectrum drawing
    function drawFFTSpectrum(p, w, h, data) {
      // 1. Cybernetic grid background (static)
      p.stroke(79, 70, 229, 20); // soft indigo
      p.strokeWeight(1);
      
      const cols = 20;
      const rows = 8;
      
      for (let c = 0; c <= cols; c++) {
        let x = (c / cols) * w;
        p.line(x, 0, x, h);
      }
      for (let r = 0; r <= rows; r++) {
        let y = (r / rows) * h;
        p.line(0, y, w, y);
      }

      // Draw sparks particles
      p.noStroke();
      for (let i = sparks.length - 1; i >= 0; i--) {
        let s = sparks[i];
        s.x += s.vx;
        s.y += s.vy;
        s.life--;
        if (s.life <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        let alpha = p.map(s.life, 0, s.maxLife, 0, 220);
        p.fill(p.red(s.color), p.green(s.color), p.blue(s.color), alpha);
        p.ellipse(s.x, s.y, s.size);
      }

      // 2. Main frequency columns
      const displayBins = 64;
      const barWidth = w / displayBins;
      const colStart = p.color(79, 70, 229); // Indigo
      const colEnd = p.color(244, 63, 94);   // Rose

      for (let i = 0; i < displayBins; i++) {
        const val = data[i] || 0;
        const percent = val / 255;
        const barH = percent * h * 0.92;
        
        if (barH > 0) {
          const barColor = p.lerpColor(colStart, colEnd, percent);
          p.fill(p.red(barColor), p.green(barColor), p.blue(barColor), 200);
          p.noStroke();
          p.rect(i * barWidth + 1, h - barH, barWidth - 2, barH, 4, 4, 0, 0);
          
          // Spawn rising sparks
          if (val > 130 && Math.random() < 0.12) {
            sparks.push({
              x: i * barWidth + barWidth / 2,
              y: h - barH,
              vx: (Math.random() - 0.5) * 1.5,
              vy: -0.8 - Math.random() * 2,
              size: 1.5 + Math.random() * 2,
              color: barColor,
              life: 25 + Math.random() * 15,
              maxLife: 40
            });
          }
        }

        // Peak drop calculations
        let curPeak = peaks[i] || 0;
        if (barH > curPeak) {
          peaks[i] = barH;
          peakHoldFrames[i] = 18;
        } else {
          if (peakHoldFrames[i] > 0) {
            peakHoldFrames[i]--;
          } else {
            peaks[i] -= 1.6;
            if (peaks[i] < 0) peaks[i] = 0;
          }
        }

        // Render peak dot
        if (peaks[i] > 2) {
          const peakColor = p.lerpColor(colStart, colEnd, peaks[i] / h);
          p.fill(p.red(peakColor), p.green(peakColor), p.blue(peakColor), 235);
          p.noStroke();
          p.ellipse(i * barWidth + barWidth / 2, h - peaks[i] - 3, Math.max(3, barWidth - 4));
        }
      }
    }



    // p5.js Scrolling Spectrogram (Waterfall) drawing
    function drawWaterfall(p, w, h, data) {
      const bins = 64;
      const currentFrame = new Uint8Array(bins);
      for (let i = 0; i < bins; i++) {
        currentFrame[i] = data[i] || 0;
      }
      waterfallHistory.push(currentFrame);
      if (waterfallHistory.length > maxWaterfallRows) {
        waterfallHistory.shift();
      }

      p.noStroke();
      const rowHeight = h / maxWaterfallRows;
      const barWidth = w / bins;
      const colStart = p.color(248, 250, 252); // light grey base
      const colLow = p.color(79, 70, 229);   // Indigo
      const colMid = p.color(14, 165, 233);  // Cyan
      const colHigh = p.color(244, 63, 94);  // Rose

      for (let r = 0; r < waterfallHistory.length; r++) {
        const frame = waterfallHistory[r];
        const y = (r / maxWaterfallRows) * h;
        
        for (let c = 0; c < bins; c++) {
          const val = frame[c];
          const percent = val / 255;
          let cellColor;
          
          if (percent === 0) {
            cellColor = colStart;
          } else if (percent < 0.35) {
            cellColor = p.lerpColor(colStart, colLow, percent / 0.35);
          } else if (percent < 0.75) {
            cellColor = p.lerpColor(colLow, colMid, (percent - 0.35) / 0.4);
          } else {
            cellColor = p.lerpColor(colMid, colHigh, (percent - 0.75) / 0.25);
          }
          
          p.fill(p.red(cellColor), p.green(cellColor), p.blue(cellColor), 180);
          p.rect(c * barWidth, y, barWidth + 0.5, rowHeight + 0.5);
        }
      }
    }

    // p5.js Audio-Reactive Mandala drawing
    function drawMandala(p, w, h, data) {
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.45;

      p.push();
      p.translate(cx, cy);
      
      let sum = 0;
      for (let i = 0; i < 40; i++) sum += data[i] || 0;
      const avgEnergy = sum / 40;
      mandalaAngle += 0.006 + (avgEnergy / 255) * 0.024;

      // 1. Draw glowing background grid mandala layers
      p.noFill();
      p.stroke(79, 70, 229, 25); 
      p.strokeWeight(1);
      
      p.rotate(mandalaAngle * 0.3);
      for (let i = 3; i <= 6; i++) {
        let r = maxRadius * (i / 6);
        p.beginShape();
        for (let j = 0; j < i; j++) {
          let angle = (j / i) * Math.PI * 2;
          p.vertex(Math.cos(angle) * r, Math.sin(angle) * r);
        }
        p.endShape(p.CLOSE);
      }

      // 2. Draw reactive frequency ring
      p.rotate(-mandalaAngle * 0.8);
      const displayBins = 64;
      const angleStep = (Math.PI * 2) / displayBins;
      const innerRadius = maxRadius * 0.25;
      
      const ctx = p.drawingContext;
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'rgba(244, 63, 94, 0.55)'; // rose glow

      const colStart = p.color(14, 165, 233); // Cyan
      const colEnd = p.color(244, 63, 94);   // Rose

      p.strokeWeight(2.5);
      for (let i = 0; i < displayBins; i++) {
        const val = data[i] || 0;
        const percent = val / 255;
        const spokeLength = percent * (maxRadius - innerRadius) * 0.8;
        const angle = i * angleStep;

        const xStart = Math.cos(angle) * innerRadius;
        const yStart = Math.sin(angle) * innerRadius;
        const xEnd = Math.cos(angle) * (innerRadius + spokeLength);
        const yEnd = Math.sin(angle) * (innerRadius + spokeLength);

        const color = p.lerpColor(colStart, colEnd, percent);
        p.stroke(p.red(color), p.green(color), p.blue(color), 210);
        
        p.line(xStart, yStart, xEnd, yEnd);
        p.line(-xStart, -yStart, -xEnd, -yEnd); // mirror
      }
      
      ctx.shadowBlur = 0; // reset glow

      // 3. Central breathing pulsing core
      const bassVal = data[1] * 0.5 + data[2] * 0.5;
      const pulseFactor = 1 + (bassVal / 255) * 0.25;
      p.stroke(14, 165, 233, 140);
      p.strokeWeight(1.5);
      p.fill(79, 70, 229, 20);
      p.ellipse(0, 0, innerRadius * 2 * pulseFactor);

      p.rotate(mandalaAngle * 1.5);
      p.stroke(244, 63, 94, 150);
      p.beginShape();
      for (let i = 0; i < 3; i++) {
        let angle = (i / 3) * Math.PI * 2;
        p.vertex(Math.cos(angle) * innerRadius * 0.6 * pulseFactor, Math.sin(angle) * innerRadius * 0.6 * pulseFactor);
      }
      p.endShape(p.CLOSE);

      p.pop();
    }

    // p5.js Gravitational Wave Orbitals drawing
    function drawGravitationalOrbitals(p, w, h, data) {
      const cx = w / 2;
      const cy = h / 2;
      const maxRadius = Math.min(w, h) * 0.46;
      const innerRadius = maxRadius * 0.16;

      // Draw background gravitational pull rings
      p.stroke(79, 70, 229, 15);
      p.strokeWeight(1);
      p.noFill();
      p.ellipse(cx, cy, innerRadius * 2);
      p.ellipse(cx, cy, maxRadius * 2);

      // Update particle positions based on active frequency energy
      orbitalParticles.forEach(pt => {
        const binStart = pt.band * 8;
        let sum = 0;
        for (let i = 0; i < 8; i++) {
          sum += data[binStart + i] || 0;
        }
        const amp = sum / 8;
        const percent = amp / 255;

        // Radius expands/contracts with sound
        const targetRadius = pt.baseRadius + percent * 30 * (pt.band % 2 === 0 ? 1 : -1);
        pt.radius = p.lerp(pt.radius, targetRadius, 0.1);
        
        // Speed scaling
        const rotSpeed = pt.speed * (1.0 + percent * 4.5);
        pt.angle += rotSpeed;

        const x = cx + Math.cos(pt.angle) * pt.radius;
        const y = cy + Math.sin(pt.angle) * pt.radius;

        const ptColor = p.lerpColor(p.color(14, 165, 233), p.color(244, 63, 94), pt.band / 7);
        p.fill(p.red(ptColor), p.green(ptColor), p.blue(ptColor), 200 + percent * 55);
        p.noStroke();
        p.ellipse(x, y, pt.size + percent * 4);
        
        pt.x = x;
        pt.y = y;
        pt.activePercent = percent;
      });

      // Draw gravity connection filaments
      p.stroke(14, 165, 233, 40);
      p.strokeWeight(0.5);
      for (let i = 0; i < orbitalParticles.length; i++) {
        const p1 = orbitalParticles[i];
        for (let j = i + 1; j < orbitalParticles.length; j++) {
          const p2 = orbitalParticles[j];
          if (p1.band === p2.band) {
            let d = p.dist(p1.x, p1.y, p2.x, p2.y);
            if (d < w * 0.15) {
              const alpha = p.map(d, 0, w * 0.15, 80 * (p1.activePercent + p2.activePercent), 0);
              p.stroke(14, 165, 233, alpha);
              p.line(p1.x, p1.y, p2.x, p2.y);
            }
          }
        }
      }

      // Draw central black hole gravity core
      let bassVal = data[1] * 0.5 + data[2] * 0.5;
      let coreScale = 1.0 + (bassVal / 255) * 0.35;
      
      p.stroke(244, 63, 94, 130);
      p.strokeWeight(2);
      p.fill(15, 23, 42, 230); // deep black hole core
      p.ellipse(cx, cy, innerRadius * 2 * coreScale);
      
      p.fill(244, 63, 94, 25);
      p.noStroke();
      p.ellipse(cx, cy, innerRadius * 1.5 * coreScale);
    }
  };

  // Launch p5.js visualizer sketch instance
  try {
    p5Instance = new p5(sketch, 'soundGraphContainer');
    console.log("UAP Whistle: p5.js visualizer initialized successfully.");
  } catch (err) {
    console.error("UAP Whistle: Failed to initialize p5.js visualizer:", err);
  }
}

window.addEventListener("DOMContentLoaded", main);
