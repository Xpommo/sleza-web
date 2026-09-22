// Иконки кабинета: пункты меню + служебные. Монохромные, currentColor, без внешних зависимостей.
// Единая геометрия: viewBox 24, stroke 1.7, скруглённые концы — чтобы в меню они читались как один набор.

function Svg({ size = 18, className = '', children, fill = 'none' }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true" className={`shrink-0 ${className}`}
    >
      {children}
    </svg>
  );
}

export const ProjectsIcon = (p) => (
  <Svg {...p}><rect x="3" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" /></Svg>
);

export const DocsIcon = (p) => (
  <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></Svg>
);

export const MonitorIcon = (p) => (
  <Svg {...p}><path d="M3 12h4l2.5-6 3 12 2.5-6h6" /></Svg>
);

export const BillingIcon = (p) => (
  <Svg {...p}><rect x="2.5" y="5" width="19" height="14" rx="2.4" /><path d="M2.5 10h19" /><path d="M6.5 14.5h4" /></Svg>
);

export const SettingsIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.6M12 18.9v2.6M4.2 4.2l1.9 1.9M17.9 17.9l1.9 1.9M2.5 12h2.6M18.9 12h2.6M4.2 19.8l1.9-1.9M17.9 6.1l1.9-1.9" /></Svg>
);

// Статусные иконки: цвет никогда не единственный сигнал — рядом всегда иконка и слово.
export const ViolationIcon = (p) => (
  <Svg {...p} fill="currentColor"><path d="M12 2.6a9.4 9.4 0 1 0 0 18.8 9.4 9.4 0 0 0 0-18.8zm0 4.1c.68 0 1.2.58 1.15 1.26l-.3 4.72a.86.86 0 0 1-1.7 0l-.3-4.72A1.15 1.15 0 0 1 12 6.7zm0 8.6a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z" /></Svg>
);

export const WarnIcon = (p) => (
  <Svg {...p}><path d="M12 3.6 21 19.4H3z" /><path d="M12 9.4v4.2M12 16.6h.01" /></Svg>
);

export const OkIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12.4l2.6 2.6L16 9.6" /></Svg>
);

export const ClockIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Svg>
);

export const TeamIcon = (p) => (
  <Svg {...p}><circle cx="9" cy="8" r="3.4" /><path d="M3 20c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4" /><path d="M16 5.4a3.4 3.4 0 0 1 0 6.6M17.5 19.4c0-2 -.7-3.7-1.9-4.9 2.9.2 5.4 2.3 5.4 5.5" /></Svg>
);

export const SearchIcon = (p) => (
  <Svg {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.4 15.4 21 21" /></Svg>
);

export const PlusIcon = (p) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const GridIcon = (p) => (
  <Svg {...p}><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></Svg>
);

export const ListIcon = (p) => (
  <Svg {...p}><path d="M4 6.5h16M4 12h16M4 17.5h16" /></Svg>
);

export const BurgerIcon = (p) => (
  <Svg {...p}><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" /></Svg>
);

export const CloseIcon = (p) => (
  <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);

export const LogoutIcon = (p) => (
  <Svg {...p}><path d="M15 4.5h2.5A2 2 0 0 1 19.5 6.5v11a2 2 0 0 1-2 2H15" /><path d="M10.5 8 6.5 12l4 4M6.5 12h9" /></Svg>
);

export const RefreshIcon = (p) => (
  <Svg {...p}><path d="M20 12a8 8 0 1 1-2.6-5.9" /><path d="M20.5 4v4.5H16" /></Svg>
);

export const ChevronIcon = (p) => (
  <Svg {...p}><path d="M8.5 5l7 7-7 7" /></Svg>
);

export const ChevronDownIcon = (p) => (
  <Svg {...p}><path d="M5 8.5l7 7 7-7" /></Svg>
);

export const ArrowLeftIcon = (p) => (
  <Svg {...p}><path d="M19 12H5M11 6l-6 6 6 6" /></Svg>
);

export const ArrowRightIcon = (p) => (
  <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);

export const CheckIcon = (p) => (
  <Svg {...p}><path d="M5 12.5l4.5 4.5L19 7" /></Svg>
);

export const ShieldCheckIcon = (p) => (
  <Svg {...p}><path d="M12 3.4 5 6v6.2c0 4.3 3 7.6 7 8.8 4-1.2 7-4.5 7-8.8V6z" /><path d="M9 12l2.2 2.2L15.5 9.5" /></Svg>
);

export const UserIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="8.2" r="3.4" /><path d="M4.8 20c0-3.5 3-6 7.2-6s7.2 2.5 7.2 6" /></Svg>
);

export const PhoneIcon = (p) => (
  <Svg {...p}><path d="M6 3.5h2.6l1.4 4.3-2 1.6a11.4 11.4 0 0 0 5.6 5.6l1.6-2 4.3 1.4V17c0 1.4-1.2 2.5-2.6 2.3C9.8 18.4 5.6 14.2 4.7 7.1 4.5 5.7 4.6 4.5 6 3.5z" /></Svg>
);

export const MailIcon = (p) => (
  <Svg {...p}><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></Svg>
);

export const BuildingIcon = (p) => (
  <Svg {...p}>
    <path d="M4 20.5V5.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v15" />
    <path d="M15 9.5h3.5a2 2 0 0 1 2 2v9" />
    <path d="M2.5 20.5h19M7.5 7.5h4M7.5 11.5h4M7.5 15.5h4" />
  </Svg>
);

export const BankIcon = (p) => (
  <Svg {...p}>
    <path d="M3 9.5 12 4l9 5.5" />
    <path d="M5 10.5v7M9.5 10.5v7M14.5 10.5v7M19 10.5v7" />
    <path d="M3 20.5h18" />
  </Svg>
);

export const CertificateIcon = (p) => (
  <Svg {...p}>
    <rect x="3.5" y="4" width="17" height="12" rx="2" />
    <path d="M7 8h7M7 11.5h4.5" />
    <path d="m9 16 1.2 4 1.9-1.4L14 20l1.2-4" />
  </Svg>
);

export const InfoIcon = (p) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.8h.01" /></Svg>
);

export const GlobeIcon = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.6 2.3 4 5.3 4 8.5s-1.4 6.2-4 8.5c-2.6-2.3-4-5.3-4-8.5s1.4-6.2 4-8.5Z" />
  </Svg>
);

export const BriefcaseIcon = (p) => (
  <Svg {...p}>
    <rect x="3" y="7.5" width="18" height="12" rx="2" />
    <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
    <path d="M3 12.5h18" />
  </Svg>
);

export const LinkIcon = (p) => (
  <Svg {...p}><path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.6 1.6" /><path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.6-1.6" /></Svg>
);

export const CopyIcon = (p) => (
  <Svg {...p}><rect x="8.5" y="8.5" width="12" height="12" rx="2.2" /><path d="M5.5 15.5A2 2 0 0 1 3.5 13.5v-8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2" /></Svg>
);

export const SupportIcon = (p) => (
  <Svg {...p}><path d="M20 12a8 8 0 1 0-3.2 6.4L21 20l-1.2-3.6A7.9 7.9 0 0 0 20 12Z" /><path d="M9.6 9.5a2.5 2.5 0 0 1 4.6 1.3c0 1.7-2.2 2-2.2 3.2" /><path d="M12 17h.01" /></Svg>
);
