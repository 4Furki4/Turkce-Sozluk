const IOS_PWA_SPLASH_SCREENS = [
  ["2048-2732", "2732-2048", 1024, 1366, 2],
  ["1668-2388", "2388-1668", 834, 1194, 2],
  ["1536-2048", "2048-1536", 768, 1024, 2],
  ["1640-2360", "2360-1640", 820, 1180, 2],
  ["1668-2224", "2224-1668", 834, 1112, 2],
  ["1620-2160", "2160-1620", 810, 1080, 2],
  ["1488-2266", "2266-1488", 744, 1133, 2],
  ["1320-2868", "2868-1320", 440, 956, 3],
  ["1206-2622", "2622-1206", 402, 874, 3],
  ["1290-2796", "2796-1290", 430, 932, 3],
  ["1179-2556", "2556-1179", 393, 852, 3],
  ["1170-2532", "2532-1170", 390, 844, 3],
  ["1284-2778", "2778-1284", 428, 926, 3],
  ["1125-2436", "2436-1125", 375, 812, 3],
  ["1242-2688", "2688-1242", 414, 896, 3],
  ["828-1792", "1792-828", 414, 896, 2],
  ["1242-2208", "2208-1242", 414, 736, 3],
  ["750-1334", "1334-750", 375, 667, 2],
  ["640-1136", "1136-640", 320, 568, 2],
] as const;

export const IOS_PWA_STARTUP_IMAGES = [
  ...IOS_PWA_SPLASH_SCREENS.flatMap(
    ([portraitImage, landscapeImage, width, height, pixelRatio]) => [
      {
        rel: "apple-touch-startup-image",
        url: `/icons/apple-splash-${portraitImage}.jpg`,
        media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${pixelRatio}) and (orientation: portrait)`,
      },
      {
        rel: "apple-touch-startup-image",
        url: `/icons/apple-splash-${landscapeImage}.jpg`,
        media: `(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${pixelRatio}) and (orientation: landscape)`,
      },
    ],
  ),
  {
    rel: "apple-touch-startup-image",
    url: "/icons/apple-splash-2048-2732.jpg",
  },
];
