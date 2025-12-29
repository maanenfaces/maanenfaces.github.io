import * as THREE from 'three';

export class RoadManager {
    constructor(scene) {
        this.scene = scene;
        this.roadSegments = [];
        this.segmentLength = 10;
        this.laneWidth = 5;
        this.zOffset = 0;
        this.curveFactor = 0;
    }

    createSegment(zPos, color, alpha) {
        const group = new THREE.Group();

        // --- SOL (TERRAIN) ---
        const groundGeo = new THREE.PlaneGeometry(200, this.segmentLength, 40, 1);
        groundGeo.rotateX(-Math.PI / 2);

        const groundFill = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({
            color: color, wireframe: false, transparent: true, opacity: 0.1
        }));
        const groundWire = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial({
            color: color, wireframe: true, transparent: true, opacity: 0.3
        }));
        group.add(groundFill, groundWire);

        // --- PISTE CENTRALE (ROUTE) ---
        const laneGeo = new THREE.PlaneGeometry(this.laneWidth * 3, this.segmentLength, 3, 1);
        laneGeo.rotateX(-Math.PI / 2);

        const laneFill = new THREE.Mesh(laneGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff, transparent: true, opacity: 0.1
        }));
        laneFill.position.y = 0.01;

        const laneWire = new THREE.Mesh(laneGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff, wireframe: true, transparent: true, opacity: 0.8
        }));
        laneWire.position.y = 0.02;
        group.add(laneFill, laneWire);

        // Fond noir
        const solidMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(200, this.segmentLength).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 })
        );
        solidMesh.position.y = -0.1;
        group.add(solidMesh);

        // --- LIGNES ---
        // CORRECTION : On recrée la géométrie pour chaque segment pour éviter les bugs de Culling (disparition)
        const lineGeo = new THREE.PlaneGeometry(0.2, this.segmentLength);
        lineGeo.rotateX(-Math.PI / 2);

        const lineMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -4,
            polygonOffsetUnits: 1
        });

        const leftLine = new THREE.Mesh(lineGeo, lineMat);
        leftLine.position.set(-(this.laneWidth * 1.5), 0.04, 0);
        leftLine.frustumCulled = false; // Force l'affichage même si le moteur pense qu'elle est hors champ

        const rightLine = new THREE.Mesh(lineGeo, lineMat);
        rightLine.position.set((this.laneWidth * 1.5), 0.04, 0);
        rightLine.frustumCulled = false; // Force l'affichage

        // Force le rendu des lignes après le reste
        leftLine.renderOrder = 2;
        rightLine.renderOrder = 2;

        group.add(leftLine, rightLine);

        // Stockage des références
        group.userData = { groundFill, groundWire, laneFill, laneWire, solidMesh, leftLine, rightLine, needsContent: true };

        group.position.z = -zPos;
        this.scene.add(group);
        this.roadSegments.push(group);
        return group;
    }

    update(speed, delta, time, phase, currentGridColor, currentFloorAlpha) {
        // 1. Mise à jour de la progression globale (pour le bruit/vagues)
        this.zOffset += speed * delta;
        this.curveFactor = Math.sin(time * 0.5) * (phase.curveStrength || 0);

        const waveAmp = phase.waveHeight || 0;
        const waveType = phase.waveType || 1;

        // Fonction interne pour calculer la hauteur (Y) selon le Z
        const getWaveY = (z) => {
            if (waveType === 2) {
                return (Math.sin(time * 2 + z * 0.2) + Math.cos(time * 1.5 + z * 0.1)) * 0.6 * waveAmp;
            }
            return Math.sin(time * 2 + z * 0.1) * waveAmp;
        };

        // 2. Boucle sur chaque segment de route
        this.roadSegments.forEach(seg => {
            // Déplacement du segment vers la caméra
            // Note: On utilise delta pour garantir la même vitesse quel que soit le FPS
            seg.position.z += speed * delta;

            // --- SYSTEME DE RECYCLAGE (POOLING) ---
            // Si le segment dépasse 10 unités derrière la caméra (z > 10)
            if (seg.position.z > 15) {
                // On le renvoie tout au bout de la file (à l'horizon)
                // Calcul : Position actuelle - (Nombre de segments * Longueur d'un segment)
                seg.position.z -= this.roadSegments.length * this.segmentLength;
            }

            // 3. Calcul de la position X (Courbure)
            // On utilise zOffset pour que la courbe "défile" avec la route
            seg.position.x = Math.sin((seg.position.z + this.zOffset) * 0.02) * this.curveFactor;

            // 4. Calcul de la position Y (Ondulations)
            const y = getWaveY(seg.position.z);
            seg.position.y = y;

            // 5. Calcul de la rotation (Tangente)
            // On regarde la hauteur un peu plus loin pour incliner le segment
            const step = 1.0;
            const nextY = getWaveY(seg.position.z + step);
            seg.rotation.x = Math.atan((nextY - y) / step);

            // 6. Mise à jour visuelle (Couleurs et Opacité)
            const ud = seg.userData;
            const isVisible = currentFloorAlpha > 0.01;

            // Sol et Grillage
            if (ud.groundFill) {
                ud.groundFill.material.color.copy(currentGridColor);
                ud.groundFill.material.opacity = 0.1 * currentFloorAlpha;
                ud.groundFill.visible = isVisible;
            }
            if (ud.groundWire) {
                ud.groundWire.material.color.copy(currentGridColor);
                ud.groundWire.material.opacity = 0.3 * currentFloorAlpha;
                ud.groundWire.visible = isVisible;
            }

            // Piste centrale
            if (ud.laneFill) {
                ud.laneFill.material.opacity = 0.1 * currentFloorAlpha;
                ud.laneFill.visible = isVisible;
            }
            if (ud.laneWire) {
                ud.laneWire.material.opacity = 0.8 * currentFloorAlpha;
                ud.laneWire.visible = isVisible;
            }
            if (ud.solidMesh) {
                ud.solidMesh.material.opacity = currentFloorAlpha;
                ud.solidMesh.visible = isVisible;
            }

            // --- LIGNES LATÉRALES (Correction visuelle) ---
            // On s'assure qu'elles restent toujours opaques et visibles
            if (ud.leftLine && ud.rightLine) {
                ud.leftLine.visible = true;
                ud.rightLine.visible = true;
                ud.leftLine.material.opacity = 1.0;
                ud.rightLine.material.opacity = 1.0;

                // On force l'ordre de rendu pour éviter qu'elles passent sous le sol noir
                ud.leftLine.renderOrder = 10;
                ud.rightLine.renderOrder = 10;
            }
        });
    }
}
