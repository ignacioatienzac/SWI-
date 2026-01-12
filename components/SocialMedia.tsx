import React from 'react';
import { Instagram, Youtube, Facebook, AtSign, ExternalLink } from 'lucide-react';

const SocialMedia: React.FC = () => {
  const socials = [
    {
      name: 'Instagram',
      icon: <Instagram size={32} />,
      link: 'https://www.instagram.com/spanishwithignacio/',
      color: 'group-hover:text-pink-600',
      bgColor: 'hover:bg-pink-50',
      description: 'Tips diarios y stories'
    },
    {
      name: 'YouTube',
      icon: <Youtube size={32} />,
      link: 'https://www.youtube.com/@SpanishwithIgnacio',
      color: 'group-hover:text-red-600',
      bgColor: 'hover:bg-red-50',
      description: 'Clases completas y tutoriales'
    },
    {
      name: 'Facebook',
      icon: <Facebook size={32} />,
      link: 'https://www.facebook.com/profile.php?id=61560429119394',
      color: 'group-hover:text-blue-600',
      bgColor: 'hover:bg-blue-50',
      description: 'Comunidad y eventos'
    },
    {
      name: 'Threads',
      icon: <AtSign size={32} />, 
      link: 'https://www.threads.net/@spanishwithignacio',
      color: 'group-hover:text-black',
      bgColor: 'hover:bg-gray-50',
      description: 'Pensamientos rápidos'
    }
  ];

  return (
    <section className="py-20 bg-cream border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="mb-12">
          <span className="inline-block px-4 py-1.5 bg-spanish-yellow/20 text-deep-blue font-bold text-xs uppercase tracking-widest rounded-full mb-4">
            Comunidad
          </span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-deep-blue">
            Sígueme en Redes
          </h2>
          <p className="text-gray-600 mt-4 max-w-2xl mx-auto text-lg">
            Únete a nuestra comunidad en línea. Comparte tu progreso, haz preguntas y no te pierdas ningún consejo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.link}
              target="_blank"
              rel="noopener noreferrer"
              className={`group bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 transition-all duration-300 transform hover:-translate-y-1 flex flex-col items-center justify-center gap-4 ${social.bgColor}`}
            >
              <div className={`text-gray-400 transition-colors duration-300 ${social.color} bg-gray-50 p-4 rounded-full group-hover:bg-white shadow-inner`}>
                {social.icon}
              </div>
              <div>
                <h3 className={`font-bold text-gray-900 text-xl mb-1 transition-colors ${social.color}`}>{social.name}</h3>
                <p className="text-sm text-gray-500">{social.description}</p>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4">
                <ExternalLink size={16} className="text-gray-400" />
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SocialMedia;