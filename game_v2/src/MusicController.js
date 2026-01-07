import { SONG_START_AT, SONG_STRUCTURE } from './Config.js';

export class MusicController {
    constructor(videoIdAudio = null, videoIdVisual = null) {
        this.audio = document.getElementById('game-audio');
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        this.startTime = SONG_START_AT || 0;

        this.ids = { audio: videoIdAudio, visual: videoIdVisual };
        this.players = { audio: null, visual: null };
        this.ready = { audio: false, visual: false };
        this.useYouTube = videoIdAudio !== null;

        if (this.useYouTube || videoIdVisual) {
            this.initYouTube();
        } else {
            this.audio.currentTime = this.startTime;
        }
    }

    initYouTube() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            document.head.appendChild(tag);
        }

        window.onYouTubeIframeAPIReady = () => {
            if (this.ids.audio) {
                this.players.audio = new YT.Player('yt-player-audio', {
                    videoId: this.ids.audio,
                    playerVars: {
                        'controls': 0,
                        'disablekb': 1,
                        'start': Math.floor(this.startTime) // YouTube accepte un entier pour le start
                    },
                    events: {
                        'onReady': () => {
                            this.ready.audio = true;
                            // Double sécurité : on force le seek au cas où le playerVars ne suffit pas
                            this.players.audio.seekTo(this.startTime);
                        }
                    }
                });
            }

            if (this.ids.visual) {
                this.players.visual = new YT.Player('yt-player-visual', {
                    videoId: this.ids.visual,
                    playerVars: {
                        'controls': 0, 'mute': 1, 'loop': 1,
                        'playlist': this.ids.visual,
                        'start': Math.floor(this.startTime)
                    },
                    events: {
                        'onReady': (e) => {
                            this.ready.visual = true;
                            e.target.mute();
                            this.players.visual.seekTo(this.startTime);
                        }
                    }
                });
            }
        };
    }

    play() {
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

        if (this.useYouTube && this.ready.audio) {
            this.players.audio.playVideo();
            if (this.ready.visual) this.players.visual.playVideo();
        } else {
            if (this.audio.currentTime === 0 && this.startTime > 0) {
                this.audio.currentTime = this.startTime;
            }
            this.audio.play();
        }
    }

    pause() {
        if (this.useYouTube && this.ready.audio) {
            this.players.audio.pauseVideo();
            if (this.ready.visual) this.players.visual.pauseVideo();
        } else {
            this.audio.pause();
        }
    }

    resume() { this.play(); }

    stop() {
        if (this.useYouTube && this.ready.audio) {
            this.players.audio.stopVideo();
            this.players.audio.seekTo(this.startTime);
            if (this.ready.visual) {
                this.players.visual.stopVideo();
                this.players.visual.seekTo(this.startTime);
            }
        } else {
            this.audio.pause();
            this.audio.currentTime = this.startTime;
        }
    }

    update() {
        const time = (this.useYouTube && this.ready.audio)
            ? this.players.audio.getCurrentTime()
            : this.audio.currentTime;

        const phase = SONG_STRUCTURE.find(p => time >= p.start && time < p.end)
                    || SONG_STRUCTURE[SONG_STRUCTURE.length - 1];

        return {
            time: time,
            phase: phase,
            ended: (this.useYouTube && this.ready.audio)
                ? (this.players.audio.getPlayerState() === 0)
                : this.audio.ended
        };
    }

    playBeep(freq) {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, this.audioCtx.currentTime + 0.1);
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    getNextPhaseSoon(currentWorldSpeed, spawnZ, delta) {
        const time = (this.useYouTube && this.ready.audio)
            ? this.players.audio.getCurrentTime()
            : this.audio.currentTime;

        // Si ta vitesse dans le moteur est déjà "par frame",
        // on multiplie par 60 (pour 60fps) pour avoir la vitesse par seconde.
        // Sinon, si ta vitesse est déjà "par seconde", n'utilise pas le delta.
        const speedPerSecond = currentWorldSpeed * 60;

        // Distance réelle : la porte spawn à -500 et doit atteindre le joueur à +3
        const totalDistance = Math.abs(spawnZ) + 3;

        // Temps réel que la porte va mettre pour toucher le joueur
        const travelTime = totalDistance / speedPerSecond;

        const nextPhase = SONG_STRUCTURE.find(p => {
            const timeUntilPhase = p.start - time;
            return !p.gateSpawned &&
                   timeUntilPhase > 0 &&
                   timeUntilPhase <= travelTime;
        });

        if (nextPhase) {
            nextPhase.gateSpawned = true;
            return nextPhase;
        }

        return null;
    }
}
