/**
 * Reading a project's profile from the workspace.
 *
 * The only place profile detection touches the editor API. The domain decides
 * what the facts mean; this gathers them, and treats every failure as "not
 * found" — a missing `node_modules` entry is the normal state of a project that
 * has not been installed, not an error worth surfacing.
 *
 * @packageDocumentation
 */
import { Uri } from "vscode";

import { declaredThemvoraPackages, readProjectProfile, type ProjectProfile } from "../domain/projectProfile.js";
import { createWorkspaceReader } from "./workspaceReader.js";

/**
 * Read the profile for one folder.
 *
 * @param rootPath - The folder's absolute path.
 * @returns The profile.
 */
export async function readProfileFor(rootPath: string): Promise<ProjectProfile> {
  const reader = createWorkspaceReader(Uri.file(rootPath));

  const manifest = await reader.read("package.json");
  const files = await reader.walk();

  // A declared package is not an installed one; this is the only evidence that
  // separates them, so it is read from each package's own manifest rather than
  // from a lockfile, which records intent rather than the tree on disk.
  const installed = new Map<string, string>();
  for (const name of declaredThemvoraPackages(manifest)) {
    const text = await reader.read(`node_modules/${name}/package.json`);
    if (text === null) continue;

    try {
      const parsed: unknown = JSON.parse(text);
      const version = (parsed as { version?: unknown }).version;
      if (typeof version === "string") installed.set(name, version);
    } catch {
      // An unreadable package manifest is treated as unresolved.
    }
  }

  return readProjectProfile(manifest, files, installed);
}

/** A profile reader whose results are shared until they are invalidated. */
export interface ProfileCache {
  /**
   * The profile for one folder.
   *
   * @param rootPath - The folder's absolute path.
   * @returns The profile, read at most once per invalidation.
   */
  profileFor(rootPath: string): Promise<ProjectProfile>;
  /**
   * Drop every remembered profile.
   *
   * Called when the workspace analysis publishes a result that could have moved
   * the profile: a create, a delete, a rename, a manifest save or an explicit
   * refresh. A theme save does not, and does not call this.
   */
  invalidate(): void;
}

/**
 * Share one profile read between the surfaces that ask for it.
 *
 * Both the sidebar and the Studio need the profile to render, and both ask on
 * every publish. Reading it twice means walking the project twice — the same
 * directory listing, the same `node_modules` probes — for one answer. This keeps
 * the read and the *in-flight promise* per root, so two concurrent asks share
 * one walk rather than racing two.
 *
 * It is not a second cache with its own invalidation rule: it is invalidated by
 * the controller's publish, which is the same signal that made it stale.
 *
 * @param read - How to read a profile; defaults to {@link readProfileFor}.
 * @returns The cache.
 */
export function createProfileCache(
  read: (rootPath: string) => Promise<ProjectProfile> = readProfileFor,
): ProfileCache {
  let memo = new Map<string, Promise<ProjectProfile>>();

  return {
    profileFor(rootPath: string): Promise<ProjectProfile> {
      const existing = memo.get(rootPath);
      if (existing !== undefined) return existing;

      const pending = read(rootPath).catch((error: unknown) => {
        // A rejection is not a result: holding it would make one transient
        // failure permanent for the life of the window.
        memo.delete(rootPath);
        throw error;
      });

      memo.set(rootPath, pending);
      return pending;
    },

    invalidate(): void {
      memo = new Map();
    },
  };
}
