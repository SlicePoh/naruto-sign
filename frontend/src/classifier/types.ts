export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type HandLandmarks = Landmark[];

export type SignLabel =
  | "tiger"
  | "ram"
  | "snake"
  | "dog"
  | "hare"
  | "horse"
  | "rat"
  | "serpent"
  | "shadow"
  | "neutral"
  | "bird"
  | "boar"
  | "ox"
  | "dragon"
  | "unknown";

export type JutsuName = "shadowClone" | "fireball" | "chidori" | "rasengan" | null;

export interface Features {
  fingerExtensions: number[]; // 0-1 for each finger
  fingerBends: number[]; // angles for each finger
  thumbIndexDistance: number;
  palmOrientation: number;
  fingertipDistances: number[];
}
