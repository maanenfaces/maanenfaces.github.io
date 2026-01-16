import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

export class FlyingShip extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'flying_ship';

        // --- CONFIGURATION ---
        this.altitude = 12 + Math.random() * 20;
        this.baseSpeed = - 0.2 + Math.random() * 0.2;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);

        this.vx = (Math.random() - 0.2) * 0.1;
        this.currentXOffset = (Math.random() - 0.5) * 180;

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
        const mainW = 4 + Math.random() * 4;
        const mainH = 0.8 + Math.random() * 0.5;
        const mainD = 10 + Math.random() * 10;
        this._addModule(mainW, mainH, mainD, 0, 0, 0);

        const numModules = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < numModules; i++) {
            const mW = (Math.random() > 0.5) ? mainW * 2.5 : mainW * 0.6;
            const mH = mainH * (0.5 + Math.random());
            const mD = mainD * (0.2 + Math.random() * 0.5);
            const offsetZ = (Math.random() - 0.5) * mainD * 0.8;
            this._addModule(mW, mH, mD, 0, (Math.random() - 0.5), offsetZ);
        }
    }

    _addModule(w, h, d, x, y, z) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const bMat = new THREE.MeshBasicMaterial({ color: 0x020202, transparent: true, opacity: 0.6 });
        const mesh = new THREE.Mesh(geo, bMat);
        mesh.position.set(x, y, z);
        this.shipGroup.add(mesh);

        const eMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.8 });
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), eMat);
        mesh.add(edges);

        const tMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
        const tri = new THREE.LineSegments(new THREE.WireframeGeometry(geo), tMat);
        mesh.add(tri);

        this.modules.push({
            mesh: mesh,
            body: bMat,
            edge: eMat,
            triMat: tMat,
            triObj: tri,
            isFalling: false,
            delay: Math.random() * 1.5,
            // --- NOUVELLES FORCES DE DÉSORDRE ---
            fallSpeed: 0.1 + Math.random() * 0.2,
            drift: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, (Math.random() - 0.5) * 0.5),
            rotSpeed: new THREE.Vector3(
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4,
                (Math.random() - 0.5) * 0.4
            ),
            jitter: 0.5 + Math.random() * 1.2
        });
    }

    getTopPosition() {
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);
        pos.y += 2;
        return pos;
    }

    animate(time) {
        if (this.isExploding) {
            this.explosionTimer += 0.016;
            const fade = Math.max(0, 1 - this.explosionTimer * 0.4);

            this.modules.forEach(m => {
                if (this.explosionTimer > m.delay) m.isFalling = true;

                if (m.isFalling) {
                    // 1. DÉSORDRE DE POSITION (Chute + Dérive + Tremblement)
                    m.mesh.position.y -= m.fallSpeed;
                    m.mesh.position.x += m.drift.x + (Math.random() - 0.5) * m.jitter;
                    m.mesh.position.z += m.drift.z + (Math.random() - 0.5) * m.jitter;

                    // 2. DÉSORDRE DE ROTATION (N'importe quel sens)
                    m.mesh.rotation.x += m.rotSpeed.x;
                    m.mesh.rotation.y += m.rotSpeed.y;
                    m.mesh.rotation.z += m.rotSpeed.z;

                    // 3. GLITCH VISUEL AGRESSIF
                    const glitch = Math.random();
                    if (glitch > 0.9) {
                        m.triObj.visible = true;
                        m.triMat.opacity = fade;
                        m.triMat.color.copy(this.glitchPalette[Math.floor(Math.random() * 3)]);
                        // Déformation brutale
                        m.mesh.scale.set(Math.random() * 3, Math.random() * 0.5, Math.random() * 3);
                    } else if (glitch > 0.8) {
                        m.mesh.visible = false; // "Flicker" (clignotement)
                    } else {
                        m.triObj.visible = false;
                        m.mesh.visible = true;
                        m.mesh.scale.set(1, 1, 1);
                    }

                    // 4. FADE
                    m.edge.opacity = fade * 0.8;
                    m.body.opacity = fade * 0.3;
                }
            });

            if (fade <= 0) this.isActive = false;
            return;
        }

        // ... Reste de l'animation normale (ghosting, etc.)
        const fastTick = Math.floor(time * 60) % 2 === 0;
        this.modules.forEach(m => {
            if (this.isGhosting) {
                m.triObj.visible = fastTick;
                m.triMat.opacity = fastTick ? 1.0 : 0;
                m.body.opacity = 0.1;
                m.mesh.position.x += (Math.random() - 0.5) * 0.2;
            } else {
                m.triObj.visible = false;
                m.body.opacity = 0.6;
                m.mesh.position.x *= 0.9;
                // On s'assure que la rotation revient à 0 après un ghosting
                m.mesh.rotation.set(0, 0, 0);
            }
        });
        this.shipGroup.position.y = Math.sin(time * 0.5) * 0.3;
    }

    updatePosition(speed, delta, getProjection, allElements) {
        // On stoppe l'avancée Z au moment précis de l'explosion pour voir les morceaux tomber
        if (this.isExploding) {
             // On peut laisser une inertie résiduelle (10% de la vitesse)
             this.z += (speed * this.baseSpeed * 0.1) * delta;
        } else {
             this.z += (speed * this.baseSpeed) * delta;
        }

        this.age += delta;
        this.currentXOffset += this.vx * delta;

        // Collision & Destruction
        this.isGhosting = false;
        if (allElements && !this.isExploding) {
            for (let el of allElements) {
                if (el !== this && el.type === 'city_scape_element') {
                    const dz = Math.abs(el.z - this.z);
                    const dx = Math.abs(el.mesh.position.x - (this.mesh.position.x));

                    if (dz < 12 && dx < 18) {
                        this.isGhosting = true;
                        if (this.age > 10 && Math.random() > 0.985) {
                            this.isExploding = true;
                        }
                        break;
                    }
                }
            }
        }

        const proj = getProjection(this.z, 0);
        if (proj) {
            this.mesh.position.set(proj.x + this.currentXOffset, proj.y + this.altitude, this.z);
            this.mesh.rotation.z = (proj.rollAngle || 0) * 0.1;
        }
    }

    dispose() {
        this.mesh.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
