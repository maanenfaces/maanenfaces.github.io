export class SoundEffects {
    static ctx = new (window.AudioContext || window.webkitAudioContext)();
    static masterVolume = 1.2; // Légèrement réduit car les basses saturent vite

    /**
     * @param {number} freq Fréquence de départ
     * @param {string} type 'sawtooth', 'square', 'sine'
     * @param {number} duration
     * @param {number} volume
     * @param {number} dropFreq Fréquence finale (pour un effet de chute/glissando)
     */
    static playTone(freq, type, duration, volume = 0.1, dropFreq = null) {
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

        // Effet de glissando si dropFreq est fourni (très sombre)
        if (dropFreq !== null) {
            osc.frequency.exponentialRampToValueAtTime(dropFreq, this.ctx.currentTime + duration);
        }

        // Filtre passe-bas pour enlever le côté "moustique" et garder le "poids"
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1500, this.ctx.currentTime);

        const finalVolume = volume * this.masterVolume;
        gain.gain.setValueAtTime(finalVolume, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    // --- CATALOGUE DE SONS SOMBRES ---

    static beep() {
        // Un petit choc métallique sourd
        this.playTone(80, 'sawtooth', 0.15, 0.4, 40);
    }

    static validate() {
        // Deux pulsations graves
        this.playTone(100, 'square', 0.1, 0.4);
        setTimeout(() => this.playTone(150, 'square', 0.1, 0.3), 60);
    }

    static start() {
        // Montée en puissance dramatique (effet "Power Up")
        this.playTone(60, 'sawtooth', 0.4, 0.5, 200);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.3, 0.4, 300), 100);
    }

    static pause(isOn) {
        // Un son de décompression pneumatique
        this.playTone(isOn ? 150 : 100, 'sawtooth', 0.3, 0.3, 50);
    }

    static gameOver() {
        // Le "Death Thud" : un impact très grave qui s'éteint
        this.playTone(80, 'sawtooth', 0.8, 0.6, 20);
        this.playTone(40, 'sine', 1.0, 0.8, 10); // Sous-basse pour l'impact physique
    }

    static error() {
        // Un grognement électrique agressif
        this.playTone(60, 'sawtooth', 0.3, 0.6, 30);
    }

    static bonus() {
        // Un effet de "Burst" numérique saccadé et sombre
        const bursts = 6; // Nombre de micro-impulsions
        for (let i = 0; i < bursts; i++) {
            setTimeout(() => {
                // On alterne entre deux fréquences très basses pour créer un battement instable
                const freq = i % 2 === 0 ? 200 : 150;

                // On utilise 'sawtooth' pour le côté granuleux
                // Pas de glissando (dropFreq à null) pour garder l'aspect percutant/saccadé
                this.playTone(freq, 'sawtooth', 0.05, 0.4);

                // On ajoute un petit clic haute fréquence très court pour simuler un parasite
                if (i === bursts - 1) {
                    this.playTone(200, 'square', 0.02, 0.2);
                }
            }, i * 60); // L'espacement de 60ms crée la saccade
        }
    }
}
