export class SoundEffects {
    static ctx = new (window.AudioContext || window.webkitAudioContext)();

    // --- RÉGLAGE GLOBAL DU VOLUME (0.0 à 1.0) ---
    // Augmentez cette valeur pour rendre tous les bips plus forts
    static masterVolume = 1;

    static playTone(freq, type, duration, volume = 0.1) {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // On multiplie le volume du son par le masterVolume
        const finalVolume = volume * this.masterVolume;

        gain.gain.setValueAtTime(finalVolume, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- CATALOGUE DE SONS ---

    static beep() {
        this.playTone(600, 'square', 0.1, 0.2);
    }

    static validate() {
        this.playTone(400, 'square', 0.1, 0.3);
        setTimeout(() => this.playTone(800, 'square', 0.1, 0.3), 50);
    }

    static start() {
        this.playTone(500, 'square', 0.1, 0.3);
        setTimeout(() => this.playTone(700, 'square', 0.1, 0.3), 50);
        setTimeout(() => this.playTone(1000, 'square', 0.2, 0.3), 100);
    }

    static pause(isOn) {
        this.playTone(isOn ? 400 : 600, 'triangle', 0.2, 0.4);
    }

    static gameOver() {
        // Version simplifiée utilisant playTone pour bénéficier du masterVolume
        this.playTone(300, 'square', 0.5, 0.2);
        // Note: Pour un effet descendant complexe avec masterVolume :
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(0.2 * this.masterVolume, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.5);
    }

    static error() {
        this.playTone(150, 'sawtooth', 0.2, 0.5);
    }

    static bonus() {
        const now = this.ctx.currentTime;
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((f, i) => {
            setTimeout(() => {
                this.playTone(f, 'square', 0.15, 0.2);
            }, i * 50);
        });
    }
}
