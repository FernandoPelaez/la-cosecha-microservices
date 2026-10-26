"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { BrandIntro } from "@/components/layout/brand-intro";

type IntroSequenceContextValue = {
  introFinished: boolean;
  barReady: boolean;
  headerReady: boolean;
  contentReady: boolean;
  completeBar: () => void;
  completeHeader: () => void;
  completeContent: () => void;
};

const IntroSequenceContext =
  createContext<IntroSequenceContextValue | null>(null);

export function IntroSequenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [introFinished, setIntroFinished] = useState(false);
  const [barReady, setBarReady] = useState(false);
  const [headerReady, setHeaderReady] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  // Etapa inicial: termina la cortina roja original.
  const finishIntro = useCallback(() => {
    setIntroFinished(true);
  }, []);

  // Etapa 1: termina la entrada de la banda roja.
  const completeBar = useCallback(() => {
    setBarReady(true);
  }, []);

  // Etapa 2: termina la entrada del encabezado.
  const completeHeader = useCallback(() => {
    setHeaderReady(true);
  }, []);

  // Etapas 3 y 4: termina el Hero con sus imágenes.
  const completeContent = useCallback(() => {
    setContentReady(true);
  }, []);

  const value = useMemo(
    () => ({
      introFinished,
      barReady,
      headerReady,
      contentReady,
      completeBar,
      completeHeader,
      completeContent,
    }),
    [
      introFinished,
      barReady,
      headerReady,
      contentReady,
      completeBar,
      completeHeader,
      completeContent,
    ],
  );

  return (
    <IntroSequenceContext.Provider value={value}>
      {children}

      {!introFinished && (
        <BrandIntro onComplete={finishIntro} />
      )}
    </IntroSequenceContext.Provider>
  );
}

export function useIntroSequence() {
  const context = useContext(IntroSequenceContext);

  if (!context) {
    throw new Error(
      "useIntroSequence requiere IntroSequenceProvider",
    );
  }

  return context;
}


