// @vitest-environment jsdom
/*
 * Smoke test: mounts the real app shell (ClientViewer) with a stubbed API and
 * drives the main flows. Next's router hooks are replaced by thin stand-ins
 * that read window.location, like the real ones do after a history update.
 */
import { act, createElement, type ReactNode } from 'react';
import { createRoot, hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TimetableData } from '../types';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: ReactNode }) =>
    createElement('a', { href, ...props }, children),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => createElement('span', { 'aria-label': alt }),
}));

const { default: ClientViewer } = await import('../../components/ClientViewer');
const { resetPreferencesForTests } = await import('../preferences');
const { dayQueryKey } = await import('../timetableQuery');

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Not implemented by jsdom.
Element.prototype.scrollIntoView = () => {};

const TODAY = '20261112'; // Thursday
const identity = { school: 'demo', user: 'alice' };

function plan(dateStr: string): TimetableData {
  return {
    title: 'Stundenplan',
    date: 'Donnerstag, 12. November 2026',
    updatedAt: '12.11.2026, 07:12',
    currentDateStr: dateStr,
    entries: [
      { class: '5/1', hour: '2', subject: 'DE', teacher: 'MEY', room: '311', info: 'Vertretung für AUE', teacherChanged: true },
      { class: '5/1', hour: '1', subject: 'MA', teacher: 'KNO', room: '313', info: '---' },
      { class: '9/2', hour: '3', subject: 'CH', teacher: 'HIN', room: '328', info: 'Chemie entfällt' },
    ],
    availableClasses: ['5/1', '9/2'],
    availableRooms: ['311', '313', '328'],
    availableTeachers: ['HIN', 'KNO', 'MEY'],
  };
}

let dayStatus = 200;
const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url === '/api/stundenplan') {
    const { date } = JSON.parse(String(init?.body));
    if (dayStatus !== 200) return Response.json({ error: 'Nicht angemeldet.' }, { status: dayStatus });
    return Response.json(plan(date));
  }
  if (url === '/api/history') {
    return Response.json({ classes: ['5/1', '9/2', '10/1'], rooms: [], teachers: ['ZZZ'], subjects: { 'class:5/1': ['DE', 'MA', 'REL'] } });
  }
  return Response.json({ ok: true });
});

let container: HTMLDivElement;
let root: Root;

async function flush(times = 5) {
  for (let i = 0; i < times; i++) {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  }
}

async function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  root = createRoot(container);
  await act(async () => {
    root.render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(ClientViewer, { initialIdentity: identity, defaultDateStr: TODAY, todayStr: TODAY })
      )
    );
  });
  await flush();
}

function button(name: string | RegExp): HTMLButtonElement {
  const match = Array.from(container.ownerDocument.querySelectorAll('button')).find(el => {
    const label = el.getAttribute('aria-label') ?? el.textContent ?? '';
    return typeof name === 'string' ? label.trim() === name : name.test(label);
  });
  if (!match) throw new Error(`No button ${name}`);
  return match;
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await flush();
}

describe('ClientViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-12T08:00:00Z') });
    localStorage.clear();
    resetPreferencesForTests();
    dayStatus = 200;
    fetchMock.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }));
    window.history.replaceState(null, '', '/app');
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the stored selection straight away, sorted, with notes about changes', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    await render();

    const lessons = Array.from(container.querySelectorAll('.lesson-subject-text')).map(el => el.textContent);
    expect(lessons).toEqual(['MA', 'DE']);
    expect(container.textContent).toContain('Vertretung für AUE');
    expect(container.textContent).toContain('Stand: heute, 07:12');
    expect(container.textContent).toContain('Donnerstag, 12. November 2026');
    expect(container.querySelector('.lesson .is-changed')?.textContent).toContain('MEY');
  });

  it('keeps a selection that is not in today\'s plan', async () => {
    localStorage.setItem('filterMode', 'teacher');
    localStorage.setItem('filterValue', 'ZZZ');
    await render();

    expect(localStorage.getItem('filterValue')).toBe('ZZZ');
    expect(container.textContent).toContain('ZZZ steht an diesem Tag nicht im Plan.');
  });

  it('asks first-time users to pick a class and remembers it', async () => {
    await render();

    expect(container.textContent).toContain('Welchen Plan möchtest du sehen?');
    await click(button('9/2'));

    expect(localStorage.getItem('filterValue')).toBe('9/2');
    expect(container.querySelector('.lesson.is-cancelled')?.textContent).toContain('CH');
  });

  it('switches the selection through the picker, including entries only known from history', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    await render();

    await click(button(/Klasse 5\/1, Auswahl ändern/));
    const dialog = document.querySelector('dialog');
    expect(dialog?.textContent).toContain('10/1');

    const option = Array.from(dialog!.querySelectorAll('[role="option"]')).find(el => el.textContent?.includes('ZZZ'));
    await click(option as HTMLElement);

    expect(document.querySelector('dialog')).toBeNull();
    expect(localStorage.getItem('filterMode')).toBe('teacher');
    expect(localStorage.getItem('filterValue')).toBe('ZZZ');
  });

  it('adds favorites and explains the limit instead of alert()', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    localStorage.setItem(
      'favorites',
      JSON.stringify([1, 2, 3, 4].map(i => ({ mode: 'room', value: `R${i}` })))
    );
    const alertSpy = vi.fn();
    vi.stubGlobal('alert', alertSpy);
    await render();

    await click(button('Zu Favoriten hinzufügen'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(container.querySelector('.toast')?.textContent).toContain('Maximal 4 Favoriten');

    await click(button('Raum R1'));
    expect(localStorage.getItem('filterValue')).toBe('R1');
  });

  it('navigates days without leaving the page and skips weekends', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    window.history.replaceState(null, '', '/app?date=20261113&step=timetable');
    await render();

    await click(button('Nächster Tag'));

    expect(window.location.search).toBe('?date=20261116');
  });

  it('offers to log in again when the session is rejected', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    dayStatus = 401;
    await render();

    expect(container.textContent).toContain('Bitte melde dich neu an');
    expect(button('Neu anmelden')).toBeTruthy();
  });

  it('hydrates server-rendered markup without mismatches', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');

    // Like the server prefetch: the plan is already in the cache.
    const seeded = () => {
      const client = new QueryClient();
      client.setQueryData(dayQueryKey(identity, TODAY), plan(TODAY));
      return client;
    };
    const app = (client: QueryClient) =>
      createElement(
        QueryClientProvider,
        { client },
        createElement(ClientViewer, { initialIdentity: identity, defaultDateStr: TODAY, todayStr: TODAY })
      );

    container.innerHTML = renderToString(app(seeded()));
    expect(container.textContent).toContain('Donnerstag, 12. November 2026');

    const recoverableErrors: unknown[] = [];
    await act(async () => {
      root = hydrateRoot(container, app(seeded()), {
        onRecoverableError: error => recoverableErrors.push(error),
      });
    });
    await flush();

    expect(recoverableErrors).toEqual([]);
    expect(Array.from(container.querySelectorAll('.lesson-subject-text')).map(el => el.textContent)).toEqual(['MA', 'DE']);
    // The prefetched plan is used as is, not fetched again.
    expect(fetchMock.mock.calls.map(([url]) => url)).not.toContain('/api/stundenplan');
  });

  it('does not load the history in the way of the first plan', async () => {
    localStorage.setItem('filterMode', 'class');
    localStorage.setItem('filterValue', '5/1');
    await render();

    const urls = fetchMock.mock.calls.map(([url]) => url);
    expect(urls[0]).toBe('/api/stundenplan');
    expect(urls).not.toContain('/api/history');
  });
});
