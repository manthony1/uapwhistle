function main() {
  let context;
  let nodes = [];
  let chirpInterval;
  let recorder;
  let chunks = [];

  const startButton = document.getElementById("startButton");
  const stopButton = document.getElementById("stopButton");
  const previewButton = document.getElementById("previewButton");

  let previewContext;
  let previewNodes = [];
  let previewChirpInterval;
  let previewPingInterval;

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
    nodes.forEach((n) => n.stop && n.stop());
    nodes = [];
    clearInterval(chirpInterval);
    startButton.disabled = false;
    stopButton.disabled = true;
    recorder.stop();
  };

  previewButton.onclick = () => {
    previewButton.disabled = true;
    previewContext = new (window.AudioContext || window.webkitAudioContext)();
    const destination = previewContext.destination;
    startPreviewAudioLayers(previewContext, destination);

    setTimeout(() => {
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

function ready(fn) {
  if (document.readyState !== "loading") {
    fn();
  } else {
    document.addEventListener("DOMContentLoaded", fn);
  }
}
ready(main);
