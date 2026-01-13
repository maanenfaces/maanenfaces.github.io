import * as THREE from 'three';

/**
 * CLASSE DE BASE : Gère la physique de positionnement sur la route courbe
 */
class ScapeElement {
    constructor(lane, z, getProjection) {
        this.mesh = new THREE.Group();
        this.lane = lane; // -1 ou 1
        this.z = z;
        this.isActive = true;
        this.initialized = false;
        this.laneWidth = 6; // Utilisé pour le calcul de base
    }

    updatePosition(speed, delta, getProjection) {
        this.z += speed * delta;

        // On récupère la projection au centre de la route pour ce Z
        const proj = getProjection(this.z, 0);

        if (proj) {
            const roll = proj.rollAngle || 0;
            // sideOffset est défini dans la classe enfant (CityScapeElement)
            const distFromCenter = this.sideOffset || 25;

            // CALCUL CRUCIAL : On positionne l'immeuble perpendiculairement
            // à l'inclinaison de la route (le "roll")
            const finalX = proj.x + Math.cos(roll) * (this.lane * distFromCenter);
            const finalY = proj.y + Math.sin(roll) * (this.lane * distFromCenter);

            this.mesh.position.set(finalX, finalY, this.z);
            this.mesh.rotation.z = roll;

            if (!this.initialized) {
                this.mesh.visible = true;
                this.initialized = true;
            }
        }
    }
}

class BasicCityScapeElement extends ScapeElement {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.pulseOffset = Math.random() * Math.PI * 2;
    }
}

export class CityScapeElement extends BasicCityScapeElement {
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

    updatePosition(speed, delta, getProjection) {
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

export class World {
    constructor(scene) {
        this.scene = scene;

        // Liste spécifique pour le décor (CityScape)
        this.scenery = [];
        this.lastSceneryZ = 0;

        // On augmente la profondeur (600) pour éviter de voir le bord
        const geo = new THREE.PlaneGeometry(600, 600, 80, 80);
        geo.rotateX(-Math.PI / 2);
        this.baseVertices = geo.attributes.position.array.slice();

        // Création d'une texture de grille procédurale pour le défilement
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 64, 64);

        const gridTexture = new THREE.CanvasTexture(canvas);
        //gridTexture.generateMipmaps = false;
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(40, 40); // Nombre de répétitions de la grille

        gridTexture.magFilter = THREE.NearestFilter;
        gridTexture.minFilter = THREE.LinearMipmapLinearFilter;
        gridTexture.anisotropy = 16;

        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        }));

        // On utilise la texture sur le gridMaterial
        this.gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            map: gridTexture, // La texture qui va défiler
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.grid = new THREE.Mesh(geo, this.gridMaterial);
        this.grid.position.y = 0.02;

        this.scene.add(this.mesh, this.grid);
        this.scene.fog = new THREE.Fog(0x000000, 200, 500);

        // Le canva pour les éclairs
        this.lCanvas = document.createElement('canvas');
        this.lCanvas.id = "lightning-layer";
        this.lCanvas.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:50;";
        document.body.appendChild(this.lCanvas);
        this.lCtx = this.lCanvas.getContext('2d');

        // Ajustement de la taille au redimensionnement
        window.addEventListener('resize', () => {
            this.lCanvas.width = window.innerWidth;
            this.lCanvas.height = window.innerHeight;
        });
        this.lCanvas.width = window.innerWidth;
        this.lCanvas.height = window.innerHeight;
    }

    reset() {
        // 1. On s'assure que les deux meshs sont bien dans la scène
        if (!this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        if (!this.scene.children.includes(this.grid)) {
            this.scene.add(this.grid);
        }

        // 2. Réinitialisation de l'offset de la texture pour éviter un saut visuel
        if (this.gridMaterial && this.gridMaterial.map) {
            this.gridMaterial.map.offset.y = 0;
        }

        // 3. Remise à plat de la géométrie (optionnel mais propre)
        const pos = this.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, 0);
        }
        pos.needsUpdate = true;

        // On synchronise la grille sur le mesh plat
        this.grid.geometry.attributes.position.copy(pos);
        this.grid.geometry.attributes.position.needsUpdate = true;
    }

    spawnScenery(state, getProjection) {
        const currentDistance = state.zOffset;

        // On spawn un élément tous les X mètres (ex: tous les 40m)
        if (currentDistance - this.lastSceneryZ < 40) return;

        const zSpawn = -350; // Assez loin
        const sides = [ -1, 1 ]; // On tente de spawn de chaque côté

        sides.forEach(side => {
            if (Math.random() > 0.3) {
                // Création de l'élément (Building, Néon, etc.)
                const element = new CityScapeElement(side, zSpawn, getProjection, state.params.color);
                this.scene.add(element.mesh);
                this.scenery.push(element);
            }
        });

        this.lastSceneryZ = currentDistance;
    }

    update(state, getProjection) {
        const pos = this.mesh.geometry.attributes.position;
        const isGlitch = state.triggers && state.triggers.glitch;

        const speed = state.params.speed || 0.5;
        this.gridMaterial.map.offset.y += speed * 0.05;

        for (let i = 0; i < pos.count; i++) {
            const ix = this.baseVertices[i * 3];
            const iz = this.baseVertices[i * 3 + 2];

            // On passe bien ix pour le calcul de l'inclinaison (slope)
            const proj = getProjection(iz, ix);

            // IMPORTANT : On garde ix et on AJOUTE la courbure proj.x
            let finalX = ix + proj.x;
            let finalY = proj.y;

            if (isGlitch) {
                finalX += Math.sin(i * 0.5) * 2.0;
                finalY += (Math.random() - 0.5) * 4.0;
            }

            pos.setXYZ(i, finalX, finalY, iz);
        }

        pos.needsUpdate = true;
        this.grid.geometry.attributes.position.copy(pos);
        this.grid.geometry.attributes.position.needsUpdate = true;

        const targetOpacity = state.params.gridOpacity !== undefined ? state.params.gridOpacity : 1;
        const currentOpacity = isGlitch ? Math.random() : targetOpacity;

        this.grid.material.opacity = currentOpacity;
        this.grid.material.color.copy(state.params.color);
        this.mesh.material.opacity = currentOpacity;

        this.spawnScenery(state, getProjection);

        for (let i = this.scenery.length - 1; i >= 0; i--) {
            const el = this.scenery[i];
            el.updatePosition(state.speed, state.delta, getProjection);
            el.animate(state.time);

            // Suppression si derrière la caméra (z > 50)
            if (el.mesh.position.z > 50) {
                this.scene.remove(el.mesh);
                if(el.dispose) el.dispose();
                this.scenery.splice(i, 1);
            }
        }
    }

    triggerScreenFlash(colorHex) {
        const flashDiv = document.createElement('div');

        // Conversion du hex (0xffffff) en string CSS (#ffffff)
        const cssColor = `#${colorHex.toString(16).padStart(6, '0')}`;

        flashDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: ${cssColor};
            z-index: 9999;
            pointer-events: none;
            opacity: 0.7;
        `;

        document.body.appendChild(flashDiv);

        // Suppression rapide pour l'effet de flash
        setTimeout(() => {
            flashDiv.remove();
        }, 60); // Durée du flash en ms
    }

    triggerLightning() {
        // 1. Nettoyage de sécurité avant de dessiner
        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);

        // 2. Configuration du style
        this.lCtx.strokeStyle = '#ffffff';
        this.lCtx.lineWidth = 3;
        this.lCtx.shadowBlur = 15;
        this.lCtx.shadowColor = '#ffffff';

        // 3. Dessin de la trajectoire
        this.lCtx.beginPath();
        let x = Math.random() * this.lCanvas.width;
        let y = 0;
        this.lCtx.moveTo(x, y);

        while (y < this.lCanvas.height) {
            x += (Math.random() - 0.5) * 150;
            y += Math.random() * 80 + 30;
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();

        // 4. EFFACEMENT AUTOMATIQUE (Le secret de la brièveté)
        // 50ms à 80ms est la durée idéale pour un éclair réaliste
        setTimeout(() => {
            this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        }, 60);
    }
}
