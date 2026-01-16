import * as THREE from 'three';
import { Wall } from './Wall.js';

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
