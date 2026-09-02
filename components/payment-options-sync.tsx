'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Method = {
  code: 'pix' | 'credito' | 'dinheiro';
  name: string;
  description: string | null;
  pix_key: string | null;
  sort_order: number;
};

export default function PaymentOptionsSync() {
  useEffect(() => {
    let active = true;
    let methods: Method[] = [];
    let observer: MutationObserver | null = null;

    async function load() {
      const { data } = await supabase
        .from('hey_roll_payment_methods')
        .select('code,name,description,pix_key,sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (!active) return;
      methods = (data ?? []) as Method[];
      apply();
    }

    function apply() {
      if (!active) return;
      const selects = Array.from(document.querySelectorAll('select'));
      const paymentSelects = selects.filter((select) => {
        const values = Array.from(select.options).map((option) => option.value);
        return values.includes('pix') && values.includes('credito') && values.includes('dinheiro');
      });

      paymentSelects.forEach((select) => {
        const current = select.value;
        const signature = methods.map((method) => `${method.code}:${method.name}`).join('|');
        if (select.dataset.hrPaymentSignature === signature) return;

        const nextValue = methods.some((method) => method.code === current) ? current : methods[0]?.code ?? '';
        select.innerHTML = '';
        methods.forEach((method) => {
          const option = document.createElement('option');
          option.value = method.code;
          option.textContent = method.name;
          select.appendChild(option);
        });
        select.value = nextValue;
        select.dataset.hrPaymentSignature = signature;

        let help = select.parentElement?.querySelector<HTMLElement>('[data-hr-payment-help]');
        if (!help) {
          help = document.createElement('div');
          help.dataset.hrPaymentHelp = 'true';
          help.className = 'mt-2 space-y-1 text-xs text-white/45';
          select.parentElement?.appendChild(help);
        }
        const selected = methods.find((method) => method.code === select.value);
        help.innerHTML = selected
          ? `<div>${escapeHtml(selected.description ?? '')}</div>${selected.code === 'pix' && selected.pix_key ? `<div class="font-bold text-white/70">Chave PIX: ${escapeHtml(selected.pix_key)}</div>` : ''}`
          : '<div>Nenhuma forma de pagamento disponível.</div>';

        if (current !== nextValue) select.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }

    function escapeHtml(value: string) {
      const div = document.createElement('div');
      div.textContent = value;
      return div.innerHTML;
    }

    observer = new MutationObserver(() => apply());
    observer.observe(document.body, { childList: true, subtree: true });
    void load();

    return () => {
      active = false;
      observer?.disconnect();
    };
  }, []);

  return null;
}
