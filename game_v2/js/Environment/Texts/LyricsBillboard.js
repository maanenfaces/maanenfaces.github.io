import { PropagandaBillboard } from './PropagandaBillboard.js';

export class LyricsBillboard extends PropagandaBillboard {
    constructor(lane, z, getProjection, roadColor, lyricText) {
        super(lane, z, getProjection, roadColor, lyricText, null);
    }
}
