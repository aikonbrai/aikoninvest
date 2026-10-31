import test from 'node:test';
import assert from 'node:assert/strict';
import { addMoney, subtractMoney, usdToBrl, allocationBasisPoints } from '../dist/lib/financial.js';

test('add money in same currency', () => assert.deepEqual(addMoney({minor:100n,currency:'BRL'}, {minor:225n,currency:'BRL'}),{minor:325n,currency:'BRL'}));
test('reject mixed currency addition', () => assert.throws(()=>addMoney({minor:100n,currency:'BRL'}, {minor:100n,currency:'USD'})));
test('subtract amount', () => assert.equal(subtractMoney({minor:500n,currency:'USD'},{minor:120n,currency:'USD'}).minor,380n));
test('convert USD 100.00 at BRL 5.25', () => assert.equal(usdToBrl(10000n,5250000n),52500n));
test('allocation 25%', () => assert.equal(allocationBasisPoints(250n,1000n),2500n));
test('reject zero portfolio', () => assert.throws(()=>allocationBasisPoints(0n,0n)));

test('reject mixed currency subtraction', () => assert.throws(()=>subtractMoney({minor:100n,currency:'BRL'}, {minor:100n,currency:'USD'})));
test('FX rounds half cent upward', () => assert.equal(usdToBrl(1n,1500000n),2n));
test('FX rejects negative amount and nonpositive rates', () => { assert.throws(()=>usdToBrl(-1n,5250000n)); assert.throws(()=>usdToBrl(100n,0n)); assert.throws(()=>usdToBrl(100n,-1n)); });
test('allocation rejects invalid bounds', () => { assert.throws(()=>allocationBasisPoints(-1n,100n)); assert.throws(()=>allocationBasisPoints(101n,100n)); });
test('large balances remain precise above Number safe range', () => assert.equal(addMoney({minor:9007199254740993n,currency:'BRL'},{minor:1n,currency:'BRL'}).minor,9007199254740994n));
