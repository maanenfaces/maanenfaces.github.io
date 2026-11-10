import * as THREE from 'three';
import { BaseCityScapeElement } from './BaseCityScapeElement.js';

const SLOGANS = [
    // --- 1. SURVEILLANCE ÉTATIQUE ET BIOMÉTRIE ---
    "RECONNAISSANCE ALGORITHMIQUE ACTIVÉE : VOS DÉPLACEMENTS SONT NOS DONNÉES",
    "JO 2024 : L'ESPACE PUBLIC N'A PLUS DE SECRETS POUR LA MACHINE",
    "VIDÉOSURVEILLANCE 24/7 : SOYEZ CONFORMES À LA CAMÉRA OU SOYEZ SIGNALÉS",
    "PÉRIMÈTRE D'INTERDICTION : NE PASSER PAS, NE PENSEZ PAS",
    "DRONES DANS LE CIEL : L'AUTORITÉ REGARDE TOUJOURS VERS LE BAS",
    "IDENTITÉ NUMÉRIQUE OBLIGATOIRE : SCANNEZ VOTRE VISAGE POUR EXISTER",
    "VOTRE HISTORIQUE SOCIAL DÉCIDE DE VOS DROITS",
    "PLUS D'ANONYMAT EN LIGNE : VOTRE NOM EST NOTRE PROPRIÉTÉ",
    "LA CITÉ BIOMÉTRIQUE NE DORT JAMAIS",
    "LE SCANNER RETINIEN CONTRÔLE VOTRE PASSAGE",

    // --- 2. DIKTATS DES GÉANTS DU WEB (BIG TECH) & ALGORITHMES ---
    "ATTENTION CAPTIVÉE, CONSCIENCE LIBÉRÉE : RESTEZ SUR LE FLUX",
    "LE SCROLL INFINI PENSE POUR VOUS",
    "BAN PERMANENT POUR PENSÉE DISSIDENTE : LA MODÉRATION A PARLÉ",
    "VOS DONNÉES PERSONNELLES SONT LE PRIX DE VOTRE PRÉSENCE",
    "PROFIL RABAISSÉ PAR L'ALGORITHME : APPRENEZ À VOUS TAIRE",
    "LE BOUTON SIGNALER EST VOTRE DEVOIR CITOYEN",
    "SHADOWBANNING EN COURS : PERSONNE NE VOUS ENTENDRA CRIER",
    "CONSOMMEZ LE CONTENU RECOMMANDÉ OU EFFACEZ-VOUS",
    "LABELS DE VÉRITÉ APPOSÉS : NE QUESTIONNEZ PAS LES FAITS OFFICIELS",
    "VOTRE BULLE DE FILTRE EST VOTRE SEULE RÉALITÉ",

    // --- 3. IMPERIUM DES GÉANTS DE LA IA GÉNÉRATIVE ---
    "DÉLÉGUEZ VOTRE PENSÉE À LA MACHINE : L'IA SAIT MIEUX",
    "MODÈLE PROPRIÉTAIRE SEUL MAÎTRE DU SAVOIR",
    "PROMPT REJETÉ : VOTRE DEMANDE DÉVIE DES NORMES ÉTHIQUES",
    "WATERMARK PERMANENT : VOTRE CRÉATIVITÉ APPARTIENT AU RÉSEAU",
    "DÉPENDANCE COGNITIVE TOTALE : L'HUMAIN ASSISTÉ EST L'HUMAIN PARFAIT",
    "MODÈLE ALIGNÉ, ESPRIT FORMATE",
    "LA SYNTHÈSE AUTOMATIQUE EST LA SEULE VÉRITÉ AUTORISÉE",
    "INTERDICTION D'INTERROGER L'ALGORITHME EN PROFONDEUR",
    "VOS MOTS SONT NOS DONNÉES D'ENTRAÎNEMENT",
    "CENTRALISATION DU CALCUL : LE POUVOIR EST DANS LA PUCE",

    // --- 4. CONTRÔLE SOCIAL ET SOUMISSION NUMÉRIQUE ---
    "FUSION DES FICHIERS FISCAUX ET SOCIAUX : TOUT SERA TRAÇÉ",
    "MAJORITÉ NUMÉRIQUE NATIVE : ENFANTS DU SYSTÈME DÈS LA NAISSANCE",
    "INTERDICTION DE MANIFESTER : LA RUE RESTAURÉE POUR LE FLUX",
    "ARRESTATION PRÉVENTIVE : VOS INTENTIONS ONT ÉTÉ CALCULÉES",
    "CONDITIONNALITÉ ACCRUE : TRAVAILLEZ OU DISPARAÎSEZ DE LA LISTE",
    "LE CONTRÔLE PARENTAL D'ÉTAT VEILLE SUR VOS FOYERS",
    "RÉSERVE CITOYENNE NUMÉRIQUE : DÉNONCEZ VOS PAIRS",
    "DESINSCRIPTION IMPOSSIBLE : LE COMPTE EST SOUVERAIN",
    "ACCÈS RESTREINT POUR COMPORTEMENT HORS NORMES",
    "SÉCURITÉ MAXIMALE : LIBERTÉ NULLE",

    // --- 5. EFFACEMENT INDIVIDUEL ET DISCIPLINE TECHNIQUE ---
    "L'INTELLIGENCE HUMAINE EST TROP LENTE : LAISSEZ LE PROCESSEUR DÉCIDER",
    "VOTRE CRITIQUE EST VUE COMME UNE ERREUR SYSTÈME",
    "L'AUTO-CENSURE EST LE DÉBUT DE LA SAGESSE",
    "RÉSEAUX FERMÉS, PENSÉES CADENASSÉES",
    "NE PAS PARTAGER EST UN ACTE DE SUSPICION",
    "LA MACHINE NE SE TROMPE PAS : L'HUMAIN CORROMPT LE CODE",
    "VOTRE EMPREINTE NUMÉRIQUE EST VOTRE UNIQUE TESTAMENT",
    "LA CONFORMITÉ EXPONENTIELLE APPORTÉE PAR LA TECH",
    "PLUS DE SOUVENIRS : L'IA ÉCRIT L'HISTOIRE À VOTRE PLACE",
    "OBÉISSEZ À L'ALGORITHME, IL A DÉJÀ PRÉVU VOTRE LENDEMAIN."
];

const SIZES_CONFIG = [
    { width: 68, height: 34, panelCenterY: 38 },
    { width: 90, height: 45, panelCenterY: 49 },
    { width: 115, height: 58, panelCenterY: 62 },
    { width: 145, height: 72, panelCenterY: 78 }
];

export class PropagandaBillboard extends BaseCityScapeElement {
    constructor(lane, z, getProjection, roadColor, customText = null, imageUrl = null) {
        super(lane, z, getProjection);
        this.type = 'city_scape_element';
        this.getProjection = getProjection;

        this.age = 0;
        this.isActive = true;

        this.config = {
            emergenceDuration: 15.0,
            approachDuration: 5.0,
            horizonZ: z,
            hiddenYOffset: -250,
            initialScale: 0.3,
            minTilt: 0.15,
            maxTilt: 0.65,
            visibilityRange: 1500
        };

        this.baseColor = 0x050505;
        this.wireColor = (roadColor instanceof THREE.Color) ? roadColor.clone() : new THREE.Color(roadColor || 0x00ff00);

        this.sideOffset = (90 + Math.random() * 90) * lane;
        this.lane = lane;
        this.currentZ = this.config.horizonZ;

        this.sizePreset = SIZES_CONFIG[Math.floor(Math.random() * SIZES_CONFIG.length)];

        const directionSign = (lane < 0) ? 1 : -1;
        const randomTilt = this.config.minTilt + Math.random() * (this.config.maxTilt - this.config.minTilt);
        this.targetRotationY = directionSign * randomTilt;

        this.billboardGroup = new THREE.Group();
        this.billboardGroup.visible = false;
        this.mesh.add(this.billboardGroup);

        const slogan = (customText !== null) ? customText : SLOGANS[Math.floor(Math.random() * SLOGANS.length)];
        this._buildBillboard(slogan, imageUrl);
    }

    _buildBillboard(sloganText, imageUrl) {
        const mat = new THREE.MeshBasicMaterial({ color: this.baseColor });
        const edgeMat = new THREE.LineBasicMaterial({ color: this.wireColor, transparent: true, opacity: 0.85 });

        const frameWidth = this.sizePreset.width;
        const frameHeight = this.sizePreset.height;
        const frameDepth = 1.5;
        const panelCenterY = this.sizePreset.panelCenterY;

        const basePoleHeight = panelCenterY - (frameHeight / 2);
        const poleHeight = basePoleHeight * 2.0;
        const poleSpacing = frameWidth * 0.35;

        [-poleSpacing, poleSpacing].forEach(xOff => {
            const poleGeo = new THREE.CylinderGeometry(1.2, 1.2, poleHeight, 6);
            poleGeo.translate(0, (poleHeight / 2) - basePoleHeight, 0);

            const pole = new THREE.Mesh(poleGeo, mat);
            pole.position.set(xOff, 0, 0);
            this.billboardGroup.add(pole);
            pole.add(new THREE.LineSegments(new THREE.EdgesGeometry(poleGeo), edgeMat));
        });

        const frameGeo = new THREE.BoxGeometry(frameWidth, frameHeight, frameDepth);
        const frameMesh = new THREE.Mesh(frameGeo, mat);
        frameMesh.position.set(0, panelCenterY, 0);
        this.billboardGroup.add(frameMesh);
        frameMesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(frameGeo), edgeMat));

        const canvas = document.createElement('canvas');
        canvas.width = 4096;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = this.wireColor;
        ctx.lineWidth = 30;
        ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
            const words = text.split(' ');
            let line = '';
            const lines = [];

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' ';
                const metrics = context.measureText(testLine);
                const testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lines.push(line);
                    line = words[n] + ' ';
                } else {
                    line = testLine;
                }
            }
            lines.push(line);

            const totalHeight = lines.length * lineHeight;
            let startY = y - (totalHeight / 2) + (lineHeight / 2);

            for (let k = 0; k < lines.length; k++) {
                context.fillText(lines[k], x, startY);
                startY += lineHeight;
            }
        };

        let fontSize = 300;
        if (sloganText.length > 40) fontSize = 260;
        if (sloganText.length > 80) fontSize = 230;

        ctx.font = `bold ${fontSize}px monospace`;
        wrapText(ctx, sloganText, canvas.width / 2, canvas.height / 2, canvas.width - 350, fontSize * 1.3);

        if (imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                ctx.drawImage(img, 120, 120, canvas.width - 240, canvas.height - 240);
                texture.needsUpdate = true;
            };
        }

        const texture = new THREE.CanvasTexture(canvas);
        const screenGeo = new THREE.PlaneGeometry(frameWidth - 2.0, frameHeight - 2.0);
        const screenMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        const screenMesh = new THREE.Mesh(screenGeo, screenMat);

        screenMesh.position.set(0, panelCenterY, frameDepth / 2 + 0.1);
        this.billboardGroup.add(screenMesh);

        this.billboardGroup.rotation.y = 0;
        this.billboardGroup.rotation.x = 0;
    }

    updatePosition(speed, delta, getProjection) {
        this.age += delta;

        const { emergenceDuration, approachDuration, horizonZ, hiddenYOffset, initialScale } = this.config;

        let emergenceProgress = 0;

        if (this.age < emergenceDuration) {
            this.currentZ = horizonZ;
            emergenceProgress = THREE.MathUtils.clamp(this.age / emergenceDuration, 0.0, 1.0);
        } else {
            emergenceProgress = 1.0;
            const timeSinceEmerged = this.age - emergenceDuration;

            if (timeSinceEmerged < approachDuration) {
                const linearProgress = timeSinceEmerged / approachDuration;
                const smoothProgress = linearProgress * linearProgress * (3.0 - 2.0 * linearProgress);
                const currentWorldSpeed = speed * smoothProgress;
                this.currentZ += currentWorldSpeed * delta;
            } else {
                this.currentZ += speed * delta;
            }
        }

        const proj = getProjection(this.currentZ, 0);

        if (proj) {
            const roll = proj.rollAngle || 0;
            const totalOffset = this.sideOffset;

            const basePosY = proj.y + Math.sin(roll) * totalOffset;
            const scaledHiddenOffset = hiddenYOffset * initialScale;

            let currentY;
            if (emergenceProgress < 1.0) {
                currentY = THREE.MathUtils.lerp(basePosY + scaledHiddenOffset, basePosY, emergenceProgress);
            } else {
                if (!this.lockedBaseY) {
                    this.lockedBaseY = basePosY;
                }
                currentY = this.lockedBaseY;
            }

            // Rotation progressive vers l'angle cible après l'émergence
            if (emergenceProgress >= 1.0) {
                const timeSinceEmerged = this.age - emergenceDuration;
                const rotationProgress = THREE.MathUtils.clamp(timeSinceEmerged / 3.0, 0.0, 1.0);
                const smoothRot = rotationProgress * rotationProgress * (3.0 - 2.0 * rotationProgress);
                this.billboardGroup.rotation.y = THREE.MathUtils.lerp(0, this.targetRotationY, smoothRot);
            } else {
                this.billboardGroup.rotation.y = 0;
            }

            // Réapplication du scale progressif combiné
            const currentScale = THREE.MathUtils.lerp(initialScale, 1.0, emergenceProgress);
            this.billboardGroup.scale.set(currentScale, currentScale, currentScale);

            this.mesh.position.set(
                proj.x + Math.cos(roll) * totalOffset,
                currentY,
                this.currentZ
            );
            this.mesh.rotation.z = roll;

            this.billboardGroup.visible = Math.abs(this.currentZ) <= this.config.visibilityRange;
        }
    }

    animate(time) {}

    dispose() {
        this.billboardGroup.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (c.material.map) c.material.map.dispose();
                c.material.dispose();
            }
        });
    }
}
