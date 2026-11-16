import * as THREE from 'three';

export class GlitchTextScreen {
    constructor(config = {}) {
        this.config = Object.assign({
            delay: 1.0,           // Secondes avant le début de la séquence
            typingSpeed: 25,      // Nombre de caractères affichés par seconde
            readTimeAfterTyping: 2.5, // Temps de lecture fixe une fois écrit
            pauseDuration: 1.0,   // Temps de blanc entre chaque partie
            parts: []             // Tableau des textes
        }, config);

        this.isActive = true;
        this.age = 0;
        this.currentPartIndex = -1;
        this.lastHTML = "";       // Pour éviter de réécrire le DOM à chaque frame

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
            background: radial-gradient(circle, #1a0000 0%, #000000 100%);
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
            }
            @keyframes blink-dots {
                0%, 100% { opacity: 0.1; }
                50% { opacity: 1; }
            }
            .blinking-dots {
                animation: blink-dots 0.6s infinite steps(1);
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
            if (this.lastHTML !== '') {
                this.textElement.innerHTML = '';
                this.lastHTML = '';
            }
            return;
        }

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

        if (currentPart === -1) {
            if (this.lastHTML !== '') {
                this.textElement.innerHTML = '';
                this.lastHTML = '';
            }
            return;
        }

        const fullText = this.config.parts[currentPart];
        const typingDuration = fullText.length / this.config.typingSpeed;

        if (timeInPart >= typingDuration + this.config.readTimeAfterTyping) {
            if (this.lastHTML !== '') {
                this.textElement.innerHTML = '';
                this.lastHTML = '';
            }
            this.currentPartIndex = currentPart;
            return;
        }

        const charsToShow = Math.min(fullText.length, Math.floor(timeInPart * this.config.typingSpeed));
        const currentTypedText = fullText.substring(0, charsToShow);

        let dotCountToBlink = 0;
        if (currentPart === 0 || currentPart === 1) {
            dotCountToBlink = 1;
        } else if (currentPart === 2) {
            dotCountToBlink = 3;
        }

        let newHTML = "";
        if (currentTypedText.length >= fullText.length - dotCountToBlink) {
            const mainPart = fullText.substring(0, fullText.length - dotCountToBlink);
            const dotsPart = fullText.substring(fullText.length - dotCountToBlink);
            newHTML = mainPart + `<span class="blinking-dots">${dotsPart}</span>`;
        } else {
            newHTML = currentTypedText;
        }

        // On ne met à jour le DOM que si le contenu change (évite de casser l'animation CSS)
        if (this.lastHTML !== newHTML) {
            this.textElement.innerHTML = newHTML;
            this.lastHTML = newHTML;
        }

        this.currentPartIndex = currentPart;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        this.isActive = false;
    }
}
