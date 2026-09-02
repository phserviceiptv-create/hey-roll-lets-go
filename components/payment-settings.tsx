'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Eye, EyeOff, Plus, Save, Trash2, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export type PaymentMethod = {
  id: string;
  code: 'pix' | 'credito' | 'dinheiro';
  name: string;
  description: string | null;
  pix_key: string | null;
  sort_order: number;
  is_active: boolean;
};

const labels: Record<PaymentMethod['code'], string> = {
  pix: 'PIX',
  credito: 'Cartão',
  dinheiro: 'Dinheiro',
};

export default function PaymentSettings() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('hey_roll_payment_methods')
      .select('*')
      .order('sort_order');
    if (error) setMessage(error.message);
    setMethods((data ?? []) as PaymentMethod[]);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  function update(id: string, patch: Partial<PaymentMethod>) {
    setMethods((current) => current.map((method) => method.id === id ? { ...method, ...patch } : method));
  }

  async function save(method: PaymentMethod) {
    setSaving(method.id); setMessage('');
    const { error } = await supabase.from('hey_roll_payment_methods').update({
      name: method.name.trim() || labels[method.code],
      description: method.description?.trim() || null,
      pix_key: method.code === 'pix' ? (method.pix_key?.trim() || null) : null,
      sort_order: Number(method.sort_order) || 0,
      is_active: method.is_active,
    }).eq('id', method.id);
    setMessage(error ? error.message : 'Informações de pagamento salvas.');
    setSaving(null);
  }

  async function addMethod() {
    const existing = new Set(methods.map((method) => method.code));
    const code = (['pix', 'credito', 'dinheiro'] as const).find((item) => !existing.has(item));
    if (!code) { setMessage('As três formas de pagamento disponíveis já estão cadastradas.'); return; }
    setSaving('new'); setMessage('');
    const { data, error } = await supabase.from('hey_roll_payment_methods').insert({
      code,
      name: labels[code],
      description: code === 'pix' ? 'Pagamento via PIX.' : code === 'credito' ? 'Pagamento com cartão.' : 'Pagamento em dinheiro. Informe o troco.',
      sort_order: methods.length + 1,
      is_active: true,
    }).select('*').single();
    if (error) setMessage(error.message);
    else if (data) setMethods((current) => [...current, data as PaymentMethod].sort((a, b) => a.sort_order - b.sort_order));
    setSaving(null);
  }

  async function remove(method: PaymentMethod) {
    if (!window.confirm(`Remover ${method.name} da configuração?`)) return;
    setSaving(method.id); setMessage('');
    const { error } = await supabase.from('hey_roll_payment_methods').delete().eq('id', method.id);
    if (error) setMessage(error.message); else setMethods((current) => current.filter((item) => item.id !== method.id));
    setSaving(null);
  }

  return (
    <section className="mt-8 border border-white/10 bg-[#0b0b0b] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3"><Wallet className="text-[#d71920]" size={22}/><h2 className="rock-title text-2xl">PAGAMENTOS</h2></div>
          <p className="mt-1 text-sm text-white/45">Defina quais formas aparecem para o cliente no fechamento do pedido.</p>
        </div>
        <button onClick={() => void addMethod()} disabled={saving === 'new'} className="flex items-center justify-center gap-2 bg-[#d71920] px-4 py-3 text-xs font-black uppercase disabled:opacity-50"><Plus size={16}/> Adicionar opção</button>
      </div>
      {message && <div className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-3 text-sm font-bold">{message}</div>}
      {loading ? <div className="mt-5 animate-pulse border border-white/10 p-6 text-white/40">Carregando pagamentos...</div> : <div className="mt-5 space-y-4">{methods.map((method) => <article key={method.id} className="border border-white/10 bg-black/40 p-4"><div className="grid gap-4 lg:grid-cols-[120px_1fr_1fr_140px_auto] lg:items-end"><div className="flex items-center gap-2 text-sm font-black uppercase"><CreditCard size={18} className="text-[#d71920]"/>{labels[method.code]}</div><label><span className="field-label">Nome exibido</span><input className="field" value={method.name} onChange={(e) => update(method.id, { name: e.target.value })}/></label><label><span className="field-label">Instrução para o cliente</span><input className="field" value={method.description ?? ''} onChange={(e) => update(method.id, { description: e.target.value })}/></label><label><span className="field-label">Ordem</span><input className="field" type="number" min="0" value={method.sort_order} onChange={(e) => update(method.id, { sort_order: Number(e.target.value) })}/></label><div className="flex gap-2"><button onClick={() => update(method.id, { is_active: !method.is_active })} className={`flex flex-1 items-center justify-center gap-2 border px-3 py-3 text-[10px] font-black uppercase ${method.is_active ? 'border-green-500/30 text-green-400' : 'border-white/15 text-white/35'}`}>{method.is_active ? <Eye size={15}/> : <EyeOff size={15}/>} {method.is_active ? 'Visível' : 'Oculto'}</button><button onClick={() => void save(method)} disabled={saving === method.id} className="flex items-center justify-center bg-[#d71920] px-4 py-3 text-xs font-black disabled:opacity-50"><Save size={15}/></button><button onClick={() => void remove(method)} className="border border-[#d71920]/30 px-3 text-[#d71920]"><Trash2 size={15}/></button></div></div>{method.code === 'pix' && <label className="mt-4 block"><span className="field-label">Chave PIX</span><input className="field" value={method.pix_key ?? ''} onChange={(e) => update(method.id, { pix_key: e.target.value })} placeholder="CPF, CNPJ, telefone, e-mail ou chave aleatória"/><span className="mt-1 block text-xs text-white/35">Essa informação poderá ser exibida ao cliente no fechamento.</span></label>}</article>)}</div>}
    </section>
  );
}
