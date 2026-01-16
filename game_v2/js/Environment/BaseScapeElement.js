import * as THREE from 'three';

export class BaseScapeElement {
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
