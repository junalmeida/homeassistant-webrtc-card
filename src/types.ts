import { ActionConfig, HomeAssistant, LovelaceCard, LovelaceCardConfig, LovelaceCardEditor, STATES_OFF as STATES_OFF_HELPER } from 'custom-card-helpers';
import { name } from "../package.json";
declare global {
  interface HTMLElementTagNameMap {
    'webrtc-card-editor': LovelaceCardEditor;
    'hui-error-card': LovelaceCard;
  }
}

export interface WebRTCCardConfig extends LovelaceCardConfig {
  type: string;
  title?: string;
  camera_image: string;
  muted?: boolean;

  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
  double_tap_action?: ActionConfig;
}

export interface WebRtcAnswer {
  answer: string;
}
export interface WebRtcSettings {
  stun_server?: string;
}

export type HomeAssistantExt = HomeAssistant & {
  entities: { [key: string]: { area_id?: string, entity_id: string, device_id?: string, entity_category?: string, disabled_by?: string } }
  devices: { [key: string]: { area_id?: string, disabled_by?: string } }
};

export const UNAVAILABLE = "unavailable";
export const STATES_OFF = [...STATES_OFF_HELPER, UNAVAILABLE, "idle"
  , "disconnected"];
export const cardType = name;