/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Mic, Loader2, Power } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveSession, SessionState } from './lib/liveSession';

export default function App() {
  const [sessionState, setSessionState] = useState<SessionState>('disconnected');
  const sessionRef = useRef<LiveSession | null>(null);

  useEffect(() => {
    sessionRef.current = new LiveSession((state) => {
      setSessionState(state);
    });

    return () => {
      sessionRef.current?.disconnect();
    };
  }, []);

  const toggleConnection = () => {
    if (sessionState === 'disconnected') {
      sessionRef.current?.connect();
    } else {
      sessionRef.current?.disconnect();
    }
  };

  const getStatusText = () => {
    switch (sessionState) {
      case 'disconnected': return 'Tap to wake Zoya';
      case 'connecting': return 'Waking up...';
      case 'listening': return 'Listening...';
      case 'speaking': return 'Zoya is speaking...';
      case 'error': return 'Connection Error';
    }
  };

  const getStatusColor = () => {
    switch (sessionState) {
      case 'disconnected': return 'bg-gray-800 text-gray-400';
      case 'connecting': return 'bg-purple-600 text-white';
      case 'listening': return 'bg-blue-500 text-white';
      case 'speaking': return 'bg-pink-500 text-white';
      case 'error': return 'bg-red-600 text-white';
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
        <motion.div
          animate={{
            scale: sessionState === 'speaking' ? [1, 1.2, 1] : sessionState === 'listening' ? [1, 1.05, 1] : 1,
            opacity: sessionState === 'disconnected' ? 0 : 0.5,
          }}
          transition={{
            duration: sessionState === 'speaking' ? 1.5 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className={`w-[40rem] h-[40rem] rounded-full blur-3xl ${
            sessionState === 'speaking' ? 'bg-pink-600' : 'bg-blue-600'
          }`}
        />
      </div>

      <div className="z-10 flex flex-col items-center gap-12">
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tighter text-white">Zoya</h1>
          <p className={`font-medium tracking-wide uppercase text-sm ${sessionState === 'error' ? 'text-red-400' : 'text-gray-400'}`}>
            {getStatusText()}
          </p>
        </div>

        <div className="relative">
          {/* Ripple effects */}
          <AnimatePresence>
            {(sessionState === 'listening' || sessionState === 'speaking') && (
              <>
                <motion.div
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: 0, scale: 2 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className={`absolute inset-0 rounded-full ${sessionState === 'speaking' ? 'bg-pink-500' : 'bg-blue-500'}`}
                />
                <motion.div
                  initial={{ opacity: 0.5, scale: 1 }}
                  animate={{ opacity: 0, scale: 2.5 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                  className={`absolute inset-0 rounded-full ${sessionState === 'speaking' ? 'bg-pink-500' : 'bg-blue-500'}`}
                />
              </>
            )}
          </AnimatePresence>

          <button
            onClick={toggleConnection}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${getStatusColor()} ${
              sessionState !== 'disconnected' && sessionState !== 'error' ? 'shadow-[0_0_40px_rgba(0,0,0,0.5)]' : ''
            }`}
            style={{
              boxShadow: sessionState === 'speaking' ? '0 0 60px rgba(236, 72, 153, 0.6)' : 
                         sessionState === 'listening' ? '0 0 40px rgba(59, 130, 246, 0.6)' : 
                         sessionState === 'error' ? '0 0 40px rgba(220, 38, 38, 0.6)' : 'none'
            }}
          >
            {(sessionState === 'disconnected' || sessionState === 'error') && <Power className="w-12 h-12" />}
            {sessionState === 'connecting' && <Loader2 className="w-12 h-12 animate-spin" />}
            {sessionState === 'listening' && <Mic className="w-12 h-12" />}
            {sessionState === 'speaking' && (
              <div className="flex gap-1 items-center justify-center h-12">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ height: ['20%', '100%', '20%'] }}
                    transition={{
                      duration: 0.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.1,
                    }}
                    className="w-1.5 bg-white rounded-full"
                  />
                ))}
              </div>
            )}
          </button>
        </div>

        {sessionState === 'error' && (
          <div className="absolute bottom-10 max-w-md text-center text-red-400 bg-red-950/50 p-4 rounded-lg border border-red-900/50 backdrop-blur-sm">
            {sessionRef.current?.errorMessage || "An unexpected error occurred."}
          </div>
        )}
      </div>
    </div>
  );
}
