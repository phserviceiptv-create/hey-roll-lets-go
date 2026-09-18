'use client';

import { FormEvent, useEffect, useState } from 'react';
import { LockKeyhole, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkRecovery = async () => {
      const { data } = await supabase.auth.getSession();
      setReady(Boolean(data.session));
    };

    void checkRecovery();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(Boolean(session));
    });

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const errorCode = hash.get('error_code');
    const errorDescription = hash.get('error_description');

    if (errorCode) {
      setError(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : 'O link de recuperação é inválido ou expirou.');
    }

    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }

    if (password !== confirmation) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Não foi possível alterar a senha.');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    await supabase.auth.signOut();
    window.setTimeout(() => router.replace('/configuracoes'), 1200);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-5 text-white">
      <section className="w-full max-w-md border border-white/10 bg-[#0b0b0b] p-8 shadow-2xl">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-[#d71920]/40 bg-black">
          {success ? <CheckCircle2 className="text-[#d71920]" size={28} /> : <LockKeyhole className="text-[#d71920]" size={28} />}
        </div>

        <div className="rock-title text-4xl">NOVA SENHA</div>
        <p className="mt-2 text-sm text-white/50">Redefinição segura da senha da retaguarda.</p>

        {!ready && !success ? (
          <div className="mt-7 border border-[#d71920]/30 bg-[#d71920]/10 p-4 text-sm text-white/75">
            {error || 'Abra esta página pelo link de recuperação enviado para o e-mail do proprietário.'}
          </div>
        ) : success ? (
          <div className="mt-7 border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-white/80">
            Senha alterada com sucesso. Redirecionando para a retaguarda...
          </div>
        ) : (
          <form onSubmit={submit} className="mt-7">
            <label className="field-label">Nova senha</label>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <label className="field-label mt-4">Confirmar nova senha</label>
            <input
              className="field"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />

            {error && (
              <p className="mt-4 border border-[#d71920]/40 bg-[#d71920]/10 p-3 text-sm font-bold">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="mt-5 flex w-full items-center justify-center gap-2 bg-[#d71920] py-4 font-black uppercase disabled:opacity-50"
            >
              <LockKeyhole size={18} />
              {loading ? 'ALTERANDO...' : 'ALTERAR SENHA'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
