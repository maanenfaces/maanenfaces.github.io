import * as THREE from 'three';
import { Building2 } from './Building2.js';

export class BurningBuilding extends Building2 {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection, roadColor);
        this.type = 'burning_building';

        // Palette cyberpunk incandescente (Lave, Plasma, Blanc sursaturé)
        this.coreColor = new THREE.Color(0xff2200);
        this.flameYellow = new THREE.Color(0xffcc00);
        this.ashColor = new THREE.Color(0x050505);

        // Assombrissement brutal de la structure (suie / métal calciné)
        this.wireColor.set(0xff3300);
        this.baseColor = 0x020202;

        this._applyChaoticDestructionAndFire();
    }

    _applyChaoticDestructionAndFire() {
        this.debrisList = [];
        this.flameParticles = [];
        const totalFloors = this.floors.length;

        this.floors.forEach((floor, index) => {
            const ratio = index / totalFloors;

            // 1. CHAOS STRUCTUREL : Plus on monte, plus c'est éventré et désaxé
            if (ratio > 0.3) {
                floor.group.rotation.x = (Math.random() - 0.5) * 0.8;
                floor.group.rotation.y = (Math.random() - 0.5) * 1.2;
                floor.group.rotation.z = (Math.random() - 0.5) * 0.7;

                // Décalage violent des blocs pour faire "immeuble coupé en deux"
                floor.group.position.x += (Math.random() - 0.5) * 4;
                floor.group.position.z += (Math.random() - 0.5) * 4;

                // Suppression pure et simple de certains étages au milieu du brasier
                if (Math.random() > 0.65) {
                    floor.group.visible = false;
                    return;
                }
            }

            // Arêtes calcinées et sur-brillantes
            if (floor.edgeMat) {
                floor.edgeMat.color.copy(this.wireColor);
                floor.edgeMat.opacity = 1.0;
            }

            // 2. LE FEU : Génération de multiples langues de feu agressives (Wireframe & Lignes brisées)
            if (ratio > 0.2 && Math.random() > 0.2) {
                const flameGroup = new THREE.Group();

                // Geometrie de feu chaotique (zigzags verticaux)
                const points = [];
                let currentPoint = new THREE.Vector3(0, 0, 0);
                points.push(currentPoint.clone());

                const segments = 4 + Math.floor(Math.random() * 4);
                for (let s = 0; s < segments; s++) {
                    currentPoint.add(new THREE.Vector3(
                        (Math.random() - 0.5) * 3,
                        2 + Math.random() * 3,
                        (Math.random() - 0.5) * 3
                    ));
                    points.push(currentPoint.clone());
                }

                const flameGeo = new THREE.BufferGeometry().setFromPoints(points);
                const flameMat = new THREE.LineBasicMaterial({
                    color: Math.random() > 0.4 ? this.coreColor : this.flameYellow,
                    transparent: true,
                    opacity: 0.9,
                    linewidth: 3
                });

                const flameLine = new THREE.Line(flameGeo, flameMat);

                // Position aléatoire sur l'étage
                flameLine.position.set(
                    (Math.random() - 0.5) * 5,
                    0,
                    (Math.random() - 0.5) * 5
                );

                floor.group.add(flameLine);
                this.flameParticles.push({
                    mesh: flameLine,
                    mat: flameMat,
                    originalPoints: points,
                    speed: 8 + Math.random() * 12
                });
            }

            // 3. DÉBRIS FLOTTANTS / PROJECTIONS (Morceaux de structures arrachés autour du bâtiment)
            if (ratio > 0.5 && Math.random() > 0.5) {
                const debrisGeo = new THREE.BoxGeometry(1 + Math.random() * 2, 0.2, 1 + Math.random() * 2);
                const debrisMat = new THREE.LineBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.8 });
                const debris = new THREE.LineSegments(new THREE.EdgesGeometry(debrisGeo), debrisMat);

                debris.position.set(
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 4,
                    (Math.random() - 0.5) * 8
                );
                floor.group.add(debris);
                this.debrisList.push(debris);
            }
        });
    }

    animate(time) {
        super.animate(time);
        if (!this.buildingGroup.visible) return;

        const t = time * 0.01 || Date.now() * 0.005;

        // Animation agressive des flammes (le feu crépite, ondule et stroboscope)
        this.flameParticles.forEach((fp, idx) => {
            fp.mesh.rotation.y = Math.sin(t * 3 + idx) * 0.5;

            // Échelle fluctuante (effet de souffle de chaleur)
            const scaleV = 1.0 + Math.sin(t * fp.speed + idx) * 0.3;
            fp.mesh.scale.set(scaleV, scaleV * (1 + Math.sin(t * 15) * 0.2), scaleV);

            // Flashs stroboscopiques de surchauffe
            if (Math.random() > 0.75) {
                fp.mat.color.setHex(0xffffff); // Blanc plasma
            } else {
                fp.mat.color.copy(idx % 2 === 0 ? this.coreColor : this.flameYellow);
            }
        });

        // Rotation lente et chaotique des débris projetés autour de la tour
        this.debrisList.forEach((debris, idx) => {
            debris.rotation.x += 0.05 * (idx % 2 === 0 ? 1 : -1);
            debris.rotation.z += 0.03;
        });

        // Tremblement violent de tout le bloc (structure sur le point de s'effondrer)
        this.buildingGroup.position.x = (Math.random() - 0.5) * 0.5;
        this.buildingGroup.position.z = (Math.random() - 0.5) * 0.5;
    }
}
