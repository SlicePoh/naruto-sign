export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type HandLandmarks = Landmark[];

export type SignLabel = "tiger" | "ram" | "snake" | "bird" | "boar" | "ox" | "dragon" | "unknown";

export type JutsuName = "shadowClone" | null;

export interface Features {
  fingerExtensions: number[]; // 0-1 for each finger
  fingerBends: number[]; // angles for each finger
  thumbIndexDistance: number;
  palmOrientation: number;
  fingertipDistances: number[];
}
