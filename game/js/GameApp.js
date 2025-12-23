import * as THREE from 'three';
import { Environment } from './Environment.js';
import { MusicController } from './MusicController.js';
import { MenuScreen, GameScreen, EndScreen } from './Screens.js';

export class GameApp {
    constructor() {
        this.env = new Environment();
        this.music = new MusicController();
        this.clock = new THREE.Clock();

        this.playerName = "ANONYME";
        this.playerColor = 0x00ffff;
        this.currentScreen = null;

        // Global Events
        window.addEventListener('resize', () => this.env.resize());
        window.addEventListener('keydown', (e) => {
            if (this.currentScreen) this.currentScreen.onKeyDown(e);
        });

        this.setupTouch();
        this.showMenu();
        this.env.renderer.setAnimationLoop(() => this.animate());
    }

    changeScreen(newScreen) {
        if (this.currentScreen) this.currentScreen.exit();
        this.currentScreen = newScreen;
        this.currentScreen.enter();
    }

    showMenu() { this.changeScreen(new MenuScreen(this)); }
    startGame() { this.changeScreen(new GameScreen(this)); }
    showEnd(type, score) { this.changeScreen(new EndScreen(this, type, score)); }

    animate() {
        const delta = this.clock.getDelta();
        const time = this.clock.getElapsedTime();
        if (this.currentScreen) this.currentScreen.update(delta, time);
        this.env.render();
    }

    setupTouch() {
        let startX, startY;
        window.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        }, {passive: false});

        window.addEventListener('touchend', e => {
            if (this.currentScreen instanceof GameScreen && !this.currentScreen.isPaused) {
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                const diffX = endX - startX;
                const diffY = endY - startY;

                if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
                    if (diffY < 0) this.currentScreen.onKeyDown({key: this.currentScreen.isReversed ? 'ArrowDown' : 'ArrowUp'});
                    else this.currentScreen.onKeyDown({key: this.currentScreen.isReversed ? 'ArrowUp' : 'ArrowDown'});
                } else if (Math.abs(diffX) > 30) {
                    if (diffX < 0) this.currentScreen.onKeyDown({key: this.currentScreen.isReversed ? 'ArrowRight' : 'ArrowLeft'});
                    else this.currentScreen.onKeyDown({key: this.currentScreen.isReversed ? 'ArrowLeft' : 'ArrowRight'});
                } else if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) {
                    this.currentScreen.onKeyDown({key: ' '});
                }
            }
        }, {passive: false});
    }
}
