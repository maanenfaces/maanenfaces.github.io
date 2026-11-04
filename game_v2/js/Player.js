import * as THREE from 'three';

export class Player2 {
    constructor(scene) {
        this.scene = scene;
        this.currentLane = 0; this.currentX = 0; this.yOffset = 0;
        this.isJumping = false;
        this.canJump = false;
        this.jumpVel = 0;
        this.nextMove = 0;

        // --- Jauge de Super-Pouvoir ---
        this.energy = 0;
        this.maxEnergy = 100;
        this.energyFillRate = 4;
        this.isPowerReady = false;

        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.5}));
        this.mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({color: 0xff0000})));
        this.scene.add(this.mesh);
    }

    update(state, getProjection) {
        this.currentX += (this.currentLane * 6 - this.currentX) * 10 * state.delta;

        if (this.isJumping) {
            this.yOffset += this.jumpVel * state.delta;
            this.jumpVel -= 40 * state.delta;
            if (this.yOffset <= 0) { this.yOffset = 0; this.isJumping = false; }
        }

        if (this.energy < this.maxEnergy) {
            this.energy += this.energyFillRate * state.delta;
            if (this.energy >= this.maxEnergy) {
                this.energy = this.maxEnergy;
                this.isPowerReady = true;
            }
        }

        const proj = getProjection(3);
        this.mesh.position.set(proj.x + this.currentX, proj.y + this.yOffset + 0.6, 3);

        if (state.activeBonus && state.activeBonus.invincible > 0) {
            this.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
    }

    move(dir) {
        this.currentLane = Math.max(-1, Math.min(1, this.currentLane + dir));
    }

    jump() {
        if (this.canJump && !this.isJumping) {
            this.isJumping = true;
            this.jumpVel = 15;
        }
    }
}

export class Player {
    constructor(scene, selectedRole = 'guitar') {
        this.scene = scene;
        this.currentLane = 0;
        this.currentX = 0;
        this.yOffset = 0;
        this.isJumping = false;
        this.jumpVel = 0;
        this.nextMove = 0;
        this.selectedRole = selectedRole;

        // --- Jauge de Super-Pouvoir ---
        this.energy = 0;
        this.maxEnergy = 100;
        this.energyFillRate = 4;
        this.isPowerReady = false;

        // --- Configuration Visuelle : Cube 3D Texturé (Rôle unique sur toutes les faces) ---
        const size = 2;
        const geo = new THREE.BoxGeometry(size, size, size);
        this.color = 0xff0000;

        // Correspondance entre le rôle et l'image associée
        this.roleImages = {
            'guitar': '/game_v2/assets/img-guitar.jpg',
            'bass': '/game_v2/assets/img-bass.jpg',
            'synth': '/game_v2/assets/img-synths.jpg',
            'synths': '/game_v2/assets/img-synths.jpg',
            'drums': '/game_v2/assets/img-drums.jpg'
        };

        const imagePath = this.roleImages[this.selectedRole] || this.roleImages['guitar'];

        // Chargement de la texture unique pour le rôle sélectionné
        const textureLoader = new THREE.TextureLoader();
        const roleTexture = textureLoader.load(imagePath);

        // Application de la même texture sur les 6 faces du cube
        const materials = [];
        for (let i = 0; i < 6; i++) {
            materials.push(new THREE.MeshBasicMaterial({ map: roleTexture }));
        }

        this.mesh = new THREE.Mesh(geo, materials);

        // Ajout de contours néons subtils
        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: this.color, transparent: true, opacity: 0.6 })
        );
        this.mesh.add(edges);
        this.scene.add(this.mesh);

        // --- Système de désintégration ---
        this.isDead = false;
        this.particles = null;
        this.particleData = [];
    }

    // Méthode pour changer dynamiquement de rôle si le joueur le re-sélectionne
    setRole(role) {
        this.selectedRole = role;
        const imagePath = this.roleImages[this.selectedRole] || this.roleImages['guitar'];
        const textureLoader = new THREE.TextureLoader();
        const newTexture = textureLoader.load(imagePath);

        // Mise à jour de tous les matériaux du mesh
        if (Array.isArray(this.mesh.material)) {
            this.mesh.material.forEach(mat => {
                mat.map = newTexture;
                mat.needsUpdate = true;
            });
        }
    }

    update(state, getProjection) {
        if (this.isDead) {
            this.updateParticles(state.delta);
            return;
        }

        // Gestion des mouvements avec prise en compte de l'effet "reverse"
        if (this.nextMove !== 0) {
            const isReverse = state.phase.effects.reverse.enabled;
            const finalDir = isReverse ? -this.nextMove : this.nextMove;
            this.currentLane = Math.max(-1, Math.min(1, this.currentLane + finalDir));
            this.nextMove = 0;
        }

        // 1. Mouvement latéral fluide
        const lerpSpeed = 8;
        this.currentX += (this.currentLane * 6 - this.currentX) * lerpSpeed * state.delta;

        // 2. Logique du saut
        if (this.isJumping) {
            this.yOffset += this.jumpVel * state.delta;
            this.jumpVel -= 40 * state.delta;
            if (this.yOffset <= 0) {
                this.yOffset = 0;
                this.isJumping = false;
            }
        }

        // 2.1. Barre d'energie
        if (this.energy < this.maxEnergy) {
            this.energy += this.energyFillRate * state.delta;
            if (this.energy >= this.maxEnergy) {
                this.energy = this.maxEnergy;
                this.isPowerReady = true;
            }
        }

        // 3. Positionnement 3D
        const proj = getProjection(3, this.currentX);

        this.mesh.position.set(
            proj.x + this.currentX,
            proj.y + this.yOffset + 1,
            3
        );

        // 4. Inclinaison visuelle de la route (roulis) + Rotation droite sur l'axe vertical (Y) uniquement
        if (proj.rollAngle !== undefined) {
            this.mesh.rotation.z = proj.rollAngle;
        } else {
            this.mesh.rotation.z = 0;
        }

        this.mesh.rotation.x = 0;
        this.mesh.rotation.y += state.delta * 2.0;

        // 5. Effet d'invincibilité (clignotement)
        if (state.activeBonus && state.activeBonus.item && state.activeBonus.item.subType === 'invincible') {
            this.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
    }

    useSuperPower(state, entitiesManager) {
        /*
        if (this.isDead) return;

        if (!this.isPowerReady && this.energy < this.maxEnergy) {
            console.log("Super-pouvoir non disponible : énergie insuffisante !");
            return;
        }
         */

        console.log(`Activation du super-pouvoir pour le rôle : ${this.selectedRole}`);

        window.dispatchEvent(new CustomEvent('superPowerActivated', {
            detail: { role: this.selectedRole, color: this.color }
        }));

        // Logique pure de gameplay de chaque rôle
        switch (this.selectedRole) {
            case 'guitar':
                // OVERDRIVE : Détruit tous les murs situés à proximité immédiate
                if (entitiesManager && entitiesManager.entities) {
                  entitiesManager.entities.forEach(ent => {
                        if (ent.type === 'wall' && Math.abs(ent.mesh.position.z - this.mesh.position.z) < 100) {
                            ent.die();
                        }
                    });
                }
                break;

            case 'bass':
                // IMPULSION SISMIQUE : Ralentit temporairement la vitesse globale du jeu de moitié pendant 4 secondes
                if (state) {
                    state.tempSlowMoTimer = 4.0;
                }
                break;

            case 'synths':
            case 'synth':
                // PHASE SHIFT : Rend le joueur invincible / transparent pendant 4 secondes
                if (state) {
                    if (!state.activeBonus) state.activeBonus = {};
                    state.activeBonus.item = { subType: 'invincible', bonusDuration: 4 };
                    state.activeBonus.timeLeft = 4.0;
                }
                break;

            case 'drums':
                // ASPIRATION MAGNÉTIQUE : Attire tous les bonus sur la voie du joueur
                if (entitiesManager && entitiesManager.entities) {
                    entitiesManager.entities.forEach(ent => {
                        if (ent.type === 'bonus' || ent.type === 'pointBonus') {
                            ent.lane = this.currentLane;
                        }
                    });
                }
                break;
        }

        this.energy = 0;
        this.isPowerReady = false;
    }

    move(dir) {
        if (this.isDead) return;
        this.nextMove = dir;
    }

    jump(activeBonus) {
        if (this.isDead) return;
        const canJump = activeBonus && activeBonus.item && activeBonus.item.subType === 'jump';
        if (canJump && !this.isJumping) {
            this.isJumping = true;
            this.jumpVel = 15;
        }
    }

    fastFall() {
        if (this.isJumping && this.yOffset > 0) {
            // On donne une impulsion brutale vers le bas
            this.jumpVel = -30;
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.mesh.visible = false;

        const particleCount = 600; // Beaucoup plus de particules pour l'effet "WOW"
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const baseColor = new THREE.Color(this.color);

        for (let i = 0; i < particleCount; i++) {
            // Point de départ
            positions[i * 3] = this.mesh.position.x;
            positions[i * 3 + 1] = this.mesh.position.y;
            positions[i * 3 + 2] = this.mesh.position.z;

            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;

            // --- EXPLOSION PLUS FORTE ---
            this.particleData.push({
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 25, // Vitesse augmentée (était 15)
                    (Math.random() - 0.5) * 25,
                    (Math.random() - 0.5) * 25
                ),
                friction: 0.92 + Math.random() * 0.05 // Un peu plus de friction pour l'effet "souffle"
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.12, // Particules un peu plus fines car plus nombreuses
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    updateParticles(delta) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;

        for (let i = 0; i < this.particleData.length; i++) {
            const data = this.particleData[i];

            positions[i * 3] += data.velocity.x * delta;
            positions[i * 3 + 1] += data.velocity.y * delta;
            positions[i * 3 + 2] += data.velocity.z * delta;

            data.velocity.multiplyScalar(data.friction);
        }

        this.particles.geometry.attributes.position.needsUpdate = true;

        // --- DISPARITION PLUS RAPIDE ---
        // delta * 2.0 signifie que les particules disparaissent en 0.5 seconde environ
        this.particles.material.opacity -= delta * 2.2;

        if (this.particles.material.opacity <= 0) {
            this.scene.remove(this.particles);
            // Nettoyage mémoire
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
    }

    reset(projectionFunction) {
        this.isDead = false;
        this.currentLane = 0;
        this.currentX = 0;
        this.isJumping = false;
        this.jumpTime = 0;
        this.canJump = false;

        if (this.mesh) {
            this.mesh.visible = true;
            this.mesh.rotation.set(0, 0, 0);
            const proj = projectionFunction(3, 0);
            this.mesh.position.set(proj.x + this.currentX, proj.y + this.yOffset + 1, 3);
        }
    }
}
