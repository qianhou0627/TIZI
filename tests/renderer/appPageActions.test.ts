import { describe, expect, it, vi } from 'vitest';
import { createPageActions } from '../../src/renderer/appPageActions';

type Page = 'home' | 'nodes';
type Mode = 'easy' | 'advanced';

function createHarness() {
  const setPage = vi.fn<(page: Page) => void>();
  const setUsageMode = vi.fn<(mode: Mode) => void>();
  const setMessage = vi.fn<(message: string) => void>();
  const setRegistrationSwitchOpen = vi.fn<(open: boolean) => void>();
  const actions = createPageActions<Page, Mode>({
    homePage: 'home',
    nodesPage: 'nodes',
    easyMode: 'easy',
    advancedMode: 'advanced',
    setPage,
    setUsageMode,
    setMessage,
    setRegistrationSwitchOpen
  });
  return { actions, setPage, setUsageMode, setMessage, setRegistrationSwitchOpen };
}

describe('createPageActions', () => {
  it('returns to home when switching to easy mode and keeps advanced mode on the current page', () => {
    const { actions, setPage, setUsageMode } = createHarness();

    actions.changeUsageMode('advanced');
    actions.changeUsageMode('easy');

    expect(setUsageMode.mock.calls).toEqual([['advanced'], ['easy']]);
    expect(setPage).toHaveBeenCalledTimes(1);
    expect(setPage).toHaveBeenCalledWith('home');
  });

  it('switches to advanced mode with one click', () => {
    const { actions, setUsageMode } = createHarness();
    actions.handleAdvancedUnlockClick();
    expect(setUsageMode).toHaveBeenCalledWith('advanced');
  });

  it('preserves page navigation and registration switch side-effect ordering', () => {
    const events: string[] = [];
    const { actions, setPage, setMessage, setRegistrationSwitchOpen } = createHarness();

    actions.openNodes();
    actions.openRegistrationSwitch(() => events.push('focus'));
    actions.closeRegistrationSwitch();

    expect(setPage).toHaveBeenCalledWith('nodes');
    expect(setMessage).toHaveBeenCalledWith('');
    expect(setRegistrationSwitchOpen.mock.calls).toEqual([[true], [false]]);
    expect(events).toEqual(['focus']);
  });
});
