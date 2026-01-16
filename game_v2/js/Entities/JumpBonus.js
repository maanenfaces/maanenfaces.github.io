import * as THREE from 'three';
import { Bonus } from './Bonus.js';

export class JumpBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'jump';
        this.name = "jump";
        this.color = 0xffff00;
        this.colorHex = '#ffff00';

        const geo = new THREE.OctahedronGeometry(1);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: false });

        this.initMesh(geo, mat, 1.5);

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        this.bonusMesh.rotation.y += 0.05;
    }
}
