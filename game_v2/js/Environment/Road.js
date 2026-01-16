import * as THREE from 'three';

export class Road {
    constructor(scene) {
        this.scene = scene;

        this.length = 600;
        this.repetitions = 15;

        const width = 24;
        const geo = new THREE.PlaneGeometry(width, this.length, 20, 150);
        geo.rotateX(-Math.PI / 2);
        this.baseVertices = geo.attributes.position.array.slice();

        // --- GÉNÉRATION DE LA TEXTURE BITUME ---
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 1500; i++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.04})`;
            ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
        }
        const unitToPx = 512 / width;
        const borderPx = 3 * unitToPx;
        const lanePx = 6 * unitToPx;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 4;
        ctx.setLineDash([40, 60]);
        ctx.beginPath();
        const line1 = borderPx + lanePx;
        ctx.moveTo(line1, 0); ctx.lineTo(line1, 512);
        const line2 = borderPx + (lanePx * 2);
        ctx.moveTo(line2, 0); ctx.lineTo(line2, 512);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 12, 512);
        ctx.fillRect(500, 0, 12, 512);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(1, this.repetitions);
        texture.anisotropy = 16;
        texture.minFilter = THREE.LinearFilter;

        this.material = new THREE.MeshBasicMaterial({
            map: texture,
            color: 0x00ffff,
            transparent: false,
            opacity: 1.0
        });

        this.mesh = new THREE.Mesh(geo, this.material);
        this.mesh.position.y = 0.1;
        this.scene.add(this.mesh);

        // --- AJOUT : SYSTÈME DE GLITCH LOCALISÉ ---
        this.glitchCanvas = document.createElement('canvas');
        this.glitchCanvas.width = 256;
        this.glitchCanvas.height = 256;
        this.glitchCtx = this.glitchCanvas.getContext('2d');
        this.glitchAlphaMap = new THREE.CanvasTexture(this.glitchCanvas);
        // Important : wrap pour pouvoir décaler l'offset sans couper la texture
        this.glitchAlphaMap.wrapS = THREE.RepeatWrapping;
        this.glitchAlphaMap.wrapT = THREE.RepeatWrapping;

        this.glitchMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0,
            alphaMap: this.glitchAlphaMap,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.glitchMesh = new THREE.Mesh(geo.clone(), this.glitchMaterial);
        this.glitchMesh.position.y = 0.15;
        this.scene.add(this.glitchMesh);

        this.glitchTimer = 0;
        this.glitchLifeSpan = 0.8;
        this.nextGlitchTime = 3 + Math.random() * 2;
    }

    generateOrganicShape() {
        const ctx = this.glitchCtx;
        ctx.clearRect(0, 0, 256, 256);
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, 256, 256);

        const centerX = 128;
        const centerY = 128;
        const points = 40;
        const baseRadius = 50 + Math.random() * 30; // Un peu plus grand pour la visibilité

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * Math.PI * 2;
            // Bruit pour l'aspect biscornu et "nid d'abeille découpé mal"
            const noiseLent = Math.sin(angle * 3) * 15;
            const noiseRapide = (Math.random() - 0.5) * 30;
            const dist = baseRadius + noiseLent + noiseRapide;

            const x = centerX + Math.cos(angle) * dist;
            const y = centerY + Math.sin(angle) * dist;

            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();

        ctx.shadowBlur = 5;
        ctx.shadowColor = 'white';
        ctx.fillStyle = 'white';
        ctx.fill();

        // Micro-tâches satellites
        for(let j = 0; j < 4; j++) {
            ctx.beginPath();
            ctx.arc(
                centerX + (Math.random()-0.5)*140,
                centerY + (Math.random()-0.5)*140,
                Math.random()*8, 0, Math.PI*2
            );
            ctx.fill();
        }

        this.glitchAlphaMap.needsUpdate = true;
    }

    reset() {
        if (!this.scene.children.includes(this.mesh)) this.scene.add(this.mesh);
        if (!this.scene.children.includes(this.glitchMesh)) this.scene.add(this.glitchMesh);

        if (this.material && this.material.map) this.material.map.offset.y = 0;
        this.glitchAlphaMap.offset.y = 0;
        this.glitchMaterial.opacity = 0;

        const pos = this.mesh.geometry.attributes.position;
        const gPos = this.glitchMesh.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const v = [this.baseVertices[i*3], this.baseVertices[i*3+1], this.baseVertices[i*3+2]];
            pos.setXYZ(i, ...v);
            gPos.setXYZ(i, ...v);
        }
        pos.needsUpdate = true;
        gPos.needsUpdate = true;
    }

    update(state, getProjection) {
        if (state.params && state.params.color) {
            this.material.color.copy(state.params.color);
            this.glitchMaterial.color.copy(state.params.color).addScalar(0.4);
        }

        const speed = state.params.speed || 0.5;
        const unitLength = this.length / this.repetitions;
        const scroll = speed / unitLength;

        this.material.map.offset.y += scroll;

        // --- LOGIQUE DU GLITCH STABILISÉ ---
        this.glitchTimer += state.delta;

        // Synchronisation : si le glitch est visible, il doit défiler comme la route
        if (this.glitchMaterial.opacity > 0) {
            this.glitchAlphaMap.offset.y += scroll;
            // On diminue l'opacité selon la durée de vie (0.5s à 1s)
            this.glitchMaterial.opacity -= state.delta / this.glitchLifeSpan;
        }

        if (this.glitchTimer > this.nextGlitchTime) {
            this.generateOrganicShape();
            this.glitchMaterial.opacity = 1.0;
            this.glitchLifeSpan = 0.6 + Math.random() * 0.4; // Stable entre 0.6s et 1s

            this.glitchAlphaMap.offset.x = Math.random();
            // Zone d'apparition proche (entre 0 et 10% de la longueur de la route)
            this.glitchAlphaMap.offset.y = Math.random() * 0.1;

            this.glitchTimer = 0;
            this.nextGlitchTime = 4 + Math.random() * 4;
        }

        // --- DÉFORMATION ET RENDU ---
        const isGlitch = state.triggers && state.triggers.glitch;
        const pos = this.mesh.geometry.attributes.position;
        const gPos = this.glitchMesh.geometry.attributes.position;

        for (let i = 0; i < pos.count; i++) {
            const ix = this.baseVertices[i * 3];
            const iz = this.baseVertices[i * 3 + 2];
            const proj = getProjection(iz, ix);

            let finalX = ix + proj.x;
            let finalY = proj.y + 0.1;

            if (isGlitch) {
                const sliceEffect = Math.sin(iz * 0.1) * 3.0;
                finalX += sliceEffect;
                finalY += (Math.random() - 0.5) * 0.5;
            }

            pos.setXYZ(i, finalX, finalY, iz);
            gPos.setXYZ(i, finalX, finalY + 0.05, iz);
        }

        pos.needsUpdate = true;
        gPos.needsUpdate = true;
    }
}
