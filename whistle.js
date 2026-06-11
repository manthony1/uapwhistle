// UAP Summoner Pro - Core Web Audio Synth Engine & Visualizer

function main() {
  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const previewButton = document.getElementById("previewButton");
  const resetButton = document.getElementById("resetButton");
  const masterVolumeSlider = document.getElementById("volumeSlider");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const countdownTimer = document.getElementById("countdownTimer");
  const statusText = document.getElementById("statusText");
  const statusLED = document.getElementById("statusLED");
  const idleTimerText = document.getElementById("idleTimerText");

  let audioContext = null;
  let masterGainNode = null;
  let analyserNode = null;
  let animationId = null;

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
  const soundGraphCtx = soundGraphCanvas.getContext("2d");

  // Draw initial static clean grid in canvas
  function drawStaticGrid() {
    const w = soundGraphCanvas.width = soundGraphCanvas.clientWidth;
    const h = soundGraphCanvas.height = soundGraphCanvas.clientHeight;
    soundGraphCtx.fillStyle = "#f8fafc";
    soundGraphCtx.fillRect(0, 0, w, h);
    soundGraphCtx.strokeStyle = "rgba(0, 0, 0, 0.03)";
    soundGraphCtx.lineWidth = 1;
    for (let x = 20; x < w; x += 20) {
      soundGraphCtx.beginPath();
      soundGraphCtx.moveTo(x, 0);
      soundGraphCtx.lineTo(x, h);
      soundGraphCtx.stroke();
    }
    for (let y = 20; y < h; y += 20) {
      soundGraphCtx.beginPath();
      soundGraphCtx.moveTo(0, y);
      soundGraphCtx.lineTo(w, y);
      soundGraphCtx.stroke();
    }
  }
  drawStaticGrid();
  window.addEventListener("resize", () => {
    if (!animationId) drawStaticGrid();
  });

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

    startGraphVisualizer(analyserNode);
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
    previewButton.classList.add("hidden");
    stopButton.classList.remove("hidden");
    resetButton.disabled = true;

    statusLED.className = "w-2.5 h-2.5 rounded-full bg-indigo-600 blink-led";
    statusText.textContent = "SUMMONING LIVE";
    statusText.className = "text-indigo-600 font-extrabold uppercase tracking-wider text-sm";

    recordingIndicator.classList.add("hidden");
    idleTimerText.classList.remove("hidden");

    timeLeft = 30.0;
    idleTimerText.textContent = timeLeft.toFixed(1) + "s";

    clearInterval(previewInterval);
    previewInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timeLeft <= 0) {
        timeLeft = 0;
        clearInterval(previewInterval);
      }
      idleTimerText.textContent = timeLeft.toFixed(1) + "s";
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
    previewButton.classList.remove("hidden");
    stopButton.classList.add("hidden");
    resetButton.disabled = false;

    statusLED.className = "w-2.5 h-2.5 rounded-full bg-slate-300";
    statusText.textContent = "STANDBY";
    statusText.className = "text-slate-800 font-extrabold uppercase tracking-wider text-sm";

    idleTimerText.textContent = "30.0s";
    recordingIndicator.classList.add("hidden");
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
    previewButton.classList.add("hidden");
    stopButton.classList.remove("hidden");
    resetButton.disabled = true;

    statusLED.className = "w-2.5 h-2.5 rounded-full bg-rose-600 blink-led";
    statusText.textContent = "RECORDING SIGNAL";
    statusText.className = "text-rose-600 font-extrabold uppercase tracking-wider text-sm";

    idleTimerText.classList.add("hidden");
    recordingIndicator.classList.remove("hidden");

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

  // STOP BUTTON BEHAVIOR COVERS BOTH STATES
  stopButton.onclick = () => {
    if (recorder && recorder.state !== "inactive") {
      stopRecordingFlow();
    } else {
      stopAllAudio();
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

      // Stop canvas animation
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

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
        drawStaticGrid();
        resetButton.disabled = true;
        alert("System Audio context reset successfully.");
      });
    }
  };

  // HIGH-FIDELITY GLOWING FREQUENCY SPECTROGRAM VISUALIZER
  function startGraphVisualizer(analyser) {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Sync canvas drawing space with layout pixel scale
    function resizeCanvas() {
      const rect = soundGraphCanvas.getBoundingClientRect();
      soundGraphCanvas.width = rect.width * window.devicePixelRatio;
      soundGraphCanvas.height = rect.height * window.devicePixelRatio;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function draw() {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const width = soundGraphCanvas.width;
      const height = soundGraphCanvas.height;

      soundGraphCtx.clearRect(0, 0, width, height);

      // Clean light canvas background
      soundGraphCtx.fillStyle = "#f8fafc";
      soundGraphCtx.fillRect(0, 0, width, height);

      // Draw background horizontal oscilloscope grids in light theme
      soundGraphCtx.strokeStyle = "rgba(0, 0, 0, 0.03)";
      soundGraphCtx.lineWidth = 1;
      for (let y = height / 4; y < height; y += height / 4) {
        soundGraphCtx.beginPath();
        soundGraphCtx.moveTo(0, y);
        soundGraphCtx.lineTo(width, y);
        soundGraphCtx.stroke();
      }
      for (let x = width / 8; x < width; x += width / 8) {
        soundGraphCtx.beginPath();
        soundGraphCtx.moveTo(x, 0);
        soundGraphCtx.lineTo(x, height);
        soundGraphCtx.stroke();
      }

      const barWidth = (width / bufferLength) * 1.25;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const val = dataArray[i];
        const percent = val / 255;
        const barHeight = percent * height * 0.95;

        // Custom multi-amplitude visual mapping for light backgrounds (indigo/pink/coral)
        let hue;
        if (percent < 0.3) {
          // Low: Indigo (240) to Violet (270)
          hue = 240 + percent * 100;
        } else if (percent < 0.7) {
          // Medium: Violet (270) to Rose/Pink (320)
          hue = 270 + (percent - 0.3) * 125;
        } else {
          // High: Rose (320) to Coral Red (360)
          hue = 320 + (percent - 0.7) * 133;
        }

        // Keep brightness deep and saturated for high legibility against the light background
        const brightness = 45 + percent * 10;

        // Visual depth: Glowing vertical bar gradient
        const gradient = soundGraphCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, `hsla(${hue}, 85%, ${brightness}%, 0.9)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 85%, ${brightness - 5}%, 0.65)`);
        gradient.addColorStop(1, `hsla(${hue}, 85%, ${brightness - 10}%, 0.1)`);

        soundGraphCtx.fillStyle = gradient;

        // Render sleek rounded top spectrum bars
        const radius = 3;
        const barX = x;
        const barY = height - barHeight;

        if (barHeight > 0) {
          soundGraphCtx.beginPath();
          soundGraphCtx.roundRect(barX, barY, barWidth - 2, barHeight, [radius, radius, 0, 0]);
          soundGraphCtx.fill();
        }

        // Hotspots (peak indicator dots) - styled dark indigo for contrast
        if (val > 120) {
          soundGraphCtx.fillStyle = `rgba(79, 70, 229, ${percent * 0.8})`;
          soundGraphCtx.beginPath();
          soundGraphCtx.arc(barX + (barWidth - 2) / 2, barY, 1.5, 0, Math.PI * 2);
          soundGraphCtx.fill();
        }

        x += barWidth;
      }
    }

    draw();
  }
}

window.addEventListener("DOMContentLoaded", main);
