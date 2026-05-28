export type PanelSignalHotness = 0 | 1 | 2 | 3;

export type PanelSignalAction = {
  verb: string;
  href: string;
  hotness: PanelSignalHotness;
};

export type PanelSignalSource = {
  kind: 'fs' | 'sqlite' | 'http';
  path: string;
};

export type PanelSignal = {
  freshness: {
    iso: string;
    staleAfterMs: number;
  };
  isFresh: boolean;
  headline: string;
  detail?: string;
  nextAction: PanelSignalAction | null;
  source: PanelSignalSource;
};
