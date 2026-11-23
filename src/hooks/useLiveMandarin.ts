import { useCallback, useEffect, useRef, useState } from 'react';
import { HskLevel, PartnerPersona, Scenario, SpeakingPace } from '../types';
import { computeRmsLevel, downsampleAndEncodePcm16, LiveAudioPlayer } from '../utils/audio';

export type LiveConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface UseLiveMandarinOptions {
  onTurnCommitted: (role: 'user' | 'assistant', rawText: string) => void;
}

export function useLiveMandarin({ onTurnCommitted }: UseLiveMandarinOptions) {
  const [status, setStatus] = useState<LiveConnectionStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [liveUserDraft, setLiveUserDraft] = useState('');
  const [liveAssistantDraft, setLiveAssistantDraft] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playerRef = useRef<LiveAudioPlayer | null>(null);

  const isMutedRef = useRef(false);
  const userDraftRef = useRef('');
  const assistantDraftRef = useRef('');
  const inputLevelRef = useRef(0);
  const outputLevelRef = useRef(0);
  const onTurnCommittedRef = useRef(onTurnCommitted);

  useEffect(() => {
    onTurnCommittedRef.current = onTurnCommitted;
  }, [onTurnCommitted]);

  const flushUserDraft = useCallback(() => {
    const text = userDraftRef.current.trim();
    if (text) {
      userDraftRef.current = '';
      setLiveUserDraft('');
      onTurnCommittedRef.current('user', text);
    }
  }, []);

  const flushAssistantDraft = useCallback(() => {
    const text = assistantDraftRef.current.trim();
    if (text) {
      assistantDraftRef.current = '';
      setLiveAssistantDraft('');
      onTurnCommittedRef.current('assistant', text);
    }
  }, []);

  const cleanupResources = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (inputCtxRef.current && inputCtxRef.current.state !== 'closed') {
      inputCtxRef.current.close().catch(() => {});
    }
    inputCtxRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (playerRef.current) {
      playerRef.current.close();
      playerRef.current = null;
    }

    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'stop' }));
        }
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    inputLevelRef.current = 0;
    outputLevelRef.current = 0;
    setIsPartnerSpeaking(false);
  }, []);

  const stopSession = useCallback(() => {
    flushUserDraft();
    flushAssistantDraft();
    cleanupResources();
    setStatus('idle');
    setIsMuted(false);
    isMutedRef.current = false;
  }, [cleanupResources, flushAssistantDraft, flushUserDraft]);

  const startSession = useCallback(
    async (params: {
      scenario: Scenario;
      partner: PartnerPersona;
      level: HskLevel;
      pace: SpeakingPace;
      autoGreet?: boolean;
    }) => {
      cleanupResources();
      setErrorMessage(null);
      setStatus('connecting');
      setElapsedSeconds(0);
      userDraftRef.current = '';
      assistantDraftRef.current = '';
      setLiveUserDraft('');
      setLiveAssistantDraft('');
      isMutedRef.current = false;
      setIsMuted(false);

      // 1. Request microphone access first
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        });
      } catch {
        setStatus('error');
        setErrorMessage(
          'Không thể truy cập micro. Vui lòng cấp quyền micro cho trình duyệt hoặc chuyển sang chế độ Nhắn tin & Nghe mẫu.'
        );
        return;
      }

      streamRef.current = mediaStream;
      const player = new LiveAudioPlayer();
      playerRef.current = player;

      // 2. Open WebSocket to our backend Live API bridge
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'start',
            partnerName: params.partner.hanziName,
            voiceName: params.partner.voiceName,
            scenarioTitle: `${params.scenario.title} (${params.scenario.hanziTitle})`,
            partnerRole: params.scenario.partnerRole,
            userRole: params.scenario.userRole,
            level: params.level,
            pace: params.pace,
            autoGreet: params.autoGreet ?? true,
          })
        );
      };

      ws.onmessage = (event) => {
        let msg: any;
        try {
          msg = JSON.parse(event.data);
        } catch {
          return;
        }

        if (msg.type === 'ready') {
          setStatus('connected');

          // Start mic PCM16 streaming only once Live session is ready
          if (!inputCtxRef.current && streamRef.current) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            const inputCtx = new AudioCtx({ sampleRate: 16000 });
            inputCtxRef.current = inputCtx;

            const source = inputCtx.createMediaStreamSource(streamRef.current);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (audioEvent) => {
              if (isMutedRef.current) {
                inputLevelRef.current = 0;
                return;
              }
              const channelData = audioEvent.inputBuffer.getChannelData(0);
              inputLevelRef.current = computeRmsLevel(channelData);

              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                const base64 = downsampleAndEncodePcm16(channelData, inputCtx.sampleRate, 16000);
                wsRef.current.send(JSON.stringify({ type: 'audio', data: base64 }));
              }
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
          }
          return;
        }

        if (msg.type === 'audio' && msg.data) {
          flushUserDraft();
          playerRef.current?.enqueuePcmBase64(msg.data);
          setIsPartnerSpeaking(true);
          return;
        }

        if (msg.type === 'inputTranscript' && msg.text) {
          userDraftRef.current += msg.text;
          setLiveUserDraft(userDraftRef.current);
          return;
        }

        if (msg.type === 'outputTranscript' && msg.text) {
          flushUserDraft();
          assistantDraftRef.current += msg.text;
          setLiveAssistantDraft(assistantDraftRef.current);
          return;
        }

        if (msg.type === 'interrupted') {
          playerRef.current?.interrupt();
          setIsPartnerSpeaking(false);
          flushAssistantDraft();
          return;
        }

        if (msg.type === 'turnComplete') {
          flushUserDraft();
          flushAssistantDraft();
          return;
        }

        if (msg.type === 'error') {
          setErrorMessage(msg.message || 'Phiên thoại gặp lỗi kết nối.');
          setStatus('error');
          cleanupResources();
          return;
        }

        if (msg.type === 'closed') {
          flushUserDraft();
          flushAssistantDraft();
          cleanupResources();
          setStatus('idle');
        }
      };

      ws.onerror = () => {
        setErrorMessage('Mất kết nối WebSocket tới máy chủ thoại.');
        setStatus('error');
        cleanupResources();
      };

      ws.onclose = () => {
        if (wsRef.current === ws) {
          flushUserDraft();
          flushAssistantDraft();
          cleanupResources();
          setStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
        }
      };
    },
    [cleanupResources, flushAssistantDraft, flushUserDraft]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      if (next) inputLevelRef.current = 0;
      return next;
    });
  }, []);

  const sendLiveTextCue = useCallback(
    (text: string, recordAsUserTurn = true) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return false;
      playerRef.current?.interrupt();
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
      if (recordAsUserTurn) {
        onTurnCommittedRef.current('user', text);
      }
      return true;
    },
    []
  );

  // Poll partner playback state + output level + session elapsed timer while connected
  useEffect(() => {
    if (status !== 'connected') return;

    const timerId = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    const meterId = window.setInterval(() => {
      if (playerRef.current) {
        const playing = playerRef.current.isPlaying();
        outputLevelRef.current = playerRef.current.getOutputLevel();
        setIsPartnerSpeaking(playing);
      } else {
        outputLevelRef.current = 0;
        setIsPartnerSpeaking(false);
      }
    }, 60);

    return () => {
      window.clearInterval(timerId);
      window.clearInterval(meterId);
    };
  }, [status]);

  // Ensure full cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  return {
    status,
    errorMessage,
    isMuted,
    isPartnerSpeaking,
    liveUserDraft,
    liveAssistantDraft,
    elapsedSeconds,
    inputLevelRef,
    outputLevelRef,
    startSession,
    stopSession,
    toggleMute,
    sendLiveTextCue,
    clearError: () => setErrorMessage(null),
  };
}
