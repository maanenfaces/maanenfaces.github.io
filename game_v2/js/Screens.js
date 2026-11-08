import { DEV_MODE, DREAMLO_PUBLIC_KEY, DREAMLO_PRIVATE_KEY } from './Config.js';
import { SoundEffects } from './Audio/SoundEffects.js';
import * as THREE from 'three';

export class Screens {
    constructor(engine) {
        this.engine = engine;
        this.step = 'NAME';
        this.selectedIndex = 0;
        this.menuIndex = 0;
        this.score = 0;
        this.bonusInterval = null;

        this.instruments = document.querySelectorAll('.instrument');
        this.nameInput = document.getElementById('player-name');
        this.touchControls = document.getElementById('touch-controls');
        this.pauseButton = document.getElementById('pause-btn');
        this.superPowerTouchBtn = document.getElementById('super-power-touch-btn');

        this.bonusUI = {
            container: document.getElementById('bonus-container'),
            name: document.getElementById('bonus-name'),
            timer: document.getElementById('bonus-timer'),
            timerContainer: document.getElementById('bonus-timer-container'),
            bar: document.getElementById('bonus-bar-fill'),
            barContainer: document.getElementById('bonus-bar-container'),
        };

        if (DEV_MODE) {
            this.devUI = {
                panel: document.getElementById('dev-tools'),
                invincible: document.getElementById('dev-invincible'),
                slider: document.getElementById('dev-slider'),
                timeVal: document.getElementById('dev-time-val'),
                wallDensity: document.getElementById('dev-wall-density'),
                bonusDensity: document.getElementById('dev-bonus-density'),
                posX: document.getElementById('dev-position-x'),
                posY: document.getElementById('dev-position-y'),
                posZ: document.getElementById('dev-position-z')
            };
            this.initDevTools();
        }

        this.init();
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
                    if (e.key === 'ArrowLeft') this.playerMove(-1);
                    if (e.key === 'ArrowRight') this.playerMove(1);
                    if (e.key === 'ArrowUp') this.playerJump();
                    if (e.key === 'ArrowDown') this.playerFastFall();
                    if (e.code === 'Space' || e.key === ' ') this.playerUseSuperPower();
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
            console.log("Touch controls:", e.touches[0].clientX, e.touches[0].clientY);

            if (this.step !== 'PLAYING') return;
            if (e.target.closest('#hud-bottom-controls')) return;

            const touch = e.touches[0];
            const x = touch.clientX;
            const y = touch.clientY;
            const w = window.innerWidth;
            const h = window.innerHeight;

            if (y < h * 0.3) {
                this.playerJump();
            } else if (x < w / 2) {
                this.playerMove(-1);
            } else {
                this.playerMove(1);
            }
        }, { passive: false });

        this.pauseButton.addEventListener('pointerdown', (e) => {
            console.log("Pause button");
            e.stopPropagation(); // Empêche le touchControls de l'attraper
            e.preventDefault();
            this.togglePause();
        });

        this.superPowerTouchBtn.addEventListener('pointerdown', (e) => {
            console.log("Super Power button");
            e.stopPropagation(); // Empêche le touchControls de l'attraper
            e.preventDefault();
            this.playerUseSuperPower();
        });

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

        window.addEventListener('superPowerActivated', (e) => {
            const { role, color } = e.detail;
            this.triggerSuperPowerVisuals(color);
        });

        Leaderboard.fetchScores();
    }

    initDevTools() {
        this.devUI.panel.style.display = 'flex';

        if (this.engine.devSettings) {
            this.engine.devSettings.isInvincible = this.devUI.invincible.checked;
        }

        const updateSliderMax = () => {
            const duration = this.engine.musicController.audio.duration;
            if (duration && !isNaN(duration)) {
                this.devUI.slider.max = duration;
            }
        };

        if (this.engine.musicController.audio.readyState >= 1) {
            updateSliderMax();
        } else {
            this.engine.musicController.audio.addEventListener('loadedmetadata', updateSliderMax);
        }

        this.devUI.invincible.addEventListener('change', (e) => {
            if (this.engine.devSettings) {
                this.engine.devSettings.isInvincible = e.target.checked;
            }
        });

        this.devUI.slider.addEventListener('input', (e) => {
            const targetTime = parseFloat(e.target.value);
            this.engine.musicController.audio.currentTime = targetTime;
            this.updateDevUI(targetTime);

            if (this.engine.entityManager) {
                this.engine.entityManager.entities.forEach(ent => this.engine.entityManager.removeEntity(ent));
            }
        });
    }

    update() {
        this.updateBonusUI();
        this.updateHUD();

        if (DEV_MODE && this.devUI && !this.engine.isPaused) {
            this.updateDevUI();
        }
    }

    updateDevUI() {
        if (this.devUI) {
            const currentTime = this.engine.musicController.audio.currentTime;
            const formattedTime = Math.floor(currentTime).toString().padStart(3, '0');
            this.devUI.slider.value = currentTime;
            this.devUI.timeVal.innerText = formattedTime;
            this.devUI.bonusDensity.innerText = this.engine.currentPhase.bonuses.density;
            this.devUI.wallDensity.innerText = this.engine.currentPhase.obstacles.density;
            this.devUI.posZ.innerText = Math.round(this.engine.zOffset);
        }
    }

    togglePause() {
        if (this.step === 'PLAYING') {
            SoundEffects.pause(true);
            this.step = 'PAUSE';
            this.engine.onTogglePause(true);
            document.getElementById('hud').classList.add('hidden');
            document.getElementById('screens-container').classList.remove('hidden');
            document.getElementById('pause-screen').classList.add('active');
        } else {
            SoundEffects.pause(false);
            this.step = 'PLAYING';
            this.engine.onTogglePause(false);
            document.getElementById('hud').classList.remove('hidden');
            document.getElementById('screens-container').classList.add('hidden');
            document.getElementById('pause-screen').classList.remove('active');
        }
        this.menuIndex = 0;
        this.updateMenuUI();
    }

    showGameOver() {
        this.step = 'GAMEOVER';
        this.engine.isPaused = true;

        document.getElementById('hud').classList.add('hidden');
        document.getElementById('screens-container').classList.remove('hidden');
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

    playerFastFall() {
        if (this.engine.player.fastFall()) SoundEffects.move();
    }

    playerJump() {
        if (this.engine.player.jump(this.engine.activeBonus)) SoundEffects.move();
    }

    playerMove(direction) {
        if (this.engine.player.move(direction, this.engine.state)) SoundEffects.move();
    }

    playerUseSuperPower() {
        if (this.engine.player.useSuperPower(this.engine)) SoundEffects.useSuperPower();
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

    triggerSuperPowerVisuals(effectColor) {
        let hexColor = '#ffffff';
        if (effectColor instanceof THREE.Color) {
            hexColor = '#' + effectColor.getHexString();
        } else if (typeof effectColor === 'number') {
            hexColor = '#' + effectColor.toString(16).padStart(6, '0');
        } else if (typeof effectColor === 'string') {
            hexColor = effectColor;
        }

        const flash = document.createElement('div');
        flash.className = 'super-power-active-effect';
        flash.style.backgroundColor = hexColor;
        flash.style.boxShadow = `inset 0 0 150px ${hexColor}`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 600);
    }

    updateBonusUI() {
        const activeBonus = this.engine.activeBonus;
        if (activeBonus && activeBonus.item && activeBonus.timeLeft > 0) {
            const bonus = activeBonus.item;
            this.bonusUI.container.classList.remove('hidden');
            this.bonusUI.name.innerText = bonus.name.toUpperCase();
            this.bonusUI.timer.innerText = Math.ceil(activeBonus.timeLeft);

            const progress = (activeBonus.timeLeft / activeBonus.item.bonusDuration) * 100;
            const activeColor = bonus.colorHex || '#ffffff';

            const hideDuration = activeBonus.item.hideDuration || false;
            if (hideDuration) {
                this.bonusUI.barContainer.classList.add('hidden');
                this.bonusUI.timerContainer.classList.add('hidden');
            } else {
                this.bonusUI.bar.style.borderColor = activeColor;
                this.bonusUI.bar.style.width = `${progress}%`;
                this.bonusUI.bar.style.backgroundColor = activeColor;
                this.bonusUI.bar.style.boxShadow = `0 0 10px ${activeColor}`;
                this.bonusUI.barContainer.classList.remove('hidden');
                this.bonusUI.timerContainer.classList.remove('hidden');
            }

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
        const spBarFill = document.getElementById('super-power-bar-fill');
        const spBarContainer = document.getElementById('super-power-bar-container');
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

        if (spBarFill && spBarContainer && this.engine.player) {
            const percent = (this.engine.player.energy / this.engine.player.maxEnergy) * 100;
            spBarFill.style.width = `${percent}%`;
            if (this.engine.player.isPowerReady) {
                spBarContainer.classList.add('power-ready');
            } else {
                spBarContainer.classList.remove('power-ready');
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
        this.selectedIndex = 0;
        this.updateSelectionUI();
    }

    moveSelection(dir) {
        SoundEffects.beep();
        this.selectedIndex = (this.selectedIndex + dir + this.instruments.length) % this.instruments.length;
        this.updateSelectionUI();
    }

    updateSelectionUI() {
        if (!this.instruments || this.instruments.length === 0) {
            this.instruments = document.querySelectorAll('.instrument');
        }

        this.instruments.forEach((el, i) => {
            const isActive = (i === this.selectedIndex);

            if (isActive) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }

            if (isActive) {
                const hexColor = parseInt(el.getAttribute('data-color'));
                const roleType = el.getAttribute('data-type');

                if (this.engine && this.engine.player) {
                    if (typeof this.engine.player.setRole === 'function') {
                        this.engine.player.setRole(roleType);
                    }
                    if (this.engine.player.mesh && this.engine.player.mesh.material) {
                        this.engine.player.color = hexColor;
                        if (this.engine.player.mesh.children[0]) {
                            this.engine.player.mesh.children[0].material.color.setHex(hexColor);
                        }
                    }
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

        document.getElementById('screens-container').classList.remove('hidden');
        document.getElementById('game-over-screen').classList.remove('active');
        document.getElementById('pause-screen').classList.remove('active');

        this.score = 0;
        this.updateScore(0);

        this.engine.isPaused = false;
        this.engine.reset();
        Leaderboard.fetchScores();

        this.step = 'SELECTION';
        this.selectedIndex = 0;

        document.getElementById('start-screen').classList.remove('active');
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
            document.getElementById('screens-container').classList.add('hidden');
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

            if (data.dreamlo.leaderboard && data.dreamlo.leaderboard.entry) {
                scores = data.dreamlo.leaderboard.entry;
                if (!Array.isArray(scores)) scores = [scores];
            }

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
