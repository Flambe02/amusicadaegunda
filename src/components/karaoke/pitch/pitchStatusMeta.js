import { AudioLines, ArrowUp, ArrowDown, Mic, MicOff, Loader2, Ear } from 'lucide-react';

/**
 * Mapa status → rótulo PT + ícone + tom visual do « Guia de tom ».
 *
 * ⚠️ Sentido do português (§21): pitch da voz demasiado GRAVE → é preciso cantar
 * MAIS ALTO ('Mais alto'); demasiado AGUDO → 'Mais baixo'. Não inverter.
 *
 * `tone`: 'good' (amarelo, afinado) | 'neutral' (cinza, à espera) | 'off' (apagado).
 * Nunca vermelho para pequenos erros — experiência familiar, sem stress (§9).
 */
export const PITCH_STATUS_META = {
  disabled:     { label: 'Microfone desligado', Icon: MicOff,    tone: 'off' },
  initializing: { label: 'A preparar…',         Icon: Loader2,   tone: 'neutral', spin: true },
  listening:    { label: 'Ouvindo',             Icon: Ear,       tone: 'neutral' },
  inTune:       { label: 'Afinado',             Icon: AudioLines, tone: 'good' },
  tooLow:       { label: 'Mais alto',           Icon: ArrowUp,   tone: 'neutral' },
  tooHigh:      { label: 'Mais baixo',          Icon: ArrowDown, tone: 'neutral' },
  noVoice:      { label: 'Sem voz',             Icon: Mic,       tone: 'off' },
  noReference:  { label: 'Guia indisponível',   Icon: MicOff,    tone: 'off' },
  error:        { label: 'Guia indisponível',   Icon: MicOff,    tone: 'off' },
};

export function statusMeta(status) {
  return PITCH_STATUS_META[status] || PITCH_STATUS_META.listening;
}
