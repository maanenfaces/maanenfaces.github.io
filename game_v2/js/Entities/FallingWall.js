import * as THREE from 'three';
import { Wall } from './Wall.js';

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
