import * as THREE from 'three';
import { Bonus } from './Bonus.js';

export class PointBonus extends Bonus {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.subType = 'points';
        this.name = "50 PTS";
        this.color = 0xffffff;
        this.colorHex = '#ffffff';
        this.bonusDuration = 0;

        const geo = new THREE.IcosahedronGeometry(1, 0);
        const mat = new THREE.MeshBasicMaterial({ color: this.color, wireframe: false });

        // On garde l'échelle à 2 comme tu l'as mis
        this.initMesh(geo, mat, 2);
        this.bonusMesh.position.y = 1.5;

        const label = this.createTextLabel(this.name, this.colorHex);
        this.mesh.add(label);
    }

    applyCustomAnimation(t) {
        this.bonusMesh.rotation.y += 0.03;
        // On modifie l'animation pour qu'elle oscille AUTOUR de sa nouvelle hauteur (1.5)
        // Au lieu de osciller autour de 0
        this.bonusMesh.position.y = 1.5 + Math.sin(t * 5) * 0.2;
    }
}
