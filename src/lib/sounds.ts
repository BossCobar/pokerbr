let Howl: typeof import('howler').Howl | null = null;

if (typeof window !== 'undefined') {
  import('howler').then(m => { Howl = m.Howl; });
}

const soundUrls: Record<string, string> = {
  fold:  'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  check: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  call:  'https://assets.mixkit.co/active_storage/sfx/2357/2357-preview.mp3',
  raise: 'https://assets.mixkit.co/active_storage/sfx/2072/2072-preview.mp3',
  deal:  'https://assets.mixkit.co/active_storage/sfx/2077/2077-preview.mp3',
  win:   'https://assets.mixkit.co/active_storage/sfx/1434/1434-preview.mp3',
  chip:  'https://assets.mixkit.co/active_storage/sfx/2012/2012-preview.mp3',
};

const cache: Record<string, InstanceType<typeof import('howler').Howl>> = {};

export function playSound(name: string): void {
  if (typeof window === 'undefined' || !Howl) return;
  if (!cache[name] && soundUrls[name]) {
    cache[name] = new Howl({ src: [soundUrls[name]], volume: 0.5 });
  }
  cache[name]?.play();
}
