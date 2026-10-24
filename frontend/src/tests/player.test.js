import { formatTime } from '../utils/format.js';

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${name}`);
    passed++;
  } else {
    console.error(`  ${colors.red('✖')} ${name}`);
    failed++;
  }
}

console.log(`\n${colors.cyan('========================================')}`);
console.log(`${colors.cyan('       Frontend Audio Player Tests      ')}`);
console.log(`${colors.cyan('========================================')}\n`);

// 1. Time formatting tests
assert(formatTime(0) === '0:00', '0 seconds formats to 0:00');
assert(formatTime(9) === '0:09', '9 seconds formats to 0:09');
assert(formatTime(65) === '1:05', '65 seconds formats to 1:05');
assert(formatTime(372) === '6:12', '372 seconds formats to 6:12');
assert(formatTime(NaN) === '0:00', 'NaN formats safely to 0:00');
assert(formatTime(null) === '0:00', 'null formats safely to 0:00');
assert(formatTime(-10) === '0:00', 'Negative seconds formats safely to 0:00');

// 2. Queue logic simulation tests
const mockQueue = [
  { id: '1', title: 'Song 1' },
  { id: '2', title: 'Song 2' },
  { id: '3', title: 'Song 3' },
];

let currentIndex = 0;
const getNext = (idx, q) => (idx + 1) % q.length;
const getPrev = (idx, q) => (idx <= 0 ? q.length - 1 : idx - 1);

assert(getNext(0, mockQueue) === 1, 'Advance from index 0 to 1');
assert(getNext(2, mockQueue) === 0, 'Advance from last index wraps to 0');
assert(getPrev(1, mockQueue) === 0, 'Previous from index 1 returns 0');
assert(getPrev(0, mockQueue) === 2, 'Previous from index 0 wraps to last index');

console.log(`\n${colors.cyan('========================================')}`);
console.log(`Player Logic Tests Finished: ${colors.green(`${passed} passed`)}, ${failed} failed`);
console.log(`${colors.cyan('========================================')}\n`);

process.exit(failed > 0 ? 1 : 0);
