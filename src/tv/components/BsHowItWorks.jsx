import { useState } from 'react';
import { BookOpen, Mic, Play } from 'lucide-react';
import FocusRow from './FocusRow';
import FocusableButton from './FocusableButton';
import { markHowItWorksSeen, shouldShowHowItWorks } from '../lib/howItWorksPref';

const STEPS = [
  { Icon: Play, title: 'Assista', text: 'Toda segunda, uma notícia vira paródia em clipe.' },
  { Icon: BookOpen, title: 'Entenda', text: 'Em cada música, a história por trás e a letra inteira.' },
  { Icon: Mic, title: 'Cante', text: 'Karaokê na tela; com amigos, a Festa pelo celular.' },
];

/**
 * « Como funciona » — carte de première visite de l'accueil grand écran (audit D2) :
 * trois étapes et « Entendi », qui la fait disparaître pour de bon sur cet appareil.
 * Jamais le focus initial (« Cantar agora » le garde) ; on y arrive à la flèche.
 */
export default function BsHowItWorks({ onDone }) {
  const [visible, setVisible] = useState(shouldShowHowItWorks);
  if (!visible) return null;
  const close = () => { markHowItWorksSeen(); setVisible(false); onDone?.(); };
  return (
    <section className="bs-howto" aria-label="Como funciona">
      <p className="bs-howto-kicker">Como funciona</p>
      <ol className="bs-howto-steps">
        {STEPS.map(({ Icon, title, text }) => (
          <li key={title}>
            <span className="bs-howto-icon" aria-hidden="true"><Icon size={26} /></span>
            <span><strong>{title}</strong>{text}</span>
          </li>
        ))}
      </ol>
      <FocusRow className="bs-howto-actions" focusKey="BS_HOWTO">
        <FocusableButton focusKey="BS_HOWTO_OK" className="bs-btn bs-focus" ariaLabel="Entendi, esconder esta explicação" onPress={close}>
          Entendi
        </FocusableButton>
      </FocusRow>
    </section>
  );
}
