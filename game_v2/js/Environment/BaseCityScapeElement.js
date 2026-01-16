import { BaseScapeElement } from "./BaseScapeElement.js";

export class BaseCityScapeElement extends BaseScapeElement {
    constructor(lane, z, getProjection) {
        super(lane, z, getProjection);
        this.pulseOffset = Math.random() * Math.PI * 2;
    }
}
