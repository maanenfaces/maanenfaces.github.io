import * as THREE from 'three';

export class Bonus extends THREE.Mesh {
    constructor(type) {
        let geo, mat;
        if (type === 'invincible') {
            geo = new THREE.IcosahedronGeometry(0.4, 0);
            mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
        } else if (type === 'speed') {
            geo = new THREE.ConeGeometry(0.3, 0.7, 4);
            mat = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true });
        } else {
            geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            mat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        }

        super(geo, mat);

        this.userData.isBonus = true;
        this.userData.bonusType = type;
        this.userData.initialY = (type === 'invincible') ? 1.5 : 1.0;
        this.position.y = this.userData.initialY;
    }

    update(time) {
        // Rotation
        this.rotation.x = time;
        this.rotation.y = time * 2;
        // Flottaison
        this.position.y = this.userData.initialY + Math.sin(time * 3) * 0.2;
    }
}

export class Robot extends THREE.Group {
    constructor() {
        super();
        this.userData.isRobot = true;
        this.userData.isObstacle = true;
        this.userData.animOffset = Math.random() * 100;

        // --- MATERIAUX ---
        const matBody = new THREE.MeshBasicMaterial({ color: 0x888888, wireframe: true });
        const matLimbs = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
        const matRed = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // --- GEOMETRIE ---

        // 1. JAMBES
        // On crée une géométrie unique pour les membres, avec le pivot en HAUT
        const limbGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
        limbGeo.translate(0, -0.4, 0); // Déplace l'origine au sommet du bloc

        const leftLeg = new THREE.Mesh(limbGeo, matLimbs);
        leftLeg.position.set(-0.25, 0.8, 0); // Hanches à Y=0.8
        this.add(leftLeg);
        this.userData.leftLeg = leftLeg;

        const rightLeg = new THREE.Mesh(limbGeo, matLimbs);
        rightLeg.position.set(0.25, 0.8, 0);
        this.add(rightLeg);
        this.userData.rightLeg = rightLeg;

        // 2. CORPS
        // Le corps fait 0.8 de haut, centré à 1.1 -> Il va de 0.7 à 1.5
        // Il chevauche donc les jambes (qui partent de 0.8) de 0.1 unité.
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.5), matBody);
        body.position.y = 1.1;
        this.add(body);

        // 3. BRAS
        // On utilise une géométrie légèrement plus fine pour les bras
        const armGeo = new THREE.BoxGeometry(0.2, 0.8, 0.2);
        armGeo.translate(0, -0.4, 0); // Pivot en haut (épaule)

        const leftArm = new THREE.Mesh(armGeo, matLimbs);
        leftArm.position.set(-0.5, 1.45, 0); // Epaules à Y=1.45 (dans le haut du corps)
        this.add(leftArm);
        this.userData.leftArm = leftArm;

        const rightArm = new THREE.Mesh(armGeo, matLimbs);
        rightArm.position.set(0.5, 1.45, 0);
        this.add(rightArm);
        this.userData.rightArm = rightArm;

        // 4. TÊTE
        // Posée sur le corps (Y=1.5)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), matRed);
        head.position.y = 1.75; // Centre à 1.75 -> Bas à 1.5
        this.add(head);
    }

    update(time) {
        const t = time + this.userData.animOffset;
        const speed = 10;
        const amp = 0.8;

        if (this.userData.leftLeg) this.userData.leftLeg.rotation.x = Math.sin(t * speed) * amp;
        if (this.userData.rightLeg) this.userData.rightLeg.rotation.x = Math.cos(t * speed) * amp;
        if (this.userData.leftArm) this.userData.leftArm.rotation.x = Math.cos(t * speed) * amp;
        if (this.userData.rightArm) this.userData.rightArm.rotation.x = Math.sin(t * speed) * amp;
    }
}

export class RobotEntity extends THREE.Group {
    constructor() {
        super();

        // Grain de sel aléatoire pour que chaque instance soit unique
        this.seed = Math.random() * 100;
        this.vitesseVariation = 0.5 + Math.random();

        // Matériaux : Blanc brillant pour ressortir dans l'obscurité
        const bodyMat = new THREE.MeshStandardMaterial({
            color: 0xf0f0f0,
            roughness: 0.2,
            metalness: 0.5
        });
        const glowMat = new THREE.MeshStandardMaterial({
            color: 0x00f3ff,
            emissive: 0x00f3ff,
            emissiveIntensity: 2
        });

        // --- Design du corps (plus élancé) ---
        // Buste en forme de diamant
        const torsoGeom = new THREE.CylinderGeometry(0.3, 0.1, 0.7, 4);
        this.torso = new THREE.Mesh(torsoGeom, bodyMat);
        this.torso.position.y = 1.3;
        this.add(this.torso);

        // Tête profilée
        const headGeom = new THREE.CapsuleGeometry(0.15, 0.2, 4, 8);
        this.head = new THREE.Mesh(headGeom, bodyMat);
        this.head.position.y = 0.6; // Relatif au torso
        this.torso.add(this.head);

        // Visière lumineuse fine
        const visor = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.05, 0.1), glowMat);
        visor.position.set(0, 0.1, 0.12);
        this.head.add(visor);

        // --- Membres flottants (Magnétiques) ---
        this.leftArm = this._createLimb(0.1, 0.6, bodyMat, glowMat);
        this.leftArm.position.set(0.45, 0.3, 0);
        this.torso.add(this.leftArm);

        this.rightArm = this._createLimb(0.1, 0.6, bodyMat, glowMat);
        this.rightArm.position.set(-0.45, 0.3, 0);
        this.torso.add(this.rightArm);

        this.leftLeg = this._createLimb(0.12, 0.8, bodyMat, null);
        this.leftLeg.position.set(0.2, -0.4, 0);
        this.torso.add(this.leftLeg);

        this.rightLeg = this._createLimb(0.12, 0.8, bodyMat, null);
        this.rightLeg.position.set(-0.2, -0.4, 0);
        this.torso.add(this.rightLeg);
    }

    _createLimb(width, height, mat, lightMat) {
        const group = new THREE.Group();
        const part = new THREE.Mesh(new THREE.CapsuleGeometry(width, height, 4, 8), mat);
        part.position.y = -height / 2;
        group.add(part);

        if (lightMat) {
            const joint = new THREE.Mesh(new THREE.SphereGeometry(width * 1.2), lightMat);
            group.add(joint);
        }
        return group;
    }

    update(time) {
        const t = time * this.vitesseVariation + this.seed;

        // Mouvement de flottement complexe (somme de sinus pour l'irrégularité)
        const hover = Math.sin(t) * 0.1 + Math.sin(t * 2.5) * 0.02;
        this.torso.position.y = 1.3 + hover;

        // Rotation aléatoire de la tête (cherche du regard)
        this.head.rotation.y = Math.sin(t * 0.5) * 0.5 + Math.cos(t * 1.2) * 0.2;
        this.head.rotation.x = Math.sin(t * 0.3) * 0.1;

        // Mouvement asymétrique des bras
        this.leftArm.rotation.z = Math.sin(t) * 0.1 - 0.2;
        this.rightArm.rotation.z = -Math.sin(t * 1.1) * 0.1 + 0.2;

        this.leftArm.rotation.x = Math.cos(t * 0.5) * 0.2;
        this.rightArm.rotation.x = Math.sin(t * 0.7) * 0.2;

        // Inclinaison légère du corps selon le mouvement
        this.torso.rotation.z = Math.sin(t * 0.5) * 0.05;
    }
}

export class Wall extends THREE.Group {
    constructor() {
        super();
        this.userData.isObstacle = true;

        // Couleur plus vive (Bleu électrique)
        const color = 0x0066ff;

        // Géométrie partagée
        const geometry = new THREE.BoxGeometry(4.5, 2.5, 1);
        // On déplace le pivot en bas (hauteur/2 = 1.25) pour que y=0 soit le sol
        geometry.translate(0, 1.25, 0);

        // 1. Le volume intérieur (Transparent)
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            wireframe: false
        });
        this.add(new THREE.Mesh(geometry, fillMaterial));

        // 2. Les contours (Wireframe)
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 0.9
        });
        this.add(new THREE.Mesh(geometry, wireMaterial));
    }

    update(time) { return; }
}
