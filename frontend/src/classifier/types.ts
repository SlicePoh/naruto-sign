export type Landmark = {
  x: number;
  y: number;
  z: number;
};

export type HandLandmarks = Landmark[];

export type SignLabel =
  | "tiger"
  | "ram"
  | "serpent"
  | "dog"
  | "hare"
  | "horse"
  | "rat"
  | "shadow"
  | "neutral"
  | "bird"
  | "boar"
  | "ox"
  | "dragon"
  | "monkey"
  | "unknown";

export type JutsuName =
  | "clone"
  | "transformation"
  | "substitution"
  | "shadowClone"
  | "fireball"
  | "chidori"
  | "rasengan"
  | "waterDragon"
  | "earthWall"
  | "phoenixFlower"
  | "windBlade"
  | null;

export interface Features {
  fingerExtensions: number[]; // 0-1 for each finger
  fingerBends: number[]; // angles for each finger
  thumbIndexDistance: number;
  palmOrientation: number;
  fingertipDistances: number[];
}
