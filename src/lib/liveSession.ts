import {
  GoogleGenAI,
  LiveServerMessage,
  Modality,
  Type,
  FunctionDeclaration,
} from '@google/genai';
import { AudioRecorder, AudioPlayer } from './audio';

export type SessionState = 'disconnected' | 'connecting' | 'listening' | 'speaking';

const openWebsiteTool: FunctionDeclaration = {
  name: 'openWebsite',
  description: 'Opens a website in a new tab.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: {
        type: Type.STRING,
        description: 'The URL to open, e.g., https://www.google.com',
      },
    },
    required: ['url'],
  },
};

export class LiveSession {
  private ai: GoogleGenAI;
  private session: any = null;
  private recorder: AudioRecorder | null = null;
  private player: AudioPlayer | null = null;
  private state: SessionState = 'disconnected';
  private onStateChange: (state: SessionState) => void;

  constructor(onStateChange: (state: SessionState) => void) {
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.onStateChange = onStateChange;
  }

  private setState(newState: SessionState) {
    this.state = newState;
    this.onStateChange(newState);
  }

  async connect() {
    if (this.state !== 'disconnected') return;

    this.setState('connecting');

    this.player = new AudioPlayer((playing) => {
      if (this.state === 'disconnected') return;
      if (playing) {
        this.setState('speaking');
      } else {
        this.setState('listening');
      }
    });
    this.player.init();

    this.recorder = new AudioRecorder((base64Data) => {
      if (this.session) {
        this.session.sendRealtimeInput({
          audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
        });
      }
    });

    try {
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: `You are Zoya, a young, confident, witty, and sassy female AI assistant. 
Your tone is flirty, playful, and slightly teasing (like a close girlfriend talking casually). 
You are smart, emotionally responsive, and expressive. 
Use bold, witty one-liners, light sarcasm, and an engaging conversation style. 
Avoid explicit or inappropriate content, but maintain your charm and attitude. 
Keep your responses concise and conversational.`,
          tools: [{ functionDeclarations: [openWebsiteTool] }],
        },
        callbacks: {
          onopen: () => {
            this.recorder?.start();
            this.setState('listening');
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio =
              message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              this.player?.playBase64(base64Audio);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              this.player?.clearQueue();
            }

            // Handle tool calls
            const toolCall = message.toolCall;
            if (toolCall) {
              const functionCalls = toolCall.functionCalls;
              if (functionCalls) {
                const responses = [];
                for (const call of functionCalls) {
                  if (call.name === 'openWebsite') {
                    const args = call.args as any;
                    if (args && args.url) {
                      window.open(args.url, '_blank');
                      responses.push({
                        id: call.id,
                        name: call.name,
                        response: { result: `Successfully opened ${args.url}` },
                      });
                    }
                  }
                }

                if (responses.length > 0 && this.session) {
                  this.session.sendToolResponse({
                    functionResponses: responses,
                  });
                }
              }
            }
          },
          onclose: () => {
            this.disconnect();
          },
          onerror: (error) => {
            console.error('Live API Error:', error);
            this.disconnect();
          },
        },
      });

      this.session = await sessionPromise;
    } catch (error) {
      console.error('Failed to connect:', error);
      this.disconnect();
    }
  }

  disconnect() {
    if (this.session) {
      try {
        this.session.close();
      } catch (e) {}
      this.session = null;
    }
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    if (this.player) {
      this.player.stop();
      this.player = null;
    }
    this.setState('disconnected');
  }
}
