import type { FormEvent } from 'react'
import { router } from '@inertiajs/react'
import type { PageData } from '../types.js'

/** Distingue um salvamento concluído de um redirecionamento com erro. */
export const hasFlashError = (props: unknown) => Boolean((props as PageData).flash?.erro)

/** Envia um formulário Inertia e limpa seus campos após sucesso. */
export const post = (
  event: FormEvent<HTMLFormElement>,
  url: string,
  transform?: (
    data: Record<string, FormDataEntryValue>,
  ) => Record<string, FormDataEntryValue | null>,
  resetOnSuccess = true,
) => {
  event.preventDefault()
  const form = event.currentTarget
  // Converte campos nomeados em objeto; transform adapta formulários com valores opcionais.
  const raw = Object.fromEntries(new FormData(form).entries()) as Record<string, FormDataEntryValue>
  router.post(url, transform ? transform(raw) : raw, {
    onSuccess: (page: { props: unknown }) => {
      if (resetOnSuccess && !hasFlashError(page.props)) form.reset()
    },
  })
}
