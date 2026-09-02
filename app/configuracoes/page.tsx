'use client';

import { useEffect, useState } from 'react';
import { BarChart3, LogIn, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import AdminPanel from '@/components/admin-panel';
import PaymentSettings from '@/components/payment-settings';
import { supabase } from '@/lib/supabase';

export default function ConfiguracoesPage() {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) { setAllowed(false); setChecked(true); return; }
    const { data, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', sessionData.session.user.id).maybeSingle();
    if (adminError || !data) { await supabase.auth.signOut(); setAllowed(false); } else setAllowed(true);
    setChecked(true);
  }

  useEffect(() => { void verify(); }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError('');
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) { setError('E-mail ou senha inválidos.'); setLoading(false); return; }
    const { data, error: adminError } = await supabase.from('admin_users').select('user_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id ?? '').maybeSingle();
    if (adminError || !data) { await supabase.auth.signOut(); setError('Acesso negado. Somente o proprietário pode entrar.'); setLoading(false); return; }
    setAllowed(true); setLoading(false);
  }

  if (!checked || (checked && allowed)) return checked ? <><AdminPanel /><div className="mx-auto max-w-[1400px] bg-[#050505] px-5 pb-10 text-white"><div className="mx-auto mt-8 max-w-[1400px] border border-[#d71920]/30 bg-[#0b0b0b] p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-3"><BarChart3 className="text-[#d71920]" size={22}/><h2 className="rock-title text-2xl">PEDIDOS & DESPACHO</h2></div><p className="mt-1 text-sm text-white/45">Central do proprietário para acompanhar, preparar e despachar entregas.</p></div><Link href="/configuracoes/pedidos" className="flex items-center justify-center gap-2 bg-[#d71920] px-5 py-3 text-xs font-black uppercase">Abrir dashboard <BarChart3 size={16}/></Link></div></div><PaymentSettings /></div></> : <main className="min-h-screen bg-[#050505] p-8 text-white">Carregando...</main>;

  return <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white"><form onSubmit={login} className="w-full max-w-md border border-white/10 bg-[#0b0b0b] p-8 shadow-2xl"><div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#d71920]/40 bg-black"><LockKeyhole className="text-[#d71920]" size={28}/></div><div className="rock-title text-4xl">RETAGUARDA</div><p className="mt-2 text-sm text-white/50">Hey Roll Let’s Go — acesso exclusivo do proprietário.</p><label className="field-label mt-7">E-mail do proprietário</label><input className="field" value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" required /><label className="field-label mt-4">Senha</label><input className="field" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" required />{error && <p className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-3 text-sm font-bold">{error}</p>}<button disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#d71920] py-4 font-black uppercase disabled:opacity-50"><LogIn size={18}/>{loading ? 'VERIFICANDO...' : 'ENTRAR NA RETAGUARDA'}</button></form></main>;
}
