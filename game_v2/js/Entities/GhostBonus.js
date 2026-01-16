import * as THREE from 'three';
import { Bonus } from './Bonus.js';

export class GhostBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'ghost';
        this.name = "GHOST";
        this.color = 0xff00ff;
        this.colorHex = '#ff00ff';

        const geo = new THREE.IcosahedronGeometry(1.2, 0);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: true });

        this.initMesh(geo, mat, 1.8);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        // Rotation complexe sur deux axes
        this.bonusMesh.rotation.x += 0.02;
        this.bonusMesh.rotation.z += 0.03;
    }
}
