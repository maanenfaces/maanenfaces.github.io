import * as THREE from 'three';
import { BaseEntity } from './BaseEntity.js';

export class Bonus extends BaseEntity {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.type = 'bonus';
        this.subType = 'base';
        this.initialY = 1.5;
        this.bonusMesh = null;
        this.bonusDuration = 7;
    }

    createTextLabel(text, color) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Augmenter la résolution pour la lisibilité au loin
        canvas.width = 512;
        canvas.height = 256;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Style du texte - On ajoute un contour (stroke) pour la lisibilité au loin
        ctx.font = 'Bold 90px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Contour noir pour détacher le texte du fond brillant du jeu
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'black';
        ctx.strokeText(text.toUpperCase(), 256, 128);

        // Remplissage couleur
        ctx.fillStyle = color;
        ctx.fillText(text.toUpperCase(), 256, 128);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter; // Évite le flou au loin

        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.5,
            depthWrite: false,
            depthTest: true
        });

        const sprite = new THREE.Sprite(spriteMat);
        sprite.renderOrder = 999;
        spriteMat.transparent = true;
        sprite.position.set(0, 5, 0);
        sprite.scale.set(5, 2.5, 1);

        return sprite;
    }

    // Méthode d'initialisation commune pour les enfants
    initMesh(geometry, material, initialY) {
        this.initialY = initialY;
        this.bonusMesh = new THREE.Mesh(geometry, material);
        this.bonusMesh.position.y = this.initialY;
        this.mesh.add(this.bonusMesh);
    }

    // Par défaut, l'animation est vide ou générique
    animate(time) {
        if (!this.bonusMesh) return;
        const t = time || Date.now() * 0.002;

        // Flottaison commune à tous les bonus
        this.bonusMesh.position.y = this.initialY + Math.sin(t * 3) * 0.3;

        // On laisse l'enfant gérer sa propre rotation/spécificité
        this.applyCustomAnimation(t);
    }

    applyCustomAnimation(t) {}
}
