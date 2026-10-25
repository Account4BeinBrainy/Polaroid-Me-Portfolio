const portrait = matchMedia('(max-width: 768px) and (orientation: portrait)');
const shortLandscape = matchMedia('(orientation: landscape) and (max-height: 500px)');

export function responsiveProfile() {
  return {
    isMobilePortrait: portrait.matches,
    isShortLandscape: shortLandscape.matches,
    isMobile: portrait.matches || shortLandscape.matches,
  };
}
