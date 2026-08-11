/**
 * Embedded Signup da Meta em modo COEXISTÊNCIA.
 *
 * O fluxo devolve dois pedaços por caminhos diferentes:
 *  - `code`  → via callback do FB.login (response_type=code)
 *  - `phone_number_id` + `waba_id` → via postMessage (evento WA_EMBEDDED_SIGNUP)
 *
 * Coletamos os dois e resolvemos quando o `code` chega. `featureType:
 * 'whatsapp_business_app_onboarding'` é o que liga a coexistência (o número
 * continua ativo no app do celular; a Cloud API entra como aparelho linkado).
 *
 * Requer as envs públicas:
 *  - NEXT_PUBLIC_META_APP_ID
 *  - NEXT_PUBLIC_META_CONFIG_ID   (configuração de Embedded Signup c/ coexistência)
 *  - NEXT_PUBLIC_META_GRAPH_VERSION (opcional, default v21.0)
 */

export interface EmbeddedSignupResult {
  code: string;
  phoneNumberId: string;
  wabaId: string;
}

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const SDK_SRC = 'https://connect.facebook.net/en_US/sdk.js';

export function isEmbeddedSignupConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_META_APP_ID && process.env.NEXT_PUBLIC_META_CONFIG_ID,
  );
}

function graphVersion(): string {
  return process.env.NEXT_PUBLIC_META_GRAPH_VERSION || 'v21.0';
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Embedded Signup só roda no navegador.'));
  }
  if (window.FB) return Promise.resolve();
  if (sdkPromise) return sdkPromise;

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  if (!appId) {
    return Promise.reject(
      new Error('NEXT_PUBLIC_META_APP_ID não configurado.'),
    );
  }

  sdkPromise = new Promise<void>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        autoLogAppEvents: true,
        xfbml: false,
        version: graphVersion(),
      });
      resolve();
    };

    const existing = document.getElementById('facebook-jssdk');
    if (existing) {
      // Script já injetado mas FB ainda não pronto: fbAsyncInit resolve.
      return;
    }
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = SDK_SRC;
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Falha ao carregar o SDK do Facebook.'));
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export async function launchEmbeddedSignup(): Promise<EmbeddedSignupResult> {
  await loadSdk();

  const configId = process.env.NEXT_PUBLIC_META_CONFIG_ID;
  if (!configId) {
    throw new Error('NEXT_PUBLIC_META_CONFIG_ID não configurado.');
  }

  return new Promise<EmbeddedSignupResult>((resolve, reject) => {
    let sessionInfo: { phoneNumberId?: string; wabaId?: string } = {};

    const onMessage = (event: MessageEvent) => {
      if (!event.origin || !event.origin.endsWith('facebook.com')) return;
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        // event: 'FINISH' | 'FINISH_ONLY_WABA' | 'CANCEL' | 'ERROR'
        if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA') {
          sessionInfo = {
            phoneNumberId: data.data?.phone_number_id,
            wabaId: data.data?.waba_id,
          };
        } else if (data.event === 'CANCEL') {
          cleanup();
          reject(new Error('Conexão cancelada antes de concluir.'));
        } else if (data.event === 'ERROR') {
          cleanup();
          reject(
            new Error(data.data?.error_message || 'Erro no fluxo da Meta.'),
          );
        }
      } catch {
        // mensagens não-JSON do FB: ignora
      }
    };

    const cleanup = () => window.removeEventListener('message', onMessage);

    window.addEventListener('message', onMessage);

    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        cleanup();
        if (!code) {
          reject(new Error('Login não autorizado ou cancelado.'));
          return;
        }
        if (!sessionInfo.phoneNumberId || !sessionInfo.wabaId) {
          reject(
            new Error(
              'A Meta não devolveu o número/WABA. Verifique se a configuração de Embedded Signup está em modo coexistência.',
            ),
          );
          return;
        }
        resolve({
          code,
          phoneNumberId: sessionInfo.phoneNumberId,
          wabaId: sessionInfo.wabaId,
        });
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      },
    );
  });
}
