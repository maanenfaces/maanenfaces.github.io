export class BackgroundManager {
    constructor() {
        this.bgLayer1 = document.getElementById('bg-layer-1');
        this.bgLayer2 = document.getElementById('bg-layer-2');
        this.ytLayer = document.getElementById('yt-layer');
        this.horizonMask = document.getElementById('horizon-mask');
        this.activeBgLayer = 1;
        this.currentBgKey = null;
        this.ytPlayer = null;
        this.ytReady = false;

        this.initYouTube();
    }

    initYouTube() {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        window.onYouTubeIframeAPIReady = () => {
            this.ytPlayer = new YT.Player('yt-player', {
                height: '100%', width: '100%', videoId: '',
                playerVars: { 'autoplay': 1, 'controls': 0, 'loop': 1, 'playlist': '', 'mute': 1, 'showinfo': 0, 'modestbranding': 1, 'rel': 0, 'iv_load_policy': 3, 'enablejsapi': 1, 'origin': window.location.origin },
                events: { 'onReady': () => { this.ytReady = true; } }
            });
        };
    }

    update(phase, currentFloorAlpha) {
        if (this.horizonMask) this.horizonMask.style.opacity = currentFloorAlpha;

        let targetType = 'none';
        let targetValue = null;

        if (phase.bgVideo) {
            targetType = 'video';
            targetValue = phase.bgVideo;
        } else if (phase.bgImage) {
            targetType = 'image';
            targetValue = phase.bgImage;
        } else {
            targetType = 'image';
            targetValue = 'https://f4.bcbits.com/img/a2164237503_10.jpg';
        }

        if (this.currentBgKey === targetValue) return;
        if (targetType === 'video' && !this.ytReady) return;

        this.currentBgKey = targetValue;
        if (targetType === 'video') this.transitionToVideo(targetValue);
        else this.transitionToImage(targetValue);
    }

    transitionToImage(url) {
        if (this.ytLayer) this.ytLayer.classList.remove('bg-visible');
        if (this.ytPlayer?.pauseVideo) this.ytPlayer.pauseVideo();

        const nextLayer = this.activeBgLayer === 1 ? this.bgLayer2 : this.bgLayer1;
        const currLayer = this.activeBgLayer === 1 ? this.bgLayer1 : this.bgLayer2;

        if (nextLayer && currLayer) {
            nextLayer.style.backgroundImage = `url('${url}')`;
            nextLayer.classList.add('bg-visible');
            currLayer.classList.remove('bg-visible');
            this.activeBgLayer = this.activeBgLayer === 1 ? 2 : 1;
        }
    }

    transitionToVideo(videoId) {
        if (!this.ytReady || !this.ytPlayer) return;
        this.ytPlayer.loadVideoById(videoId);
        this.ytPlayer.mute();
        this.ytPlayer.playVideo();
        if (this.ytLayer) this.ytLayer.classList.add('bg-visible');
    }
}
