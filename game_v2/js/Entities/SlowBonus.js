import * as THREE from 'three';
import { Bonus } from './Bonus.js';

export class SlowBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'slow';
        this.name = "slow";
        this.color = 0x00ff00;
        this.colorHex = '#00ff00';

        const geo = new THREE.ConeGeometry(0.8, 1.8, 4);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: true });

        this.initMesh(geo, mat, 1.5);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        // Rotation toupie rapide
        this.bonusMesh.rotation.y += 0.15;
    }
}
