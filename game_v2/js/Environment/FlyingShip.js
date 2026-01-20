import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class FlyingShip extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'flying_ship';

        // --- CONFIGURATION ---
        // Position plus haute par défaut (entre 25 et 45 unités au-dessus de la route)
        this.altitude = 25 + Math.random() * 20;

        // Vitesse relative (0.8 = le joueur le rattrape lentement)
        this.relativeSpeedFactor = 0.8 + Math.random() * 0.1;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);

        this.vx = (Math.random() - 0.5) * 0.1;
        this.currentXOffset = (Math.random() - 0.5) * 150;

        // --- ÉTATS ---
        this.age = 0;
        this.isExploding = false;
        this.isGhosting = false;
        this.explosionTimer = 0;
        this.isActive = true;
        this.glitchPalette = [new THREE.Color(0xffffff), this.wireColor, new THREE.Color(0xff00ff)];

        this.shipGroup = new THREE.Group();
        this.mesh.add(this.shipGroup);

        this.modules = [];
        this._generateComplexShape();
    }

    _generateComplexShape() {
        // Corps principal
        const mainW = 5 + Math.random() * 5;
        const mainH = 1.5 + Math.random() * 1;
        const mainD = 12 + Math.random() * 10;
        this._addModule(mainW, mainH, mainD, 0, 0, 0);

        // Modules additionnels (ailes, réacteurs)
        const numModules = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < numModules; i++) {
            const mW = (Math.random() > 0.5) ? mainW * 2.2 : mainW * 0.5;
            const mH = mainH * (0.4 + Math.random());
            const mD = mainD * (0.3 + Math.random() * 0.6);
            const offsetZ = (Math.random() - 0.5) * mainD * 0.7;
            const offsetY = (Math.random() - 0.5) * 2;
            this._addModule(mW, mH, mD, 0, offsetY, offsetZ);
        }
    }

    _addModule(w, h, d, x, y, z) {
        const geo = new THREE.BoxGeometry(w, h, d);

        // Corps Opaque Noir (comme les buildings)
        const bMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: false });
        const mesh = new THREE.Mesh(geo, bMat);
        mesh.position.set(x, y, z);
        this.shipGroup.add(mesh);

        // Arêtes néon (Edges) - Celles qui vont subir la distorsion
        const eMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.9 });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), eMat);
        mesh.add(edges);

        // Wireframe interne discret
        const wMat = new THREE.MeshBasicMaterial({ color: this.wireColor, wireframe: true, transparent: true, opacity: 0.15 });
        const wire = new THREE.Mesh(geo, wMat);
        wire.scale.setScalar(1.001);
        mesh.add(wire);

        this.modules.push({
            mesh: mesh,
            body: bMat,
            edges: edges,
            edgeMat: eMat,
            isFalling: false,
            delay: Math.random() * 1.5,
            fallSpeed: 0.15 + Math.random() * 0.2,
            drift: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6),
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3,
                (Math.random() - 0.5) * 0.3
            ),
            jitter: 0.6 + Math.random() * 1.2
        });
    }

    animate(time) {
        // --- CAS 1 : EXPLOSION (Désintégration chaotique) ---
        if (this.isExploding) {
            this.explosionTimer += 0.016;
            const fade = Math.max(0, 1 - this.explosionTimer * 0.4);

            this.modules.forEach(m => {
                if (this.explosionTimer > m.delay) m.isFalling = true;

                if (m.isFalling) {
                    m.mesh.position.y -= m.fallSpeed;
                    m.mesh.position.x += m.drift.x + (Math.random() - 0.5) * m.jitter;
                    m.mesh.position.z += m.drift.z + (Math.random() - 0.5) * m.jitter;

                    m.mesh.rotation.x += m.rotSpeed.x;
                    m.mesh.rotation.y += m.rotSpeed.y;
                    m.mesh.rotation.z += m.rotSpeed.z;

                    if (Math.random() > 0.9) {
                        m.edgeMat.color.set(0xffffff);
                        m.mesh.scale.setScalar(Math.random() * 1.5);
                    } else {
                        m.edgeMat.color.copy(this.wireColor);
                    }

                    m.edgeMat.opacity = fade;
                }
            });

            if (fade <= 0) this.isActive = false;
            return;
        }

        // --- CAS 2 : VOL NORMAL & GLITCH DE RENDU ---
        this.modules.forEach(m => {
            if (this.isGhosting) {
                // EFFET DE DISTORSION GROSSIÈRE (Identique aux buildings)
                const offsetAmount = 1.5;
                m.edges.position.x = (Math.random() - 0.5) * offsetAmount;
                m.edges.position.z = (Math.random() - 0.5) * offsetAmount;

                if (Math.random() > 0.7) {
                    m.edgeMat.color.set(0xffffff); // Flash blanc
                    m.edges.scale.setScalar(1.0 + Math.random() * 0.4);
                } else {
                    m.edgeMat.color.copy(this.wireColor);
                    m.edges.scale.setScalar(1.0);
                }

                // Le corps tremble aussi un peu
                m.mesh.position.x += (Math.random() - 0.5) * 0.2;
            } else {
                // Retour au calme
                m.edges.position.set(0, 0, 0);
                m.edges.scale.setScalar(1.0);
                m.edgeMat.color.copy(this.wireColor);
                m.mesh.position.x *= 0.9;
            }
        });

        // Oscillation de vol
        this.shipGroup.position.y = Math.sin(time * 0.8) * 0.5;
    }

    getTopPosition() {
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);

        // On cherche le module le plus élevé
        let maxHeight = 0;
        this.modules.forEach(m => {
            const h = m.mesh.geometry.parameters.height / 2;
            const y = m.mesh.position.y + h;
            if (y > maxHeight) maxHeight = y;
        });

        pos.y += maxHeight;
        return pos;
    }

    updatePosition(speed, delta, getProjection, allElements) {
        // Avancement relatif (le joueur rattrape le vaisseau)
        if (this.isExploding) {
             this.z += (speed * 0.05) * delta;
        } else {
             this.z += (speed * this.relativeSpeedFactor) * delta;
        }

        this.age += delta;
        this.currentXOffset += this.vx * delta * speed;

        // Détection de proximité (Ghosting / Glitch)
        this.isGhosting = false;
        if (allElements && !this.isExploding) {
            for (let el of allElements) {
                if (el !== this && el.type === 'city_scape_element') {
                    const dz = Math.abs(el.z - this.z);
                    const dx = Math.abs(el.mesh.position.x - (this.mesh.position.x));

                    if (dz < 15 && dx < 25) {
                        this.isGhosting = true;
                        // On explose si on reste trop longtemps en état instable
                        if (this.age > 8 && Math.random() > 0.99) {
                            this.isExploding = true;
                        }
                        break;
                    }
                }
            }
        }

        const proj = getProjection(this.z, 0);
        if (proj) {
            // Suivi fluide de l'inclinaison de la route
            const targetRot = (proj.rollAngle || 0) * 0.3;
            this.mesh.rotation.z += (targetRot - this.mesh.rotation.z) * 0.05;

            this.mesh.position.set(
                proj.x + this.currentXOffset,
                proj.y + this.altitude,
                this.z
            );
        }
    }

    dispose() {
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
