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
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(4, 3, 1),
            new THREE.MeshBasicMaterial({color: 0xff0000, transparent: true, opacity: 0.7})
        );
        m.position.y = 1.5;
        this.mesh.add(m);
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

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
    }

    createBonus(lane, z, getProjection, type) {
        switch(type) {
            case 'jump':
                return new JumpBonus(lane, z, getProjection);
            case 'speed':
                return new SpeedBonus(lane, z, getProjection);
            case 'invincible':
                return new InvincibleBonus(lane, z, getProjection);
            default:
                return new Bonus(lane, z, getProjection);
        }
    }

    spawnWallPattern(safeLane, getProjection, isNewPhaseComing = false) {
        // Spawn des murs
        [-1, 0, 1].forEach(l => {
            if(l !== safeLane) {
                this.add(new Wall(l, -250, getProjection));
            }
        });

        // Spawn d'un bonus aléatoire sur la voie libre
        if(Math.random() > 0.7) {
            let types = ['jump', 'invincible'];
            if (!isNewPhaseComing) types.push('speed');
            const randomType = types[Math.floor(Math.random() * types.length)];
            this.add(this.createBonus(safeLane, -250, getProjection, randomType));
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
            if(ent.animate) ent.animate();
            if(ent.z > 20) this.removeEntity(ent);
        });
    }
}
