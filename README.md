# WebRTC Card

A WebRTC card to display a 2-way audio camera in home assistant dashboard.
To be used together with [RTSPtoWebRTC](https://www.home-assistant.io/integrations/rtsp_to_webrtc) and [go2rtc](https://github.com/AlexxIT/go2rtc#go2rtc-home-assistant-add-on) Add-on

[![GitHub Release][releases-shield]][releases]
[![License][license-shield]](LICENSE.md)
[![hacs_badge](https://img.shields.io/badge/HACS-Default-orange.svg?style=for-the-badge)](https://github.com/custom-components/hacs)

Please consider sponsoring if you feel that this project is somehow useful to you.  
[![BuyMeCoffee][buymecoffeebadge]][buymecoffee]

## Options

For entity options, see https://www.home-assistant.io/dashboards/entities/#options-for-entities.

For `tap_action` options, see https://www.home-assistant.io/dashboards/actions/.

```yaml
- type: custom:webrtc-card
  title: Living Room #optional
  camera_image: camera.living_room # a camera entity to use as background (optional)
  muted?: true
  tap_action:
    action: navigate
    navigation_path: /lovelace/living-room
```

[commits-shield]: https://img.shields.io/github/commit-activity/y/junalmeida/homeassistant-webrtc-card.svg?style=for-the-badge
[commits]: https://github.com/junalmeida/homeassistant-webrtc-card/commits/main
[devcontainer]: https://code.visualstudio.com/docs/remote/containers
[discord]: https://discord.gg/5e9yvq
[discord-shield]: https://img.shields.io/discord/330944238910963714.svg?style=for-the-badge
[forum-shield]: https://img.shields.io/badge/community-forum-brightgreen.svg?style=for-the-badge
[forum]: https://community.home-assistant.io/c/projects/frontend
[license-shield]: https://img.shields.io/github/license/junalmeida/homeassistant-webrtc-card.svg?style=for-the-badge
[maintenance-shield]: https://img.shields.io/maintenance/yes/2021.svg?style=for-the-badge
[releases-shield]: https://img.shields.io/github/release/junalmeida/homeassistant-webrtc-card.svg?style=for-the-badge
[releases]: https://github.com/junalmeida/homeassistant-webrtc-card/releases
[buymecoffee]: https://www.buymeacoffee.com/junalmeida
[buymecoffeebadge]: https://img.shields.io/badge/buy%20me%20a%20coffee-donate-orange?style=plastic&logo=buymeacoffee
