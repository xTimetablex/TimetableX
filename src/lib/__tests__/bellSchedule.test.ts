import { describe, expect, it } from 'vitest';
import { getBellTimes } from '../bellSchedule';

describe('getBellTimes', () => {
  it('returns start/end for a known hour', () => {
    expect(getBellTimes('1')).toEqual({ start: '07:45', end: '08:30' });
  });

  it('returns start/end for hour 6', () => {
    expect(getBellTimes('6')).toEqual({ start: '12:35', end: '13:20' });
  });

  it('returns null for an unknown hour', () => {
    expect(getBellTimes('99')).toBeNull();
  });

  it('returns null for the fallback placeholder', () => {
    expect(getBellTimes('---')).toBeNull();
  });
});
