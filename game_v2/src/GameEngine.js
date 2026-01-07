import * as THREE from 'three';
import { World } from './World.js';
import { Road } from './Road.js';
import { Gate } from './Gate.js';
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
        this.spawnTimer = 0;
        this.isPaused = true;
        this.currentPhase = songPhases[0];
        this.currentParams = { speed: 1, waveHeight: 0, curveStrength: 0, color: new THREE.Color(0x00ffff), gridOpacity: 0.5 };

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
            color: new THREE.Color(0x00ffff),
            gridOpacity: 0.5
        };

        this.currentTotalSpeed = this.currentParams.speed;

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

        this.gates = [];
        this.lastPhaseName = "";
        this.isGateInTransit = false;
        this.needSpeedReset = false;

        window.addEventListener('gameStarted', () => {
            console.log("gameStarted event received");
            this.onStart();
        });
    }

    getProjection(z) {
        const wz = z - this.zOffset;
        const x = Math.sin(wz * 0.02 + this.time * 0.5) * this.currentParams.curveStrength;
        const y = Math.sin(this.time * 2 + wz * 0.1) * this.currentParams.waveHeight;
        return { x, y };
    }

    update(currentTime, delta) {
        if (this.isPaused) return;

        this.time = currentTime;

        // this.updatePhase(currentTime);
        const musicStatus = this.music.update();
        this.currentPhase = musicStatus.phase;

        this.background.update(this.currentPhase, 0.8);

        const p = this.currentPhase;

        if (this.activeBonus.timeLeft > 0) {
            this.activeBonus.timeLeft -= delta;
            if (this.activeBonus.timeLeft <= 0) {
                this.onBonusStop(this.activeBonus.item);
                this.activeBonus.timeLeft = 0;
            }
        }

        // 1. GESTION DE LA COULEUR CIBLE
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

        // 2. INTERPOLATION DOUCE (Lerp)
        // On transitionne la couleur actuelle vers la cible (vitesse 2 * delta)
        this.currentParams.color.lerp(targetColor, 2 * delta);

        // 3. LERP DES AUTRES PARAMÈTRES
        this.currentParams.speed += (p.speed - this.currentParams.speed) * 0.05;
        this.currentParams.waveHeight += (p.waveHeight - this.currentParams.waveHeight) * 0.05;
        this.currentParams.curveStrength += (p.curveStrength - this.currentParams.curveStrength) * 0.05;
        this.currentParams.gridOpacity += ((p.gridOpacity !== undefined ? p.gridOpacity : 0.5) - this.currentParams.gridOpacity) * 0.05;

        this.currentTotalSpeed = this.currentParams.speed * this.activeBonus.speedMultiplier;
        this.zOffset += this.currentTotalSpeed * delta * 50;

        const state = {time: this.time, delta, speed: this.currentTotalSpeed * 50, phase: p, params: this.currentParams, activeBonus: this.activeBonus };
        const proj = (z) => this.getProjection(z);

        /*
        const spawnZ = -500;
        const phaseToSpawn = this.music.getNextPhaseSoon(
            this.currentParams.speed,
            spawnZ,
            delta
        );

        if (phaseToSpawn && !this.isGateInTransit && phaseToSpawn.label !== this.lastPhaseName) {
            const gate = new Gate(this.scene, phaseToSpawn.label, targetColor);
            gate.z = spawnZ;
            this.gates.push(gate);
            this.lastPhaseName = phaseToSpawn.label;
        }
        this.isGateInTransit = this.gates.length > 0;
        */

        this.world.update(state, proj);
        this.road.update(state, proj);
        this.entities.update(state, proj);
        this.player.update(state, proj);

        this.gates = this.gates.filter(gate => {
            gate.update(this.currentParams.speed, delta, (z) => this.getProjection(z), (passedGate) => {
                console.log("Passage de la porte :", passedGate.label);
                if (this.needSpeedReset) {
                    this.activeBonus.speedMultiplier = 1;
                    this.needSpeedReset = false;
                }
            });
            return gate.active;
        });

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
                    const isInvincible = (this.activeBonus.item && this.activeBonus.item.subType === "invincible" && this.activeBonus.timeLeft > 0) ||
                             (DEV_MODE && this.devSettings.isInvincible);

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
