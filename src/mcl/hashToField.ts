// SPDX-License-Identifier: MIT
/* Adapted from https://github.com/thehubbleproject/hubble-contracts/blob/f1c13fe4e1a0dc9ab1f150895de7c0e654ee46b0/ts/
   hashToField.ts */

import { ethers } from 'ethers';

export const FIELD_ORDER = BigInt(
  '0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47',
);

export function hashToField(
  domain: Uint8Array,
  msg: Uint8Array,
  count: number,
): ethers.BigNumberish[] {
  const u = 48;
  const _msg = expandMsg(domain, msg, count * u);
  const els = [];
  for (let i = 0; i < count; i++) {
    const el = ethers.toBigInt(_msg.slice(i * u, (i + 1) * u)) % FIELD_ORDER;
    els.push(el);
  }
  return els;
}

export function expandMsg(
  domain: Uint8Array,
  msg: Uint8Array,
  outLen: number,
): Uint8Array {
  if (domain.length > 32) {
    throw new Error('bad domain size');
  }

  const out: Uint8Array = new Uint8Array(outLen);

  const len0 = 64 + msg.length + 2 + 1 + domain.length + 1;
  const in0: Uint8Array = new Uint8Array(len0);
  // zero pad
  let off = 64;
  // msg
  in0.set(msg, off);
  off += msg.length;
  // l_i_b_str
  in0.set([(outLen >> 8) & 0xff, outLen & 0xff], off);
  off += 2;
  // I2OSP(0, 1)
  in0.set([0], off);
  off += 1;
  // DST_prime
  in0.set(domain, off);
  off += domain.length;
  in0.set([domain.length], off);

  const b0 = ethers.sha256(in0);

  const len1 = 32 + 1 + domain.length + 1;
  const in1: Uint8Array = new Uint8Array(len1);
  // b0
  in1.set(ethers.getBytes(b0), 0);
  off = 32;
  // I2OSP(1, 1)
  in1.set([1], off);
  off += 1;
  // DST_prime
  in1.set(domain, off);
  off += domain.length;
  in1.set([domain.length], off);

  const b1 = ethers.sha256(in1);

  // b_i = H(strxor(b_0, b_(i - 1)) || I2OSP(i, 1) || DST_prime);
  const ell = Math.floor((outLen + 32 - 1) / 32);
  let bi = b1;

  for (let i = 1; i < ell; i++) {
    const ini: Uint8Array = new Uint8Array(32 + 1 + domain.length + 1);
    const nb0 = bytes32ArrayZeroPadding(ethers.toBeArray(ethers.zeroPadValue(ethers.getBytes(b0), 32)));
    const nbi = bytes32ArrayZeroPadding(ethers.toBeArray(ethers.zeroPadValue(ethers.getBytes(bi), 32)));
    const tmp = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      tmp[i] = nb0[i] ^ nbi[i];
    }

    ini.set(tmp, 0);
    let off = 32;
    ini.set([1 + i], off);
    off += 1;
    ini.set(domain, off);
    off += domain.length;
    ini.set([domain.length], off);

    out.set(ethers.getBytes(bi), 32 * (i - 1));
    bi = ethers.sha256(ini);
  }

  out.set(ethers.getBytes(bi), 32 * (ell - 1));
  return out;
}

function bytes32ArrayZeroPadding(array: Uint8Array) {
  const resultedArray = new Uint8Array(32);
  const startPos = 32 - array.length;
  for (let i = startPos; i < 32; i++) {
    resultedArray[i] = array[i-startPos];
  }
  return resultedArray;
}