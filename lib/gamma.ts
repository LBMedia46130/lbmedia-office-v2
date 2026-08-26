const GAMMA_API_BASE_URL =
  "https://public-api.gamma.app/v1.0";

export const LBMEDIA_RADIO_GAMMA_TEMPLATE_ID =
  "g_nezqpg5uzyz4yg3";

export type GammaExportFormat =
  | "pdf"
  | "pptx";

export type GammaGenerationStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type GammaCredits = {
  deducted?: number;
  remaining?: number;
};

export type GammaCreateGenerationResponse = {
  generationId: string;
};

export type GammaGenerationResult = {
  generationId: string;
  status: GammaGenerationStatus;
  gammaUrl?: string;
  exportUrl?: string;
  credits?: GammaCredits;
  error?: string;
};

export type GenerateGammaFromTemplateInput = {
  gammaId: string;
  prompt: string;
  exportAs?: GammaExportFormat;
  title?: string;
};

type GammaApiErrorResponse = {
  message?: string;
  error?: string;
  statusCode?: number;
};

function getGammaApiKey() {
  const apiKey =
    process.env.GAMMA_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "La variable GAMMA_API_KEY est manquante."
    );
  }

  return apiKey;
}

async function parseGammaError(
  response: Response
) {
  let message =
    response.statusText ||
    "Erreur Gamma inconnue.";

  try {
    const data =
      (await response.json()) as GammaApiErrorResponse;

    message =
      data.message ||
      data.error ||
      message;
  } catch {
    // La réponse Gamma n'est pas forcément
    // toujours du JSON en cas d'erreur.
  }

  return new Error(
    `Erreur Gamma (${response.status}) : ${message}`
  );
}

async function gammaRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey =
    getGammaApiKey();

  const headers =
    new Headers(
      options.headers
    );

  headers.set(
    "X-API-KEY",
    apiKey
  );

  if (
    options.body &&
    !headers.has(
      "Content-Type"
    )
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response =
    await fetch(
      `${GAMMA_API_BASE_URL}${path}`,
      {
        ...options,
        headers,
        cache: "no-store",
      }
    );

  if (!response.ok) {
    throw await parseGammaError(
      response
    );
  }

  return (
    await response.json()
  ) as T;
}

export async function generateGammaFromTemplate(
  input: GenerateGammaFromTemplateInput
) {
  const gammaId =
    input.gammaId.trim();

  const prompt =
    input.prompt.trim();

  if (!gammaId) {
    throw new Error(
      "L'identifiant du template Gamma est obligatoire."
    );
  }

  if (!prompt) {
    throw new Error(
      "Le contenu envoyé à Gamma est obligatoire."
    );
  }

  const payload = {
    gammaId,
    prompt,

    ...(input.title?.trim()
      ? {
          title:
            input.title.trim(),
        }
      : {}),

    ...(input.exportAs
      ? {
          exportAs:
            input.exportAs,
        }
      : {}),
  };

  const data =
    await gammaRequest<GammaCreateGenerationResponse>(
      "/generations/from-template",
      {
        method: "POST",
        body:
          JSON.stringify(
            payload
          ),
      }
    );

  if (
    !data.generationId
  ) {
    throw new Error(
      "Gamma n'a pas retourné d'identifiant de génération."
    );
  }

  return data;
}

export async function getGammaGeneration(
  generationId: string
) {
  const normalizedGenerationId =
    generationId.trim();

  if (
    !normalizedGenerationId
  ) {
    throw new Error(
      "L'identifiant de génération Gamma est obligatoire."
    );
  }

  const data =
    await gammaRequest<GammaGenerationResult>(
      `/generations/${encodeURIComponent(
        normalizedGenerationId
      )}`,
      {
        method: "GET",
      }
    );

  return data;
}

export async function generateLbmediaRadioPresentation(
  prompt: string
) {
  return generateGammaFromTemplate(
    {
      gammaId:
        LBMEDIA_RADIO_GAMMA_TEMPLATE_ID,

      prompt,

      exportAs:
        "pdf",
    }
  );
}