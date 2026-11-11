import * as THREE from 'three';

export class GlitchTextScreen {
    constructor(config = {}) {
        this.config = Object.assign({
            delay: 1.0,               // Secondes avant le début de la séquence
            typingSpeed: 20,          // Nombre de caractères affichés par seconde
            readTimeAfterTyping: 3,   // Temps de lecture fixe une fois que la phrase est entièrement écrite
            pauseDuration: 1.0,       // Temps de blanc (silence visuel) entre chaque partie
            parts: []                 // Tableau des textes
        }, config);

        this.isActive = true;
        this.age = 0;
        this.currentPartIndex = -1;

        this._initDOM();
    }

    _initDOM() {
        this.container = document.createElement('div');
        this.container.id = 'glitch-screen-overlay';
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #000000;
            z-index: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Rajdhani', monospace;
            overflow: hidden;
            transition: opacity 0.3s ease;
        `;

        const style = document.createElement('style');
        style.innerHTML = `
            .retro-text {
                position: relative;
                color: #ffffff;
                font-family: 'Orbitron', sans-serif;
                font-size: 1.1rem;
                font-weight: bold;
                text-align: left;
                width: 450px;
                max-width: 85%;
                letter-spacing: 1px;
                line-height: 1.6;
                text-shadow: 0 0 10px var(--neon-red), 0 0 20px var(--neon-red), 0 0 40px var(--dark-red);
                opacity: 1;
                text-transform: uppercase;
            }
        `;
        document.head.appendChild(style);

        this.textElement = document.createElement('div');
        this.textElement.className = 'retro-text';
        this.container.appendChild(this.textElement);

        document.body.appendChild(this.container);
    }

    update(delta) {
        if (!this.isActive) return;
        this.age += delta;

        const timeSinceStart = this.age - this.config.delay;

        if (timeSinceStart < 0) {
            this.textElement.textContent = '';
            return;
        }

        // On parcourt les parties pour trouver celle qui correspond au temps écoulé
        let accumulatedTime = 0;
        let currentPart = -1;
        let timeInPart = 0;

        for (let i = 0; i < this.config.parts.length; i++) {
            const text = this.config.parts[i];
            const typingDuration = text.length / this.config.typingSpeed;
            const partTotalDuration = typingDuration + this.config.readTimeAfterTyping + this.config.pauseDuration;

            if (timeSinceStart < accumulatedTime + partTotalDuration) {
                currentPart = i;
                timeInPart = timeSinceStart - accumulatedTime;
                break;
            }
            accumulatedTime += partTotalDuration;
        }

        // Si on a dépassé la dernière partie, on vide l'écran
        if (currentPart === -1) {
            this.textElement.textContent = '';
            return;
        }

        const text = this.config.parts[currentPart];
        const typingDuration = text.length / this.config.typingSpeed;

        // Si on est dans la zone de pause (la fin de la tranche)
        if (timeInPart >= typingDuration + this.config.readTimeAfterTyping) {
            this.textElement.textContent = '';
            this.currentPartIndex = currentPart;
            return;
        }

        // Sinon, on calcule l'affichage progressif du texte
        const charsToShow = Math.min(text.length, Math.floor(timeInPart * this.config.typingSpeed));
        this.textElement.textContent = text.substring(0, charsToShow);
        this.currentPartIndex = currentPart;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isActive = false;
    }
}
