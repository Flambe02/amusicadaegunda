import { useCallback, useEffect, useRef, useState } from 'react';
import { SpatialNavigation } from '@noriginmedia/norigin-spatial-navigation';
import QRCode from 'react-qr-code';
import { Check, Mic, MicOff, RotateCcw, Smartphone } from 'lucide-react';
import FocusableButton from './components/FocusableButton';
import FocusRow from './components/FocusRow';
import { audioConstraints, loadMicPrefs, micDisplayName, rmsOfBytes, saveMicPrefs } from '@/lib/micPrefs';
import { createVoiceDetector } from '@/lib/karaokeGame';
import { generateMicCode, listenPhoneMic, phoneMicUrl } from '@/lib/phoneMic';
import '@/styles/bs-lobby.css';

// Durée cumulée de voix pour valider le test (même détecteur que le score).
const VOICE_MS_OK = 450;

const ERRORS = {
  insecure: 'O microfone só funciona numa conexão segura (endereço com https ou localhost).',
  denied: 'O microfone foi bloqueado. No computador, clique no cadeado ao lado do endereço, permita o microfone e tente de novo.',
  'no-device': 'Nenhum microfone encontrado neste aparelho.',
  unknown: 'Não foi possível abrir o microfone.',
};

function errorKind(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'denied';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'no-device';
  return 'unknown';
}

/**
 * « Configurar microfone » (karaokê K1, 2026-11-16) — trois temps :
 *   1. pourquoi (« uma nota no final »), et la promesse : rien n'est gravé ni envoyé ;
 *   2. le choix du microfone (liste du navigateur), ou « Sem microfone » ;
 *   3. le test : une jauge qui bouge avec la voix, « Microfone OK » quand on vous entend.
 * Le choix est gardé sur l'appareil (src/lib/micPrefs.js) puis `onDone(prefs)`.
 * Le son ne sort jamais vers les enceintes (pas de retour) et n'est jamais enregistré.
 */
export default function TvMicSetup({ onDone, onBack, backInterceptorRef, tv = false }) {
  const [step, setStep] = useState('intro'); // intro | choose | test | error
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [chosen, setChosen] = useState(null); // { deviceId, label }
  const [heard, setHeard] = useState(false);
  const barRef = useRef(null);
  // Celular como microfone (K3) : le même code d'une fois sur l'autre (le téléphone
  // resté ouvert sur la page se reconnecte tout seul).
  const [phoneCode] = useState(() => {
    const saved = loadMicPrefs();
    return saved?.source === 'phone' ? saved.code : generateMicCode();
  });
  const [phoneOn, setPhoneOn] = useState(false);

  useEffect(() => {
    if (!backInterceptorRef) return undefined;
    backInterceptorRef.current = () => {
      if (step === 'phone') { setStep('intro'); return true; }
      if (step === 'test' || step === 'error') { setStep(devices.length ? 'choose' : 'intro'); return true; }
      onBack?.();
      return true;
    };
    return () => { if (backInterceptorRef) backInterceptorRef.current = null; };
  }, [backInterceptorRef, onBack, step, devices.length]);

  // Focus de départ de chaque étape.
  useEffect(() => {
    const key = {
      intro: tv ? 'MIC_PHONE' : 'MIC_ALLOW', choose: 'MIC_DEVICE_0', test: heard ? 'MIC_USE' : 'MIC_OTHER', error: 'MIC_RETRY',
      phone: heard ? 'MIC_PHONE_USE' : 'MIC_PHONE_BACK',
    }[step];
    const id = setTimeout(() => { try { SpatialNavigation.setFocus(key); } catch { /* ignore */ } }, 60);
    return () => clearTimeout(id);
  }, [step, heard, tv]);

  const finish = useCallback((prefs) => { saveMicPrefs(prefs); onDone?.(prefs); }, [onDone]);

  // 1 → 2 : demande l'autorisation (geste de l'utilisateur), puis liste les micros
  // (le navigateur ne donne leurs noms qu'une fois l'autorisation accordée).
  const allow = useCallback(async () => {
    if (typeof window !== 'undefined' && window.isSecureContext === false) { setError('insecure'); setStep('error'); return; }
    if (!navigator.mediaDevices?.getUserMedia) { setError('no-device'); setStep('error'); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const all = await navigator.mediaDevices.enumerateDevices();
      const inputs = all.filter((d) => d.kind === 'audioinput' && d.deviceId !== 'communications');
      if (!inputs.length) { setError('no-device'); setStep('error'); return; }
      // Le micro déjà choisi en premier, puis « par défaut ».
      const saved = loadMicPrefs();
      inputs.sort((a, b) => (b.deviceId === saved?.deviceId) - (a.deviceId === saved?.deviceId)
        || (b.deviceId === 'default') - (a.deviceId === 'default'));
      setDevices(inputs.map((d) => ({ deviceId: d.deviceId, label: d.label })));
      setStep('choose');
    } catch (e) {
      setError(errorKind(e)); setStep('error');
    }
  }, []);

  // 3 : test du micro choisi — jauge en direct, « on vous entend » après ~0,5 s de voix.
  useEffect(() => {
    if (step !== 'test' || !chosen) return undefined;
    let stopped = false; let raf; let ctx; let stream;
    let voicedMs = 0; let last = performance.now();
    setHeard(false);
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints({ source: 'device', deviceId: chosen.deviceId }) });
        if (stopped) { stream.getTracks().forEach((t) => t.stop()); return; }
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        // Créé après un `await` : Chrome peut le laisser suspendu → jauge immobile.
        if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        ctx.createMediaStreamSource(stream).connect(analyser); // jamais vers ctx.destination
        const buf = new Uint8Array(analyser.fftSize);
        const fbuf = typeof analyser.getFloatTimeDomainData === 'function' ? new Float32Array(analyser.fftSize) : null;
        const detector = createVoiceDetector();
        const loop = (now) => {
          if (stopped) return;
          let rms;
          if (fbuf) {
            analyser.getFloatTimeDomainData(fbuf);
            let sum = 0;
            for (let i = 0; i < fbuf.length; i += 1) sum += fbuf[i] * fbuf[i];
            rms = Math.sqrt(sum / fbuf.length);
          } else {
            analyser.getByteTimeDomainData(buf);
            rms = rmsOfBytes(buf);
          }
          // Jauge lisible même pour une voix posée (échelle racine).
          if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.sqrt(rms) * 2.4)})`;
          if (detector.update(rms, now - last)) voicedMs += now - last;
          last = now;
          if (voicedMs >= VOICE_MS_OK) setHeard(true);
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      } catch (e) {
        if (!stopped) { setError(errorKind(e)); setStep('error'); }
      }
    })();
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      try { ctx?.close(); } catch { /* ignore */ }
    };
  }, [step, chosen]);

  // Celular : on écoute le canal `mic:CODE` ; jauge et « ouvimos você » avec le même
  // détecteur que le score, nourri par les niveaux envoyés par le téléphone.
  useEffect(() => {
    if (step !== 'phone') return undefined;
    const rmsRef = { current: 0 };
    const stopListening = listenPhoneMic(phoneCode, rmsRef, { onConnectedChange: setPhoneOn });
    const detector = createVoiceDetector();
    let raf; let last = performance.now(); let voicedMs = 0;
    setHeard(false);
    const loop = (now) => {
      const rms = rmsRef.current;
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, Math.sqrt(rms) * 2.4)})`;
      if (detector.update(rms, now - last)) voicedMs += now - last;
      last = now;
      if (voicedMs >= VOICE_MS_OK) setHeard(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); stopListening(); setPhoneOn(false); };
  }, [step, phoneCode]);

  const none = () => finish({ source: 'none' });
  const phoneUrl = phoneMicUrl(phoneCode);

  return (
    <div className="bs-screen bs-mic">
      <div className="bs-mic-card">
        <p className="bs-lobby-kicker"><Mic size={22} aria-hidden="true" /> Configurar microfone</p>

        {step === 'intro' && (
          <>
            <h1 className="bs-mic-title">Cante e ganhe uma nota</h1>
            <p className="bs-mic-text">
              Com um microfone, o karaokê ouve a sua voz e dá uma nota no final da música.
              O som fica neste aparelho: nada é gravado nem enviado.
            </p>
            {tv
              ? <p className="bs-mic-hint">A maioria das TVs não tem microfone: use o seu celular. Se a TV tiver um (ou um microfone USB), escolha « Microfone da TV ».</p>
              : <p className="bs-mic-hint">Sem microfone no computador? Use o seu celular: ele ouve a voz e manda só o volume, nunca o som.</p>}
            <FocusRow className="bs-mic-actions" focusKey="MIC_INTRO_ROW">
              {tv && (
                <FocusableButton focusKey="MIC_PHONE" className="bs-btn bs-btn-primary bs-focus" onPress={() => setStep('phone')}>
                  <Smartphone size={28} aria-hidden="true" /> Usar o celular
                </FocusableButton>
              )}
              <FocusableButton focusKey="MIC_ALLOW" className={`bs-btn bs-focus ${tv ? '' : 'bs-btn-primary'}`} onPress={allow}>
                <Mic size={28} aria-hidden="true" /> {tv ? 'Microfone da TV' : 'Permitir o microfone'}
              </FocusableButton>
              {!tv && (
                <FocusableButton focusKey="MIC_PHONE" className="bs-btn bs-focus" onPress={() => setStep('phone')}>
                  <Smartphone size={24} aria-hidden="true" /> Usar o celular
                </FocusableButton>
              )}
              <FocusableButton focusKey="MIC_NONE" className="bs-btn bs-focus" onPress={none}>
                <MicOff size={24} aria-hidden="true" /> Cantar sem microfone
              </FocusableButton>
            </FocusRow>
          </>
        )}

        {step === 'choose' && (
          <>
            <h1 className="bs-mic-title">Qual microfone?</h1>
            <p className="bs-mic-text">Escolha o microfone que vai usar para cantar.</p>
            <FocusRow className="bs-mic-list" focusKey="MIC_LIST">
              {devices.map((d, i) => (
                <FocusableButton
                  key={d.deviceId || i}
                  focusKey={`MIC_DEVICE_${i}`}
                  className="bs-mic-device bs-focus"
                  onPress={() => { setChosen(d); setStep('test'); }}
                >
                  <Mic size={24} aria-hidden="true" /> {micDisplayName(d.label) || `Microfone ${i + 1}`}
                </FocusableButton>
              ))}
              <FocusableButton focusKey="MIC_NONE_2" className="bs-mic-device is-none bs-focus" onPress={none}>
                <MicOff size={24} aria-hidden="true" /> Sem microfone (só a letra)
              </FocusableButton>
            </FocusRow>
          </>
        )}

        {step === 'test' && chosen && (
          <>
            <h1 className="bs-mic-title">{heard ? 'Microfone OK!' : 'Teste: cante ou fale'}</h1>
            <p className="bs-mic-text">
              {heard
                ? <>Ouvimos você em <strong>{micDisplayName(chosen.label)}</strong>.</>
                : <>Fale ou cante perto de <strong>{micDisplayName(chosen.label)}</strong>: a barra deve subir.</>}
            </p>
            <div className={`bs-mic-meter ${heard ? 'is-ok' : ''}`} aria-hidden="true">
              <span ref={barRef} className="bs-mic-meter-bar" />
              {heard && <Check className="bs-mic-meter-ok" size={34} />}
            </div>
            <p className="bs-mic-hint">Dica: um microfone perto da boca capta menos a música que sai das caixas de som, e a nota fica mais justa.</p>
            <FocusRow className="bs-mic-actions" focusKey="MIC_TEST_ROW">
              <FocusableButton
                focusKey="MIC_USE"
                className={`bs-btn bs-focus ${heard ? 'bs-btn-primary' : ''}`}
                onPress={() => finish({ source: 'device', deviceId: chosen.deviceId, label: chosen.label, testedAt: Date.now() })}
              >
                <Check size={26} aria-hidden="true" /> {heard ? 'Usar este microfone' : 'Usar mesmo assim'}
              </FocusableButton>
              <FocusableButton focusKey="MIC_OTHER" className="bs-btn bs-focus" onPress={() => setStep('choose')}>
                Escolher outro
              </FocusableButton>
            </FocusRow>
          </>
        )}

        {step === 'phone' && (
          <div className="bs-mic-phone">
            <div className="bs-mic-qr" aria-hidden="true">
              <QRCode value={phoneUrl} size={280} bgColor="#FFF7F0" fgColor="#1A0710" />
            </div>
            <div className="bs-mic-phone-body">
              <h1 className="bs-mic-title">{heard ? 'Celular OK!' : phoneOn ? 'Agora cante ou fale' : 'Aponte a câmera do celular'}</h1>
              <p className="bs-mic-text">
                {phoneOn
                  ? <>Celular conectado. {heard ? 'Ouvimos você.' : 'Fale perto do celular: a barra deve subir.'}</>
                  : <>Abra o QR code e toque em <strong>« Ligar o microfone »</strong>. Ou digite <strong>{phoneUrl.replace(/^https?:\/\//, '')}</strong></>}
              </p>
              <p className={`bs-mic-phone-state ${phoneOn ? 'is-on' : ''}`}>
                <Smartphone size={22} aria-hidden="true" /> {phoneOn ? 'Conectado' : 'Aguardando o celular…'} · código <strong>{phoneCode}</strong>
              </p>
              <div className={`bs-mic-meter ${heard ? 'is-ok' : ''}`} aria-hidden="true">
                <span ref={barRef} className="bs-mic-meter-bar" />
                {heard && <Check className="bs-mic-meter-ok" size={34} />}
              </div>
              <p className="bs-mic-hint">O celular manda só o volume da voz, nunca o som. Segure-o perto da boca, como um microfone.</p>
              <FocusRow className="bs-mic-actions" focusKey="MIC_PHONE_ROW">
                <FocusableButton
                  focusKey="MIC_PHONE_USE"
                  className={`bs-btn bs-focus ${heard ? 'bs-btn-primary' : ''}`}
                  onPress={() => finish({ source: 'phone', code: phoneCode })}
                >
                  <Check size={26} aria-hidden="true" /> {heard ? 'Usar o celular' : 'Usar mesmo assim'}
                </FocusableButton>
                <FocusableButton focusKey="MIC_PHONE_BACK" className="bs-btn bs-focus" onPress={() => setStep('intro')}>
                  Voltar
                </FocusableButton>
              </FocusRow>
            </div>
          </div>
        )}

        {step === 'error' && (
          <>
            <h1 className="bs-mic-title">Microfone indisponível</h1>
            <p className="bs-mic-text">{ERRORS[error] || ERRORS.unknown}</p>
            <p className="bs-mic-hint">Você pode cantar sem microfone: a letra aparece igual, só não há nota no final.</p>
            <FocusRow className="bs-mic-actions" focusKey="MIC_ERROR_ROW">
              <FocusableButton focusKey="MIC_RETRY" className="bs-btn bs-focus" onPress={allow}>
                <RotateCcw size={24} aria-hidden="true" /> Tentar de novo
              </FocusableButton>
              <FocusableButton focusKey="MIC_NONE_3" className="bs-btn bs-btn-primary bs-focus" onPress={none}>
                <MicOff size={26} aria-hidden="true" /> Continuar sem microfone
              </FocusableButton>
            </FocusRow>
          </>
        )}
      </div>
    </div>
  );
}
