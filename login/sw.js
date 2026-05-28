// TryFreed Service Worker — bill due-date notifications
const VERSION = 'tryfreed-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/login/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const match = list.find(c => c.url.includes('/login'));
      if (match) return match.focus();
      return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SHOW_NOTIFS') return;
  const { bills } = e.data;
  if (!bills || !bills.length) return;
  const shows = bills.map(b =>
    self.registration.showNotification(b.title, {
      body: b.body,
      tag: 'bill-' + b.id,
      data: { url: '/login/' },
      requireInteraction: false,
      silent: false
    })
  );
  e.waitUntil(Promise.all(shows));
});
