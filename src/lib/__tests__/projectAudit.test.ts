import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('project audit regressions', () => {
  it('keeps production dependency audit mitigations in package metadata', () => {
    const pkg = JSON.parse(read('package.json'));

    expect(pkg.scripts.lint).toBe('tsc --noEmit');
    expect(pkg.dependencies.next).toBe('^16.2.9');
    expect(pkg.overrides.postcss).toBe('^8.5.15');
  });

  it('uses npm as the single package lock source', () => {
    expect(fs.existsSync(path.join(root, 'package-lock.json'))).toBe(true);

    // `bun install` migrates package-lock.json into a local bun.lock file on disk,
    // even with --frozen-lockfile, so check git tracking rather than fs existence.
    const trackedLockfiles = execFileSync('git', ['ls-files', 'bun.lock', 'bun.lockb'], {
      cwd: root,
    })
      .toString()
      .trim();

    expect(trackedLockfiles).toBe('');
  });

  it('keeps Next config on a single default export with allowed dev origins', () => {
    const config = read('next.config.ts');

    expect(config).toContain('allowedDevOrigins');
    expect(config).toContain('export default nextConfig');
    expect(config).not.toContain('module.exports');
  });

  it('does not persist plaintext credentials in browser storage', () => {
    const useAuth = read('src/lib/hooks/useAuth.ts');

    expect(useAuth).not.toMatch(/localStorage\.(setItem|getItem)/);
    expect(useAuth).not.toContain('school_creds');
    expect(useAuth).toContain("fetch('/api/auth'");
  });

  it('does not send credentials from timetable or subject browser requests', () => {
    const useTimetable = read('src/lib/hooks/useTimetable.ts');
    const useAvailableSubjects = read('src/lib/hooks/useAvailableSubjects.ts');

    expect(useTimetable).not.toContain('...creds');
    expect(useAvailableSubjects).not.toContain('...creds');
    expect(useTimetable).not.toMatch(/body:\s*JSON\.stringify\([\s\S]*pass/);
    expect(useAvailableSubjects).not.toMatch(/body:\s*JSON\.stringify\([\s\S]*pass/);
  });

  it('registers the push-only service worker with no fetch/cache handler', () => {
    const layout = read('src/app/layout.tsx');
    const sw = read('public/sw.js');

    expect(layout).toContain("register('/sw.js')");
    expect(sw).not.toContain("addEventListener('fetch'");
  });
});
