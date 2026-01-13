import * as THREE from 'three';

class Entity {
    constructor(lane, z, getProjection) {
        this.mesh = new THREE.Group();
        this.lane = lane;
        this.z = z;
        this.isActive = true;
        this.initialized = false; // Flag pour éviter le premier rendu au centre

        this.laneWidth = window.innerWidth < 500 ? 4 : 6;

        // On force la position immédiatement si la fonction est fournie
        if (getProjection) {
            const proj = getProjection(this.z);
            this.mesh.position.set(proj.x + (this.lane * this.laneWidth), proj.y, this.z);
            this.initialized = true;
        } else {
            this.mesh.visible = false; // Caché par défaut
        }
    }

    updatePosition(speed, delta, getProjection, allEntities = []) {
        this.z += speed * delta;
        const laneX = this.lane * this.laneWidth;

        // On récupère les données de projection
        const proj = getProjection(this.z, laneX);

        // 1. Positionnement (déjà fait)
        this.mesh.position.set(proj.x + laneX, proj.y, this.z);

        // 2. INCLINAISON (Le nouveau code)
        // On applique l'angle de roulis à la rotation Z de l'objet
        // Note: On met souvent un signe "-" car si le sol penche à droite,
        // l'objet doit pivoter dans le sens des aiguilles d'une montre.
        this.mesh.rotation.z = proj.rollAngle;

        if (!this.initialized) {
            this.mesh.visible = true;
            this.initialized = true;
        }
    }
}

export class Wall extends Entity {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'wall';
        this.color = 0xff0000;

        this.glitchPalette = [
            0xaa0044, // Bordeaux/Rose sombre
            0xff2211, // Rouge vif
            0xff5500, // Orange
            0x880000, // Rouge sang sombre
            0x004400  // Flash blanc (rare mais percutant)
        ];

        this.pulseOffset = Math.random() * Math.PI * 2;

        const geometry = new THREE.BoxGeometry(4, 3, 1);

        this.innerMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 0.7
            })
        );

        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        this.line = new THREE.LineSegments(
            edgesGeometry,
            new THREE.LineBasicMaterial({ color: this.color, opacity: 0.8 })
        );

        this.innerMesh.add(this.line);

        this.innerMesh.position.y = 1.7;
        this.mesh.add(this.innerMesh);
    }

    animate(time, intensity = 1.0) {
        // 1. OPACITÉ ALÉATOIRE (Désynchronisée)
        // On mélange deux ondes lentes pour casser la régularité du pulse
        const slowPulse = Math.sin(time * 3 + this.pulseOffset);
        const microPulse = Math.sin(time * 11);
        this.innerMesh.material.opacity = 0.7 + (slowPulse * 0.1) + (microPulse * 0.05);

        // 2. GLITCH LATÉRAL INTERMITTENT
        const glitchBurst = Math.sin(time * 2.5 + this.pulseOffset) * Math.sin(time * 0.8);

        if (glitchBurst > 0.5) {
            // --- PHYSIQUE DU GLITCH ---
            const shakeX = Math.sin(time * 70) * (0.15 * intensity);
            const jumpX = (Math.random() - 0.5) * (0.1 * intensity);
            this.innerMesh.position.x = shakeX + jumpX;

            // On pioche une couleur au hasard dans la liste
            const randomColor = this.glitchPalette[Math.floor(Math.random() * this.glitchPalette.length)];
            this.innerMesh.material.color.setHex(randomColor);

        } else {
            // --- RETOUR À LA NORMALE ---
            this.innerMesh.position.x *= 0.7;
            if (Math.abs(this.innerMesh.position.x) < 0.001) {
                this.innerMesh.position.x = 0;
            }

            // Retour à la couleur rouge d'origine
            this.innerMesh.material.color.setHex(this.color);
        }
    }
}

export class FallingWall extends Wall {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'falling_wall';
        this.color = 0x00ff88;

        this.fallCycleDuration = 0.8 + Math.random() * 0.6;
        this.internalTimer = Math.random() * this.fallCycleDuration;
        this.glitchPalette = [
            0x00ff88, // Couleur de base (rappel)
            0x55ff00, // Vert fluo
            0x00ffff, // Cyan électrique (très proche du bleu mais harmonieux)
            0x004400,
            0xff6600, // Orange vif (couleur complémentaire pour un effet de "crash" visuel)
            0x004422  // Vert très sombre (micro-coupure)
        ];

        // --- Setup Traînée ---
        this.trails = [];
        this.trailSpawnTimer = 0;
        this.trailFrequency = 0.03;
        this.trailGeometry = new THREE.BoxGeometry(4, 3, 1);
        this.trailBaseMaterial = new THREE.MeshBasicMaterial({
            color: 0xaaff88,
            transparent: true,
            opacity: 0.4
        });

        if (this.innerMesh) {
            this.innerMesh.material = this.innerMesh.material.clone();
            this.innerMesh.material.color.setHex(this.color);
            if (this.innerMesh.children[0]) {
                this.innerMesh.children[0].material = this.innerMesh.children[0].material.clone();
                this.innerMesh.children[0].material.color.setHex(this.color);
            }
        }
    }

    spawnTrail(currentY) {
        const trailMesh = new THREE.Mesh(this.trailGeometry, this.trailBaseMaterial.clone());

        // Point d'ancrage : face supérieure du mur (Y + 1.5 car le mur fait 3 de haut)
        const anchorY = currentY + 1.5;
        const spawnZ = this.mesh.position.z + 0.5; // Calé sur l'arrière

        trailMesh.position.set(this.mesh.position.x, anchorY, spawnZ);
        this.mesh.parent.add(trailMesh);

        this.trails.push({
            mesh: trailMesh,
            life: 1.0,
            startY: anchorY,
            z: spawnZ
        });
    }

    updatePosition(speed, delta, getProjection, allEntities = []) {
        this.internalTimer += delta;
        const progress = (this.internalTimer % this.fallCycleDuration) / this.fallCycleDuration;
        const fallThreshold = 0.25;
        const maxFallDistance = 6.0;
        let yOffset = 0;

        if (progress < fallThreshold) {
            yOffset = Math.pow(progress / fallThreshold, 3) * maxFallDistance;
        } else {
            yOffset = maxFallDistance * (1 - (progress - fallThreshold) / (1 - fallThreshold));
        }

        const initialHeight = 7.6;
        const newY = initialHeight - yOffset;

        // Avant de mettre à jour le mesh, on mémorise l'ancienne face haute pour l'étirement
        const topFlankY = newY + 1.5;

        this.innerMesh.position.y = newY;
        super.updatePosition(speed, delta, getProjection, allEntities);

        // Gestion Traînée
        this.trailSpawnTimer += delta;
        if (this.trailSpawnTimer >= this.trailFrequency) {
            this.spawnTrail(newY);
            this.trailSpawnTimer = 0;
        }

        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= delta * 4.0; // Disparition rapide pour l'effet de vitesse

            if (t.life <= 0) {
                this.mesh.parent.remove(t.mesh);
                t.mesh.material.dispose();
                this.trails.splice(i, 1);
            } else {
                t.z += speed * delta;

                // ÉTIREMENT VERTICAL
                // On étire entre le point où le segment est né et la position actuelle du haut du mur
                const deltaY = topFlankY - t.startY;

                t.mesh.position.y = t.startY + (deltaY / 2);
                t.mesh.position.z = t.z;
                t.mesh.position.x = this.mesh.position.x;

                // Scale Y : distance divisée par la hauteur initiale (3)
                t.mesh.scale.y = Math.max(0.01, Math.abs(deltaY) / 3);
                t.mesh.scale.x = 1.0;
                t.mesh.scale.z = 1.0;

                t.mesh.material.opacity = t.life * 0.3;
            }
        }
    }

    dispose() {
        this.trails.forEach(t => {
            if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
            t.mesh.material.dispose();
        });
        this.trails = [];
        this.trailGeometry.dispose();
        this.trailBaseMaterial.dispose();
    }
}

export class MovingWall extends Wall {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);

        this.type = 'wall';
        this.color = 0xFFA000; // Orange Ambre

        // --- Paramètres de mouvement avec variation aléatoire ---
        // Vitesse entre 1.2 et 1.8 (moyenne 1.5)
        this.moveSpeed = 1.2 + Math.random() * 0.6;
        // Amplitude entre 1.0 et 1.4 (moyenne 1.2)
        this.amplitude = 1.0 + Math.random() * 0.4;

        this.internalTimer = Math.random() * Math.PI * 2;

        this.glitchPalette = [
            0xffcc00, // Orange-Jaune clair
            0xffaa00, // Ambre
            0xffff00, // Jaune pur
            0x663300, // Marron chaud
            0x004400
        ];

        // Direction de départ aléatoire
        if (Math.random() > 0.5) this.moveSpeed *= -1;

        // --- Configuration de la Traînée ---
        this.trails = [];
        this.trailSpawnTimer = 0;
        this.trailFrequency = 0.04;

        this.trailGeometry = new THREE.BoxGeometry(4, 3, 1);

        this.trailBaseMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd300,
            transparent: true,
            opacity: 0.3
        });

        // Setup du mur principal
        if (this.innerMesh) {
            this.innerMesh.material = new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 0.75
            });
            this.innerMesh.position.y = 1.8;

            if (this.innerMesh.children[0]) {
                this.innerMesh.children[0].material = this.innerMesh.children[0].material.clone();
                this.innerMesh.children[0].material.color.setHex(this.color);
            }
        }
    }

    spawnTrail() {
        const trailMesh = new THREE.Mesh(this.trailGeometry, this.trailBaseMaterial.clone());

        // Calcul du flanc opposé au mouvement
        const direction = Math.sign(this.moveSpeed * Math.cos(this.internalTimer));
        const anchorOffset = -direction * 2;
        const spawnX = this.mesh.position.x + anchorOffset;

        // Position Z : Calée sur la face arrière du mur (Z du mur + 0.5)
        const spawnZ = this.mesh.position.z - 1;

        trailMesh.position.set(spawnX, 1.8, spawnZ);
        this.mesh.parent.add(trailMesh);

        this.trails.push({
            mesh: trailMesh,
            life: 1.0,
            startX: spawnX,
            z: spawnZ
        });
    }

    updatePosition(speed, delta, getProjection, allEntities = []) {
        // Logique de mouvement latéral
        this.internalTimer += delta * this.moveSpeed;
        this.lane = Math.sin(this.internalTimer) * this.amplitude;

        // Mise à jour parente (Z et projection route)
        super.updatePosition(speed, delta, getProjection, allEntities);

        const direction = Math.sign(this.moveSpeed * Math.cos(this.internalTimer));
        const anchorOffset = -direction * 2;
        const currentFlankX = this.mesh.position.x + anchorOffset;

        // Gestion du spawn des traînées
        this.trailSpawnTimer += delta;
        if (this.trailSpawnTimer >= this.trailFrequency) {
            this.spawnTrail();
            this.trailSpawnTimer = 0;
        }

        // Mise à jour et nettoyage des traînées
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= delta * 3.0; // Vitesse de dissipation

            if (t.life <= 0) {
                this.mesh.parent.remove(t.mesh);
                t.mesh.material.dispose();
                this.trails.splice(i, 1);
            } else {
                // Progression Z synchronisée avec le défilement du jeu
                t.z += speed * delta;

                // Étirement latéral dynamique
                const deltaX = currentFlankX - t.startX;
                t.mesh.position.x = t.startX + (deltaX / 2);
                t.mesh.position.z = t.z;

                t.mesh.scale.x = Math.max(0.01, Math.abs(deltaX) / 4);
                t.mesh.scale.z = 1.0;
                t.mesh.scale.y = 1.0;

                // Application de la courbure de la route
                const p = getProjection(t.z);
                t.mesh.position.y = p.y + 1.8;
                t.mesh.material.opacity = t.life * 0.4;
            }
        }
    }

    animate(time, intensity = 1.0) {
        const glitchBurst = Math.sin(time * 2.5 + (this.pulseOffset || 0)) * Math.sin(time * 0.8);

        if (glitchBurst > 0.5) {
            const randomColor = this.glitchPalette[Math.floor(Math.random() * this.glitchPalette.length)];
            this.innerMesh.material.color.setHex(randomColor);
            this.innerMesh.position.x = (Math.sin(time * 70) * 0.15) * intensity;
        } else {
            this.innerMesh.position.x *= 0.7;
            // Retour à la couleur Orange définie dans le constructor
            this.innerMesh.material.color.setHex(this.color);
        }
    }

    dispose() {
        this.trails.forEach(t => {
            if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
            t.mesh.material.dispose();
        });
        this.trails = [];
        this.trailGeometry.dispose();
        this.trailBaseMaterial.dispose();
    }
}

export class ChasingWall extends Wall {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'chasing_wall';
        this.color = 0x00BFFF; // Bleu électrique

        this.LANE_WIDTH = 6; // Largeur confirmée

        // Vitesse additionnelle pour remonter le trafic
        this.flySpeed = 65.0 + Math.random() * 20.0;

        this.targetLane = lane;
        this.lane = lane;

        this.glitchPalette = [0x00BFFF, 0x00ffff, 0x0044ff, 0xffffff];

        // Configuration Traînée
        this.trails = [];
        this.trailSpawnTimer = 0;
        this.trailFrequency = 0.025;

        this.trailGeometry = new THREE.BoxGeometry(3.5, 0.2, 1); // Très plat au sol
        this.trailBaseMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5
        });

        if (this.innerMesh) {
            this.innerMesh.material = new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 0.8
            });
            this.innerMesh.position.y = 1.8;

            if (this.innerMesh.children[0]) {
                this.innerMesh.children[0].material = this.innerMesh.children[0].material.clone();
                this.innerMesh.children[0].material.color.setHex(this.color);
            }
        }
    }

    updatePosition(speed, delta, getProjection, allEntities = []) {
        // 1. IA D'ÉVITEMENT ET DE NAVIGATION
        // On ne recalcule une décision que si on est stabilisé sur une voie
        const isStationaryOnLane = Math.abs(this.lane - this.targetLane) < 0.1;

        if (allEntities && isStationaryOnLane && !this.isDead) {
            const obstacleAhead = allEntities.find(e => {
                if (e === this || !e.isActive) return false;

                // On ignore les Bonus (on peut passer à travers/dessus)
                // et les FallingWall (ils tombent, on ne les évite pas latéralement ici)
                const isObstacle = e.type !== 'bonus' && e.type !== 'falling_wall' && e.type !== 'moving_wall';
                if (!isObstacle) return false;

                // Déterminer la voie de l'autre entité (priorité à son intention de mouvement)
                const otherLane = (e.targetLane !== undefined) ? e.targetLane : Math.round(e.lane);

                return otherLane === this.targetLane &&
                       e.mesh.position.z > this.mesh.position.z &&
                       e.mesh.position.z < this.mesh.position.z + 45;
            });

            if (obstacleAhead) {
                const possibleLanes = [-1, 0, 1].filter(l => l !== this.targetLane);

                const safeLanes = possibleLanes.filter(laneCandidate => {
                    return !allEntities.some(e => {
                        if (e === this || !e.isActive || e.type === 'bonus') return false;

                        const otherLane = (e.targetLane !== undefined) ? e.targetLane : Math.round(e.lane);
                        return otherLane === laneCandidate &&
                               Math.abs(e.mesh.position.z - this.mesh.position.z) < 35;
                    });
                });

                if (safeLanes.length > 0) {
                    // On choisit la voie la plus proche pour éviter les grands sauts brusques
                    this.targetLane = safeLanes.sort((a, b) => Math.abs(a - this.lane) - Math.abs(b - this.lane))[0];
                } else {
                    // Si tout est bouché, on tente une voie au hasard pour ne pas rester bloqué derrière
                    this.targetLane = possibleLanes[Math.floor(Math.random() * possibleLanes.length)];
                }
            }
        }

        // 2. TRANSITION DE LANE (Interpolation fluide)
        // On augmente un peu la vitesse de transition pour que l'évitement soit efficace
        const transitionSpeed = 8.0;
        this.lane += (this.targetLane - this.lane) * delta * transitionSpeed;

        // 3. AVANCE RAPIDE Z
        this.mesh.position.z += (speed + this.flySpeed) * delta;

        // 4. RÉCUPÉRATION DE LA PROJECTION
        const projection = getProjection(this.mesh.position.z);
        if (!projection) return;
        const roll = projection.rollAngle || 0;

        // 5. POSITIONNEMENT AVEC ROLL
        const laneOffset = this.lane * this.LANE_WIDTH;
        this.mesh.position.x = projection.x + Math.cos(roll) * laneOffset;
        this.mesh.position.y = projection.y + Math.sin(roll) * laneOffset;
        this.mesh.rotation.z = roll;

        // 6. GESTION DES TRAÎNÉES
        this.trailSpawnTimer += delta;
        if (this.trailSpawnTimer >= this.trailFrequency) {
            this.spawnTrail(roll);
            this.trailSpawnTimer = 0;
        }

        this.updateTrails(speed, delta, getProjection);
    }

    spawnTrail(roll) {
        const trailMesh = new THREE.Mesh(this.trailGeometry, this.trailBaseMaterial.clone());

        // Position et rotation initiales
        trailMesh.position.copy(this.mesh.position);
        trailMesh.rotation.z = roll;

        this.mesh.parent.add(trailMesh);

        this.trails.push({
            mesh: trailMesh,
            life: 1.0,
            z: this.mesh.position.z,
            laneAtSpawn: this.lane
        });
    }

    updateTrails(speed, delta, getProjection) {
        for (let i = this.trails.length - 1; i >= 0; i--) {
            const t = this.trails[i];
            t.life -= delta * 2.5;

            if (t.life <= 0) {
                this.mesh.parent.remove(t.mesh);
                t.mesh.material.dispose();
                this.trails.splice(i, 1);
            } else {
                // Recul avec le décor
                t.z += speed * delta;

                // Recalcul de la projection pour chaque segment de traînée
                const p = getProjection(t.z);
                const r = p.rollAngle || 0;
                const offset = t.laneAtSpawn * this.LANE_WIDTH;

                t.mesh.position.z = t.z;
                t.mesh.position.x = p.x + Math.cos(r) * offset;
                t.mesh.position.y = p.y + Math.sin(r) * offset;
                t.mesh.rotation.z = r;

                t.mesh.material.opacity = t.life * 0.4;
                t.mesh.scale.x = t.life;
            }
        }
    }

    animate(time, intensity = 1.0) {
        const glitchBurst = Math.sin(time * 2.5) * Math.sin(time * 0.8);
        if (glitchBurst > 0.5) {
            this.innerMesh.material.color.setHex(this.glitchPalette[Math.floor(Math.random() * this.glitchPalette.length)]);
        } else {
            this.innerMesh.material.color.setHex(this.color);
        }
    }

    dispose() {
        this.trails.forEach(t => {
            if (t.mesh.parent) t.mesh.parent.remove(t.mesh);
            t.mesh.material.dispose();
        });
        this.trails = [];
        this.trailGeometry.dispose();
        this.trailBaseMaterial.dispose();
    }
}

export class Bonus extends Entity {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'bonus';
        this.subType = 'base';
        this.initialY = 1.5;
        this.bonusMesh = null;
        this.bonusDuration = 7;
    }

    createTextLabel(text, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Augmenter la résolution pour la lisibilité au loin
        canvas.width = 512;
        canvas.height = 256;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Style du texte - On ajoute un contour (stroke) pour la lisibilité au loin
        ctx.font = 'Bold 90px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Contour noir pour détacher le texte du fond brillant du jeu
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'black';
        ctx.strokeText(text.toUpperCase(), 256, 128);

        // Remplissage couleur
        ctx.fillStyle = color;
        ctx.fillText(text.toUpperCase(), 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // Évite le flou au loin

        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.5,
            depthWrite: false,
            depthTest: true
        });

        const sprite = new THREE.Sprite(spriteMat);
        sprite.renderOrder = 999;
        spriteMat.transparent = true;
        sprite.position.set(0, 5, 0);
        sprite.scale.set(5, 2.5, 1);

        return sprite;
    }

    // Méthode d'initialisation commune pour les enfants
    initMesh(geometry, material, initialY) {
        this.initialY = initialY;
        this.bonusMesh = new THREE.Mesh(geometry, material);
        this.bonusMesh.position.y = this.initialY;
        this.mesh.add(this.bonusMesh);
    }

    // Par défaut, l'animation est vide ou générique
    animate(time) {
        if (!this.bonusMesh) return;
        const t = time || Date.now() * 0.002;

        // Flottaison commune à tous les bonus
        this.bonusMesh.position.y = this.initialY + Math.sin(t * 3) * 0.3;

        // On laisse l'enfant gérer sa propre rotation/spécificité
        this.applyCustomAnimation(t);
    }

    applyCustomAnimation(t) {}
}

export class JumpBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'jump';
        this.name = "jump";
        this.color = 0xffff00;
        this.colorHex = '#ffff00';

        const geo = new THREE.OctahedronGeometry(1);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: false });

        this.initMesh(geo, mat, 1.5);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        this.bonusMesh.rotation.y += 0.05;
    }
}

export class SpeedBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'speed';
        this.name = "speed";
        this.color = 0x00ffff;
        this.colorHex = '#00ffff';

        const geo = new THREE.ConeGeometry(0.8, 1.8, 4);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: true });

        this.initMesh(geo, mat, 1.5);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        // Rotation toupie rapide
        this.bonusMesh.rotation.y += 0.15;
    }
}

export class InvincibleBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'invincible';
        this.name = "GHOST";
        this.color = 0xff00ff;
        this.colorHex = '#ff00ff';

        const geo = new THREE.IcosahedronGeometry(1.2, 0);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: true });

        this.initMesh(geo, mat, 1.8);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        // Rotation complexe sur deux axes
        this.bonusMesh.rotation.x += 0.02;
        this.bonusMesh.rotation.z += 0.03;
    }
}

export class PointBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'points';
        this.name = "50 PTS";
        this.color = 0xffffff;
        this.colorHex = '#ffffff';
        this.bonusDuration = 0;

        const geo = new THREE.IcosahedronGeometry(1, 0);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: false });

        // On garde l'échelle à 2 comme tu l'as mis
        this.initMesh(geo, mat, 2);
        this.bonusMesh.position.y = 1.5;

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        this.bonusMesh.rotation.y += 0.03;
        // On modifie l'animation pour qu'elle oscille AUTOUR de sa nouvelle hauteur (1.5)
        // Au lieu de osciller autour de 0
        this.bonusMesh.position.y = 1.5 + Math.sin(t * 5) * 0.2;
    }
}

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
    }

    createBonus(lane, z, getProjection, type) {
        switch(type) {
            case 'jump':
            case 'JumpBonus':
                return new JumpBonus(lane, z, getProjection);
            case 'speed':
            case 'SpeedBonus':
                return new SpeedBonus(lane, z, getProjection);
            case 'invincible':
            case 'GhostBonus':
            case 'InvincibleBonus':
                return new InvincibleBonus(lane, z, getProjection);
            case 'point':
            case 'PointBonus':
                return new PointBonus(lane, z, getProjection);
            default:
                return new Bonus(lane, z, getProjection);
        }
    }

    getRandomEntity(distribution, fallbackType) {
        if (!Array.isArray(distribution) || distribution.length === 0) return fallbackType;

        // 1. Calculer la somme totale des pourcentages/poids
        const totalWeight = distribution.reduce((sum, item) => sum + Number(item.percent), 0);

        // 2. Tirer un nombre entre 0 et le total réel (ex: 105)
        const roll = Math.random() * totalWeight;

        let cumulative = 0;
        for (const item of distribution) {
            cumulative += Number(item.percent);

            // 3. Vérifier si le tirage tombe dans cette tranche
            if (roll <= cumulative) {
                return item.entity;
            }
        }

        return fallbackType;
    }

    spawnBonusPattern(state, safeLane, getProjection) {
        const currentDistance = state.zOffset;

        // Les bonus apparaissent dans les "creux" (quand on a fait au moins 40% du chemin vers le prochain mur)
        const distanceSinceLast = currentDistance - state.lastSpawnDistance;
        const threshold = state.nextSpawnThreshold || 60;

        // On place le bonus idéalement au milieu de l'espace vide entre deux vagues de murs
        if (distanceSinceLast < threshold * 0.4 || distanceSinceLast > threshold * 0.6) {
            return;
        }

        const p = state.phase;
        const selectedBonus = this.getRandomEntity(p.bonuses.distribution, 'PointBonus');
        if (selectedBonus) {
            this.add(this.createBonus(safeLane, -250, getProjection, selectedBonus));
            // On ne réinitialise pas le threshold ici, sinon on décalerait les murs.
            // On marque juste que le bonus est pris pour éviter d'en spawn 50 à la suite.
            state.lastSpawnDistance = currentDistance;
        }
    }

    spawnWallPattern(state, safeLane, getProjection) {
        const p = state.phase;
        const spawnAtZ = -350;
        const currentDistance = state.zOffset || 0;

        // --- SÉCURITÉ 1 : COOLDOWN PERSISTANT ---
        // On utilise "this" au lieu de "state" pour être sûr que les données restent
        if (this.lastSpawnDistance === undefined) {
            this.lastSpawnDistance = currentDistance;
        }

        if (this.nextSpawnThreshold === undefined) {
            this.nextSpawnThreshold = 20 + Math.random() * 40;
        }

        // On vérifie l'écart parcouru
        const distanceTraveledSinceLastSpawn = currentDistance - this.lastSpawnDistance;

        if (distanceTraveledSinceLastSpawn < this.nextSpawnThreshold) {
            return; // Pas encore assez de distance parcourue
        }

        // --- LOGIQUE DE SÉLECTION ---
        const selected = this.getRandomEntity(p.obstacles.distribution, 'Wall');

        if (selected === 'MovingWall') {
            this.add(new MovingWall(0, spawnAtZ, getProjection));
        }
        else if (selected === 'FallingWall') {
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);
            const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            this.add(new FallingWall(lane, spawnAtZ, getProjection));
        }
        else if (selected === 'ChasingWall') {
            this.add(new ChasingWall(Math.floor(Math.random() * 3) - 1, spawnAtZ - 50, getProjection));
        }
        else {
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);
            const numberOfWalls = Math.random() < 0.6 ? 1 : 2;
            const selectedLanes = availableLanes.sort(() => Math.random() - 0.5).slice(0, numberOfWalls);

            selectedLanes.forEach(lane => {
                this.add(new Wall(lane, spawnAtZ, getProjection));
            });
        }

        // --- RÉINITIALISATION ---
        this.lastSpawnDistance = currentDistance;
        this.nextSpawnThreshold = 20 + Math.random() * 40;
    }

    add(ent) {
        this.scene.add(ent.mesh);
        this.entities.push(ent);
    }

    removeEntity(ent) {
        ent.isActive = false;
        ent.mesh.visible = false; // Désactivation visuelle IMMÉDIATE

        if (ent.dispose) ent.dispose();

        // On utilise setTimeout pour laisser une frame de battement avant le retrait physique
        // Cela évite que le moteur essaie de rendre un objet qui n'existe plus
        setTimeout(() => {
            this.scene.remove(ent.mesh);
            // Nettoyage de la géométrie pour libérer la mémoire (optionnel mais propre)
            ent.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }, 0);

        this.entities = this.entities.filter(e => e !== ent);
    }

    update(state, getProjection) {
        this.entities.forEach(ent => {
            ent.updatePosition(state.speed, state.delta, getProjection, this.entities);
            if(ent.animate) ent.animate(state.time);
            if(ent.z > 20) this.removeEntity(ent);
        });
    }
}
