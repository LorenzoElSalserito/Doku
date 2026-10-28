/**
 * Vault contract for Sprint K1 (PRD V2.3). Types only: nothing implements or
 * exposes it yet, and the preload bridge does not carry it until K1.
 */

/** A folder opened as a vault. */
export interface VaultInfo {
  /** Absolute path of the vault root folder. */
  rootPath: string;
  /** Display name, the root folder name unless configured otherwise. */
  name: string;
  /** ISO timestamp of the last time the vault was opened. */
  lastOpenedAt: string;
}

/** Progress of the first (or a full) indexing pass. */
export interface VaultIndexProgress {
  indexedNotes: number;
  totalNotes: number;
  done: boolean;
}

/** Renderer-side API the preload bridge will expose under `window.doku.vault`. */
export interface VaultBridge {
  open(rootPath: string): Promise<VaultInfo>;
  close(): Promise<void>;
  current(): Promise<VaultInfo | null>;
  recent(): Promise<VaultInfo[]>;
  onIndexProgress(listener: (progress: VaultIndexProgress) => void): () => void;
}
