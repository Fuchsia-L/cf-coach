const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_REVIEWS_PER_DAY,
  advanceReviewItem,
  resetReviewItem,
  selectReviewsDueToday,
} = require('../src/review-scheduling');

function createReviewItem(overrides = {}) {
  return {
    id: 'r_1710000000000',
    type: 'A',
    content: 'lower_bound usage',
    stage: 0,
    nextReviewDate: '2026-03-20',
    completed: false,
    createdAt: '2026-03-19T15:00:00.000Z',
    ...overrides,
  };
}

function createTimestamp(index) {
  return new Date(Date.UTC(2026, 2, 1, 0, index, 0)).toISOString();
}

function createOrderedItems(count, overrides = {}) {
  return Array.from({ length: count }, (_, index) => createReviewItem({
    id: `r_${String(index + 1).padStart(4, '0')}`,
    content: `item ${index + 1}`,
    nextReviewDate: overrides.nextReviewDate || '2026-03-19',
    createdAt: createTimestamp(index),
    ...overrides,
  }));
}

const abcTypes = ['A', 'B', 'C'];

for (const type of abcTypes) {
  test(`advanceReviewItem uses gap-based scheduling for type ${type}`, () => {
    const today = '2026-03-19';
    const cases = [
      { stage: 0, expectedStage: 1, expectedDate: '2026-03-20', expectedCompleted: false },
      { stage: 1, expectedStage: 2, expectedDate: '2026-03-22', expectedCompleted: false },
      { stage: 2, expectedStage: 3, expectedDate: '2026-03-26', expectedCompleted: false },
      { stage: 3, expectedStage: 4, expectedDate: '2026-04-09', expectedCompleted: false },
      { stage: 4, expectedStage: 4, expectedDate: '2026-03-20', expectedCompleted: true },
    ];

    for (const entry of cases) {
      const result = advanceReviewItem(createReviewItem({
        type,
        stage: entry.stage,
      }), { today });

      assert.equal(result.stage, entry.expectedStage);
      assert.equal(result.nextReviewDate, entry.expectedDate);
      assert.equal(result.completed, entry.expectedCompleted);
    }
  });
}

test('advanceReviewItem uses the extra day-14 stage for type D', () => {
  const today = '2026-03-19';
  const cases = [
    { stage: 0, expectedStage: 1, expectedDate: '2026-03-20', expectedCompleted: false },
    { stage: 1, expectedStage: 2, expectedDate: '2026-03-22', expectedCompleted: false },
    { stage: 2, expectedStage: 3, expectedDate: '2026-03-26', expectedCompleted: false },
    { stage: 3, expectedStage: 4, expectedDate: '2026-04-02', expectedCompleted: false },
    { stage: 4, expectedStage: 5, expectedDate: '2026-04-09', expectedCompleted: false },
    { stage: 5, expectedStage: 5, expectedDate: '2026-03-20', expectedCompleted: true },
  ];

  for (const entry of cases) {
    const result = advanceReviewItem(createReviewItem({
      type: 'D',
      stage: entry.stage,
    }), { today });

    assert.equal(result.stage, entry.expectedStage);
    assert.equal(result.nextReviewDate, entry.expectedDate);
    assert.equal(result.completed, entry.expectedCompleted);
  }
});

test('resetReviewItem restores any review item to stage 0 due tomorrow', () => {
  const today = '2026-03-19';
  const cases = [
    createReviewItem({ type: 'A', stage: 3, nextReviewDate: '2026-04-09' }),
    createReviewItem({ type: 'C', stage: 1, nextReviewDate: '2026-03-22' }),
    createReviewItem({ type: 'D', stage: 5, nextReviewDate: '2026-04-09', completed: true }),
  ];

  for (const item of cases) {
    const result = resetReviewItem(item, { today });

    assert.equal(result.stage, 0);
    assert.equal(result.completed, false);
    assert.equal(result.nextReviewDate, '2026-03-20');
  }
});

test('advanceReviewItem uses relative gaps from today instead of cumulative days', () => {
  const today = '2026-03-19';

  assert.equal(advanceReviewItem(createReviewItem({ type: 'A', stage: 0 }), { today }).nextReviewDate, '2026-03-20');
  assert.equal(advanceReviewItem(createReviewItem({ type: 'B', stage: 1 }), { today }).nextReviewDate, '2026-03-22');
  assert.equal(advanceReviewItem(createReviewItem({ type: 'C', stage: 2 }), { today }).nextReviewDate, '2026-03-26');
  assert.equal(advanceReviewItem(createReviewItem({ type: 'D', stage: 3 }), { today }).nextReviewDate, '2026-04-02');
  assert.equal(advanceReviewItem(createReviewItem({ type: 'D', stage: 4 }), { today }).nextReviewDate, '2026-04-09');
});

test('selectReviewsDueToday self-heals overdue items to today and preserves due ordering', () => {
  const today = '2026-03-19';
  const items = [
    createReviewItem({
      id: 'r_due_today',
      nextReviewDate: '2026-03-19',
      createdAt: '2026-03-01T00:02:00.000Z',
    }),
    createReviewItem({
      id: 'r_overdue_oldest',
      nextReviewDate: '2026-03-17',
      createdAt: '2026-03-01T00:00:00.000Z',
    }),
    createReviewItem({
      id: 'r_overdue_middle',
      nextReviewDate: '2026-03-18',
      createdAt: '2026-03-01T00:01:00.000Z',
    }),
    createReviewItem({
      id: 'r_future',
      nextReviewDate: '2026-03-21',
      createdAt: '2026-03-01T00:03:00.000Z',
    }),
  ];

  const result = selectReviewsDueToday(items, { today });
  const itemsById = new Map(result.items.map((item) => [item.id, item]));

  assert.equal(result.todayCount, 3);
  assert.equal(result.totalActive, 4);
  assert.equal(result.totalCompleted, 0);
  assert.deepEqual(result.dueItems.map((item) => item.id), [
    'r_overdue_oldest',
    'r_overdue_middle',
    'r_due_today',
  ]);
  assert.equal(itemsById.get('r_overdue_oldest').nextReviewDate, today);
  assert.equal(itemsById.get('r_overdue_middle').nextReviewDate, today);
  assert.equal(itemsById.get('r_due_today').nextReviewDate, today);
  assert.equal(itemsById.get('r_future').nextReviewDate, '2026-03-21');
});

test('selectReviewsDueToday keeps exactly ten due items on today without extra deferral', () => {
  const today = '2026-03-19';
  const items = createOrderedItems(MAX_REVIEWS_PER_DAY);

  const result = selectReviewsDueToday(items, { today });

  assert.equal(result.todayCount, MAX_REVIEWS_PER_DAY);
  assert.equal(result.dueItems.length, MAX_REVIEWS_PER_DAY);
  assert.deepEqual(result.dueItems.map((item) => item.id), items.map((item) => item.id));
  assert.equal(result.items.every((item) => item.nextReviewDate === today), true);
});

test('selectReviewsDueToday defers overflow past ten items while preserving oldest-first order', () => {
  const today = '2026-03-19';
  const dueToday = createOrderedItems(12, { nextReviewDate: today });
  const dueTomorrow = createOrderedItems(9, { nextReviewDate: '2026-03-20' }).map((item, index) => ({
    ...item,
    id: `r_tomorrow_${String(index + 1).padStart(2, '0')}`,
    createdAt: createTimestamp(index + 20),
  }));
  const items = [...dueToday, ...dueTomorrow];

  const result = selectReviewsDueToday(items, { today });
  const itemsById = new Map(result.items.map((item) => [item.id, item]));

  assert.equal(result.todayCount, 12);
  assert.deepEqual(result.dueItems.map((item) => item.id), dueToday.slice(0, 10).map((item) => item.id));
  assert.equal(itemsById.get(dueToday[10].id).nextReviewDate, '2026-03-20');
  assert.equal(itemsById.get(dueToday[11].id).nextReviewDate, '2026-03-20');
  assert.equal(itemsById.get(dueTomorrow[0].id).nextReviewDate, '2026-03-20');
  assert.equal(itemsById.get(dueTomorrow[7].id).nextReviewDate, '2026-03-20');
  assert.equal(itemsById.get(dueTomorrow[8].id).nextReviewDate, '2026-03-21');
});
