import * as THREE from 'three';
import { Building2 } from './Building2.js';

export class BurningBuilding2 extends Building2 {
    constructor(lane, z, getProjection, roadColor, levitationSpeed = 1.0) {
        super(lane, z, getProjection, roadColor);
        this.type = 'burning_building_2';

        // Facteur de vitesse global (1.0 correspond désormais à l'ancienne vitesse 0.3)
        this.levitationSpeed = levitationSpeed;

        // --- PALETTE Équilibrée : Sombre en bas, vif et ardent sur le feu ---
        this.fireColorPrimary = new THREE.Color(0xff0000);   // Rouge vif
        this.fireColorSecondary = new THREE.Color(0xff4400); // Orange-rouge ardent
        this.glowColor = new THREE.Color(0xff2200);          // Lueur rouge intense
        this.burnedMeshColor = new THREE.Color(0x050101);    // Suie sombre

        // Arêtes du bâtiment rouge sang foncé mais visibles
        this.wireColor.set(0xaa0000);

        this.sparks = [];
        this.flameVolumes = [];
        this.glowingFaces = [];
        this.floatingFloors = [];

        this._applyTotalCataclysmAndLevitation();
    }

    _applyTotalCataclysmAndLevitation() {
        const totalFloors = this.floors.length;

        this.floors.forEach((floor, index) => {
            const ratio = index / totalFloors;

            // 1. DÉSTRUCTION ET LÉVITATION
            if (ratio > 0.25) {
                floor.group.rotation.x = (Math.random() - 0.5) * 1.5;
                floor.group.rotation.y = (Math.random() - 0.5) * 2.0;
                floor.group.rotation.z = (Math.random() - 0.5) * 1.2;

                floor.group.position.x += (Math.random() - 0.5) * 7;
                floor.group.position.z += (Math.random() - 0.5) * 7;

                this.floatingFloors.push({
                    group: floor.group,
                    currentY: floor.group.position.y,
                    minY: floor.group.position.y,
                    maxY: floor.group.position.y + 35 + Math.random() * 25,
                    // Vitesse ajustée : 1.0 équivaut à l'ancien 0.3
                    speedY: (0.15 + ratio * 0.3) * this.levitationSpeed * 0.3,
                    rotSpeedX: (Math.random() - 0.5) * 0.02,
                    rotSpeedY: (Math.random() - 0.5) * 0.03
                });

                if (Math.random() > 0.7) {
                    floor.group.visible = false;
                    return;
                }
            }

            // 2. FACES INTERNES SOMBRES
            floor.group.traverse(child => {
                if (child.isMesh && child.material && !(child.material.wireframe)) {
                    child.material = new THREE.MeshBasicMaterial({
                        color: this.burnedMeshColor.clone(),
                        transparent: true,
                        opacity: 0.98
                    });
                    this.glowingFaces.push(child.material);
                }
            });

            // 3. FLAMMES VOLUMÉTRIQUES VIVES
            if (Math.random() > 0.25) {
                const flameGeo = new THREE.BoxGeometry(
                    2 + Math.random() * 4,
                    4 + Math.random() * 8,
                    2 + Math.random() * 4
                );
                const flameMat = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.4 ? this.fireColorPrimary : this.fireColorSecondary,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.85
                });
                const flameMesh = new THREE.Mesh(flameGeo, flameMat);

                flameMesh.position.set(
                    (Math.random() - 0.5) * 4,
                    Math.random() * 3,
                    (Math.random() - 0.5) * 4
                );

                floor.group.add(flameMesh);
                this.flameVolumes.push({
                    mesh: flameMesh,
                    mat: flameMat,
                    baseScaleY: flameMesh.scale.y,
                    speed: 10 + Math.random() * 15
                });
            }
        });

        // 4. ÉTINCELLES / BRAISES LUMINEUSES (ralenties et indexées sur la vitesse globale)
        const sparksCount = 40;
        const sparksGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(sparksCount * 3);
        this.sparksData = [];

        for (let i = 0; i < sparksCount; i++) {
            const x = (Math.random() - 0.5) * 16;
            const y = Math.random() * 60;
            const z = (Math.random() - 0.5) * 16;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            this.sparksData.push({
                x: x, y: y, z: z,
                speedY: (0.4 + Math.random() * 0.8) * this.levitationSpeed * 0.3,
                vx: (Math.random() - 0.5) * 0.3,
                vz: (Math.random() - 0.5) * 0.3,
                maxY: 65 + Math.random() * 20
            });
        }

        sparksGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const sparksMat = new THREE.PointsMaterial({
            color: this.glowColor,
            size: 0.9,
            transparent: true,
            opacity: 0.9
        });

        this.sparksMesh = new THREE.Points(sparksGeo, sparksMat);
        this.buildingGroup.add(this.sparksMesh);
    }

    animate(time) {
        super.animate(time);
        if (!this.buildingGroup.visible) return;

        const t = time * 0.01 || Date.now() * 0.005;

        // --- ANIMATION 1 : FLUX CONTINU DE MONTÉE ---
        this.floatingFloors.forEach((item) => {
            item.currentY += item.speedY;
            if (item.currentY > item.maxY) {
                item.currentY = item.minY;
            }
            item.group.position.y = item.currentY;
            item.group.rotation.x += item.rotSpeedX;
            item.group.rotation.y += item.rotSpeedY;
        });

        // --- ANIMATION 2 : PULSATION THERMIQUE ---
        const glowIntensity = (Math.sin(t * 7) + 1) * 0.5;
        this.glowingFaces.forEach((mat, idx) => {
            if (idx % 2 === 0) {
                mat.color.setRGB(0.1 + glowIntensity * 0.3, 0.01, 0.01);
            } else {
                mat.color.setRGB(0.15 + (1 - glowIntensity) * 0.25, 0.02, 0.0);
            }
        });

        // --- ANIMATION 3 : FLAMMES WIREFRAME ET FLASHES VIFS ---
        this.flameVolumes.forEach((f, idx) => {
            f.mesh.scale.y = f.baseScaleY + Math.sin(t * f.speed + idx) * 0.7;
            f.mesh.rotation.y += 0.04;

            if (Math.random() > 0.85) {
                f.mat.color.setHex(0xffffff); // Flash blanc de surchauffe
            } else {
                f.mat.color.copy((idx % 2 === 0) ? this.fireColorPrimary : this.fireColorSecondary);
            }
        });

        // --- ANIMATION 4 : ÉTINCELLES / BRAISES MONTANTES ---
        if (this.sparksMesh) {
            const positions = this.sparksMesh.geometry.attributes.position.array;

            for (let i = 0; i < this.sparksData.length; i++) {
                const data = this.sparksData[i];

                data.y += data.speedY;
                data.x += data.vx + Math.sin(t * 4 + i) * 0.12;
                data.z += data.vz + Math.cos(t * 4 + i) * 0.12;

                if (data.y > data.maxY) {
                    data.y = 0;
                    data.x = (Math.random() - 0.5) * 16;
                    data.z = (Math.random() - 0.5) * 16;
                }

                positions[i * 3] = data.x;
                positions[i * 3 + 1] = data.y;
                positions[i * 3 + 2] = data.z;
            }
            this.sparksMesh.geometry.attributes.position.needsUpdate = true;
        }

        // --- ANIMATION 5 : SÉISME ---
        this.buildingGroup.position.x = (Math.random() - 0.5) * 0.8;
        this.buildingGroup.position.z = (Math.random() - 0.5) * 0.8;
    }
}
