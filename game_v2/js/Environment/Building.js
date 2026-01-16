import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class Building extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'city_scape_element';

        // --- CONFIGURATION ---
        this.baseColor = 0x050505;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);

        // C'est ce paramètre qui empêche l'alignement "tout droit"
        this.sideOffset = 18 + Math.random() * 30;

        // --- STRUCTURE ---
        this.buildingGroup = new THREE.Group();
        this.buildingGroup.visible = false;
        this.mesh.add(this.buildingGroup);

        this.gridMaterials = [];
        this.edgeMaterials = [];
        this.triangleGrids = [];
        this.subSectionStatus = [];

        this.glitchTimer = 0;
        this.glitchDuration = 0;
        this.isCurrentlyGlitching = false;

        const numFloors = 2 + Math.floor(Math.random() * 3);
        const width = 6 + Math.random() * 6;
        const depth = 6 + Math.random() * 6;

        // --- SOCLE ---
        const baseThickness = 0.2;
        const baseGeo = new THREE.BoxGeometry(width + 2, baseThickness, depth + 2);
        const baseMat = new THREE.MeshBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0 });
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.y = baseThickness / 2;
        this.buildingGroup.add(baseMesh);
        this.edgeMaterials.push(baseMat);

        let currentHeight = baseThickness;

        // --- GÉNÉRATION DES ÉTAGES ---
        for (let i = 0; i < numFloors; i++) {
            const floorHeight = 8 + Math.random() * 12;
            const floorGroup = new THREE.Group();
            floorGroup.position.y = currentHeight + floorHeight / 2;
            this.buildingGroup.add(floorGroup);

            const splitX = Math.random() > 0.5 ? 2 : 1;
            const splitZ = Math.random() > 0.5 ? 2 : 1;
            const subW = width / splitX;
            const subD = depth / splitZ;

            for (let sx = 0; sx < splitX; sx++) {
                for (let sz = 0; sz < splitZ; sz++) {
                    const seg = 2 + Math.floor(Math.random() * 3);
                    const geo = new THREE.BoxGeometry(subW, floorHeight, subD, seg, seg, seg);

                    const block = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: this.baseColor }));
                    block.position.x = (sx - (splitX - 1) / 2) * subW;
                    block.position.z = (sz - (splitZ - 1) / 2) * subD;
                    floorGroup.add(block);

                    // 2. Arêtes
                    const eMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0 });
                    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), eMat);
                    block.add(edges);
                    this.edgeMaterials.push(eMat);

                    // 3. Grillage Quads
                    const gMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0 });
                    const grid = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 1), gMat);
                    grid.scale.set(1.002, 1.002, 1.002);
                    block.add(grid);
                    this.gridMaterials.push(gMat);

                    // 4. Triangles Glitch
                    const tMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
                    const tri = new THREE.LineSegments(new THREE.WireframeGeometry(geo), tMat);
                    tri.visible = false;
                    block.add(tri);
                    this.triangleGrids.push({ mesh: tri, mat: tMat });

                    this.subSectionStatus.push(Math.random() > 0.5);
                }
            }
            currentHeight += floorHeight;
        }

        this.glitchPalette = [new THREE.Color(0x004400), this.wireColor, new THREE.Color(0xFFFFFF)];
        this.innerMesh = this.buildingGroup;
    }

    animate(time) {
        const dist = Math.abs(this.mesh.position.z);

        if (dist > 350) {
            this.buildingGroup.visible = false;
            return;
        } else {
            this.buildingGroup.visible = true;
        }

        if (!this.isCurrentlyGlitching && dist < 300 && Math.random() > 0.995) {
            this.isCurrentlyGlitching = true;
            this.glitchDuration = 5 + Math.random() * 15;
            this.glitchTimer = 0;
        }

        if (this.isCurrentlyGlitching) {
            this.glitchTimer++;
            if (this.glitchTimer >= this.glitchDuration) this.isCurrentlyGlitching = false;
        }

        const edgeOpacityBase = dist < 350 ? 0.6 : 0;
        const gridOpacityBase = dist < 300 ? 0.3 : 0;

        this.edgeMaterials.forEach(mat => {
            mat.opacity = this.isCurrentlyGlitching ? 0.2 : edgeOpacityBase;
        });

        for (let i = 0; i < this.subSectionStatus.length; i++) {
            const matQuad = this.gridMaterials[i];
            const glitchObj = this.triangleGrids[i];
            const isVisibleNormally = this.subSectionStatus[i];

            if (this.isCurrentlyGlitching) {
                const slowGlitchTick = Math.floor(this.glitchTimer / 3) % 2 === 0;
                const showTri = (i % 2 === 0) ? slowGlitchTick : !slowGlitchTick;

                glitchObj.mesh.visible = showTri;
                glitchObj.mat.opacity = showTri ? 0.9 : 0;
                matQuad.opacity = showTri ? 0 : 0.9;

                if (showTri) {
                    glitchObj.mat.color.copy(this.glitchPalette[i % this.glitchPalette.length]);
                } else {
                    matQuad.color.setHex(0xffffff);
                }
            } else {
                if(glitchObj) glitchObj.mesh.visible = false;
                if(glitchObj) glitchObj.mat.opacity = 0;
                matQuad.color.copy(this.wireColor);
                matQuad.opacity = isVisibleNormally ? gridOpacityBase : 0;
            }
        }

        if (this.isCurrentlyGlitching) {
            this.buildingGroup.position.x = (Math.sin(this.glitchTimer) * 0.3);
        } else {
            this.buildingGroup.position.x = 0;
        }
    }

    getTopPosition() {
        // On calcule la hauteur totale approximative
        let totalHeight = 0;
        this.buildingGroup.children.forEach(child => {
            if (child instanceof THREE.Group) totalHeight += 10; // Estimation par étage
        });

        // On retourne la position mondiale du sommet
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);
        pos.y += (this.buildingGroup.position.y + totalHeight);
        return pos;
    }

    updatePosition(speed, delta, getProjection, allElements) {
        this.z += speed * delta;

        // On récupère la projection au centre de la route pour ce Z
        const proj = getProjection(this.z, 0);

        if (proj) {
            const roll = proj.rollAngle || 0;
            const totalOffset = this.lane * this.sideOffset;

            // Calcul trigonométrique pour coller à l'inclinaison du sol
            this.mesh.position.x = proj.x + Math.cos(roll) * totalOffset;
            this.mesh.position.y = proj.y + Math.sin(roll) * totalOffset;
            this.mesh.position.z = this.z;
            this.mesh.rotation.z = roll;

            this.buildingGroup.visible = true;
        }
    }

    dispose() {
        if (this.buildingGroup) {
            this.buildingGroup.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
            });
        }
    }
}
