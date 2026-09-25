'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BankIcon,
  BuildingIcon,
  CertificateIcon,
  CheckIcon,
  InfoIcon,
  ShieldCheckIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { announce } from '../../../../lib/announce';
import { RING, AnketaFrame, Field, PhoneField, Segmented, BlockHead, SectionHead, focusFirstError } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';
import { digitsOnly, ownerLabels, validateRequisites } from '../_shared/requisitesRules';
import { EMAIL_RE, formatPhone } from '../../../../lib/validate';

const OWNERS = ['ООО', 'ИП', 'Самозанятый'];

// Лицензия требуется не по всякой сфере. Медицина и образование —
// лицензируемые виды деятельности. СМИ — не лицензия, а свидетельство о
// регистрации (спрашиваем отдельно, владелец 23.09), ИТ — аккредитация и
// реестр ПО (тоже отдельно).
const LICENSE_SPHERES = {
  medicine: 'Медицина, клиники',
  school: 'Онлайн-школа, курсы, репетиторство',
  kids: 'Детский центр, кружки, секции',
};

// Банк и корсчёт однозначно определяются БИК — вводить их незачем. В
// прототипе — несколько настоящих банков для демонстрации (как подстановка
// по ИНН); в продукте — справочник БИК Банка России. Не нашли — поля вручную.
const BIK_LOOKUP = {
  '044525225': { bank: 'ПАО «Сбербанк»', corr: '30101810400000000225' },
  '044525974': { bank: 'АО «ТБанк»', corr: '30101810145250000974' },
  '044525593': { bank: 'АО «Альфа-Банк»', corr: '30101810200000000593' },
  '044525187': { bank: 'Банк ВТБ (ПАО)', corr: '30101810700000000187' },
};

// Найденное — карточкой на проверку, а не пятью открытыми полями
// (владелец 23.09: блок реквизитов был слишком большим). «Изменить»
// открывает поля.
function FoundCard({ note, title, lines, onEdit }) {
  return (
    <div className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-ok/25 bg-ok/[0.05] p-4">
      <div className="flex min-w-0 gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ok text-white">
          <CheckIcon size={12} />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-ok">{note}</p>
          <p className="mt-1 text-sm font-bold text-ink">{title}</p>
          {lines.filter(Boolean).map((l) => (
            <p key={l} className="mt-0.5 text-[13px] leading-5 text-ink/65">
              {l}
            </p>
          ))}
        </div>
      </div>
      <button type="button" onClick={onEdit} className={`shrink-0 rounded text-sm font-semibold text-brand hover:text-ink ${RING}`}>
        Изменить
      </button>
    </div>
  );
}

// Та же карточка, раскрытая для правки: жёлтая обводка вместо зелёной —
// данные меняются и ещё не подтверждены; внизу настоящая кнопка «Готово»
// (владелец 23.09: слово «Готово» под полями было не видно).
function EditCard({ note, onDone, children }) {
  return (
    <div className="mt-4 rounded-xl border border-warn/40 bg-warn/[0.06] p-4 sm:p-5">
      <p className="text-[12px] font-semibold text-warn-ink">{note}</p>
      <div className="mt-3 grid gap-5 md:grid-cols-2">{children}</div>
      {onDone && (
        <button
          type="button"
          onClick={onDone}
          className={`mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition hover:bg-brand-hover ${RING}`}
        >
          <CheckIcon size={15} /> Готово
        </button>
      )}
    </div>
  );
}

const LINK_BTN = `mt-3 rounded text-[13px] font-semibold text-brand hover:text-ink ${RING}`;

// Демо-подстановка по ИНН: реестр в этом дереве не запрашивается (бэкенда
// здесь нет), но поведение то же, что в утверждённой анкете — заполняем и
// помечаем «проверьте», а не выдаём за подтверждённые данные.
const INN_LOOKUP = {
  'ООО': { name: 'ООО «Альфа Образование»', ogrn: '1157746112233', kpp: '770101001', address: '119019, Москва, ул. Воздвиженка, д. 10' },
  'ИП': { name: 'Иванова Мария Сергеевна', ogrn: '304770000000123', address: '119019, Москва, ул. Воздвиженка, д. 10' },
  'Самозанятый': { name: 'Иванова Мария Сергеевна', address: '119019, Москва, ул. Воздвиженка, д. 10' },
};


export default function RequisitesClient() {
  const router = useRouter();

  const [sphere, setSphere] = useState('');
  useEffect(() => setSphere(loadAnketa().sphere || ''), []);

  // Ничего не выбрано на старте — от формы владения зависит, какие поля
  // вообще спрашивать, решать это за клиента нельзя.
  const [owner, setOwner] = useState(null);
  const [ownerError, setOwnerError] = useState(null);

  const [inn, setInn] = useState('');
  const [innError, setInnError] = useState(null);
  const [innFound, setInnFound] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [ogrn, setOgrn] = useState('');
  const [ogrnError, setOgrnError] = useState(null);
  const [kpp, setKpp] = useState('');
  const [kppError, setKppError] = useState(null);
  const [address, setAddress] = useState('');
  const [addressError, setAddressError] = useState(null);
  const [registryWhy, setRegistryWhy] = useState(false);
  // Поля реестра открыты, только когда их правят или заполняют вручную.
  const [regEdit, setRegEdit] = useState(false);
  // «Заполнить вручную» выключает подстановку: дописал ИНН — поля, которые
  // человек заполняет сам, не перезаписываются и не сворачиваются (владелец 24.09).
  const [regManual, setRegManual] = useState(false);

  const [account, setAccount] = useState('');
  const [accountError, setAccountError] = useState(null);
  const [bank, setBank] = useState('');
  const [bankError, setBankError] = useState(null);
  const [bik, setBik] = useState('');
  const [bikError, setBikError] = useState(null);
  const [corr, setCorr] = useState('');
  const [corrError, setCorrError] = useState(null);
  const [bankWhy, setBankWhy] = useState(false);
  const [bankEdit, setBankEdit] = useState(false);
  const [bankManual, setBankManual] = useState(false);

  const [license, setLicense] = useState(null);
  const [licenseError, setLicenseError] = useState(null);
  const [licenseNo, setLicenseNo] = useState('');
  const [licenseNoError, setLicenseNoError] = useState(null);
  const [licenseDate, setLicenseDate] = useState('');
  const [licenseOrg, setLicenseOrg] = useState('');
  const [licenseOrgError, setLicenseOrgError] = useState(null);
  const [licenseWhy, setLicenseWhy] = useState(false);

  const [itAccred, setItAccred] = useState(null);
  const [softRegistry, setSoftRegistry] = useState(null);
  // Номера записей — то, ради чего спрашиваем: без них ответ «Есть» никуда
  // не шёл (владелец 24.09). Показываем в «Реквизитах» на сайте.
  const [itAccredNo, setItAccredNo] = useState('');
  const [itAccredNoError, setItAccredNoError] = useState(null);
  const [softRegistryNo, setSoftRegistryNo] = useState('');
  const [softRegistryNoError, setSoftRegistryNoError] = useState(null);

  const [media, setMedia] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [mediaNo, setMediaNo] = useState('');
  const [mediaNoError, setMediaNoError] = useState(null);
  const [mediaDate, setMediaDate] = useState('');
  const [mediaOrg, setMediaOrg] = useState('Роскомнадзор');
  const [mediaOrgError, setMediaOrgError] = useState(null);

  const [companyMail, setCompanyMail] = useState('');
  const [companyMailError, setCompanyMailError] = useState(null);
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPhoneError, setCompanyPhoneError] = useState(null);
  const [postAddress, setPostAddress] = useState('');
  const [pdContact, setPdContact] = useState('');
  // «Та же, что почта компании» — галочкой, осознанно (разбор текстов 25.09);
  // молча почту компании сюда по-прежнему не подставляем (владелец 23.09).
  const [pdSame, setPdSame] = useState(false);
  useEffect(() => {
    if (pdSame) setPdContact(companyMail);
  }, [pdSame, companyMail]);
  const [restored, setRestored] = useState(false);

  // Возврат на шаг («Назад», F5, «Продолжить анкету» из списка сайтов)
  // показывает то, что уже ответили: ответы лежат в анкете, и терять их
  // между экранами нельзя. Читаем после монтирования — страница статическая,
  // и первая отрисовка должна совпасть с серверной.
  useEffect(() => {
    const a = loadAnketa();
    setRestored(true);
    if (!a.owner) return;
    setOwner(a.owner);
    setInn(a.inn || '');
    setName(a.companyName || '');
    setOgrn(a.ogrn || '');
    setKpp(a.kpp || '');
    setAddress(a.address || '');
    setInnFound(Boolean(a.inn && a.companyName));
    if (a.bank) {
      setAccount(a.bank.account || '');
      setBank(a.bank.bank || '');
      setBik(a.bank.bik || '');
      setCorr(a.bank.corr || '');
    }
    if (a.license) {
      // Старые ответы «Да / Нет / В процессе» — в новые слова (владелец 25.09).
      setLicense({ Да: 'Есть', Нет: 'Не нужна', 'В процессе': 'Оформляем' }[a.license.has] ?? a.license.has ?? null);
      setLicenseNo(a.license.no || '');
      setLicenseDate(a.license.date || '');
      setLicenseOrg(a.license.org || '');
    }
    setItAccred(a.itAccred ?? null);
    setSoftRegistry(a.softRegistry ?? null);
    setItAccredNo(a.itAccredNo || '');
    setSoftRegistryNo(a.softRegistryNo || '');
    if (a.mediaReg) {
      setMedia(a.mediaReg.has ?? null);
      setMediaNo(a.mediaReg.no || '');
      setMediaDate(a.mediaReg.date || '');
      setMediaOrg(a.mediaReg.org ?? 'Роскомнадзор');
    }
    if (a.contacts) {
      setCompanyMail(a.contacts.companyMail || '');
      setCompanyPhone(formatPhone(a.contacts.companyPhone || ''));
      setPostAddress(a.contacts.postAddress || '');
      setPdContact(a.contacts.pdContact || '');
      setPdSame(Boolean(a.contacts.pdSame));
    }
  }, []);

  function answers() {
    return {
      owner, inn, companyName: name, ogrn, kpp, address,
      bank: { account, bank, bik, corr },
      license: licenseSphere ? { has: license, no: licenseNo, date: licenseDate, org: licenseOrg } : null,
      itAccred, softRegistry,
      itAccredNo: itAccred === 'Есть' ? itAccredNo : '',
      softRegistryNo: softRegistry === 'Есть' ? softRegistryNo : '',
      mediaReg: sphere === 'media' ? { has: media, no: mediaNo, date: mediaDate, org: mediaOrg } : null,
      contacts: { companyMail, companyPhone, postAddress, pdContact, pdSame },
    };
  }

  // Черновик пишется на каждое изменение, а не только по «Далее»: иначе
  // «Назад» и F5 теряют всё, что набрано на этом шаге. Пишем только после
  // восстановления — иначе пустые значения первой отрисовки затрут анкету.
  useEffect(() => {
    if (restored) saveAnketa(answers());
    // answers() читает те же значения, что перечислены здесь
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restored, owner, inn, name, ogrn, kpp, address, account, bank, bik, corr,
      license, licenseNo, licenseDate, licenseOrg, itAccred, softRegistry, itAccredNo, softRegistryNo, media, mediaNo, mediaDate, mediaOrg,
      companyMail, companyPhone, postAddress, pdContact, pdSame]);
  const [pdContactError, setPdContactError] = useState(null);
  const [pdWhy, setPdWhy] = useState(false);
  const [contactsWhy, setContactsWhy] = useState(false);

  const isOoo = owner === 'ООО';
  const innLength = isOoo ? 10 : 12;
  // Лицензию получают только организации и ИП (99-ФЗ ст.3); самозанятый —
  // физлицо без ОГРНИП, лицензии у него быть не может, и вопрос не задаём.
  const licenseSphere = owner === 'Самозанятый' ? null : LICENSE_SPHERES[sphere];
  const showIt = isOoo && sphere === 'it';
  // Свидетельство СМИ — при любой форме владения: учредителем СМИ может быть
  // и гражданин.
  const showMedia = sphere === 'media';
  const showLicenseBlock = Boolean(licenseSphere) || showIt || showMedia;

  // Подстановка срабатывает на полной длине ИНН и только когда форма
  // владения уже выбрана: у ООО 10 цифр, у ИП и самозанятого 12.
  // Ошибки полей реестра живут ровно до тех пор, пока причина не устранена:
  // после смены формы владения они относились бы к другому набору полей
  // (у ООО спрашиваем наименование, у ИП — ФИО), а после подстановки поля
  // уже заполнены — висящая под ними краснота врёт.
  function clearRegistryErrors() {
    setNameError(null);
    setOgrnError(null);
    setKppError(null);
    setAddressError(null);
  }

  const lastFill = useRef({});
  // ИНН — ровно той длины, что у выбранной формы (10 у ООО, 12 у ИП и
  // самозанятого): лишнюю цифру не дать ввести, иначе подстановка молчит, а
  // человек не понимает почему (владелец 24.09).
  function applyInn(raw, who, manual = regManual) {
    const len = who === 'ООО' ? 10 : 12;
    const value = raw.slice(0, len);
    setInn(value);
    setInnError(null);
    if (!who || value.length !== len || manual) {
      setInnFound(false);
      return;
    }
    const found = INN_LOOKUP[who] || {};
    setInnFound(true);
    if (found.name) announce(`Нашли по ИНН: ${found.name}. Проверьте данные.`);
    // Заполняем пустые поля и те, что подставили сами в прошлый раз; то,
    // что человек поправил руками, не трогаем (решение макета 8.09).
    const last = lastFill.current;
    const put = (cur, key, set) => {
      if (!cur || cur === last[key]) set(found[key] || '');
    };
    put(name, 'name', setName);
    put(ogrn, 'ogrn', setOgrn);
    put(kpp, 'kpp', setKpp);
    put(address, 'address', setAddress);
    lastFill.current = found;
    clearRegistryErrors();
    setRegEdit(false);
  }
  function onInnChange(e) {
    applyInn(digitsOnly(e.target.value), owner);
  }

  // «Готово» у раскрытых полей: правки остаются, поля сворачиваются обратно в
  // карточку (владелец 23.09). С ошибкой не сворачиваем — карточка спрятала бы
  // неверные данные.
  function doneFields(keys) {
    const e = validateRequisites({ owner, inn, name, ogrn, kpp, address, account, bank, bik, corr, companyMail, companyPhone });
    let bad = false;
    keys.forEach(([key, set]) => {
      set(e[key] || null);
      if (e[key]) bad = true;
    });
    return !bad;
  }
  function doneRegistry() {
    if (doneFields([['inn', setInnError], ['name', setNameError], ['ogrn', setOgrnError], ['kpp', setKppError], ['address', setAddressError]])) setRegEdit(false);
  }
  function doneBank() {
    if (doneFields([['bik', setBikError], ['bank', setBankError], ['corr', setCorrError]])) setBankEdit(false);
  }

  const lastBank = useRef({});
  function applyBik(value, manual = bankManual) {
    setBik(value);
    setBikError(null);
    if (value.length !== 9 || manual) return;
    const found = BIK_LOOKUP[value];
    const last = lastBank.current;
    if (!found) {
      // Подставленное по прошлому БИК к новому не относится — стираем; то,
      // что человек ввёл руками, не трогаем.
      if (bank && bank === last.bank) setBank('');
      if (corr && corr === last.corr) setCorr('');
      lastBank.current = {};
      setBankEdit(true);
      return;
    }
    if (!bank || bank === last.bank) setBank(found.bank);
    if (!corr || corr === last.corr) setCorr(found.corr);
    lastBank.current = found;
    setBankError(null);
    setCorrError(null);
    setBankEdit(false);
  }
  function onBikChange(e) {
    applyBik(digitsOnly(e.target.value).slice(0, 9));
  }

  function pickOwner(item) {
    setOwner(item);
    setOwnerError(null);
    clearRegistryErrors();
    // ИНН другой длины к новой форме не подходит: не обрезаем молча, а
    // стираем вместе с тем, что по нему подставили.
    if (inn.length > (item === 'ООО' ? 10 : 12)) {
      const last = lastFill.current;
      if (name === last.name) setName('');
      if (ogrn === last.ogrn) setOgrn('');
      if (kpp === last.kpp) setKpp('');
      if (address === last.address) setAddress('');
      lastFill.current = {};
      setInn('');
      setInnFound(false);
      setInnError(null);
    } else applyInn(inn, item);
  }

  function handleNext() {
    let ok = true;
    const fail = (setter, message) => {
      setter(message);
      ok = false;
    };

    if (!owner) {
      setOwnerError('Выберите, кто владеет сайтом: от этого зависит, какие реквизиты спрашивать.');
      return;
    }

    // Реквизиты проверяются общими правилами — теми же, что у окна
    // «Реквизиты владельца» в кабинете.
    const e = validateRequisites({ owner, inn, name, ogrn, kpp, address, account, bank, bik, corr, companyMail, companyPhone });
    const put = (setter, key) => (e[key] ? fail(setter, e[key]) : setter(null));
    put(setInnError, 'inn');
    put(setNameError, 'name');
    put(setOgrnError, 'ogrn');
    put(setKppError, 'kpp');
    put(setAddressError, 'address');
    put(setAccountError, 'account');
    put(setBankError, 'bank');
    put(setBikError, 'bik');
    put(setCorrError, 'corr');
    // Ошибка в свёрнутых полях не должна прятаться за карточкой: открываем их.
    // Пока ИНН не введён, хватает ошибки у самого ИНН.
    if (!e.inn && (e.name || e.ogrn || e.kpp || e.address)) setRegEdit(true);
    if (!e.bik && (e.bank || e.corr)) setBankEdit(true);

    if (showMedia) {
      if (!media) fail(setMediaError, 'Ответьте, зарегистрирован ли сайт как СМИ: от этого зависит, что показать в подвале.');
      else setMediaError(null);
      if (media === 'Да') {
        if (!mediaNo.trim()) fail(setMediaNoError, 'Укажите номер свидетельства: он публикуется вместе с реквизитами.');
        else setMediaNoError(null);
        if (!mediaOrg.trim()) fail(setMediaOrgError, 'Укажите, кто зарегистрировал СМИ.');
        else setMediaOrgError(null);
      }
    }

    if (licenseSphere) {
      if (!license) fail(setLicenseError, 'Ответьте про лицензию: без ответа мы не знаем, указывать ли её в документах.');
      else setLicenseError(null);
      if (license === 'Есть') {
        if (!licenseNo.trim()) fail(setLicenseNoError, 'Укажите номер лицензии: он публикуется вместе с реквизитами.');
        else setLicenseNoError(null);
        if (!licenseOrg.trim()) fail(setLicenseOrgError, 'Укажите орган, выдавший лицензию: этого требует ЗоЗПП ст.9 ч.2.');
        else setLicenseOrgError(null);
      }
    }

    if (showIt && itAccred === 'Есть') {
      if (!itAccredNo.trim()) fail(setItAccredNoError, 'Укажите номер записи: покажем его в реквизитах на сайте.');
      else setItAccredNoError(null);
    }
    if (showIt && softRegistry === 'Есть') {
      if (!softRegistryNo.trim()) fail(setSoftRegistryNoError, 'Укажите номер записи в реестре: покажем его в реквизитах на сайте.');
      else setSoftRegistryNoError(null);
    }

    put(setCompanyMailError, 'companyMail');
    put(setCompanyPhoneError, 'companyPhone');
    if (!EMAIL_RE.test(pdContact.trim())) {
      fail(setPdContactError, pdContact.trim() ? 'Нужен e-mail вида name@site.ru: на него клиенты пришлют отзыв согласия.' : 'Укажите e-mail: без него в политике и согласии не будет способа отозвать согласие.');
    } else setPdContactError(null);

    if (!ok) {
      focusFirstError();
      return;
    }

    saveAnketa(answers());
    markStepDone(4);
    router.push('/app/start/documents');
  }

  return (
    <AnketaFrame current={3} title="Реквизиты" lead={<>Данные компании встанут в документы и в «Реквизиты» в подвале сайта.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              {/* «Кто владеет сайтом» подрядчик читал как вопрос о себе и отвечал
                  формой своей компании (владелец 23.09). Варианты — в самом
                  вопросе; «Зачем» не нужен: из вопроса понятно, что выбираешь. */}
              <SectionHead id="h-owner" title="Владелец сайта — ООО, ИП или самозанятый?" required />
              <div className="mt-5">
                <Segmented options={OWNERS} value={owner} onChange={pickOwner} ariaLabelledby="h-owner" />
              </div>
              {ownerError && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{ownerError}</p>}

              {/* До выбора формы — только сам вопрос: двадцать полей сразу
                  пугали, а половина из них зависит от ответа (владелец 24.09). */}
              {owner && (
              <>
              <div className="my-7 h-px bg-line" />

              <BlockHead
                id="h-registry"
                icon={BuildingIcon}
                title="Данные из реестра"
                why="По закону на сайте должно быть видно, кто им владеет: наименование, адрес и регистрационные номера."
                whyOpen={registryWhy}
                onWhy={() => setRegistryWhy(!registryWhy)}
              />
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="ИНН"
                  required
                  placeholder={`${innLength} цифр`}
                  icon={BankIcon}
                  badge={regManual ? null : 'Автозаполнение по ИНН'}
                  inputMode="numeric"
                  name="inn"
                  autoComplete="off"
                  maxLength={innLength}
                  value={inn}
                  onChange={onInnChange}
                  error={innError}
                />
              </div>
              {/* Нашли по ИНН — карточка на проверку; поля — по «Изменить» или
                  вручную. Карточка только при полном ИНН: иначе под недописанным
                  номером висела бы чужая компания. */}
              {!regEdit && inn.length === innLength && name && address ? (
                <FoundCard
                  note={name === lastFill.current.name && address === lastFill.current.address ? 'Нашли по ИНН, проверьте' : 'Проверьте, что всё верно'}
                  title={name}
                  lines={[
                    [owner !== 'Самозанятый' && ogrn && `${isOoo ? 'ОГРН' : 'ОГРНИП'} ${ogrn}`, isOoo && kpp && `КПП ${kpp}`].filter(Boolean).join(' · '),
                    address,
                  ]}
                  onEdit={() => setRegEdit(true)}
                />
              ) : regEdit ? (
                <EditCard note="Редактирование" onDone={inn.length === innLength ? doneRegistry : null}>
                <Field
                  label={ownerLabels(owner).name}
                  required
                  placeholder={ownerLabels(owner).namePlaceholder}
                  icon={isOoo ? BuildingIcon : UserIcon}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setNameError(null);
                  }}
                  error={nameError}
                />
                {owner && owner !== 'Самозанятый' && (
                  <Field
                    label={isOoo ? 'ОГРН' : 'ОГРНИП'}
                    required
                    placeholder={isOoo ? '13 цифр' : '15 цифр'}
                    icon={CertificateIcon}
                    inputMode="numeric"
                    value={ogrn}
                    onChange={(e) => {
                      setOgrn(digitsOnly(e.target.value).slice(0, 15));
                      setOgrnError(null);
                    }}
                    error={ogrnError}
                  />
                )}
                {isOoo && (
                  <Field
                    label="КПП"
                    required
                    placeholder="9 цифр"
                    icon={InfoIcon}
                    inputMode="numeric"
                    value={kpp}
                    onChange={(e) => {
                      setKpp(digitsOnly(e.target.value).slice(0, 9));
                      setKppError(null);
                    }}
                    error={kppError}
                  />
                )}
                <div className="md:col-span-2">
                  {/* У ИП и самозанятого нет юридического адреса, а домашний
                      раскрывать незачем: закон принимает адрес для почтовой
                      связи, в том числе абонентский ящик. */}
                  <Field
                    label={ownerLabels(owner).address}
                    required
                    placeholder={ownerLabels(owner).addressPlaceholder}
                    icon={BuildingIcon}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setAddressError(null);
                    }}
                    error={addressError}
                  />
                </div>
                </EditCard>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRegManual(true);
                    setRegEdit(true);
                  }}
                  className={LINK_BTN}
                >
                  Заполнить вручную
                </button>
              )}
              {regManual && regEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setRegManual(false);
                    applyInn(inn, owner, false);
                  }}
                  className={LINK_BTN}
                >
                  Подставить по ИНН
                </button>
              )}

              <div className="my-7 h-px bg-line" />

              {/* Банк — такой же блок, как соседние: серая подложка выделяла его
                  как особенный, хотя он не важнее реестра и контактов. */}
              <div>
                <BlockHead
                  id="h-bank"
                  icon={BankIcon}
                  title="Банковские реквизиты"
                  note="Необязательно"
                  why="Если укажете, покажем их в «Реквизитах владельца» на вашем сайте: по ним клиенты смогут платить вам по счёту."
                  whyOpen={bankWhy}
                  onWhy={() => setBankWhy(!bankWhy)}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field
                    label="БИК"
                    placeholder="9 цифр"
                    icon={InfoIcon}
                    badge={bankManual ? null : 'Банк подставим по БИК'}
                    inputMode="numeric"
                    name="bik"
                    autoComplete="off"
                    maxLength={9}
                    value={bik}
                    onChange={onBikChange}
                    error={bikError}
                  />
                  <Field
                    label="Расчётный счёт"
                    /* Счета начинаются по-разному: у ООО 40702…, у ИП 40802…, у
                       самозанятого обычно личный 40817… (разбор 25.09: 40702 у ИП
                       бухгалтер замечает сразу). */
                    placeholder={owner === 'Самозанятый' ? '40817810...' : owner === 'ИП' ? '40802810...' : '40702810...'}
                    icon={BankIcon}
                    inputMode="numeric"
                    name="account"
                    autoComplete="off"
                    value={account}
                    onChange={(e) => {
                      setAccount(digitsOnly(e.target.value).slice(0, 20));
                      setAccountError(null);
                    }}
                    error={accountError}
                  />
                </div>
                {!bankEdit && bik.length === 9 && bank && corr ? (
                  <FoundCard
                    note={bank === lastBank.current.bank && corr === lastBank.current.corr ? 'Нашли по БИК, проверьте' : 'Проверьте, что всё верно'}
                    title={bank}
                    lines={[`Корреспондентский счёт ${corr}`]}
                    onEdit={() => setBankEdit(true)}
                  />
                ) : (
                  bankEdit && (
                    <EditCard
                      note={bik.length === 9 && !BIK_LOOKUP[bik] && !bank ? 'Не нашли банк по БИК, заполните вручную' : 'Редактирование'}
                      onDone={bik.length === 9 ? doneBank : null}
                    >
                        <Field
                          label="Банк"
                          required
                          placeholder="ПАО «Сбербанк»"
                          icon={BuildingIcon}
                          value={bank}
                          onChange={(e) => {
                            setBank(e.target.value);
                            setBankError(null);
                          }}
                          error={bankError}
                        />
                        <Field
                          label="Корреспондентский счёт"
                          required
                          placeholder="30101810..."
                          icon={BankIcon}
                          inputMode="numeric"
                          value={corr}
                          onChange={(e) => {
                            setCorr(digitsOnly(e.target.value).slice(0, 20));
                            setCorrError(null);
                          }}
                          error={corrError}
                        />
                    </EditCard>
                  )
                )}
                {/* Как у ИНН: «вручную» — и подстановка по БИК больше не
                    вмешивается в то, что человек вводит сам (владелец 24.09). */}
                {!bankEdit && !(bik.length === 9 && bank && corr) && (
                  <button
                    type="button"
                    onClick={() => {
                      setBankManual(true);
                      setBankEdit(true);
                    }}
                    className={LINK_BTN}
                  >
                    Заполнить вручную
                  </button>
                )}
                {bankManual && bankEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      setBankManual(false);
                      applyBik(bik, false);
                    }}
                    className={LINK_BTN}
                  >
                    Подставить по БИК
                  </button>
                )}
              </div>

              {/* Блок появляется только там, где есть что спрашивать: лицензия
                  по лицензируемым сферам, аккредитация и реестр ПО — у ООО в ИТ. */}
              {showLicenseBlock && (
                <>
                  <div className="my-7 h-px bg-line" />
                  <BlockHead
                    id="h-license"
                    icon={CertificateIcon}
                    title="Лицензии и статусы"
                    why={
                      licenseSphere
                        ? 'Если деятельность лицензируется, на сайте должны быть номер лицензии, срок её действия и кто её выдал.'
                        : showMedia
                          ? 'У зарегистрированного СМИ на сайте должны быть номер свидетельства, дата регистрации и кто зарегистрировал.'
                          : 'Если есть, номера записей покажем в «Реквизитах» на сайте: для заказчиков это подтверждение статуса.'
                    }
                    whyOpen={licenseWhy}
                    onWhy={() => setLicenseWhy(!licenseWhy)}
                  />

                  {licenseSphere && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-bold text-ink-2">
                        {/* Сфера — в самом вопросе: строка «Вы указали сферу…» под
                            заголовком снята, и «этот вид деятельности» повис бы. */}
                        Лицензия для сферы «{licenseSphere}» <span className="text-brand">*</span>
                      </p>
                      {/* «Не нужна», а не «Нет» и без КоАП (владелец 25.09): лицензия
                          нужна не всем в сфере, репетитору-ИП, например, нет, а
                          предупреждение о нарушении называло его нарушителем. */}
                      <Segmented
                        options={['Есть', 'Не нужна', 'Оформляем']}
                        value={license}
                        onChange={(v) => {
                          setLicense(v);
                          setLicenseError(null);
                        }}
                        ariaLabelledby="h-license"
                      />
                      {licenseError && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{licenseError}</p>}

                      {license === 'Есть' && (
                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <Field
                            label="Номер лицензии"
                            required
                            placeholder={sphere === 'medicine' ? 'Л041-01137-77/00368259' : 'Л035-01298-77/00123456'}
                            icon={CertificateIcon}
                            value={licenseNo}
                            onChange={(e) => {
                              setLicenseNo(e.target.value);
                              setLicenseNoError(null);
                            }}
                            error={licenseNoError}
                          />
                          <Field
                            label="Срок действия"
                            placeholder="бессрочная или до 01.01.2030"
                            icon={InfoIcon}
                            value={licenseDate}
                            onChange={(e) => setLicenseDate(e.target.value)}
                          />
                          <div className="md:col-span-2">
                            <Field
                              label="Кто выдал"
                              required
                              placeholder={sphere === 'medicine' ? 'Департамент здравоохранения города Москвы' : 'Департамент образования и науки города Москвы'}
                              icon={BuildingIcon}
                              value={licenseOrg}
                              onChange={(e) => {
                                setLicenseOrg(e.target.value);
                                setLicenseOrgError(null);
                              }}
                              error={licenseOrgError}
                            />
                          </div>
                        </div>
                      )}

                      {license === 'Оформляем' && (
                        <p className="mt-3 text-[13px] leading-5 text-ink/60">
                          Соберём документы без сведений о лицензии и добавим их, когда лицензия появится.
                        </p>
                      )}
                    </div>
                  )}

                  {showMedia && (
                    <div className="mt-5">
                      <p id="h-media" className="mb-3 text-sm font-bold text-ink-2">
                        Сайт зарегистрирован как СМИ? <span className="text-brand">*</span>
                      </p>
                      <Segmented
                        options={['Да', 'Нет']}
                        value={media}
                        onChange={(v) => {
                          setMedia(v);
                          setMediaError(null);
                        }}
                        ariaLabelledby="h-media"
                      />
                      {mediaError && <p role="alert" className="mt-2 text-[12px] font-semibold text-danger">{mediaError}</p>}
                      {media === 'Да' && (
                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <Field
                            label="Номер свидетельства"
                            required
                            placeholder="ЭЛ № ФС 77-12345"
                            icon={CertificateIcon}
                            value={mediaNo}
                            onChange={(e) => {
                              setMediaNo(e.target.value);
                              setMediaNoError(null);
                            }}
                            error={mediaNoError}
                          />
                          <Field
                            label="Дата регистрации"
                            placeholder="01.01.2024"
                            icon={InfoIcon}
                            value={mediaDate}
                            onChange={(e) => setMediaDate(e.target.value)}
                          />
                          <div className="md:col-span-2">
                            <Field
                              label="Кто зарегистрировал"
                              required
                              icon={BuildingIcon}
                              value={mediaOrg}
                              onChange={(e) => {
                                setMediaOrg(e.target.value);
                                setMediaOrgError(null);
                              }}
                              error={mediaOrgError}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {showIt && (
                    <div className={licenseSphere ? 'mt-7 border-t border-line pt-7' : 'mt-5'}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p id="h-it-accred" className="mb-3 text-sm font-bold text-ink-2">Аккредитация IT</p>
                          <Segmented options={['Есть', 'Нет']} value={itAccred} onChange={setItAccred} ariaLabelledby="h-it-accred" />
                          {itAccred === 'Есть' && (
                            <Field
                              className="mt-4"
                              label="Номер записи в реестре аккредитованных"
                              required
                              placeholder="№ записи и дата решения"
                              icon={CertificateIcon}
                              value={itAccredNo}
                              onChange={(e) => {
                                setItAccredNo(e.target.value);
                                setItAccredNoError(null);
                              }}
                              error={itAccredNoError}
                            />
                          )}
                        </div>
                        <div>
                          <p id="h-soft-registry" className="mb-3 text-sm font-bold text-ink-2">ПО в реестре российского ПО</p>
                          <Segmented options={['Есть', 'Нет']} value={softRegistry} onChange={setSoftRegistry} ariaLabelledby="h-soft-registry" />
                          {softRegistry === 'Есть' && (
                            <Field
                              className="mt-4"
                              label="Номер записи в реестре ПО"
                              required
                              placeholder="№ 12345 от 01.02.2024"
                              icon={CertificateIcon}
                              value={softRegistryNo}
                              onChange={(e) => {
                                setSoftRegistryNo(e.target.value);
                                setSoftRegistryNoError(null);
                              }}
                              error={softRegistryNoError}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="my-7 h-px bg-line" />

              <BlockHead
                id="h-contacts"
                icon={PhoneIcon}
                title="Контакты для посетителей сайта"
                why="E-mail закон требует показывать на сайте, по телефону с компанией связываются клиенты и партнёры."
                whyOpen={contactsWhy}
                onWhy={() => setContactsWhy(!contactsWhy)}
              />
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="E-mail компании"
                  required
                  placeholder="info@alfa-school.ru"
                  icon={MailIcon}
                  type="email"
                  value={companyMail}
                  onChange={(e) => {
                    setCompanyMail(e.target.value);
                    setCompanyMailError(null);
                  }}
                  onBlur={() => {
                    if (companyMail.trim() && !EMAIL_RE.test(companyMail.trim())) setCompanyMailError('Нужен e-mail вида name@site.ru: его увидят в реквизитах на сайте.');
                  }}
                  error={companyMailError}
                />
                <PhoneField
                  label="Телефон компании"
                  required
                  icon={PhoneIcon}
                  value={companyPhone}
                  onValue={(v) => {
                    setCompanyPhone(v);
                    setCompanyPhoneError(null);
                  }}
                  error={companyPhoneError}
                />
              </div>

              <div className="my-7 h-px bg-line" />

              {/* Не контакт для подвала, а адрес для документов: куда клиент
                  пришлёт отзыв согласия или запрос о своих данных (152-ФЗ ст.9,
                  ст.14). Заполняется осознанно: почту компании сюда не
                  подставляем сами, только по галочке «Та же, что почта
                  компании»; автозаполнение браузера выключено (владелец 23.09,
                  разбор текстов 25.09). Отдельный блок: в «Контактах» он читался как ещё один
                  контакт для посетителей. */}
              <BlockHead
                id="h-pd"
                icon={ShieldCheckIcon}
                title="Запросы о персональных данных"
                why="Этот адрес впишем в политику и согласие. На него клиенты пишут, чтобы отозвать согласие или узнать, что вы о них храните. На запрос о данных нужно ответить в течение 10 рабочих дней, поэтому укажите e-mail, который читаете."
                whyOpen={pdWhy}
                onWhy={() => setPdWhy(!pdWhy)}
              />
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {/* Подпись короткая: что это за почта, говорят заголовок блока и
                    «Зачем» (разбор текстов 25.09). Для экранного диктора — полное
                    имя, оно начинается с видимого «Почта». */}
                <Field
                  className="md:col-span-2"
                  label="E-mail"
                  aria-label="E-mail для запросов о персональных данных"
                  required
                  placeholder="pd@alfa-school.ru"
                  icon={MailIcon}
                  inputMode="email"
                  autoComplete="off"
                  name="pd-requests"
                  value={pdContact}
                  readOnly={pdSame}
                  onChange={(e) => {
                    setPdContact(e.target.value);
                    setPdContactError(null);
                  }}
                  onBlur={() => {
                    if (pdContact.trim() && !EMAIL_RE.test(pdContact.trim())) setPdContactError('Нужен e-mail вида name@site.ru: на него клиенты пришлют отзыв согласия.');
                  }}
                  error={pdContactError}
                />
              </div>
              <button
                type="button"
                role="checkbox"
                aria-checked={pdSame}
                onClick={() => {
                  setPdSame(!pdSame);
                  setPdContact(pdSame ? '' : companyMail);
                  setPdContactError(null);
                }}
                className={`mt-3 inline-flex items-center gap-2.5 rounded-lg py-1 text-[13px] font-semibold text-ink/75 ${RING}`}
              >
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${pdSame ? 'border-brand bg-brand' : 'border-line-2 bg-white'}`}>
                  {pdSame && <CheckIcon size={13} className="text-white" />}
                </span>
                Тот же, что e-mail компании
              </button>
              </>
              )}
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                data-funnel-back
                type="button"
                onClick={() => router.push('/app/start/clients')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                data-funnel-next
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-brand-hover ${RING}`}
              >
                Далее <ArrowRightIcon size={17} />
              </button>
            </div>
    </AnketaFrame>
  );
}
