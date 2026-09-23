'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BankIcon,
  BuildingIcon,
  CertificateIcon,
  InfoIcon,
  MailIcon,
  PhoneIcon,
  UserIcon,
} from '../../../../components/app/AppIcons';
import { CURRENT_USER } from '../../../../lib/appMock';
import { RING, AnketaFrame, Field, PhoneField, Segmented, BlockHead, SectionHead } from '../_shared/AnketaChrome';
import { loadAnketa, markStepDone, saveAnketa } from '../_shared/anketaState';
import { digitsOnly, ownerLabels, validateRequisites } from '../_shared/requisitesRules';
import { EMAIL_RE, formatPhone } from '../../../../lib/validate';

const OWNERS = ['ООО', 'ИП', 'Самозанятый'];

// Лицензия требуется не по всякой сфере. Медицина и образование —
// лицензируемые виды деятельности, СМИ — не лицензия, а регистрация, ИТ —
// вообще не лицензия, а аккредитация и реестр ПО (спрашиваем отдельно).
const LICENSE_SPHERES = {
  medicine: 'Медицина, клиники',
  school: 'Онлайн-школа, курсы, репетиторство',
  kids: 'Детский центр, кружки, секции',
  media: 'СМИ, онлайн-издание',
};

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
  const [ownerWhy, setOwnerWhy] = useState(false);

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

  const [account, setAccount] = useState('');
  const [accountError, setAccountError] = useState(null);
  const [bank, setBank] = useState('');
  const [bankError, setBankError] = useState(null);
  const [bik, setBik] = useState('');
  const [bikError, setBikError] = useState(null);
  const [corr, setCorr] = useState('');
  const [corrError, setCorrError] = useState(null);
  const [bankWhy, setBankWhy] = useState(false);

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

  const [companyMail, setCompanyMail] = useState('');
  const [companyMailError, setCompanyMailError] = useState(null);
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyPhoneError, setCompanyPhoneError] = useState(null);
  const [postAddress, setPostAddress] = useState('');
  const [pdContact, setPdContact] = useState('');
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
      setLicense(a.license.has ?? null);
      setLicenseNo(a.license.no || '');
      setLicenseDate(a.license.date || '');
      setLicenseOrg(a.license.org || '');
    }
    setItAccred(a.itAccred ?? null);
    setSoftRegistry(a.softRegistry ?? null);
    if (a.contacts) {
      setCompanyMail(a.contacts.companyMail || '');
      setCompanyPhone(formatPhone(a.contacts.companyPhone || ''));
      setPostAddress(a.contacts.postAddress || '');
      setPdContact(a.contacts.pdContact || '');
    }
  }, []);

  function answers() {
    return {
      owner, inn, companyName: name, ogrn, kpp, address,
      bank: { account, bank, bik, corr },
      license: licenseSphere ? { has: license, no: licenseNo, date: licenseDate, org: licenseOrg } : null,
      itAccred, softRegistry,
      contacts: { companyMail, companyPhone, postAddress, pdContact },
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
      license, licenseNo, licenseDate, licenseOrg, itAccred, softRegistry,
      companyMail, companyPhone, postAddress, pdContact]);
  const [pdContactError, setPdContactError] = useState(null);
  const [contactsWhy, setContactsWhy] = useState(false);

  const isOoo = owner === 'ООО';
  const innLength = isOoo ? 10 : 12;
  const licenseSphere = LICENSE_SPHERES[sphere];
  const showIt = isOoo && sphere === 'it';
  const showLicenseBlock = Boolean(licenseSphere) || showIt;

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
  function onInnChange(e) {
    const value = digitsOnly(e.target.value).slice(0, 12);
    setInn(value);
    setInnError(null);
    if (!owner || value.length !== innLength) {
      setInnFound(false);
      return;
    }
    const found = INN_LOOKUP[owner] || {};
    setInnFound(true);
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
  }

  function pickOwner(item) {
    setOwner(item);
    setOwnerError(null);
    setInnFound(false);
    setInnError(null);
    clearRegistryErrors();
  }

  function handleNext() {
    let ok = true;
    const fail = (setter, message) => {
      setter(message);
      ok = false;
    };

    if (!owner) fail(setOwnerError, 'Выберите, кто владеет сайтом — от этого зависит, какие реквизиты спрашивать.');

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

    if (licenseSphere) {
      if (!license) fail(setLicenseError, 'Ответьте про лицензию — без ответа мы не знаем, указывать ли её в документах.');
      else setLicenseError(null);
      if (license === 'Да') {
        if (!licenseNo.trim()) fail(setLicenseNoError, 'Укажите номер лицензии — он публикуется вместе с реквизитами.');
        else setLicenseNoError(null);
        if (!licenseOrg.trim()) fail(setLicenseOrgError, 'Укажите орган, выдавший лицензию — этого требует ЗоЗПП ст.9 ч.2.');
        else setLicenseOrgError(null);
      }
    }

    put(setCompanyMailError, 'companyMail');
    put(setCompanyPhoneError, 'companyPhone');
    if (!pdContact.trim()) {
      fail(setPdContactError, 'Нужна почта или телефон — по этому контакту к вам будут обращаться по вопросам персональных данных.');
    } else setPdContactError(null);

    if (!ok) return;

    saveAnketa(answers());
    markStepDone(4);
    router.push('/app/start/documents');
  }

  return (
    <AnketaFrame current={3} title="Реквизиты" lead={<>Данные компании — встанут в документы и в «Реквизиты» в подвале сайта.</>}>

            <section className="rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-7">
              <SectionHead
                id="h-owner"
                title="Кто владеет сайтом"
                required
                whyOpen={ownerWhy}
                onWhy={() => setOwnerWhy(!ownerWhy)}
                why="От этого зависит, какие регистрационные данные спросим дальше — у ООО, ИП и самозанятого они разные."
              />
              <div className="mt-5">
                <Segmented options={OWNERS} value={owner} onChange={pickOwner} ariaLabelledby="h-owner" />
              </div>
              {ownerError && <p className="mt-2 text-[12px] font-semibold text-danger">{ownerError}</p>}

              <div className="my-7 h-px bg-line" />

              <BlockHead
                id="h-registry"
                icon={BuildingIcon}
                title="Данные из реестра"
                why="149-ФЗ ст.10 ч.2 обязывает владельца сайта держать в открытом доступе наименование, место нахождения и адрес. Виджет откроет их по ссылке в подвале — их увидит любой посетитель. КПП закон публиковать не требует: он нужен, чтобы бухгалтер контрагента выставил счёт."
                whyOpen={registryWhy}
                onWhy={() => setRegistryWhy(!registryWhy)}
              />
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="ИНН"
                  required
                  placeholder={owner ? `${innLength} цифр` : 'Сначала выберите форму владения'}
                  icon={BankIcon}
                  badge="Автозаполнение по ИНН"
                  inputMode="numeric"
                  value={inn}
                  onChange={onInnChange}
                  error={innError}
                />
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
              </div>
              {innFound && <p className="mt-3 text-[13px] font-semibold text-ok">✓ Нашли по ИНН — проверьте, что всё верно</p>}

              <div className="my-7 h-px bg-line" />

              {/* Банк — такой же блок, как соседние: серая подложка выделяла его
                  как особенный, хотя он не важнее реестра и контактов. */}
              <div>
                <BlockHead
                  id="h-bank"
                  icon={BankIcon}
                  title="Банковские реквизиты"
                  why="Закон публиковать банковские реквизиты не требует, но в «Реквизитах» в подвале они нужны вашим контрагентам: бухгалтер выставит счёт и составит договор, ничего не запрашивая дополнительно."
                  whyOpen={bankWhy}
                  onWhy={() => setBankWhy(!bankWhy)}
                />
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <Field
                    label="Расчётный счёт"
                    required
                    /* У самозанятого счёт обычно личный (40817…), а не расчётный. */
                    placeholder={owner === 'Самозанятый' ? '40817810...' : '40702810...'}
                    icon={BankIcon}
                    inputMode="numeric"
                    value={account}
                    onChange={(e) => {
                      setAccount(digitsOnly(e.target.value).slice(0, 20));
                      setAccountError(null);
                    }}
                    error={accountError}
                  />
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
                    label="БИК"
                    required
                    placeholder="9 цифр"
                    icon={InfoIcon}
                    inputMode="numeric"
                    value={bik}
                    onChange={(e) => {
                      setBik(digitsOnly(e.target.value).slice(0, 9));
                      setBikError(null);
                    }}
                    error={bikError}
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
                </div>
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
                    why={licenseSphere ? "Если деятельность лицензируемая, ЗоЗПП ст.9 ч.2 требует показать посетителю номер лицензии, срок её действия и орган, который её выдал. Выведем эти сведения в подвал сайта рядом с остальными реквизитами. Сам скан лицензии не просим — закон в общем случае его не требует." : null}
                    whyOpen={licenseWhy}
                    onWhy={() => setLicenseWhy(!licenseWhy)}
                  />

                  {licenseSphere && (
                    <div className="mt-5">
                      <p className="mb-3 text-sm font-bold text-ink-2">
                        {/* Сфера — в самом вопросе: строка «Вы указали сферу…» под
                            заголовком снята, и «этот вид деятельности» повис бы. */}
                        Есть лицензия для сферы «{licenseSphere}»? <span className="text-brand">*</span>
                      </p>
                      <Segmented
                        options={['Да', 'Нет', 'В процессе']}
                        value={license}
                        onChange={(v) => {
                          setLicense(v);
                          setLicenseError(null);
                        }}
                        ariaLabelledby="h-license"
                      />
                      {licenseError && <p className="mt-2 text-[12px] font-semibold text-danger">{licenseError}</p>}

                      {license === 'Да' && (
                        <div className="mt-5 grid gap-5 md:grid-cols-2">
                          <Field
                            label="Номер лицензии"
                            required
                            placeholder="ЛО-77-01-000000"
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
                              placeholder="Департамент здравоохранения города Москвы"
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

                      {license === 'Нет' && (
                        <p className="mt-3 rounded-xl bg-warn/10 px-4 py-3 text-[13px] leading-5 text-ink/70">
                          Деятельность без лицензии там, где она требуется, — самостоятельное нарушение (КоАП ст.14.1).
                          Документы соберём, но сведений о лицензии в них не будет.
                        </p>
                      )}
                    </div>
                  )}

                  {showIt && (
                    <div className={licenseSphere ? 'mt-7 border-t border-line pt-7' : 'mt-5'}>
                      <div className="grid gap-5 md:grid-cols-2">
                        <div>
                          <p className="mb-3 text-sm font-bold text-ink-2">Аккредитация IT</p>
                          <Segmented options={['Есть', 'Нет']} value={itAccred} onChange={setItAccred} />
                        </div>
                        <div>
                          <p className="mb-3 text-sm font-bold text-ink-2">ПО в реестре российского ПО</p>
                          <Segmented options={['Есть', 'Нет']} value={softRegistry} onChange={setSoftRegistry} />
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
                title="Контакты компании"
                why="Это контакты компании, а не ваши личные. Адрес электронной почты требует публиковать 149-ФЗ ст.10 ч.2, телефон — нет, он для счёта и договора. Контакт по вопросам персональных данных спрашиваем отдельно: его публикация требуется по 152-ФЗ, а на бухгалтерской почте такие обращения обычно теряются."
                whyOpen={contactsWhy}
                onWhy={() => setContactsWhy(!contactsWhy)}
              />
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <Field
                  label="Email компании"
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
                    if (companyMail.trim() && !EMAIL_RE.test(companyMail.trim())) setCompanyMailError('Нужна почта вида name@site.ru — её увидят в реквизитах на сайте.');
                  }}
                  error={companyMailError}
                />
                <PhoneField
                  required
                  icon={PhoneIcon}
                  value={companyPhone}
                  onValue={(v) => {
                    setCompanyPhone(v);
                    setCompanyPhoneError(null);
                  }}
                  error={companyPhoneError}
                />
                {/* Только у ООО: у ИП и самозанятого основной адрес и так
                    почтовый — второе такое же поле было бы дублем (макет, 9.09). */}
                {(!owner || owner === 'ООО') && (
                  <Field
                    label="Адрес для переписки"
                    placeholder="Если отличается от юридического"
                    icon={BuildingIcon}
                    value={postAddress}
                    onChange={(e) => setPostAddress(e.target.value)}
                  />
                )}
                {/* Отдельно от бухгалтерской почты намеренно: на общий ящик
                    такие обращения обычно не доходят до того, кто отвечает. */}
                <Field
                  label="Куда писать по вопросам персональных данных"
                  required
                  placeholder="Почта или телефон, куда придёт обращение"
                  icon={InfoIcon}
                  value={pdContact}
                  onChange={(e) => {
                    setPdContact(e.target.value);
                    setPdContactError(null);
                  }}
                  error={pdContactError}
                />
              </div>
            </section>

            {/* На телефоне эту пару повторяет нижняя панель — докрутив до конца,
                человек видел одни и те же кнопки дважды (правка владельца). */}
            <div className="mt-7 hidden gap-3 border-t border-line pt-5 lg:flex">
              <button
                type="button"
                onClick={() => router.push('/app/start/clients')}
                className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border border-line bg-white px-6 text-sm font-bold shadow-sm transition hover:border-line-2 ${RING}`}
              >
                <ArrowLeftIcon size={17} /> Назад
              </button>
              <button
                data-funnel-next
                data-funnel-back
                type="button"
                onClick={handleNext}
                className={`flex h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-6 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#1a1acc] ${RING}`}
              >
                Далее <ArrowRightIcon size={17} />
              </button>
            </div>
    </AnketaFrame>
  );
}
