import { ref, computed } from 'vue';
import type { ComponentPublicInstance } from 'vue';

/** A single help topic: short intro, optional step-by-step, optional note. */
export interface DocSection {
  id: string;
  icon: string;
  title: string;
  intro?: string;
  steps?: string[];
  note?: string;
}

export type DocAudience = 'passenger' | 'driver';

// ── Пассажирам ──────────────────────────────────────────────────────────────
const passengerSections: DocSection[] = [
  {
    id: 'p-search',
    icon: 'search',
    title: 'Как найти рейс',
    intro:
      'На вкладке «Главная» выберите города, дату и число пассажиров, затем нажмите «Найти».',
    steps: [
      'Откуда и куда — Бишкек, Алматы или Иссык-Куль.',
      'Дата поездки и количество мест.',
      'Нажмите «Найти» — откроется список подходящих рейсов.',
    ],
    note: 'Вкладка «Транспорт» показывает свободные авто без привязки к дате.',
  },
  {
    id: 'p-book',
    icon: 'event_seat',
    title: 'Как забронировать место',
    intro: 'Выберите рейс в результатах поиска и заполните короткую форму брони.',
    steps: [
      'Нажмите на рейс, чтобы открыть детали и бронирование.',
      'Укажите имя и телефон, при необходимости добавьте адреса подачи и высадки.',
      'Отправьте бронь. Для этого нужен вход по номеру телефона.',
    ],
  },
  {
    id: 'p-confirm',
    icon: 'chat',
    title: 'Подтверждение по WhatsApp',
    intro:
      'Новая бронь создаётся со статусом «Новая». Оператор подтверждает её и связывается с вами по WhatsApp, чтобы уточнить детали.',
    note: 'Текущий статус брони всегда виден во вкладке «Кабинет».',
  },
  {
    id: 'p-pay',
    icon: 'payments',
    title: 'Оплата',
    intro:
      'Обычно оплата — наличными водителю в поездке. Оператор может указать предоплату или скидку.',
    note: 'Статусы оплаты: «Не оплачено», «Частично», «Оплачено».',
  },
  {
    id: 'p-cabinet',
    icon: 'account_circle',
    title: 'Мои поездки',
    intro:
      'Вкладка «Кабинет» → «Предстоящие» и «История». Здесь видно все ваши брони и их статусы.',
  },
  {
    id: 'p-request',
    icon: 'add_road',
    title: 'Нет подходящего рейса',
    intro:
      'Оставьте заявку — укажите город, дату, число мест, тип авто и пожелания. Оператор подберёт вариант и свяжется с вами.',
  },
  {
    id: 'p-extras',
    icon: 'luggage',
    title: 'Остановки и доп. услуги',
    intro:
      'К брони можно добавить дополнительные точки подачи или высадки и услуги — багаж, детское кресло, перевозку питомца.',
    note: 'Итоговую цену остановок и услуг подтверждает оператор.',
  },
  {
    id: 'p-account',
    icon: 'lock',
    title: 'Аккаунт и вход',
    intro:
      'Вход по телефону и паролю или через Telegram. В профиле можно изменить имя, телефон и пароль.',
  },
];

// ── Водителям ───────────────────────────────────────────────────────────────
const driverSections: DocSection[] = [
  {
    id: 'd-login',
    icon: 'badge',
    title: 'Вход для водителей',
    intro:
      'Аккаунт водителя заводит оператор. Самостоятельной регистрации нет.',
    steps: [
      'На экране входа переключитесь на режим «Водитель».',
      'Введите телефон и пароль, выданные оператором.',
      'Если номер не привязан к водителю — вход будет запрещён, обратитесь к оператору.',
    ],
  },
  {
    id: 'd-trips',
    icon: 'directions_car',
    title: 'Мои рейсы',
    intro:
      'Во вкладке «Кабинет» — список рейсов, назначенных на ваше авто: маршрут, время, загрузка мест и статус.',
    note: 'Вкладки «Предстоящие» и «История» разделяют активные и завершённые рейсы.',
  },
  {
    id: 'd-manifest',
    icon: 'groups',
    title: 'Пассажиры рейса',
    intro:
      'Откройте рейс, чтобы увидеть список пассажиров: имя, количество мест, комментарий и адреса подачи.',
    note: 'Кнопки «Позвонить» и WhatsApp связывают вас с пассажиром напрямую.',
  },
  {
    id: 'd-status',
    icon: 'flag',
    title: 'Статус рейса',
    intro: 'Меняйте статус рейса по мере поездки.',
    steps: [
      '«Выехал» — доступно после времени отправления, авто переходит в статус «В пути».',
      '«Завершить рейс» — авто снова «Свободно», поездки уходят в историю.',
    ],
    note: 'Отменить рейс может только оператор.',
  },
  {
    id: 'd-board',
    icon: 'check_circle',
    title: 'Отметка посадки',
    intro:
      'По каждой остановке ставьте галочку, что пассажир сел или высажен — удобно вести учёт в пути.',
  },
  {
    id: 'd-pay',
    icon: 'payments',
    title: 'Оплата',
    intro:
      'Если берёте наличные, отметьте «Оплачено» по конкретному пассажиру или сразу по всему рейсу.',
    note: 'Суммы задаёт оператор — водитель меняет только статус оплаты.',
  },
];

export function useDocsModel() {
  const audience = ref<DocAudience>('passenger');
  const sections = computed(() =>
    audience.value === 'passenger' ? passengerSections : driverSections,
  );

  function setAudience(a: DocAudience): void {
    audience.value = a;
  }

  // IonContent owns its own (shadow-DOM) scroll host, so a plain
  // `scrollIntoView` is unreliable here — drive the content element's
  // `scrollToPoint` with an offset computed against its scroll element.
  const contentRef = ref<ComponentPublicInstance | null>(null);

  async function scrollTo(id: string): Promise<void> {
    const contentEl = contentRef.value?.$el as HTMLIonContentElement | undefined;
    const target = document.getElementById(id);
    if (!contentEl || !target) return;
    const scrollEl = await contentEl.getScrollElement();
    const top =
      target.getBoundingClientRect().top -
      scrollEl.getBoundingClientRect().top +
      scrollEl.scrollTop -
      8;
    void contentEl.scrollToPoint(0, top, 300);
  }

  return {
    audience,
    sections,
    setAudience,
    contentRef,
    scrollTo,
  };
}
