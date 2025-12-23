import * as THREE from 'three';

export class Selenite extends THREE.Group {
    constructor(color) {
        super();
        this.userData.isPlayer = true;

        const bodyMat = new THREE.MeshBasicMaterial({ color: color });
        const limbMat = new THREE.MeshBasicMaterial({ color: color });

        const texLoader = new THREE.TextureLoader();
        const headTex = texLoader.load('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Synthese%2B.svg/200px-Synthese%2B.svg.png');
        const headMat = new THREE.MeshBasicMaterial({ map: headTex, color: 0xffffff });

        // CORPS
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.5), bodyMat);
        body.position.y = 1.0;
        this.add(body);

        // TÊTE
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.1), headMat);
        head.position.y = 1.8;
        this.add(head);

        // MEMBRES
        // On prépare la géométrie une seule fois pour éviter les décalages cumulés
        const limbGeo = new THREE.BoxGeometry(0.25, 0.9, 0.25);
        limbGeo.translate(0, -0.45, 0); // Pivot en haut

        this.leftLeg = new THREE.Mesh(limbGeo, limbMat);
        this.leftLeg.position.set(-0.25, 0.5, 0);
        this.add(this.leftLeg);

        this.rightLeg = new THREE.Mesh(limbGeo, limbMat);
        this.rightLeg.position.set(0.25, 0.5, 0);
        this.add(this.rightLeg);

        this.leftArm = new THREE.Mesh(limbGeo, limbMat);
        this.leftArm.position.set(-0.55, 1.4, 0);
        this.add(this.leftArm);

        this.rightArm = new THREE.Mesh(limbGeo, limbMat);
        this.rightArm.position.set(0.55, 1.4, 0);
        this.add(this.rightArm);
    }

    update(time, isJumping) {
        const runSpeed = 8;
        const amp = 0.8;

        if (isJumping) {
            // Pose de saut
            this.leftLeg.rotation.x = 0.5;
            this.rightLeg.rotation.x = -0.5;
            this.leftArm.rotation.x = -0.5;
            this.rightArm.rotation.x = 0.5;
        } else {
            // Animation de course
            this.leftLeg.rotation.x = Math.sin(time * runSpeed) * amp;
            this.rightLeg.rotation.x = Math.cos(time * runSpeed) * amp;
            this.leftArm.rotation.x = Math.cos(time * runSpeed) * amp;
            this.rightArm.rotation.x = Math.sin(time * runSpeed) * amp;
        }
    }
}

export class Square extends THREE.Mesh {
    constructor(color) {
        super(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: color }));
        this.userData.isPlayer = true;
        this.position.y = 0.5;
    }

    update(time, isJumping) {
        if (isJumping) {
            // Rotation rapide pendant le saut
            this.rotation.x += 0.2;
            this.rotation.y += 0.2;
        } else {
            // Reset et petit rebond au sol
            this.rotation.x = 0;
            this.rotation.y = 0;
            this.position.y = 0.5 + Math.abs(Math.sin(time * 10)) * 0.1;
        }
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

export class Wall extends THREE.Mesh {
    constructor() {
        // Mur large (4.5) et haut (2.5)
        super(new THREE.BoxGeometry(4.5, 2.5, 1), new THREE.MeshBasicMaterial({ color: 0x4444ff, wireframe: true }));
        this.userData.isObstacle = true;
        // Le centre est à Y=1.25 pour que le bas soit à 0
        this.position.y = 1.25;
    }

    update(time) { return; }
}

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
