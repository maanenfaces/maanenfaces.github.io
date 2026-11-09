import * as THREE from 'three';
import { FlyingShip } from './FlyingShip.js';

export class BurningFlyingShip extends FlyingShip {
    constructor(lane, z, getProjection, roadColor, levitationSpeed = 1.0) {
        super(lane, z, getProjection, roadColor);
        this.type = 'burning_flying_ship';

        // Facteur de vitesse d'élévation/traînée des débris en feu
        this.levitationSpeed = levitationSpeed;

        // --- PALETTE ROUGE INFERNALE (Inspirée de BurningBuilding2) ---
        this.fireColorPrimary = new THREE.Color(0xff0000);   // Rouge vif
        this.fireColorSecondary = new THREE.Color(0xff4400); // Orange-rouge ardent
        this.glowColor = new THREE.Color(0xff2200);          // Lueur rouge intense
        this.burnedMeshColor = new THREE.Color(0x050101);    // Suie sombre

        // Arêtes du vaisseau rouge sang foncé menaçantes
        this.wireColor.set(0xaa0000);

        this.flameVolumes = [];
        this.glowingFaces = [];
        this.floatingModules = [];

        this._applyBurningCataclysm();
    }

    _applyBurningCataclysm() {
        // On applique les modifications sur les modules générés par le vaisseau
        this.modules.forEach((mod, index) => {
            // 1. Teinter les corps des modules en suie incandescente
            mod.body.color.copy(this.burnedMeshColor);
            mod.body.transparent = true;
            mod.body.opacity = 0.98;
            this.glowingFaces.push(mod.body);

            // 2. Mettre à jour la couleur des arêtes
            mod.edgeMat.color.copy(this.wireColor);

            // 3. Ajouter un mouvement de dérive/lévitation spécifique aux morceaux du vaisseau en feu
            this.floatingModules.push({
                mesh: mod.mesh,
                currentOffsetY: 0,
                minY: 0,
                maxY: 15 + Math.random() * 15,
                speedY: (0.1 + index * 0.05) * this.levitationSpeed,
                rotSpeed: new THREE.Vector3(
                    (Math.random() - 0.5) * 0.04,
                    (Math.random() - 0.5) * 0.04,
                    (Math.random() - 0.5) * 0.04
                )
            });

            // 4. Ajouter des flammes volumétriques (wireframe) sur les modules du vaisseau
            if (Math.random() > 0.3) {
                const flameGeo = new THREE.BoxGeometry(
                    1 + Math.random() * 2,
                    2 + Math.random() * 3,
                    1 + Math.random() * 2
                );
                const flameMat = new THREE.MeshBasicMaterial({
                    color: Math.random() > 0.4 ? this.fireColorPrimary : this.fireColorSecondary,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.85
                });
                const flameMesh = new THREE.Mesh(flameGeo, flameMat);

                flameMesh.position.set(
                    (Math.random() - 0.5) * 2,
                    (Math.random() - 0.5) * 1,
                    (Math.random() - 0.5) * 2
                );

                mod.mesh.add(flameMesh);
                this.flameVolumes.push({
                    mesh: flameMesh,
                    mat: flameMat,
                    baseScaleY: flameMesh.scale.y,
                    speed: 10 + Math.random() * 15
                });
            }
        });

        // 5. Système d'étincelles / braises autour du vaisseau en feu
        const sparksCount = 30;
        const sparksGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(sparksCount * 3);
        this.sparksData = [];

        for (let i = 0; i < sparksCount; i++) {
            const x = (Math.random() - 0.5) * 10;
            const y = (Math.random() - 0.5) * 5;
            const z = (Math.random() - 0.5) * 15;

            positions[i * 3] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            this.sparksData.push({
                x: x, y: y, z: z,
                speedY: (0.3 + Math.random() * 0.6) * this.levitationSpeed * 0.3,
                vx: (Math.random() - 0.5) * 0.2,
                vz: (Math.random() - 0.5) * 0.2,
                maxOffsetY: 20 + Math.random() * 15
            });
        }

        sparksGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const sparksMat = new THREE.PointsMaterial({
            color: this.glowColor,
            size: 0.8,
            transparent: true,
            opacity: 0.9
        });

        this.sparksMesh = new THREE.Points(sparksGeo, sparksMat);
        this.shipGroup.add(this.sparksMesh);
    }

    animate(time) {
        // On conserve la logique de vol de base de FlyingShip
        super.animate(time);
        if (!this.shipGroup.visible) return;

        const t = time * 0.01 || Date.now() * 0.005;

        // --- ANIMATION 1 : DÉTACHEMENT ET LÉVITATION DES MODULES EN FEU ---
        this.floatingModules.forEach((item) => {
            item.currentOffsetY += item.speedY;
            if (item.currentOffsetY > item.maxY) {
                item.currentOffsetY = 0; // Boucle de lévitation des débris
            }
            item.mesh.position.y += item.speedY * 0.1;
            item.mesh.rotation.x += item.rotSpeed.x;
            item.mesh.rotation.y += item.rotSpeed.y;
            item.mesh.rotation.z += item.rotSpeed.z;
        });

        // --- ANIMATION 2 : PULSATION THERMIQUE DES FACES ---
        const glowIntensity = (Math.sin(t * 7) + 1) * 0.5;
        this.glowingFaces.forEach((mat, idx) => {
            if (idx % 2 === 0) {
                mat.color.setRGB(0.1 + glowIntensity * 0.3, 0.01, 0.01);
            } else {
                mat.color.setRGB(0.15 + (1 - glowIntensity) * 0.25, 0.02, 0.0);
            }
        });

        // --- ANIMATION 3 : FLAMMES WIREFRAME ET FLASHES ---
        this.flameVolumes.forEach((f, idx) => {
            f.mesh.scale.y = f.baseScaleY + Math.sin(t * f.speed + idx) * 0.7;
            f.mesh.rotation.y += 0.04;

            if (Math.random() > 0.85) {
                f.mat.color.setHex(0xffffff); // Flash blanc de surchauffe
            } else {
                f.mat.color.copy((idx % 2 === 0) ? this.fireColorPrimary : this.fireColorSecondary);
            }
        });

        // --- ANIMATION 4 : ÉTINCELLES / BRAISES AUTOUR DU VAISSEAU ---
        if (this.sparksMesh) {
            const positions = this.sparksMesh.geometry.attributes.position.array;

            for (let i = 0; i < this.sparksData.length; i++) {
                const data = this.sparksData[i];

                data.y += data.speedY;
                data.x += data.vx + Math.sin(t * 4 + i) * 0.1;
                data.z += data.vz;

                if (data.y > data.maxOffsetY) {
                    data.y = -2;
                    data.x = (Math.random() - 0.5) * 10;
                    data.z = (Math.random() - 0.5) * 15;
                }

                positions[i * 3] = data.x;
                positions[i * 3 + 1] = data.y;
                positions[i * 3 + 2] = data.z;
            }
            this.sparksMesh.geometry.attributes.position.needsUpdate = true;
        }
    }
}
