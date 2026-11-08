import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class BigBossMachine extends BaseCityScapeElement {
    constructor(getProjection, duration = 120, roadColor = 0x00ff00, appearStartTime = 35.0) {
        super(0, 0, getProjection);
        this.type = 'big_boss_machine';

        this.duration = duration;
        this.age = 0;
        this.isActive = true;

        this.baseWireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);
        this.baseColor = 0x000000;

        // --- CONFIGURATION CENTRALISÉE ---
        this.config = {
            appearStartTime: appearStartTime,
            emergenceDuration: 25.0,
            fixedZ: -1000,
            baseOpacity: 0.8,
            hiddenYOffset: -255 // Profondeur sous terre au départ
        };

        this.machineGroup = new THREE.Group();
        this.mesh.add(this.machineGroup);

        this.redLight = null;
        this.eyeMat = null;
        this.electronSystems = []; // Stockage pour animer les électrons dans les câbles

        this._buildMachineMesh();
    }

    _buildMachineMesh() {
        const group = this.machineGroup;

        // 1. Corps principal du building étagé : Base très large, structure massive
        const levels = [
            { radiusTop: 55, radiusBottom: 75, height: 50, y: 25 },   // Base très large
            { radiusTop: 45, radiusBottom: 55, height: 50, y: 75 },   // Corps bas
            { radiusTop: 38, radiusBottom: 45, height: 60, y: 130 },  // Corps haut
            { radiusTop: 42, radiusBottom: 38, height: 50, y: 185 }   // Derniers étages (toiture)
        ];

        levels.forEach(lvl => {
            const geo = new THREE.CylinderGeometry(lvl.radiusTop, lvl.radiusBottom, lvl.height, 10);
            const mat = new THREE.MeshBasicMaterial({ color: this.baseColor });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.y = lvl.y;
            group.add(mesh);

            const edgesGeo = new THREE.EdgesGeometry(geo);
            const edgeMat = new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: this.config.baseOpacity });
            const edges = new THREE.LineSegments(edgesGeo, edgeMat);
            mesh.add(edges);
        });

        // 2. Anneaux / plateformes industrielles extérieures
        const rings = [70, 125, 175];
        rings.forEach(yPos => {
            const ringGeo = new THREE.CylinderGeometry(58, 48, 4, 12, 1, true);
            const ringEdges = new THREE.LineSegments(
                new THREE.EdgesGeometry(ringGeo),
                new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: this.config.baseOpacity * 0.8 })
            );
            const ringMesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: this.baseColor }));
            ringMesh.position.y = yPos;
            ringMesh.add(ringEdges);
            group.add(ringMesh);
        });

        // 3. L'ŒIL ROUGE ROND ET LUMINEUX DANS LES DERNIERS ÉTAGES
        const eyeGeo = new THREE.SphereGeometry(12, 16, 16);
        this.eyeMat = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 1.0,
            depthTest: true
        });
        const eyeMesh = new THREE.Mesh(eyeGeo, this.eyeMat);
        eyeMesh.position.set(0, 165, 138);
        group.add(eyeMesh);

        // Vraie source lumineuse 3D positionnée juste devant l'œil
        this.redLight = new THREE.PointLight(0xff0000, 8.0, 800);
        this.redLight.position.set(0, 165, 146);
        group.add(this.redLight);

        // 4. ANTENNES ET FLÈCHES DE TRANSMISSION SUR LE TOIT
        const antennaGeo = new THREE.CylinderGeometry(0.8, 1.5, 45, 4);
        const antennaMat = new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: 0.9 });

        const centralAntenna = new THREE.Mesh(antennaGeo, new THREE.MeshBasicMaterial({ color: this.baseColor }));
        centralAntenna.position.set(0, 232, 0);
        const centralEdges = new THREE.LineSegments(new THREE.EdgesGeometry(antennaGeo), antennaMat);
        centralAntenna.add(centralEdges);
        group.add(centralAntenna);

        [-15, 15].forEach(xOff => {
            const sideAntennaGeo = new THREE.CylinderGeometry(0.5, 1.0, 30, 4);
            const sideAntenna = new THREE.Mesh(sideAntennaGeo, new THREE.MeshBasicMaterial({ color: this.baseColor }));
            sideAntenna.position.set(xOff, 225, 0);
            const sideEdges = new THREE.LineSegments(new THREE.EdgesGeometry(sideAntennaGeo), antennaMat);
            sideAntenna.add(sideEdges);
            group.add(sideAntenna);
        });

        // AJOUT : Petite cabane carrée sur le toit, décentrée sur la droite (pour casser la symétrie)
        const hutGeo = new THREE.BoxGeometry(16, 14, 16);
        const hutMat = new THREE.MeshBasicMaterial({ color: this.baseColor });
        const hutMesh = new THREE.Mesh(hutGeo, hutMat);
        hutMesh.position.set(18, 217, 0); // Décentrée sur la droite (X = 18) sur le toit
        group.add(hutMesh);

        const hutEdgesGeo = new THREE.EdgesGeometry(hutGeo);
        const hutEdges = new THREE.LineSegments(hutEdgesGeo, new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: this.config.baseOpacity }));
        hutMesh.add(hutEdges);

        // Texture radiale ultra-lumineuse pour garantir des électrons éclatants et visibles
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.95)');
        gradient.addColorStop(0.7, 'rgba(200, 230, 255, 0.5)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
        const electronTexture = new THREE.CanvasTexture(canvas);

        // 5. RÉSEAU MASSIF DE CÂBLES TENTACULAIRES + ÉLECTRONS BLANCS TRÈS LUMINEUX
        const cablePaths = [
            // Côté Gauche - Éventail diagonal large ancré profondément dans le sol
            { start: new THREE.Vector3(-35, 180, 20), end: new THREE.Vector3(-140, 0, -40) },
            { start: new THREE.Vector3(-40, 150, 25), end: new THREE.Vector3(-110, 0, 10) },
            { start: new THREE.Vector3(-30, 190, 15), end: new THREE.Vector3(-85, 0, 60) },
            { start: new THREE.Vector3(-45, 120, 20), end: new THREE.Vector3(-160, 0, 0) },
            { start: new THREE.Vector3(-25, 200, 10), end: new THREE.Vector3(-60, 0, -50) },

            // Côté Droit - Éventail diagonal large ancré profondément dans le sol
            { start: new THREE.Vector3(35, 180, 20), end: new THREE.Vector3(140, 0, -40) },
            { start: new THREE.Vector3(40, 150, 25), end: new THREE.Vector3(110, 0, 10) },
            { start: new THREE.Vector3(30, 190, 15), end: new THREE.Vector3(85, 0, 60) },
            { start: new THREE.Vector3(45, 120, 20), end: new THREE.Vector3(160, 0, 0) },
            { start: new THREE.Vector3(25, 200, 10), end: new THREE.Vector3(60, 0, -50) },

            // Verticaux et centraux de renfort
            { start: new THREE.Vector3(-15, 210, 10), end: new THREE.Vector3(-30, 0, 70) },
            { start: new THREE.Vector3(15, 210, 10), end: new THREE.Vector3(30, 0, 70) },
            { start: new THREE.Vector3(0, 220, 5), end: new THREE.Vector3(0, 0, 80) }
        ];

        cablePaths.forEach(path => {
            // Création géométrique du câble
            const dir = new THREE.Vector3().subVectors(path.end, path.start);
            const length = dir.length();
            const cableGeo = new THREE.CylinderGeometry(0.6, 0.6, length, 4);
            const cableMat = new THREE.LineBasicMaterial({ color: this.baseWireColor, transparent: true, opacity: 0.5 });
            const cableMesh = new THREE.Mesh(cableGeo, new THREE.MeshBasicMaterial({ color: this.baseColor }));

            cableMesh.position.copy(path.start).add(path.end).multiplyScalar(0.5);
            cableMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());

            const cableEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cableGeo), cableMat);
            cableMesh.add(cableEdges);
            group.add(cableMesh);

            // Flux d'électrons lumineux BLANCS très gros et éclatants
            const electronCount = 8;
            const particleGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(electronCount * 3);

            for (let i = 0; i < electronCount * 3; i += 3) {
                positions[i] = path.start.x;
                positions[i+1] = path.start.y;
                positions[i+2] = path.start.z;
            }
            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const particleMat = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 12.0, // Taille augmentée pour être parfaitement visible
                map: electronTexture,
                transparent: true,
                opacity: 1.0,
                blending: THREE.AdditiveBlending,
                depthTest: false
            });

            const particleSystem = new THREE.Points(particleGeo, particleMat);
            particleSystem.visible = false; // Cachés au départ pendant la sortie de terre
            group.add(particleSystem);

            // Stockage pour l'animation dans updatePosition
            this.electronSystems.push({
                system: particleSystem,
                start: path.start,
                end: path.end,
                count: electronCount,
                speeds: Array.from({ length: electronCount }, () => 0.5 + Math.random() * 0.6),
                offsets: Array.from({ length: electronCount }, () => Math.random())
            });
        });
    }

    updatePosition(speed, delta, getProjection) {
        this.age += delta;

        const timeLeft = Math.max(0, this.duration - this.age);
        if (timeLeft <= 0 || this.age >= this.duration) {
            this.isActive = false;
            this.mesh.visible = false;
            return;
        }

        // --- GESTION DE L'ÉMERGENCE PAR POSITION Y ---
        const { appearStartTime, emergenceDuration, fixedZ, hiddenYOffset } = this.config;

        let emergenceProgress = 0.0;
        if (this.age >= appearStartTime) {
            const timeSinceAppear = this.age - appearStartTime;
            emergenceProgress = THREE.MathUtils.clamp(timeSinceAppear / emergenceDuration, 0.0, 1.0);
        }

        // SCINTILLEMENT FLUIDE DE L'ŒIL ROUGE
        if (this.redLight && this.eyeMat) {
            const noise = Math.sin(this.age * 6.0) * 0.5 + Math.sin(this.age * 14.3) * 0.2;
            const intensityFactor = 1.0 + noise;

            this.redLight.intensity = 6.0 * intensityFactor;
            this.eyeMat.opacity = THREE.MathUtils.clamp(0.8 + noise * 0.2, 0.4, 1.0);
        }

        // ACTIVATION DES ÉLECTRONS SEULEMENT QUAND LA MACHINE EST COMPLÈTEMENT SORTIE (emergenceProgress >= 1.0)
        const isFullyEmerged = (emergenceProgress >= 0.9);

        this.electronSystems.forEach(elec => {
            elec.system.visible = isFullyEmerged;
            if (!isFullyEmerged) return;

            const positions = elec.system.geometry.attributes.position.array;
            for (let i = 0; i < elec.count; i++) {
                let t = (this.age * elec.speeds[i] + elec.offsets[i]) % 1.0;

                const posX = THREE.MathUtils.lerp(elec.start.x, elec.end.x, t);
                const posY = THREE.MathUtils.lerp(elec.start.y, elec.end.y, t);
                const posZ = THREE.MathUtils.lerp(elec.start.z, elec.end.z, t);

                positions[i * 3] = posX;
                positions[i * 3 + 1] = posY;
                positions[i * 3 + 2] = posZ;
            }
            elec.system.geometry.attributes.position.needsUpdate = true;
        });

        // SYNCHRONISATION FLUIDE AVEC LA PROJECTION DU MONDE (ton code initial d'origine)
        const roadProj = getProjection(fixedZ, 0);
        if (roadProj) {
            const targetY = roadProj.y - 16;
            const currentY = THREE.MathUtils.lerp(targetY + hiddenYOffset, targetY, emergenceProgress);

            this.mesh.position.set(roadProj.x, currentY, fixedZ);
        }

        this.mesh.visible = true;
    }

    animate(time) {}

    dispose() {
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
