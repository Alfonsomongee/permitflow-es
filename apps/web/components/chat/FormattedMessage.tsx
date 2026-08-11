"use client";

import React from "react";

interface FormattedMessageProps {
  content: string;
  className?: string;
}

/**
 * Renderiza texto en Markdown estructurado (negrita, cursiva, listas numeradas/viñetas,
 * bloques de código, encabezados y párrafos con saltos de línea adecuados) para los mensajes
 * del asistente en el chat.
 */
export function FormattedMessage({ content, className = "" }: FormattedMessageProps) {
  if (!content) return null;

  // 1. Pre-procesar texto para desglosar listas numeradas o viñetas que el modelo
  // pueda haber generado juntas en una sola línea (ej. "Cuéntame: 1. Item 2. Item")
  const normalized = content
    // Separar ":" o "." seguido de lista numerada " 1. " -> "\n1. "
    .replace(/([:?.!])\s+(\d+\.\s+)/g, "$1\n$2")
    // Separar elementos numerados consecutivos "1. Texto 2. Texto" -> "1. Texto\n2. Texto"
    .replace(/(\d+\.\s+[^1-9\n]+?)\s+(?=\d+\.\s+)/g, "$1\n")
    // Separar viñetas seguidas " - Item1 - Item2" -> "\n- Item1\n- Item2"
    .replace(/([:?.!])\s+([•\-*]\s+)/g, "$1\n$2");

  // 2. Dividir por líneas para procesar bloques
  const lines = normalized.split("\n");

  const blocks: React.ReactNode[] = [];
  let currentList: { type: "ol" | "ul"; items: string[] } | null = null;

  const flushList = (keyPrefix: string) => {
    if (!currentList) return;
    const ListTag = currentList.type === "ol" ? "ol" : "ul";
    const listClass =
      currentList.type === "ol"
        ? "my-2 space-y-1.5 pl-5 list-decimal text-text-primary"
        : "my-2 space-y-1.5 pl-5 list-disc text-text-primary";

    blocks.push(
      <ListTag key={`${keyPrefix}-list-${blocks.length}`} className={listClass}>
        {currentList.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {parseInline(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`line-${lineIdx}`);
      return;
    }

    // Encabezados (###, ##, #)
    if (trimmed.startsWith("### ")) {
      flushList(`line-${lineIdx}`);
      blocks.push(
        <h4 key={`h3-${lineIdx}`} className="mt-3 mb-1 font-semibold text-text-primary text-sm">
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith("## ")) {
      flushList(`line-${lineIdx}`);
      blocks.push(
        <h3 key={`h2-${lineIdx}`} className="mt-3.5 mb-1 font-bold text-text-primary text-sm">
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    // Lista numerada: 1. , 2. , etc.
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "ol") {
        flushList(`line-${lineIdx}`);
        currentList = { type: "ol", items: [] };
      }
      currentList.items.push(numMatch[2]);
      return;
    }

    // Lista con viñetas: - , * , •
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "ul") {
        flushList(`line-${lineIdx}`);
        currentList = { type: "ul", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      return;
    }

    // Si no es lista, cerramos la lista actual si había
    flushList(`line-${lineIdx}`);

    // Citas (> )
    if (trimmed.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`quote-${lineIdx}`}
          className="my-2 border-l-2 border-primary/50 pl-3 italic text-text-secondary text-xs"
        >
          {parseInline(trimmed.slice(2))}
        </blockquote>
      );
      return;
    }

    // Párrafo normal
    blocks.push(
      <p key={`p-${lineIdx}`} className="mb-2 leading-relaxed text-text-primary last:mb-0">
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList("final");

  return <div className={`formatted-message space-y-1.5 ${className}`}>{blocks}</div>;
}

/**
 * Procesa marcas inline de Markdown: **negrita**, *cursiva*, `código`, enlaces [texto](url)
 */
function parseInline(text: string): React.ReactNode[] {
  if (!text) return [];

  // Expresión regular para capturar enlaces, negrita (***, **), cursiva (*), código inline (`)
  const regex = /(\[\s*[^\]]+\s*\]\([^)]+\)|\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Enlaces [texto](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline hover:text-primary-dark transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
    }

    // Negrita + Cursiva ***texto***
    if (part.startsWith("***") && part.endsWith("***")) {
      return (
        <strong key={i} className="font-semibold italic text-text-primary">
          {part.slice(3, -3)}
        </strong>
      );
    }

    // Negrita **texto** o __texto__
    if ((part.startsWith("**") && part.endsWith("**")) || (part.startsWith("__") && part.endsWith("__"))) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Código `texto`
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-[12px] text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Cursiva *texto* o _texto_
    if ((part.startsWith("*") && part.endsWith("*")) || (part.startsWith("_") && part.endsWith("_"))) {
      return (
        <em key={i} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    return part;
  });
}
