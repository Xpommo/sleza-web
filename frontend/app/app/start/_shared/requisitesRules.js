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

// v: { owner, inn, name, ogrn, kpp, address, companyMail, companyPhone }
// Банковских реквизитов нет (владелец 25.09): на сайте их закон не требует.
// Возвращает { поле: сообщение } — пустой объект, если всё верно.
export function validateRequisites(v) {
  const L = ownerLabels(v.owner);
  const e = {};
  // Пустое поле — «Укажите …», а не «проверьте, не пропущена ли часть
  // номера»: человек ничего не вводил (разбор 25.09).
  if (!digitsOnly(v.inn)) e.inn = 'Укажите ИНН.';
  else if (digitsOnly(v.inn).length !== (v.owner ? L.innLength : 0)) {
    e.inn = 'ИНН — 10 цифр для организации или 12 для ИП/самозанятого. Сейчас введено другое количество.';
  }
  if (!String(v.name || '').trim()) {
    e.name = L.isOoo ? 'Укажите наименование: оно попадёт в документы и в реквизиты на сайте.' : 'Укажите ФИО: оно попадёт в документы и в реквизиты на сайте.';
  }
  if (v.owner && L.ogrn && !digitsOnly(v.ogrn)) e.ogrn = `Укажите ${L.ogrn}.`;
  else if (v.owner && L.ogrn && digitsOnly(v.ogrn).length !== L.ogrnLength) {
    e.ogrn = L.isOoo ? 'ОГРН — 13 цифр. Проверьте, не пропущена ли часть номера.' : 'ОГРНИП — 15 цифр. Проверьте, не пропущена ли часть номера.';
  }
  if (L.isOoo && !digitsOnly(v.kpp)) e.kpp = 'Укажите КПП.';
  else if (L.isOoo && digitsOnly(v.kpp).length !== 9) e.kpp = 'КПП — 9 цифр.';
  if (!String(v.address || '').trim()) e.address = 'Укажите адрес: он попадёт в реквизиты на сайте.';
  if (!EMAIL_RE.test(String(v.companyMail || '').trim())) e.companyMail = 'Нужен e-mail вида name@site.ru: его увидят в реквизитах на сайте.';
  const phone = normalizePhone(v.companyPhone);
  if (phone.length <= 1) e.companyPhone = 'Укажите телефон: он попадёт в реквизиты на сайте.';
  else if (phone.length < 11) e.companyPhone = 'Номер неполный: после +7 нужно 10 цифр.';
  return e;
}
