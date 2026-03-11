import React from 'react';
import { Instagram, Youtube, Facebook, AtSign } from 'lucide-react';
import { useI18n } from '../services/i18n';

const SocialMedia: React.FC = () => {
  const { t } = useI18n();
  const socials = [
    {
      name: 'Instagram',
      icon: <Instagram size={18} />,
      link: 'https://www.instagram.com/spanishwithignacio/',
      hoverBg: '#fce7f3',
      hoverText: '#db2777',
    },
    {
      name: 'YouTube',
      icon: <Youtube size={18} />,
      link: 'https://www.youtube.com/@SpanishwithIgnacio',
      hoverBg: '#fee2e2',
      hoverText: '#dc2626',
    },
    {
      name: 'Facebook',
      icon: <Facebook size={18} />,
      link: 'https://www.facebook.com/profile.php?id=61560429119394',
      hoverBg: '#dbeafe',
      hoverText: '#2563eb',
    },
    {
      name: 'Threads',
      icon: <AtSign size={18} />,
      link: 'https://www.threads.net/@spanishwithignacio',
      hoverBg: '#f3f4f6',
      hoverText: '#111827',
    }
  ];

  return (
    <section style={{ backgroundColor: '#f8fafc' }} className="py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-xl md:text-2xl font-extrabold text-deep-blue mb-6">
          {t('social.title')}
        </h2>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 bg-white text-gray-600 font-semibold text-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              style={{ ['--hover-bg' as string]: social.hoverBg, ['--hover-text' as string]: social.hoverText }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = social.hoverBg;
                (e.currentTarget as HTMLElement).style.color = social.hoverText;
                (e.currentTarget as HTMLElement).style.borderColor = social.hoverText + '40';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = '#fff';
                (e.currentTarget as HTMLElement).style.color = '#4b5563';
                (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
              }}
            >
              {social.icon}
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialMedia;