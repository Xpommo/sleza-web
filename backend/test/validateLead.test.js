// Tests for lead validation — run with: node --test test/validateLead.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validateCompany } from '../src/validateLead.js';

describe('validateEmail', () => {
  // Valid emails
  it('accepts standard email', () => assert.equal(validateEmail('user@company.ru'), null));
  it('accepts gmail',          () => assert.equal(validateEmail('test.user+tag@gmail.com'), null));
  it('accepts subdomain',      () => assert.equal(validateEmail('me@mail.example.co.uk'), null));
  it('accepts yandex',         () => assert.equal(validateEmail('ivan@yandex.ru'), null));

  // Invalid format
  it('rejects no @',           () => assert.ok(validateEmail('usercompany.ru')));
  it('rejects no domain',      () => assert.ok(validateEmail('user@')));
  it('rejects no local part',  () => assert.ok(validateEmail('@domain.ru')));
  it('rejects no TLD',         () => assert.ok(validateEmail('user@domain')));
  it('rejects TLD too short',  () => assert.ok(validateEmail('user@domain.r')));
  it('rejects double @',       () => assert.ok(validateEmail('user@@domain.ru')));
  it('rejects spaces',         () => assert.ok(validateEmail('us er@domain.ru')));
  it('rejects empty string',   () => assert.ok(validateEmail('')));
  it('rejects only digits',    () => assert.ok(validateEmail('12345')));
  it('rejects dot at start',   () => assert.ok(validateEmail('.user@domain.ru')));
  it('rejects dot at end local', () => assert.ok(validateEmail('user.@domain.ru')));
  it('rejects consecutive dots', () => assert.ok(validateEmail('user..name@domain.ru')));
});

describe('validateCompany', () => {
  // Valid
  it('accepts ООО name',       () => assert.equal(validateCompany('ООО Ромашка'), null));
  it('accepts latin name',     () => assert.equal(validateCompany('Acme Corp'), null));
  it('accepts ИП name',        () => assert.equal(validateCompany('ИП Иванов'), null));
  it('accepts short valid',    () => assert.equal(validateCompany('ИП'), null));
  it('accepts mixed',          () => assert.equal(validateCompany('Завод №5'), null));

  // Invalid
  it('rejects empty',          () => assert.ok(validateCompany('')));
  it('rejects only digits',    () => assert.ok(validateCompany('12345')));
  it('rejects only spaces',    () => assert.ok(validateCompany('   ')));
  it('rejects single char',    () => assert.ok(validateCompany('a')));
  it('rejects junk: test',     () => assert.ok(validateCompany('test')));
  it('rejects junk: тест',     () => assert.ok(validateCompany('тест')));
  it('rejects junk: aaa',      () => assert.ok(validateCompany('aaa')));
  it('rejects junk: asdf',     () => assert.ok(validateCompany('asdf')));
  it('rejects junk: qwerty',   () => assert.ok(validateCompany('qwerty')));
  it('rejects junk: 111',      () => assert.ok(validateCompany('111')));
  it('rejects repeated chars', () => assert.ok(validateCompany('аааааа')));
  it('rejects only symbols',   () => assert.ok(validateCompany('---')));
});
