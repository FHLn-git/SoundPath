/* Web Push Service Worker (SoundPath)
 * Handles incoming push events and displays notifications.
 */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch (_e) {
    data = { title: 'SoundPath', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'SoundPath'
  const options = {
    body: data.body || '',
    icon: data.icon || '/og-image.png',
    badge: data.badge || '/og-image.png',
    data: {
      url: data.url || '/',
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      for (const client of clientsArr) {
        if (client.url.includes(url) && 'focus' in client) return client.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(url)
    })
  )
})

