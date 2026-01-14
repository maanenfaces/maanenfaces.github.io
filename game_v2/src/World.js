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

export class FlyingShip extends BasicCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'flying_ship';

        // --- CONFIGURATION ---
        this.altitude = 12 + Math.random() * 20;
        this.baseSpeed = 0.2 + Math.random() * 0.4;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);

        this.vx = (Math.random() - 0.5) * 25;
        this.currentXOffset = (Math.random() - 0.5) * 180;

        // --- ÉTATS ---
        this.age = 0;
        this.isExploding = false;
        this.isGhosting = false;
        this.explosionTimer = 0;
        this.isActive = true;
        this.glitchPalette = [new THREE.Color(0xffffff), this.wireColor, new THREE.Color(0xff00ff)];

        this.shipGroup = new THREE.Group();
        this.mesh.add(this.shipGroup);

        this.modules = [];
        this._generateComplexShape();
    }

    _generateComplexShape() {
        const mainW = 4 + Math.random() * 4;
        const mainH = 0.8 + Math.random() * 0.5;
        const mainD = 10 + Math.random() * 10;
        this._addModule(mainW, mainH, mainD, 0, 0, 0);

        const numModules = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numModules; i++) {
            const mW = (Math.random() > 0.5) ? mainW * 2.5 : mainW * 0.6;
            const mH = mainH * (0.5 + Math.random());
            const mD = mainD * (0.2 + Math.random() * 0.5);
            const offsetZ = (Math.random() - 0.5) * mainD * 0.8;
            this._addModule(mW, mH, mD, 0, (Math.random() - 0.5), offsetZ);
        }
    }

    _addModule(w, h, d, x, y, z) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const bMat = new THREE.MeshBasicMaterial({ color: 0x020202, transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(geo, bMat);
        mesh.position.set(x, y, z);
        this.shipGroup.add(mesh);

        const eMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.8 });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), eMat);
        mesh.add(edges);

        const tMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const tri = new THREE.LineSegments(new THREE.WireframeGeometry(geo), tMat);
        mesh.add(tri);

        this.modules.push({
            mesh: mesh,
            body: bMat,
            edge: eMat,
            triMat: tMat,
            triObj: tri,
            isFalling: false,
            delay: Math.random() * 1.5,
            // --- NOUVELLES FORCES DE DÉSORDRE ---
            fallSpeed: 0.1 + Math.random() * 0.2,
            drift: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5),
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            ),
            jitter: 0.5 + Math.random() * 1.2
        });
    }

    getTopPosition() {
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);
        pos.y += 2;
        return pos;
    }

    animate(time) {
        if (this.isExploding) {
            this.explosionTimer += 0.016;
            const fade = Math.max(0, 1 - this.explosionTimer * 0.4);

            this.modules.forEach(m => {
                if (this.explosionTimer > m.delay) m.isFalling = true;

                if (m.isFalling) {
                    // 1. DÉSORDRE DE POSITION (Chute + Dérive + Tremblement)
                    m.mesh.position.y -= m.fallSpeed;
                    m.mesh.position.x += m.drift.x + (Math.random() - 0.5) * m.jitter;
                    m.mesh.position.z += m.drift.z + (Math.random() - 0.5) * m.jitter;

                    // 2. DÉSORDRE DE ROTATION (N'importe quel sens)
                    m.mesh.rotation.x += m.rotSpeed.x;
                    m.mesh.rotation.y += m.rotSpeed.y;
                    m.mesh.rotation.z += m.rotSpeed.z;

                    // 3. GLITCH VISUEL AGRESSIF
                    const glitch = Math.random();
                    if (glitch > 0.9) {
                        m.triObj.visible = true;
                        m.triMat.opacity = fade;
                        m.triMat.color.copy(this.glitchPalette[Math.floor(Math.random() * 3)]);
                        // Déformation brutale
                        m.mesh.scale.set(Math.random() * 3, Math.random() * 0.5, Math.random() * 3);
                    } else if (glitch > 0.8) {
                        m.mesh.visible = false; // "Flicker" (clignotement)
                    } else {
                        m.triObj.visible = false;
                        m.mesh.visible = true;
                        m.mesh.scale.set(1, 1, 1);
                    }

                    // 4. FADE
                    m.edge.opacity = fade * 0.8;
                    m.body.opacity = fade * 0.3;
                }
            });

            if (fade <= 0) this.isActive = false;
            return;
        }

        // ... Reste de l'animation normale (ghosting, etc.)
        const fastTick = Math.floor(time * 60) % 2 === 0;
        this.modules.forEach(m => {
            if (this.isGhosting) {
                m.triObj.visible = fastTick;
                m.triMat.opacity = fastTick ? 1.0 : 0;
                m.body.opacity = 0.1;
                m.mesh.position.x += (Math.random() - 0.5) * 0.2;
            } else {
                m.triObj.visible = false;
                m.body.opacity = 0.6;
                m.mesh.position.x *= 0.9;
                // On s'assure que la rotation revient à 0 après un ghosting
                m.mesh.rotation.set(0, 0, 0);
            }
        });
        this.shipGroup.position.y = Math.sin(time * 0.5) * 0.3;
    }

    updatePosition(speed, delta, getProjection, allElements) {
        // On stoppe l'avancée Z au moment précis de l'explosion pour voir les morceaux tomber
        if (this.isExploding) {
             // On peut laisser une inertie résiduelle (10% de la vitesse)
             this.z += (speed * this.baseSpeed * 0.1) * delta;
        } else {
             this.z += (speed * this.baseSpeed) * delta;
        }

        this.age += delta;
        this.currentXOffset += this.vx * delta;

        // Collision & Destruction
        this.isGhosting = false;
        if (allElements && !this.isExploding) {
            for (let el of allElements) {
                if (el !== this && el.type === 'city_scape_element') {
                    const dz = Math.abs(el.z - this.z);
                    const dx = Math.abs(el.mesh.position.x - (this.mesh.position.x));

                    if (dz < 12 && dx < 18) {
                        this.isGhosting = true;
                        if (this.age > 10 && Math.random() > 0.985) {
                            this.isExploding = true;
                        }
                        break;
                    }
                }
            }
        }

        const proj = getProjection(this.z, 0);
        if (proj) {
            this.mesh.position.set(proj.x + this.currentXOffset, proj.y + this.altitude, this.z);
            this.mesh.rotation.z = (proj.rollAngle || 0) * 0.1;
        }
    }

    dispose() {
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}

export class World {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Liste spécifique pour le décor (CityScape)
        this.scenery = [];
        this.lastSceneryZ = 0;
        this.activeArcs = [];

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

    getCanvasPos(obj) {
        const vector = obj.getTopPosition();
        vector.project(this.camera);
        return {
            x: (vector.x * 0.5 + 0.5) * this.lCanvas.width,
            y: (-(vector.y * 0.5) + 0.5) * this.lCanvas.height
        };
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
            if (Math.random() > 0.1) {
                // Création de l'élément (Building, Néon, etc.)
                const element = new CityScapeElement(side, zSpawn, getProjection, state.params.color);
                this.scene.add(element.mesh);
                this.scenery.push(element);
            }

            if (Math.random() > 0.6) {
                const ship = new FlyingShip(side * 1.5, zSpawn, getProjection, state.params.color);
                this.scene.add(ship.mesh);
                this.scenery.push(ship);
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
            el.updatePosition(state.speed, state.delta, getProjection, this.scenery);
            el.animate(state.time);

            if (el.mesh.position.z > 50 || el.isActive === false) {
                this.scene.remove(el.mesh);
                if(el.dispose) el.dispose();
                this.scenery.splice(i, 1);
            }
        }

        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        for (let i = this.activeArcs.length - 1; i >= 0; i--) {
            const arc = this.activeArcs[i];

            // Recalcul des positions 2D à chaque frame
            const p1 = this.getCanvasPos(arc.startNode);
            const p2 = this.getCanvasPos(arc.endNode);

            // Dessin
            this.drawArcUpdate(p1, p2, arc.color, arc.life, arc.seed);

            // Réduction de la vie
            arc.life -= arc.decay;
            if (arc.life <= 0) {
                this.activeArcs.splice(i, 1);
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

    triggerCityLightning(state, camera, threshold = 0.98) {
        if (Math.random() < threshold) return;

        // Filtrer les candidats visibles
        const candidates = this.scenery.filter(el => el.z < 0 && el.z > -300);
        if (candidates.length < 2) return;

        const startNode = candidates[Math.floor(Math.random() * candidates.length)];
        const endNode = candidates[Math.floor(Math.random() * candidates.length)];
        if (startNode === endNode) return;

        // On stocke l'arc avec une durée de vie (life)
        this.activeArcs.push({
            startNode: startNode,
            endNode: endNode,
            life: 1.0, // de 1.0 à 0.0
            decay: 0.15, // Vitesse de disparition
            color: state.params.color.getStyle(),
            seed: Math.random() // Pour garder le même "jitter" pendant l'éclair
        });
    }

    drawArcUpdate(p1, p2, color, life, seed) {
        this.lCtx.save();
        this.lCtx.strokeStyle = `rgba(255, 255, 255, ${life})`;
        this.lCtx.lineWidth = 2 * life;
        this.lCtx.shadowBlur = 15 * life;
        this.lCtx.shadowColor = color;

        this.lCtx.beginPath();
        this.lCtx.moveTo(p1.x, p1.y);

        const steps = 8;
        for (let i = 1; i <= steps; i++) {
            const t = i / steps;
            let x = p1.x + (p2.x - p1.x) * t;
            let y = p1.y + (p2.y - p1.y) * t;

            if (i < steps) {
                // Utilisation du seed pour une forme stable mais vibrante
                const jitter = 30 * life;
                x += (Math.sin(i + seed * 10) * jitter);
                y += (Math.cos(i + seed * 10) * jitter);
            }
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();
        this.lCtx.restore();
    }

}
