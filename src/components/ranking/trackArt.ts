/** Deterministic accent hues for placeholder album art from track id. */
export function trackArtGradient(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const hue1 = Math.abs(hash) % 360
  const hue2 = (hue1 + 40) % 360
  return `linear-gradient(145deg, hsl(${hue1} 55% 38%), hsl(${hue2} 60% 22%))`
}

export function trackArtSrc(track: { id: string; imageUrl?: string }): string | undefined {
  return track.imageUrl
}
