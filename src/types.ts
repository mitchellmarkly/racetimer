export type RaceType = '5K' | '10K';

export interface Runner {
  bibNumber: string;
  firstName?: string;
  lastName?: string;
  race: RaceType;
  createdAt: number;
}

export interface Finish {
  bibNumber: string;
  race: RaceType;
  finishTimestamp: number;
  elapsedMs: number;
}

export interface RaceSettings {
  starts: Record<RaceType, number | null>;
}

export interface AppData {
  runners: Runner[];
  finishes: Finish[];
  settings: RaceSettings;
}
