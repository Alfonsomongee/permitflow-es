import { z } from "zod";
import {
  estudioResponseSchema,
  facturaResponseSchema,
  generarResponseSchema,
} from "../schemas/simulador";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export class ApiContractError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ApiContractError";
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new ApiContractError(
      "El servidor devolvió una respuesta no válida.",
    );
  }
}

async function requestValidated<T>(
  input: RequestInfo | URL,
  init: RequestInit,
  schema: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(input, init);
  const body = await readJson(response);

  if (!response.ok) {
    const detail =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string"
        ? body.detail
        : `La solicitud falló con estado ${response.status}.`;

    throw new ApiRequestError(detail, response.status);
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    throw new ApiContractError(
      "La respuesta del servidor no cumple el contrato esperado.",
      parsed.error,
    );
  }

  return parsed.data;
}

export function uploadInvoice(
  file: File,
  signal?: AbortSignal,
) {
  const formData = new FormData();
  formData.append("file", file);

  return requestValidated(
    "/api/simulador/factura",
    {
      method: "POST",
      body: formData,
      signal,
    },
    facturaResponseSchema,
  );
}

export function generateSimulation(
  data: {
    direccion: string;
    superficieDisponible: number;
    presupuesto: number;
    interesadoEnBaterias: boolean;
    facturaId?: string;
  },
  signal?: AbortSignal,
) {
  return requestValidated(
    "/api/simulador/generar",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal,
    },
    generarResponseSchema,
  );
}

export function pollSimulationStatus(
  estudioId: string,
  token: string,
  signal?: AbortSignal,
) {
  return requestValidated(
    `/api/simulador/estudio/${estudioId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    },
    estudioResponseSchema,
  );
}

export function getSimulationErrorMessage(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "";
  }

  if (error instanceof ApiRequestError) {
    return error.message;
  }

  if (error instanceof ApiContractError) {
    return "El servicio devolvió una respuesta inesperada. Inténtalo de nuevo más tarde.";
  }

  return "No se pudo completar la simulación. Inténtalo de nuevo.";
}
