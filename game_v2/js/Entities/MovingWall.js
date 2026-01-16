import * as THREE from 'three';
import { Wall } from './Wall.js';

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
