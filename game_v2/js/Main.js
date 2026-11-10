import * as THREE from 'three';
import { GameEngine } from './GameEngine.js';
import { Screens } from './Screens.js';

export class Main {
    constructor() {
        this.lastTime = 0;
        this.targetFPS = 30;
        this.init();
    }

    async init() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.5, 1000);
        this.camera.position.set(0, 7, 12.5);
        this.camera.lookAt(0, 2, -10);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const container = document.getElementById('game-container');
        this.renderer.setSize(container.clientWidth, container.clientHeight);

        document.getElementById('game-canvas').appendChild(this.renderer.domElement);

        this.engine = new GameEngine(this.scene, this.camera);
        this.ui = new Screens(this.engine);

        const rotationAlert = document.getElementById('rotation-alert');
        window.addEventListener('uiRotationStart', () => {
            rotationAlert.classList.remove('hidden');
        });
        window.addEventListener('uiRotationEnd', () => {
            rotationAlert.classList.add('hidden');
        });

        window.addEventListener('resize', this.onWindowResize.bind(this), false);

        this.animate(0);
    }

    animate(now) {
        requestAnimationFrame((t) => this.animate(t));

        if (!this.lastTime) {
            this.lastTime = now;
            return;
        }

        // Intervalle calculé dynamiquement en fonction de targetFPS
        const fpsInterval = 1000 / this.targetFPS;
        const elapsed = now - this.lastTime;

        if (elapsed < fpsInterval) {
            return;
        }

        this.lastTime = now - (elapsed % fpsInterval);

        const delta = Math.min(elapsed / 1000, 0.1);
        const start = performance.now();

        if (this.engine) {
            this.engine.update(now / 1000, delta);
            this.ui.update();
            this.renderer.render(this.scene, this.camera);

            if (this.engine.devMode) {
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
        const container = document.getElementById('game-container');
        const width = container.clientWidth;
        const height = container.clientHeight;
        const aspect = width / height;

        if (aspect < 1) {
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
