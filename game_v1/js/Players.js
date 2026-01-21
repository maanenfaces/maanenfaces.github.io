import * as THREE from 'three';

export class SelenitePlayer extends THREE.Group {
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

export class SquareV1Player extends THREE.Group {
    constructor(color) {
        super();
        this.userData.isPlayer = true;

        // On crée une géométrie unique partagée
        const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        geometry.translate(0, 1, 0); // Décalage vertical appliqué à la géométrie

        // 1. Le volume intérieur (Transparent)
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5,
            wireframe: false // Faces pleines
        });
        this.add(new THREE.Mesh(geometry, fillMaterial));

        // 2. Les contours (Wireframe)
        // On peut mettre une opacité un peu plus forte pour que les lignes ressortent
        const wireMaterial = new THREE.MeshBasicMaterial({
            color: color,
            wireframe: true,
            transparent: true,
            opacity: 1
        });
        this.add(new THREE.Mesh(geometry, wireMaterial));
    }

    update(time, isJumping) { return; }
}

export class SquareV2Player extends THREE.Mesh {
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

export const PLAYER_CLASSES = {
    SelenitePlayer,
    SquareV1Player,
    SquareV2Player
};
