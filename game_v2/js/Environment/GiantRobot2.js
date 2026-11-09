import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';
import { LANE_WIDTH } from '../Config.js';

export class GiantRobot2 extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor) {
        super(lane, z, getProjection);
        this.type = 'city_scape_element';
        this.getProjection = getProjection;

        const prefixes = ["Vanguard", "Stalker", "Apex", "Razor", "Strike"];
        const numbers = Math.floor(10 + Math.random() * 90);
        this.robotName = `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${numbers}`;

        this.baseColor = 0x020202;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);
        this.sideOffset = 24 + Math.random() * 25;

        this.config = {
            walkSpeedFactor: 0.085, // Un peu plus vif
            laserInterval: 4.5,
            laserDuration: 4.0,
            laserDownAngleMin: 40,
            laserDownAngleMax: 70,
            torsoTurnFactor: 0.35,
            visibilityRange: 800,
            hitboxZMax: 4.0,
            laserRadius: 1.5,
            overlapThreshold: 0.4,
            displayName: false
        };

        this.config.laserDownAngle = this.config.laserDownAngleMin + Math.random() * (this.config.laserDownAngleMax - this.config.laserDownAngleMin);

        this.robotGroup = new THREE.Group();
        this.robotGroup.visible = false;
        this.mesh.add(this.robotGroup);

        this.torsoGroup = null;
        this.headGroup = null;
        this.leftArmGroup = null;
        this.rightArmGroup = null;
        this.leftLegGroup = null;
        this.rightLegGroup = null;
        this.leftShinGroup = null;
        this.rightShinGroup = null;
        this.eyeMat = null;
        this.redLight = null;
        this.laserMesh = null;
        this.nameSprite = null;

        this.walkPhase = Math.random() * Math.PI * 2;
        this.laserTimer = Math.random() * 2.0;
        this.isFiringLaser = false;
        this.laserProgress = 0;
        this.isActive = true;

        this._buildVanguardMesh();
    }

    _buildVanguardMesh() {
        const group = this.robotGroup;
        const mat = new THREE.MeshBasicMaterial({ color: this.baseColor });
        const edgeMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.85 });

        // --- TORSE : Forme trapézoïdale inversée (épaules larges) ---
        this.torsoGroup = new THREE.Group();
        this.torsoGroup.position.y = 31;
        group.add(this.torsoGroup);

        const chestGeo = new THREE.CylinderGeometry(8, 5, 14, 6);
        const chestMesh = new THREE.Mesh(chestGeo, mat);
        this.torsoGroup.add(chestMesh);
        chestMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(chestGeo), edgeMat));

        // --- TÊTE : Forme pyramidale/anguleuse avec visière horizontale fine ---
        this.headGroup = new THREE.Group();
        this.headGroup.position.set(0, 11, 0);
        this.headGroup.rotation.order = 'YXZ';
        this.torsoGroup.add(this.headGroup);

        const headGeo = new THREE.ConeGeometry(3.5, 4, 5);
        const headMesh = new THREE.Mesh(headGeo, mat);
        headMesh.rotation.y = Math.PI / 5;
        this.headGroup.add(headMesh);
        headMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(headGeo), edgeMat));

        // Visière unique orange perçante
        const visorGeo = new THREE.BoxGeometry(4.0, 0.4, 0.5);
        this.eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
        const visorMesh = new THREE.Mesh(visorGeo, this.eyeMat);
        visorMesh.position.set(0, 0.2, 2.3);
        this.headGroup.add(visorMesh);
        visorMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(visorGeo), edgeMat));

        this.redLight = new THREE.PointLight(0xff5500, 5.0, 150);
        this.redLight.position.set(0, 0.2, 3.0);
        this.headGroup.add(this.redLight);

        // --- FAISCEAU LASER ORANGE ---
        const laserGeo = new THREE.CylinderGeometry(0.3, 1.8, 300, 6);
        laserGeo.rotateX(Math.PI / 2);
        laserGeo.translate(0, 0, 150);
        const laserMat = new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        this.laserMesh = new THREE.Mesh(laserGeo, laserMat);
        this.laserMesh.position.set(0, 0, 1.5);
        this.laserMesh.visible = false;
        this.headGroup.add(this.laserMesh);

        // --- ÉPAULES & BRAS ---
        [-8.5, 8.5].forEach(xOff => {
            const shoulderGeo = new THREE.BoxGeometry(4, 4, 4);
            const shoulderMesh = new THREE.Mesh(shoulderGeo, mat);
            shoulderMesh.position.set(xOff, 5, 0);
            this.torsoGroup.add(shoulderMesh);
            shoulderMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(shoulderGeo), edgeMat));
        });

        this.leftArmGroup = new THREE.Group();
        this.leftArmGroup.position.set(-10.5, 4, 0);
        this.torsoGroup.add(this.leftArmGroup);
        this._buildArm(this.leftArmGroup, mat, edgeMat);

        this.rightArmGroup = new THREE.Group();
        this.rightArmGroup.position.set(10.5, 4, 0);
        this.torsoGroup.add(this.rightArmGroup);
        this._buildArm(this.rightArmGroup, mat, edgeMat);

        // --- HANCHES & JAMBES ---
        [-2.5, 2.5].forEach(xOff => {
            const tubeGeo = new THREE.CylinderGeometry(0.5, 0.5, 8, 6);
            const tube = new THREE.Mesh(tubeGeo, mat);
            tube.position.set(xOff, -9, 0);
            this.torsoGroup.add(tube);
            tube.add(new THREE.LineSegments(new THREE.EdgesGeometry(tubeGeo), edgeMat));
        });

        this.leftLegGroup = new THREE.Group();
        this.leftLegGroup.position.set(-4, 20, 0);
        group.add(this.leftLegGroup);
        this.leftShinGroup = this._buildLeg(this.leftLegGroup, mat, edgeMat);

        this.rightLegGroup = new THREE.Group();
        this.rightLegGroup.position.set(4, 20, 0);
        group.add(this.rightLegGroup);
        this.rightShinGroup = this._buildLeg(this.rightLegGroup, mat, edgeMat);
    }

    _buildArm(armGroup, mat, edgeMat) {
        const upperGeo = new THREE.BoxGeometry(2.5, 8, 2.5);
        const upper = new THREE.Mesh(upperGeo, mat);
        upper.position.y = -4;
        armGroup.add(upper);
        upper.add(new THREE.LineSegments(new THREE.EdgesGeometry(upperGeo), edgeMat));

        const lowerGeo = new THREE.BoxGeometry(2, 7, 2);
        const lower = new THREE.Mesh(lowerGeo, mat);
        lower.position.y = -12;
        armGroup.add(lower);
        lower.add(new THREE.LineSegments(new THREE.EdgesGeometry(lowerGeo), edgeMat));
    }

    _buildLeg(legGroup, mat, edgeMat) {
        const thighGeo = new THREE.CylinderGeometry(3, 2.5, 8, 6);
        const thigh = new THREE.Mesh(thighGeo, mat);
        thigh.position.y = -4;
        legGroup.add(thigh);
        thigh.add(new THREE.LineSegments(new THREE.EdgesGeometry(thighGeo), edgeMat));

        const shinGroup = new THREE.Group();
        shinGroup.position.y = -8;
        legGroup.add(shinGroup);

        const shinGeo = new THREE.CylinderGeometry(2.5, 3, 8, 6);
        const shin = new THREE.Mesh(shinGeo, mat);
        shin.position.y = -4;
        shinGroup.add(shin);
        shin.add(new THREE.LineSegments(new THREE.EdgesGeometry(shinGeo), edgeMat));

        const footGeo = new THREE.BoxGeometry(5.5, 2, 8);
        const foot = new THREE.Mesh(footGeo, mat);
        foot.position.set(0, -8.5, 1);
        shinGroup.add(foot);
        foot.add(new THREE.LineSegments(new THREE.EdgesGeometry(footGeo), edgeMat));

        return shinGroup;
    }

    animate(time) {}

    getTopPosition() {
        const pos = new THREE.Vector3();
        this.mesh.getWorldPosition(pos);
        if (this.torsoGroup) pos.y += this.torsoGroup.position.y + 12;
        return pos;
    }

    updatePosition(speed, delta, getProjection) {
        this.z += speed * delta;
        const proj = getProjection(this.z, 0);

        if (proj) {
            const roll = proj.rollAngle || 0;
            const totalOffset = this.lane * this.sideOffset;

            this.mesh.position.set(
                proj.x + Math.cos(roll) * totalOffset,
                proj.y + Math.sin(roll) * totalOffset,
                this.z
            );
            this.mesh.rotation.z = roll;
            this.robotGroup.visible = Math.abs(this.z) <= this.config.visibilityRange;
        }

        if (this.robotGroup.visible) {
            const effectiveSpeed = Math.abs(speed);
            this.walkPhase += effectiveSpeed * delta * this.config.walkSpeedFactor;
            const t = this.walkPhase;

            if (this.torsoGroup && this.leftArmGroup && this.rightArmGroup && this.leftLegGroup && this.rightLegGroup && this.leftShinGroup && this.rightShinGroup) {
                this.leftLegGroup.rotation.x = Math.sin(t) * 0.45;
                this.rightLegGroup.rotation.x = -Math.sin(t) * 0.45;

                this.leftShinGroup.rotation.x = Math.max(0, Math.sin(t)) * 0.6 + 0.1;
                this.rightShinGroup.rotation.x = Math.max(0, Math.sin(t + Math.PI)) * 0.6 + 0.1;

                this.leftArmGroup.rotation.x = -Math.sin(t) * 0.35;
                this.rightArmGroup.rotation.x = Math.sin(t) * 0.35;

                const bobbing = Math.abs(Math.sin(t * 2));
                this.torsoGroup.position.y = 31 + bobbing * 1.0;

                if (!this.isFiringLaser) {
                    this.torsoGroup.rotation.y = Math.sin(t) * 0.08;
                    this.torsoGroup.rotation.z = Math.sin(t) * 0.03;
                }
            }

            this.laserTimer += delta;
            const sideDir = (this.lane * this.sideOffset > 0) ? -1 : 1;

            if (!this.isFiringLaser && this.laserTimer >= this.config.laserInterval) {
                this.isFiringLaser = true;
                this.laserProgress = 0;
                this.laserTimer = 0;
            }

            if (this.isFiringLaser && this.headGroup) {
                this.laserProgress += delta;
                const duration = this.config.laserDuration;
                const p = this.laserProgress / duration;

                let targetHeadRotY = 0;
                let targetHeadRotX = 0;

                if (p < 1.0) {
                    const downAngle = Math.PI * (this.config.laserDownAngle / 180);
                    const turnAngle = sideDir * (Math.PI / 2.8);

                    if (p < 0.3) {
                        const subP = p / 0.3;
                        targetHeadRotY = THREE.MathUtils.lerp(0, turnAngle, subP);
                        targetHeadRotX = THREE.MathUtils.lerp(0, downAngle, subP);
                        this.laserMesh.visible = false;
                    } else if (p >= 0.3 && p < 0.8) {
                        targetHeadRotY = turnAngle;
                        targetHeadRotX = downAngle;
                        this.laserMesh.visible = true;
                        if (this.redLight && this.eyeMat) {
                            this.redLight.intensity = 15.0;
                            this.eyeMat.opacity = 1.0;
                        }
                    } else {
                        const subP = (p - 0.8) / 0.2;
                        targetHeadRotY = THREE.MathUtils.lerp(turnAngle, 0, THREE.MathUtils.clamp(subP, 0, 1));
                        targetHeadRotX = THREE.MathUtils.lerp(downAngle, 0, THREE.MathUtils.clamp(subP, 0, 1));
                        this.laserMesh.visible = false;
                    }

                    this.headGroup.rotation.y = targetHeadRotY;
                    this.headGroup.rotation.x = targetHeadRotX;

                    if (this.torsoGroup) {
                        const walkRotY = Math.sin(t) * 0.08;
                        this.torsoGroup.rotation.y = walkRotY + (targetHeadRotY * this.config.torsoTurnFactor);
                    }
                } else {
                    this.isFiringLaser = false;
                    this.laserProgress = 0;
                    this.laserMesh.visible = false;
                    this.headGroup.rotation.set(0, 0, 0);
                }
            } else if (this.headGroup && !this.isFiringLaser) {
                if (this.redLight && this.eyeMat) {
                    const flicker = Math.sin(this.walkPhase * 6.0) * 0.3 + 0.5;
                    this.redLight.intensity = 3.0 + flicker * 3.0;
                    this.eyeMat.opacity = 0.6 + flicker * 0.4;
                }
            }
        }
    }

    handleCollisions(player) {
        if (!this.robotGroup.visible || !this.isFiringLaser || !this.laserMesh || !this.laserMesh.visible) return false;
        const targetZ = 3.0;
        const robotWorldPos = new THREE.Vector3();
        this.mesh.getWorldPosition(robotWorldPos);
        if (Math.abs(robotWorldPos.z - targetZ) > this.config.hitboxZMax) return false;

        const roadProj = this.getProjection ? this.getProjection(targetZ, 0) : { x: 0 };
        const playerX = roadProj.x + (player.currentLane * LANE_WIDTH);
        const playerY = player.mesh.position.y + 1.0;
        const playerPos = new THREE.Vector3(playerX, playerY, targetZ);

        this.laserMesh.updateMatrixWorld(true);
        const laserStart = new THREE.Vector3(0, 0, 0).applyMatrix4(this.laserMesh.matrixWorld);
        const laserEnd = new THREE.Vector3(0, 0, 300).applyMatrix4(this.laserMesh.matrixWorld);

        const laserLine = new THREE.Line3(laserStart, laserEnd);
        const closestPoint = new THREE.Vector3();
        laserLine.closestPointToPoint(playerPos, true, closestPoint);

        return playerPos.distanceTo(closestPoint) <= (this.config.laserRadius + 1.0);
    }

    dispose() {
        this.robotGroup.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) c.material.dispose();
        });
    }
}
