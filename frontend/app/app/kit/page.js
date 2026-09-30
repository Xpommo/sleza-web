import KitClient from './KitClient';

// Каталог компонентов кабинета — живые образцы из тех же файлов, что и экраны
// (дизайн-система, 30.09). Для владельца и Ивана: видно систему, а не только
// экраны. В продукте его нет — открывается из панели «Макет».
export const metadata = {
  title: 'Компоненты кабинета — Слеза Белый Сайт',
  robots: { index: false, follow: false },
};

export default function KitPage() {
  return <KitClient />;
}
