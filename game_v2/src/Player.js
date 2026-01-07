import * as THREE from 'three';

export class Player2 {
    constructor(scene) {
        this.scene = scene;
        this.currentLane = 0; this.currentX = 0; this.yOffset = 0;
        this.isJumping = false;
        this.canJump = false;
        this.jumpVel = 0;

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

        const proj = getProjection(3);
        this.mesh.position.set(proj.x + this.currentX, proj.y + this.yOffset + 0.6, 3);

        if (state.activeBonus.invincible > 0) {
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
    constructor(scene) {
        this.scene = scene;
        this.currentLane = 0;
        this.currentX = 0;
        this.yOffset = 0;
        this.isJumping = false;
        this.jumpVel = 0;

        // Configuration visuelle
        const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
        this.color = 0xff0000;
        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.5
        }));

        const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({color: this.color})
        );
        this.mesh.add(edges);
        this.scene.add(this.mesh);

        // --- Système de désintégration ---
        this.isDead = false;
        this.particles = null;
        this.particleData = []; // Stocke les vecteurs de direction
    }

    update(state, getProjection) {
        // Si mort, on met à jour uniquement les particules
        if (this.isDead) {
            this.updateParticles(state.delta);
            return;
        }

        // Mouvement latéral fluide
        const lerpSpeed = 20;
        this.currentX += (this.currentLane * 6 - this.currentX) * lerpSpeed * state.delta;

        // Logique du saut
        if (this.isJumping) {
            this.yOffset += this.jumpVel * state.delta;
            this.jumpVel -= 40 * state.delta;
            if (this.yOffset <= 0) {
                this.yOffset = 0;
                this.isJumping = false;
            }
        }

        // Positionnement 3D
        const proj = getProjection(3);
        this.mesh.position.set(proj.x + this.currentX, proj.y + this.yOffset + 1, 3);

        // Effet visuel d'invincibilité (Clignotement)
        if (state.activeBonus && state.activeBonus.item && state.activeBonus.item.subType === 'invincible') {
            this.mesh.visible = Math.floor(Date.now() / 100) % 2 === 0;
        } else {
            this.mesh.visible = true;
        }
    }

    move(dir) {
        if (this.isDead) return;
        this.currentLane = Math.max(-1, Math.min(1, this.currentLane + dir));
    }

    jump(activeBonus) {
        if (this.isDead) return;
        // Le saut n'est possible que si le bonus 'jump' est actif
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
        this.currentLane = 0;       // Retour à la voie centrale
        this.targetX = 0;           // Reset de la position cible
        this.isJumping = false;     // Annule le saut
        this.jumpTime = 0;          // Reset du chrono de saut
        this.canJump = false;       // Désactive le bonus de saut

        if (this.mesh) {
            this.mesh.visible = true;
            const proj = projectionFunction(3);
            this.mesh.position.set(proj.x + this.currentX, proj.y + this.yOffset + 1, 3);
        }
    }

}