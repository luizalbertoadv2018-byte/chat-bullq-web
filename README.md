# Chat BullQ — Web

Front-end (Next.js) do inbox de WhatsApp e dos agentes de IA do escritório
Alberto Martins Advocacia Previdenciária. No ar em https://app.albertomartinsadv.com.br.

O guia de trabalho (montar o computador, fluxo de alteração, conferência e
publicação no Coolify) fica no repositório da API:
[`chat-bullq-api/docs/COMO-TRABALHAR.md`](https://github.com/luizalbertoadv2018-byte/chat-bullq-api/blob/main/docs/COMO-TRABALHAR.md).

Conferir antes de enviar:

```bash
npx tsc --noEmit -p .
corepack yarn build
git checkout -- yarn.lock next-env.d.ts
```
