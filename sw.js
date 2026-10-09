const CACHE = 'takviyem-v2';
const ASSETS = ['./', './index.html', './manifest.json', './takviyem.ics',
  './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png',
  './icons/apple-touch-icon.png', './icons/favicon-32.png',
  './exercises.js', './workout.js', './workout.css',
  './images/Calf_Press_On_The_Leg_Press_Machine_0.jpg',
  './images/Calf_Press_On_The_Leg_Press_Machine_1.jpg',
  './images/Chest_And_Front_Of_Shoulder_Stretch_0.jpg',
  './images/Chest_And_Front_Of_Shoulder_Stretch_1.jpg',
  './images/Close-Grip_Front_Lat_Pulldown_0.jpg',
  './images/Close-Grip_Front_Lat_Pulldown_1.jpg',
  './images/Dumbbell_Bench_Press_0.jpg',
  './images/Dumbbell_Bench_Press_1.jpg',
  './images/Dumbbell_Bicep_Curl_0.jpg',
  './images/Dumbbell_Bicep_Curl_1.jpg',
  './images/Dumbbell_Lunges_0.jpg',
  './images/Dumbbell_Lunges_1.jpg',
  './images/Dumbbell_Shoulder_Press_0.jpg',
  './images/Dumbbell_Shoulder_Press_1.jpg',
  './images/Dumbbell_Shrug_0.jpg',
  './images/Dumbbell_Shrug_1.jpg',
  './images/Goblet_Squat_0.jpg',
  './images/Goblet_Squat_1.jpg',
  './images/Hammer_Curls_0.jpg',
  './images/Hammer_Curls_1.jpg',
  './images/Leg_Extensions_0.jpg',
  './images/Leg_Extensions_1.jpg',
  './images/Leg_Press_0.jpg',
  './images/Leg_Press_1.jpg',
  './images/Leverage_Chest_Press_0.jpg',
  './images/Leverage_Chest_Press_1.jpg',
  './images/Leverage_Shoulder_Press_0.jpg',
  './images/Leverage_Shoulder_Press_1.jpg',
  './images/Lying_Leg_Curls_0.jpg',
  './images/Lying_Leg_Curls_1.jpg',
  './images/One-Arm_Dumbbell_Row_0.jpg',
  './images/One-Arm_Dumbbell_Row_1.jpg',
  './images/Plank_0.jpg',
  './images/Plank_1.jpg',
  './images/Seated_Cable_Rows_0.jpg',
  './images/Seated_Cable_Rows_1.jpg',
  './images/Seated_Leg_Curl_0.jpg',
  './images/Seated_Leg_Curl_1.jpg',
  './images/Seated_Triceps_Press_0.jpg',
  './images/Seated_Triceps_Press_1.jpg',
  './images/Side_Lateral_Raise_0.jpg',
  './images/Side_Lateral_Raise_1.jpg',
  './images/Standing_Calf_Raises_0.jpg',
  './images/Standing_Calf_Raises_1.jpg',
  './images/Standing_Hamstring_and_Calf_Stretch_0.jpg',
  './images/Standing_Hamstring_and_Calf_Stretch_1.jpg',
  './images/Stiff-Legged_Dumbbell_Deadlift_0.jpg',
  './images/Stiff-Legged_Dumbbell_Deadlift_1.jpg',
  './images/Triceps_Pushdown_-_Rope_Attachment_0.jpg',
  './images/Triceps_Pushdown_-_Rope_Attachment_1.jpg',
  './images/Triceps_Pushdown_0.jpg',
  './images/Triceps_Pushdown_1.jpg',
  './images/Walking_Treadmill_0.jpg',
  './images/Walking_Treadmill_1.jpg',
  './images/Wide-Grip_Lat_Pulldown_0.jpg',
  './images/Wide-Grip_Lat_Pulldown_1.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Önce ağ, olmazsa önbellek (güncellemeler hemen gelsin, çevrimdışı da çalışsın)
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && new URL(e.request.url).origin === location.origin) {
        const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return r;
    }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html')))
  );
});
// Bildirime dokununca uygulamayı aç
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./index.html');
  }));
});
// İleride bir push sunucusu bağlanırsa (iOS 16.4+ ana ekran PWA / Android) hazır
self.addEventListener('push', e => {
  let d = {title: 'Takviyem', body: 'Takviye zamanı!'};
  try { d = Object.assign(d, e.data.json()); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title, {body: d.body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: d.tag || 'push'}));
});
