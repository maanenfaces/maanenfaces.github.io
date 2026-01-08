import { DEV_MODE, DREAMLO_PUBLIC_KEY, DREAMLO_PRIVATE_KEY } from './Config.js';
import { SoundEffects } from './SoundEffects.js';

export class Screens {
    constructor(engine) {
        this.engine = engine;
        this.step = 'NAME';      // NAME, SELECTION, PLAYING, PAUSE, GAMEOVER
        this.selectedIndex = 0;  // Index pour la sélection d'instrument
        this.menuIndex = 0;      // Index pour les menus Pause/GameOver
        this.score = 0;
        this.bonusInterval = null;

        // Cache des éléments DOM
        this.instruments = document.querySelectorAll('.instrument');
        this.nameInput = document.getElementById('player-name');
        this.touchControls = document.getElementById('touch-controls');
        this.pauseButton = document.getElementById('pause-btn');

        this.bonusUI = {
            container: document.getElementById('bonus-container'),
            name: document.getElementById('bonus-name'),
            timer: document.getElementById('bonus-timer'),
            bar: document.getElementById('bonus-bar-fill')
        };

        if (DEV_MODE) {
            this.devUI = {
                panel: document.getElementById('dev-tools'),
                invincible: document.getElementById('dev-invincible'),
                slider: document.getElementById('dev-slider'),
                timeVal: document.getElementById('dev-time-val')
            };
            this.initDevTools();
        }

        this.init();
    }

    initDevTools() {
        this.devUI.panel.style.display = 'block';

        // Initialiser l'état d'invincibilité dans le moteur
        if (this.engine.devSettings) {
            this.engine.devSettings.isInvincible = this.devUI.invincible.checked;
        }

        const updateSliderMax = () => {
            const duration = this.engine.music.audio.duration;
            if (duration && !isNaN(duration)) {
                this.devUI.slider.max = duration;
                console.log("Slider Dev configuré sur :", duration, "secondes");
            }
        };

        // Gestion du chargement de l'audio pour le slider
        if (this.engine.music.audio.readyState >= 1) {
            updateSliderMax();
        } else {
            this.engine.music.audio.addEventListener('loadedmetadata', updateSliderMax);
        }

        // Checkbox Invincibilité
        this.devUI.invincible.addEventListener('change', (e) => {
            if (this.engine.devSettings) {
                this.engine.devSettings.isInvincible = e.target.checked;
            }
        });

        // Slider : Navigation temporelle
        this.devUI.slider.addEventListener('input', (e) => {
            const targetTime = parseFloat(e.target.value);

            // 1. Appliquer le temps à l'audio
            this.engine.music.audio.currentTime = targetTime;

            // 2. Mettre à jour l'affichage 000
            this.updateDevTimeDisplay(targetTime);

            // 3. Nettoyer les entités pour éviter les collisions fantômes lors du saut
            if (this.engine.entities) {
                this.engine.entities.entities.forEach(ent => this.engine.entities.removeEntity(ent));
            }
        });
    }

    updateDevTimeDisplay(seconds) {
        if (this.devUI && this.devUI.timeVal) {
            const formattedTime = Math.floor(seconds).toString().padStart(3, '0');
            this.devUI.timeVal.innerText = formattedTime;
        }
    }

    update() {
        this.updateBonusUI();
        this.updateHUD();

        // Mise à jour de l'UI Dev Mode
        if (DEV_MODE && this.devUI && !this.engine.isPaused) {
            const currentTime = this.engine.music.audio.currentTime;
            this.devUI.slider.value = currentTime;
            this.updateDevTimeDisplay(currentTime);
        }
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
                e.preventDefault();
            }

            switch(this.step) {
                case 'NAME':
                    if (e.key === 'Enter') this.validateName();
                    break;
                case 'SELECTION':
                    if (e.key === 'Escape') this.reloadPage();
                    if (e.key === 'ArrowLeft') this.moveSelection(-1);
                    if (e.key === 'ArrowRight') this.moveSelection(1);
                    if (e.key === 'Enter') this.start();
                    break;
                case 'PLAYING':
                    if (e.key === 'Escape') this.togglePause();
                    if (e.key === 'ArrowLeft') this.engine.player.move(-1, this.engine.state);
                    if (e.key === 'ArrowRight') this.engine.player.move(1);
                    if (e.key === 'ArrowUp') this.engine.player.jump(this.engine.activeBonus);
                    if (e.key === 'ArrowDown') this.engine.player.fastFall();;
                    break;
                case 'PAUSE':
                case 'GAMEOVER':
                    if (e.key === 'Escape' && this.step === 'PAUSE') this.togglePause();
                    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') this.moveMenuSelection();
                    if (e.key === 'Enter') this.executeMenuAction();
                    break;
            }
        });

        this.touchControls.addEventListener('touchstart', (e) => {
            if (this.step !== 'PLAYING') return;
            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            const w = window.innerWidth;
            const h = window.innerHeight;

            if (y < h * 0.3) {
                this.engine.player.jump(this.engine.activeBonus);
            } else if (x < w / 2) {
                this.engine.player.move(-1);
            } else {
                this.engine.player.move(1);
            }
        }, { passive: false });

        this.pauseButton.addEventListener('click', () => this.togglePause());

        this.instruments.forEach((inst, index) => {
            inst.addEventListener('click', () => {
                if (this.step === 'SELECTION') {
                    this.selectedIndex = index;
                    this.updateSelectionUI();
                }
            });
        });

        window.addEventListener('gameStateGameOver', () => this.showGameOver());
        window.addEventListener('addScore', (e) => this.updateScore(e.detail));

        // Init in the background when starting, to avoid table glitching
        // This would be refresh when the user will validate its name
        Leaderboard.fetchScores();
    }

    togglePause() {
        if (this.step === 'PLAYING') {
            SoundEffects.pause(true);
            this.step = 'PAUSE';
            this.engine.onTogglePause(true);
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('pause-screen').classList.add('active');
        } else {
            SoundEffects.pause(false);
            this.step = 'PLAYING';
            this.engine.onTogglePause(false);
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('pause-screen').classList.remove('active');
        }
        this.menuIndex = 0;
        this.updateMenuUI();
    }

    showGameOver() {
        this.step = 'GAMEOVER';
        this.engine.isPaused = true;

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('game-over-screen').classList.add('active');
        document.getElementById('final-score').innerText = "SCORE: " + this.score.toString().padStart(6, '0');

        this.menuIndex = 0;
        this.updateMenuUI();

        Leaderboard.postScore(this.nameInput.value.trim().toUpperCase(), this.score);
    }

    moveMenuSelection() {
        SoundEffects.beep();
        this.menuIndex = this.menuIndex === 0 ? 1 : 0;
        this.updateMenuUI();
    }

    updateMenuUI() {
        const activeScreen = this.step === 'PAUSE' ? 'pause-screen' : 'game-over-screen';
        const buttons = document.querySelectorAll(`#${activeScreen} .menu-btn`);
        buttons.forEach((btn, i) => btn.classList.toggle('active', i === this.menuIndex));
    }

    executeMenuAction() {
        const activeScreen = this.step === 'PAUSE' ? 'pause-screen' : 'game-over-screen';
        const action = document.querySelectorAll(`#${activeScreen} .menu-btn`)[this.menuIndex].dataset.action;
        if (action === 'resume') this.togglePause();
        if (action === 'restart') this.restartGame();
    }

    updateBonusUI() {
        const activeBonus = this.engine.activeBonus;
        if (activeBonus && activeBonus.item && activeBonus.timeLeft > 0) {
            const bonus = activeBonus.item;
            this.bonusUI.container.classList.remove('hidden');
            this.bonusUI.name.innerText = bonus.name.toUpperCase();
            this.bonusUI.timer.innerText = Math.ceil(activeBonus.timeLeft);

            const progress = (activeBonus.timeLeft / activeBonus.item.bonusDuration) * 100;
            this.bonusUI.bar.style.width = `${progress}%`;

            const activeColor = bonus.colorHex || '#ffffff';

            this.bonusUI.bar.style.backgroundColor = activeColor;
            this.bonusUI.bar.style.boxShadow = `0 0 10px ${activeColor}`;

            const barContainer = document.getElementById('bonus-bar-container');
            if(barContainer) barContainer.style.borderColor = activeColor;

            const bonusInfo = document.getElementById('bonus-info');
            if(bonusInfo) {
                bonusInfo.style.color = activeColor;
                bonusInfo.style.textShadow = `0 0 10px ${activeColor}`;
            }
        } else {
            this.bonusUI.container.classList.add('hidden');
        }
    }

    updateHUD() {
        const velocityDisplay = document.getElementById('velocity-val');
        const currentSpeed = this.engine.currentTotalSpeed;

        if (velocityDisplay && currentSpeed) {
            velocityDisplay.innerText = currentSpeed.toFixed(1) + "x";

            if (currentSpeed > 2.5) {
                velocityDisplay.style.color = "var(--neon-red)";
                velocityDisplay.style.textShadow = "0 0 10px var(--neon-red)";
            } else {
                velocityDisplay.style.color = "#fff";
                velocityDisplay.style.textShadow = "0 0 10px var(--neon-blue)";
            }
        }
    }

    validateName() {
        const name = this.nameInput.value.trim().toUpperCase();
        const nameRegex = /^[A-Z0-9_-]{1,10}$/;

        if (!nameRegex.test(name)) {
            this.step = "NAME";
            const originalPlaceholder = this.nameInput.placeholder;

            if (name.length > 10) {
                this.nameInput.placeholder = "MAX 10 CHARACTERS";
            } else if (name.length === 0) {
                this.nameInput.placeholder = "ENTER YOUR NAME HERE";
            } else {
                this.nameInput.placeholder = "ONLY LETTERS AND NUMBERS";
            }

            this.nameInput.value = "";
            this.nameInput.classList.add('shake-error');
            SoundEffects.error();

            setTimeout(() => {
                this.nameInput.placeholder = originalPlaceholder;
                this.nameInput.classList.remove('shake-error');
            }, 700);

            return;
        }

        SoundEffects.validate();
        Leaderboard.fetchScores();

        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) statusDisplay.innerText = `USER ID: ${name} // AUTHENTICATED`;

        this.step = 'SELECTION';
        document.getElementById('name-step').classList.add('hidden');
        document.getElementById('selection-step').classList.remove('visually-hidden');
        document.getElementById('selection-step').classList.remove('hidden');
        this.nameInput.blur();
        this.updateSelectionUI();
    }

    moveSelection(dir) {
        SoundEffects.beep();
        this.selectedIndex = (this.selectedIndex + dir + this.instruments.length) % this.instruments.length;
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        this.instruments.forEach((el, i) => {
            const isActive = i === this.selectedIndex;
            el.classList.toggle('active', isActive);
            if (isActive) {
                const hexColor = parseInt(el.getAttribute('data-color'));
                this.engine.player.mesh.material.color.setHex(hexColor);
                this.engine.player.color = hexColor;
                if (this.engine.player.mesh.children[0]) {
                    this.engine.player.mesh.children[0].material.color.setHex(hexColor);
                }
            }
        });
    }

    updateScore(points) {
        this.score = Math.round((this.score + points) / 5) * 5;
        const scoreElement = document.getElementById('score-val');
        if (scoreElement) {
            scoreElement.innerText = this.score.toString().padStart(6, '0');
        }
    }

    restartGame() {
        SoundEffects.validate();

        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('pause-screen').classList.remove('active');

        this.score = 0;
        this.updateScore(0);

        this.engine.isPaused = false;
        this.engine.reset();
        Leaderboard.fetchScores();

        this.step = 'SELECTION';
        document.getElementById('start-screen').classList.remove('active'); // Au cas où
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('name-step').classList.add('hidden');
        document.getElementById('selection-step').classList.remove('visually-hidden');
        document.getElementById('selection-step').classList.remove('hidden');

        this.updateSelectionUI();
    }

    start() {
        SoundEffects.start();

        this.step = 'PLAYING';
        this.engine.isPaused = false;

        window.dispatchEvent(new Event('gameStarted'));

        setTimeout(() => {
            document.getElementById('start-screen').classList.remove('active');
            document.getElementById('hud').style.display = 'flex';
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('touch-controls').classList.add('active');
        }, 300);
    }

    reloadPage() {
        SoundEffects.error();
        setTimeout(() => {
            window.location.reload();
        }, 300);
    }
}

export class Leaderboard {
    static async fetchScores() {
        const listContainer = document.getElementById('leaderboard-list');
        try {
            const response = await fetch(`http://www.dreamlo.com/lb/${DREAMLO_PUBLIC_KEY}/json`);
            const data = await response.json();

            let scores = [];

            // Extraction sécurisée des scores
            if (data.dreamlo.leaderboard && data.dreamlo.leaderboard.entry) {
                scores = data.dreamlo.leaderboard.entry;
                if (!Array.isArray(scores)) scores = [scores];
            }

            // On crée un tableau de 10 éléments
            // Si on a des scores, on les prend, sinon on complète avec du vide
            const fullList = Array.from({ length: 5 }, (_, index) => {
                const entry = scores[index];
                return {
                    name: entry ? entry.name.substring(0, 5) : "...",
                    score: entry ? entry.score : 0
                };
            });

            listContainer.innerHTML = fullList.map((entry, index) => `
                <div style="display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid rgba(255,0,0,0.1);">
                    <span>${index + 1}. ${entry.name}</span>
                    <span>${entry.score}</span>
                </div>
            `).join('');

        } catch (error) {
            console.error(error);
            listContainer.innerHTML = "OFFLINE_MODE";
        }
    }

    static async postScore(playerName, score) {
        if (!playerName || score <= 0) return;
        try {
            await fetch(`http://www.dreamlo.com/lb/${DREAMLO_PRIVATE_KEY}/add/${playerName}/${score}`);
            console.log("Score synced to cloud");
        } catch (e) {
            console.error("Cloud sync failed");
        }
    }
}
