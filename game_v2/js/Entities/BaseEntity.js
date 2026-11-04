import * as THREE from 'three';
import { LANE_WIDTH } from '../Config.js';

export class BaseEntity {
    constructor(lane, z, getProjection) {
        this.mesh = new THREE.Group();
        this.lane = lane;
        this.z = z;
        this.isActive = true;
        this.initialized = false; // Flag pour éviter le premier rendu au centre

        this.laneWidth = LANE_WIDTH;

        // Propriétés pour l'effet de désintégration (particules)
        this.isDead = false;
        this.particles = null;
        this.particleData = [];
        this.color = 0x00ff00; // Couleur par défaut (peut être surchargée par les sous-classes)

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
        // Si l'entité est en train d'exploser en particules, on met à jour l'animation et on stoppe le mouvement normal
        if (this.isDead) {
            this.updateParticles(delta);
            return;
        }

        this.z += speed * delta;
        const laneX = this.lane * this.laneWidth;

        // On récupère les données de projection
        const proj = getProjection(this.z, laneX);

        // 1. Positionnement
        this.mesh.position.set(proj.x + laneX, proj.y, this.z);

        // 2. INCLINAISON (Roulis)
        this.mesh.rotation.z = proj.rollAngle;

        if (!this.initialized) {
            this.mesh.visible = true;
            this.initialized = true;
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.isActive = false;
        this.mesh.visible = false;

        const scene = this.mesh.parent;
        if (!scene) return; // Sécurité si l'objet n'est rattaché à aucune scène

        const particleCount = 400; // Augmenté pour plus de densité
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        const baseColor = new THREE.Color(this.color);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = this.mesh.position.x;
            positions[i * 3 + 1] = this.mesh.position.y;
            positions[i * 3 + 2] = this.mesh.position.z;

            colors[i * 3] = baseColor.r;
            colors[i * 3 + 1] = baseColor.g;
            colors[i * 3 + 2] = baseColor.b;

            this.particleData.push({
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5) * 35, // Vélocité horizontale élargie
                    (Math.random() - 0.5) * 35, // Vélocité verticale élargie
                    (Math.random() - 0.5) * 35  // Vélocité en profondeur élargie
                ),
                friction: 0.90 + Math.random() * 0.05
            });
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.45, // GROSSE AUGMENTATION DE LA TAILLE (0.12 -> 0.45) pour les rendre bien visibles
            vertexColors: true,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending
        });

        this.particles = new THREE.Points(geometry, material);
        scene.add(this.particles);
    }

    updateParticles(delta) {
        if (!this.particles) return;

        const positions = this.particles.geometry.attributes.position.array;

        for (let i = 0; i < this.particleData.length; i++) {
            const data = this.particleData[i];

            positions[i * 3] += data.velocity.x * delta;
            positions[i * 3 + 1] += data.velocity.y * delta; // Correction du '+' en '+='
            positions[i * 3 + 2] += data.velocity.z * delta;

            data.velocity.multiplyScalar(data.friction);
        }

        this.particles.geometry.attributes.position.needsUpdate = true;
        this.particles.material.opacity -= delta * 2.2;

        if (this.particles.material.opacity <= 0) {
            const scene = this.particles.parent;
            if (scene) scene.remove(this.particles);
            this.particles.geometry.dispose();
            this.particles.material.dispose();
            this.particles = null;
        }
    }
}
