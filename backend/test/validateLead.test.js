// Tests for lead validation — run with: node --test test/validateLead.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateEmail, validateCompany } from '../src/validateLead.js';

describe('validateEmail', () => {
  // Valid emails
  it('accepts standard email', () => assert.equal(validateEmail('user@company.ru'), null));
  it('accepts gmail',          () => assert.equal(validateEmail('real.user+tag@gmail.com'), null));
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

  // Junk local-parts — only blocks clearly fake, not legitimate business addresses
  it('rejects test@mail.ru',   () => assert.ok(validateEmail('test@mail.ru')));
  it('rejects Test@mail.ru (case insensitive)', () => assert.ok(validateEmail('Test@mail.ru')));
  it('rejects noreply@...',    () => assert.ok(validateEmail('noreply@company.ru')));
  it('rejects no-reply@...',   () => assert.ok(validateEmail('no-reply@company.ru')));
  it('accepts info@ (legitimate business)', () => assert.equal(validateEmail('info@company.ru'), null));
  it('accepts admin@ (legitimate business)', () => assert.equal(validateEmail('admin@company.ru'), null));

  // Disposable email domains
  it('rejects mailinator',     () => assert.ok(validateEmail('foo@mailinator.com')));
  it('rejects guerrillamail',  () => assert.ok(validateEmail('foo@guerrillamail.com')));
  it('rejects yopmail',        () => assert.ok(validateEmail('foo@yopmail.com')));
  it('rejects 10minutemail',   () => assert.ok(validateEmail('foo@10minutemail.com')));
  it('rejects trashmail',      () => assert.ok(validateEmail('foo@trashmail.com')));
  it('rejects temp-mail',      () => assert.ok(validateEmail('foo@temp-mail.org')));
  it('rejects maildrop',       () => assert.ok(validateEmail('foo@maildrop.cc')));
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
