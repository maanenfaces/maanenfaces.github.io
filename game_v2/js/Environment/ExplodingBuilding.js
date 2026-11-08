import * as THREE from 'three';
import { Building2 } from './Building2.js';

export class ExplodingBuilding extends Building2 {
    constructor(
        lane,
        z,
        getProjection,
        roadColor,
        minSpeed = 0.3, maxSpeed = 1,
        minDelay = 2.0, maxDelay = 7.0,
        minForce = 0.6, maxForce = 1.5,
        burnProbability = 0.5
    ) {
        const explosionSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);

        super(lane, z, getProjection, roadColor);
        this.type = 'exploding_building';

        this.explosionSpeed = explosionSpeed;
        this.explosionForce = minForce + Math.random() * (maxForce - minForce);

        const explosionDelay = minDelay + Math.random() * (maxDelay - minDelay);
        this.explosionDelay = explosionDelay;
        this.hasExploded = (explosionDelay <= 0);

        this.isBurning = Math.random() < burnProbability;

        // --- PALETTE INCANDESCENTE TRÈS LUMINEUSE & VARIÉE ---
        this.fireColorPrimary = new THREE.Color(0xee2200);   // Rouge ardent vif
        this.fireColorSecondary = new THREE.Color(0xee6600); // Orange intense
        this.glowColor = new THREE.Color(0xee4400);          // Étincelles ardentes

        // Tableau de teintes lumineuses et flamboyantes pour les étages
        this.vibrantMagmaColors = [
            new THREE.Color(0xdd1100), // Rouge pur éclatant
            new THREE.Color(0xdd5500), // Orange feu
            new THREE.Color(0xdd8800), // Orange doré / braise chaude
            new THREE.Color(0xbb0033), // Rouge carmin intense
            new THREE.Color(0xdd3333),  // Rouge clair peps
            new THREE.Color(0x000000),
            new THREE.Color(0x222222),
            new THREE.Color(0x333333)
        ];

        this.wireColor.set(this.isBurning ? 0xff4400 : roadColor || 0x00ff00);

        this.explodingFloors = [];
        this.explosionTimer = 0;
        this.age = 0;

        this._setupExplosionDynamics();
    }

    _setupExplosionDynamics() {
        const totalFloors = this.floors.length;

        this.floors.forEach((floor, index) => {
            const ratio = index / totalFloors;

            // Attribution d'une couleur aléatoire et distincte par étage/bloc
            floor.group.traverse(child => {
                if (child.isMesh && child.material && !(child.material.wireframe)) {
                    // Si en feu, on pioche au hasard une couleur lumineuse du tableau pour CHAQUE mesh.
                    // Sinon, un gris sombre / acier très structuré.
                    const chosenColor = this.isBurning
                        ? this.vibrantMagmaColors[Math.floor(Math.random() * this.vibrantMagmaColors.length)]
                        : new THREE.Color(0x1a1a1a);

                    child.material = new THREE.MeshBasicMaterial({
                        color: chosenColor,
                        transparent: true,
                        opacity: 0.95
                    });
                }
            });

            const angle = Math.random() * Math.PI * 2;
            const horizontalForce = (6 + Math.random() * 16) * this.explosionSpeed * this.explosionForce;
            const verticalForce = (10 + Math.random() * 14 + ratio * 8) * this.explosionSpeed * this.explosionForce;

            this.explodingFloors.push({
                group: floor.group,
                velocity: new THREE.Vector3(
                    Math.cos(angle) * horizontalForce,
                    verticalForce,
                    Math.sin(angle) * horizontalForce
                ),
                rotSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.25 * this.explosionSpeed,
                    (Math.random() - 0.5) * 0.25 * this.explosionSpeed,
                    (Math.random() - 0.5) * 0.25 * this.explosionSpeed
                ),
                initialY: floor.group.position.y
            });
        });

        if (this.isBurning) {
            const sparksCount = 60;
            const sparksGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(sparksCount * 3);
            this.sparkParticles = [];

            for (let i = 0; i < sparksCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = (4 + Math.random() * 10) * this.explosionSpeed * this.explosionForce;

                positions[i * 3] = 0;
                positions[i * 3 + 1] = 5;
                positions[i * 3 + 2] = 0;

                this.sparkParticles.push({
                    x: 0, y: 5, z: 0,
                    vx: Math.cos(angle) * speed,
                    vy: (Math.random() * 10 + 5) * this.explosionSpeed * this.explosionForce,
                    vz: Math.sin(angle) * speed,
                    life: 1.0,
                    decay: 0.012 + Math.random() * 0.02
                });
            }

            sparksGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const sparksMat = new THREE.PointsMaterial({
                color: this.glowColor,
                size: 1.2,
                transparent: true,
                opacity: 0.95
            });

            this.sparksMesh = new THREE.Points(sparksGeo, sparksMat);
            this.buildingGroup.add(this.sparksMesh);
            this.sparksMesh.visible = this.hasExploded;
        }
    }

    animate(time) {
        super.animate(time);
        if (!this.buildingGroup.visible) return;

        const delta = 0.016;
        this.age += delta;

        if (!this.isBurning) return;

        if (!this.hasExploded) {
            if (this.age >= this.explosionDelay) {
                this.hasExploded = true;
                if (this.sparksMesh) this.sparksMesh.visible = true;
            } else {
                return;
            }
        }

        this.explosionTimer += delta;

        // --- 1. PROJECTION DES ÉTAGES ---
        this.explodingFloors.forEach((item) => {
            item.group.position.x += item.velocity.x * delta;
            item.group.position.z += item.velocity.z * delta;

            item.group.position.y += item.velocity.y * delta;
            item.velocity.y -= 20.0 * delta;

            item.group.rotation.x += item.rotSpeed.x;
            item.group.rotation.y += item.rotSpeed.y;
            item.group.rotation.z += item.rotSpeed.z;

            item.velocity.x *= 0.992;
            item.velocity.z *= 0.992;
        });

        // --- 2. ANIMATION DES ÉTINCELLES ---
        if (this.sparksMesh && this.sparksMesh.visible) {
            const positions = this.sparksMesh.geometry.attributes.position.array;

            for (let i = 0; i < this.sparkParticles.length; i++) {
                let p = this.sparkParticles[i];

                p.x += p.vx * delta * 12;
                p.y += p.vy * delta * 12;
                p.z += p.vz * delta * 12;

                p.vy -= 14.0 * delta;
                p.life -= p.decay;

                if (p.life <= 0 || p.y < 0) {
                    p.x = (Math.random() - 0.5) * 3;
                    p.y = 5;
                    p.z = (Math.random() - 0.5) * 3;
                    p.vx = (Math.random() - 0.5) * 8;
                    p.vy = (Math.random() * 8 + 5) * this.explosionSpeed;
                    p.life = 1.0;
                }

                positions[i * 3] = p.x;
                positions[i * 3 + 1] = p.y;
                positions[i * 3 + 2] = p.z;
            }
            this.sparksMesh.geometry.attributes.position.needsUpdate = true;
        }

        // --- 3. ONDE DE CHOC ---
        if (this.explosionTimer < 1.0) {
            const shake = (1.0 - this.explosionTimer) * 1.5;
            this.buildingGroup.position.x = (Math.random() - 0.5) * shake;
            this.buildingGroup.position.z = (Math.random() - 0.5) * shake;
        } else {
            this.buildingGroup.position.x = 0;
            this.buildingGroup.position.z = 0;
        }
    }
}
