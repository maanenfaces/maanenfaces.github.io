import * as THREE from 'three';
import { World } from './World.js';
import { Road } from './Road.js';
import { EntityManager } from './Entities.js';
import { Player } from './Player.js';
import { BackgroundManager } from './BackgroundManager.js';
import { MusicController } from './MusicController.js';
import { SoundEffects } from './SoundEffects.js';
import { DEV_MODE } from './Config.js';

const DEFAULT_PHASE = {
    label: "UNKNOWN",
    speed: 1,
    theme: {
        background: {
            // Cover de l'album A Brilliant Future de Maanen Faces
            imageUrl: "https://f4.bcbits.com/img/a2164237503_10.jpg",
            videoId: null
        },
        colors: [0x00ff00],
        gridOpacity: 1
    },
    bonuses: {
        density: 0.05,
        distribution: [
            { entity: "PointBonus", percent: 40 },
            { entity: "SpeedBonus", percent: 30 },
            { entity: "JumpBonus",  percent: 20 },
            { entity: "GhostBonus", percent: 10 }
        ]
    },
    obstacles: {
        density: 0.2,
        distribution: [
            { entity: "Wall", percent: 25 },
            { entity: "MovingWall", percent: 25 },
            { entity: "FallingWall", percent: 25 },
            { entity: "ChasingWall", percent: 25 }
        ]
    },
    effects: {
        curve:     { intensity: 0.5 },
        flash:     { intensity: 0 },
        glitch:    { intensity: 0.1 },
        lightning: { intensity: 0 },
        reverse:   { enabled: false },
        roll:      { intensity: 0 },
        wave:      { intensity: 0 }
    }
};

export class GameEngine {
    constructor(scene, camera, songPhases) {
        this.scene = scene;
        this.camera = camera;
        this.songPhases = songPhases;
        this.time = 0;
        this.zOffset = 0;
        this.isPaused = true;
        this.currentPhase = DEFAULT_PHASE;
        this.currentParams = { speed: 1, waveHeight: 0, curveStrength: 0, color: new THREE.Color(0x00ffff), gridOpacity: 0.5 };

        this.scoreTimer = 0;
        this.spawnBonusTimer = 10; // pas de bonus les 10 premières secondes
        this.spawnWallTimer = 1;

        this.world = new World(scene);
        this.road = new Road(scene);
        this.entities = new EntityManager(scene);
        this.player = new Player(scene);
        this.background = new BackgroundManager();
        this.music = new MusicController();

        this.colorTimer = 0;
        this.colorIndex = 0;
        this.currentParams = {
            speed: 1,
            waveHeight: 0,
            curveStrength: 0,
            rollStrength: 0,
            color: new THREE.Color(0x00ffff),
            gridOpacity: 0.5
        };

        this.currentTotalSpeed = this.currentParams.speed;
        this.bonusVelocity = 0;
        this.speedTransitionDuration = 10;

        this.isReversed = false;
        this.cameraRotation = 0;
        this.isRotating = false;

        this.activeBonus = {
            item: null,
            type: null,
            timeLeft: 0,
            scoreMultiplier: 1,
            speedMultiplier: 1,
        };

        this.devSettings = {
            isInvincible: false
        };

        window.addEventListener('gameStarted', () => {
            console.log("gameStarted event received");
            this.onStart();
        });
    }

    consolidatePhase(previousPhase, newPhase) {
        const merge = (mould, patch) => {
            // Si c'est un objet (et pas un tableau), on fusionne récursivement
            if (mould !== null && typeof mould === 'object' && !Array.isArray(mould)) {
                const result = {};
                for (const key in mould) {
                    // IMPORTANT: On ré-exécute la fusion sur chaque clé
                    result[key] = merge(mould[key], patch ? patch[key] : undefined);
                }
                return result;
            }

            // Si la phase actuelle propose une valeur (patch), on la prend.
            // Sinon, on prend SYSTEMATIQUEMENT la valeur du moule (DEFAULT_PHASE).
            return (patch !== undefined && patch !== null) ? patch : mould;
        };

        return merge(previousPhase, newPhase);
    }

    getProjection(z, xOffset = 0) {
        const wz = z - this.zOffset;
        const cp = this.currentParams;
        const rollStr = cp.rollStrength || 0;

        // 1. X : Courbure (Virages)
        let x = Math.sin(wz * 0.02 + this.time * 0.5) * (cp.curveStrength || 0);

        // 2. Y : Vagues Verticales
        let yBase = Math.sin(this.time * 2 + wz * 0.1) * (cp.waveHeight || 0);

        // 3. EFFET ROULIS (L'Hélice Lisse)
        let angle = 0;
        let yRolling = 0;
        if (rollStr !== 0) {
            // --- LA CORRECTION EST ICI ---
            // On réduit drastiquement l'influence de wz (0.001 au lieu de 0.01)
            // Cela permet à l'angle d'être quasiment identique du début à la fin de la route.
            const slowBase = Math.sin(this.time * 0.8 + wz * 0.001);

            // Spike aléatoire
            const fastSpike = Math.pow(Math.max(0, Math.sin(this.time * 0.4)), 10) * Math.sin(this.time * 5);

            // On réduit un peu le facteur (0.001) pour un contrôle plus fin avec ton rollStr de 30
            angle = (slowBase + fastSpike) * (rollStr * 0.001);

            yRolling = xOffset * angle;
        }

        // 4. MICRO-GLITCH
        let yGlitch = 0;
        const glitchConfig = this.currentPhase?.effects?.glitch;

        if (glitchConfig && glitchConfig.intensity > 0) {
            const intensity = glitchConfig.intensity; // Valeur supposée entre 0 et 1

            // On ajuste le seuil de probabilité selon l'intensité
            // Plus l'intensité est forte, plus le seuil descend (donc plus de chances de glitcher)
            const glitchThreshold = 1.0 - (0.05 * intensity);

            if (Math.sin(wz * 0.5 + this.time * (10 + intensity * 20)) > glitchThreshold) {
                // L'amplitude du saut vertical est multipliée par l'intensité
                // On passe de 0.8 à une valeur plus ou moins forte
                yGlitch = (Math.random() - 0.5) * (1.5 * intensity);

                // Optionnel : Ajouter un glitch horizontal léger pour plus de chaos
                // xGlitch = (Math.random() - 0.5) * intensity;
            }
        }

        return { x, y: yBase + yRolling + yGlitch, rollAngle: angle };
    }

    update(currentTime, delta) {
        if (this.isPaused) return;

        this.time = currentTime;

        // 1. GESTION PHASE MUSICALE ET CONSOLIDATION
        const musicStatus = this.music.update();
        if (this.music.hasPhaseChanged) {
            if (this.time < 5) {
                this.consolidatePhase(DEFAULT_PHASE, musicStatus.phase);
            } else {
                this.currentPhase = this.consolidatePhase(this.currentPhase, musicStatus.phase);
            }
        }
        const p = this.currentPhase;

        // 2. SCORE (10 points par seconde * vitesse)
        this.scoreTimer += delta;
        if (this.scoreTimer >= 1.0) {
            const points = Math.floor(10 * this.currentParams.speed);
            window.dispatchEvent(new CustomEvent('addScore', { detail: points }));
            this.scoreTimer -= 1.0;
        }

        // 3. LOGIQUE DES TRIGGERS (Basée sur l'intensité)
        const triggers = {
            lightning: Math.random() < (p.effects.lightning.intensity * delta * 10),
            flash:     Math.random() < (p.effects.flash.intensity * delta * 5),
            glitch:    Math.random() < (p.effects.glitch.intensity * delta * 5),
            reverse:   p.effects.reverse.enabled === true
        };

        if (triggers.lightning) this.world.triggerLightning();

        if (triggers.flash) {
            const colors = p.theme.colors;
            const flashColor = Array.isArray(colors) ? colors[Math.floor(Math.random() * colors.length)] : colors;
            this.world.triggerScreenFlash(flashColor);
        }

        const glitchConfig = this.currentPhase?.effects?.glitch;

        if (triggers.glitch && glitchConfig) {
            const intensity = glitchConfig.intensity || 0.5;

            const hue = Math.random() * (360 * intensity);
            const bright = 1 + (0.5 * intensity);
            const contrast = 1 + (1 * intensity);

            document.body.style.filter = `hue-rotate(${hue}deg) brightness(${bright}) contrast(${contrast})`;
            const duration = 40 + (80 * intensity);

            setTimeout(() => {
                document.body.style.filter = 'none';
            }, duration);
        }

        // 4. GESTION DE LA COULEUR AMBIANTE (Alternance si tableau)
        let targetColorHex;
        if (Array.isArray(p.theme.colors)) {
            this.colorTimer += delta;
            if (this.colorTimer > 0.5) {
                this.colorTimer = 0;
                this.colorIndex = (this.colorIndex + 1) % p.theme.colors.length;
            }
            targetColorHex = p.theme.colors[this.colorIndex];
        } else {
            targetColorHex = p.theme.colors;
        }

        // 5. INTERPOLATION (Lerp)
        const lerpS = 0.05;
        this.currentParams.color.lerp(new THREE.Color(targetColorHex), 2 * delta);
        this.currentParams.gridOpacity += (p.theme.gridOpacity - this.currentParams.gridOpacity) * lerpS;
        this.currentParams.curveStrength += (p.effects.curve.intensity - this.currentParams.curveStrength) * lerpS;
        this.currentParams.waveHeight += (p.effects.wave.intensity - this.currentParams.waveHeight) * lerpS;
        this.currentParams.rollStrength += (p.effects.roll.intensity - this.currentParams.rollStrength) * lerpS;

        // 6. CAMERA ROTATION & REVERSE
        const targetRotation = triggers.reverse ? Math.PI : 0;
        this.cameraRotation += (targetRotation - this.cameraRotation) * (lerpS * 5);
        this.camera.rotation.z = this.cameraRotation;

        // Événements de rotation (UI)
        const currentlyRotating = Math.abs(targetRotation - this.cameraRotation) > 0.1;
        if (currentlyRotating !== this.isRotating) {
            this.isRotating = currentlyRotating;
            window.dispatchEvent(new CustomEvent(this.isRotating ? 'uiRotationStart' : 'uiRotationEnd'));
        }

        // Événements de changement d'état Reverse
        if (triggers.reverse !== this.isReversed) {
            this.isReversed = triggers.reverse;
            const eventName = this.isReversed ? 'effectReverseOn' : 'effectReverseOff';
            window.dispatchEvent(new CustomEvent(eventName, { detail: { phase: p.label } }));
        }

        // 7. GESTION DU BONUS & VITESSE TOTALE
        if (this.activeBonus.timeLeft > 0) {
            this.activeBonus.timeLeft -= delta;
            if (this.activeBonus.timeLeft <= 0) {
                const expiredItem = this.activeBonus.item;
                this.activeBonus.timeLeft = 0;
                this.onBonusStop(expiredItem);
                this.activeBonus.item = null;
            }
        }

        const targetSpeed = p.speed;
        const multiplier = this.activeBonus.speedMultiplier;

        // 1. MISE À JOUR DE LA VITESSE DE BASE (Musique)
        if (this.currentParams.speed < targetSpeed) {
            // Accélération instantanée
            this.currentParams.speed = targetSpeed;
        }
        else if (this.currentParams.speed > targetSpeed && multiplier <= 1) {
            // Décélération lente (uniquement hors bonus)
            const step = delta / this.speedTransitionDuration;
            this.currentParams.speed = Math.max(targetSpeed, this.currentParams.speed - step);
        }

        const baseSpeed = this.currentParams.speed;

        // 2. GESTION DE LA VÉLOCITÉ BONUS
        if (multiplier > 1) {
            // Si on vient d'activer le bonus, on fixe la valeur du boost
            // au lieu de la recalculer à chaque frame par rapport à la base
            if (this.bonusVelocity <= 0) {
                this.bonusVelocity = baseSpeed * (multiplier - 1);
            }
            // La vitesse totale est l'addition de la base (qui peut varier) et du boost (fixe)
            this.currentTotalSpeed = baseSpeed + this.bonusVelocity;
        } else {
            // Si plus de bonus, on applique la friction sur le boost restant
            if (this.bonusVelocity > 0) {
                const friction = 0.2 * delta;
                this.bonusVelocity += (0 - this.bonusVelocity) * friction;
                if (this.bonusVelocity < 0.01) this.bonusVelocity = 0;
            }
            this.currentTotalSpeed = baseSpeed + this.bonusVelocity;
        }

        this.zOffset += this.currentTotalSpeed * delta * 50;

        // 8. ÉTAT ET MISES À JOUR
        const proj = (z, x) => this.getProjection(z, x);
        const state = {
            time: this.time,
            delta,
            speed: this.currentTotalSpeed * 50,
            phase: p,
            params: this.currentParams,
            activeBonus: this.activeBonus,
            triggers: triggers
        };

        this.background.update(p, delta);
        this.world.update(state, proj);
        this.road.update(state, proj);
        this.entities.update(state, proj);
        this.player.update(state, proj);

        this.handleSpawning(state, proj);
        this.handleCollisions(state, proj);
    }

    handleSpawning(state, proj) {
        const dt = state.delta;
        const p = state.phase;

        const wallDensity = p.obstacles?.density || 0;
        const bonusDensity = p.bonuses?.density || 0;

        // --- 1. Gestion des Murs ---
        if (wallDensity > 0) {
            this.spawnWallTimer -= dt;
            if (this.spawnWallTimer <= 0) {
                this.currentSafeLane = Math.floor(Math.random() * 3) - 1;
                this.entities.spawnWallPattern(state, this.currentSafeLane, proj);
                this.spawnWallTimer = 1 / (wallDensity * 5);

                // Verrou
                if (this.spawnBonusTimer < 0.2) this.spawnBonusTimer = 0.2;
            }
        } else {
            // Si densité 0, on garde le timer à une valeur positive pour le prochain changement
            this.spawnWallTimer = 0.5;
        }

        // --- 2. Gestion des Bonus ---
        if (bonusDensity > 0) {
            this.spawnBonusTimer -= dt;
            if (this.spawnBonusTimer <= 0) {
                this.entities.spawnBonusPattern(state, this.currentSafeLane, proj);
                this.spawnBonusTimer = 1 / (bonusDensity * 2);

                // Verrou
                if (this.spawnWallTimer < 0.2) this.spawnWallTimer = 0.2;
            }
        } else {
            this.spawnBonusTimer = 0.5;
        }
    }

    handleCollisions(state, proj) {
        this.entities.entities.forEach(ent => {
            if (!ent.isActive) return;

            // 1. Calcul de la distance
            const distZ = Math.abs(ent.z - 3);
            const isInLane = ent.lane === this.player.currentLane;

            // On ne traite que les objets très proches du joueur
            if (isInLane && distZ < 1.0) {

                // CAS A : C'est un BONUS
                if (ent.type === "bonus") {
                    SoundEffects.bonus();

                    ent.isActive = false;
                    ent.mesh.visible = false;

                    if (this.activeBonus.item) {
                        this.onBonusStop(this.activeBonus.item);
                    }
                    this.onBonusStart(ent);

                    this.entities.removeEntity(ent);
                }

                // CAS B : C'est un MUR
                else if (ent.type === "wall") {
                    const hasInvincibilityBonus = this.activeBonus.item?.subType === "invincible" && this.activeBonus.timeLeft > 0;
                    const isDevGodMode = DEV_MODE && this.devSettings.isInvincible;
                    const isPhaseTransition = this.isRotating;

                    const isInvincible =
                        hasInvincibilityBonus ||
                        isDevGodMode ||
                        isPhaseTransition;

                    const isJumping = this.player.isJumping;

                    if (isInvincible) {
                        console.log("Collision traversée (Invincibilité)");
                    } else if (isJumping) {
                        window.dispatchEvent(new CustomEvent('addScore', {
                            detail: 150 * this.activeBonus.scoreMultiplier
                        }));
                    } else {
                        this.player.die();
                        SoundEffects.gameOver();

                        setTimeout(() => {
                            this.onStop();
                            window.dispatchEvent(new Event('gameStateGameOver'));
                        }, 500);
                    }
                }
            }
        });
    }

    onBonusStart(bonus) {
        console.log(`START BONUS: ${bonus.subType}`);

        const flash = document.createElement('div');
        flash.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:white;opacity:0.3;z-index:1000;pointer-events:none;";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 100);

        const bonusDuration = bonus.bonusDuration;

        this.activeBonus.item = bonus;
        this.activeBonus.timeLeft = bonusDuration;

        switch(bonus.subType) {
            case 'invincible':
                this.activeBonus.scoreMultiplier -= 0.25;
                break;
            case 'speed':
                this.activeBonus.scoreMultiplier += 0.25;
                this.activeBonus.speedMultiplier += 0.2;
                break;
            case 'jump':
                this.player.canJump = true;
                break;
            case 'points':
                window.dispatchEvent(new CustomEvent('addScore', {detail: 50}));
                break;
        }

        window.dispatchEvent(new CustomEvent('addScore', {
            detail: 150 * this.activeBonus.scoreMultiplier
        }));
        window.dispatchEvent(new CustomEvent('bonusAcquired', {
            detail: { type: bonus, duration: bonusDuration }
        }));
    }

    onBonusStop(bonus) {
        console.log(`STOP BONUS: ${bonus.subType}`);

        if (this.activeBonus.timeLeft <= 0) {
            this.activeBonus.scoreMultiplier = 1;
            this.activeBonus.speedMultiplier = 1;
        }

        this.player.canJump = false;
        this.player.mesh.visible = true;
    }

    onStart() {
        this.music.play();
        this.isPaused = false;
    }

    onStop() {
        this.music.stop();
        this.isPaused = true;
    }

    onTogglePause(forcePause) {
        this.isPaused = forcePause !== undefined ? forcePause : !this.isPaused;
        if (this.isPaused) this.music.pause();
        else this.music.resume();
    }

    reset() {
        // 1. Reset des paramètres logiques
        this.time = 0;
        this.zOffset = 0;
        this.spawnTimer = 0;
        this.isPaused = true;
        this.colorTimer = 0;
        this.colorIndex = 0;

        // 2. Reset des bonus actifs
        this.activeBonus = {
            item: null,
            type: null,
            timeLeft: 0,
            scoreMultiplier: 1,
            speedMultiplier: 1
        };

        // 3. Reset de la phase musicale
        this.currentPhase = this.songPhases[0];
        this.currentParams = {
            speed: 1,
            waveHeight: 0,
            curveStrength: 0,
            color: new THREE.Color(0x00ffff),
            gridOpacity: 0.5
        };

        // 4. Nettoyage des entités
        if (this.entities) {
            this.entities.entities.forEach(ent => {
                if (ent.mesh) this.scene.remove(ent.mesh);
            });
            this.entities.entities = [];
        }

        // Reset du joueur (position et état de saut)
        if (this.player) {
            this.player.reset((z) => this.getProjection(z));
        }

        // Reset de la route et du monde (pour remettre les grilles à zéro)
        if (this.road) this.road.reset();
        if (this.world) this.world.reset();

        // 5. Reset de la musique
        if (this.music) {
            this.music.stop();
            this.music.audio.currentTime = 0;
        }

        console.log("Engine Reset Complete");
    }



}
