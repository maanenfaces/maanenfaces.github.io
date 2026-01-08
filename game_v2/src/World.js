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
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1.0
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

        // Le canva pour les éclairs
        this.lCanvas = document.createElement('canvas');
        this.lCanvas.id = "lightning-layer";
        this.lCanvas.style.cssText = "position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:50;";
        document.body.appendChild(this.lCanvas);
        this.lCtx = this.lCanvas.getContext('2d');

        // Ajustement de la taille au redimensionnement
        window.addEventListener('resize', () => {
            this.lCanvas.width = window.innerWidth;
            this.lCanvas.height = window.innerHeight;
        });
        this.lCanvas.width = window.innerWidth;
        this.lCanvas.height = window.innerHeight;
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
        const isGlitch = state.triggers && state.triggers.glitch;

        const speed = state.params.speed || 0.5;
        this.gridMaterial.map.offset.y += speed * 0.05;

        for (let i = 0; i < pos.count; i++) {
            const ix = this.baseVertices[i * 3];
            const iz = this.baseVertices[i * 3 + 2];

            // On passe bien ix pour le calcul de l'inclinaison (slope)
            const proj = getProjection(iz, ix);

            // IMPORTANT : On garde ix et on AJOUTE la courbure proj.x
            let finalX = ix + proj.x;
            let finalY = proj.y;

            if (isGlitch) {
                finalX += Math.sin(i * 0.5) * 2.0;
                finalY += (Math.random() - 0.5) * 4.0;
            }

            pos.setXYZ(i, finalX, finalY, iz);
        }

        pos.needsUpdate = true;
        this.grid.geometry.attributes.position.copy(pos);
        this.grid.geometry.attributes.position.needsUpdate = true;

        const targetOpacity = state.params.gridOpacity !== undefined ? state.params.gridOpacity : 1;
        const currentOpacity = isGlitch ? Math.random() : targetOpacity;

        this.grid.material.opacity = currentOpacity;
        this.grid.material.color.copy(state.params.color);
        this.mesh.material.opacity = currentOpacity;
    }

    triggerScreenFlash(colorHex) {
        const flashDiv = document.createElement('div');

        // Conversion du hex (0xffffff) en string CSS (#ffffff)
        const cssColor = `#${colorHex.toString(16).padStart(6, '0')}`;

        flashDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: ${cssColor};
            z-index: 9999;
            pointer-events: none;
            opacity: 0.7;
        `;

        document.body.appendChild(flashDiv);

        // Suppression rapide pour l'effet de flash
        setTimeout(() => {
            flashDiv.remove();
        }, 60); // Durée du flash en ms
    }

    triggerLightning() {
        // 1. Nettoyage de sécurité avant de dessiner
        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);

        // 2. Configuration du style
        this.lCtx.strokeStyle = '#ffffff';
        this.lCtx.lineWidth = 3;
        this.lCtx.shadowBlur = 15;
        this.lCtx.shadowColor = '#ffffff';

        // 3. Dessin de la trajectoire
        this.lCtx.beginPath();
        let x = Math.random() * this.lCanvas.width;
        let y = 0;
        this.lCtx.moveTo(x, y);

        while (y < this.lCanvas.height) {
            x += (Math.random() - 0.5) * 150;
            y += Math.random() * 80 + 30;
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();

        // 4. EFFACEMENT AUTOMATIQUE (Le secret de la brièveté)
        // 50ms à 80ms est la durée idéale pour un éclair réaliste
        setTimeout(() => {
            this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        }, 60);
    }
}
