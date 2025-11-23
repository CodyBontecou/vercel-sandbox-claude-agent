'use client';

import { useState } from 'react';

export default function Home() {
  const [isLoading, setIsLoading] =
    useState(false);
  const [message, setMessage] = useState('');

  const handleRunSandbox = async () => {
    setIsLoading(true);
    setMessage('Starting sandbox...');

    try {
      const response = await fetch(
        '/api/sandbox',
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (response.ok) {
        setMessage(`Success! ${data.message}`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error
          ? error.message
          : 'Unknown error';
      setMessage(`Error: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={
        'flex min-h-screen items-center ' +
        'justify-center bg-zinc-50 dark:bg-black'
      }
    >
      <div
        className={
          'flex flex-col items-center gap-6'
        }
      >
        <button
          onClick={handleRunSandbox}
          disabled={isLoading}
          className={
            'px-8 py-4 text-lg font-semibold ' +
            'text-white bg-black rounded-lg ' +
            'hover:bg-zinc-800 ' +
            'disabled:bg-zinc-400 ' +
            'disabled:cursor-not-allowed ' +
            'transition-colors ' +
            'dark:bg-white ' +
            'dark:text-black ' +
            'dark:hover:bg-zinc-200 ' +
            'dark:disabled:bg-zinc-600'
          }
        >
          {isLoading
            ? 'Running...'
            : 'Run Sandbox'}
        </button>
        {message && (
          <p
            className={
              'max-w-md text-center text-sm ' +
              'text-zinc-600 dark:text-zinc-400'
            }
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
