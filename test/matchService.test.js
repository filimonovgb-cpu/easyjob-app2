// test/matchService.test.js
/**
 * Jest unit tests for matchService.startMatching
 * - Mocks professionalsAPI
 * - Mocks Firestore getDocs / writeBatch commit by stubbing functions used in matchService
 */

jest.mock('../src/services/api', () => ({
  professionalsAPI: {
    getNearby: jest.fn(),
    getAll: jest.fn(),
  },
}));

// Mock firebase/firestore functions used in matchService
jest.mock('firebase/firestore', () => {
  const original = jest.requireActual('firebase/firestore');
  return {
    ...original,
    collection: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    getDocs: jest.fn(),
    writeBatch: jest.fn().mockReturnValue({
      set: jest.fn(),
      commit: jest.fn().mockResolvedValue(true),
    }),
    doc: jest.fn((colRef) => ({ id: 'auto-id-' + Math.random().toString(36).slice(2, 8) })),
    // keep serverTimestamp or others not used in the unit test
  };
});

const { professionalsAPI } = require('../src/services/api');
const { matchService } = require('../src/services/matchService');

const { getDocs } = require('firebase/firestore');

describe('matchService.startMatching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates offers up to TOP_N and respects existing active offers limit', async () => {
    // prepare mock candidates (6 candidates)
    professionalsAPI.getNearby.mockResolvedValue([
      { id: 'p1', distance: 1, rating: 4.9, pushToken: 't1' },
      { id: 'p2', distance: 2, rating: 4.8, pushToken: 't2' },
      { id: 'p3', distance: 3, rating: 4.7, pushToken: 't3' },
      { id: 'p4', distance: 4, rating: 4.6, pushToken: 't4' },
      { id: 'p5', distance: 5, rating: 4.5, pushToken: 't5' },
      { id: 'p6', distance: 6, rating: 4.4, pushToken: 't6' },
    ]);

    // simulate existing active offers length = 3
    getDocs.mockResolvedValue({
      docs: [
        { id: 'o1', data: () => ({ contractorId: 'p1', status: 'pending', expiresAt: new Date(Date.now() + 10000).toISOString() }) },
        { id: 'o2', data: () => ({ contractorId: 'p2', status: 'pending', expiresAt: new Date(Date.now() + 10000).toISOString() }) },
        { id: 'o3', data: () => ({ contractorId: 'p3', status: 'pending', expiresAt: new Date(Date.now() + 10000).toISOString() }) },
      ],
    });

    const order = { id: 'order_1', latitude: 55.75, longitude: 37.61, categoryId: null, description: 'Test' };

    const res = await matchService.startMatching(order, { topN: 5, maxActive: 5 });

    expect(res.success).toBe(true);
    // since 3 active exist, slotsLeft = 2 → should create 2 new offers
    expect(res.createdOffers.length).toBe(2);
    // ensure skipped contains none for limit case
    expect(Array.isArray(res.skipped)).toBe(true);
  });

  test('returns early if max active offers reached', async () => {
    professionalsAPI.getAll.mockResolvedValue([
      { id: 'p1' }, { id: 'p2' }
    ]);

    // existing 5 active offers
    getDocs.mockResolvedValue({
      docs: new Array(5).fill(null).map((_, i) => ({ id: `o${i}`, data: () => ({ contractorId: `p${i}`, status: 'pending', expiresAt: new Date(Date.now() + 10000).toISOString() }) }))
    });

    const order = { id: 'order_2' };
    const res = await matchService.startMatching(order, { topN: 5, maxActive: 5 });
    expect(res.success).toBe(true);
    expect(res.createdOffers.length).toBe(0);
    expect(res.message).toBe('order_active_offers_limit_reached');
  });
});
