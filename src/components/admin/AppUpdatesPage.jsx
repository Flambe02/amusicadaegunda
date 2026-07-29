// Configuração do contrôle de version distant (Android mobile + Android TV) —
// écrit directement dans public.app_update_config (RLS admin, cf.
// supabase/migrations/20260716090000_create_app_update_config.sql). Lecture
// consommée par src/services/appUpdateService.ts. Documentation : APP_UPDATE_SYSTEM.md.
import { useEffect, useState } from 'react';
import { Smartphone, Tv, Save, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';

const PLATFORMS = [
  { key: 'android_mobile', label: 'Android Mobile', icon: Smartphone },
  { key: 'android_tv', label: 'Android TV', icon: Tv },
];

const EMPTY_FORM = {
  enabled: true,
  latest_version_name: '',
  latest_version_code: '',
  minimum_version_code: '',
  title_recommended: '',
  message_recommended: '',
  title_required: '',
  message_required: '',
  store_url: '',
  check_interval_minutes: '360',
};

function toFormRow(row) {
  if (!row) return { ...EMPTY_FORM };
  return {
    enabled: row.enabled !== false,
    latest_version_name: row.latest_version_name || '',
    latest_version_code: String(row.latest_version_code ?? ''),
    minimum_version_code: String(row.minimum_version_code ?? ''),
    title_recommended: row.title_recommended || '',
    message_recommended: row.message_recommended || '',
    title_required: row.title_required || '',
    message_required: row.message_required || '',
    store_url: row.store_url || '',
    check_interval_minutes: String(row.check_interval_minutes ?? 360),
  };
}

const inputCls = 'w-full rounded bg-white/5 border border-white/10 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:border-purple-500';
const onlyDigits = (v) => v.replace(/[^0-9]/g, '');

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-400">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-600">{hint}</span>}
    </label>
  );
}

function PlatformCard({ platformKey, label, Icon, initial, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => toFormRow(initial));
  const [saving, setSaving] = useState(false);
  const savedMinimum = initial?.minimum_version_code ?? null;

  useEffect(() => { setForm(toFormRow(initial)); }, [initial]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async () => {
    const latest = Number.parseInt(form.latest_version_code, 10);
    const minimum = Number.parseInt(form.minimum_version_code, 10);
    const interval = Number.parseInt(form.check_interval_minutes, 10);

    if (!Number.isFinite(latest) || !Number.isFinite(minimum)) {
      toast({ title: 'Version codes devem ser números inteiros', variant: 'destructive' });
      return;
    }
    if (minimum > latest) {
      toast({ title: 'O código mínimo não pode ser maior que o código mais recente', variant: 'destructive' });
      return;
    }
    if (savedMinimum != null && minimum > savedMinimum) {
      const confirmed = window.confirm(
        `Versões abaixo deste código deixarão de acessar o aplicativo.\n\nAumentar o código mínimo de ${savedMinimum} para ${minimum}?`,
      );
      if (!confirmed) return;
    }

    setSaving(true);
    try {
      const payload = {
        platform: platformKey,
        enabled: form.enabled,
        latest_version_code: latest,
        minimum_version_code: minimum,
        latest_version_name: form.latest_version_name || null,
        title_recommended: form.title_recommended || null,
        message_recommended: form.message_recommended || null,
        title_required: form.title_required || null,
        message_required: form.message_required || null,
        store_url: form.store_url || null,
        check_interval_minutes: Number.isFinite(interval) && interval > 0 ? interval : 360,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('app_update_config')
        .upsert(payload, { onConflict: 'platform' })
        .select()
        .single();
      if (error) throw error;
      toast({ title: `Configuração salva — ${label}` });
      onSaved(data);
    } catch (err) {
      toast({ title: 'Erro ao salvar', description: err?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const raisingMinimum = savedMinimum != null && Number(form.minimum_version_code) > savedMinimum;

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-gray-900 p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon size={16} className="text-purple-400" /> {label}
        </h2>
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={form.enabled} onChange={(e) => set('enabled', e.target.checked)} />
          Ativo
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Latest version name">
          <input className={inputCls} value={form.latest_version_name} onChange={(e) => set('latest_version_name', e.target.value)} placeholder="1.4.4" />
        </Field>
        <Field label="Check interval (minutos)">
          <input className={inputCls} inputMode="numeric" value={form.check_interval_minutes} onChange={(e) => set('check_interval_minutes', onlyDigits(e.target.value))} />
        </Field>
        <Field label="Latest version code">
          <input className={inputCls} inputMode="numeric" value={form.latest_version_code} onChange={(e) => set('latest_version_code', onlyDigits(e.target.value))} />
        </Field>
        <Field label="Minimum version code" hint="Versões abaixo deste código deixarão de acessar o aplicativo.">
          <input className={inputCls} inputMode="numeric" value={form.minimum_version_code} onChange={(e) => set('minimum_version_code', onlyDigits(e.target.value))} />
        </Field>
      </div>

      <Field label="Store URL (opcional — substitui o link padrão da Google Play)">
        <input className={inputCls} value={form.store_url} onChange={(e) => set('store_url', e.target.value)} placeholder="https://play.google.com/store/apps/details?id=..." />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Título — recomendada">
          <input className={inputCls} value={form.title_recommended} onChange={(e) => set('title_recommended', e.target.value)} />
        </Field>
        <Field label="Título — obrigatória">
          <input className={inputCls} value={form.title_required} onChange={(e) => set('title_required', e.target.value)} />
        </Field>
        <Field label="Mensagem — recomendada">
          <textarea className={`${inputCls} min-h-[64px]`} value={form.message_recommended} onChange={(e) => set('message_recommended', e.target.value)} />
        </Field>
        <Field label="Mensagem — obrigatória">
          <textarea className={`${inputCls} min-h-[64px]`} value={form.message_required} onChange={(e) => set('message_required', e.target.value)} />
        </Field>
      </div>

      <div className="flex items-center justify-between border-t border-white/10 pt-3">
        {raisingMinimum ? (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle size={13} /> Vai aumentar o código mínimo aceito
          </p>
        ) : <span />}
        <Button size="sm" onClick={save} disabled={saving} className="gap-1.5 bg-purple-600 hover:bg-purple-700">
          <Save size={13} /> {saving ? 'Salvando…' : 'Guardar'}
        </Button>
      </div>
    </div>
  );
}

export default function AppUpdatesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState({ android_mobile: null, android_tv: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('app_update_config').select('*');
        if (error) throw error;
        if (cancelled) return;
        const next = { android_mobile: null, android_tv: null };
        (data || []).forEach((row) => { next[row.platform] = row; });
        setRows(next);
      } catch (err) {
        if (!cancelled) toast({ title: 'Erro ao carregar configuração', description: err?.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [toast]);

  return (
    <>
      <div>
        <h1 className="text-lg font-semibold">Atualizações do aplicativo</h1>
        <p className="text-sm text-gray-500">
          Controlo de versão remoto — Android mobile e Android TV (cf. APP_UPDATE_SYSTEM.md).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">A carregar…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {PLATFORMS.map(({ key, label, icon: Icon }) => (
            <PlatformCard
              key={key}
              platformKey={key}
              label={label}
              Icon={Icon}
              initial={rows[key]}
              onSaved={(saved) => setRows((r) => ({ ...r, [key]: saved }))}
            />
          ))}
        </div>
      )}
    </>
  );
}
