import * as THREE from 'three';
import { LyricsBillboard } from './LyricsBillboard.js';

export class BurningLyricsBillboard extends LyricsBillboard {
    constructor(lane, z, getProjection, roadColor, lyricText, imageUrl = null) {
        super(lane, z, getProjection, roadColor, lyricText, imageUrl);

        this.flameParticles = [];
        this._initFlames();
    }

    _initFlames() {
        // Création d'un groupe dédié aux flammes attachées au panneau
        this.flameGroup = new THREE.Group();
        this.billboardGroup.add(this.flameGroup);

        // --- EN GÉNÉRAL : PLUS DE FLAMMES ---
        const particleCount = 90; // Doublé/triplé pour une vraie fournaise
        const flameGeometry = new THREE.PlaneGeometry(8, 16); // Particules plus grandes

        // Texture procédurale de flamme ultra-lumineuse (cœur blanc, contour orange/rouge intense)
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 90, 2, 32, 60, 50);
        grad.addColorStop(0, 'rgba(255, 255, 220, 1)');
        grad.addColorStop(0.2, 'rgba(255, 180, 0, 0.95)');
        grad.addColorStop(0.6, 'rgba(255, 50, 0, 0.8)');
        grad.addColorStop(0.85, 'rgba(150, 0, 0, 0.3)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 128);

        const flameTexture = new THREE.CanvasTexture(canvas);

        const width = this.sizePreset.width;
        const height = this.sizePreset.height;
        const panelCenterY = this.sizePreset.panelCenterY;

        for (let i = 0; i < particleCount; i++) {
            const material = new THREE.MeshBasicMaterial({
                map: flameTexture,
                transparent: true,
                blending: THREE.AdditiveBlending, // Rend les flammes super lumineuses et incandescentes
                depthWrite: false,
                side: THREE.DoubleSide
            });

            const mesh = new THREE.Mesh(flameGeometry, material);

            // Répartition sur tout le cadre : le long du toit, mais aussi débordant sur les côtés
            let offsetX, offsetY;
            const edgeSelector = Math.random();

            if (edgeSelector < 0.6) {
                // Majoritairement sur le bord supérieur
                offsetX = (Math.random() - 0.5) * (width + 4);
                offsetY = panelCenterY + (height / 2) + (Math.random() * 4 - 2);
            } else if (edgeSelector < 0.8) {
                // Sur le flanc gauche
                offsetX = -width / 2 + (Math.random() * 4);
                offsetY = panelCenterY + (Math.random() - 0.5) * height;
            } else {
                // Sur le flanc droit
                offsetX = width / 2 - (Math.random() * 4);
                offsetY = panelCenterY + (Math.random() - 0.5) * height;
            }

            mesh.position.set(offsetX, offsetY, (Math.random() - 0.5) * 4);

            // Propriétés de l'animation de la flamme (plus dynamiques)
            mesh.userData = {
                baseX: offsetX,
                baseY: offsetY,
                life: Math.random(),
                speed: 40 + Math.random() * 35,       // Ça monte plus vite
                maxLife: 0.5 + Math.random() * 0.5,   // Renouvellement rapide
                scaleX: 1.0 + Math.random() * 1.2,
                scaleY: 1.5 + Math.random() * 2.0
            };

            this.flameGroup.add(mesh);
            this.flameParticles.push(mesh);
        }

        // Teinter légèrement le cadre en rouge sombre brûlé pour contraster avec le feu
        this.billboardGroup.traverse((child) => {
            if (child.isMesh && child.material && !child.material.map) {
                child.material.color.setHex(0x220500);
            }
        });
    }

    animate(time) {
        super.animate(time);

        // --- EFFET DE SECOUSSE ET DE CHALEUR INTENSE ---
        if (this.billboardGroup) {
            this.billboardGroup.position.x += (Math.random() - 0.5) * 0.6;
            this.billboardGroup.position.y += (Math.random() - 0.5) * 0.6;
        }

        // Animation agressive et fluide des flammes
        const delta = 0.016;
        this.flameParticles.forEach(p => {
            p.userData.life += delta;

            if (p.userData.life > p.userData.maxLife) {
                p.userData.life = 0;
                p.position.x = p.userData.baseX + (Math.random() - 0.5) * 8;
            }

            const progress = p.userData.life / p.userData.maxLife;

            // Ascension rapide et vagues de vent horizontal (effet brasier)
            p.position.y = p.userData.baseY + (progress * p.userData.speed);
            p.position.x += Math.sin(time * 20 + p.position.y) * 0.3;

            // Déformation dynamique de la flamme
            const scaleFactor = (1 - progress * 0.4) * p.userData.scaleY;
            p.scale.set(p.userData.scaleX * (1 - progress * 0.6), scaleFactor, 1);

            // Disparition en fondu vers le sommet
            if (p.material) {
                p.material.opacity = Math.max(0, 1 - progress);
            }
        });
    }

    dispose() {
        super.dispose();
        this.flameParticles.forEach(p => {
            if (p.geometry) p.geometry.dispose();
            if (p.material) {
                if (p.material.map) p.material.map.dispose();
                p.material.dispose();
            }
        });
    }
}
