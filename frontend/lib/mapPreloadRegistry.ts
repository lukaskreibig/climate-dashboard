export interface MapPreloadView {
  lng: number;
  lat: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

interface RegisterArgs {
  views?: MapPreloadView[];
  images?: string[];
}

const viewStore = new Map<string, MapPreloadView>();
const imageStore = new Set<string>();

const viewKey = (view: MapPreloadView): string => {
  const pitch = view.pitch ?? 0;
  const bearing = view.bearing ?? 0;
  return `${view.lng}:${view.lat}:${view.zoom}:${pitch}:${bearing}`;
};

export function registerMapPreload({
  views = [],
  images = [],
}: RegisterArgs): void {
  views.forEach((view) => {
    viewStore.set(viewKey(view), view);
  });

  images.forEach((src) => {
    if (src) imageStore.add(src);
  });
}

export function getRegisteredMapPreloadViews(): MapPreloadView[] {
  return Array.from(viewStore.values());
}

export function getRegisteredMapPreloadImages(): string[] {
  return Array.from(imageStore);
}
