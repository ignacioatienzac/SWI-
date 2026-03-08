import React from 'react';
import { Instagram, Youtube, Facebook, AtSign, ExternalLink } from 'lucide-react';

const SocialMedia: React.FC = () => {
  const socials = [
    {
      name: 'Instagram',
      icon: <Instagram size={22} />,
      link: 'https://www.instagram.com/spanishwithignacio/',
      color: 'group-hover:text-pink-600',
      bgColor: 'hover:bg-pink-50',
      description: 'Tips diarios y stories'
    },
    {
      name: 'YouTube',
      icon: <Youtube size={22} />,
      link: 'https://www.youtube.com/@SpanishwithIgnacio',
      color: 'group-hover:text-red-600',
      bgColor: 'hover:bg-red-50',
      description: 'Clases completas y tutoriales'
    },
    {
      name: 'Facebook',
      icon: <Facebook size={22} />,
      link: 'https://www.facebook.com/profile.php?id=61560429119394',
      color: 'group-hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
      description: 'Comunidad y eventos'
    },
    {
      name: 'Threads',
      icon: <AtSign size={22} />, 
      link: 'https://www.threads.net/@spanishwithignacio',
      color: 'group-hover:text-black',
      bgColor: 'hover:bg-gray-50',
      description: 'Pensamientos rápidos'
    }
  ];

  return (
    <section className="pt-0 pb-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-deep-blue">
            Sígueme en Redes
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group relative bg-white px-3 py-4 sm:px-4 sm:py-5 rounded-xl shadow-sm hover:shadow-lg border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center gap-2 ${social.bgColor}`}
            >
              <div className={`text-gray-400 transition-colors duration-300 ${social.color} bg-gray-50 p-2.5 rounded-full group-hover:bg-white shadow-inner`}>
                {social.icon}
              </div>
              <div>
                <h3 className={`font-bold text-gray-900 text-sm sm:text-base mb-0.5 transition-colors ${social.color}`}>{social.name}</h3>
                <p className="text-xs text-gray-500 hidden sm:block">{social.description}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2">
                <ExternalLink size={12} className="text-gray-400" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialMedia;