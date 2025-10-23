import {
  registerMapPreload,
  getRegisteredMapPreloadViews,
  getRegisteredMapPreloadImages,
  resetMapPreloadRegistry,
  type MapPreloadView,
} from "@/lib/mapPreloadRegistry";

describe("mapPreloadRegistry", () => {
  beforeEach(() => {
    resetMapPreloadRegistry();
  });

  it("deduplicates identical map views", () => {
    const view: MapPreloadView = {
      lng: -52.3,
      lat: 70.8,
      zoom: 12,
      pitch: 45,
      bearing: 30,
    };

    registerMapPreload({ views: [view, view] });

    expect(getRegisteredMapPreloadViews()).toHaveLength(1);
    expect(getRegisteredMapPreloadViews()[0]).toEqual(view);
  });

  it("stores images exactly once", () => {
    registerMapPreload({
      images: ["/a.png", "/b.png", "/a.png", ""],
    });

    expect(getRegisteredMapPreloadImages()).toEqual(["/a.png", "/b.png"]);
  });

  it("merges subsequent registrations", () => {
    registerMapPreload({
      views: [{ lng: 0, lat: 0, zoom: 1 }],
      images: ["/first.png"],
    });
    registerMapPreload({
      views: [{ lng: 1, lat: 1, zoom: 5 }],
      images: ["/second.png"],
    });

    const views = getRegisteredMapPreloadViews();
    expect(views).toHaveLength(2);
    expect(getRegisteredMapPreloadImages()).toHaveLength(2);
  });
});
