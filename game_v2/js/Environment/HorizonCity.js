import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class HorizonCity extends BaseCityScapeElement {
    constructor(getProjection, duration = 120, roadColor = 0x00ff00) {
        super(0, 0, getProjection);
        this.type = 'horizon_city';

        this.duration = duration;
        this.age = 0;
        this.isActive = true;

        this.baseWireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);
        this.baseColor = 0x000000;

        // --- CONFIGURATION CENTRALISÉE DE TOUS LES SEUILS ---
        this.config = {
            numBuildings: 120,           // Densité riche
            centralCorridorWidth: 70,
            baseTotalWidth: 450,         // Largeur globale de la skyline

            // --- FEINTE INITIALE : Créés derrière le joueur (z > 0) ---
            initialSpawnMinZ: 600,
            initialSpawnMaxZ: 2500,

            // --- APPROCHE GLOBALE DOUCE ---
            citySpeedFactor: 0.03,

            // --- SEUILS D'APPROCHE ET D'ACCÉLÉRATION (EN SECONDES) ---
            approachStartTime: 30.0,     // Seuil : la ville commence à s'approcher
            approachRampDuration: 10.0,  // Durée de la transition "lent -> de plus en plus rapide"

            // Seuils de mouvement
            transitionZ: -300,
            extraApproachSpeed: 0.2,

            // --- PARAMÈTRES DE CROISSANCE (POUR LES RESPAWNS) ---
            emergenceDistance: 800,      // Distance de croissance fluide depuis le fond

            // Recyclage : lorsque l'immeuble dépasse le joueur (z > 100), on le replace juste derrière l'horizon
            recycleZ: 100,
            respawnMinZ: -300,           // Rapproché pour éviter le trou visuel au fond
            respawnMaxZ: -1000,          // Rapproché pour enchaîner directement avec la fin de la ville

            // Opacité proche uniquement
            fadeLimitNear: -10,
            baseOpacity: 0.5
        };

        // Position Z de départ de la ville entière
        this.currentCityZ = 0;

        this.cityGroup = new THREE.Group();
        this.mesh.add(this.cityGroup);

        this.buildingsData = [];
        this._generateHorizonSkyline();
    }

    _generateHorizonSkyline() {
        const { numBuildings, centralCorridorWidth, baseTotalWidth, initialSpawnMinZ, initialSpawnMaxZ } = this.config;

        for (let i = 0; i < numBuildings; i++) {
            const buildingGroup = new THREE.Group();

            let xPos = (i / (numBuildings - 1) - 0.5) * baseTotalWidth;
            if (xPos > -centralCorridorWidth / 2 && xPos < centralCorridorWidth / 2) {
                xPos += (xPos >= 0) ? (centralCorridorWidth / 2 + 15) : -(centralCorridorWidth / 2 + 15);
            }

            // FEINTE : Tous les immeubles naissent derrière le joueur au lancement (totalement invisibles / hors champ)
            const zPos = Math.random() * Math.abs(initialSpawnMaxZ - initialSpawnMinZ) + initialSpawnMinZ;
            buildingGroup.position.set(xPos, -16, zPos);
            this.cityGroup.add(buildingGroup);

            const targetHeight = 60 + Math.random() * 80;

            const bData = {
                group: buildingGroup,
                originalX: xPos,
                edgeMat: null,
                targetHeight: targetHeight,
                spawnZ: zPos // Référence initiale
            };

            this.buildingsData.push(bData);
            this._buildBuildingMesh(bData);
        }
    }

    _buildBuildingMesh(bData) {
        const group = bData.group;
        group.clear();

        const width = 8 + Math.random() * 10;
        const height = bData.targetHeight;
        const depth = 8 + Math.random() * 10;

        const geo = new THREE.BoxGeometry(width, height, depth);

        const mat = new THREE.MeshBasicMaterial({ color: this.baseColor });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = height / 2;
        group.add(mesh);

        const edgeMat = new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: this.config.baseOpacity });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        mesh.add(edges);

        bData.edgeMat = edgeMat;
    }

    updatePosition(speed, delta, getProjection) {
        this.age += delta;

        const timeLeft = Math.max(0, this.duration - this.age);
        const glitchOutDuration = 3.0;
        const isFinalGlitch = timeLeft <= glitchOutDuration && this.age < this.duration;

        const progress = Math.min(1.0, this.age / this.duration);

        if (progress >= 1.0 || this.buildingsData.length === 0) {
            this.isActive = false;
            this.mesh.visible = false;
            return;
        }

        const moveSpeed = speed * delta;

        // --- GESTION DE L'APPROCHE PROGRESSIVE (LENT -> RAPIDE) ---
        let cityAdvanceFactor = 0.0;
        if (this.age >= this.config.approachStartTime) {
            const timeSinceStart = this.age - this.config.approachStartTime;
            let rampProgress = THREE.MathUtils.clamp(timeSinceStart / this.config.approachRampDuration, 0.0, 1.0);
            cityAdvanceFactor = rampProgress * rampProgress;
        }

        const effectiveSpeed = moveSpeed * cityAdvanceFactor;

        // Approche globale douce
        this.currentCityZ += effectiveSpeed * this.config.citySpeedFactor;
        this.z = this.currentCityZ;

        const centralCorridorWidth = 70;
        const convergenceFactor = Math.max(0.3, 1.0 - progress * 0.4);

        const { transitionZ, extraApproachSpeed, emergenceDistance, recycleZ, respawnMinZ, respawnMaxZ, fadeLimitNear, baseOpacity, approachStartTime } = this.config;

        this.buildingsData.forEach(b => {
            const localZ = b.group.position.z;

            if (localZ < transitionZ) {
                b.group.position.z += effectiveSpeed + (effectiveSpeed * extraApproachSpeed);
            } else {
                b.group.position.z += effectiveSpeed;
            }

            // --- RECYCLAGE AU FOND ---
            if (b.group.position.z > recycleZ) {
                const newZ = respawnMinZ - Math.random() * Math.abs(respawnMaxZ - respawnMinZ);
                b.group.position.z = newZ;
                b.spawnZ = newZ; // Nouveau point de départ pour l'émergence
            }

            const updatedLocalZ = b.group.position.z;
            const worldZ = this.z + updatedLocalZ;

            // --- CALCUL DE L'ÉMERGENCE (TEMPS AU DÉBUT, PUIS DISTANCE) ---
            let emergenceFactor = 1.0;

            if (updatedLocalZ < 0) {
                if (this.age < approachStartTime) {
                    // Pendant les 30 premières secondes (quand la ville est figée), les immeubles sortent de terre progressivement grâce au temps
                    let timeProgress = THREE.MathUtils.clamp(this.age / approachStartTime, 0.0, 1.0);
                    emergenceFactor = Math.pow(timeProgress, 0.5);
                } else {
                    // Après 30 secondes, sortie de terre fluide basée sur la distance parcourue depuis leur spawn/respawn
                    const distanceTraveled = updatedLocalZ - b.spawnZ;
                    let linearFactor = THREE.MathUtils.clamp(distanceTraveled / emergenceDistance, 0.0, 1.0);
                    emergenceFactor = Math.max(Math.pow(1.0, 0.5), Math.pow(linearFactor, 0.4));
                }
            }

            b.group.scale.y = Math.max(0.01, emergenceFactor);

            let distanceOpacity = baseOpacity * emergenceFactor;
            if (updatedLocalZ > fadeLimitNear) {
                distanceOpacity = THREE.MathUtils.lerp(distanceOpacity, 0.0, (updatedLocalZ - fadeLimitNear) / (recycleZ - fadeLimitNear));
            }

            let targetX = b.originalX * convergenceFactor;
            const halfCorridor = centralCorridorWidth / 2 + 12;
            if (targetX > -halfCorridor && targetX < halfCorridor) {
                targetX = (targetX >= 0) ? halfCorridor : -halfCorridor;
            }

            const roadProj = getProjection(worldZ, targetX);
            const roadY = roadProj ? roadProj.y : 0;

            if (isFinalGlitch) {
                b.group.position.x = targetX + (Math.random() - 0.5) * 12;
                b.group.position.y = roadY - 16 + (Math.random() - 0.5) * 4;
                if (b.edgeMat) b.edgeMat.opacity = 0.95;
            } else {
                b.group.position.x = targetX;
                b.group.position.y = roadY - 16;
                if (updatedLocalZ > 0) {
                    if (b.edgeMat) b.edgeMat.opacity = 0;
                } else {
                    if (b.edgeMat) b.edgeMat.opacity = Math.max(0, Math.min(1, distanceOpacity));
                }
            }
        });

        const proj = getProjection(this.z, 0);
        if (proj) {
            this.mesh.position.set(proj.x, proj.y, this.z);
        }
    }

    animate(time) {}

    dispose() {
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
