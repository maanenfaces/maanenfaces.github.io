import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        // On augmente la profondeur (600) pour éviter de voir le bord
        const geo = new THREE.PlaneGeometry(600, 600, 80, 80);
        geo.rotateX(-Math.PI / 2);
        this.baseVertices = geo.attributes.position.array.slice();

        // Création d'une texture de grille procédurale pour le défilement
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, 64, 64);

        const gridTexture = new THREE.CanvasTexture(canvas);
        //gridTexture.generateMipmaps = false;
        gridTexture.wrapS = THREE.RepeatWrapping;
        gridTexture.wrapT = THREE.RepeatWrapping;
        gridTexture.repeat.set(40, 40); // Nombre de répétitions de la grille

        gridTexture.magFilter = THREE.NearestFilter;
        gridTexture.minFilter = THREE.LinearMipmapLinearFilter;
        gridTexture.anisotropy = 16;

        this.mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            color: 0x000000,
            side: THREE.DoubleSide
        }));

        // On utilise la texture sur le gridMaterial
        this.gridMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            map: gridTexture, // La texture qui va défiler
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.grid = new THREE.Mesh(geo, this.gridMaterial);
        this.grid.position.y = 0.02;

        this.scene.add(this.mesh, this.grid);
        this.scene.fog = new THREE.Fog(0x000000, 200, 500);
    }

    reset() {
        // 1. On s'assure que les deux meshs sont bien dans la scène
        if (!this.scene.children.includes(this.mesh)) {
            this.scene.add(this.mesh);
        }
        if (!this.scene.children.includes(this.grid)) {
            this.scene.add(this.grid);
        }

        // 2. Réinitialisation de l'offset de la texture pour éviter un saut visuel
        if (this.gridMaterial && this.gridMaterial.map) {
            this.gridMaterial.map.offset.y = 0;
        }

        // 3. Remise à plat de la géométrie (optionnel mais propre)
        const pos = this.mesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            pos.setY(i, 0);
        }
        pos.needsUpdate = true;

        // On synchronise la grille sur le mesh plat
        this.grid.geometry.attributes.position.copy(pos);
        this.grid.geometry.attributes.position.needsUpdate = true;
    }

    update(state, getProjection) {
        const pos = this.mesh.geometry.attributes.position;
        const isGlitchPhase = state.phase.effects.includes('glitch');

        // 1. DÉFILEMENT VISUEL
        // On décale l'offset de la texture en fonction de la vitesse
        const speed = state.params.speed || 0.5;
        this.gridMaterial.map.offset.y += speed * 0.05;

        // 2. DÉFORMATION DU SOL (Vagues)
        // Ici on garde le iz d'origine pour que les vagues soient calées sur les objets
        for (let i = 0; i < pos.count; i++) {
            const iz = this.baseVertices[i * 3 + 2];
            const proj = getProjection(iz);

            let y = proj.y;
            if (isGlitchPhase && Math.random() > 0.99) y += 5;

            pos.setY(i, y);
        }

        pos.needsUpdate = true;
        this.grid.geometry.attributes.position.copy(pos);
        this.grid.geometry.attributes.position.needsUpdate = true;

        this.grid.material.color.copy(state.params.color);
        this.grid.material.opacity = state.params.gridOpacity;
    }

    triggerLightning() {
        const old = this.scene.fog.color.clone();
        this.scene.fog.color.set(0xffffff);
        setTimeout(() => this.scene.fog.color.copy(old), 100);
    }
}
