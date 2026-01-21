export class BackgroundController {
    constructor() {
        this.layer1 = document.getElementById('bg-layer-1');
        this.layer2 = document.getElementById('bg-layer-2');
        this.ytLayer = document.getElementById('yt-layer');

        this.activeLayer = 1;
        this.currentImage = null;
        this.currentVideo = null;

        this.player = null;
        this.isPlayerReady = false;

        // Initialize YouTube API
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }

        window.onYouTubeIframeAPIReady = () => {
            this.player = new YT.Player('yt-player', {
                height: '100%',
                width: '100%',
                videoId: '',
                playerVars: {
                    'autoplay': 1,
                    'controls': 0,
                    'showinfo': 0,
                    'rel': 0,
                    'loop': 1,
                    'mute': 1,
                    'playlist': '' // Required for loop workaround
                },
                events: {
                    'onReady': (event) => {
                        this.isPlayerReady = true;
                        event.target.mute();
                    }
                }
            });
        };
    }

    update(phase) {
        if (phase.bgVideo) {
            if (this.currentVideo !== phase.bgVideo) {
                this.currentVideo = phase.bgVideo;
                this.playVideo(phase.bgVideo);
            }

            this.ytLayer.classList.add('bg-visible');
            this.layer1.classList.remove('bg-visible');
            this.layer2.classList.remove('bg-visible');
            return;
        }

        if (this.currentVideo) {
            this.currentVideo = null;
            this.stopVideo();

            this.ytLayer.classList.remove('bg-visible');
            if (this.activeLayer === 1) {
                this.layer1.classList.add('bg-visible');
            } else {
                this.layer2.classList.add('bg-visible');
            }
        }

        let bgImage = phase.bgImage;
        if (!bgImage) {
            bgImage = 'https://f4.bcbits.com/img/a2164237503_10.jpg';
        }

        if (bgImage !== this.currentImage) {
            this.currentImage = bgImage;
            this.swapImage(bgImage);
        }
    }

    swapImage(url) {
        const nextLayer = (this.activeLayer === 1) ? this.layer2 : this.layer1;
        const currLayer = (this.activeLayer === 1) ? this.layer1 : this.layer2;

        nextLayer.style.backgroundImage = `url('${url}')`;
        nextLayer.classList.add('bg-visible');
        currLayer.classList.remove('bg-visible');

        this.activeLayer = (this.activeLayer === 1) ? 2 : 1;
    }

    playVideo(videoId) {
        if (this.isPlayerReady && this.player) {
            this.player.loadPlaylist([videoId]);
            this.player.setLoop(true);
        }
    }

    stopVideo() {
        if (this.isPlayerReady && this.player) {
            this.player.stopVideo();
        }
    }
}
