// Browsers don't paint a video's first frame until playback starts unless a poster
// is set. Seeking slightly forward as soon as data is available forces the browser
// to decode and display that frame, giving a visible thumbnail without transcoding.
export function primeVideoThumbnail(video) {
  video.addEventListener(
    "loadeddata",
    () => {
      try {
        video.currentTime = Math.min(0.1, (video.duration || 0.2) / 2);
      } catch (_) {}
    },
    { once: true }
  );
}
