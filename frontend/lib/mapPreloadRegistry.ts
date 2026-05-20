export interface MapPreloadView {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export type MapOverlayCoords = [
  [number, number],
  [number, number],
  [number, number],
  [number, number]
];

export interface MapSatelliteOverlayPreload {
  rawImg: string;
  maskImg: string;
  coords: MapOverlayCoords;
  pad?: number;
}

export interface MapPreloadMap {
  id: string;
  views: MapPreloadView[];
  images?: string[];
  terrain?: boolean;
  satelliteOverlay?: MapSatelliteOverlayPreload;
}

interface RegisterArgs {
  views?: MapPreloadView[];
  images?: string[];
  maps?: MapPreloadMap[];
}

const viewStore = new Map<string, MapPreloadView>();
const imageStore = new Set<string>();
const mapStore = new Map<string, MapPreloadMap>();

const viewKey = (view: MapPreloadView): string => {
  const pitch = view.pitch ?? 0;
  const bearing = view.bearing ?? 0;
  return `${view.lng}:${view.lat}:${view.zoom}:${pitch}:${bearing}`;
};

export function registerMapPreload({
  views = [],
  images = [],
  maps = [],
}: RegisterArgs): void {
  views.forEach((view) => {
    viewStore.set(viewKey(view), view);
  });

  images.forEach((src) => {
    if (src) imageStore.add(src);
  });

  maps.forEach((mapConfig) => {
    if (!mapConfig.id) return;

    const existing = mapStore.get(mapConfig.id);
    const mergedViews = new Map<string, MapPreloadView>();

    existing?.views.forEach((view) => mergedViews.set(viewKey(view), view));
    mapConfig.views.forEach((view) => {
      mergedViews.set(viewKey(view), view);
      viewStore.set(viewKey(view), view);
    });

    const mergedImages = new Set<string>(existing?.images ?? []);
    mapConfig.images?.forEach((src) => {
      if (!src) return;
      mergedImages.add(src);
      imageStore.add(src);
    });

    const overlay = mapConfig.satelliteOverlay ?? existing?.satelliteOverlay;
    if (overlay) {
      [overlay.rawImg, overlay.maskImg].forEach((src) => {
        if (!src) return;
        mergedImages.add(src);
        imageStore.add(src);
      });
    }

    mapStore.set(mapConfig.id, {
      ...existing,
      ...mapConfig,
      views: Array.from(mergedViews.values()),
      images: Array.from(mergedImages),
      satelliteOverlay: overlay,
    });
  });
}

export function getRegisteredMapPreloadViews(): MapPreloadView[] {
  return Array.from(viewStore.values());
}

export function getRegisteredMapPreloadImages(): string[] {
  return Array.from(imageStore);
}

export function getRegisteredMapPreloadMaps(): MapPreloadMap[] {
  return Array.from(mapStore.values()).map((mapConfig) => ({
    ...mapConfig,
    views: [...mapConfig.views],
    images: [...(mapConfig.images ?? [])],
  }));
}

export function resetMapPreloadRegistry(): void {
  viewStore.clear();
  imageStore.clear();
  mapStore.clear();
}
