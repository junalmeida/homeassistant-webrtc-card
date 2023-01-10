/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ActionHandlerEvent, fireEvent, handleAction, hasAction
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers
import { css, html, LitElement, PropertyValues } from 'lit';
import { property, query, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import { actionHandler } from './action-handler-directive';
import { findEntities } from './find-entities';
import { cardType, HomeAssistantExt, WebRtcAnswer, WebRTCCardConfig, WebRtcSettings } from './types';

import { version as pkgVersion } from "../package.json";


/* eslint no-console: 0 */
console.info(
    `%c  WebRTC Card  %c ${pkgVersion} `,
    'color: orange; font-weight: bold; background: black',
    'color: white; font-weight: bold; background: dimgray',
);

class WebRTCCard extends LitElement {
    static properties = {
        hass: { attribute: false },
        config: { state: true }
    };

    @property() private hass!: HomeAssistantExt;
    @property() public config!: WebRTCCardConfig;
    private _peerConnection?: RTCPeerConnection;

    @state() private _error?: string;

    private _remoteStream?: MediaStream;
    @query("#remote-stream") private _videoEl!: HTMLVideoElement;

    // The user supplied configuration. Throw an exception and Home Assistant
    // will render an error card.
    setConfig(config: WebRTCCardConfig) {

        if (
            !config
        ) {
            throw new Error("Invalid configuration");
        }

        this.config = {
            hold_action: { action: "more-info" },
            ...config,
        };
    }

    render() {
        if (!this.config || !this.hass) {
            return html``;
        }
        if (this._error) {
            return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
        }

        return html`
        <ha-card @action=${this._handleThisAction} .actionHandler=${actionHandler({
            hasHold: hasAction(this.config.hold_action),
            hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
            tabindex=${ifDefined(
            hasAction(this.config.tap_action) ? "0" : undefined
        )}>
            <video 
                id="remote-stream" 
                autoplay controls playsinline .muted=${this.config.muted === undefined ? true : this.config.muted}></video>
        </ha-card>
    `;
    }

    private _handleThisAction(ev: ActionHandlerEvent) {
        const parent = ((ev.currentTarget as HTMLElement).getRootNode() as any)?.host?.parentElement as HTMLElement;
        if (this.hass && this.config && ev.detail.action && (!parent || parent.tagName !== "HUI-CARD-PREVIEW")) {
            handleAction(this, this.hass, this.config, ev.detail.action);
        }
    }

    public override connectedCallback() {
        super.connectedCallback();
        if (this.hasUpdated) {
            this._startWebRtc();
        }
    }

    public override disconnectedCallback() {
        super.disconnectedCallback();
        this._cleanUp();
    }

    protected override updated(changedProperties: PropertyValues<this>) {
        if (!changedProperties.has("config")) {
            return;
        }
        if (!this._videoEl) {
            return;
        }
        this._startWebRtc();
    }

    private async _startWebRtc(): Promise<void> {
        this._error = undefined;

        const configuration = await this._fetchPeerConfiguration();
        const peerConnection = new RTCPeerConnection(configuration);
        // Some cameras (such as nest) require a data channel to establish a stream
        // however, not used by any integrations.
        peerConnection.createDataChannel("dataSendChannel");
        peerConnection.addTransceiver("audio", { direction: "recvonly" });
        peerConnection.addTransceiver("video", { direction: "recvonly" });

        const offerOptions: RTCOfferOptions = {
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
        };
        const offer: RTCSessionDescriptionInit = await peerConnection.createOffer(
            offerOptions
        );
        await peerConnection.setLocalDescription(offer);

        let candidates = ""; // Build an Offer SDP string with ice candidates
        const iceResolver = new Promise<void>((resolve) => {
            peerConnection.addEventListener("icecandidate", async (event) => {
                if (!event.candidate) {
                    resolve(); // Gathering complete
                    return;
                }
                candidates += `a=${event.candidate.candidate}\r\n`;
            });
        });
        await iceResolver;
        const offer_sdp = offer.sdp + candidates;

        let webRtcAnswer: WebRtcAnswer;
        try {
            webRtcAnswer = await this.handleWebRtcOffer(
                this.config.camera_image,
                offer_sdp
            );
        } catch (err: any) {
            this._error = "Failed to start WebRTC stream: " + err.message;
            peerConnection.close();
            return;
        }

        // Setup callbacks to render remote stream once media tracks are discovered.
        let mediaDevice: MediaStream | undefined;
        if (navigator.mediaDevices) {
            try {
                mediaDevice = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaDevice.getTracks().forEach(track => {
                    peerConnection.addTrack(track, mediaDevice!);
                    //const sender = peerConnection.addTrack(track, mediaDevice);
                    // track.stop();
                    // setTimeout(() => {
                    //     navigator.mediaDevices.getUserMedia({audio: true}).then(stream => {
                    //         stream.getTracks().forEach(track => {
                    //             sender.replaceTrack(track);
                    //         });
                    //     });
                    // }, 10000);
                });
            }
            catch {
            }
        }
        const remoteStream = mediaDevice || new MediaStream();

        peerConnection.addEventListener("track", (event) => {
            remoteStream.addTrack(event.track);
            this._videoEl.srcObject = remoteStream;
        });
        this._remoteStream = remoteStream;

        // Initiate the stream with the remote device
        const remoteDesc = new RTCSessionDescription({
            type: "answer",
            sdp: webRtcAnswer.answer,
        });
        try {
            await peerConnection.setRemoteDescription(remoteDesc);
        } catch (err: any) {
            this._error = "Failed to connect WebRTC stream: " + err.message;
            peerConnection.close();
            return;
        }
        this._peerConnection = peerConnection;
    }

    private async _fetchPeerConfiguration(): Promise<RTCConfiguration> {
        if (!this.isComponentLoaded("rtsp_to_webrtc")) {
            return {};
        }
        const settings = await this.fetchWebRtcSettings();
        if (!settings || !settings.stun_server) {
            return {};
        }
        return {
            iceServers: [
                {
                    urls: [`stun:${settings.stun_server}`],
                },
            ],
        };
    }

    private _cleanUp() {
        if (this._remoteStream) {
            this._remoteStream.getTracks().forEach((track) => {
                track.stop();
            });
            this._remoteStream = undefined;
        }
        if (this._videoEl) {
            this._videoEl.removeAttribute("src");
            this._videoEl.load();
        }
        if (this._peerConnection) {
            this._peerConnection.close();
            this._peerConnection = undefined;
        }
    }

    private _loadedData() {
        fireEvent(this, "load");
    }

    private handleWebRtcOffer(
        entityId: string,
        offer: string
    ) {
        return this.hass.callWS<WebRtcAnswer>({
            type: "camera/web_rtc_offer",
            entity_id: entityId,
            offer: offer,
        });
    }
    private fetchWebRtcSettings() {
        return this.hass.callWS<WebRtcSettings>({
            type: "rtsp_to_webrtc/get_settings",
        });
    }

    private isComponentLoaded(
        component: string
    ): boolean {
        return this.hass && this.hass.config.components.includes(component);
    }

    static getStubConfig(hass: HomeAssistantExt,
        entities: string[],
        entitiesFallback: string[]) {

        const cameras = findEntities(
            hass,
            2,
            entities,
            entitiesFallback,
            ["camera"]
        );

        const obj = {
            camera_image: cameras[0],
        } as WebRTCCardConfig;

        return obj;
    }


    static get styles() {
        return css`
      * {
        box-sizing: border-box;
      }
      ha-card {
        position: relative;
        z-index: 0;
        overflow: hidden;
      }

        video {
            /* video "container" size */
            display: block;
            width: 100%;
            min-height: 48px;
            max-height: var(--video-max-height, calc(100vh - 97px));
            background: black;
        }
    `;
    }
}

customElements.define(cardType, WebRTCCard);

const theWindow = window as any;
theWindow.customCards = theWindow.customCards || [];
theWindow.customCards.push({
    type: cardType,
    name: "WebRTC",
    preview: true, // Optional - defaults to false
    description: "WebRTC Card" // Optional
});

