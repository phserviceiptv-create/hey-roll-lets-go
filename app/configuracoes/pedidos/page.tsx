'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import Link from 'next/link';
import OrderDashboard from '@/components/order-dashboard';
import { supabase } from '@/lib/supabase';

export default function PedidosDashboardPage() {
  const [checked, setChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    async function verify() {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) { setChecked(true); return; }
      const { data } = await supabase.from('admin_users').select('user_id').eq('user_id', sessionData.session.user.id).maybeSingle();
      if (data) setAllowed(true);
      else await supabase.auth.signOut();
      setChecked(true);
    }
    void verify();
  }, []);

  if (!checked) return <main className="min-h-screen bg-[#050505] p-8 text-white">Carregando...</main>;

  if (!allowed) return <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white"><div className="w-full max-w-md border border-white/10 bg-[#0b0b0b] p-8"><LockKeyhole className="text-[#d71920]" size={30}/><h1 className="rock-title mt-5 text-3xl">ACESSO RESTRITO</h1><p className="mt-3 text-sm text-white/50">Entre na retaguarda do proprietário para acessar os pedidos.</p><Link href="/configuracoes" className="mt-6 inline-flex items-center gap-2 bg-[#d71920] px-5 py-3 text-xs font-black uppercase">Entrar na retaguarda</Link></div></main>;

  return <main className="min-h-screen bg-[#050505] text-white"><div className="border-b border-white/10 bg-black px-5 py-4"><div className="mx-auto flex max-w-[1400px] items-center justify-between"><Link href="/configuracoes" className="flex items-center gap-2 text-xs font-black uppercase text-white/60 hover:text-white"><ArrowLeft size={16}/> Retaguarda</Link><span className="text-xs font-black uppercase tracking-[.2em] text-[#d71920]">Proprietário • Pedidos</span></div></div><OrderDashboard /></main>;
}
