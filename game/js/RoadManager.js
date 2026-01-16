import * as THREE from 'three';

export class RoadManager {
    constructor(scene) {
        this.scene = scene;
        this.roadSegments = [];
        this.segmentLength = 10;
        this.laneWidth = 15; // Largeur de la route centrale
        this.terrainWidth = 400;
        this.terrainDepth = 300;
        this.zOffset = 0;
        this.time = 0;
        this.phase = {};

        this.segmentsZ = 120;
        this.segmentsX = 60;

        this.initRoad();
    }

    initRoad() {
        // 1. LA NAPPE PRINCIPALE (Sol noir + Grille)
        this.geometry = new THREE.PlaneGeometry(this.terrainWidth, this.terrainDepth, this.segmentsX, this.segmentsZ);
        this.geometry.rotateX(-Math.PI / 2);

        this.solidMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        this.wireMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true, transparent: true, opacity: 0.2 });

        this.mainMesh = new THREE.Mesh(this.geometry, this.solidMat);
        this.wireMesh = new THREE.Mesh(this.geometry, this.wireMat);
        this.wireMesh.position.y = 0.01;

        // 2. LA ROUTE CENTRALE (Bande gris foncé/bleuté)
        this.roadGeo = new THREE.PlaneGeometry(this.laneWidth, this.terrainDepth, 10, this.segmentsZ);
        this.roadGeo.rotateX(-Math.PI / 2);
        this.roadMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.5 });
        this.roadMesh = new THREE.Mesh(this.roadGeo, this.roadMat);
        this.roadMesh.position.y = 0.02;

        // 3. LES LIGNES DE BORDURE (Néon)
        const lineGeo = new THREE.PlaneGeometry(0.5, this.terrainDepth, 1, this.segmentsZ);
        lineGeo.rotateX(-Math.PI / 2);
        this.lineMat = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

        this.leftLine = new THREE.Mesh(lineGeo, this.lineMat);
        this.rightLine = new THREE.Mesh(lineGeo, this.lineMat);
        this.leftLine.position.y = 0.03;
        this.rightLine.position.y = 0.03;

        this.scene.add(this.mainMesh, this.wireMesh, this.roadMesh, this.leftLine, this.rightLine);

        // Sauvegarde des positions initiales
        this.basePos = this.geometry.attributes.position.array.slice();
        this.baseRoadPos = this.roadGeo.attributes.position.array.slice();
        this.baseLinePos = lineGeo.attributes.position.array.slice();
    }

    getTerrainData(z) {
        const worldZ = z - this.zOffset;
        const waveAmp = this.phase.waveHeight || 0;
        const curveStr = this.phase.curveStrength || 0;

        const y = Math.sin(this.time * 2 + worldZ * 0.1) * waveAmp;
        const x = Math.sin(worldZ * 0.02 + this.time * 0.5) * curveStr * 20;

        return { x, y };
    }

    createSegment(zPos) {
        const anchor = new THREE.Group();
        anchor.position.z = -zPos;
        this.scene.add(anchor);
        this.roadSegments.push(anchor);
        return anchor;
    }

    update(speed, delta, time, phase, currentGridColor) {
        this.zOffset += speed * delta;
        this.time = time;
        this.phase = phase;

        this.wireMat.color.copy(currentGridColor);
        this.lineMat.color.copy(currentGridColor);

        // Mise à jour de la déformation pour TOUS les éléments visuels
        this._applyDeformation(this.geometry, this.basePos);
        this._applyDeformation(this.roadGeo, this.baseRoadPos);
        this._applyDeformation(this.leftLine.geometry, this.baseLinePos, -this.laneWidth/2);
        this._applyDeformation(this.rightLine.geometry, this.baseLinePos, this.laneWidth/2);
    }

    _applyDeformation(geo, baseArray, xOffsetLocal = 0) {
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const initX = baseArray[i * 3] + xOffsetLocal;
            const initZ = baseArray[i * 3 + 2];
            const data = this.getTerrainData(initZ);
            pos.setXYZ(i, initX + data.x, data.y, initZ);
        }
        pos.needsUpdate = true;
    }
}
