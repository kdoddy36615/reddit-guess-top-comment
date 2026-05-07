import { getCurrentPlayer } from '@/lib/auth/current-player';
import { StartPlayingButton } from './start-playing-button';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const player = await getCurrentPlayer();

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-4xl font-semibold leading-tight">Guess the top comment</h1>
      <p className="text-lg text-zinc-600">
        Read a Reddit post title. Guess what the top comment said. See how close you got.
      </p>
      <StartPlayingButton />
      {player && (
        <p className="text-sm text-zinc-500" data-testid="player-nickname">
          Playing as {player.nickname}
        </p>
      )}
    </main>
  );
}
