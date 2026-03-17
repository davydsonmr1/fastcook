import { useState, useEffect, useRef, useCallback } from 'react';

// Extensão simplificada para WebKit suportado nalguns browsers
interface IWindow extends Window {
  webkitSpeechRecognition?: unknown;
  SpeechRecognition?: unknown;
}

// Tipagem base baseada no standard local para evitar `any`
interface SpeechRecognitionEvent {
  resultIndex: number;
  results: { [key: number]: [{ transcript: string }] } & { length: number };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

export function useSpeech(onEndCallback?: () => void) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const errorMsgRef = useRef<string | null>(null);
  const onEndCallbackRef = useRef(onEndCallback);
  
  // Sincroniza o estado dos refs para as arrow functions dentro dos handlers
  useEffect(() => {
     errorMsgRef.current = errorMsg;
  }, [errorMsg]);

  useEffect(() => {
     onEndCallbackRef.current = onEndCallback;
  }, [onEndCallback]);

  // useRef para guardar a instância e evitar recriações sucessivas
  const recognitionRef = useRef<unknown>(null);

  useEffect(() => {
    // Verifica compatibilidade no arranque
    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const SpeechRec = (SpeechRecognition || webkitSpeechRecognition) as unknown;

    if (!SpeechRec) {
      setTimeout(() => setErrorMsg('Infelizmente as funcionalidades de voz não são suportadas neste navegador.'), 0);
      return;
    }

    // Inicialização da API nativa
    const recognition = new (SpeechRec as new () => unknown)() as {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      onstart: () => void;
      onresult: (event: SpeechRecognitionEvent) => void;
      onerror: (event: SpeechRecognitionErrorEvent) => void;
      onend: () => void;
    };
    recognition.continuous = false; // Pára automaticamente no fim de uma frase
    recognition.interimResults = true; // Permite ver o texto a ser formado em tempo real
    recognition.lang = 'pt-PT'; // Foco em Português

    // Tratamento de eventos vitais
    recognition.onstart = () => {
      setIsListening(true);
      setErrorMsg(null);
      setTranscript('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      // Tratamento gentil para negação de permissões de mic (UX)
      if (event.error === 'not-allowed') {
        setErrorMsg('Foi negado o acesso ao microfone. Por favor, permita nas permissões do site.');
      } else if (event.error !== 'no-speech') {
        setErrorMsg('Ocorreu um erro na captura do áudio. Tente novamente.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      // Se não ocorreu um evento de erro fatal, assinala para submit
      if (!errorMsgRef.current) {
         if (onEndCallbackRef.current) onEndCallbackRef.current();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      // Limpeza de recursos
         (recognitionRef.current as { abort: () => void }).abort();
    };
  }, []);

  const startListening = useCallback(() => {
    setErrorMsg(null);
    setTranscript('');
    if (recognitionRef.current) {
      try {
         (recognitionRef.current as { start: () => void }).start();
      } catch {
         // Silently catch se o start já tiver sido emitido acidentalmente duas vezes
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      (recognitionRef.current as { stop: () => void }).stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    error: errorMsg,
    startListening,
    stopListening,
    resetTranscript
  };
}
