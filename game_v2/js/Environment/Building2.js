import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class Building2 extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'city_scape_element';

        // --- CONFIGURATION ---
        this.baseColor = 0x010101; // Noir profond
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);
        this.sideOffset = 18 + Math.random() * 30;

        // --- STRUCTURE ---
        this.buildingGroup = new THREE.Group();
        this.buildingGroup.visible = false;
        this.mesh.add(this.buildingGroup);

        this.floors = [];
        this.glitchTimer = 0;
        this.isGlitching = false;

        this._generateBrutalistBuilding();
    }

    _generateBrutalistBuilding() {
        const width = 6 + Math.random() * 6;
        const depth = 6 + Math.random() * 6;
        const totalHeightTarget = 40 + Math.random() * 50;

        // --- 1. SOCLE (Repris exactement de ton ancienne classe) ---
        const baseThickness = 0.2;
        const baseGeo = new THREE.BoxGeometry(width + 2, baseThickness, depth + 2);
        // On le met plein (couleur building) comme demandé
        const baseMat = new THREE.MeshBasicMaterial({ color: this.baseColor, transparent: false });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = baseThickness / 2;
        this.buildingGroup.add(baseMesh);

        // Arêtes du socle pour qu'il soit défini
        const baseEdges = new THREE.LineSegments(
            new THREE.EdgesGeometry(baseGeo),
            new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.8 })
        );
        baseMesh.add(baseEdges);

        // --- 2. ÉTAGES OPAQUES ET IRRÉGULIERS ---
        let currentY = baseThickness;
        while (currentY < totalHeightTarget) {
            // Alternance marquée entre tranches fines et blocs massifs
            const isTall = Math.random() > 0.6;
            const h = isTall ? (6 + Math.random() * 12) : (0.4 + Math.random() * 1.5);

            const rand = Math.random();
            const hasInternalGrid = rand > 0.2;
            const isGlitchyData = rand > 0.85;

            this._addFloor(width, h, depth, currentY, hasInternalGrid, isGlitchyData);
            currentY += h + 0.25; // Petit espace entre strates
        }
    }

    _addFloor(w, h, d, yOffset, hasInternalGrid, isGlitchy) {
        const floorGroup = new THREE.Group();
        floorGroup.position.y = yOffset + h / 2;
        this.buildingGroup.add(floorGroup);

        const geo = new THREE.BoxGeometry(w, h, d);

        // CORPS OPAQUE
        const bodyMat = new THREE.MeshBasicMaterial({ color: this.baseColor, transparent: false });
        const body = new THREE.Mesh(geo, bodyMat);
        floorGroup.add(body);

        // GRILLAGE (Wireframe interne)
        if (hasInternalGrid) {
            const wireMat = new THREE.MeshBasicMaterial({
                color: this.wireColor,
                wireframe: true,
                transparent: true,
                opacity: 0.25
            });
            const wireMesh = new THREE.Mesh(geo, wireMat);
            wireMesh.scale.setScalar(1.002);
            floorGroup.add(wireMesh);
        }

        // ARÊTES (Celles qui vont "sauter" et trembler)
        const edgeMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.8 });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat);
        floorGroup.add(edges);

        this.floors.push({
            group: floorGroup,
            edges: edges,
            edgeMat: edgeMat,
            initialY: floorGroup.position.y
        });
    }

    animate(time) {
        const dist = Math.abs(this.mesh.position.z);

        if (dist > 500) {
            this.buildingGroup.visible = false;
            return;
        } else {
            this.buildingGroup.visible = true;
        }

        // Déclenchement Glitch
        if (!this.isGlitching && Math.random() > 0.997) {
            this.isGlitching = true;
            this.glitchTimer = 8 + Math.random() * 15;
        }

        if (this.isGlitching) {
            this.glitchTimer--;

            this.floors.forEach(f => {
                // GLITCH GROSSIER : Décalage violent des arêtes (distorsion de rendu)
                const offsetAmount = 1.4;
                f.edges.position.x = (Math.random() - 0.5) * offsetAmount;
                f.edges.position.z = (Math.random() - 0.5) * offsetAmount;

                // Saut d'échelle aléatoire sur les arêtes pour l'effet "instable"
                if (Math.random() > 0.7) {
                    f.edges.scale.setScalar(1.0 + Math.random() * 0.3);
                    f.edgeMat.color.set(0xffffff); // Flash blanc
                } else {
                    f.edges.scale.setScalar(1.0);
                    f.edgeMat.color.copy(this.wireColor);
                }

                // Tremblement de l'étage entier
                f.group.position.x = (Math.random() - 0.5) * 0.4;
            });

            if (this.glitchTimer <= 0) {
                this.isGlitching = false;
                this.floors.forEach(f => {
                    f.edges.position.set(0, 0, 0);
                    f.edges.scale.setScalar(1.0);
                    f.group.position.x = 0;
                    f.edgeMat.color.copy(this.wireColor);
                });
            }
        }
    }

    getTopPosition() {
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);
        if (this.floors.length > 0) {
            const lastFloor = this.floors[this.floors.length - 1];
            pos.y += lastFloor.group.position.y;
        }
        return pos;
    }

    updatePosition(speed, delta, getProjection) {
        this.z += speed * delta;
        const proj = getProjection(this.z, 0);

        if (proj) {
            const roll = proj.rollAngle || 0;
            const totalOffset = this.lane * this.sideOffset;

            this.mesh.position.set(
                proj.x + Math.cos(roll) * totalOffset,
                proj.y + Math.sin(roll) * totalOffset,
                this.z
            );
            this.mesh.rotation.z = roll;
            this.buildingGroup.visible = true;
        }
    }

    dispose() {
        this.buildingGroup.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
