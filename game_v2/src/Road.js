import * as THREE from 'three';

export class Road {
    constructor(scene) {
        this.scene = scene;

        this.length = 600;
        this.repetitions = 15;

        // GEOMÉTRIE : Largeur 24 (18 pour les 3 voies de 6 + 3 de bordure de chaque côté)
        const width = 24;
        const geo = new THREE.PlaneGeometry(width, this.length, 20, 150);
        geo.rotateX(-Math.PI / 2);
        this.baseVertices = geo.attributes.position.array.slice();

        // --- GÉNÉRATION DE LA TEXTURE ---
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // 1. Fond bitume sombre texturé
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, 512, 512);

        // Ajout d'un grain de route pour le réalisme
        for (let i = 0; i < 1500; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.04})`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }

        // 2. Calcul des positions des lignes (Conversion Unités -> Pixels)
        const unitToPx = 512 / width;
        const borderPx = 3 * unitToPx; // Zone de bordure gauche
        const lanePx = 6 * unitToPx;   // Largeur d'une voie

        // Dessin des lignes de séparation (entre voie 1|2 et 2|3)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.setLineDash([40, 60]); // Pointillés élégants

        ctx.beginPath();
        // Ligne entre Voie 1 (Gauche) et Voie 2 (Centre)
        const line1 = borderPx + lanePx;
        ctx.moveTo(line1, 0); ctx.lineTo(line1, 512);

        // Ligne entre Voie 2 (Centre) et Voie 3 (Droite)
        const line2 = borderPx + (lanePx * 2);
        ctx.moveTo(line2, 0); ctx.lineTo(line2, 512);
        ctx.stroke();

        // 3. Bordures extérieures lumineuses
        ctx.setLineDash([]); // Ligne pleine
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 12, 512);   // Néon extrême gauche
        ctx.fillRect(500, 0, 12, 512); // Néon extrême droit

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, this.repetitions);
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;

        // --- MATÉRIAU ---
        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0x00ffff, // Sera mis à jour par state.params.color
            transparent: false,
            opacity: 1.0
        });

        this.mesh = new THREE.Mesh(geo, this.material);
        // Position légèrement au-dessus du sol pour éviter les clignotements (Z-fighting)
        this.mesh.position.y = 0.1;
        this.scene.add(this.mesh);
    }

    reset() {
        // 1. On s'assure que le mesh est bien dans la scène (indispensable après un scene.clear)
        if (!this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }

        // 2. On remet l'animation de la texture à zéro
        if (this.material && this.material.map) {
            this.material.map.offset.y = 0;
        }

        // 3. On remet la géométrie à plat pour éviter des déformations bizarres au premier frame
        const pos = this.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setXYZ(
                i,
                this.baseVertices[i * 3],
                this.baseVertices[i * 3 + 1],
                this.baseVertices[i * 3 + 2]
            );
        }
        pos.needsUpdate = true;
    }

    update(state, getProjection) {
        // Mise à jour de la couleur néon
        if (state.params && state.params.color) {
            this.material.color.copy(state.params.color);
        }

        // Effet de défilement basé sur la vitesse
        const speed = state.params.speed || 0.5;
        const unitLength = this.length / this.repetitions;

        this.material.map.offset.y += speed / unitLength;

        // Déformation de la géométrie selon la trajectoire
        const pos = this.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const ix = this.baseVertices[i * 3];
            const iz = this.baseVertices[i * 3 + 2];

            // On récupère la projection (x=courbure, y=vague)
            const proj = getProjection(iz);

            // Application de la transformation
            // ix + proj.x permet à la route de suivre les virages
            // proj.y + 0.1 permet à la route de suivre les bosses/vagues
            pos.setXYZ(i, ix + proj.x, proj.y + 0.1, iz);
        }

        pos.needsUpdate = true;
    }
}
