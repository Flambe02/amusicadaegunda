import React from 'react';
import { Heart, Music, Calendar, Users, Star, Award, Instagram, Video, Youtube } from 'lucide-react';

export default function Sobre() {
  return (
    <div className="p-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg mb-2">
          Sobre o Projeto
        </h1>
        <p className="text-white/80 font-medium text-lg md:text-xl drop-shadow-md">
          Conheça a história por trás da Música da Segunda
        </p>
      </div>

      {/* Logo Section */}
      <div className="bg-white/80 rounded-3xl p-8 text-center mb-8">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full overflow-hidden shadow-2xl">
          <img 
            src="/images/Musica da segunda.jpg" 
            alt="Logo Música da Segunda" 
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-3xl font-black text-gray-800 mb-2">Música da Segunda</h2>
        <p className="text-gray-700 text-lg">
          Descubra música nova toda segunda-feira
        </p>
      </div>

      {/* Mission Section */}
      <div className="bg-white/80 rounded-3xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-400" />
          Nossa Missão
        </h3>
        <p className="text-gray-700 leading-relaxed">
          A Música da Segunda nasceu da paixão por descobrir e compartilhar música. 
          Toda segunda-feira, apresentamos uma nova música incrível para começar sua semana 
          com energia e inspiração. Queremos conectar pessoas através da música e criar 
          uma comunidade apaixonada por descobertas musicais.
        </p>
      </div>

      {/* How It Works */}
      <div className="bg-white/80 rounded-3xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Music className="w-6 h-6 text-blue-400" />
          Como Funciona
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/60 rounded-2xl">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Toda Segunda</h4>
            <p className="text-gray-700 text-sm">
              Uma nova música é selecionada e publicada
            </p>
          </div>
          <div className="text-center p-4 bg-white/60 rounded-2xl">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Vídeo TikTok</h4>
            <p className="text-gray-700 text-sm">
              A música é apresentada em vídeo
            </p>
          </div>
          <div className="text-center p-4 bg-white/60 rounded-2xl">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-white" />
            </div>
            <h4 className="font-bold text-gray-800 mb-2">Compartilhamento</h4>
            <p className="text-gray-700 text-sm">
              A comunidade descobre e compartilha
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white/80 rounded-3xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Star className="w-6 h-6 text-yellow-400" />
          O Que Oferecemos
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span className="text-gray-700">Música nova toda segunda-feira</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span className="text-gray-700">Vídeos TikTok integrados</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <span className="text-gray-700">Letras das músicas</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
            <span className="text-gray-700">Links para plataformas de streaming</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
            <span className="text-gray-700">Calendário musical interativo</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
            <span className="text-gray-700">Interface responsiva e moderna</span>
          </div>
        </div>
      </div>

      {/* Technology */}
      <div className="bg-white/80 rounded-3xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Award className="w-6 h-6 text-green-400" />
          Tecnologia
        </h3>
        <p className="text-gray-700 leading-relaxed mb-4">
          Este projeto foi desenvolvido com as mais modernas tecnologias web para garantir 
          uma experiência excepcional em todos os dispositivos.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-2xl p-4">
            <h4 className="font-bold text-white mb-2">Frontend</h4>
            <div className="space-y-1 text-sm text-white/80">
              <div>• React 18 + Vite</div>
              <div>• Tailwind CSS</div>
              <div>• Radix UI Components</div>
              <div>• Responsive Design</div>
            </div>
          </div>
          <div className="bg-white/10 rounded-2xl p-4">
            <h4 className="font-bold text-white mb-2">Funcionalidades</h4>
            <div className="space-y-1 text-sm text-white/80">
              <div>• TikTok Integration</div>
              <div>• Music Calendar</div>
              <div>• Lyrics Display</div>
              <div>• Social Sharing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div className="bg-white/20 rounded-3xl p-6 mb-6">
        <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Instagram className="w-6 h-6 text-pink-400" />
          Redes Sociais
        </h3>
        <p className="text-white/90 mb-4">
          Siga-nos nas redes sociais para ficar por dentro de todas as novidades!
        </p>
        <div className="flex justify-center gap-4">
          <a href="https://www.tiktok.com/@amusicadasegunda" target="_blank" rel="noopener noreferrer" className="bg-black text-white p-3 rounded-full hover:bg-gray-800 transition-colors">
            <Video className="w-6 h-6" />
          </a>
          <a href="#" className="bg-gradient-to-r from-purple-400 to-pink-400 text-white p-3 rounded-full hover:opacity-80 transition-opacity">
            <Instagram className="w-6 h-6" />
          </a>
          <a href="#" className="bg-red-600 text-white p-3 rounded-full hover:bg-red-700 transition-colors">
            <Youtube className="w-6 h-6" />
          </a>
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white/20 rounded-3xl p-6 text-center">
        <h3 className="text-2xl font-bold text-white mb-4">Entre em Contato</h3>
        <p className="text-white/90 mb-4">
          Tem sugestões, críticas ou quer participar do projeto?
        </p>
        <p className="text-white/80 text-sm">
          Envie uma mensagem para: <span className="font-semibold">contato@musicadasegunda.com</span>
        </p>
      </div>
    </div>
  );
}
