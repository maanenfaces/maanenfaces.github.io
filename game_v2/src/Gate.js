import * as THREE from 'three';

export class Gate {
    constructor(scene, label, color) {
        this.scene = scene;
        this.label = label;
        this.color = color;
        this.z = -500;
        this.active = true;
        this.isPassed = false;

        const group = new THREE.Group();

        // --- DESIGN : BORNE D'AUTOROUTE (MURET BAS) ---

        // Matériaux
        const mainMat = new THREE.MeshBasicMaterial({ color: color });
        const blackMat = new THREE.MeshBasicMaterial({ color: 0x050505 });

        // 1. Les Socles (Bords de route)
        const baseGeo = new THREE.BoxGeometry(4, 0.4, 4);
        const baseCoreGeo = new THREE.BoxGeometry(3, 0.5, 3);

        // 2. Les Bornes (Poteaux courts et épais)
        // Hauteur de 3 unités au lieu de 15/16
        const pillarGeo = new THREE.BoxGeometry(1, 5, 1);

        // Montage Gauche
        const leftBase = new THREE.Mesh(baseGeo, mainMat);
        const leftBaseCore = new THREE.Mesh(baseCoreGeo, blackMat);
        const leftPillar = new THREE.Mesh(pillarGeo, mainMat);

        leftBase.position.set(-13, 0.2, 0);
        leftBaseCore.position.set(-13, 0.25, 0);
        leftPillar.position.set(-13, 1.5, 0); // Posé sur le socle

        // Montage Droit
        const rightBase = new THREE.Mesh(baseGeo, mainMat);
        const rightBaseCore = new THREE.Mesh(baseCoreGeo, blackMat);
        const rightPillar = new THREE.Mesh(pillarGeo, mainMat);

        rightBase.position.set(13, 0.2, 0);
        rightBaseCore.position.set(13, 0.25, 0);
        rightPillar.position.set(13, 1.5, 0);

        // On ajoute tout au groupe (plus de traverse, plus de panneau)
        group.add(
            leftBase, leftBaseCore, leftPillar,
            rightBase, rightBaseCore, rightPillar
        );

        this.mesh = group;
        this.scene.add(this.mesh);
    }

    update(speed, delta, getProjection, onPassCallback) {
        this.z += speed;

        const proj = getProjection(this.z);
        this.mesh.position.set(proj.x, proj.y, this.z);

        // Le joueur est à Z=3. On déclenche le onPass quand la borne arrive à sa hauteur.
        if (!this.isPassed && this.z >= 3) {
            this.isPassed = true;
            if (onPassCallback) onPassCallback(this);
        }

        // Nettoyage
        if (this.z > 50) {
            this.scene.remove(this.mesh);
            this.active = false;
            this.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else child.material.dispose();
                }
            });
        }
    }
}
