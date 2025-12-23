import * as THREE from 'three';
import { DREAMLO_PUBLIC, DREAMLO_PRIVATE, DEV_MODE, CHARACTERS } from './Config.js';
import { Selenite, Square } from './Entities.js';

export class Screen {
    constructor(app) { this.app = app; }
    enter() {}
    exit() {}
    update(delta, time) {}
    onKeyDown(e) {}
    onTouchEnd(e) {}
}

export class MenuScreen extends Screen {
    constructor(app) {
        super(app);
        this.menuIdx = 0;
        this.cards = document.querySelectorAll('.char-card');
        this.input = document.getElementById('player-name-input');

        this.cards.forEach((c, i) => {
            c.onclick = () => {
                this.menuIdx = i;
                this.updateSelection();
            }
        });
    }

    enter() {
        if (DEV_MODE) {
            console.log("DEV MODE: Skipping Menu");
            this.input.value = "DEV_PILOT";
            this.menuIdx = 0;
        }

        document.getElementById('selection-screen').classList.remove('hidden');
        document.querySelectorAll('.ui-panel').forEach(el => el.style.display = 'none');
        this.fetchHighScores();
        this.updateSelection();
        setTimeout(() => this.input.focus(), 100);
    }

    exit() {
        document.getElementById('selection-screen').classList.add('hidden');
    }

    updateSelection() {
        this.cards.forEach((c, i) => c.classList.toggle('selected', i === this.menuIdx));
        //this.app.playerColor = parseInt(this.cards[this.menuIdx].dataset.color);
        this.app.characterConfig = CHARACTERS[this.menuIdx];
    }

    onKeyDown(e) {
        const isInputFocused = (document.activeElement === this.input);
        if (isInputFocused) {
            if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'Tab') {
                this.input.blur();
                if (e.key === 'Enter') this.startGame();
            }
        } else {
            if (e.key === 'ArrowLeft') { this.menuIdx = (this.menuIdx - 1 + 4) % 4; this.updateSelection(); }
            if (e.key === 'ArrowRight') { this.menuIdx = (this.menuIdx + 1) % 4; this.updateSelection(); }
            if (e.key === 'Enter') this.startGame();
        }
    }

    startGame() {
        const name = this.input.value.trim();
        if (!name) {
            this.input.classList.add('input-error');
            setTimeout(() => this.input.classList.remove('input-error'), 500);
            this.input.focus();
            return;
        }
        this.app.playerName = name;
        this.app.startGame();
    }

    fetchHighScores() {
        fetch(`http://dreamlo.com/lb/${DREAMLO_PUBLIC}/json`)
            .then(r => r.json())
            .then(data => {
                let scores = data.dreamlo.leaderboard.entry;
                if (!scores) scores = [];
                if (!Array.isArray(scores)) scores = [scores];
                scores.sort((a, b) => parseInt(b.score) - parseInt(a.score));
                const list = document.getElementById('score-list');
                list.innerHTML = scores.slice(0, 5).map(s =>
                    `<div class="score-entry"><span>${s.name}</span><span class="score-val">${s.score}</span></div>`
                ).join('');
            })
            .catch(() => document.getElementById('score-list').innerHTML = "Erreur connexion");
    }
}

export class GameScreen extends Screen {
    constructor(app) {
        super(app);
        this.score = 0;
        this.ammo = 0;
        this.isPaused = false;
        this.countdownVal = 3;
        this.countdownTimer = 0;
        this.state = "COUNTDOWN";
        this.currentLane = 0;
        this.isJumping = false;
        this.jumpGravity = 40;
        this.jumpVelocity = 0;
        this.playerJumpY = 0;

        this.isReversed = false;
        this.obstacles = [];
        this.projectiles = [];
        this.currentPhase = null;
        this.isDevMode = DEV_MODE;
        this.devInvincible = DEV_MODE;
        this.isDraggingSlider = false;

        this.invincibleTimer = 0;
        this.speedBonusTimer = 0;

        this.smoothParams = {
            speed: 0.7,
            density: 0.01,
            waveHeight: 0,
            curveStrength: 0,
            color: new THREE.Color(0x00ff00)
        };
        this.currentLaneX = 0;
    }

    enter() {
        document.querySelectorAll('.ui-panel').forEach(el => el.style.display = 'block');
        this.app.env.reset();

        this.app.env.camera.position.set(0, 4, 14);
        this.app.env.camera.lookAt(0, 0, -20);

        this.initDevTools();
        this.createPlayer();

        this.smoothParams.speed = 0.7;
        this.smoothParams.density = 0.01;
        this.smoothParams.waveHeight = 0;
        this.smoothParams.curveStrength = 0;
        this.smoothParams.color.setHex(0x00ff00);

        this.app.env.scene.fog.density = 0;
        this.app.music.play().then(() => {
            this.startCountdown();
            this.initDevTools();
        });
    }

    initDevTools() {
        const devPanel = document.getElementById('dev-tools');
        const devCheck = document.getElementById('dev-invincible');
        const devSlider = document.getElementById('dev-slider');

        if (devPanel) {
            devPanel.style.display = this.isDevMode ? 'block' : 'none';

            if (devCheck) {
                this.devInvincible = devCheck.checked;
                const newCheck = devCheck.cloneNode(true);
                devCheck.parentNode.replaceChild(newCheck, devCheck);

                newCheck.addEventListener('change', (e) => {
                    this.devInvincible = e.target.checked;
                    this.app.env.renderer.domElement.focus();
                });
                this.devInvincible = newCheck.checked;
            }

            if (devSlider) {
                const newSlider = devSlider.cloneNode(true);
                devSlider.parentNode.replaceChild(newSlider, devSlider);

                newSlider.addEventListener('input', (e) => {
                    this.app.music.audio.currentTime = parseFloat(e.target.value);
                });
                newSlider.addEventListener('mousedown', () => this.isDraggingSlider = true);
                newSlider.addEventListener('mouseup', () => {
                    this.isDraggingSlider = false;
                    this.app.env.renderer.domElement.focus();
                });
            }
        }
    }

    createPlayer() {
        const toRemove = [];
        this.app.env.scene.traverse((obj) => {
            if (obj.userData.isPlayer) {
                toRemove.push(obj);
            }
        });
        toRemove.forEach(obj => this.app.env.scene.remove(obj));
        this.player = null;

        const config = this.app.characterConfig || CHARACTERS[0];

        if (config.type === 'Selenite') {
            this.player = new Selenite(config.color);
        } else {
            this.player = new Square(config.color);
        }

        this.player.position.set(0, 0, 3);
        this.app.env.scene.add(this.player);
    }

    startCountdown() {
        const cdEl = document.getElementById('countdown');
        cdEl.style.display = 'block';
        cdEl.innerText = this.countdownVal;
        this.app.music.playBeep(400);
        this.countdownTimer = 0;
    }

    update(delta, time) {
        if (this.isPaused) return;

        if (this.state === "COUNTDOWN") {
            this.countdownTimer += delta;
            if (this.countdownTimer >= 1.0) {
                this.countdownVal--;
                this.countdownTimer = 0;
                if (this.countdownVal > 0) {
                    document.getElementById('countdown').innerText = this.countdownVal;
                    this.app.music.playBeep(400 + (3-this.countdownVal)*100);
                } else {
                    this.state = "PLAYING";
                    document.getElementById('countdown').style.display = 'none';
                    this.app.music.playBeep(800);
                }
            }
            this.app.env.update(delta, 8, {effects:[], color:0x00ff00, density: 0.03, noBonus: true}, time);
            return;
        }

        const musicState = this.app.music.update();
        if (musicState.ended) {
            this.app.showEnd("WIN", this.score);
            return;
        }

        // Gestion des Timers Bonus
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= delta;
            this.player.visible = Math.floor(time * 20) % 2 === 0;
        } else {
            this.player.visible = true;
        }

        if (this.speedBonusTimer > 0) {
            this.speedBonusTimer -= delta;
        }

        const phase = musicState.phase;
        this.currentPhase = phase;

        // Lissage des paramètres
        const lerpSpeed = 2.0 * delta;
        this.smoothParams.speed += (phase.speed - this.smoothParams.speed) * lerpSpeed;
        this.smoothParams.density += (phase.density - this.smoothParams.density) * lerpSpeed;
        this.smoothParams.waveHeight += (phase.waveHeight - this.smoothParams.waveHeight) * lerpSpeed;
        this.smoothParams.curveStrength += (phase.curveStrength - this.smoothParams.curveStrength) * lerpSpeed;

        const targetColor = new THREE.Color(phase.color);
        this.smoothParams.color.lerp(targetColor, lerpSpeed);

        const renderPhase = {
            ...phase,
            speed: this.smoothParams.speed,
            density: this.smoothParams.density,
            waveHeight: this.smoothParams.waveHeight,
            curveStrength: this.smoothParams.curveStrength,
            color: this.smoothParams.color.getHex()
        };

        // Calcul de la vitesse avec Bonus
        let baseSpeed = 20 * renderPhase.speed;
        if (this.speedBonusTimer > 0) {
            baseSpeed *= 1.5; // 50% plus vite
            // Effet visuel de vitesse (FOV ou Shake léger)
            this.app.env.camera.fov = 70;
        } else {
            this.app.env.camera.fov = 60;
        }
        this.app.env.camera.updateProjectionMatrix();

        this.currentSpeed = baseSpeed;
        this.isReversed = phase.effects.includes("reverse");

        let targetDensity = 0;
        if (phase.effects.includes("fog")) {
            targetDensity = (phase.fogDensity !== undefined) ? phase.fogDensity : 0.02;
        }
        this.app.env.scene.fog.density += (targetDensity - this.app.env.scene.fog.density) * 0.01;

        document.getElementById('score').innerText = Math.floor(this.score);

        const curTime = this.app.music.audio.currentTime;
        const m = Math.floor(curTime / 60);
        const s = Math.floor(curTime % 60).toString().padStart(2, '0');
        const timeStr = `${m}:${s}`;

        const timeEl = document.getElementById('time-display');
        if (timeEl) timeEl.innerText = timeStr;

        if (!this.isDraggingSlider) {
            const devSlider = document.getElementById('dev-slider');
            const devTimeVal = document.getElementById('dev-time-val');
            if (devSlider) {
                if (devSlider.max != this.app.music.audio.duration) devSlider.max = this.app.music.audio.duration || 100;
                devSlider.value = curTime;
            }
            if (devTimeVal) devTimeVal.innerText = Math.floor(curTime).toString().padStart(3, '0');
        }

        document.getElementById('ammo-count').innerText = this.ammo;
        document.getElementById('song-part').innerText = phase.label;

        this.score += baseSpeed * delta * 0.1;

        this.app.env.update(delta, baseSpeed, renderPhase, time);

        this.app.env.roadSegments.forEach(seg => {
            if (seg.userData.needsContent) {
                this.populateSegment(seg, this.app.music.audio.currentTime);
                seg.userData.needsContent = false;
            }
        });

        this.updatePlayer(delta, baseSpeed);
        this.updateEntities(delta);
    }

    populateSegment(group, songTime) {
        // Legacy / Fallback si Environment.js ne remplit pas
        const isWarpTime = false;
        const isHoleTime = false;

        if (isWarpTime && Math.random() < 0.1) {
            const warp = new THREE.Mesh(new THREE.TorusGeometry(2, 0.2, 16, 100), new THREE.MeshBasicMaterial({color: 0x00ffff}));
            warp.position.set(0, 2, 0);
            group.add(warp);
            warp.userData.isWarp = true;
        } else if (isHoleTime) {
            group.userData.isHole = true;
            const ground = group.children.find(c => c.geometry.type === 'PlaneGeometry' && c.position.y === 0.02);
            if(ground) ground.visible = false;
        }
    }

    addObstacleToGroup(group, x) {
        // Legacy
    }

    addBonusToGroup(group, x) {
        // Legacy
    }

    updatePlayer(delta, speed) {
        // 1. Mouvement Latéral
        const curveX = Math.sin((0 + this.app.env.zOffset) * 0.02) * this.app.env.curveFactor;
        const targetLaneX = this.currentLane * 5;
        this.currentLaneX += (targetLaneX - this.currentLaneX) * 10 * delta;

        // 2. Gestion du Saut (Physique locale)
        if (this.isJumping) {
            this.playerJumpY += this.jumpVelocity * delta;
            this.jumpVelocity -= this.jumpGravity * delta;

            if (this.playerJumpY <= 0) {
                this.playerJumpY = 0;
                this.isJumping = false;
                this.jumpVelocity = 0;
            }
        } else {
            this.playerJumpY = 0;
        }

        // 3. Positionnement final (Suivi du terrain)
        // On cherche le segment sous le joueur (Z=3)
        const playerZ = 3;
        const segmentUnderPlayer = this.app.env.roadSegments.find(s => Math.abs(s.position.z - playerZ) < 5);

        let groundHeight = 0;
        if (segmentUnderPlayer) {
            groundHeight = segmentUnderPlayer.position.y;
        }

        this.player.position.x = this.currentLaneX + curveX;
        this.player.position.y = groundHeight + this.playerJumpY; // Le joueur suit la vague + son saut

        // Animation
        const time = this.app.music.audio.currentTime;
        if (this.player.update) this.player.update(time, this.isJumping);

        // Caméra
        let shake = 0;
        if (this.currentPhase && this.currentPhase.effects.includes("shake")) shake = 0.5;
        this.app.env.camera.position.x += (this.player.position.x * 0.3 - this.app.env.camera.position.x) * 2 * delta + (Math.random()-0.5)*shake;
        this.app.env.camera.lookAt(this.player.position.x * 0.5, 0, -20);

        // 4. Collisions
        if (segmentUnderPlayer) {
            const playerWorldPos = new THREE.Vector3();
            this.player.getWorldPosition(playerWorldPos);

            // On utilise une boite englobante simple pour le joueur
            const pBox = new THREE.Box3().setFromCenterAndSize(playerWorldPos, new THREE.Vector3(0.8, 1.0, 0.8));

            segmentUnderPlayer.children.forEach(obj => {
                if (!obj.visible) return;
                if (!obj.userData.isObstacle && !obj.userData.isBonus) return;

                const objWorldPos = new THREE.Vector3();
                obj.getWorldPosition(objWorldPos);

                // Distance simple en X et Z (on ignore Y pour l'instant pour détecter la colonne)
                const dx = Math.abs(playerWorldPos.x - objWorldPos.x);
                const dz = Math.abs(playerWorldPos.z - objWorldPos.z);

                if (dx < 1.0 && dz < 1.0) {
                    // COLLISION DÉTECTÉE

                    if (obj.userData.isBonus) {
                        this.collectBonus(obj);
                    }
                    else if (obj.userData.isObstacle) {
                        const isFalling = this.jumpVelocity < 0;
                        const isAbove = playerWorldPos.y > objWorldPos.y + 0.5;

                        // Bonus Invincible actif
                        if (this.invincibleTimer > 0) {
                            this.createExplosion(objWorldPos);
                            obj.visible = false;
                        }
                        // Logique STOMP (Écrasement)
                        // Si le joueur tombe (vitesse négative) et qu'il est au-dessus de l'obstacle
                        // On considère qu'il est au dessus si ses pieds sont plus haut que le centre de l'obstacle
                        else if (isFalling && isAbove) {
                            this.jumpVelocity = 15; // Rebondir
                            this.isJumping = true;
                            this.createExplosion(objWorldPos);
                            obj.visible = false;
                            this.score += 50;
                        }
                        // Dev mode = Invincible
                        else if (this.devInvincible) {
                            obj.visible = false;
                        }
                        // Otherwise, game over
                        else {
                            this.gameOver();
                        }
                    }
                }
            });
        }
    }

    collectBonus(bonus) {
        bonus.visible = false;
        if (bonus.userData.bonusType === 'ammo') {
            this.ammo += 5;
            this.app.music.playBeep(800);
        } else if (bonus.userData.bonusType === 'invincible') {
            this.invincibleTimer = 20;
            this.app.music.playBeep(1200);
        } else if (bonus.userData.bonusType === 'speed') {
            this.speedBonusTimer = 20;
            this.app.music.playBeep(1500);
        }
    }

    createExplosion(pos) {
        // Petit effet visuel simple (particules jaunes)
        const count = 5;
        for(let i=0; i<count; i++) {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.2,0.2), new THREE.MeshBasicMaterial({color:0xffaa00}));
            mesh.position.copy(pos);
            mesh.position.x += (Math.random()-0.5);
            mesh.position.y += (Math.random()-0.5);
            this.app.env.scene.add(mesh);

            // Animation simple "fire and forget"
            const dir = new THREE.Vector3(Math.random()-0.5, Math.random(), Math.random()-0.5).normalize();
            const speed = 5 + Math.random() * 5;

            const animate = () => {
                mesh.position.addScaledVector(dir, speed * 0.016);
                mesh.rotation.x += 0.1;
                mesh.scale.multiplyScalar(0.9);
                if(mesh.scale.x < 0.01) {
                    this.app.env.scene.remove(mesh);
                } else {
                    requestAnimationFrame(animate);
                }
            };
            animate();
        }
    }

    updateEntities(delta) {
        const toRemove = [];
        const projWorldPos = new THREE.Vector3();
        const obsWorldPos = new THREE.Vector3();

        this.projectiles.forEach(p => {
            p.position.z -= 60 * delta;
            if (p.position.z < -100) {
                toRemove.push(p);
                return;
            }

            p.getWorldPosition(projWorldPos);

            // Collision Projectile vs Obstacles
            // On parcourt les segments proches
            for (const seg of this.app.env.roadSegments) {
                if (Math.abs(seg.position.z - p.position.z) > 10) continue;

                for (const obj of seg.children) {
                    if (obj.visible && obj.userData.isObstacle) {
                        obj.getWorldPosition(obsWorldPos);

                        // Distance 3D
                        if (projWorldPos.distanceTo(obsWorldPos) < 1.5) {
                            // BOOM
                            this.createExplosion(obsWorldPos);
                            obj.visible = false;
                            toRemove.push(p);
                            this.score += 10;
                            return; // Un projectile ne tue qu'un obstacle
                        }
                    }
                }
            }
        });

        toRemove.forEach(p => {
            this.app.env.scene.remove(p);
            const idx = this.projectiles.indexOf(p);
            if (idx > -1) this.projectiles.splice(idx, 1);
        });
    }

    gameOver() {
        this.app.showEnd("GAMEOVER", this.score);
    }

    onKeyDown(e) {
        if (e.key === 'Escape') { this.togglePause(); return; }
        if (this.isPaused) return;
        if (this.state === "COUNTDOWN") return;

        const leftKey = this.isReversed ? 'ArrowRight' : 'ArrowLeft';
        const rightKey = this.isReversed ? 'ArrowLeft' : 'ArrowRight';
        const jumpKey = this.isReversed ? 'ArrowDown' : 'ArrowUp';
        const dropKey = this.isReversed ? 'ArrowUp' : 'ArrowDown';

        if (e.key === leftKey && this.currentLane > -1) this.currentLane--;
        if (e.key === rightKey && this.currentLane < 1) this.currentLane++;

        if (e.key === jumpKey && !this.isJumping) {
            this.isJumping = true;
            this.jumpVelocity = 16;
            this.jumpGravity = 30;
        }

        if (e.key === dropKey && this.isJumping) {
            this.jumpVelocity = -20;
        }

        if (e.key === ' ' && this.ammo > 0) this.fire();
    }

    fire() {
        this.ammo--;
        const p = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({color: 0xffff00}));
        p.position.copy(this.player.position);
        this.app.env.scene.add(p);
        this.projectiles.push(p);
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const pauseScreen = document.getElementById('pause-screen');
        if (this.isPaused) {
            pauseScreen.classList.remove('hidden');
            this.app.music.audio.pause();
        } else {
            pauseScreen.classList.add('hidden');
            this.app.music.audio.play();
        }
    }

    exit() {
        this.app.env.scene.remove(this.playerGroup);
        this.projectiles.forEach(p => this.app.env.scene.remove(p));
        const devPanel = document.getElementById('dev-tools');
        if (devPanel) devPanel.style.display = 'none';
    }
}

export class EndScreen extends Screen {
    constructor(app, type, score) {
        super(app);
        this.type = type;
        this.score = Math.floor(score);
    }

    enter() {
        this.app.music.stop();
        const screenId = this.type === "WIN" ? 'win-screen' : 'gameover-screen';
        const scoreId = this.type === "WIN" ? 'win-score' : 'final-score';
        document.getElementById(screenId).classList.remove('hidden');
        document.getElementById(scoreId).innerText = this.score;
        this.saveScore();
    }

    exit() {
        document.getElementById('win-screen').classList.add('hidden');
        document.getElementById('gameover-screen').classList.add('hidden');
    }

    onKeyDown(e) {
        if (e.key === 'Enter') this.app.startGame();
        else if (e.key === 'Escape') this.app.showMenu();
    }

    saveScore() {
        const safeName = this.app.playerName.replace(/[^a-zA-Z0-9]/g, '').substring(0,10) || "Unknown";
        fetch(`http://dreamlo.com/lb/${DREAMLO_PRIVATE}/add/${safeName}/${this.score}`);
    }
}
