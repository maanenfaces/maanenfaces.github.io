import * as THREE from 'three';
import { World } from './World.js';
import { Road } from './Road.js';
import { EntityManager } from './Entities.js';
import { Player } from './Player.js';
import { BackgroundManager } from './BackgroundManager.js';
import { MusicController } from './MusicController.js';
import { SoundEffects } from './SoundEffects.js';
import { DEV_MODE } from './Config.js';

export class GameEngine {
    constructor(scene, camera, songPhases) {
        this.scene = scene;
        this.camera = camera;
        this.songPhases = songPhases;
        this.time = 0;
        this.zOffset = 0;
        this.isPaused = true;
        this.currentPhase = songPhases[0];
        this.currentParams = { speed: 1, waveHeight: 0, curveStrength: 0, color: new THREE.Color(0x00ffff), gridOpacity: 0.5 };

        this.scoreTimer = 0;
        this.spawnTimer = 0;

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
        this.decelerationTime = 100;

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

        this.isGateInTransit = false;
        this.needSpeedReset = false;

        window.addEventListener('gameStarted', () => {
            console.log("gameStarted event received");
            this.onStart();
        });
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
        if (this.currentPhase?.effects?.includes('glitch')) {
            if (Math.sin(wz * 0.5 + this.time * 10) > 0.97) {
                yGlitch = (Math.random() - 0.5) * 0.8;
            }
        }

        return { x, y: yBase + yRolling + yGlitch, rollAngle: angle };
    }

    update(currentTime, delta) {
        if (this.isPaused) return;

        this.time = currentTime;

        // 10 POINTS PAR SECONDE, MODIFIÉ PAR LA VITESSE ACTUELLE
        this.scoreTimer += delta;
        if (this.scoreTimer >= 1.0) {
            const points = Math.floor(10 * this.currentParams.speed);
            window.dispatchEvent(new CustomEvent('addScore', { detail: points }));
            this.scoreTimer -= 1.0;
        }

        // GESTION PHASE MUSICAL ET IMAGE DE FOND
        const musicStatus = this.music.update();
        this.currentPhase = musicStatus.phase;
        this.background.update(this.currentPhase, 0.8);

        // Raccourci pour faciliter la lecture
        const p = this.currentPhase;

        // BONUS ACTIF
        if (this.activeBonus.timeLeft > 0) {
            this.activeBonus.timeLeft -= delta;
            if (this.activeBonus.timeLeft <= 0) {
                this.onBonusStop(this.activeBonus.item);
                this.activeBonus.timeLeft = 0;
            }
        }

        // GESTION DES EFFETS
        const effects = p.effects || [];
        const triggers = {
            eclair: effects.includes('eclair') && Math.random() < (p.eclairIntensity || 0.1),
            flash:  effects.includes('flash')  && Math.random() < (p.flashIntensity  || 0.02),
            glitch: effects.includes('glitch') && Math.random() < (p.glitchIntensity || 0.05),
            reverse: effects.includes("reverse"),
            shake:   effects.includes('shake'),
        };

        if (triggers.eclair) {
            this.world.triggerLightning();
        }

        if (triggers.flash) {
            let flashColorHex = 0xffffff; // Blanc par défaut

            if (p.color && Array.isArray(p.color)) {
                flashColorHex = p.color[Math.floor(Math.random() * p.color.length)];
            } else if (p.color) {
                flashColorHex = p.color;
            }

            this.world.triggerScreenFlash(flashColorHex);
        }

        if (triggers.glitch) {
            document.body.style.filter = `hue-rotate(${Math.random() * 360}deg) brightness(1.2) contrast(1.5)`;

            setTimeout(() => {
                document.body.style.filter = 'none';
            }, 80);
        }

        const targetRotation = triggers.reverse ? Math.PI : 0;
        const rotationSpeed = 0.25;
        this.cameraRotation += (targetRotation - this.cameraRotation) * rotationSpeed * delta;
        this.camera.rotation.z = this.cameraRotation;

        const rotationDiff = Math.abs(targetRotation - this.cameraRotation);
        const currentlyRotating = Math.abs(targetRotation - this.cameraRotation) > 0.3;

        if (currentlyRotating !== this.isRotating) {
            this.isRotating = currentlyRotating;
            const eventName = this.isRotating ? 'uiRotationStart' : 'uiRotationEnd';
            window.dispatchEvent(new CustomEvent(eventName));
        }

        if (triggers.reverse !== this.isReversed) {
            const eventName = triggers.reverse ? 'effectReverseOn' : 'effectReverseOff';
            window.dispatchEvent(new CustomEvent(eventName, {detail: { phase: p.label }}));
            this.isReversed = triggers.reverse;
        }

        // GESTION DE LA COULEUR AMBIANTE
        let targetColorHex;
        if (Array.isArray(p.color)) {
            // Si c'est un tableau, on alterne toutes les 0.5 secondes (ajustable)
            this.colorTimer += delta;
            if (this.colorTimer > 0.5) {
                this.colorTimer = 0;
                this.colorIndex = (this.colorIndex + 1) % p.color.length;
            }
            targetColorHex = p.color[this.colorIndex];
        } else {
            targetColorHex = p.color;
        }
        const targetColor = new THREE.Color(targetColorHex);

        // INTERPOLATION DOUCE (Lerp)
        this.currentParams.color.lerp(targetColor, 2 * delta);
        this.currentParams.speed += (p.speed - this.currentParams.speed) * 0.05;
        this.currentParams.waveHeight += (p.waveHeight - this.currentParams.waveHeight) * 0.05;
        this.currentParams.curveStrength += (p.curveStrength - this.currentParams.curveStrength) * 0.05;
        this.currentParams.rollStrength += (p.rollStrength - this.currentParams.rollStrength) * 0.05;
        this.currentParams.gridOpacity += ((p.gridOpacity !== undefined ? p.gridOpacity : 1) - this.currentParams.gridOpacity) * 0.05;

        // MISE A JOUR DE LA VITESSE TOTALE (avec bonus)
        const baseSpeed = this.currentParams.speed;
        const multiplier = this.activeBonus.speedMultiplier;

        if (multiplier > 1) {
            this.currentTotalSpeed = baseSpeed * multiplier;
            this.bonusVelocity = this.currentTotalSpeed - baseSpeed;
        } else {
            if (this.bonusVelocity > 0) {
                const friction = 0.2 * delta;
                this.bonusVelocity += (0 - this.bonusVelocity) * friction;
                if (this.bonusVelocity < 0.1) this.bonusVelocity = 0;
            }
            this.currentTotalSpeed = baseSpeed + this.bonusVelocity;
        }

        this.zOffset += this.currentTotalSpeed * delta * 50;

        // ETAT GLOBAL
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

        // MISE A JOUR DES ELEMENTS DE LA SCENE
        this.world.update(state, proj);
        this.road.update(state, proj);
        this.entities.update(state, proj);
        this.player.update(state, proj);

        // GESTION DES OBSTACLES
        this.handleSpawning(delta);
        this.handleCollisions();
    }

    updatePhase(t) {
        const ph = this.songPhases.find(p => t >= p.start && t <= p.end);
        if (ph && ph !== this.currentPhase) this.currentPhase = ph;
    }

    handleSpawning(dt) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            const safeLane = Math.floor(Math.random() * 3) - 1;

            // ON PASSE LA PROJECTION ICI
            const projFunc = (z) => this.getProjection(z);
            this.entities.spawnWallPattern(safeLane, projFunc, this.isGateInTransit);

            this.spawnTimer = 1 / (this.currentPhase.density * 10);
        }
    }

    handleCollisions() {
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
            if (this.isGateInTransit) {
                this.needSpeedReset = true;
            } else {
                this.activeBonus.speedMultiplier = 1;
                this.needSpeedReset = false;
            }
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
