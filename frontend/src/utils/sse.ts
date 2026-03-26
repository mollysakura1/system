export async function streamSse(
  url: string,
  options: {
    headers?: Record<string, string>;
    onMessage: (payload: Record<string, string>) => void;
    signal?: AbortSignal;
  }
) {
  const response = await fetch(url, {
    method: 'GET',
    headers: options.headers,
    signal: options.signal
  });

  if (!response.ok || !response.body) {
    throw new Error('SSE connect failed');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      const dataLine = event.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      options.onMessage(JSON.parse(dataLine.slice(6)) as Record<string, string>);
    }
  }
}
