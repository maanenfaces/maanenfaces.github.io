import * as THREE from 'three';

export class BaseEntity {
    constructor(lane, z, getProjection) {
        this.mesh = new THREE.Group();
        this.lane = lane;
        this.z = z;
        this.isActive = true;
        this.initialized = false; // Flag pour éviter le premier rendu au centre

        this.laneWidth = window.innerWidth < 500 ? 4 : 6;

        // On force la position immédiatement si la fonction est fournie
        if (getProjection) {
            const proj = getProjection(this.z);
            this.mesh.position.set(proj.x + (this.lane * this.laneWidth), proj.y, this.z);
            this.initialized = true;
        } else {
            this.mesh.visible = false; // Caché par défaut
        }
    }

    updatePosition(speed, delta, getProjection, allEntities = []) {
        this.z += speed * delta;
        const laneX = this.lane * this.laneWidth;

        // On récupère les données de projection
        const proj = getProjection(this.z, laneX);

        // 1. Positionnement (déjà fait)
        this.mesh.position.set(proj.x + laneX, proj.y, this.z);

        // 2. INCLINAISON (Le nouveau code)
        // On applique l'angle de roulis à la rotation Z de l'objet
        // Note: On met souvent un signe "-" car si le sol penche à droite,
        // l'objet doit pivoter dans le sens des aiguilles d'une montre.
        this.mesh.rotation.z = proj.rollAngle;

        if (!this.initialized) {
            this.mesh.visible = true;
            this.initialized = true;
        }
    }
}
