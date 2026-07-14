export const env = {
  apiUrl:
    process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  socketUrl:
    process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000',
};
