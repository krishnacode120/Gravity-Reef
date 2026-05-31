let audioCtx: AudioContext | null = null;
let isMuted = false;

export function setMute(mute: boolean) {
  isMuted = mute;
  try {
    const ctx = getAudioContext();
    if (isMuted) {
      if (humGain) {
        humGain.gain.setValueAtTime(0, ctx.currentTime);
      }
    } else {
      if (humGain) {
        humGain.gain.setValueAtTime(0.06, ctx.currentTime);
      } else {
        startBackgroundHum();
      }
    }
  } catch (e) {
    // Ignore context issues before interaction
  }
}

export function getMute() {
  return isMuted;
}

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

export function playClickSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (error) {
    console.warn("Audio playback failed", error);
  }
}

export function playCaptureSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'triangle';
    osc2.type = 'square';
    
    osc1.frequency.setValueAtTime(300, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
    
    osc2.frequency.setValueAtTime(400, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.15);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.2);
  } catch (error) {
    console.warn("Audio playback failed", error);
  }
}

export function playWinSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const t = ctx.currentTime;
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    // Major arpeggio
    playNote(440, t, 0.4);      // A4
    playNote(554.37, t + 0.1, 0.4); // C#5
    playNote(659.25, t + 0.2, 0.4); // E5
    playNote(880, t + 0.3, 0.8);    // A5

  } catch (error) {
    console.warn("Audio playback failed", error);
  }
}

let humOscillator: OscillatorNode | null = null;
let humGain: GainNode | null = null;

export function startBackgroundHum() {
  if (isMuted) return;
  if (humOscillator) return; // Already started
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    humOscillator = ctx.createOscillator();
    humGain = ctx.createGain();
    
    humOscillator.type = 'sine';
    humOscillator.frequency.value = 55; // Low frequency for a deep hum
    
    humGain.gain.setValueAtTime(0, ctx.currentTime);
    humGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 5); // Gradual fade in
    
    // Add some subtle modulation
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Very slow modulation
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 5; // Modulate frequency by +/- 5 Hz
    
    lfo.connect(lfoGain);
    lfoGain.connect(humOscillator.frequency);
    lfo.start();
    
    humOscillator.connect(humGain);
    humGain.connect(ctx.destination);
    
    humOscillator.start();
  } catch (error) {
    console.warn("Background audio playback failed", error);
  }
}
