export class AssetLoader {
  constructor() {
    this.loadedCount = 0;
  }

  async loadAudioPlaylist(playlist, onProgress) {
    this.loadedCount = 0;
    const totalCount = playlist.length;

    for (const track of playlist) {
      try {
        const response = await fetch(track.url);
        if (!response.ok) throw new Error(`Failed to load ${track.title}`);
        
        const blob = await response.blob();
        track.blobUrl = URL.createObjectURL(blob);
      } catch (e) {
        console.warn(`Pre-fetch failed for ${track.title}`, e);
      }

      this.loadedCount++;
      const percent = (this.loadedCount / totalCount) * 100;
      
      if (onProgress) {
        onProgress(percent);
      }
      
      await new Promise((r) => setTimeout(r, 10));
    }
  }
}