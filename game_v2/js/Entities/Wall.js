import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class Wall extends BaseEntity {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'wall';
        this.color = 0xff0000;

        // Variable demandée pour activer/désactiver le mode glitch du mur
        this.isGlitched = false;

        this.glitchPalette = [
            0xaa0044, // Bordeaux/Rose sombre
            0xff2211, // Rouge vif
            0xff5500, // Orange
            0x880000, // Rouge sang sombre
            0x004400  // Flash blanc (rare mais percutant)
        ];

        this.pulseOffset = Math.random() * Math.PI * 2;

        const geometry = new THREE.BoxGeometry(4, 3, 1);

        this.innerMesh = new THREE.Mesh(
            geometry,
            new THREE.MeshBasicMaterial({
                color: this.color,
                transparent: true,
                opacity: 0.7
            })
        );

        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        this.line = new THREE.LineSegments(
            edgesGeometry,
            new THREE.LineBasicMaterial({ color: this.color, opacity: 0.8 })
        );

        this.innerMesh.add(this.line);

        this.innerMesh.position.y = 1.7;
        this.mesh.add(this.innerMesh);
    }

    animate(time, intensity = 1.0, state = null) {
        // 1. Mise à jour de la variable isGlitched selon la phase active de la chanson
        if (state && state.phase && state.phase.theme) {
            this.isGlitched = Boolean(state.phase.theme.glitchedWall);
        }

        // 2. OPACITÉ ALÉATOIRE (Désynchronisée)
        const slowPulse = Math.sin(time * 3 + this.pulseOffset);
        const microPulse = Math.sin(time * 11);
        this.innerMesh.material.opacity = 0.7 + (slowPulse * 0.1) + (microPulse * 0.05);

        // 3. GLITCH LATÉRAL INTERMITTENT (Uniquement si isGlitched est actif)
        if (this.isGlitched) {
            const glitchBurst = Math.sin(time * 2.5 + this.pulseOffset) * Math.sin(time * 0.8);

            if (glitchBurst > 0.5) {
                // --- PHYSIQUE DU GLITCH ---
                const shakeX = Math.sin(time * 70) * (0.15 * intensity);
                const jumpX = (Math.random() - 0.5) * (0.1 * intensity);
                this.innerMesh.position.x = shakeX + jumpX;

                // On pioche une couleur au hasard dans la liste
                const randomColor = this.glitchPalette[Math.floor(Math.random() * this.glitchPalette.length)];
                this.innerMesh.material.color.setHex(randomColor);
            } else {
                // --- RETOUR À LA NORMALE (TEMPORAIRE) ---
                this.innerMesh.position.x *= 0.7;
                if (Math.abs(this.innerMesh.position.x) < 0.001) {
                    this.innerMesh.position.x = 0;
                }
                this.innerMesh.material.color.setHex(this.color);
            }
        } else {
            // Si le mur n'est pas censé glitcher, on s'assure qu'il reste stable
            this.innerMesh.position.x = 0;
            this.innerMesh.material.color.setHex(this.color);
        }
    }
}
