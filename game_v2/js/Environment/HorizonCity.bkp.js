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
            baseTotalWidth: 650,         // Largeur globale de la skyline

            // --- FEINTE INITIALE : Créés derrière le joueur (z > 0) ---
            initialSpawnMinZ: 150,
            initialSpawnMaxZ: 800,

            // --- APPROCHE GLOBALE DOUCE ---
            citySpeedFactor: 0.03,

            // --- SEUILS DE PAUSE (EN SECONDES) ---
            pauseStart: 5.0,             // Seuil 1 : Début de la pause
            pauseEnd: 20.0,              // Seuil z2 : Fin de la pause et reprise de l'avancée

            // Seuils de mouvement
            transitionZ: -300,
            extraApproachSpeed: 0.2,

            // --- PARAMÈTRES DE CROISSANCE (POUR LES RESPAWNS) ---
            emergenceDistance: 800,      // Distance de croissance fluide depuis le fond

            // Recyclage : lorsque l'immeuble dépasse le joueur (z > 100) -> hop, on le renvoie au fond
            recycleZ: 100,
            respawnMinZ: -800,
            respawnMaxZ: -1200,

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

        // --- GESTION DE LA PAUSE ENTRE 5s ET 20s ---
        let cityAdvanceFactor = 1.0;
        if (this.age >= this.config.pauseStart && this.age < this.config.pauseEnd) {
            cityAdvanceFactor = 0.0; // Stoppe l'avancée de la ville pendant la pause
        }

        // Approche globale douce (mise en pause si le facteur est à 0)
        this.currentCityZ += moveSpeed * this.config.citySpeedFactor * cityAdvanceFactor;
        this.z = this.currentCityZ;

        const centralCorridorWidth = 70;
        const convergenceFactor = Math.max(0.3, 1.0 - progress * 0.4);

        const { transitionZ, extraApproachSpeed, emergenceDistance, recycleZ, respawnMinZ, respawnMaxZ, fadeLimitNear, baseOpacity } = this.config;

        this.buildingsData.forEach(b => {
            const localZ = b.group.position.z;

            // Gestion de la vitesse par seuil (gelée également pendant la pause globale si on veut figer l'ensemble)
            const buildingAdvanceSpeed = moveSpeed * cityAdvanceFactor;

            if (localZ < transitionZ) {
                b.group.position.z += buildingAdvanceSpeed + (buildingAdvanceSpeed * extraApproachSpeed);
            } else {
                b.group.position.z += buildingAdvanceSpeed;
            }

            // --- RECYCLAGE AU FOND ---
            // Dès qu'un immeuble dépasse le joueur (z > recycleZ), on le balance tout au fond (en négatif)
            // et on enclenche son effet de sortie de terre logarithmique !
            if (b.group.position.z > recycleZ) {
                const newZ = respawnMinZ - Math.random() * Math.abs(respawnMaxZ - respawnMinZ);
                b.group.position.z = newZ;
                b.spawnZ = newZ; // Point de départ de l'émergence au fond
            }

            const updatedLocalZ = b.group.position.z;
            const worldZ = this.z + updatedLocalZ;

            // --- CALCUL DE L'ÉMERGENCE (Actif uniquement quand ils sont devant/au loin) ---
            let emergenceFactor = 1.0;

            // Si l'immeuble est dans la zone de respawn/lointaine, on applique la croissance logarithmique
            if (updatedLocalZ < 0) {
                const distanceTraveled = updatedLocalZ - b.spawnZ;
                let linearFactor = THREE.MathUtils.clamp(distanceTraveled / emergenceDistance, 0.0, 1.0);
                emergenceFactor = Math.pow(linearFactor, 0.4);
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
                // Si l'immeuble est derrière le joueur (z > 0), on le rend invisible pour éviter qu'on le voie poper derrière la caméra
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
