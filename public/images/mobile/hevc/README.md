# iOS HEVC-with-alpha assets

The site probes this folder on iOS. If a matching `.mov` exists and Safari reports HEVC support, it is preferred automatically over the animated WebP fallback.

Expected files:
- `pearl-transparent-ios.mov`
- `fish-transparent-ios.mov`
- `turtle-transparent-ios.mov`
- `chest-transparent-ios.mov`
- `jellyfish-transparent-ios.mov`
- `crab-transparent-ios.mov`
- `mermaid-transparent-ios.mov`

Generate them on macOS with:

```bash
bash scripts/ios-alpha/build-hevc-alpha-macos.sh
```

The script converts the VP9-alpha sources to ProRes 4444 intermediates, then uses Apple AVFoundation's HEVC-with-alpha export preset.