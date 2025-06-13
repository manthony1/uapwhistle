function main() {
  let context;
  let nodes = [];
  let chirpInterval;
  let recorder;
  let chunks = [];
  let previewTimeout;

  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const previewButton = document.getElementById("previewButton");

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
      lfoGain.gain.value = 0.3;

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
      gain.gain.value = 0.05;
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
      gain.gain.value = 0.1;
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
      gain.gain.value = 0.2;
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
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
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
      gain.gain.value = 0.02;
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
      noiseGain.gain.setValueAtTime(0.03, ctx.currentTime);

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

    setTimeout(() => {
      if (!stopButton.disabled) {
        stopButton.onclick();
        alert("⏹️ Recording stopped after 30 seconds.");
      }
    }, 30000);

    startButton.disabled = true;
    stopButton.disabled = false;
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
  };

  previewButton.onclick = () => {
    previewButton.disabled = true;
    stopButton.disabled = false;
    previewContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = previewContext.destination;
    startPreviewAudioLayers(previewContext, destination);

    previewTimeout = setTimeout(() => {
      previewNodes.forEach((n) => n.stop && n.stop());
      previewNodes = [];
      clearInterval(previewChirpInterval);
      clearInterval(previewPingInterval);
      previewContext.close();
      previewButton.disabled = false;
    }, 15000);
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
    // 1. 100 Hz AM by 7.83 Hz
    {
      const carrier = context.createOscillator();
      carrier.frequency.value = 100;
      const ampGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 7.83;
      lfoGain.gain.value = 0.3;
      lfo.connect(lfoGain).connect(carrier.frequency);
      carrier.connect(ampGain).connect(destination);
      lfo.start();
      carrier.start();
      storeNodes.push(carrier, lfo);
    }

    // 2. 528 Hz tone
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 528;
      gain.gain.value = 0.05;
      osc.connect(gain).connect(destination);
      osc.start();
      storeNodes.push(osc);
    }

    // 3. 17 kHz ping
    {
      const id = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.value = 17000;
        gain.gain.value = 0.1;
        osc.connect(gain).connect(destination);
        osc.start();
        osc.stop(context.currentTime + 0.05);
      }, 3000);
      setPingId(id);
    }

    // 4. 2.5 kHz chirp
    {
      const id = setInterval(() => {
        const osc = context.createOscillator();
        const gain = context.createGain();
        osc.frequency.setValueAtTime(2500, context.currentTime);
        osc.type = "square";
        gain.gain.setValueAtTime(0.2, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.2);
        osc.connect(gain).connect(destination);
        osc.start();
        osc.stop(context.currentTime + 0.2);
        storeNodes.push(osc);
      }, 10000);
      setChirpId(id);
    }

    // 5. 432 Hz pad
    {
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.frequency.value = 432;
      osc.type = "triangle";
      gain.gain.value = 0.02;
      osc.connect(gain).connect(destination);
      osc.start();
      storeNodes.push(osc);
    }

    // 6. Breath noise
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
      noiseGain.gain.setValueAtTime(0.03, context.currentTime);

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
      storeNodes.push(whiteNoise, lfo, lfoP, pFilter, pFilter1, lfoPGain);
    }
  }
}

// function ready(fn) {
//   if (document.readyState !== "loading") {
//     fn();
//   } else {
//     document.addEventListener("DOMContentLoaded", fn);
//   }
// }


  window.addEventListener("DOMContentLoaded", main);

// ready(main);
