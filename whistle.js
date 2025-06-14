function main() {
  let context;
  let nodes = [];
  let chirpInterval;
  let recorder;
  let chunks = [];
  let previewTimeout;

  let toneGains = {
    tone1: 0.7,   // 7.83 Hz AM (fundamental)
    tone2: 0.6,   // 14.3 Hz AM (2nd Schumann resonance)
    tone3: 0.5,   // 20.8 Hz AM (3rd Schumann resonance)
    tone4: 0.04,  // 528 Hz harmonic tone
    tone5: 0.1,   // 17 kHz ultrasonic ping
    tone6: 0.2,   // 1 kHz pulses every 2s
    tone7: 0.2,   // 2.5 kHz chirps every 10s
    tone8: 0.02,  // 432 Hz ambient pad
    tone9: 0.03   // Breath layer (white noise)
  };


  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const previewButton = document.getElementById("previewButton");
  const recordingIndicator = document.getElementById("recordingIndicator");
  const countdownTimer = document.getElementById("countdownTimer");
  const recordingLabel = document.getElementById("recordingLabel");

  let countdownInterval;
  let previewContext;
  let previewNodes = [];
  let previewChirpInterval;
  let previewPingInterval;

  //register tone toggle
  function registerToneToggle({ buttonId, setupFn }) {
  const button = document.getElementById(buttonId);
  let ctx = null;
  let nodes = [];
  let cleanup = null;
  let active = false;

  button.onclick = () => {
    if (!active) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const result = setupFn(ctx);
      nodes = result.nodes || result;
      cleanup = result.cleanup || null;
      active = true;
      button.textContent = '⏸';
      button.classList.add('active');
    } else {
      nodes.forEach(n => n.stop && n.stop());
      if (cleanup) cleanup();
      ctx.close();
      nodes = [];
      active = false;
      button.textContent = '▶';
      button.classList.remove('active');
    }
  };
}

  //tone 1
  registerToneToggle({
    buttonId: 'playTone1',
    setupFn: (ctx) => {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = 100;

      const ampGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.value = 7.83;
      lfoGain.gain.value = toneGains.tone1;

      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(ctx.destination);

      lfo.start();
      carrier.start();

      return [carrier, lfo];
    }
  });

  //tone 2
  registerToneToggle({
    buttonId: 'playTone2',
    setupFn: (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 528;
      lfoGain.gain.value = toneGains.tone2;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      return [osc];
    }
  });

  //tone 3
  registerToneToggle({
  buttonId: 'playTone3',
  setupFn: (ctx) => {
    const activeNodes = [];
    const pingInterval = setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 17000;
      lfoGain.gain.value = toneGains.tone3;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.05);
      activeNodes.push(osc);
    }, 3000);

    // Return a special stop function that clears the interval
    return {
      nodes: activeNodes,
      cleanup: () => clearInterval(pingInterval)
    };
  }
});

  //tone 4
  registerToneToggle({
  buttonId: 'playTone4',
  setupFn: (ctx) => {
    const nodes = [];

    const interval = setInterval(() => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 1000; // You can tweak this
      osc.type = 'square';
      lfoGain.gain.value = toneGains.tone4;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
      nodes.push(osc);
    }, 2000); // Fires every 2 seconds

    return {
      nodes,
      cleanup: () => clearInterval(interval)
    };
  }
});

  //tone 5
  registerToneToggle({
    buttonId: 'playTone5',
    setupFn: (ctx) => {
      const nodes = [];

      const interval = setInterval(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(2500, ctx.currentTime);
        osc.type = 'square';
        gain.gain.setValueAtTime(toneGains.tone5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        nodes.push(osc);
      }, 10000); // Every 10 seconds

      return {
        nodes,
        cleanup: () => clearInterval(interval)
      };
    }
  });

  //tone 6
  registerToneToggle({
    buttonId: 'playTone6',
    setupFn: (ctx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 432;
      osc.type = 'triangle';
      gain.gain.value = toneGains.tone6;
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      return [osc];
    }
  });

  //tone 7
  registerToneToggle({
    buttonId: 'playTone7',
    setupFn: (ctx) => {
      const nodes = [];

      // Create white noise buffer
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
      noiseGain.gain.setValueAtTime(toneGains.tone7, ctx.currentTime);

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.25; // slow breathing pulse
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain).connect(noiseGain.gain);

      const lfoP = ctx.createOscillator();
      const lfoPGain = ctx.createGain();
      lfoP.frequency.value = 0.25;
      lfoPGain.gain.value = 1;
      lfoP.connect(lfoPGain);

      const pFilter = ctx.createBiquadFilter();
      pFilter.type = "highpass";
      pFilter.frequency.value = 20;

      const pFilter1 = ctx.createBiquadFilter();
      pFilter1.type = "lowpass";
      pFilter1.frequency.value = 2000;

      lfoPGain.connect(pFilter.frequency);
      lfoPGain.connect(pFilter1.frequency);

      whiteNoise.connect(pFilter1).connect(noiseGain).connect(ctx.destination);

      whiteNoise.start();
      lfo.start();
      lfoP.start();

      nodes.push(whiteNoise, lfo, lfoP, pFilter, pFilter1, lfoGain, lfoPGain);
      return nodes;
    }
  });

  //tone 8
  registerToneToggle({
    buttonId: 'playTone8',
    setupFn: (ctx) => {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = 120;

      const ampGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.value = 14.3;
      lfoGain.gain.value = toneGains.tone8;

      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(ctx.destination);

      lfo.start();
      carrier.start();

      return [carrier, lfo];
    }
  });

  //tone 9
  registerToneToggle({
    buttonId: 'playTone9',
    setupFn: (ctx) => {
      const carrier = ctx.createOscillator();
      carrier.frequency.value = 140;

      const ampGain = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();

      lfo.frequency.value = 20.8;
      lfoGain.gain.value = toneGains.tone9;

      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(ctx.destination);

      lfo.start();
      carrier.start();

      return [carrier, lfo];
    }
  });


  startButton.onclick = () => {
    context = new (window.AudioContext || window.webkitAudioContext)();
    const destination = context.createMediaStreamDestination();
    startAudioLayers(context, destination);

    recorder = new MediaRecorder(destination.stream);
    chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "uap_summon_sound.webm";
      a.click();
    };

    recorder.start();

    let timeLeft = 30;
    countdownTimer.textContent = `(${timeLeft}s remaining)`;
    countdownInterval = setInterval(() => {
      timeLeft--;
      countdownTimer.textContent = `(${timeLeft}s remaining)`;
      if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);

    setTimeout(() => {
      if (!stopButton.disabled) {
        stopButton.onclick();
        alert("⏹️ Recording stopped after 30 seconds.");
      }
    }, 30000);

    startButton.disabled = true;
    stopButton.disabled = false;
    recordingIndicator.classList.remove("hidden");
    stopButton.classList.remove("hidden");

  };

  stopButton.onclick = () => {
    console.log("Stop button clicked");
    console.log("previewContext:", previewContext);
    console.log("previewNodes length:", previewNodes.length);
    console.log("Stop button disabled?", stopButton.disabled);
    nodes.forEach((n) => n.stop && n.stop());
    nodes = [];
    clearInterval(chirpInterval);

    // 🔧 Stop preview if running
    if (previewContext) {
      previewNodes.forEach(n => n.stop && n.stop());
      previewNodes = [];
      clearInterval(previewChirpInterval);
      clearInterval(previewPingInterval);
      clearTimeout(previewTimeout);
      previewContext.close();
      previewContext = null;
      previewButton.disabled = false;
    }


    startButton.disabled = false;
    stopButton.disabled = true;
    
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }

    recordingIndicator.classList.add("hidden");

    recordingLabel.textContent = '🔴 Recording...';
    recordingLabel.classList.remove('summoning');


    clearInterval(countdownInterval);

  };

  previewButton.onclick = () => {
    recordingIndicator.classList.remove("hidden");
    previewButton.disabled = true;
    stopButton.disabled = false;
    stopButton.classList.remove("hidden");
    recordingLabel.textContent = '🌀 Summoning...';
    recordingLabel.classList.add('summoning');

    countdownTimer.textContent = `(30s remaining)`;
    previewContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = previewContext.destination;
    startPreviewAudioLayers(previewContext, destination);

    let timeLeft = 30;
    countdownTimer.textContent = `(${timeLeft}s remaining)`;
    countdownInterval = setInterval(() => {
      timeLeft--;
      countdownTimer.textContent = `(${timeLeft}s remaining)`;
      if (timeLeft <= 0) clearInterval(countdownInterval);
    }, 1000);


    previewTimeout = setTimeout(() => {
      previewNodes.forEach((n) => n.stop && n.stop());
      previewNodes = [];
      clearInterval(previewChirpInterval);
      clearInterval(previewPingInterval);
      previewContext.close();
      previewButton.disabled = false;
      recordingIndicator.classList.add("hidden");
      countdownTimer.textContent = '';


    }, 30000);
  };

  function startAudioLayers(context, destination) {
    // Audio layers for main session
    layeredAudio(context, destination, nodes, (id) => chirpInterval = id);
  }

  function startPreviewAudioLayers(context, destination) {
    // Audio layers for preview
    layeredAudio(context, destination, previewNodes, (id) => previewChirpInterval = id, (id) => previewPingInterval = id);
  }

  function layeredAudio(context, destination, storeNodes, setChirpId, setPingId = () => {}) {
    // 1. 7.83 Hz AM (fundamental)
    {
      const carrier = context.createOscillator();
      carrier.frequency.value = 100;
      const ampGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 7.83;
      lfoGain.gain.value = toneGains.tone1;
      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(destination);
      lfo.start();
      carrier.start();
      storeNodes.push(carrier, lfo);
    }

    // 2. 14.3 Hz AM
    {
      const carrier = context.createOscillator();
      carrier.frequency.value = 120;
      const ampGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 14.3;
      lfoGain.gain.value = toneGains.tone2;
      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(destination);
      lfo.start();
      carrier.start();
      storeNodes.push(carrier, lfo);
    }

    // 3. 20.8 Hz AM
    {
      const carrier = context.createOscillator();
      carrier.frequency.value = 140;
      const ampGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 20.8;
      lfoGain.gain.value = toneGains.tone3;
      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(destination);
      lfo.start();
      carrier.start();
      storeNodes.push(carrier, lfo);
    }

    // 4. 528 Hz tone
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 528;
      gain.gain.value = toneGains.tone4;
      osc.connect(gain).connect(destination);
      osc.start();
      storeNodes.push(osc);
    }

    // 5. 17 kHz pings
    {
      const id = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = 17000;
        gain.gain.setValueAtTime(toneGains.tone5, context.currentTime);
        osc.connect(gain).connect(destination);
        osc.start();
        osc.stop(context.currentTime + 0.05);
      }, 3000);
      setPingId(id);
    }

    // 6. 1 kHz pulses
    {
      const interval = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = 1000;
        gain.gain.value = toneGains.tone6;
        osc.connect(gain).connect(destination);
        osc.start();
        osc.stop(context.currentTime + 0.1);
      }, 2000);
      setTimeout(() => clearInterval(interval), 30000); // match audio duration
    }

    // 7. 2.5 kHz chirps
    {
      const id = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.setValueAtTime(2500, context.currentTime);
        osc.type = "square";
        gain.gain.setValueAtTime(toneGains.tone7, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        osc.connect(gain).connect(destination);
        osc.start();
        osc.stop(context.currentTime + 0.2);
        storeNodes.push(osc);
      }, 10000);
      setChirpId(id);
    }

    // 8. 432 Hz ambient pad
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 432;
      osc.type = "triangle";
      gain.gain.value = toneGains.tone8;
      osc.connect(gain).connect(destination);
      osc.start();
      storeNodes.push(osc);
    }

    // 9. Breath noise layer
    {
      const bufferSize = 2 * context.sampleRate;
      const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = context.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseGain = context.createGain();
      noiseGain.gain.setValueAtTime(toneGains.tone9, context.currentTime);

      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.25;
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain).connect(noiseGain.gain);

      const lfoP = context.createOscillator();
      const lfoPGain = context.createGain();
      lfoP.frequency.value = 0.25;
      lfoPGain.gain.value = 1;
      lfoP.connect(lfoPGain);

      const pFilter = context.createBiquadFilter();
      pFilter.type = "highpass";
      pFilter.frequency.value = 20;

      const pFilter1 = context.createBiquadFilter();
      pFilter1.type = "lowpass";
      pFilter1.frequency.value = 2000;

      lfoPGain.connect(pFilter.frequency);
      lfoPGain.connect(pFilter1.frequency);

      whiteNoise.connect(pFilter1).connect(noiseGain).connect(destination);
      whiteNoise.start();
      lfo.start();
      lfoP.start();

      storeNodes.push(whiteNoise, lfo, lfoP, pFilter, pFilter1, lfoGain, lfoPGain);
    }
  }

}

  window.addEventListener("DOMContentLoaded", main);

