import * as THREE from 'three';

import { BigBossMachine } from './BigBossMachine.js';
import { HorizonCity } from './HorizonCity.js';

// Texts
import { GlitchTextScreen } from './Texts/GlitchTextScreen.js';
import { PropagandaBillboard } from './Texts/PropagandaBillboard.js';
import { PropagandaBillboardFloating } from './Texts/PropagandaBillboardFloating.js';

// Buildings
import { Building } from './Buildings/Building.js';
import { Building2 } from './Buildings/Building2.js';
import { BurningBuilding } from './Buildings/BurningBuilding.js';
import { BurningBuilding2 } from './Buildings/BurningBuilding2.js';
import { ExplodingBuilding } from './Buildings/ExplodingBuilding.js';

// Ships
import { FlyingShip } from './Ships/FlyingShip.js';
import { BurningFlyingShip } from './Ships/BurningFlyingShip.js';

// Robots
import { GiantRobot } from './Robots/GiantRobot.js';
import { GiantRobot2 } from './Robots/GiantRobot2.js';
import { GiantRobot3 } from './Robots/GiantRobot3.js';

export class World {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Liste spécifique pour le décor (CityScape)
        this.scenery = [];
        this.lastSceneryZ = 0;
        this.activeArcs = [];
        this.horizonCityInstance = null;
        this.bigBossMachineInstance = null;
        this.glitchScreenInstance = null;

        // Cache pour éviter de recharger la même texture en boucle
        this.textureCache = {};
        this.textureLoader = new THREE.TextureLoader();

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
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(40, 40); // Nombre de répétitions de la grille

        gridTexture.magFilter = THREE.NearestFilter;
        gridTexture.minFilter = THREE.LinearMipmapLinearFilter;
        gridTexture.anisotropy = 16;

        // Mesh de base du sol (par défaut en couleur unie)
        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
        }));

        // Matériau de la grille
        this.gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            map: gridTexture,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.grid = new THREE.Mesh(geo, this.gridMaterial);
        this.grid.position.y = 0.02;

        this.scene.add(this.mesh, this.grid);
        this.scene.fog = new THREE.Fog(0x000000, 600, 1000);

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

    // Méthode utilitaire pour récupérer ou charger une texture de manière sécurisée
    getTexture(url) {
        if (!url) return null;
        if (this.textureCache[url]) {
            return this.textureCache[url];
        }

        const texture = this.textureLoader.load(url, (loadedTex) => {
            loadedTex.wrapS = THREE.RepeatWrapping;
            loadedTex.wrapT = THREE.RepeatWrapping;
            loadedTex.repeat.set(20, 20); // Répétition de la texture sur le sol
            loadedTex.anisotropy = 16;
            loadedTex.needsUpdate = true;
        });

        this.textureCache[url] = texture;
        return texture;
    }

    getCanvasPos(obj) {
        const vector = obj.getTopPosition();
        vector.project(this.camera);
        return {
            x: (vector.x * 0.5 + 0.5) * this.lCanvas.width,
            y: (-(vector.y * 0.5) + 0.5) * this.lCanvas.height
        };
    }

    getRandomElementClass(elementsConfig) {
        const classRegistry = {
            "Building": Building,
            "Building2": Building2,
            "BurningBuilding": BurningBuilding,
            "BurningBuilding2": BurningBuilding2,
            "BurningFlyingShip": BurningFlyingShip,
            "ExplodingBuilding": ExplodingBuilding,
            "FlyingShip": FlyingShip,
            "GiantRobot": GiantRobot,
            "GiantRobot2": GiantRobot2,
            "GiantRobot3": GiantRobot3,
            "GlitchTextScreen": GlitchTextScreen,
            "PropagandaBillboard": PropagandaBillboard,
            "PropagandaBillboardFloating": PropagandaBillboardFloating
        };

        const totalWeight = elementsConfig.reduce((sum, el) => sum + el.weight, 0);
        let randomVal = Math.random() * totalWeight;

        let chosenElement = elementsConfig[0];
        for (let el of elementsConfig) {
            if (randomVal < el.weight) {
                chosenElement = el;
                break;
            }
            randomVal -= el.weight;
        }

        if (typeof chosenElement.class === 'string') {
            return classRegistry[chosenElement.class] || Building;
        }

        return chosenElement.class;
    }

    spawnScenery(state, getProjection) {
        const currentDistance = state.zOffset;
        const sceneryConfig = state.phase && state.phase.scenery;

        if (sceneryConfig && sceneryConfig.horizonCity && sceneryConfig.horizonCity.enabled) {
            if (!this.horizonCityInstance || !this.horizonCityInstance.isActive) {
                if (this.horizonCityInstance) {
                    this.scene.remove(this.horizonCityInstance.mesh);
                    if (this.horizonCityInstance.dispose) this.horizonCityInstance.dispose();
                }
                this.horizonCityInstance = new HorizonCity(getProjection, sceneryConfig.horizonCity.duration, state.params.color);
                this.scene.add(this.horizonCityInstance.mesh);
            }
        }

        if (sceneryConfig && sceneryConfig.bigBossMachine && sceneryConfig.bigBossMachine.enabled) {
            if (!this.bigBossMachineInstance || !this.bigBossMachineInstance.isActive) {
                if (this.bigBossMachineInstance) {
                    this.scene.remove(this.bigBossMachineInstance.mesh);
                    if (this.bigBossMachineInstance.dispose) this.bigBossMachineInstance.dispose();
                }
                const appearTime = sceneryConfig.bigBossMachine.appearStartTime !== undefined ? sceneryConfig.bigBossMachine.appearStartTime : 35.0;
                this.bigBossMachineInstance = new BigBossMachine(getProjection, sceneryConfig.bigBossMachine.duration, state.params.color, appearTime);
                this.scene.add(this.bigBossMachineInstance.mesh);
            }
        }

        if (!sceneryConfig || !sceneryConfig.elements) return;

        // Initialisation des compteurs de distance si inexistants
        if (this.lastSceneryZ === undefined) this.lastSceneryZ = currentDistance;
        if (this.lastBillboardZ === undefined) this.lastBillboardZ = currentDistance;

        // --- 1. GESTION DES ÉLÉMENTS DE DÉCOR CLASSIQUES (on exclut TOUS les billboards) ---
        const densityInterval = sceneryConfig.spawnInterval || 40;
        if (currentDistance - this.lastSceneryZ >= densityInterval) {
            const zSpawn = -350;
            const sides = [ -1, 1 ];

            sides.forEach(side => {
                const spawnChance = sceneryConfig.density !== undefined ? sceneryConfig.density : 0.8;
                if (Math.random() < spawnChance) {
                    // On exclut tous les types de billboards des décors classiques
                    const standardConfig = sceneryConfig.elements.filter(el =>
                        el.class !== "PropagandaBillboard" && el.class !== PropagandaBillboard &&
                        el.class !== "PropagandaBillboardFloating" && el.class !== PropagandaBillboardFloating
                    );

                    if (standardConfig.length > 0) {
                        const ElementClass = this.getRandomElementClass(standardConfig);
                        if (typeof ElementClass === 'function') {
                            const element = new ElementClass(side, zSpawn, getProjection, state.params.color);
                            if (element) {
                                this.scene.add(element.mesh);
                                this.scenery.push(element);
                            }
                        }
                    }
                }
            });
            this.lastSceneryZ = currentDistance;
        }

        // --- 2. GESTION DES BILLBOARDS (PropagandaBillboard ou PropagandaBillboardFloating) ---
        const billboardInterval = 400;

        if (currentDistance - this.lastBillboardZ >= billboardInterval) {
            // On cherche l'un ou l'autre dans la configuration de la phase
            const billboardConfigEntry = sceneryConfig.elements.find(el =>
                el.class === "PropagandaBillboard" || el.class === PropagandaBillboard ||
                el.class === "PropagandaBillboardFloating" || el.class === PropagandaBillboardFloating
            );

            if (billboardConfigEntry) {
                const spawnChance = billboardConfigEntry.weight !== undefined ? billboardConfigEntry.weight : 0.3;

                if (Math.random() < spawnChance) {
                    const zHorizonSpawn = -1000;
                    const sides = [ -1, 1 ];
                    const randomSide = sides[Math.floor(Math.random() * sides.length)];

                    // Détermination dynamique de la bonne classe à instancier
                    let TargetBillboardClass = PropagandaBillboard;
                    if (billboardConfigEntry.class === "PropagandaBillboardFloating" || billboardConfigEntry.class === PropagandaBillboardFloating) {
                        TargetBillboardClass = PropagandaBillboardFloating;
                    }

                    const billboard = new TargetBillboardClass(randomSide, zHorizonSpawn, getProjection, state.params.color);
                    if (billboard) {
                        this.scene.add(billboard.mesh);
                        this.scenery.push(billboard);
                    }
                }
            }
            this.lastBillboardZ = currentDistance;
        }
    }

    update(state, getProjection) {
        const pos = this.mesh.geometry.attributes.position;
        const isGlitch = state.triggers && state.triggers.glitch;

        const speed = state.params.speed || 0.5;
        this.gridMaterial.map.offset.y += speed * 0.05;

        // Défilement de la texture du sol si active
        if (this.mesh.material.map) {
            this.mesh.material.map.offset.y += speed * 0.05;
        }

        for (let i = 0; i < pos.count; i++) {
            const ix = this.baseVertices[i * 3];
            const iz = this.baseVertices[i * 3 + 2];

            const proj = getProjection(iz, ix);

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

        // --- GESTION DE LA CONDITION hideGrid & floorTexture ---
        const hideGrid = state.phase.theme.hideGrid === true || state.phase.theme.solidFloor === true;
        const textureUrl = state.phase.theme.floorTexture;

        if (hideGrid) {
            // On masque la grille
            this.grid.visible = false;

            // Si une texture est configurée pour cette phase
            if (textureUrl) {
                const tex = this.getTexture(textureUrl);
                if (this.mesh.material.map !== tex) {
                    this.mesh.material.map = tex;
                    this.mesh.material.needsUpdate = true;
                }
                this.mesh.material.color.setHex(0xffffff); // Blanc pour garder les couleurs de la texture
            } else {
                // Pas de texture, on passe sur un sol de couleur unie (couleur du thème)
                this.mesh.material.map = null;
                this.mesh.material.needsUpdate = true;
                if (state.params.color) {
                    this.mesh.material.color.copy(state.params.color);
                }
            }
        } else {
            // Mode normal : on affiche la grille et on remet le sol par défaut
            this.grid.visible = true;
            this.mesh.material.map = null;
            this.mesh.material.needsUpdate = true;
            this.mesh.material.color.setHex(0x000000); // Fond noir classique sous la grille

            const targetOpacity = state.params.gridOpacity !== undefined ? state.params.gridOpacity : 1;
            const currentOpacity = isGlitch ? Math.random() : targetOpacity;

            this.grid.material.opacity = currentOpacity;
            this.grid.material.color.copy(state.params.color);
        }

        // Opacité globale du sol
        const baseMeshOpacity = state.params.floorOpacity !== undefined ? state.params.floorOpacity : 1.0;
        this.mesh.material.opacity = isGlitch ? Math.random() : baseMeshOpacity;
        // --------------------------------------------------------

        if (this.horizonCityInstance && this.horizonCityInstance.isActive) {
            this.horizonCityInstance.updatePosition(state.speed, state.delta, getProjection);
            this.horizonCityInstance.animate(state.time);
            if (!this.horizonCityInstance.isActive) {
                this.scene.remove(this.horizonCityInstance.mesh);
                this.horizonCityInstance.dispose();
                this.horizonCityInstance = null;
            }
        }

        if (this.bigBossMachineInstance && this.bigBossMachineInstance.isActive) {
            this.bigBossMachineInstance.updatePosition(state.speed, state.delta, getProjection);
            this.bigBossMachineInstance.animate(state.time);
            if (!this.bigBossMachineInstance.isActive) {
                this.scene.remove(this.bigBossMachineInstance.mesh);
                this.bigBossMachineInstance.dispose();
                this.bigBossMachineInstance = null;
            }
        }

        console.log(state);
        if (state.phase && state.phase.glitchScreen && state.phase.glitchScreen.enabled && state.phase.glitchScreen.enabled == true) {
            if (!this.glitchScreenInstance) {
                this.glitchScreenInstance = new GlitchTextScreen(state.phase.glitchScreen);
            }
            this.glitchScreenInstance.update(state.delta);
        } else {
            console.log("shoud dispose glitchScreenInstance");
            if (this.glitchScreenInstance) {
                console.log("dispose glitchScreenInstance");
                this.glitchScreenInstance.dispose();
                this.glitchScreenInstance = null;
            }
        }

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
            const p1 = this.getCanvasPos(arc.startNode);
            const p2 = this.getCanvasPos(arc.endNode);

            this.drawArcUpdate(p1, p2, arc.color, arc.life, arc.seed);

            arc.life -= arc.decay;
            if (arc.life <= 0) {
                this.activeArcs.splice(i, 1);
            }
        }
    }

    triggerScreenFlash(colorHex) {
        const flashDiv = document.createElement('div');
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
        setTimeout(() => {
            flashDiv.remove();
        }, 60);
    }

    triggerLightning() {
        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        this.lCtx.strokeStyle = '#ffffff';
        this.lCtx.lineWidth = 3;
        this.lCtx.shadowBlur = 15;
        this.lCtx.shadowColor = '#ffffff';

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

        setTimeout(() => {
            this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        }, 60);
    }

    triggerCityLightning(state, camera, threshold = 0.98) {
        if (Math.random() < threshold) return;

        const candidates = this.scenery.filter(el => el.z < 0 && el.z > -300);
        if (candidates.length < 2) return;

        const startNode = candidates[Math.floor(Math.random() * candidates.length)];
        const endNode = candidates[Math.floor(Math.random() * candidates.length)];
        if (startNode === endNode) return;

        this.activeArcs.push({
            startNode: startNode,
            endNode: endNode,
            life: 1.0,
            decay: 0.15,
            color: state.params.color.getStyle(),
            seed: Math.random()
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
                const jitter = 30 * life;
                x += (Math.sin(i + seed * 10) * jitter);
                y += (Math.cos(i + seed * 10) * jitter);
            }
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();
        this.lCtx.restore();
    }

    reset() {
        if (this.horizonCityInstance) {
            this.scene.remove(this.horizonCityInstance.mesh);
            this.horizonCityInstance.dispose();
            this.horizonCityInstance = null;
        }

        if (this.bigBossMachineInstance) {
            this.scene.remove(this.bigBossMachineInstance.mesh);
            this.bigBossMachineInstance.dispose();
            this.bigBossMachineInstance = null;
        }

        if (this.glitchScreenInstance) {
            this.glitchScreenInstance.dispose();
            this.glitchScreenInstance = null;
        }

        // 1. Nettoyage des éléments de décor (Buildings, Ships)
        this.scenery.forEach(el => {
            if (el.mesh) {
                this.scene.remove(el.mesh);
                if (el.dispose) el.dispose();
            }
        });
        this.scenery = [];
        this.lastSceneryZ = 0;

        // 2. Nettoyage des effets visuels (Éclairs entre bâtiments)
        this.activeArcs = [];
        if (this.lCtx) {
            this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        }

        // 3. Réinitialisation de la grille et du sol
        if (!this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        if (!this.scene.children.includes(this.grid)) {
            this.scene.add(this.grid);
        }

        // Remise à zéro du défilement des textures
        if (this.gridMaterial && this.gridMaterial.map) {
            this.gridMaterial.map.offset.y = 0;
            this.gridMaterial.map.offset.x = 0;
        }
        if (this.mesh.material.map) {
            this.mesh.material.map.offset.y = 0;
            this.mesh.material.map.offset.x = 0;
        }

        // 4. Remise à plat de la géométrie du terrain
        const pos = this.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, 0);
        }
        pos.needsUpdate = true;

        if (this.grid.geometry.attributes.position) {
            this.grid.geometry.attributes.position.copy(pos);
            this.grid.geometry.attributes.position.needsUpdate = true;
        }

        // 5. Reset du Fog (Brouillard)
        if (this.scene.fog) {
            this.scene.fog.near = 600;
            this.scene.fog.far = 1000;
            this.scene.fog.color.setHex(0x000000);
        }
    }

    getActiveSceneryElements() {
        return this.scenery ? this.scenery.filter(el => el.isActive) : [];
    }
}
