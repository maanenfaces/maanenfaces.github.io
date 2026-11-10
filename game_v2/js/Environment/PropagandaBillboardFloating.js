import * as THREE from 'three';
import { PropagandaBillboard } from './PropagandaBillboard.js';

export class PropagandaBillboardFloating extends PropagandaBillboard {
    constructor(lane, z, getProjection, roadColor, customText = null, imageUrl = null) {
        // On appelle le constructeur parent
        super(lane, z, getProjection, roadColor, customText, imageUrl);

        // Propriétés pour l'effet de glitch (initialisé à false pour qu'il commence normalement)
        this.isGlitching = true;
        this.glitchTimer = 0;
    }

    // On surcharge uniquement la construction pour ne pas inclure les poteaux
    _buildBillboard(sloganText, imageUrl) {
        const mat = new THREE.MeshBasicMaterial({ color: this.baseColor });

        // On stocke le matériau des bordures dans une propriété pour pouvoir le manipuler (glitch)
        this.edgeMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.85 });

        const frameWidth = this.sizePreset.width;
        const frameHeight = this.sizePreset.height;
        const frameDepth = 1.5;
        const panelCenterY = this.sizePreset.panelCenterY;

        // --- AUCUN POTEAU CRÉÉ ICI (Panneau flottant pur) ---

        const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
        const frameMesh = new THREE.Mesh(frameGeo, mat);
        frameMesh.position.set(0, panelCenterY, 0);
        this.billboardGroup.add(frameMesh);

        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo), this.edgeMat);
        frameMesh.add(edges);
        this.frameEdges = edges; // Référence gardée pour le décalage glitch

        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = this.wireColor;
        ctx.lineWidth = 30;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
            const words = text.split(' ');
            let line = '';
            const lines = [];

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            const totalHeight = lines.length * lineHeight;
            let startY = y - (totalHeight / 2) + (lineHeight / 2);

            for (let k = 0; k < lines.length; k++) {
                context.fillText(lines[k], x, startY);
                startY += lineHeight;
            }
        };

        let fontSize = 300;
        if (sloganText.length > 40) fontSize = 260;
        if (sloganText.length > 80) fontSize = 230;

        ctx.font = `bold ${fontSize}px monospace`;
        wrapText(ctx, sloganText, canvas.width / 2, canvas.height / 2, canvas.width - 350, fontSize * 1.3);

        if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                ctx.drawImage(img, 120, 120, canvas.width - 240, canvas.height - 240);
                this.texture.needsUpdate = true;
            };
        }

        this.texture = new THREE.CanvasTexture(canvas);
        const screenGeo = new THREE.PlaneGeometry(frameWidth - 2.0, frameHeight - 2.0);
        const screenMat = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        const screenMesh = new THREE.Mesh(screenGeo, screenMat);

        screenMesh.position.set(0, panelCenterY, frameDepth / 2 + 0.1);
        this.billboardGroup.add(screenMesh);
        this.screenMesh = screenMesh; // Référence pour le glitch textuel

        this.billboardGroup.rotation.y = 0;
        this.billboardGroup.rotation.x = 0;
    }

    animate(time) {
        const dist = Math.abs(this.mesh.position.z);

        if (dist > 1500) {
            this.billboardGroup.visible = false;
            return;
        }

        // --- DÉCLENCHEMENT DU GLITCH ---
        if (!this.isGlitching && Math.random() > 0.992) {
            this.isGlitching = true;
            this.glitchTimer = 6 + Math.floor(Math.random() * 12);
        }

        if (this.isGlitching) {
            this.glitchTimer--;

            // Décalage violent des arêtes du cadre
            const offsetAmount = 2.0;
            if (this.frameEdges) {
                this.frameEdges.position.x = (Math.random() - 0.5) * offsetAmount;
                this.frameEdges.position.z = (Math.random() - 0.5) * offsetAmount;
            }

            // Glitch subtil sur le texte / écran : décalage de la texture (effet décrochage horizontal/vertical)
            if (this.texture) {
                if (Math.random() > 0.4) {
                    this.texture.offset.x = (Math.random() - 0.5) * 0.08; // Saccade horizontale du texte
                    this.texture.offset.y = (Math.random() - 0.5) * 0.02; // Légère saccade verticale
                } else {
                    this.texture.offset.set(0, 0);
                }
            }

            // Flashs blancs intermittents et saccades d'échelle
            if (Math.random() > 0.6) {
                this.billboardGroup.scale.addScalar((Math.random() - 0.5) * 0.05);
                this.edgeMat.color.set(0xffffff);
            } else {
                this.edgeMat.color.copy(this.wireColor);
            }

            // Léger tremblement latéral du groupe
            this.billboardGroup.position.x = (Math.random() - 0.5) * 0.8;

            if (this.glitchTimer <= 0) {
                this.isGlitching = false;
                if (this.frameEdges) {
                    this.frameEdges.position.set(0, 0, 0);
                }
                if (this.texture) {
                    this.texture.offset.set(0, 0); // Remise à zéro propre de la texture texte
                }
                this.billboardGroup.position.x = 0;
                this.billboardGroup.scale.set(1, 1, 1);
                this.edgeMat.color.copy(this.wireColor);
            }
        }
    }
}
