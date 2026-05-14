import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  isCPF,
  isCNPJ,
  isCEP,
  isEAN,
  isNCM,
  isDate,
  isDatetime,
  isEmail,
  isURI,
  FORMATS,
} from '../../scripts/lib/formats-br.mjs';
import * as fx from './helpers/fixtures.mjs';

describe('formats-br', () => {
  describe('CPF', () => {
    for (const cpf of fx.CPFS_VALIDOS) {
      test(`válido — "${cpf}"`, () => assert.equal(isCPF(cpf), true));
    }
    for (const cpf of fx.CPFS_INVALIDOS) {
      test(`inválido — "${cpf}"`, () => assert.equal(isCPF(cpf), false));
    }
  });

  describe('CNPJ', () => {
    for (const cnpj of fx.CNPJS_VALIDOS) {
      test(`válido — "${cnpj}"`, () => assert.equal(isCNPJ(cnpj), true));
    }
    for (const cnpj of fx.CNPJS_INVALIDOS) {
      test(`inválido — "${cnpj}"`, () => assert.equal(isCNPJ(cnpj), false));
    }
  });

  describe('CEP', () => {
    for (const cep of fx.CEPS_VALIDOS) {
      test(`válido — "${cep}"`, () => assert.equal(isCEP(cep), true));
    }
    for (const cep of fx.CEPS_INVALIDOS) {
      test(`inválido — "${cep}"`, () => assert.equal(isCEP(cep), false));
    }
  });

  describe('EAN', () => {
    for (const ean of fx.EANS_VALIDOS) {
      test(`válido — "${ean}"`, () => assert.equal(isEAN(ean), true));
    }
    for (const ean of fx.EANS_INVALIDOS) {
      test(`inválido — "${ean}"`, () => assert.equal(isEAN(ean), false));
    }
  });

  describe('NCM', () => {
    for (const ncm of fx.NCMS_VALIDOS) {
      test(`válido — "${ncm}"`, () => assert.equal(isNCM(ncm), true));
    }
    for (const ncm of fx.NCMS_INVALIDOS) {
      test(`inválido — "${ncm}"`, () => assert.equal(isNCM(ncm), false));
    }
  });

  describe('date', () => {
    for (const d of fx.DATES_VALIDAS) {
      test(`válida — "${d}"`, () => assert.equal(isDate(d), true));
    }
    for (const d of fx.DATES_INVALIDAS) {
      test(`inválida — "${d}"`, () => assert.equal(isDate(d), false));
    }
  });

  describe('datetime', () => {
    for (const d of fx.DATETIMES_VALIDAS) {
      test(`válido — "${d}"`, () => assert.equal(isDatetime(d), true));
    }
    for (const d of fx.DATETIMES_INVALIDAS) {
      test(`inválido — "${d}"`, () => assert.equal(isDatetime(d), false));
    }
  });

  describe('email', () => {
    for (const e of fx.EMAILS_VALIDOS) {
      test(`válido — "${e}"`, () => assert.equal(isEmail(e), true));
    }
    for (const e of fx.EMAILS_INVALIDOS) {
      test(`inválido — "${e}"`, () => assert.equal(isEmail(e), false));
    }
  });

  describe('uri', () => {
    for (const u of fx.URIS_VALIDAS) {
      test(`válida — "${u}"`, () => assert.equal(isURI(u), true));
    }
    for (const u of fx.URIS_INVALIDAS) {
      test(`inválida — "${u}"`, () => assert.equal(isURI(u), false));
    }
  });

  describe('FORMATS map', () => {
    test('expõe todos os formats nomeados', () => {
      assert.deepEqual(
        Object.keys(FORMATS).sort(),
        ['cep', 'cnpj', 'cpf', 'date', 'datetime', 'ean', 'email', 'ncm', 'uri'],
      );
    });

    test('cada entrada é uma função', () => {
      for (const fn of Object.values(FORMATS)) {
        assert.equal(typeof fn, 'function');
      }
    });
  });
});
