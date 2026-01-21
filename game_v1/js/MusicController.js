import { SONG_STRUCTURE } from './Config.js';

export class MusicController {
    constructor() {
        this.audio = document.getElementById('game-audio');
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        this.currentPhase = SONG_STRUCTURE[0];
    }

    play() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        this.audio.currentTime = 0;
        return this.audio.play();
    }

    pause() { this.audio.pause(); }
    resume() { this.audio.play(); }
    stop() { this.audio.pause(); this.audio.currentTime = 0; }

    update() {
        const time = this.audio.currentTime;
        this.currentPhase = SONG_STRUCTURE.find(p => time >= p.start && time < p.end) || SONG_STRUCTURE[SONG_STRUCTURE.length-1];
        return {
            time: time,
            phase: this.currentPhase,
            ended: this.audio.ended
        };
    }

    playBeep(freq) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.1);
        osc.stop(this.audioCtx.currentTime + 0.1);
    }
}
