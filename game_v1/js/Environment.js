import * as THREE from 'three';
import { RobotEntity, Bonus, Wall } from './Entities.js';
import { OBSTACLE_RATIOS } from './Config.js';
import { RoadManager } from './RoadManager.js';
import { BackgroundManager } from './BackgroundManager.js';

export class Environment {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 4, 14);
        this.camera.lookAt(0, 0, -20);

        // Sous-modules
        this.roadManager = new RoadManager(this.scene);
        this.bgManager = new BackgroundManager();

        this.setupRenderer();
        this.setupLights();

        this.currentGridColor = new THREE.Color(0x00ff00);
        this.currentFloorAlpha = 1.0;
        this.obstacleCooldown = 0;
        this.shakeIntensity = 0;

        this.lCanvas = document.getElementById('lightning-canvas');
        this.lCtx = this.lCanvas.getContext('2d');

        this.resize();
    }

    // --- GETTERS POUR COMPATIBILITÉ EXTERNE ---
    get curveFactor() { return this.roadManager.curveFactor; }
    get roadSegments() { return this.roadManager.roadSegments; }
    get segmentLength() { return this.roadManager.segmentLength; }
    get laneWidth() { return this.roadManager.laneWidth; }
    get zOffset() { return this.roadManager.zOffset; }
    set zOffset(val) { this.roadManager.zOffset = val; }

    setupRenderer() {
        const existingCanvas = document.getElementById('gl-canvas');

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas: existingCanvas || undefined
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        if(!existingCanvas) {
            this.renderer.domElement.id = 'gl-canvas';
            this.renderer.domElement.style.position = 'absolute';
            this.renderer.domElement.style.top = '0';
            this.renderer.domElement.style.zIndex = '0';
            const lCanvas = document.getElementById('lightning-canvas');
            if (lCanvas && lCanvas.parentNode) lCanvas.parentNode.insertBefore(this.renderer.domElement, lCanvas);
        }
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);
    }

reset() {
        // Nettoyage
        this.roadManager.roadSegments.forEach(s => this.scene.remove(s));
        this.roadManager.roadSegments = [];
        this.roadManager.zOffset = 0;
        this.obstacleCooldown = 0;

        // Création initiale des segments (ancres)
        for (let i = 0; i < 25; i++) {
            const zPos = i * this.roadManager.segmentLength;
            const anchor = this.spawnSegment(zPos);
            if (i > 4) {
                this.generateObstacles(anchor, 0.03, i % 10 === 0 ? { spawnBonus: 'ammo' } : {});
            }
        }
    }

    spawnSegment(zPos) {
        return this.roadManager.createSegment(zPos);
    }

    update(delta, speed, phase, time) {
        // 1. Mise à jour de la route (visuel)
        this.roadManager.update(speed, delta, time, phase, this.currentGridColor);

        // 2. Mise à jour des obstacles (ancres)
        this.roadSegments.forEach(seg => {
            seg.position.z += speed * delta;

            if (seg.position.z > 20) {
                seg.position.z -= 25 * this.segmentLength;
                this.resetSegmentContent(seg);
                this.generateObstacles(seg, phase.density, phase);
            }

            // On plaque l'ancre sur la courbe mathématique
            const data = this.roadManager.getTerrainData(seg.position.z);
            seg.position.x = data.x;
            seg.position.y = data.y;

            seg.children.forEach(child => child.update?.(time));
        });

        this.bgManager.update(phase, this.currentFloorAlpha);
        this.handleEffects(phase);
        this.updateCameraEffects();
    }

    generateObstacles(group, density, phase) {
        if (this.obstacleCooldown > 0) { this.obstacleCooldown--; return; }
        const d = density || 0;
        if (d <= 0) return;

        let isWall = (d > 0.6 && Math.random() < (d * 0.15));
        const lanes = [-1, 0, 1];
        let occupiedLanes = [];

        if (isWall) {
            occupiedLanes = [-1, 0, 1];
            this.obstacleCooldown = 6;
        } else {
            const shuffled = [...lanes].sort(() => Math.random() - 0.5);
            let count = 0;
            for (let lane of shuffled) {
                if (count < 2 && Math.random() < d) {
                    occupiedLanes.push(lane);
                    count++;
                }
            }
        }

        occupiedLanes.forEach(laneIndex => {
            const obstacle = Math.random() < OBSTACLE_RATIOS.wall ? new Wall() : new RobotEntity();
            obstacle.position.set(laneIndex * this.roadManager.laneWidth, obstacle.position.y, 0);
            group.add(obstacle);
        });

        if (!isWall && !phase.noBonus) {
            lanes.filter(l => !occupiedLanes.includes(l)).forEach(laneIndex => {
                let bonusType = null;
                if (phase.spawnBonus === 'invincible') bonusType = 'invincible';
                else if (Math.random() < 0.003) bonusType = 'speed';
                else if (Math.random() < 0.003) bonusType = 'ammo';

                if (bonusType) {
                    const b = new Bonus(bonusType);
                    b.position.set(laneIndex * this.roadManager.laneWidth, 1, 0);
                    group.add(b);
                }
            });
        }
    }

    resetSegmentContent(group) {
        while(group.children.length > 5) group.remove(group.children[group.children.length - 1]);
        group.userData.needsContent = true;
    }

    updateCameraEffects() {
        this.camera.position.y = 4;
        if (this.shakeIntensity > 0) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 0.5;
            this.shakeIntensity = Math.max(0, this.shakeIntensity - 0.05);
        }
    }

    handleEffects(phase) {
        if (phase.effects.includes("shake")) this.shakeIntensity = 0.6;

        if (phase.effects.includes("flash") && Math.random() > 0.94) this.triggerFlashOverlay(0.8);

        if (phase.effects.includes("glitch") && Math.random() > 0.9) {
            document.body.style.filter = `hue-rotate(${Math.random()*360}deg)`;
            setTimeout(() => document.body.style.filter = 'none', 80);
        }

        if (phase.effects.includes("reverse")) this.renderer.domElement.classList.add('reverse-canvas');
        else this.renderer.domElement.classList.remove('reverse-canvas');

        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        if (phase.effects.includes("eclair") && Math.random() < 0.08) this.triggerLightning();
    }

    triggerFlashOverlay(opacity) {
        const overlay = document.getElementById('flash-overlay');
        if (overlay) {
            overlay.style.opacity = opacity;
            setTimeout(() => overlay.style.opacity = '0', 50);
        }
    }

    triggerLightning() {
        this.lCtx.strokeStyle = '#ffffff';
        this.lCtx.lineWidth = 3;
        this.lCtx.beginPath();
        let x = Math.random() * this.lCanvas.width, y = 0;
        this.lCtx.moveTo(x, y);
        while (y < this.lCanvas.height) {
            x += (Math.random() - 0.5) * 100; y += Math.random() * 50 + 20;
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();
        this.triggerFlashOverlay(0.3);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        if (this.lCanvas) {
            this.lCanvas.width = window.innerWidth;
            this.lCanvas.height = window.innerHeight;
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
