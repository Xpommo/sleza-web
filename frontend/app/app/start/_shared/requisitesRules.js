import { EMAIL_RE, normalizePhone } from '../../../../lib/validate';
// Реквизиты владельца: подписи полей и правила проверки. Одни на шаг 4
// анкеты и на окно «Реквизиты владельца» в кабинете — иначе правка в
// кабинете пропустит то, что анкета не пустила бы.

export const digitsOnly = (v) => String(v || '').replace(/\D/g, '');

export function ownerLabels(owner) {
  const isOoo = owner === 'ООО';
  return {
    isOoo,
    innLength: isOoo ? 10 : 12,
    // Пока форма владения не выбрана — нейтральные подписи: раньше поля
    // заранее называли себя как у самозанятого («ФИО», «Адрес для почтовой
    // связи»), и человек из ООО видел чужую анкету.
    name: !owner ? 'Наименование или ФИО' : isOoo ? 'Наименование' : 'ФИО',
    namePlaceholder: !owner ? 'Сначала выберите форму владения' : isOoo ? 'ООО «Ромашка»' : 'Иванова Мария Сергеевна',
    // у самозанятого регистрационного номера нет
    ogrn: owner === 'Самозанятый' ? null : isOoo ? 'ОГРН' : 'ОГРНИП',
    ogrnLength: isOoo ? 13 : 15,
    address: !owner ? 'Адрес' : isOoo ? 'Юридический адрес' : 'Адрес для почтовой связи',
    addressPlaceholder: !owner ? 'Сначала выберите форму владения' : isOoo ? 'Индекс, город, улица, дом' : 'Можно абонентский ящик',
  };
}

// v: { owner, inn, name, ogrn, kpp, address, account, bank, bik, corr, companyMail, companyPhone }
// Возвращает { поле: сообщение } — пустой объект, если всё верно.
export function validateRequisites(v) {
  const L = ownerLabels(v.owner);
  const e = {};
  if (digitsOnly(v.inn).length !== (v.owner ? L.innLength : 0) || !v.inn) {
    e.inn = 'ИНН — 10 цифр для организации или 12 для ИП/самозанятого. Сейчас введено другое количество.';
  }
  if (!String(v.name || '').trim()) {
    e.name = L.isOoo ? 'Укажите наименование — оно попадёт в документы и в реквизиты на сайте.' : 'Укажите ФИО — оно попадёт в документы и в реквизиты на сайте.';
  }
  if (v.owner && L.ogrn && digitsOnly(v.ogrn).length !== L.ogrnLength) {
    e.ogrn = L.isOoo ? 'ОГРН — 13 цифр. Проверьте, не пропущена ли часть номера.' : 'ОГРНИП — 15 цифр. Проверьте, не пропущена ли часть номера.';
  }
  if (L.isOoo && digitsOnly(v.kpp).length !== 9) e.kpp = 'КПП — 9 цифр.';
  if (!String(v.address || '').trim()) e.address = 'Укажите адрес — он попадёт в реквизиты на сайте.';
  if (digitsOnly(v.account).length !== 20) e.account = 'Расчётный счёт — 20 цифр. Проверьте, не пропущена ли часть номера.';
  if (!String(v.bank || '').trim()) e.bank = 'Укажите банк — в нём открыт расчётный счёт из поля выше.';
  if (digitsOnly(v.bik).length !== 9) e.bik = 'БИК — 9 цифр.';
  if (digitsOnly(v.corr).length !== 20) e.corr = 'Корреспондентский счёт — 20 цифр. Проверьте, не пропущена ли часть номера.';
  if (!EMAIL_RE.test(String(v.companyMail || '').trim())) e.companyMail = 'Нужна почта вида name@site.ru — её увидят в реквизитах на сайте.';
  const phone = normalizePhone(v.companyPhone);
  if (phone.length <= 1) e.companyPhone = 'Укажите телефон — он попадёт в реквизиты на сайте.';
  else if (phone.length < 11) e.companyPhone = 'Номер неполный — после +7 нужно 10 цифр.';
  return e;
}
