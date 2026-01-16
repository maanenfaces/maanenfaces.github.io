import { GhostBonus } from './GhostBonus.js';
import { JumpBonus } from './JumpBonus.js';
import { PointBonus } from './PointBonus.js';
import { SpeedBonus } from './SpeedBonus.js';
import { ChasingWall } from './ChasingWall.js';
import { FallingWall } from './FallingWall.js';
import { MovingWall } from './MovingWall.js';
import { Wall } from './Wall.js';

export class EntityManager {
    constructor(scene) {
        this.scene = scene;
        this.entities = [];
    }

    __createEntityObject(type, lane, z, getProjection) {
        switch(type) {
            case 'jump':
            case 'JumpBonus':
                return new JumpBonus(lane, z, getProjection);
            case 'speed':
            case 'SpeedBonus':
                return new SpeedBonus(lane, z, getProjection);
            case 'ghost':
            case 'invincible':
            case 'GhostBonus':
            case 'InvincibleBonus':
                return new InvincibleBonus(lane, z, getProjection);
            case 'point':
            case 'PointBonus':
                return new PointBonus(lane, z, getProjection);

            case 'chasing_wall':
            case 'ChasingWall':
                return new ChasingWall(lane, z, getProjection);
            case 'falling_wall':
            case 'FallingWall':
                return new FallingWall(lane, z, getProjection);
            case 'moving_wall':
            case 'MovingWall':
                return new MovingWall(lane, z, getProjection);
            case 'wall':
            case 'Wall':
                return new Wall(lane, z, getProjection);
        }
        return null;
    }

    getRandomEntity(distribution, fallbackType) {
        if (!Array.isArray(distribution) || distribution.length === 0) return fallbackType;

        // 1. Calculer la somme totale des pourcentages/poids
        const totalWeight = distribution.reduce((sum, item) => sum + Number(item.percent), 0);

        // 2. Tirer un nombre entre 0 et le total réel (ex: 105)
        const roll = Math.random() * totalWeight;

        let cumulative = 0;
        for (const item of distribution) {
            cumulative += Number(item.percent);

            // 3. Vérifier si le tirage tombe dans cette tranche
            if (roll <= cumulative) {
                return item.entity;
            }
        }

        return fallbackType;
    }

    spawnBonusPattern(state, safeLane, getProjection) {
        const currentDistance = state.zOffset;

        // Les bonus apparaissent dans les "creux" (quand on a fait au moins 40% du chemin vers le prochain mur)
        const distanceSinceLast = currentDistance - state.lastSpawnDistance;
        const threshold = state.nextSpawnThreshold || 60;

        // On place le bonus idéalement au milieu de l'espace vide entre deux vagues de murs
        if (distanceSinceLast < threshold * 0.4 || distanceSinceLast > threshold * 0.6) {
            return;
        }

        const p = state.phase;
        const selectedBonus = this.getRandomEntity(p.bonuses.distribution, 'PointBonus');
        if (selectedBonus) {
            this.add(this.__createEntityObject(selectedBonus, safeLane, -250, getProjection));
            // On ne réinitialise pas le threshold ici, sinon on décalerait les murs.
            // On marque juste que le bonus est pris pour éviter d'en spawn 50 à la suite.
            state.lastSpawnDistance = currentDistance;
        }
    }

    spawnWallPattern(state, safeLane, getProjection) {
        const p = state.phase;
        const spawnAtZ = -350;
        const currentDistance = state.zOffset || 0;

        // --- SÉCURITÉ 1 : COOLDOWN PERSISTANT ---
        // On utilise "this" au lieu de "state" pour être sûr que les données restent
        if (this.lastSpawnDistance === undefined) {
            this.lastSpawnDistance = currentDistance;
        }

        if (this.nextSpawnThreshold === undefined) {
            this.nextSpawnThreshold = 20 + Math.random() * 40;
        }

        // On vérifie l'écart parcouru
        const distanceTraveledSinceLastSpawn = currentDistance - this.lastSpawnDistance;

        if (distanceTraveledSinceLastSpawn < this.nextSpawnThreshold) {
            return; // Pas encore assez de distance parcourue
        }

        // --- LOGIQUE DE SÉLECTION ---
        const selected = this.getRandomEntity(p.obstacles.distribution, 'Wall');

        if (selected === 'MovingWall') {
            this.add(this.__createEntityObject(selected, 0, spawnAtZ, getProjection));
        }
        else if (selected === 'FallingWall') {
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);
            const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
            this.add(this.__createEntityObject(selected, lane, spawnAtZ, getProjection));
        }
        else if (selected === 'ChasingWall') {
            this.add(this.__createEntityObject(selected, Math.floor(Math.random() * 3) - 1, spawnAtZ - 50, getProjection));
        }
        else {
            const availableLanes = [-1, 0, 1].filter(l => l !== safeLane);
            const numberOfWalls = Math.random() < 0.6 ? 1 : 2;
            const selectedLanes = availableLanes.sort(() => Math.random() - 0.5).slice(0, numberOfWalls);

            selectedLanes.forEach(lane => {
                this.add(this.__createEntityObject(selected, lane, spawnAtZ, getProjection));
            });
        }

        // --- RÉINITIALISATION ---
        this.lastSpawnDistance = currentDistance;
        this.nextSpawnThreshold = 20 + Math.random() * 40;
    }

    add(ent) {
        this.scene.add(ent.mesh);
        this.entities.push(ent);
    }

    removeEntity(ent) {
        ent.isActive = false;
        ent.mesh.visible = false; // Désactivation visuelle IMMÉDIATE

        if (ent.dispose) ent.dispose();

        // On utilise setTimeout pour laisser une frame de battement avant le retrait physique
        // Cela évite que le moteur essaie de rendre un objet qui n'existe plus
        setTimeout(() => {
            this.scene.remove(ent.mesh);
            // Nettoyage de la géométrie pour libérer la mémoire (optionnel mais propre)
            ent.mesh.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }, 0);

        this.entities = this.entities.filter(e => e !== ent);
    }

    update(state, getProjection) {
        this.entities.forEach(ent => {
            ent.updatePosition(state.speed, state.delta, getProjection, this.entities);
            if(ent.animate) ent.animate(state.time);
            if(ent.z > 20) this.removeEntity(ent);
        });
    }
}
