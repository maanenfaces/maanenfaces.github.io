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

    updatePosition(speed, delta, getProjection) {
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
                color: 0xff0000,
                transparent: true,
                opacity: 0.7
            })
        );

        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        this.line = new THREE.LineSegments(
            edgesGeometry,
            new THREE.LineBasicMaterial({ color: 0xff0000, opacity: 0.8 })
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
            this.innerMesh.material.color.setHex(0xff0000);
        }
    }
}

export class FallingWall extends Wall {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'falling_wall';

        // 1. VITESSE ALÉATOIRE PAR OBJET
        // Cycle entre 0.8s (très rapide) et 1.4s (rapide)
        // Cela permet de voir le mur tomber plusieurs fois pendant son approche
        this.fallCycleDuration = 0.8 + Math.random() * 0.6;

        // 2. TIMING ALÉATOIRE AU DÉPART
        // On commence à un point aléatoire du cycle pour éviter que tous les murs ne tombent en même temps
        this.internalTimer = Math.random() * this.fallCycleDuration;

        this.glitchPalette = [0x00ccff, 0x0044ff, 0xff6600, 0xffaa00, 0xffffff];

        if (this.innerMesh) {
            this.innerMesh.material = this.innerMesh.material.clone();
            this.innerMesh.material.color.setHex(0x00ff88);

            if (this.innerMesh.children[0]) {
                this.innerMesh.children[0].material = this.innerMesh.children[0].material.clone();
                this.innerMesh.children[0].material.color.setHex(0x55ff00);
            }
        }
    }

    updatePosition(speed, delta, getProjection) {
        // Le mouvement tourne en boucle dès le début
        this.internalTimer += delta;

        const progress = (this.internalTimer % this.fallCycleDuration) / this.fallCycleDuration;

        // Paramètres de chute
        const fallThreshold = 0.25; // 25% du temps pour tomber, 75% pour remonter
        const maxFallDistance = 6.0;
        let yOffset = 0;

        if (progress < fallThreshold) {
            // CHUTE ÉLECTRIQUE
            // Utilisation d'une puissance plus élevée (cube) pour un effet de "poids" encore plus marqué
            const fallProgress = progress / fallThreshold;
            yOffset = Math.pow(fallProgress, 3) * maxFallDistance;
        } else {
            // REMONTÉE NERVEUSE
            const riseProgress = (progress - fallThreshold) / (1 - fallThreshold);
            yOffset = maxFallDistance * (1 - riseProgress);
        }

        // Positionnement (Abaissé selon ta demande précédente)
        const initialHeight = 7.6;
        this.innerMesh.position.y = initialHeight - yOffset;

        // Mise à jour de la position Z (mouvement vers le joueur)
        super.updatePosition(speed, delta, getProjection);
    }

    // On s'assure que l'animation de glitch utilise bien les couleurs uniques
    animate(time, intensity = 1.0) {
        const glitchBurst = Math.sin(time * 2.5 + this.pulseOffset) * Math.sin(time * 0.8);

        if (glitchBurst > 0.5) {
            const randomColor = this.glitchPalette[Math.floor(Math.random() * this.glitchPalette.length)];
            this.innerMesh.material.color.setHex(randomColor);

            this.innerMesh.position.x = (Math.sin(time * 70) * 0.15 + (Math.random() - 0.5) * 0.1) * intensity;
        } else {
            this.innerMesh.position.x *= 0.7;
            // Retour au vert émeraude propre à cette instance
            this.innerMesh.material.color.setHex(0x00ff88);
        }
    }
}

export class MovingWall extends Wall {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);

        this.type = 'wall';
        this.moveSpeed = 1.0;
        this.internalTimer = Math.random() * Math.PI * 2;
        this.amplitude = 1.0;

        if (Math.random() > 0.5) {
            this.moveSpeed *= -1;
        }

        // Visuel Violet
        const geometry = new THREE.BoxGeometry(4, 3, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x8A2BE2,
            transparent: true,
            opacity: 0.8
        });

        const m = new THREE.Mesh(geometry, material);
        m.position.y = 1.8;

        const edges = new THREE.EdgesGeometry(geometry);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xff00ff })
        );
        m.add(line);
        this.mesh.add(m);
    }

    // On utilise exactement le même nom et les mêmes arguments que dans Entity
    updatePosition(speed, delta, getProjection) {
        // 1. On calcule le mouvement latéral AVANT tout le reste
        this.internalTimer += delta * this.moveSpeed;
        this.lane = Math.sin(this.internalTimer) * this.amplitude;

        // 2. On appelle la logique de la classe parente (super)
        // pour qu'elle fasse le rendu 3D avec notre nouvelle "this.lane"
        super.updatePosition(speed, delta, getProjection);
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
        const p = state.phase;
        const selectedBonus = this.getRandomEntity(p.bonuses.distribution, 'PointBonus');

        if (selectedBonus) {
            // On place le bonus dans la safeLane pour garantir qu'il n'est pas DANS un mur
            this.add(this.createBonus(safeLane, -250, getProjection, selectedBonus));
        }
    }

    spawnWallPattern(state, safeLane, getProjection) {
        const p = state.phase;
        // On pioche le type d'entité selon la distribution de la phase
        const selected = this.getRandomEntity(p.obstacles.distribution, 'Wall');

        if (selected === 'MovingWall') {
            // Le MovingWall oscille sur toute la largeur
            this.add(new MovingWall(0, -250, getProjection));
        }
        else if (selected === 'FallingWall') {
            // Le FallingWall occupe une voie précise, mais on respecte la safeLane
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);
            // On en place un seul car il est plus dangereux (mouvement vertical)
            const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            this.add(new FallingWall(lane, -250, getProjection));
        }
        else {
            // Cas par défaut : Murs statiques (Wall)
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);

            // On décide d'en mettre 1 ou 2 pour laisser au moins une voie libre
            const numberOfWalls = Math.random() < 0.5 ? 1 : 2;
            const selectedLanes = availableLanes
                .sort(() => Math.random() - 0.5)
                .slice(0, numberOfWalls);

            selectedLanes.forEach(lane => {
                this.add(new Wall(lane, -250, getProjection));
            });
        }
    }

    add(ent) {
        this.scene.add(ent.mesh);
        this.entities.push(ent);
    }

    removeEntity(ent) {
        ent.isActive = false;
        ent.mesh.visible = false; // Désactivation visuelle IMMÉDIATE

        // On utilise setTimeout pour laisser une frame de battement avant le retrait physique
        // Cela évite que le moteur essaie de rendre un objet qui n'existe plus
        setTimeout(() => {
            this.scene.remove(ent.mesh);
            // Nettoyage de la géométrie pour libérer la mémoire (optionnel mais propre)
            ent.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }, 0);

        this.entities = this.entities.filter(e => e !== ent);
    }

    update(state, getProjection) {
        this.entities.forEach(ent => {
            ent.updatePosition(state.speed, state.delta, getProjection);
            if(ent.animate) ent.animate(state.time);
            if(ent.z > 20) this.removeEntity(ent);
        });
    }
}
