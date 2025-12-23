import * as THREE from 'three';
import { Robot, Bonus, Wall } from './Entities.js';
import { OBSTACLE_RATIOS } from './Config.js';

export class Environment {
    constructor() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x000000, 0.02);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
        this.camera.position.set(0, 4, 14);
        this.camera.lookAt(0, 0, -20);

        this.setupRenderer();

        // Lumières
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // Configuration Route
        this.roadSegments = [];
        this.segmentLength = 10;
        this.laneWidth = 5;
        this.zOffset = 0;
        this.curveFactor = 0;
        this.currentGridColor = new THREE.Color(0x00ff00);
        this.currentFloorAlpha = 1.0;

        // Gestion Difficulté
        this.obstacleCooldown = 0; // Compteur pour laisser de l'espace après un mur

        // Effets
        this.shakeIntensity = 0;

        // Canvas 2D (Eclairs)
        this.lCanvas = document.getElementById('lightning-canvas');
        this.lCtx = this.lCanvas.getContext('2d');

        // --- GESTION DES FONDS ---
        this.bgLayer1 = document.getElementById('bg-layer-1');
        this.bgLayer2 = document.getElementById('bg-layer-2');
        this.ytLayer = document.getElementById('yt-layer');
        this.horizonMask = document.getElementById('horizon-mask');
        this.activeBgLayer = 1;
        this.currentBgKey = null;
        this.ytPlayer = null;
        this.ytReady = false;

        this.initYouTube();
        this.resize();
    }

    // ... (initYouTube et setupRenderer restent inchangés) ...
    initYouTube() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player', {
                height: '100%', width: '100%', videoId: '',
                playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'playlist': '', 'mute': 1, 'showinfo': 0, 'modestbranding': 1, 'rel': 0, 'iv_load_policy': 3, 'enablejsapi': 1, 'origin': window.location.origin },
                events: { 'onReady': () => { this.ytReady = true; } }
            });
        };
    }

    setupRenderer() {
        const existingCanvas = document.getElementById('gl-canvas');
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, canvas: existingCanvas || undefined });
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

    reset() {
        this.roadSegments.forEach(s => this.scene.remove(s));
        this.roadSegments = [];
        this.zOffset = 0;
        this.obstacleCooldown = 0;

        const basePhase = { density: 0.03 };

        for (let i = 0; i < 25; i++) {
            const group = this.spawnSegment(i * this.segmentLength);

            if (i > 4) {
                const currentPhase = { ...basePhase };
                if (i % 10 === 0) {
                    currentPhase.spawnBonus = 'ammo';
                }
                this.generateObstacles(group, currentPhase.density, currentPhase);
            }
        }
    }

    spawnSegment(zPos) {
        const group = new THREE.Group();

        // Sol (Grille)
        const groundGeo = new THREE.PlaneGeometry(200, this.segmentLength, 40, 1);
        groundGeo.rotateX(-Math.PI / 2);
        const groundMat = new THREE.MeshBasicMaterial({ color: this.currentGridColor, wireframe: true, transparent: true, opacity: 0.3 });
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        group.add(groundMesh);
        group.userData.groundMesh = groundMesh;

        // Piste centrale
        const laneGeo = new THREE.PlaneGeometry(this.laneWidth * 3, this.segmentLength, 3, 1);
        laneGeo.rotateX(-Math.PI / 2);
        const laneMat = new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true });
        const laneMesh = new THREE.Mesh(laneGeo, laneMat);
        laneMesh.position.y = 0.02;
        group.add(laneMesh);

        // Fond noir
        const solidGeo = new THREE.PlaneGeometry(200, this.segmentLength);
        solidGeo.rotateX(-Math.PI / 2);
        const solidMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 1.0 });
        const solidMesh = new THREE.Mesh(solidGeo, solidMat);
        solidMesh.position.y = -0.1;
        group.add(solidMesh);
        group.userData.solidMesh = solidMesh;

        // Lignes
        const lineGeo = new THREE.PlaneGeometry(0.2, this.segmentLength);
        lineGeo.rotateX(-Math.PI / 2);
        const leftLine = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        leftLine.position.set(-(this.laneWidth * 1.5), 0.05, 0);
        const rightLine = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
        rightLine.position.set((this.laneWidth * 1.5), 0.05, 0);
        group.add(leftLine);
        group.add(rightLine);

        group.position.z = -zPos;
        this.scene.add(group);
        this.roadSegments.push(group);
        return group;
    }

    update(delta, speed, phase, time) {
        this.zOffset += speed * delta;

        // 1. Ondulation Latérale
        const curveAmp = (phase.curveStrength !== undefined) ? phase.curveStrength : 0;
        this.curveFactor = Math.sin(time * 0.5) * curveAmp;

        // Couleur & Opacité
        const targetColor = new THREE.Color(Array.isArray(phase.color) ? phase.color[0] : phase.color);
        this.currentGridColor.lerp(targetColor, 0.05);
        const targetAlpha = (phase.gridOpacity !== undefined) ? phase.gridOpacity : 1.0;
        this.currentFloorAlpha += (targetAlpha - this.currentFloorAlpha) * 0.05;
        if (this.horizonMask) this.horizonMask.style.opacity = this.currentFloorAlpha;

        // Vagues
        const waveAmp = (phase.waveHeight !== undefined) ? phase.waveHeight : 0;
        const waveType = (phase.waveType !== undefined) ? phase.waveType : 1;

        this.roadSegments.forEach(seg => {
            seg.position.z += speed * 0.016;

            // Courbe X
            seg.position.x = Math.sin((seg.position.z + this.zOffset) * 0.02) * this.curveFactor;

            // Vague Y
            let waveY = 0;
            if (waveType === 2) {
                waveY = (Math.sin(time * 2 + seg.position.z * 0.2) + Math.cos(time * 1.5 + seg.position.z * 0.1)) * 0.6 * waveAmp;
            } else {
                waveY = Math.sin(time * 2 + seg.position.z * 0.1) * waveAmp;
            }
            seg.position.y = waveY;

            // Recyclage
            if (seg.position.z > 15) {
                seg.position.z -= 25 * this.segmentLength;
                this.resetSegmentContent(seg, time);

                // GÉNÉRATION OBSTACLES & BONUS
                this.generateObstacles(seg, phase.density, phase);
            }

            // Mise à jour visuelle
            if (seg.userData.groundMesh) {
                seg.userData.groundMesh.material.color = this.currentGridColor;
                seg.userData.groundMesh.material.opacity = 0.3 * this.currentFloorAlpha;
                seg.userData.groundMesh.visible = this.currentFloorAlpha > 0.01;
            }
            if (seg.userData.solidMesh) {
                seg.userData.solidMesh.material.opacity = this.currentFloorAlpha;
                seg.userData.solidMesh.visible = this.currentFloorAlpha > 0.01;
            }

            // --- ANIMATION DES ROBOTS & BONUS ---
            seg.children.forEach(child => {
                if (typeof child.update === 'function') {
                    child.update(time);
                }
            });
        });

        this.handleEffects(phase);
        this.handleBackground(phase);

        this.camera.position.y = 4;
        if (this.shakeIntensity > 0) {
            const rx = (Math.random() - 0.5) * this.shakeIntensity;
            const ry = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
            this.camera.position.x += rx;
            this.camera.position.y += ry;
        }
    }

    generateObstacles(group, density, phase) {
        // 1. Gestion du Cooldown (Espace vide après un mur)
        if (this.obstacleCooldown > 0) {
            this.obstacleCooldown--;
            group.userData.needsContent = false;
            return;
        }

        const d = (density !== undefined) ? density : 0;
        if (d <= 0) {
            group.userData.needsContent = false;
            return;
        }

        // 2. Détermination du Pattern
        // Chance de générer un MUR (3 obstacles) si la densité est élevée (> 0.6)
        let isWall = false;
        if (d > 0.6 && Math.random() < (d * 0.15)) {
            isWall = true;
        }

        const lanes = [-1, 0, 1];
        let occupiedLanes = [];

        if (isWall) {
            // MUR : On bloque tout, le joueur DOIT sauter
            occupiedLanes = [-1, 0, 1];
            // On force 6 segments vides derrière pour atterrir
            this.obstacleCooldown = 6;
        } else {
            // CLASSIQUE : On garantit toujours un passage (Max 2 obstacles)
            // On mélange les voies pour éviter la répétition
            const shuffledLanes = [...lanes].sort(() => Math.random() - 0.5);

            // On remplit selon la densité, mais on s'arrête à 2 max
            let count = 0;
            for (let lane of shuffledLanes) {
                if (count < 2 && Math.random() < d) {
                    occupiedLanes.push(lane);
                    count++;
                }
            }
        }

        // 3. Création des Obstacles (Robots ou Murs)
        occupiedLanes.forEach(laneIndex => {
            let obstacle;
            // MODIFICATION : Choix aléatoire entre Mur et Robot selon Config
            if (Math.random() < OBSTACLE_RATIOS.wall) {
                obstacle = new Wall();
            } else {
                obstacle = new Robot();
            }

            // On positionne en X. Y et Z sont gérés par la classe ou le groupe.
            obstacle.position.set(laneIndex * this.laneWidth, obstacle.position.y, 0);
            group.add(obstacle);
        });

        // 4. Création des Bonus (Dans les voies libres uniquement)
        if (!isWall && !phase.noBonus) {
            const freeLanes = lanes.filter(l => !occupiedLanes.includes(l));

            freeLanes.forEach(laneIndex => {
                if (phase.spawnBonus === 'invincible') {
                    const bonus = new Bonus('invincible');
                    bonus.position.set(laneIndex * this.laneWidth, 1, 0);
                    group.add(bonus);
                }
                else if (Math.random() < 0.003) {
                    const bonus = new Bonus('speed');
                    bonus.position.set(laneIndex * this.laneWidth, 1, 0);
                    group.add(bonus);
                }
                else if (Math.random() < 0.003) {
                    const bonus = new Bonus('ammo');
                    bonus.position.set(laneIndex * this.laneWidth, 1, 0);
                    group.add(bonus);
                }
            });
        }

        group.userData.needsContent = false;
    }

    handleBackground(phase) {
        // ... (Reste inchangé) ...
        let targetType = 'none';
        let targetValue = null;

        if (phase.bgVideo) {
            targetType = 'video';
            targetValue = phase.bgVideo;
        } else if (phase.bgImage) {
            targetType = 'image';
            targetValue = phase.bgImage;
        } else {
            targetType = 'image';
            targetValue = 'https://f4.bcbits.com/img/a2164237503_10.jpg';
        }

        if (this.currentBgKey === targetValue) return;
        if (targetType === 'video' && !this.ytReady) return;

        this.currentBgKey = targetValue;

        if (targetType === 'video') {
            this.transitionToVideo(targetValue);
        } else if (targetType === 'image') {
            this.transitionToImage(targetValue);
        }
    }

    transitionToImage(url) {
        if (this.ytLayer) this.ytLayer.classList.remove('bg-visible');
        if (this.ytPlayer && this.ytPlayer.pauseVideo && typeof this.ytPlayer.pauseVideo === 'function') {
            this.ytPlayer.pauseVideo();
        }
        const nextLayer = this.activeBgLayer === 1 ? this.bgLayer2 : this.bgLayer1;
        const currLayer = this.activeBgLayer === 1 ? this.bgLayer1 : this.bgLayer2;
        if (nextLayer && currLayer) {
            nextLayer.style.backgroundImage = `url('${url}')`;
            nextLayer.classList.add('bg-visible');
            currLayer.classList.remove('bg-visible');
            this.activeBgLayer = this.activeBgLayer === 1 ? 2 : 1;
        }
    }

    transitionToVideo(videoId) {
        if (!this.ytReady || !this.ytPlayer) return;
        this.ytPlayer.loadVideoById(videoId);
        this.ytPlayer.mute();
        this.ytPlayer.playVideo();
        if (this.ytLayer) this.ytLayer.classList.add('bg-visible');
    }

    resetSegmentContent(group, time) {
        while(group.children.length > 5) {
            group.remove(group.children[group.children.length - 1]);
        }
        group.userData.isHole = false;
        group.userData.isWarp = false;
        group.userData.needsContent = true;
        group.children.forEach(c => c.visible = true);
    }

    handleEffects(phase) {
        // ... (Reste inchangé) ...
        if (phase.effects.includes("shake")) {
            this.shakeIntensity = 0.6;
        } else if (this.shakeIntensity > 0) {
            this.shakeIntensity -= 0.05;
            if (this.shakeIntensity < 0) this.shakeIntensity = 0;
        }
        if (phase.effects.includes("flash") && Math.random() > 0.94) {
            const overlay = document.getElementById('flash-overlay');
            if (overlay) {
                overlay.style.opacity = '0.8';
                setTimeout(() => overlay.style.opacity = '0', 50);
            }
        }
        if (phase.effects.includes("glitch") && Math.random() > 0.9) {
            document.body.style.filter = `hue-rotate(${Math.random()*360}deg)`;
            setTimeout(() => document.body.style.filter = 'none', 80);
        }
        if (phase.effects.includes("reverse")) this.renderer.domElement.classList.add('reverse-canvas');
        else this.renderer.domElement.classList.remove('reverse-canvas');

        this.lCtx.clearRect(0, 0, this.lCanvas.width, this.lCanvas.height);
        if (phase.effects.includes("eclair") && Math.random() < 0.08) {
            this.triggerLightning();
        }
    }

    triggerLightning() {
        this.lCtx.strokeStyle = '#ffffff';
        this.lCtx.lineWidth = 3;
        this.lCtx.shadowBlur = 20;
        this.lCtx.shadowColor = '#ffffff';
        this.lCtx.beginPath();
        let x = Math.random() * this.lCanvas.width;
        let y = 0;
        this.lCtx.moveTo(x, y);
        while (y < this.lCanvas.height) {
            x += (Math.random() - 0.5) * 100;
            y += Math.random() * 50 + 20;
            this.lCtx.lineTo(x, y);
        }
        this.lCtx.stroke();
        const overlay = document.getElementById('flash-overlay');
        if (overlay) {
            overlay.style.opacity = '0.3';
            setTimeout(() => overlay.style.opacity = '0', 50);
        }
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.lCanvas.width = window.innerWidth;
        this.lCanvas.height = window.innerHeight;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
