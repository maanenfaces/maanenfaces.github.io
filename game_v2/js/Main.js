import * as THREE from 'three';
import { GameEngine } from './GameEngine.js';
import { Screens } from './Screens.js';
import { DEV_MODE, SONG_STRUCTURE } from './Config.js';

export class Main {
    constructor() {
        this.lastTime = 0;
        this.init();
    }

    async init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 7, 12); // Reculée légèrement pour mieux voir
        this.camera.lookAt(0, 2, -10);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        document.getElementById('game-canvas').appendChild(this.renderer.domElement);

        this.engine = new GameEngine(this.scene, this.camera, SONG_STRUCTURE);
        this.ui = new Screens(this.engine);

        const rotationAlert = document.getElementById('rotation-alert');
        window.addEventListener('uiRotationStart', () => {
            rotationAlert.classList.remove('hidden');
        });
        window.addEventListener('uiRotationEnd', () => {
            console.log("Hiding rotation alert");
            rotationAlert.classList.add('hidden');
        });

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.animate(0);
    }

    animate(now) {
        const start = performance.now();
        requestAnimationFrame((t) => this.animate(t));

        if (!this.lastTime) {
            this.lastTime = now;
            return;
        }

        const delta = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;

        if (this.engine) {
            this.engine.update(now / 1000, delta);
            this.ui.update();
            this.renderer.render(this.scene, this.camera);

            if (DEV_MODE) {
                this.updateDevTools(now / 1000, start, delta);
            }
        }
    }

    updateDevTools(currentTime, startTime, delta) {
        const p = this.engine.currentPhase;
        if (!p) return;

        const elements = {
            'dev-perf': (performance.now() - startTime).toFixed(2),
            'dev-fps': delta > 0 ? Math.round(1 / delta) : 0,
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) el.innerText = value;
        }
    }

    onWindowResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const aspect = width / height;

        // Calcul du FOV adaptatif
        // Si l'écran est plus haut que large (Portrait), on augmente le FOV
        if (aspect < 1) {
            // Formule pour maintenir la visibilité horizontale :
            // fovVertical = 2 * atan(tan(fovHorizontal/2) / aspect)
            const initialFov = 75;
            const horizontalFov = 2 * Math.atan(Math.tan(initialFov * Math.PI / 360) * (16/9));
            this.camera.fov = (2 * Math.atan(Math.tan(horizontalFov / 2) / aspect)) * (180 / Math.PI);
        } else {
            this.camera.fov = 75;
        }

        this.camera.aspect = aspect;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }
}
