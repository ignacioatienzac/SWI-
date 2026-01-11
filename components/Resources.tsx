import React from 'react';
import { ResourceItem } from '../types';
import { BookOpen, Video, FileText, ExternalLink } from 'lucide-react';

const Resources: React.FC = () => {
  const resources: ResourceItem[] = [
    {
      id: '1',
      title: 'Guía Completa de Subjuntivo',
      description: 'Un PDF descargable que explica cuándo y cómo usar el modo subjuntivo.',
      category: 'Grammar',
      link: '#'
    },
    {
      id: '2',
      title: '1000 Palabras Más Usadas',
      description: 'Lista de vocabulario esencial para sobrevivir en cualquier país hispanohablante.',
      category: 'Vocabulary',
      link: '#'
    },
    {
      id: '3',
      title: 'Cultura: Día de Muertos',
      description: 'Artículo interactivo sobre las tradiciones mexicanas.',
      category: 'Culture',
      link: '#'
    },
     {
      id: '4',
      title: 'Los Verbos Reflexivos',
      description: 'Video explicativo con ejemplos prácticos de la rutina diaria.',
      category: 'Grammar',
      link: '#'
    }
  ];

  const getIcon = (category: string) => {
    switch (category) {
      case 'Grammar': return <BookOpen className="text-spanish-red" />;
      case 'Vocabulary': return <FileText className="text-spanish-yellow" />;
      case 'Culture': return <Video className="text-deep-blue" />;
      default: return <BookOpen />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-deep-blue mb-4">Biblioteca de Recursos</h2>
        <p className="text-gray-600">Material seleccionado para apoyar tu aprendizaje.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {resources.map((resource) => (
          <div key={resource.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex items-start gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              {getIcon(resource.category)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{resource.category}</span>
                    <h3 className="text-xl font-bold text-gray-800 mt-1 mb-2">{resource.title}</h3>
                </div>
                <a href={resource.link} className="text-gray-400 hover:text-spanish-red transition-colors">
                    <ExternalLink size={20} />
                </a>
              </div>
              <p className="text-gray-600 leading-relaxed text-sm">
                {resource.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Resources;